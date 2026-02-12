import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware/auth';
import { getUserReadableGroups, isSuperuser, getGroupById } from '@/lib/queries-auth';
import { db } from '@/lib/db-sqlite';
import { getBrandFeatures, isGlobalReadAccessEnabled } from '@/lib/brand-features';
import { getBrandTimeCodes } from '@/lib/brand-time-codes';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Time codes that show special text instead of numeric hours available
// Future: move to brand configuration
const SPECIAL_AVAILABILITY: Record<string, string> = {
  PSL: 'ADP',
};

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!employeeId || employeeId === 'all') {
      return NextResponse.json({ error: 'A specific employee must be selected' }, { status: 400 });
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const empId = parseInt(employeeId);

    // Permission check
    const userIsSuperuser = await isSuperuser(authUser.id);
    const brandFeatures = await getBrandFeatures();
    const globalRead = isGlobalReadAccessEnabled(brandFeatures);

    // Get employee details
    const empResult = await db.execute({
      sql: 'SELECT id, first_name, last_name, group_id FROM employees WHERE id = ? AND is_active = 1',
      args: [empId],
    });
    const employee = empResult.rows[0] as unknown as {
      id: number;
      first_name: string;
      last_name: string;
      group_id: number | null;
    } | undefined;

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check permission: user must be able to see this employee
    if (!userIsSuperuser && !globalRead) {
      const readableGroupIds = await getUserReadableGroups(authUser.id);
      if (authUser.group_id && !readableGroupIds.includes(authUser.group_id)) {
        readableGroupIds.push(authUser.group_id);
      }
      if (employee.group_id && !readableGroupIds.includes(employee.group_id)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get department name from auth.db
    let department = 'Unassigned';
    if (employee.group_id) {
      const group = await getGroupById(employee.group_id);
      if (group) {
        department = group.name;
      }
    }

    // Get ALL active brand time codes for summary rows
    const brandTimeCodes = getBrandTimeCodes() || [];
    const activeTimeCodes = brandTimeCodes.filter(tc => tc.is_active === 1);

    // Sort by configured timeCodeOrder if present, otherwise use brand JSON order
    const timeCodeOrder = brandFeatures.features.attendanceManagement?.timeCodeOrder;
    if (timeCodeOrder && timeCodeOrder.length > 0) {
      activeTimeCodes.sort((a, b) => {
        const aIdx = timeCodeOrder.indexOf(a.code);
        const bIdx = timeCodeOrder.indexOf(b.code);
        // Codes not in the order list go to the end
        const aOrder = aIdx === -1 ? timeCodeOrder.length : aIdx;
        const bOrder = bIdx === -1 ? timeCodeOrder.length : bIdx;
        return aOrder - bOrder;
      });
    }

    // Get allocations for this employee for the year
    const year = new Date(startDate).getFullYear();
    const allocResult = await db.execute({
      sql: 'SELECT time_code, allocated_hours FROM employee_time_allocations WHERE employee_id = ? AND year = ?',
      args: [empId, year],
    });
    const allocations = new Map<string, number>();
    for (const row of allocResult.rows as unknown as Array<{ time_code: string; allocated_hours: number }>) {
      allocations.set(row.time_code, row.allocated_hours);
    }

    // Get attendance entries for this employee in the date range
    const entriesResult = await db.execute({
      sql: `
        SELECT te.entry_date, tc.code AS time_code, tc.description, te.hours, te.notes
        FROM attendance_entries te
        JOIN time_codes tc ON te.time_code_id = tc.id
        WHERE te.employee_id = ? AND te.entry_date >= ? AND te.entry_date <= ?
        ORDER BY te.entry_date
      `,
      args: [empId, startDate, endDate],
    });
    const entries = entriesResult.rows as unknown as Array<{
      entry_date: string;
      time_code: string;
      description: string;
      hours: number;
      notes: string | null;
    }>;

    // Build summary: for each brand time code, count entries and sum hours
    const summaryMap = new Map<string, { days: number; hoursUsed: number }>();
    for (const tc of activeTimeCodes) {
      summaryMap.set(tc.code, { days: 0, hoursUsed: 0 });
    }
    for (const entry of entries) {
      const existing = summaryMap.get(entry.time_code);
      if (existing) {
        existing.days += 1;
        existing.hoursUsed += entry.hours;
      }
    }

    const summary = activeTimeCodes.map(tc => {
      const stats = summaryMap.get(tc.code) || { days: 0, hoursUsed: 0 };

      // Determine hours available
      let hoursAvail: number | string | null = null;
      if (SPECIAL_AVAILABILITY[tc.code]) {
        hoursAvail = SPECIAL_AVAILABILITY[tc.code];
      } else if (allocations.has(tc.code)) {
        hoursAvail = allocations.get(tc.code)!;
      } else if (tc.default_allocation != null) {
        hoursAvail = tc.default_allocation;
      }

      return {
        timeCode: tc.code,
        description: tc.description,
        days: stats.days,
        hoursUsed: stats.hoursUsed,
        hoursAvail,
      };
    });

    // Build day-of-week breakdown
    const dayOfWeekBreakdown: Record<string, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };
    for (const entry of entries) {
      const date = new Date(entry.entry_date + 'T00:00:00');
      const dayName = DAY_NAMES[date.getDay()];
      dayOfWeekBreakdown[dayName] += 1;
    }

    // Build detail rows
    const details = entries.map(entry => {
      const date = new Date(entry.entry_date + 'T00:00:00');
      return {
        date: entry.entry_date,
        dayOfWeek: DAY_NAMES[date.getDay()],
        type: entry.description,
        time: entry.hours,
        reasonGiven: entry.notes || '',
      };
    });

    return NextResponse.json({
      header: {
        employeeName: `${employee.last_name}, ${employee.first_name}`,
        department,
        startDate,
        endDate,
      },
      summary,
      dayOfWeekBreakdown,
      details,
    });
  } catch (error) {
    console.error('Error fetching attendance management report:', error);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}
