import { db } from './db-sqlite';

export interface Employee {
  id: number;
  employee_number?: string;
  first_name: string;
  last_name: string;
  email?: string;
  role: string;
  group_id?: number;
  date_of_hire?: string;
  rehire_date?: string;
  employment_type?: string;  // 'full_time' | 'part_time'
  seniority_rank?: number;   // 1-5 (tiebreaker for same hire dates)
  abbreviation?: string;     // 1-3 char unique identifier
  overtime_threshold_hours?: number | null; // per-employee override of the weekly OT threshold
  created_by?: number;
  is_active: number;
}

export interface HoursEntry {
  id: number;
  employee_id: number;
  entry_date: string;
  hours: number;
  work_location?: 'onsite' | 'remote' | null;
  notes?: string;
}

// Employee queries
export async function getAllEmployees(): Promise<Employee[]> {
  const result = await db.execute('SELECT * FROM employees ORDER BY last_name, first_name');
  return result.rows as unknown as Employee[];
}

export async function getEmployeeById(id: number): Promise<Employee | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM employees WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as Employee) || null;
}

export async function createEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
  const result = await db.execute({
    sql: `INSERT INTO employees (employee_number, first_name, last_name, email, role, group_id, date_of_hire, rehire_date, employment_type, seniority_rank, abbreviation, overtime_threshold_hours, created_by, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      employee.employee_number || null,
      employee.first_name,
      employee.last_name,
      employee.email || null,
      employee.role,
      employee.group_id || null,
      employee.date_of_hire || null,
      employee.rehire_date || null,
      employee.employment_type || 'full_time',
      employee.seniority_rank || null,
      employee.abbreviation || null,
      employee.overtime_threshold_hours ?? null,
      employee.created_by || null,
      employee.is_active,
    ],
  });

  const id = Number(result.lastInsertRowid);
  return { id, ...employee };
}

// Hours entry queries
export async function getAllEntries(startDate?: string, endDate?: string): Promise<HoursEntry[]> {
  if (startDate && endDate) {
    const result = await db.execute({
      sql: 'SELECT * FROM hours_entries WHERE entry_date >= ? AND entry_date <= ? ORDER BY entry_date DESC',
      args: [startDate, endDate],
    });
    return result.rows as unknown as HoursEntry[];
  }
  const result = await db.execute('SELECT * FROM hours_entries ORDER BY entry_date DESC');
  return result.rows as unknown as HoursEntry[];
}

export async function getEntriesForDateRange(employeeId: number, startDate: string, endDate: string): Promise<HoursEntry[]> {
  const result = await db.execute({
    sql: `SELECT * FROM hours_entries
          WHERE employee_id = ? AND entry_date >= ? AND entry_date <= ?
          ORDER BY entry_date`,
    args: [employeeId, startDate, endDate],
  });

  return result.rows as unknown as HoursEntry[];
}

export async function upsertEntry(entry: Omit<HoursEntry, 'id'>): Promise<void> {
  const existing = await db.execute({
    sql: 'SELECT id FROM hours_entries WHERE employee_id = ? AND entry_date = ?',
    args: [entry.employee_id, entry.entry_date],
  });

  if (existing.rows.length > 0) {
    await db.execute({
      sql: `UPDATE hours_entries
            SET hours = ?, work_location = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE employee_id = ? AND entry_date = ?`,
      args: [entry.hours, entry.work_location || null, entry.notes || null, entry.employee_id, entry.entry_date],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO hours_entries (employee_id, entry_date, hours, work_location, notes)
            VALUES (?, ?, ?, ?, ?)`,
      args: [entry.employee_id, entry.entry_date, entry.hours, entry.work_location || null, entry.notes || null],
    });
  }
}

export async function deleteEntry(employeeId: number, entryDate: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM hours_entries WHERE employee_id = ? AND entry_date = ?',
    args: [employeeId, entryDate],
  });
}
