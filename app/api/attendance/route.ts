import { NextRequest, NextResponse } from 'next/server';
import { getAllEntries, getEntriesForDateRange, upsertEntry, deleteEntry, getEmployeeById } from '@/lib/queries-sqlite';
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
    const employeeIdParam = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // If no employeeId is provided, return all entries (only for users who can view all)
    if (!employeeIdParam) {
      if (!authUser.group?.is_master && !authUser.group?.can_view_all) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to view all attendance entries' },
          { status: 403 }
        );
      }
      const entries = await getAllEntries();
      return NextResponse.json(entries);
    }

    const employeeId = parseInt(employeeIdParam);

    // Check if user can view this employee's data
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check permissions
    if (employee.group_id && !authUser.group?.is_master && !authUser.group?.can_view_all) {
      const canView = await canUserViewGroup(authUser.id, employee.group_id);
      if (!canView && authUser.group_id !== employee.group_id) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to view this employee\'s attendance' },
          { status: 403 }
        );
      }
    }

    let entries;
    if (startDate && endDate) {
      entries = await getEntriesForDateRange(employeeId, startDate, endDate);
    } else {
      const yearStartDate = `${year}-01-01`;
      const yearEndDate = `${year}-12-31`;
      entries = await getEntriesForDateRange(employeeId, yearStartDate, yearEndDate);
    }

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
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

    // Check if user can edit this employee's data
    const employee = await getEmployeeById(body.employee_id);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check permissions
    if (employee.group_id && !authUser.group?.is_master && !authUser.group?.can_edit_all) {
      const canEdit = await canUserEditGroup(authUser.id, employee.group_id);
      if (!canEdit && authUser.group_id !== employee.group_id) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to edit this employee\'s attendance' },
          { status: 403 }
        );
      }
    }

    if (body.action === 'delete') {
      // Get old entry for audit log
      const oldEntry = await db.execute({
        sql: 'SELECT * FROM attendance_entries WHERE employee_id = ? AND entry_date = ?',
        args: [body.employee_id, body.entry_date],
      });

      await deleteEntry(body.employee_id, body.entry_date);

      // Log audit entry
      if (oldEntry.rows.length > 0) {
        await logAudit({
          user_id: authUser.id,
          action: 'DELETE',
          table_name: 'attendance_entries',
          record_id: (oldEntry.rows[0] as any).id,
          old_values: JSON.stringify(oldEntry.rows[0]),
          ip_address: getClientIP(request),
          user_agent: getUserAgent(request),
        });
      }
    } else {
      // Check if entry exists for audit log
      const existing = await db.execute({
        sql: 'SELECT * FROM attendance_entries WHERE employee_id = ? AND entry_date = ?',
        args: [body.employee_id, body.entry_date],
      });

      const isUpdate = existing.rows.length > 0;

      await upsertEntry({
        employee_id: body.employee_id,
        entry_date: body.entry_date,
        time_code: body.time_code,
        hours: body.hours || 0,
        notes: body.notes,
        time_code_id: 0
      });

      // Get the new entry
      const newEntry = await db.execute({
        sql: 'SELECT * FROM attendance_entries WHERE employee_id = ? AND entry_date = ?',
        args: [body.employee_id, body.entry_date],
      });

      // Log audit entry
      await logAudit({
        user_id: authUser.id,
        action: isUpdate ? 'UPDATE' : 'CREATE',
        table_name: 'attendance_entries',
        record_id: (newEntry.rows[0] as any)?.id,
        old_values: isUpdate ? JSON.stringify(existing.rows[0]) : undefined,
        new_values: JSON.stringify(newEntry.rows[0]),
        ip_address: getClientIP(request),
        user_agent: getUserAgent(request),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
  }
}
