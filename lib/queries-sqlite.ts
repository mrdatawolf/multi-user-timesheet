import { db } from './db-sqlite';

export interface Employee {
  id: number;
  employee_number?: string;
  first_name: string;
  last_name: string;
  email?: string;
  role: string;
  is_active: number;
}

export interface TimeCode {
  id: number;
  code: string;
  description: string;
  hours_limit?: number;
  is_active: number;
}

export interface AttendanceEntry {
  id: number;
  employee_id: number;
  entry_date: string;
  time_code: string;
  hours: number;
  notes?: string;
}

// Employee queries
export async function getAllEmployees(): Promise<Employee[]> {
  const result = await db.execute('SELECT * FROM employees WHERE is_active = 1 ORDER BY last_name, first_name');
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
    sql: `INSERT INTO employees (employee_number, first_name, last_name, email, role, is_active)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      employee.employee_number || null,
      employee.first_name,
      employee.last_name,
      employee.email || null,
      employee.role,
      employee.is_active,
    ],
  });

  const id = Number(result.lastInsertRowid);
  return { id, ...employee };
}

// Time code queries
export async function getAllTimeCodes(): Promise<TimeCode[]> {
  const result = await db.execute('SELECT * FROM time_codes WHERE is_active = 1 ORDER BY code');
  return result.rows as unknown as TimeCode[];
}

// Attendance entry queries
export async function getAllEntries(): Promise<AttendanceEntry[]> {
  const result = await db.execute('SELECT * FROM attendance_entries ORDER BY entry_date DESC');
  return result.rows as unknown as AttendanceEntry[];
}

export async function getEntriesForDateRange(employeeId: number, startDate: string, endDate: string): Promise<AttendanceEntry[]> {
  const result = await db.execute({
    sql: `SELECT * FROM attendance_entries
          WHERE employee_id = ? AND entry_date >= ? AND entry_date <= ?
          ORDER BY entry_date`,
    args: [employeeId, startDate, endDate],
  });

  return result.rows as unknown as AttendanceEntry[];
}

export async function upsertEntry(entry: Omit<AttendanceEntry, 'id'>): Promise<void> {
  // Check if entry exists
  const existing = await db.execute({
    sql: 'SELECT id FROM attendance_entries WHERE employee_id = ? AND entry_date = ?',
    args: [entry.employee_id, entry.entry_date],
  });

  if (existing.rows.length > 0) {
    // Update
    await db.execute({
      sql: `UPDATE attendance_entries
            SET time_code = ?, hours = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE employee_id = ? AND entry_date = ?`,
      args: [entry.time_code, entry.hours, entry.notes || null, entry.employee_id, entry.entry_date],
    });
  } else {
    // Insert
    await db.execute({
      sql: `INSERT INTO attendance_entries (employee_id, entry_date, time_code, hours, notes)
            VALUES (?, ?, ?, ?, ?)`,
      args: [entry.employee_id, entry.entry_date, entry.time_code, entry.hours, entry.notes || null],
    });
  }
}

export async function deleteEntry(employeeId: number, entryDate: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM attendance_entries WHERE employee_id = ? AND entry_date = ?',
    args: [employeeId, entryDate],
  });
}

// Report queries
export async function getReportData({
  employeeId,
  timeCode,
  startDate,
  endDate,
}: {
  employeeId: string;
  timeCode: string;
  startDate: string;
  endDate: string;
}): Promise<any[]> {
  let sql = `
    SELECT
      e.first_name || ' ' || e.last_name AS employee_name,
      te.entry_date,
      te.time_code,
      te.hours,
      te.notes
    FROM attendance_entries te
    JOIN employees e ON te.employee_id = e.id
    WHERE te.entry_date >= ? AND te.entry_date <= ?
  `;

  const args: any[] = [startDate, endDate];

  if (employeeId !== 'all') {
    sql += ' AND te.employee_id = ?';
    args.push(parseInt(employeeId));
  }

  if (timeCode !== 'all') {
    sql += ' AND te.time_code = ?';
    args.push(timeCode);
  }

  sql += ' ORDER BY te.entry_date, employee_name';

  const result = await db.execute({ sql, args });
  return result.rows;
}
