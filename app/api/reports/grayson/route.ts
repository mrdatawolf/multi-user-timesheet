import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware/auth';
import {
  getUserReadableGroups,
  isSuperuser,
  getGroupById,
  canUserExplicitlyUpdateGroup,
} from '@/lib/queries-auth';
import { getOvertimeThresholdHours } from '@/lib/app-settings';
import { getEmployeeById } from '@/lib/queries-sqlite';
import { db } from '@/lib/db-sqlite';

export const dynamic = 'force-dynamic';

interface EmployeeRow {
  id: number;
  first_name: string;
  last_name: string;
  group_id: number | null;
  overtime_threshold_hours: number | null;
}

interface EntryRow {
  employee_id: number;
  entry_date: string;
  hours: number;
}

interface OtherHoursRow {
  employee_id: number;
  week_start_date: string;
  hours: number;
}

interface NotesRow {
  employee_id: number;
  notes: string | null;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const EMPTY_RESPONSE_BASE = { employees: [] as unknown[], grandTotals: { reg: 0, ot: 0, other: 0, total: 0 } };

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodStart = searchParams.get('periodStart');
    const employeeIdParam = searchParams.get('employeeId') || 'all';
    const groupIdParam = searchParams.get('groupId') || 'all';
    const periods = searchParams.get('periods') === '2' ? 2 : 1;

    if (!periodStart || !/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) {
      return NextResponse.json({ error: 'periodStart (YYYY-MM-DD) is required' }, { status: 400 });
    }

    const week1Start = periodStart;
    const week1End = addDays(periodStart, 6);
    const week2Start = periods === 2 ? addDays(periodStart, 7) : null;
    const week2End = periods === 2 ? addDays(periodStart, 13) : null;
    const rangeEnd = week2End ?? week1End;
    const periodMeta = { periodStart, periods, week1Start, week1End, week2Start, week2End };

    const userIsSuperuser = await isSuperuser(authUser.id);
    const hasFullAccess = userIsSuperuser
      || authUser.group?.is_master === 1
      || authUser.role?.can_access_all_groups === 1;

    let readableGroupIds: number[] | null = null;
    if (!hasFullAccess) {
      readableGroupIds = await getUserReadableGroups(authUser.id);
      if (authUser.group_id && !readableGroupIds.includes(authUser.group_id)) {
        readableGroupIds.push(authUser.group_id);
      }
    }

    let employeeSql = 'SELECT id, first_name, last_name, group_id, overtime_threshold_hours FROM employees WHERE is_active = 1';
    const employeeArgs: (string | number)[] = [];

    if (readableGroupIds !== null) {
      if (readableGroupIds.length === 0 && !authUser.employee_id) {
        return NextResponse.json({ ...periodMeta, ...EMPTY_RESPONSE_BASE });
      }
      const conditions: string[] = [];
      if (readableGroupIds.length > 0) {
        conditions.push(`group_id IN (${readableGroupIds.map(() => '?').join(',')})`);
        employeeArgs.push(...readableGroupIds);
      }
      if (authUser.employee_id) {
        conditions.push('id = ?');
        employeeArgs.push(authUser.employee_id);
      }
      employeeSql += ` AND (${conditions.join(' OR ')})`;
    }

    if (employeeIdParam !== 'all') {
      employeeSql += ' AND id = ?';
      employeeArgs.push(parseInt(employeeIdParam, 10));
    }
    if (groupIdParam !== 'all') {
      employeeSql += ' AND group_id = ?';
      employeeArgs.push(parseInt(groupIdParam, 10));
    }

    const employeesResult = await db.execute({ sql: employeeSql, args: employeeArgs });
    const employees = employeesResult.rows as unknown as EmployeeRow[];

    if (employees.length === 0) {
      return NextResponse.json({ ...periodMeta, ...EMPTY_RESPONSE_BASE });
    }

    const employeeIds = employees.map(e => e.id);

    const entriesResult = await db.execute({
      sql: `SELECT employee_id, entry_date, hours FROM hours_entries
            WHERE entry_date >= ? AND entry_date <= ?
            AND employee_id IN (${employeeIds.map(() => '?').join(',')})`,
      args: [week1Start, rangeEnd, ...employeeIds],
    });
    const entries = entriesResult.rows as unknown as EntryRow[];

    const otherWeeks = week2Start ? [week1Start, week2Start] : [week1Start];
    const otherResult = await db.execute({
      sql: `SELECT employee_id, week_start_date, hours FROM report_other_hours
            WHERE week_start_date IN (${otherWeeks.map(() => '?').join(',')})
            AND employee_id IN (${employeeIds.map(() => '?').join(',')})`,
      args: [...otherWeeks, ...employeeIds],
    });
    const otherRows = otherResult.rows as unknown as OtherHoursRow[];

    const otherMap = new Map<string, number>();
    for (const row of otherRows) {
      otherMap.set(`${row.employee_id}:${row.week_start_date}`, Number(row.hours));
    }

    const notesResult = await db.execute({
      sql: `SELECT employee_id, notes FROM report_notes
            WHERE period_start = ?
            AND employee_id IN (${employeeIds.map(() => '?').join(',')})`,
      args: [periodStart, ...employeeIds],
    });
    const notesRows = notesResult.rows as unknown as NotesRow[];
    const notesMap = new Map<number, string>();
    for (const row of notesRows) {
      notesMap.set(row.employee_id, row.notes || '');
    }

