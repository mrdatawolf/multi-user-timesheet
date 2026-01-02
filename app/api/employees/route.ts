import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployees, createEmployee, getEmployeeById } from '@/lib/queries-sqlite';
import { getAuthUser, getClientIP, getUserAgent } from '@/lib/middleware/auth';
import { canUserViewGroup, canUserEditGroup, logAudit } from '@/lib/queries-auth';
import { db } from '@/lib/db-sqlite';

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

      // Check permissions
      if (employee.group_id && !authUser.group?.is_master && !authUser.group?.can_view_all) {
        const canView = await canUserViewGroup(authUser.id, employee.group_id);
        if (!canView && authUser.group_id !== employee.group_id) {
          return NextResponse.json(
            { error: 'Forbidden: You do not have permission to view this employee' },
            { status: 403 }
          );
        }
      }

      return NextResponse.json(employee);
    } else {
      // Get all employees (filter based on permissions)
      let employees = await getAllEmployees();

      // Filter out inactive employees unless includeInactive is true
      // Only Master users can see inactive employees
      if (!includeInactive || !authUser.group?.is_master) {
        employees = employees.filter(emp => emp.is_active === 1);
      }

      // If user is not master or can't view all, filter employees by permissions
      if (!authUser.group?.is_master && !authUser.group?.can_view_all) {
        const filteredEmployees = [];
        for (const employee of employees) {
          if (!employee.group_id || employee.group_id === authUser.group_id) {
            filteredEmployees.push(employee);
          } else {
            const canView = await canUserViewGroup(authUser.id, employee.group_id);
            if (canView) {
              filteredEmployees.push(employee);
            }
          }
        }
        employees = filteredEmployees;
      }

      return NextResponse.json(employees);
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

    // Check if user can create employees in the specified group
    if (body.group_id && !authUser.group?.is_master && !authUser.group?.can_edit_all) {
      const canEdit = await canUserEditGroup(authUser.id, body.group_id);
      if (!canEdit && authUser.group_id !== body.group_id) {
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

    // Check permissions for the old group
    if (oldEmployee.group_id && !authUser.group?.is_master && !authUser.group?.can_edit_all) {
      const canEdit = await canUserEditGroup(authUser.id, oldEmployee.group_id);
      if (!canEdit && authUser.group_id !== oldEmployee.group_id) {
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

    // Check permissions - can delete if:
    // 1. User is Master
    // 2. User created this employee
    // 3. User has can_edit_all permission
    // 4. User is HR/Manager of the employee's group (same group + has edit permission)
    let canDelete = false;

    if (authUser.group?.is_master) {
      // Master can delete all
      canDelete = true;
    } else if (employee.created_by && employee.created_by === authUser.id) {
      // Creator can delete
      canDelete = true;
    } else if (authUser.group?.can_edit_all) {
      // Users with can_edit_all can delete all
      canDelete = true;
    } else if (employee.group_id && authUser.group_id === employee.group_id) {
      // User is in the same group - check if they have edit permission for this group
      const canEdit = await canUserEditGroup(authUser.id, employee.group_id);
      if (canEdit) {
        canDelete = true;
      }
    } else if (employee.group_id) {
      // Check if user has specific permission to edit this employee's group
      const canEdit = await canUserEditGroup(authUser.id, employee.group_id);
      if (canEdit) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete this employee' },
        { status: 403 }
      );
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
