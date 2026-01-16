/**
 * Demo Seed Script
 *
 * Seeds the database with comprehensive demo data for presentations.
 * This script is run automatically when DEMO_MODE=true.
 *
 * Demo data includes:
 * - Multiple employees with varied hire dates and employment types
 * - Attendance entries for the current month
 * - Examples that showcase NFL brand features (seniority, employment type)
 *
 * The data is designed to demonstrate:
 * - Seniority calculations (different hire dates, rehires, tiebreakers)
 * - Employment type distinctions (full-time vs part-time)
 * - Attendance tracking with various time codes
 * - Reports and filtering capabilities
 */

import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'databases', 'attendance.db');

const db = createClient({
  url: `file:${dbPath}`,
});

// Helper to get dates relative to today
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function monthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
}

function yearsAgo(years: number, monthOffset = 0): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setMonth(date.getMonth() + monthOffset);
  return date.toISOString().split('T')[0];
}

export async function seedDemoData() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   SEEDING DEMO DATA                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Demo employees with varied profiles
    const employees = [
      // Long-tenured employees (for seniority demo)
      {
        number: 'DEMO001',
        first: 'Robert',
        last: 'Anderson',
        email: 'robert.anderson@demo.com',
        role: 'employee',
        group_id: 4, // Employees
        date_of_hire: yearsAgo(8, 3), // 8+ years - most senior
        rehire_date: null,
        employment_type: 'full_time',
        seniority_rank: null,
      },
      {
        number: 'DEMO002',
        first: 'Patricia',
        last: 'Williams',
        email: 'patricia.williams@demo.com',
        role: 'manager',
        group_id: 2, // Managers
        date_of_hire: yearsAgo(6), // 6 years
        rehire_date: null,
        employment_type: 'full_time',
        seniority_rank: null,
      },
      // Same hire date with seniority tiebreaker demo
      {
        number: 'DEMO003',
        first: 'James',
        last: 'Miller',
        email: 'james.miller@demo.com',
        role: 'employee',
        group_id: 4,
        date_of_hire: yearsAgo(3), // Same as DEMO004
        rehire_date: null,
        employment_type: 'full_time',
        seniority_rank: 5, // More senior due to rank
      },
      {
        number: 'DEMO004',
        first: 'Jennifer',
        last: 'Davis',
        email: 'jennifer.davis@demo.com',
        role: 'employee',
        group_id: 4,
        date_of_hire: yearsAgo(3), // Same as DEMO003
        rehire_date: null,
        employment_type: 'full_time',
        seniority_rank: 2, // Less senior due to rank
      },
      // Rehired employee demo
      {
        number: 'DEMO005',
        first: 'Michael',
        last: 'Johnson',
        email: 'michael.johnson@demo.com',
        role: 'employee',
        group_id: 4,
        date_of_hire: yearsAgo(7), // Originally hired 7 years ago
        rehire_date: yearsAgo(1), // But rehired 1 year ago
        employment_type: 'full_time',
        seniority_rank: 3,
      },
      // Part-time employees
      {
        number: 'DEMO006',
        first: 'Sarah',
        last: 'Martinez',
        email: 'sarah.martinez@demo.com',
        role: 'employee',
        group_id: 4,
        date_of_hire: yearsAgo(2),
        rehire_date: null,
        employment_type: 'part_time',
        seniority_rank: null,
      },
      {
        number: 'DEMO007',
        first: 'David',
        last: 'Garcia',
        email: 'david.garcia@demo.com',
        role: 'employee',
        group_id: 4,
        date_of_hire: monthsAgo(8),
        rehire_date: null,
        employment_type: 'part_time',
        seniority_rank: null,
      },
      // HR specialist
      {
        number: 'DEMO008',
        first: 'Lisa',
        last: 'Thompson',
        email: 'lisa.thompson@demo.com',
        role: 'hr_specialist',
        group_id: 3, // HR
        date_of_hire: yearsAgo(4),
        rehire_date: null,
        employment_type: 'full_time',
        seniority_rank: null,
      },
      // Recent hires
      {
        number: 'DEMO009',
        first: 'Christopher',
        last: 'Brown',
        email: 'christopher.brown@demo.com',
        role: 'employee',
        group_id: 4,
        date_of_hire: monthsAgo(3),
        rehire_date: null,
        employment_type: 'full_time',
        seniority_rank: null,
      },
      {
        number: 'DEMO010',
        first: 'Amanda',
        last: 'Wilson',
        email: 'amanda.wilson@demo.com',
        role: 'employee',
        group_id: 4,
        date_of_hire: monthsAgo(1),
        rehire_date: null,
        employment_type: 'full_time',
        seniority_rank: null,
      },
    ];

    console.log('Creating demo employees...');
    const employeeIds: { [key: string]: number } = {};

    for (const emp of employees) {
      try {
        const result = await db.execute({
          sql: `INSERT INTO employees (
            employee_number, first_name, last_name, email, role, group_id,
            date_of_hire, rehire_date, employment_type, seniority_rank,
            created_by, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            emp.number,
            emp.first,
            emp.last,
            emp.email,
            emp.role,
            emp.group_id,
            emp.date_of_hire,
            emp.rehire_date,
            emp.employment_type,
            emp.seniority_rank,
            1, // Created by admin
            1, // Active
          ],
        });
        employeeIds[emp.number] = Number(result.lastInsertRowid);
        console.log(`  ✓ ${emp.first} ${emp.last} (${emp.number}) - ${emp.employment_type}`);
      } catch (error: any) {
        if (error.message?.includes('UNIQUE constraint failed')) {
          console.log(`  ⊘ ${emp.first} ${emp.last} already exists`);
          // Get existing employee ID
          const existing = await db.execute({
            sql: 'SELECT id FROM employees WHERE employee_number = ?',
            args: [emp.number],
          });
          if (existing.rows.length > 0) {
            employeeIds[emp.number] = Number((existing.rows[0] as any).id);
          }
        } else {
          throw error;
        }
      }
    }

    // Create attendance entries for the current month
    console.log('');
    console.log('Creating demo attendance entries...');

    // Get time code IDs
    const timeCodesResult = await db.execute('SELECT id, code FROM time_codes');
    const timeCodes: { [key: string]: number } = {};
    for (const row of timeCodesResult.rows as any[]) {
      timeCodes[row.code] = row.id;
    }

    // Sample attendance entries
    const attendanceEntries = [
      // Robert Anderson - Vacation last week
      { empNum: 'DEMO001', date: daysAgo(7), code: 'V', hours: 8, notes: 'Summer vacation' },
      { empNum: 'DEMO001', date: daysAgo(6), code: 'V', hours: 8, notes: 'Summer vacation' },
      { empNum: 'DEMO001', date: daysAgo(5), code: 'V', hours: 8, notes: 'Summer vacation' },

      // Patricia Williams - Worked a holiday
      { empNum: 'DEMO002', date: daysAgo(14), code: 'H', hours: 8, notes: 'Holiday - Memorial Day' },

      // James Miller - Had a sick day
      { empNum: 'DEMO003', date: daysAgo(10), code: 'PS', hours: 8, notes: 'Not feeling well' },

      // Jennifer Davis - Floating holiday
      { empNum: 'DEMO004', date: daysAgo(21), code: 'FH', hours: 8, notes: 'Personal day off' },

      // Michael Johnson (rehired) - Bereavement
      { empNum: 'DEMO005', date: daysAgo(30), code: 'B', hours: 8, notes: 'Family bereavement' },
      { empNum: 'DEMO005', date: daysAgo(29), code: 'B', hours: 8, notes: 'Family bereavement' },

      // Sarah Martinez (part-time) - Personal time
      { empNum: 'DEMO006', date: daysAgo(5), code: 'P', hours: 4, notes: 'Personal appointment' },

      // David Garcia (part-time) - Tardy
      { empNum: 'DEMO007', date: daysAgo(3), code: 'T', hours: 1, notes: 'Traffic delay' },

      // Lisa Thompson (HR) - Jury duty
      { empNum: 'DEMO008', date: daysAgo(45), code: 'JD', hours: 8, notes: 'Jury selection' },
      { empNum: 'DEMO008', date: daysAgo(44), code: 'JD', hours: 8, notes: 'Jury duty day 2' },

      // Christopher Brown (new hire) - FMLA
      { empNum: 'DEMO009', date: daysAgo(60), code: 'FM', hours: 8, notes: 'FMLA leave' },

      // Amanda Wilson (newest) - Nothing yet (just started)
    ];

    let entriesCreated = 0;
    for (const entry of attendanceEntries) {
      const empId = employeeIds[entry.empNum];
      const timeCodeId = timeCodes[entry.code];

      if (!empId || !timeCodeId) {
        console.log(`  ⚠ Skipping entry - missing employee or time code: ${entry.empNum}, ${entry.code}`);
        continue;
      }

      try {
        // Check if entry exists
        const existing = await db.execute({
          sql: 'SELECT id FROM attendance_entries WHERE employee_id = ? AND entry_date = ?',
          args: [empId, entry.date],
        });

        if (existing.rows.length > 0) {
          // Update existing
          await db.execute({
            sql: `UPDATE attendance_entries SET time_code = ?, time_code_id = ?, hours = ?, notes = ?
                  WHERE employee_id = ? AND entry_date = ?`,
            args: [entry.code, timeCodeId, entry.hours, entry.notes, empId, entry.date],
          });
        } else {
          // Insert new
          await db.execute({
            sql: `INSERT INTO attendance_entries (employee_id, entry_date, time_code, time_code_id, hours, notes)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [empId, entry.date, entry.code, timeCodeId, entry.hours, entry.notes],
          });
        }
        entriesCreated++;
      } catch (error: any) {
        console.log(`  ⚠ Error creating entry: ${error.message}`);
      }
    }

    console.log(`  ✓ Created ${entriesCreated} attendance entries`);

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                  DEMO DATA SEEDING COMPLETE                ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  Employees created: 10                                     ║');
    console.log('║  - 8 full-time, 2 part-time                                ║');
    console.log('║  - Various hire dates for seniority demo                   ║');
    console.log('║  - 1 rehired employee                                      ║');
    console.log('║  - Same-day hires with seniority ranks                     ║');
    console.log('║                                                            ║');
    console.log('║  Attendance entries: Sample data for current month         ║');
    console.log('║                                                            ║');
    console.log('║  Login: admin / admin123                                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error:', err);
      process.exit(1);
    });
}
