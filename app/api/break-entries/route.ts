import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getClientIP, getUserAgent } from '@/lib/middleware/auth';
import { logAudit, canUserReadGroup, canUserUpdateInGroup } from '@/lib/queries-auth';
import { getEmployeeById } from '@/lib/queries-sqlite';
import {
  isBreakTrackingEnabled,
  getBreakEntries,
  getBreakEntriesWithCompliance,
  saveBreakEntry,
  deleteBreakEntry,
  getBreakEntryById,
  getTodayFormatted,
  getCurrentTimeFormatted,
} from '@/lib/break-tracking';
import { serializeBigInt } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/break-entries
 *
 * Get break entries for an employee on a specific date.
 *
 * Query params:
 * - employeeId: Employee ID (required)
 * - date: Date in YYYY-MM-DD format (defaults to today)
 * - withCompliance: Include compliance status (default true)
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if feature is enabled
    const config = await isBreakTrackingEnabled();
    if (!config) {
      return NextResponse.json(
        { error: 'Break tracking feature is not enabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const employeeIdParam = searchParams.get('employeeId');
    const date = searchParams.get('date') || getTodayFormatted();
    const withCompliance = searchParams.get('withCompliance') !== 'false';

    if (!employeeIdParam) {
      return NextResponse.json(
        { error: 'employeeId is required' },
        { status: 400 }
      );
    }

    const employeeId = parseInt(employeeIdParam, 10);
    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: 'Invalid employeeId' },
        { status: 400 }
      );
    }

    // Check if employee exists and user has permission
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (employee.group_id) {
      const canView = await canUserReadGroup(authUser.id, employee.group_id);
      if (!canView) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to view this employee\'s breaks' },
          { status: 403 }
        );
      }
    }

    // Get entries with or without compliance
    let entries;
    if (withCompliance) {
      entries = await getBreakEntriesWithCompliance(employeeId, date);
    } else {
      entries = await getBreakEntries(employeeId, date);
    }

    return NextResponse.json({
      config: {
        breaks: config.breaks,
        requireTimeEntry: config.requireTimeEntry,
        graceMinutes: config.graceMinutes,
      },
      entries: serializeBigInt(entries),
    });
  } catch (error) {
    console.error('Error fetching break entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch break entries' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/break-entries
 *
 * Create or update a break entry.
 *
 * Body:
 * - employeeId: Employee ID
 * - date: Date in YYYY-MM-DD format (defaults to today)
 * - breakType: 'break_1', 'lunch', or 'break_2'
 * - startTime: Optional HH:MM format (defaults to current time if not provided)
 * - durationMinutes: Duration in minutes
 * - notes: Optional notes
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if feature is enabled
    const config = await isBreakTrackingEnabled();
    if (!config) {
      return NextResponse.json(
        { error: 'Break tracking feature is not enabled' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      employeeId,
      date = getTodayFormatted(),
      breakType,
      startTime,
      endTime,
      durationMinutes,
      notes,
    } = body;

    // Validate required fields
    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }
    if (!breakType) {
      return NextResponse.json({ error: 'breakType is required' }, { status: 400 });
    }
    if (durationMinutes === undefined || durationMinutes === null) {
      return NextResponse.json({ error: 'durationMinutes is required' }, { status: 400 });
    }

    // Validate breakType
    const validBreakTypes = ['break_1', 'lunch', 'break_2'];
    if (!validBreakTypes.includes(breakType)) {
      return NextResponse.json(
        { error: `Invalid breakType. Must be one of: ${validBreakTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if employee exists and user has permission
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (employee.group_id) {
      const canUpdate = await canUserUpdateInGroup(authUser.id, employee.group_id);
      if (!canUpdate) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to update this employee\'s breaks' },
          { status: 403 }
        );
      }
    }

    // Get existing entry for audit log
    const existingEntries = await getBreakEntries(employeeId, date);
    const existingEntry = existingEntries.find(e => e.break_type === breakType);

    // Determine start time: use provided, or default to current time
    const effectiveStartTime = startTime || getCurrentTimeFormatted();

    // Save the entry
    const entryId = await saveBreakEntry({
      employee_id: employeeId,
      entry_date: date,
      break_type: breakType,
      start_time: effectiveStartTime,
      end_time: endTime || null,
      duration_minutes: durationMinutes,
      notes: notes || null,
    });

    // Audit log
    try {
      await logAudit({
        user_id: authUser.id,
        action: existingEntry ? 'UPDATE' : 'CREATE',
        table_name: 'break_entries',
        record_id: entryId,
        old_values: existingEntry ? JSON.stringify(existingEntry) : undefined,
        new_values: JSON.stringify({
          employee_id: employeeId,
          entry_date: date,
          break_type: breakType,
          start_time: effectiveStartTime,
          duration_minutes: durationMinutes,
        }),
        ip_address: getClientIP(request),
        user_agent: getUserAgent(request),
      });
    } catch (auditError) {
      console.error('Failed to log audit (non-critical):', auditError);
    }

    // Get updated entries with compliance
    const updatedEntries = await getBreakEntriesWithCompliance(employeeId, date);

    return NextResponse.json({
      success: true,
      entryId,
      entries: serializeBigInt(updatedEntries),
    });
  } catch (error) {
    console.error('Error saving break entry:', error);
    return NextResponse.json(
      { error: 'Failed to save break entry' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/break-entries
 *
 * Delete a break entry.
 *
 * Query params:
 * - id: Break entry ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if feature is enabled
    const config = await isBreakTrackingEnabled();
    if (!config) {
      return NextResponse.json(
        { error: 'Break tracking feature is not enabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Get the entry to check permissions and for audit log
    const entry = await getBreakEntryById(id);
    if (!entry) {
      return NextResponse.json({ error: 'Break entry not found' }, { status: 404 });
    }

    // Check permission
    const employee = await getEmployeeById(entry.employee_id);
    if (employee?.group_id) {
      const canUpdate = await canUserUpdateInGroup(authUser.id, employee.group_id);
      if (!canUpdate) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to delete this break entry' },
          { status: 403 }
        );
      }
    }

    // Delete the entry
    const deleted = await deleteBreakEntry(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete break entry' }, { status: 500 });
    }

    // Audit log
    try {
      await logAudit({
        user_id: authUser.id,
        action: 'DELETE',
        table_name: 'break_entries',
        record_id: id,
        old_values: JSON.stringify(entry),
        new_values: undefined,
        ip_address: getClientIP(request),
        user_agent: getUserAgent(request),
      });
    } catch (auditError) {
      console.error('Failed to log audit (non-critical):', auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting break entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete break entry' },
      { status: 500 }
    );
  }
}
