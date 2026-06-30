import { createClient } from '@libsql/client';
import { getDatabasePath, getDataDirectory } from './data-paths';
import { isDemoMode, logDemoModeBanner } from './demo-mode';
import packageJson from '../package.json';

// Uses centralized data paths for cross-platform compatibility
const dbPath = getDatabasePath('hours.db');

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
      abbreviation TEXT,
      show_in_office_presence INTEGER DEFAULT 1,
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

  // Add abbreviation column if it doesn't exist (for existing databases)
  try {
    await db.execute(`ALTER TABLE employees ADD COLUMN abbreviation TEXT`);
    console.log('  ✓ Added abbreviation column to employees table');
  } catch (error) {
    // Column already exists, ignore error
  }

  // Add overtime_threshold_hours column if it doesn't exist (for existing databases)
  try {
    await db.execute(`ALTER TABLE employees ADD COLUMN overtime_threshold_hours REAL`);
    console.log('  ✓ Added overtime_threshold_hours column to employees table');
  } catch (error) {
    // Column already exists, ignore error
  }

  // Create hours_entries table: one row per employee per day worked
  await db.execute(`
    CREATE TABLE IF NOT EXISTS hours_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      entry_date DATE NOT NULL,
      hours REAL NOT NULL DEFAULT 0,
      work_location TEXT CHECK(work_location IN ('onsite', 'remote')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // Create report_other_hours table: manual "Other" hours adjustment per employee
  // per week, used by the Grayson Time Report (e.g. holiday/bereavement/correction
  // hours that aren't captured by daily hours_entries since this app doesn't track
  // leave types).
  await db.execute(`
    CREATE TABLE IF NOT EXISTS report_other_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      week_start_date DATE NOT NULL,
      hours REAL NOT NULL DEFAULT 0,
      updated_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, week_start_date),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // Create report_notes table: free-text "Changes" notes per employee per
  // report period, used by the Grayson Time Report.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS report_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      period_start DATE NOT NULL,
      notes TEXT,
      updated_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, period_start),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // Validate schema after initialization
  await validateSchema();

  console.log('✓ Hours database initialized');
  console.log('  - Employees table created');
  console.log('  - Hours entries table created');
  console.log('  - Report other hours table created');
  console.log('  - Report notes table created');
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
export async function clearDatabaseForDemo() {
  console.log('');
  console.log('Clearing database for demo mode...');

  // Delete in order to respect foreign key constraints
  const tablesToClear = [
    'hours_entries',
    'report_other_hours',
    'report_notes',
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
  if (!initPromise && typeof window === 'undefined') {
    // Only initialize at runtime, not during build
    if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE !== 'phase-production-build') {
      initPromise = initializeDatabaseWithDemoMode();
    }
  }
  return initPromise;
}

/**
 * Initialize database with demo mode support
 */
async function initializeDatabaseWithDemoMode() {
  console.log(`========================================`);
  console.log(`  Hours Worked Tracker v${packageJson.version}`);
  console.log(`  Data directory: ${getDataDirectory()}`);
  console.log(`========================================`);

  // Log demo mode banner if enabled
  logDemoModeBanner();

  // Initialize database schema
  await initializeDatabase();

  // If demo mode is enabled, clear and reseed
  if (isDemoMode()) {
    await clearDatabaseForDemo();
    await seedDemoDataInternal();
  }
}
