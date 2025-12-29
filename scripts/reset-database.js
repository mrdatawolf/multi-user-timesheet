/**
 * Database Reset Script
 *
 * This script will:
 * 1. Delete the existing database
 * 2. Recreate it with a fresh schema
 * 3. Add default time codes
 *
 * WARNING: This will DELETE ALL DATA!
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const dbPath = path.join(__dirname, '..', 'databases', 'attendance.db');

console.log('==========================================');
console.log('  Database Reset Tool');
console.log('==========================================');
console.log('');
console.log('WARNING: This will DELETE ALL existing data!');
console.log('Database location:', dbPath);
console.log('');

// Delete existing database files
const filesToDelete = [
  dbPath,
  `${dbPath}-shm`,
  `${dbPath}-wal`
];

console.log('Deleting existing database files...');
filesToDelete.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log('  Deleted:', file);
  }
});

console.log('');
console.log('Creating fresh database...');

// Create new database
const db = createClient({
  url: `file:${dbPath}`,
});

async function initializeDatabase() {
  // Create employees table
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
  console.log('  ✓ Created employees table');

  // Create time_codes table
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
  console.log('  ✓ Created time_codes table');

  // Create attendance_entries table
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
  console.log('  ✓ Created attendance_entries table');

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

  console.log('  ✓ Inserting default time codes...');
  for (const tc of timeCodes) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO time_codes (code, description, hours_limit) VALUES (?, ?, ?)',
      args: [tc.code, tc.description, tc.hours_limit],
    });
  }
  console.log(`  ✓ Added ${timeCodes.length} time codes`);

  console.log('');
  console.log('==========================================');
  console.log('  Database reset complete!');
  console.log('==========================================');
  console.log('');
  console.log('The database has been reset with:');
  console.log('  - Empty employees table');
  console.log('  - Empty attendance entries');
  console.log(`  - ${timeCodes.length} default time codes`);
  console.log('');
  console.log('You can now start fresh!');
}

initializeDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error resetting database:', err);
    process.exit(1);
  });
