import { NextResponse } from 'next/server';
import { getAllTimeCodes } from '@/lib/queries-sqlite';
import { getBrandTimeCodes } from '@/lib/brand-time-codes';

export async function GET() {
  try {
    // Try to load from brand-specific JSON first
    const jsonTimeCodes = getBrandTimeCodes();

    if (jsonTimeCodes) {
      // Transform null hours_limit to undefined for consistency with DB interface
      const timeCodes = jsonTimeCodes.map(tc => ({
        id: tc.id,
        code: tc.code,
        description: tc.description,
        hours_limit: tc.hours_limit ?? undefined,
        is_active: tc.is_active,
      }));
      return NextResponse.json(timeCodes);
    }

    // Fall back to database if no JSON file exists
    const timeCodes = await getAllTimeCodes();
    return NextResponse.json(timeCodes);
  } catch (error) {
    console.error('Error fetching time codes:', error);
    return NextResponse.json({ error: 'Failed to fetch time codes' }, { status: 500 });
  }
}
