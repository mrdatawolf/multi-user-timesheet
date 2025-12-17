import { NextResponse } from 'next/server';
import { getReportData } from '@/lib/queries-sqlite';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || 'all';
    const timeCode = searchParams.get('timeCode') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const reportData = await getReportData({
      employeeId,
      timeCode,
      startDate,
      endDate,
    });

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error fetching report data:', error);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}
