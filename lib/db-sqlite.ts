import { createClient } from '@libsql/client';
import { getDatabasePath } from './data-paths';
import { isDemoMode, logDemoModeBanner } from './demo-mode';

// Uses centralized data paths for cross-platform compatibility
const dbPath = getDatabasePath('attendance.db');

export const db = createClient({
  url: `file:${dbPath}`,
});

export async function initializeDatabase() {
  // Create employees table (with group_id reference to auth.db)
  // Note: No foreign key constraint since groups table is in a separate database
  await db.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_number TEXT UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT DEFAULT 'employee',
      group_id INTEGER,
      date_of_hire DATE,
      rehire_date DATE,
      employment_type TEXT DEFAULT 'full_time',
      seniority_rank INTEGER,
      created_by INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add group_id column if it doesn't exist (for existing databases)
  try {
    await db.execute(`ALTER TABLE employees ADD COLUMN group_id INTEGER`);
    console.log('  ✓ Added group_id column to employees table');
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add date_of_hire column if it doesn't exist (for existing databases)
  try {
    await db.execute(`ALTER TABLE employees ADD COLUMN date_of_hire DATE`);
    console.log('  ✓ Added date_of_hire column to employees table');
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add created_by column if it doesn't exist (for existing databases)
  try {
    await db.execute(`ALTER TABLE employees ADD COLUMN created_by INTEGER`);
    console.log('  ✓ Added created_by column to employees table');
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add rehire_date column if it doesn't exist (for existing databases)
  try {
    await db.execute(`ALTER TABLE employees ADD COLUMN rehire_date DATE`);
    console.log('  ✓ Added rehire_date column to employees table');
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add employment_type column if it doesn't exist (for existing databases)
  try {
    await db.execute(`ALTER TABLE employees ADD COLUMN employment_type TEXT DEFAULT 'full_time'`);
    console.log('  ✓ Added employment_type column to employees table');
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add seniority_rank column if it doesn't exist (for existing databases)
  try {
    await db.execute(`ALTER TABLE employees ADD COLUMN seniority_rank INTEGER`);
    console.log('  ✓ Added seniority_rank column to employees table');
  } catch (error) {
    // Column already exists, ignore error
  }

  // Create time_codes table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS time_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      hours_limit INTEGER,
      default_allocation REAL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add default_allocation column if it doesn't exist (for existing databases)
  try {
    await db.execute(`ALTER TABLE time_codes ADD COLUMN default_allocation REAL`);
    console.log('  ✓ Added default_allocation column to time_codes table');
  } catch (error) {
    // Column already exists, ignore error
  }

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

  // Create employee_time_allocations table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS employee_time_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      time_code TEXT NOT NULL,
      allocated_hours REAL NOT NULL DEFAULT 0,
      year INTEGER NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (time_code) REFERENCES time_codes(code) ON UPDATE CASCADE,
      UNIQUE(employee_id, time_code, year)
    )
  `);

  // Insert default time codes
  const timeCodes = [
    { code: 'D', description: 'Discipline', hours_limit: null, default_allocation: null },
    { code: 'B', description: 'Bereavement', hours_limit: 24, default_allocation: 24 },
    { code: 'FE', description: 'Family Emergency', hours_limit: null, default_allocation: null },
    { code: 'FM', description: 'FMLA', hours_limit: null, default_allocation: null },
    { code: 'H', description: 'Holiday', hours_limit: null, default_allocation: null },
    { code: 'JD', description: 'Jury Duty', hours_limit: null, default_allocation: null },
    { code: 'FH', description: 'Floating Holiday', hours_limit: 24, default_allocation: 24 },
    { code: 'DP', description: 'Designated Person', hours_limit: null, default_allocation: null },
    { code: 'P', description: 'Personal', hours_limit: null, default_allocation: 40 },
    { code: 'LOW', description: 'Lack of Work', hours_limit: null, default_allocation: null },
    { code: 'PS', description: 'Personal Sick Day', hours_limit: 40, default_allocation: 40 },
    { code: 'T', description: 'Tardy', hours_limit: null, default_allocation: null },
    { code: 'V', description: 'Vacation', hours_limit: null, default_allocation: 80 },
    { code: 'WC', description: 'Workers Comp', hours_limit: null, default_allocation: null },
  ];

  for (const tc of timeCodes) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO time_codes (code, description, hours_limit, default_allocation) VALUES (?, ?, ?, ?)',
      args: [tc.code, tc.description, tc.hours_limit, tc.default_allocation],
    });
  }

  // Update existing time codes with default allocations (for existing databases)
  for (const tc of timeCodes) {
    if (tc.default_allocation !== null) {
      await db.execute({
        sql: 'UPDATE time_codes SET default_allocation = ? WHERE code = ? AND default_allocation IS NULL',
        args: [tc.default_allocation, tc.code],
      });
    }
  }

  // Migration: Add time_code_id column to attendance_entries
  try {
    await db.execute(`ALTER TABLE attendance_entries ADD COLUMN time_code_id INTEGER REFERENCES time_codes(id)`);
    console.log('  ✓ Added time_code_id column to attendance_entries table');
  } catch (error) {
    // Column already exists, ignore error
  }

  // Migration: Add time_code_id column to employee_time_allocations
  try {
    await db.execute(`ALTER TABLE employee_time_allocations ADD COLUMN time_code_id INTEGER REFERENCES time_codes(id)`);
    console.log('  ✓ Added time_code_id column to employee_time_allocations table');
  } catch (error) {
    // Column already exists, ignore error
  }

  // Migration: Populate time_code_id in attendance_entries from time_code (text)
  await db.execute(`
    UPDATE attendance_entries
    SET time_code_id = (SELECT id FROM time_codes WHERE code = attendance_entries.time_code)
    WHERE time_code_id IS NULL AND time_code IS NOT NULL
  `);

  // Migration: Populate time_code_id in employee_time_allocations from time_code (text)
  await db.execute(`
    UPDATE employee_time_allocations
    SET time_code_id = (SELECT id FROM time_codes WHERE code = employee_time_allocations.time_code)
    WHERE time_code_id IS NULL AND time_code IS NOT NULL
  `);

  console.log('  ✓ Migrated time codes to use IDs instead of text codes');

  // Validate schema after initialization
  await validateSchema();

  console.log('✓ Attendance database initialized');
  console.log('  - Employees table created');
  console.log('  - Time codes table created');
  console.log('  - Attendance entries table created');
  console.log('  - Employee time allocations table created');
  console.log('  - Default time codes inserted');
}

async function validateSchema() {
  try {
    // Check if employees table has all required columns
    const result = await db.execute('PRAGMA table_info(employees)');
    const columns = result.rows.map((row: any) => row.name);

    const requiredColumns = [
      'id',
      'employee_number',
      'first_name',
      'last_name',
      'email',
      'role',
      'group_id',
      'date_of_hire',
      'rehire_date',
      'employment_type',
      'seniority_rank',
      'created_by',
      'is_active',
      'created_at',
      'updated_at'
    ];

    const missingColumns = requiredColumns.filter(col => !columns.includes(col));

    if (missingColumns.length > 0) {
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  WARNING: Database schema is out of sync!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('Missing columns in employees table:');
      missingColumns.forEach(col => {
        console.log(`  ✗ ${col}`);
      });
      console.log('');
      console.log('The automatic migration failed to add these columns.');
      console.log('');
      console.log('To fix this, run:');
      console.log('  npm run db:reset');
      console.log('');
      console.log('This will:');
      console.log('  1. Drop and recreate all tables');
      console.log('  2. Add the missing columns');
      console.log('  3. Restore default time codes');
      console.log('');
      console.log('⚠️  NOTE: This will DELETE all existing data!');
      console.log('         Back up your database first if you want to keep it.');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
    } else {
      console.log('✓ Database schema validation passed - all columns present');
    }
  } catch (error) {
    // Silently ignore validation errors (table might not exist yet)
  }
}

/**
 * Clear all data from tables (for demo mode)
 * This preserves the schema but removes all rows
 */
async function clearDatabaseForDemo() {
  console.log('');
  console.log('Clearing database for demo mode...');

  // Delete in order to respect foreign key constraints
  const tablesToClear = [
    'attendance_entries',
    'employee_time_allocations',
    'employees',
  ];

  for (const table of tablesToClear) {
    try {
      await db.execute(`DELETE FROM ${table}`);
      console.log(`  ✓ Cleared table: ${table}`);
    } catch (error) {
      console.log(`  ⚠ Could not clear table ${table}`);
    }
  }

  console.log('  ✓ Database cleared for demo mode');
}

/**
 * Seed demo data after clearing
 */
async function seedDemoDataInternal() {
  try {
    // Import from lib folder (bundled with standalone build)
    const { seedDemoData } = await import('./seed-demo-data');
    await seedDemoData();
  } catch (error) {
    console.error('Failed to seed demo data:', error);
    // Non-fatal - continue without demo data
  }
}

// Singleton initialization - only run once per process
let initPromise: Promise<void> | null = null;

export function ensureInitialized() {
  console.log('[DB-INIT] ensureInitialized called');
  console.log('[DB-INIT] initPromise:', initPromise ? 'exists' : 'null');
  console.log('[DB-INIT] window:', typeof window);
  console.log('[DB-INIT] NODE_ENV:', process.env.NODE_ENV);
  console.log('[DB-INIT] NEXT_PHASE:', process.env.NEXT_PHASE);
  console.log('[DB-INIT] DEMO_MODE:', process.env.DEMO_MODE);
  console.log('[DB-INIT] DATA_PATH:', process.env.DATA_PATH);

  if (!initPromise && typeof window === 'undefined') {
    // Only initialize at runtime, not during build
    if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE !== 'phase-production-build') {
      console.log('[DB-INIT] Starting initialization...');
      initPromise = initializeDatabaseWithDemoMode();
    } else {
      console.log('[DB-INIT] Skipping - build phase detected');
    }
  } else {
    console.log('[DB-INIT] Skipping - already initialized or in browser');
  }
  return initPromise;
}

/**
 * Initialize database with demo mode support
 */
async function initializeDatabaseWithDemoMode() {
  console.log('[DB-INIT] initializeDatabaseWithDemoMode starting...');

  // Log demo mode banner if enabled
  logDemoModeBanner();

  // Initialize database schema
  await initializeDatabase();

  // If demo mode is enabled, clear and reseed
  const demoMode = isDemoMode();
  console.log('[DB-INIT] isDemoMode() returned:', demoMode);

  if (demoMode) {
    console.log('[DB-INIT] Demo mode enabled - clearing and seeding...');
    await clearDatabaseForDemo();
    await seedDemoDataInternal();
    console.log('[DB-INIT] Demo seeding complete');
  } else {
    console.log('[DB-INIT] Demo mode disabled - skipping seed');
  }
}
