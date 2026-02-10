import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware/auth';
import { getUserReadableGroups, isSuperuser } from '@/lib/queries-auth';
import { db } from '@/lib/db-sqlite';
import { getBrandFeatures, getLeaveBalanceSummaryConfig, isGlobalReadAccessEnabled } from '@/lib/brand-features';
import { getBrandTimeCodes } from '@/lib/brand-time-codes';

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';

interface EmployeeBalance {
  timeCode: string;
  label: string;
  used: number;
  allocated: number | null;
  hasAllocation: boolean;
}

interface EmployeeRow {
  id: number;
  name: string;
  balances: EmployeeBalance[];
}

interface ColumnDef {
  timeCode: string;
  label: string;
  hasAllocation: boolean;
}

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
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    // Get brand features for leave types and report config
    const brandFeatures = await getBrandFeatures();
    const reportConfig = getLeaveBalanceSummaryConfig(brandFeatures);

    if (!reportConfig.enabled) {
      return NextResponse.json(
        { error: 'Leave Balance Summary report is not enabled for this brand' },
        { status: 403 }
      );
    }

    // Get enabled leave types from brand features
    const leaveTypes = brandFeatures.features.leaveManagement.leaveTypes || {};
    const enabledLeaveTypes = Object.entries(leaveTypes)
      .filter(([, config]) => config.enabled && config.timeCode)
      .map(([key, config]) => ({
        key,
        timeCode: config.timeCode!,
        label: config.label || config.timeCode!,
      }));

    if (enabledLeaveTypes.length === 0) {
      return NextResponse.json({
        employees: [],
        columns: [],
        config: reportConfig,
      });
    }

    // Get brand time codes for default allocations
    const brandTimeCodes = getBrandTimeCodes() || [];
    const timeCodeDefaults = new Map(
      brandTimeCodes.map(tc => [tc.code, tc.default_allocation])
    );

    // Check if user is superuser or has global read access for permission filtering
    const userIsSuperuser = await isSuperuser(authUser.id);
    const globalRead = isGlobalReadAccessEnabled(brandFeatures);

    // Build employee query with permission filtering
    let employeeSql = `
      SELECT id, first_name, last_name
      FROM employees
      WHERE is_active = 1
    `;
    const employeeArgs: any[] = [];

    if (!userIsSuperuser && !globalRead) {
      const readableGroupIds = await getUserReadableGroups(authUser.id);
      if (authUser.group_id && !readableGroupIds.includes(authUser.group_id)) {
        readableGroupIds.push(authUser.group_id);
      }

      if (readableGroupIds.length > 0) {
        const placeholders = readableGroupIds.map(() => '?').join(', ');
        employeeSql += ` AND (group_id IS NULL OR group_id IN (${placeholders}))`;
        employeeArgs.push(...readableGroupIds);
      } else {
        employeeSql += ' AND group_id IS NULL';
      }
    }

    employeeSql += ' ORDER BY last_name, first_name';

    const employeesResult = await db.execute({
      sql: employeeSql,
      args: employeeArgs,
    });

    const employees = employeesResult.rows as unknown as Array<{
      id: number;
      first_name: string;
      last_name: string;
    }>;

    if (employees.length === 0) {
      return NextResponse.json({
        employees: [],
        columns: [],
        config: reportConfig,
      });
    }

    // Get all employee IDs for batch queries
    const employeeIds = employees.map(e => e.id);

    // Get allocations for all employees
    const allocPlaceholders = employeeIds.map(() => '?').join(', ');
    const allocationsResult = await db.execute({
      sql: `SELECT employee_id, time_code, allocated_hours
            FROM employee_time_allocations
            WHERE employee_id IN (${allocPlaceholders}) AND year = ?`,
      args: [...employeeIds, year],
    });

    // Build allocation lookup: Map<employeeId, Map<timeCode, hours>>
    const allocationsMap = new Map<number, Map<string, number>>();
    for (const row of allocationsResult.rows as unknown as Array<{
      employee_id: number;
      time_code: string;
      allocated_hours: number;
    }>) {
      if (!allocationsMap.has(row.employee_id)) {
        allocationsMap.set(row.employee_id, new Map());
      }
      allocationsMap.get(row.employee_id)!.set(row.time_code, row.allocated_hours);
    }

    // Get usage for all employees for the year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const usageResult = await db.execute({
      sql: `SELECT employee_id, time_code, SUM(hours) AS total_hours
            FROM attendance_entries
            WHERE employee_id IN (${allocPlaceholders})
              AND entry_date >= ? AND entry_date <= ?
            GROUP BY employee_id, time_code`,
      args: [...employeeIds, startDate, endDate],
    });

    // Build usage lookup: Map<employeeId, Map<timeCode, hours>>
    const usageMap = new Map<number, Map<string, number>>();
    for (const row of usageResult.rows as unknown as Array<{
      employee_id: number;
      time_code: string;
      total_hours: number;
    }>) {
      if (!usageMap.has(row.employee_id)) {
        usageMap.set(row.employee_id, new Map());
      }
      usageMap.get(row.employee_id)!.set(row.time_code, row.total_hours);
    }

    // Determine which leave types have allocations (for column ordering)
    const leaveTypesWithAllocation = enabledLeaveTypes.filter(lt => {
      const defaultAlloc = timeCodeDefaults.get(lt.timeCode);
      return defaultAlloc !== null && defaultAlloc !== undefined;
    });
    const leaveTypesUsageOnly = enabledLeaveTypes.filter(lt => {
      const defaultAlloc = timeCodeDefaults.get(lt.timeCode);
      return defaultAlloc === null || defaultAlloc === undefined;
    });

    // Order: allocation-based first, then usage-only
    const orderedLeaveTypes = [...leaveTypesWithAllocation, ...leaveTypesUsageOnly];

    // Build columns
    const columns: ColumnDef[] = orderedLeaveTypes.map(lt => ({
      timeCode: lt.timeCode,
      label: lt.label,
      hasAllocation: leaveTypesWithAllocation.some(a => a.timeCode === lt.timeCode),
    }));

    // Build employee rows with balances
    const employeeRows: EmployeeRow[] = employees.map(emp => {
      const empAllocations = allocationsMap.get(emp.id) || new Map();
      const empUsage = usageMap.get(emp.id) || new Map();

      const balances: EmployeeBalance[] = orderedLeaveTypes.map(lt => {
        const defaultAlloc = timeCodeDefaults.get(lt.timeCode);
        const hasAllocation = defaultAlloc !== null && defaultAlloc !== undefined;

        // Get allocated hours: override > default > null
        let allocated: number | null = null;
        if (hasAllocation) {
          allocated = empAllocations.has(lt.timeCode)
            ? empAllocations.get(lt.timeCode)!
            : (defaultAlloc ?? 0);
        }

        const used = empUsage.get(lt.timeCode) || 0;

        return {
          timeCode: lt.timeCode,
          label: lt.label,
          used,
          allocated,
          hasAllocation,
        };
      });

      return {
        id: emp.id,
        name: `${emp.last_name}, ${emp.first_name}`,
        balances,
      };
    });

    return NextResponse.json({
      employees: employeeRows,
      columns,
      config: {
        warningThreshold: reportConfig.warningThreshold,
        criticalThreshold: reportConfig.criticalThreshold,
      },
      year,
    });
  } catch (error) {
    console.error('Error fetching leave balance summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave balance summary' },
      { status: 500 }
    );
  }
}
