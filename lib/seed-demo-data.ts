/**
 * Demo Data Seeding Module
 *
 * This module is bundled with the standalone build and can be imported
 * from db-sqlite.ts for demo mode initialization. It is also the single
 * source of truth used by scripts/seed-demo.ts.
 *
 * Seeds the database with demo data for presentations:
 * - Employees with varied hire dates and roles
 * - A few months of daily hours-worked entries (mix of on-site/remote)
 * - One employee with an overtime week, to exercise the overtime flag
 * - One employee with a per-employee overtime threshold override
 * - Demo logins for the manager, HR, and employee roles in addition to admin
 */

import { db, initializeDatabase } from './db-sqlite';
import { authDb, ensureAuthInitialized } from './db-auth';
import bcrypt from 'bcryptjs';

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

/**
 * Walk backwards from `startDaysAgo` days ago, collecting `count` weekday
 * (Mon-Fri) dates. Used to build realistic multi-day blocks of entries.
 */
function weekdayDatesAgo(startDaysAgo: number, count: number): string[] {
  const dates: string[] = [];
  let offset = startDaysAgo;
  while (dates.length < count) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(date.toISOString().split('T')[0]);
    }
    offset++;
  }
  return dates;
}

interface AttendanceSeedEntry {
  empNum: string;
  date: string;
  hours: number;
  workLocation: 'onsite' | 'remote' | null;
  notes: string | null;
}

function range(
  empNum: string,
  startDaysAgo: number,
  count: number,
  hoursPerDay: number,
  workLocation: 'onsite' | 'remote' | null,
  notes: string | null = null
): AttendanceSeedEntry[] {
  return weekdayDatesAgo(startDaysAgo, count).map(date => ({ empNum, date, hours: hoursPerDay, workLocation, notes }));
}

