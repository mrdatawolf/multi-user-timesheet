import { NextResponse } from 'next/server';
import { getBrandReportDefinitions, getReportDefinitionById } from '@/lib/brand-reports';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (reportId) {
      // Return specific report definition
      const report = getReportDefinitionById(reportId);
      if (!report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      return NextResponse.json(report);
    }

    // Return all report definitions
    const reports = getBrandReportDefinitions();
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching report definitions:', error);
    return NextResponse.json({ error: 'Failed to fetch report definitions' }, { status: 500 });
  }
}
