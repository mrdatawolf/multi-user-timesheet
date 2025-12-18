import { createClient } from '@libsql/client';
import path from 'path';

const dbPath = path.join(process.cwd(), 'databases', 'attendance.db');

export const db = createClient({
  url: `file:${dbPath}`,
});

export async function initializeDatabase() {
  // Create tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_number TEXT UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT DEFAULT 'employee',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS time_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      hours_limit INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS attendance_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      entry_date DATE NOT NULL,
      time_code TEXT NOT NULL,
      hours REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (time_code) REFERENCES time_codes(code) ON UPDATE CASCADE
    )
  `);

  // Insert default time codes
  const timeCodes = [
    { code: 'D', description: 'Discipline', hours_limit: null },
    { code: 'B', description: 'Bereavement', hours_limit: 24 },
    { code: 'FE', description: 'Family Emergency', hours_limit: null },
    { code: 'FM', description: 'FMLA', hours_limit: null },
    { code: 'H', description: 'Holiday', hours_limit: null },
    { code: 'JD', description: 'Jury Duty', hours_limit: null },
    { code: 'FH', description: 'Floating Holiday', hours_limit: 24 },
    { code: 'DP', description: 'Designated Person', hours_limit: null },
    { code: 'P', description: 'Personal', hours_limit: null },
    { code: 'LOW', description: 'Lack of Work', hours_limit: null },
    { code: 'PS', description: 'Personal Sick Day', hours_limit: 40 },
    { code: 'T', description: 'Tardy', hours_limit: null },
    { code: 'V', description: 'Vacation', hours_limit: null },
    { code: 'WC', description: 'Workers Comp', hours_limit: null },
  ];

  for (const tc of timeCodes) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO time_codes (code, description, hours_limit) VALUES (?, ?, ?)',
      args: [tc.code, tc.description, tc.hours_limit],
    });
  }
}
