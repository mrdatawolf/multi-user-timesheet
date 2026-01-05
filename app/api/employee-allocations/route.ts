import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware/auth';
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
    const employeeId = searchParams.get('employeeId');
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Get all time codes with their default allocations
    const timeCodesResult = await db.execute(
      'SELECT id, code, description, default_allocation FROM time_codes WHERE is_active = 1 ORDER BY code'
    );

    // Get employee-specific allocations for this year
    const allocationsResult = await db.execute({
      sql: `SELECT time_code, time_code_id, allocated_hours, notes
            FROM employee_time_allocations
            WHERE employee_id = ? AND year = ?`,
      args: [parseInt(employeeId), parseInt(year)]
    });

    // Build response combining defaults and overrides
    const allocations = timeCodesResult.rows.map((tc: any) => {
      const override = allocationsResult.rows.find((a: any) => a.time_code_id === tc.id);
      return {
        time_code: tc.code,
        time_code_id: tc.id,
        description: tc.description,
        default_allocation: tc.default_allocation,
        allocated_hours: override ? override.allocated_hours : tc.default_allocation,
        is_override: !!override,
        notes: override?.notes || null
      };
    });

    return NextResponse.json({
      employee_id: parseInt(employeeId),
      year: parseInt(year),
      allocations
    });
  } catch (error) {
    console.error('Error fetching employee allocations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee allocations' },
      { status: 500 }
    );
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

    // Only users with edit permissions can modify allocations
    if (!authUser.group?.is_master && !authUser.group?.can_edit_all) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to modify allocations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { employee_id, time_code, allocated_hours, year, notes } = body;

    if (!employee_id || !time_code || allocated_hours === undefined || !year) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Look up time_code_id from time_code
    const timeCodeResult = await db.execute({
      sql: 'SELECT id FROM time_codes WHERE code = ?',
      args: [time_code]
    });

    if (timeCodeResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid time code' },
        { status: 400 }
      );
    }

    const timeCodeId = (timeCodeResult.rows[0] as any).id;

    // Insert or update allocation
    await db.execute({
      sql: `INSERT INTO employee_time_allocations (employee_id, time_code, time_code_id, allocated_hours, year, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(employee_id, time_code, year)
            DO UPDATE SET time_code_id = ?, allocated_hours = ?, notes = ?, updated_at = CURRENT_TIMESTAMP`,
      args: [
        employee_id,
        time_code,
        timeCodeId,
        allocated_hours,
        year,
        notes || null,
        timeCodeId,
        allocated_hours,
        notes || null
      ]
    });

    return NextResponse.json({
      success: true,
      message: 'Allocation updated successfully'
    });
  } catch (error) {
    console.error('Error updating employee allocation:', error);
    return NextResponse.json(
      { error: 'Failed to update allocation' },
      { status: 500 }
    );
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

    // Only users with edit permissions can delete allocations
    if (!authUser.group?.is_master && !authUser.group?.can_edit_all) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to modify allocations' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const timeCode = searchParams.get('timeCode');
    const year = searchParams.get('year');

    if (!employeeId || !timeCode || !year) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Look up time_code_id from time_code
    const timeCodeResult = await db.execute({
      sql: 'SELECT id FROM time_codes WHERE code = ?',
      args: [timeCode]
    });

    if (timeCodeResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid time code' },
        { status: 400 }
      );
    }

    const timeCodeId = (timeCodeResult.rows[0] as any).id;

    // Delete the allocation (will revert to default)
    await db.execute({
      sql: `DELETE FROM employee_time_allocations
            WHERE employee_id = ? AND time_code_id = ? AND year = ?`,
      args: [parseInt(employeeId), timeCodeId, parseInt(year)]
    });

    return NextResponse.json({
      success: true,
      message: 'Allocation reverted to default'
    });
  } catch (error) {
    console.error('Error deleting employee allocation:', error);
    return NextResponse.json(
      { error: 'Failed to delete allocation' },
      { status: 500 }
    );
  }
}
