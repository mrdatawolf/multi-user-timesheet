export interface HoursEntry {
  id?: number;
  employee_id?: number;
  entry_date: string;
  hours: number;
  work_location?: 'onsite' | 'remote' | null;
  notes?: string;
}

export type ViewType = 'year' | 'month' | 'week';

export interface EntryChangeResult {
  success: boolean;
  error?: string;
}

export const MAX_BULK_DAYS = 90;