export async function seedDemoData() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   SEEDING DEMO DATA                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Make sure the schema exists before we seed.
    await initializeDatabase();

    // Demo employees with varied profiles
    const employees = [
      {
        number: 'DEMO001',
        first: 'Robert',
        last: 'Anderson',
        email: 'robert.anderson@demo.com',
        role: 'employee',
        group_id: 4, // Employees
        date_of_hire: yearsAgo(8, 3),
        employment_type: 'full_time',
        overtime_threshold_hours: null as number | null,
      },
      {
        number: 'DEMO002',
        first: 'Patricia',
        last: 'Williams',
        email: 'patricia.williams@demo.com',
        role: 'manager',
        group_id: 2, // Managers
        date_of_hire: yearsAgo(6),
        employment_type: 'full_time',
        overtime_threshold_hours: null,
      },
      {
        number: 'DEMO003',
        first: 'James',
        last: 'Miller',
        email: 'james.miller@demo.com',
        role: 'employee',
        group_id: 4,
        date_of_hire: yearsAgo(3),
        employment_type: 'full_time',
        overtime_threshold_hours: null,
      },
      {
        number: 'DEMO004',
        first: 'Jennifer',
        last: 'Davis',
        email: 'jennifer.davis@demo.com',
        role: 'employee',
        group_id: 4,
        date_of_hire: yearsAgo(3),
        employment_type: 'full_time',
        overtime_threshold_hours: null,
      },
      {
        number: 'DEMO005',
        first: 'Michael',
        last: 'Johnson',
        email: 'michael.johnson@demo.com',
        role: 'employee',
        group_id: 4,
        date_of_hire: yearsAgo(7),
        employment_type: 'full_time',
        overtime_threshold_hours: null,
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
        employment_type: 'part_time',
        overtime_threshold_hours: 20, // per-employee override demo
      },
      {
        number: 'DEMO007',
        first: 'David',
        last: 'Garcia',
        email: 'david.garcia@demo.com',
        role: 'employee',
        group_id: 4,
        date_of_hire: monthsAgo(8),
        employment_type: 'part_time',
        overtime_threshold_hours: null,
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
        employment_type: 'full_time',
        overtime_threshold_hours: null,
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
        employment_type: 'full_time',
        overtime_threshold_hours: null,
      },
      {
        number: 'DEMO010',
        first: 'Amanda',
        last: 'Wilson',
        email: 'amanda.wilson@demo.com',
        role: 'employee',
        group_id: 4,
        date_of_hire: monthsAgo(1),
        employment_type: 'full_time',
        overtime_threshold_hours: null,
      },
    ];

    console.log('Creating demo employees...');
    const employeeIds: { [key: string]: number } = {};

    for (const emp of employees) {
      try {
        const result = await db.execute({
          sql: `INSERT INTO employees (
            employee_number, first_name, last_name, email, role, group_id,
            date_of_hire, employment_type, overtime_threshold_hours,
            created_by, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            emp.number,
            emp.first,
            emp.last,
            emp.email,
            emp.role,
            emp.group_id,
            emp.date_of_hire,
            emp.employment_type,
            emp.overtime_threshold_hours,
            1, // Created by admin
            1, // Active
          ],
        });
        employeeIds[emp.number] = Number(result.lastInsertRowid);
        console.log(`  ✓ ${emp.first} ${emp.last} (${emp.number}) - ${emp.employment_type}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('UNIQUE constraint failed')) {
          console.log(`  ⊘ ${emp.first} ${emp.last} already exists`);
          const existing = await db.execute({
            sql: 'SELECT id FROM employees WHERE employee_number = ?',
            args: [emp.number],
          });
          if (existing.rows.length > 0) {
            employeeIds[emp.number] = Number((existing.rows[0] as unknown as { id: number }).id);
          }
        } else {
          throw error;
        }
      }
    }

    // Daily hours-worked entries spanning the last few months. DEMO003 gets a
    // run of 50h weeks to demonstrate the overtime flag; DEMO006 has a custom
    // 20h/week overtime threshold (see overtime_threshold_hours above) and a
    // light part-time schedule that stays under it.
    console.log('');
    console.log('Creating demo attendance entries...');

    const attendanceEntries: AttendanceSeedEntry[] = [
      ...range('DEMO001', 70, 10, 8, 'onsite', 'Regular work week'),
      ...range('DEMO001', 21, 5, 8, 'remote'),

      ...range('DEMO002', 60, 10, 8, 'onsite'),
      ...range('DEMO002', 14, 5, 8, 'remote', 'Working from home this week'),

      // James Miller - overtime weeks (10h/day, 5 days = 50h)
      ...range('DEMO003', 28, 5, 10, 'onsite', 'Crunch week before launch'),
      ...range('DEMO003', 21, 5, 10, 'onsite', 'Crunch week before launch'),
      ...range('DEMO003', 70, 10, 8, 'onsite'),

      ...range('DEMO004', 45, 10, 8, 'remote'),
      ...range('DEMO004', 7, 5, 8, 'onsite'),

      ...range('DEMO005', 75, 10, 8, 'onsite'),
      ...range('DEMO005', 20, 5, 8, 'remote'),

      // Sarah Martinez (part-time, 20h/week threshold) - stays under it
      ...range('DEMO006', 60, 8, 4, 'onsite', 'Reduced schedule'),
      ...range('DEMO006', 20, 4, 4, 'remote'),

      ...range('DEMO007', 40, 8, 4, 'onsite'),

      ...range('DEMO008', 80, 10, 8, 'onsite'),
      ...range('DEMO008', 14, 5, 8, 'remote'),

      ...range('DEMO009', 30, 8, 8, 'onsite', 'First weeks on the job'),

      // Amanda Wilson (newest hire) - no entries yet, just started
    ];

    let entriesCreated = 0;
    for (const entry of attendanceEntries) {
      const empId = employeeIds[entry.empNum];
      if (!empId) {
        console.log(`  ⚠ Skipping entry - missing employee: ${entry.empNum}`);
        continue;
      }

      try {
        const existing = await db.execute({
          sql: 'SELECT id FROM attendance_entries WHERE employee_id = ? AND entry_date = ?',
          args: [empId, entry.date],
        });

        if (existing.rows.length > 0) {
          await db.execute({
            sql: `UPDATE attendance_entries SET hours = ?, work_location = ?, notes = ?
                  WHERE employee_id = ? AND entry_date = ?`,
            args: [entry.hours, entry.workLocation, entry.notes, empId, entry.date],
          });
        } else {
          await db.execute({
            sql: `INSERT INTO attendance_entries (employee_id, entry_date, hours, work_location, notes)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [empId, entry.date, entry.hours, entry.workLocation, entry.notes],
          });
        }
        entriesCreated++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`  ⚠ Error creating entry: ${errorMessage}`);
      }
    }

    console.log(`  ✓ Created ${entriesCreated} attendance entries`);

    // Demo logins - one per role, linked to a demo employee so the
    // attendance grid and "self-service" views default correctly.
    console.log('');
    console.log('Creating demo user logins...');
    await ensureAuthInitialized();

    const demoUsers = [
      { username: 'manager', fullName: 'Patricia Williams', email: 'patricia.williams@demo.com', groupId: 2, roleId: 2, empNum: 'DEMO002' },
      { username: 'hr', fullName: 'Lisa Thompson', email: 'lisa.thompson@demo.com', groupId: 3, roleId: 3, empNum: 'DEMO008' },
      { username: 'employee', fullName: 'Sarah Martinez', email: 'sarah.martinez@demo.com', groupId: 4, roleId: 6, empNum: 'DEMO006' },
    ];
    const demoPasswordHash = await bcrypt.hash('demo123', 10);

    for (const u of demoUsers) {
      const empId = employeeIds[u.empNum] ?? null;
      const existing = await authDb.execute({
        sql: 'SELECT id FROM users WHERE username = ?',
        args: [u.username],
      });

      if (existing.rows.length > 0) {
        await authDb.execute({
          sql: `UPDATE users SET password_hash = ?, full_name = ?, email = ?, group_id = ?, role_id = ?,
                  employee_id = ?, is_active = 1, must_change_password = 0, updated_at = CURRENT_TIMESTAMP
                WHERE username = ?`,
          args: [demoPasswordHash, u.fullName, u.email, u.groupId, u.roleId, empId, u.username],
        });
        console.log(`  ⊘ ${u.username} already exists - refreshed link to ${u.fullName}`);
      } else {
        await authDb.execute({
          sql: `INSERT INTO users (username, password_hash, full_name, email, group_id, role_id, employee_id, is_active, is_superuser, color_mode, must_change_password)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 'system', 0)`,
          args: [u.username, demoPasswordHash, u.fullName, u.email, u.groupId, u.roleId, empId],
        });
        console.log(`  ✓ Created login: ${u.username} / demo123 (${u.fullName})`);
      }
    }

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                  DEMO DATA SEEDING COMPLETE                ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  Employees: 10 (8 full-time, 2 part-time)                  ║');
    console.log('║                                                            ║');
    console.log(`║  Attendance entries: ${entriesCreated} across the last several months${' '.repeat(Math.max(0, 9 - String(entriesCreated).length))}║`);
    console.log('║  - James Miller (DEMO003) has overtime weeks to flag       ║');
    console.log('║  - Sarah Martinez (DEMO006) has a 20h/week OT override     ║');
    console.log('║                                                            ║');
    console.log('║  Logins:                                                   ║');
    console.log('║    admin    / admin123  (Administrator)                    ║');
    console.log('║    manager  / demo123   (Manager - Patricia Williams)      ║');
    console.log('║    hr       / demo123   (HR - Lisa Thompson)               ║');
    console.log('║    employee / demo123   (Self-Service - Sarah Martinez)    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  }
}