    const week1Totals = new Map<number, number>();
    const week2Totals = new Map<number, number>();
    for (const entry of entries) {
      const target = entry.entry_date <= week1End ? week1Totals : week2Totals;
      target.set(entry.employee_id, (target.get(entry.employee_id) || 0) + Number(entry.hours));
    }

    const groupCache = new Map<number, number | null>();
    const resolveThreshold = async (emp: EmployeeRow): Promise<number> => {
      let groupOverride: number | null = null;
      if (emp.group_id != null) {
        if (!groupCache.has(emp.group_id)) {
          const group = await getGroupById(emp.group_id);
          groupCache.set(emp.group_id, group?.overtime_threshold_hours ?? null);
        }
        groupOverride = groupCache.get(emp.group_id) ?? null;
      }
      return getOvertimeThresholdHours(emp.overtime_threshold_hours, groupOverride);
    };

    const employeeRows = [];
    let grandReg = 0, grandOt = 0, grandOther = 0;

    for (const emp of employees) {
      const threshold = await resolveThreshold(emp);
      const week1Total = week1Totals.get(emp.id) || 0;

      const week1Reg = Math.min(week1Total, threshold);
      const week1Ot = Math.max(0, week1Total - threshold);
      const week1Other = otherMap.get(`${emp.id}:${week1Start}`) || 0;

      let week2Reg = 0, week2Ot = 0, week2Other = 0;
      if (week2Start) {
        const week2Total = week2Totals.get(emp.id) || 0;
        week2Reg = Math.min(week2Total, threshold);
        week2Ot = Math.max(0, week2Total - threshold);
        week2Other = otherMap.get(`${emp.id}:${week2Start}`) || 0;
      }

      const totalReg = week1Reg + week2Reg;
      const totalOt = week1Ot + week2Ot;
      const total1FE = week1Other + week2Other;
      const totalHours = totalReg + totalOt + total1FE;

      grandReg += totalReg;
      grandOt += totalOt;
      grandOther += total1FE;

      employeeRows.push({
        employeeId: emp.id,
        employeeName: `${emp.last_name}, ${emp.first_name}`,
        week1Reg, week1Ot, week1Other,
        week2Reg, week2Ot, week2Other,
        totalReg, totalOt, total1FE, totalHours,
        notes: notesMap.get(emp.id) || '',
      });
    }

    employeeRows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

    return NextResponse.json({
      ...periodMeta,
      employees: employeeRows,
      grandTotals: { reg: grandReg, ot: grandOt, other: grandOther, total: grandReg + grandOt + grandOther },
    });
  } catch (error) {
    console.error('Error fetching Grayson time report:', error);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}

async function checkEditPermission(authUser: Awaited<ReturnType<typeof getAuthUser>>, employeeId: number) {
  const employee = await getEmployeeById(employeeId);
  if (!employee) {
    return { ok: false as const, status: 404, error: 'Employee not found' };
  }

  const userIsSuperuser = await isSuperuser(authUser!.id);
  const hasFullAccess = userIsSuperuser
    || authUser!.group?.is_master === 1
    || authUser!.role?.can_access_all_groups === 1;

  if (!hasFullAccess && employee.group_id) {
    const canUpdate = await canUserExplicitlyUpdateGroup(authUser!.id, employee.group_id);
    if (!canUpdate) {
      return { ok: false as const, status: 403, error: 'Forbidden: You do not have permission to edit this employee\'s report data' };
    }
  }

  return { ok: true as const };
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const type = body.type === 'notes' ? 'notes' : 'other_hours';

    if (type === 'other_hours') {
      const { employee_id, week_start_date, hours } = body;
      if (!employee_id || !week_start_date || !/^\d{4}-\d{2}-\d{2}$/.test(week_start_date)) {
        return NextResponse.json({ error: 'employee_id and week_start_date (YYYY-MM-DD) are required' }, { status: 400 });
      }
      const hoursNum = Number(hours) || 0;
      if (hoursNum < 0 || hoursNum > 999) {
        return NextResponse.json({ error: 'hours must be between 0 and 999' }, { status: 400 });
      }

      const permCheck = await checkEditPermission(authUser, employee_id);
      if (!permCheck.ok) {
        return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
      }

      await db.execute({
        sql: `INSERT INTO report_other_hours (employee_id, week_start_date, hours, updated_by, updated_at)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(employee_id, week_start_date) DO UPDATE SET
                hours = excluded.hours,
                updated_by = excluded.updated_by,
                updated_at = CURRENT_TIMESTAMP`,
        args: [employee_id, week_start_date, hoursNum, authUser.id],
      });

      return NextResponse.json({ success: true });
    }

    // type === 'notes'
    const { employee_id, period_start, notes } = body;
    if (!employee_id || !period_start || !/^\d{4}-\d{2}-\d{2}$/.test(period_start)) {
      return NextResponse.json({ error: 'employee_id and period_start (YYYY-MM-DD) are required' }, { status: 400 });
    }
    const notesText = typeof notes === 'string' ? notes.slice(0, 1000) : '';

    const permCheck = await checkEditPermission(authUser, employee_id);
    if (!permCheck.ok) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    await db.execute({
      sql: `INSERT INTO report_notes (employee_id, period_start, notes, updated_by, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(employee_id, period_start) DO UPDATE SET
              notes = excluded.notes,
              updated_by = excluded.updated_by,
              updated_at = CURRENT_TIMESTAMP`,
      args: [employee_id, period_start, notesText, authUser.id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving Grayson report data:', error);
    return NextResponse.json({ error: 'Failed to save report data' }, { status: 500 });
  }
}
