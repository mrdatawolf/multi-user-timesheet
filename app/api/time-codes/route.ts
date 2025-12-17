import { NextResponse } from 'next/server';
import { getAllTimeCodes } from '@/lib/queries-sqlite';

export async function GET() {
  try {
    const timeCodes = await getAllTimeCodes();
    return NextResponse.json(timeCodes);
  } catch (error) {
    console.error('Error fetching time codes:', error);
    return NextResponse.json({ error: 'Failed to fetch time codes' }, { status: 500 });
  }
}
