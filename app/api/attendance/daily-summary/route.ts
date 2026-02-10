import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware/auth';
import { getBrandFeatures, isGlobalReadAccessEnabled } from '@/lib/brand-features';
import { getMaxOutOfOffice, getCapacityThresholds } from '@/lib/app-settings';
import { db } from '@/lib/db-sqlite';

export const dynamic = 'force-dynamic';

interface DailySummaryDay {
  outCount: number;
}

/**
 * GET /api/attendance/daily-summary?year=2026
 *
 * Returns a per-day summary of all employees' attendance entries for a year.
 * Only available when globalReadAccess is enabled.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if global read access is enabled
    const brandFeatures = await getBrandFeatures();
    if (!isGlobalReadAccessEnabled(brandFeatures)) {
      return NextResponse.json(
        { error: 'Global read access is not enabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Get count of distinct employees out per date
    const entriesResult = await db.execute({
      sql: `SELECT
              ae.entry_date,
              COUNT(DISTINCT ae.employee_id) AS out_count
            FROM attendance_entries ae
            JOIN employees e ON ae.employee_id = e.id
            WHERE ae.entry_date >= ? AND ae.entry_date <= ?
              AND e.is_active = 1
            GROUP BY ae.entry_date
            ORDER BY ae.entry_date`,
      args: [startDate, endDate],
    });

    // Count total active employees
    const countResult = await db.execute(
      'SELECT COUNT(*) as count FROM employees WHERE is_active = 1'
    );
    const totalActiveEmployees = Number(
      (countResult.rows[0] as unknown as { count: number }).count
    );

    // Get max out-of-office setting and capacity thresholds
    const maxOutOfOffice = await getMaxOutOfOffice();
    const capacityThresholds = await getCapacityThresholds();

    // Build daily summary from aggregated results
    const dailySummary: Record<string, DailySummaryDay> = {};

    for (const row of entriesResult.rows) {
      const r = row as unknown as {
        entry_date: string;
        out_count: number;
      };

      dailySummary[r.entry_date] = { outCount: Number(r.out_count) };
    }

    return NextResponse.json({
      totalActiveEmployees,
      maxOutOfOffice,
      capacityWarningCount: capacityThresholds.warningCount,
      capacityCriticalCount: capacityThresholds.criticalCount,
      dailySummary,
    });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily summary' },
      { status: 500 }
    );
  }
}
