import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware/auth';
import { getUserReadableGroups, isSuperuser, getGroupById } from '@/lib/queries-auth';
import { getAppSetting } from '@/lib/app-settings';
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

// Returns the Monday (YYYY-MM-DD) of the ISO week containing the given date
function weekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeIdParam = searchParams.get('employeeId') || 'all';
    const groupIdParam = searchParams.get('groupId') || 'all';

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const userIsSuperuser = await isSuperuser(authUser.id);
    const hasFullAccess = userIsSuperuser
      || authUser.group?.is_master === 1
      || authUser.role?.can_access_all_groups === 1;

    // Resolve which group ids this user may see
    let readableGroupIds: number[] | null = null; // null = unrestricted
    if (!hasFullAccess) {
      readableGroupIds = await getUserReadableGroups(authUser.id);
      if (authUser.group_id && !readableGroupIds.includes(authUser.group_id)) {
        readableGroupIds.push(authUser.group_id);
      }
    }

    // Build employee query with permission + optional filters
    let employeeSql = 'SELECT id, first_name, last_name, group_id, overtime_threshold_hours FROM employees WHERE is_active = 1';
    const employeeArgs: (string | number)[] = [];

    if (readableGroupIds !== null) {
      if (readableGroupIds.length === 0 && !authUser.employee_id) {
        return NextResponse.json({ startDate, endDate, groups: [], grandTotalHours: 0 });
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
      return NextResponse.json({ startDate, endDate, groups: [], grandTotalHours: 0 });
    }

    const employeeIds = employees.map(e => e.id);
    const entriesResult = await db.execute({
      sql: `SELECT employee_id, entry_date, hours FROM hours_entries
            WHERE entry_date >= ? AND entry_date <= ?
            AND employee_id IN (${employeeIds.map(() => '?').join(',')})`,
      args: [startDate, endDate, ...employeeIds],
    });
    const entries = entriesResult.rows as unknown as EntryRow[];

    // Resolve overtime thresholds: employee override -> group override -> app default -> 40
    const groupCache = new Map<number, number | null>();
    const defaultThresholdRaw = await getAppSetting('overtime_threshold_hours');
    const defaultThreshold = defaultThresholdRaw ? parseFloat(defaultThresholdRaw) || 40 : 40;

    const resolveThreshold = async (emp: EmployeeRow): Promise<number> => {
      if (emp.overtime_threshold_hours != null) return emp.overtime_threshold_hours;
      if (emp.group_id != null) {
        if (!groupCache.has(emp.group_id)) {
          const group = await getGroupById(emp.group_id);
          groupCache.set(emp.group_id, group?.overtime_threshold_hours ?? null);
        }
        const groupThreshold = groupCache.get(emp.group_id);
        if (groupThreshold != null) return groupThreshold;
      }
      return defaultThreshold;
    };

    // Bucket entries by employee, then by ISO week, to compute overtime
    const entriesByEmployee = new Map<number, EntryRow[]>();
    for (const entry of entries) {
      const list = entriesByEmployee.get(entry.employee_id) || [];
      list.push(entry);
      entriesByEmployee.set(entry.employee_id, list);
    }

    interface EmployeeSummary {
      employeeId: number;
      employeeName: string;
      groupId: number | null;
      totalHours: number;
      overtimeHours: number;
    }

    const employeeSummaries: EmployeeSummary[] = [];
    for (const emp of employees) {
      const empEntries = entriesByEmployee.get(emp.id) || [];
      const totalHours = empEntries.reduce((sum, e) => sum + Number(e.hours), 0);

      const threshold = await resolveThreshold(emp);
      const weekTotals = new Map<string, number>();
      for (const entry of empEntries) {
        const wk = weekStart(entry.entry_date);
        weekTotals.set(wk, (weekTotals.get(wk) || 0) + Number(entry.hours));
      }
      let overtimeHours = 0;
      for (const weekTotal of weekTotals.values()) {
        if (weekTotal > threshold) {
          overtimeHours += weekTotal - threshold;
        }
      }

      employeeSummaries.push({
        employeeId: emp.id,
        employeeName: `${emp.last_name}, ${emp.first_name}`,
        groupId: emp.group_id,
        totalHours,
        overtimeHours,
      });
    }

    // Group by group_id with subtotals
    const groupIds = Array.from(new Set(employeeSummaries.map(e => e.groupId)));
    const groupNameCache = new Map<number, string>();
    for (const gid of groupIds) {
      if (gid != null && !groupNameCache.has(gid)) {
        const group = await getGroupById(gid);
        groupNameCache.set(gid, group?.name || 'Unknown Group');
      }
    }

    const groupsMap = new Map<string, { groupId: number | null; groupName: string; employees: EmployeeSummary[] }>();
    for (const summary of employeeSummaries) {
      const key = summary.groupId == null ? 'none' : String(summary.groupId);
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          groupId: summary.groupId,
          groupName: summary.groupId == null ? 'Unassigned' : (groupNameCache.get(summary.groupId) || 'Unknown Group'),
          employees: [],
        });
      }
      groupsMap.get(key)!.employees.push(summary);
    }

    const groups = Array.from(groupsMap.values())
      .map(g => ({
        ...g,
        employees: g.employees.sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
        subtotalHours: g.employees.reduce((sum, e) => sum + e.totalHours, 0),
        subtotalOvertimeHours: g.employees.reduce((sum, e) => sum + e.overtimeHours, 0),
      }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName));

    const grandTotalHours = employeeSummaries.reduce((sum, e) => sum + e.totalHours, 0);

    return NextResponse.json({ startDate, endDate, groups, grandTotalHours });
  } catch (error) {
    console.error('Error fetching hours worked report:', error);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}
