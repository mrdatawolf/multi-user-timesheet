import { NextResponse } from 'next/server';
import { getAllEntries, getEntriesForDateRange, upsertEntry, deleteEntry } from '@/lib/queries-sqlite';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeIdParam = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // If no employeeId is provided, return all entries
    if (!employeeIdParam) {
      const entries = await getAllEntries();
      return NextResponse.json(entries);
    }

    const employeeId = parseInt(employeeIdParam);

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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'delete') {
      await deleteEntry(body.employee_id, body.entry_date);
    } else {
      await upsertEntry({
        employee_id: body.employee_id,
        entry_date: body.entry_date,
        time_code: body.time_code,
        hours: body.hours || 0,
        notes: body.notes
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
  }
}
