import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployees, createEmployee, getEmployeeById } from '@/lib/queries-sqlite';
import { getAuthUser, getClientIP, getUserAgent } from '@/lib/middleware/auth';
import {
  logAudit,
  getUserReadableGroups,
  canUserReadGroup,
  canUserCreateInGroup,
  canUserUpdateInGroup,
  canUserDeleteInGroup,
  isSuperuser,
} from '@/lib/queries-auth';
import { db } from '@/lib/db-sqlite';
import { serializeBigInt } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('id');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    if (employeeId) {
      const employee = await getEmployeeById(parseInt(employeeId));
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      // Check permissions using Phase 2 CRUD permissions
      if (employee.group_id) {
        const canView = await canUserReadGroup(authUser.id, employee.group_id);
        if (!canView) {
          return NextResponse.json(
            { error: 'Forbidden: You do not have permission to view this employee' },
            { status: 403 }
          );
        }
      }

      return NextResponse.json(serializeBigInt(employee));
    } else {
      // Get all employees (filter based on permissions)
      let employees = await getAllEmployees();

      // Check if user is superuser
      const userIsSuperuser = await isSuperuser(authUser.id);

      // Filter out inactive employees unless includeInactive is true
      // Only superusers can see inactive employees
      if (!includeInactive || !userIsSuperuser) {
        employees = employees.filter(emp => emp.is_active === 1);
      }

      // Filter employees based on user's readable groups (Phase 2 permissions)
      if (!userIsSuperuser) {
        const readableGroupIds = await getUserReadableGroups(authUser.id);
        // Always include user's own group - users can always see their own group
        if (authUser.group_id && !readableGroupIds.includes(authUser.group_id)) {
          readableGroupIds.push(authUser.group_id);
        }
        employees = employees.filter(emp =>
          !emp.group_id || readableGroupIds.includes(emp.group_id)
        );

        // Auto-create employee for user if they're the first in their group
        if (authUser.group_id) {
          const employeesInUserGroup = employees.filter(emp => emp.group_id === authUser.group_id);
          if (employeesInUserGroup.length === 0) {
            // No employees in user's group - create one for the user
            // Parse full_name into first_name and last_name
            const nameParts = authUser.full_name.trim().split(/\s+/);
            const firstName = nameParts[0] || 'Unknown';
            const lastName = nameParts.slice(1).join(' ') || authUser.username;

            const newEmployee = await createEmployee({
              employee_number: undefined,
              first_name: firstName,
              last_name: lastName,
              email: authUser.email || undefined,
              role: 'employee',
              group_id: authUser.group_id,
              date_of_hire: undefined,
              rehire_date: undefined,
              employment_type: 'full_time',
              seniority_rank: undefined,
              created_by: authUser.id,
              is_active: 1
            });

            // Log audit entry for auto-created employee
            await logAudit({
              user_id: authUser.id,
              action: 'CREATE',
              table_name: 'employees',
              record_id: newEmployee.id,
              new_values: JSON.stringify({
                first_name: newEmployee.first_name,
                last_name: newEmployee.last_name,
                email: newEmployee.email,
                group_id: newEmployee.group_id,
                auto_created: true,
              }),
              ip_address: getClientIP(request),
              user_agent: getUserAgent(request),
            });

            employees.push(newEmployee);
          }
        }
      }

      return NextResponse.json(serializeBigInt(employees));
    }
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Check if user can create employees in the specified group (Phase 2 CRUD permissions)
    if (body.group_id) {
      const canCreate = await canUserCreateInGroup(authUser.id, body.group_id);
      if (!canCreate) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to create employees in this group' },
          { status: 403 }
        );
      }
    }

    const newEmployee = await createEmployee({
      employee_number: body.employee_number,
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      role: body.role || 'employee',
      group_id: body.group_id,
      date_of_hire: body.date_of_hire,
      rehire_date: body.rehire_date,
      employment_type: body.employment_type || 'full_time',
      seniority_rank: body.seniority_rank,
      created_by: authUser.id,
      is_active: 1
    });

    // Log audit entry
    await logAudit({
      user_id: authUser.id,
      action: 'CREATE',
      table_name: 'employees',
      record_id: newEmployee.id,
      new_values: JSON.stringify({
        employee_number: newEmployee.employee_number,
        first_name: newEmployee.first_name,
        last_name: newEmployee.last_name,
        email: newEmployee.email,
        role: newEmployee.role,
        group_id: newEmployee.group_id,
        date_of_hire: newEmployee.date_of_hire,
        rehire_date: newEmployee.rehire_date,
        employment_type: newEmployee.employment_type,
        seniority_rank: newEmployee.seniority_rank,
      }),
      ip_address: getClientIP(request),
      user_agent: getUserAgent(request),
    });

    return NextResponse.json(newEmployee);
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const employeeId = body.id;

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Get old employee for audit log
    const oldEmployee = await getEmployeeById(employeeId);
    if (!oldEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check permissions for the old group (Phase 2 CRUD permissions)
    if (oldEmployee.group_id) {
      const canUpdate = await canUserUpdateInGroup(authUser.id, oldEmployee.group_id);
      if (!canUpdate) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to edit this employee' },
          { status: 403 }
        );
      }
    }

    // Build update query
    const updates: string[] = [];
    const args: any[] = [];

    if (body.employee_number !== undefined) {
      updates.push('employee_number = ?');
      args.push(body.employee_number);
    }

    if (body.first_name !== undefined) {
      updates.push('first_name = ?');
      args.push(body.first_name);
    }

    if (body.last_name !== undefined) {
      updates.push('last_name = ?');
      args.push(body.last_name);
    }

    if (body.email !== undefined) {
      updates.push('email = ?');
      args.push(body.email);
    }

    if (body.role !== undefined) {
      updates.push('role = ?');
      args.push(body.role);
    }

    if (body.group_id !== undefined) {
      updates.push('group_id = ?');
      args.push(body.group_id);
    }

    if (body.date_of_hire !== undefined) {
      updates.push('date_of_hire = ?');
      args.push(body.date_of_hire);
    }

    if (body.rehire_date !== undefined) {
      updates.push('rehire_date = ?');
      args.push(body.rehire_date);
    }

    if (body.employment_type !== undefined) {
      updates.push('employment_type = ?');
      args.push(body.employment_type);
    }

    if (body.seniority_rank !== undefined) {
      updates.push('seniority_rank = ?');
      args.push(body.seniority_rank);
    }

    if (body.is_active !== undefined) {
      updates.push('is_active = ?');
      args.push(body.is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    args.push(employeeId);

    await db.execute({
      sql: `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    // Get updated employee
    const updatedEmployee = await getEmployeeById(employeeId);

    // Log audit entry
    await logAudit({
      user_id: authUser.id,
      action: 'UPDATE',
      table_name: 'employees',
      record_id: employeeId,
      old_values: JSON.stringify({
        employee_number: oldEmployee.employee_number,
        first_name: oldEmployee.first_name,
        last_name: oldEmployee.last_name,
        email: oldEmployee.email,
        role: oldEmployee.role,
        group_id: oldEmployee.group_id,
        date_of_hire: oldEmployee.date_of_hire,
        rehire_date: oldEmployee.rehire_date,
        employment_type: oldEmployee.employment_type,
        seniority_rank: oldEmployee.seniority_rank,
        is_active: oldEmployee.is_active,
      }),
      new_values: JSON.stringify({
        employee_number: updatedEmployee?.employee_number,
        first_name: updatedEmployee?.first_name,
        last_name: updatedEmployee?.last_name,
        email: updatedEmployee?.email,
        role: updatedEmployee?.role,
        group_id: updatedEmployee?.group_id,
        date_of_hire: updatedEmployee?.date_of_hire,
        rehire_date: updatedEmployee?.rehire_date,
        employment_type: updatedEmployee?.employment_type,
        seniority_rank: updatedEmployee?.seniority_rank,
        is_active: updatedEmployee?.is_active,
      }),
      ip_address: getClientIP(request),
      user_agent: getUserAgent(request),
    });

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('id');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Get employee for audit log and permission check
    const employee = await getEmployeeById(parseInt(employeeId));
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check permissions using Phase 2 CRUD permissions
    if (employee.group_id) {
      const hasDeletePermission = await canUserDeleteInGroup(authUser.id, employee.group_id);
      if (!hasDeletePermission) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to delete this employee' },
          { status: 403 }
        );
      }
    }

    // Don't actually delete, just deactivate
    await db.execute({
      sql: 'UPDATE employees SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [employeeId],
    });

    // Log audit entry
    await logAudit({
      user_id: authUser.id,
      action: 'DELETE',
      table_name: 'employees',
      record_id: parseInt(employeeId),
      old_values: JSON.stringify({
        employee_number: employee.employee_number,
        first_name: employee.first_name,
        last_name: employee.last_name,
        is_active: employee.is_active,
      }),
      new_values: JSON.stringify({
        is_active: 0,
      }),
      ip_address: getClientIP(request),
      user_agent: getUserAgent(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
