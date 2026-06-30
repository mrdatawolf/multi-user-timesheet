/**
 * Demo Data Seeding Module
 *
 * This module is bundled with the standalone build and can be imported
 * from db-sqlite.ts for demo mode initialization. It is also the single
 * source of truth used by scripts/seed-demo.ts.
 *
 * Seeds the database with employees from the Excel timesheet template,
 * organised into Group 1–6 matching the blocks in that sheet. A handful
 * of hours entries are included so the grid and overtime flag are
 * exercisable in a fresh demo.
 */

import { db, initializeDatabase } from './db-sqlite';
import { authDb, ensureAuthInitialized } from './db-auth';
import bcrypt from 'bcryptjs';

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function weekdayDatesAgo(startDaysAgo: number, count: number): string[] {
  const dates: string[] = [];
  let offset = startDaysAgo;
  while (dates.length < count) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
    offset++;
  }
  return dates;
}

interface HoursSeedEntry {
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
): HoursSeedEntry[] {
  return weekdayDatesAgo(startDaysAgo, count).map(date => ({ empNum, date, hours: hoursPerDay, workLocation, notes }));
}

// ---------------------------------------------------------------------------
// Employees from the Excel timesheet template, preserving the block groupings.
// Each block becomes one group (Group 1 – Group 6). Empty rows are omitted.
// ---------------------------------------------------------------------------

interface SeedEmployee {
  number: string;
  first: string;
  last: string;
  group: string;
}

const SEED_EMPLOYEES: SeedEmployee[] = [
  // --- Group 1 (29 employees) ---
  { number: 'G01-001', first: 'Jessica',  last: 'Adams',      group: 'Group 1' },
  { number: 'G01-002', first: 'Kathryn',  last: 'Akers',      group: 'Group 1' },
  { number: 'G01-003', first: 'Tim',      last: 'Alexander',  group: 'Group 1' },
  { number: 'G01-004', first: 'Billy',    last: 'Brooks',     group: 'Group 1' },
  { number: 'G01-005', first: 'Sanya',    last: 'Colburn',    group: 'Group 1' },
  { number: 'G01-006', first: 'George',   last: 'Hammack',    group: 'Group 1' },
  { number: 'G01-007', first: 'Ashley',   last: 'Hulsey',     group: 'Group 1' },
  { number: 'G01-008', first: 'Jacob',    last: 'Kilgore',    group: 'Group 1' },
  { number: 'G01-009', first: 'Michael',  last: 'Lay',        group: 'Group 1' },
  { number: 'G01-010', first: 'Ricky',    last: 'Lewis',      group: 'Group 1' },
  { number: 'G01-011', first: 'Johnny',   last: 'McGaughy',   group: 'Group 1' },
  { number: 'G01-012', first: 'Alex',     last: 'McWhirter',  group: 'Group 1' },
  { number: 'G01-013', first: 'Kenneth',  last: 'McWhirter',  group: 'Group 1' },
  { number: 'G01-014', first: 'Dennis',   last: 'Naylor',     group: 'Group 1' },
  { number: 'G01-015', first: 'Greg',     last: 'Page',       group: 'Group 1' },
  { number: 'G01-016', first: 'Regina',   last: 'Richie',     group: 'Group 1' },
  { number: 'G01-017', first: 'Ernest',   last: 'Ryans',      group: 'Group 1' },
  { number: 'G01-018', first: 'Griffin',  last: 'Triance',    group: 'Group 1' },
  { number: 'G01-019', first: 'Amanda',   last: 'Vess',       group: 'Group 1' },
  { number: 'G01-020', first: 'Lonnie',   last: 'Warren',     group: 'Group 1' },
  { number: 'G01-021', first: 'Robert',   last: 'Akers',      group: 'Group 1' },
  { number: 'G01-022', first: 'Billy',    last: 'Carter',     group: 'Group 1' },
  { number: 'G01-023', first: 'Ray',      last: 'Alexander',  group: 'Group 1' },
  { number: 'G01-024', first: 'Earnie',   last: 'Bell',       group: 'Group 1' },
  { number: 'G01-025', first: 'Pat',      last: 'Cochran',    group: 'Group 1' },
  { number: 'G01-026', first: 'Lee',      last: 'Garrison',   group: 'Group 1' },
  { number: 'G01-027', first: 'James',    last: 'Alexander',  group: 'Group 1' },
  { number: 'G01-028', first: 'Justin',   last: 'McCullar',   group: 'Group 1' },
  { number: 'G01-029', first: 'Brian',    last: 'Hammack',    group: 'Group 1' },

  // --- Group 2 (11 employees) ---
  { number: 'G02-001', first: 'Larry',    last: 'Stewart',    group: 'Group 2' },
  { number: 'G02-002', first: 'Devin',    last: 'Bagwell',    group: 'Group 2' },
  { number: 'G02-003', first: 'Patrick',  last: 'Beckman',    group: 'Group 2' },
  { number: 'G02-004', first: 'Stephen',  last: 'Dodd',       group: 'Group 2' },
  { number: 'G02-005', first: 'Chris',    last: 'Gann',       group: 'Group 2' },
  { number: 'G02-006', first: 'Andrew',   last: 'Gittlein',   group: 'Group 2' },
  { number: 'G02-007', first: 'Seth',     last: 'Jeffreys',   group: 'Group 2' },
  { number: 'G02-008', first: 'Noah',     last: 'Jeffreys',   group: 'Group 2' },
  { number: 'G02-009', first: 'Jayden',   last: 'Myers',      group: 'Group 2' },
  { number: 'G02-010', first: 'Coy',      last: 'Reeves',     group: 'Group 2' },
  { number: 'G02-011', first: 'Eric',     last: 'Smith',      group: 'Group 2' },

  // --- Group 3 (3 employees) ---
  { number: 'G03-001', first: 'Lisa',     last: 'Hammack',    group: 'Group 3' },
  { number: 'G03-002', first: 'Tara',     last: 'Pigg',       group: 'Group 3' },
  { number: 'G03-003', first: 'Bonnie',   last: 'Riddle',     group: 'Group 3' },

  // --- Group 4 (3 employees) ---
  { number: 'G04-001', first: 'Phillip',  last: 'Langley',    group: 'Group 4' },
  { number: 'G04-002', first: 'Randy',    last: 'Riddle',     group: 'Group 4' },
  { number: 'G04-003', first: 'Barbara',  last: 'Walker',     group: 'Group 4' },

  // --- Group 5 (26 employees) ---
  { number: 'G05-001', first: 'Randy',    last: 'Boatright',  group: 'Group 5' },
  { number: 'G05-002', first: 'Bradley',  last: 'Cagle',      group: 'Group 5' },
  { number: 'G05-003', first: 'Leisa',    last: 'Snoddy',     group: 'Group 5' },
  { number: 'G05-004', first: 'Anthony',  last: 'Walker',     group: 'Group 5' },
  { number: 'G05-005', first: 'Leon',     last: 'Bracken',    group: 'Group 5' },
  { number: 'G05-006', first: 'Shane',    last: 'Morgan',     group: 'Group 5' },
  { number: 'G05-007', first: 'Nathan',   last: 'Bryant',     group: 'Group 5' },
  { number: 'G05-008', first: 'Brad',     last: 'Crow',       group: 'Group 5' },
  { number: 'G05-009', first: 'BJ',       last: 'Kilgore',    group: 'Group 5' },
  { number: 'G05-010', first: 'Randy',    last: 'Lay',        group: 'Group 5' },
  { number: 'G05-011', first: 'Victor',   last: 'Potter',     group: 'Group 5' },
  { number: 'G05-012', first: 'Michael',  last: 'Vess',       group: 'Group 5' },
  { number: 'G05-013', first: 'Cameron',  last: 'Crow',       group: 'Group 5' },
  { number: 'G05-014', first: 'Jennifer', last: 'Crow',       group: 'Group 5' },
  { number: 'G05-015', first: 'Thomas',   last: 'Dean',       group: 'Group 5' },
  { number: 'G05-016', first: 'Dylon',    last: 'Gustus',     group: 'Group 5' },
  { number: 'G05-017', first: 'George',   last: 'Hammack',    group: 'Group 5' },
  { number: 'G05-018', first: 'Sara',     last: 'Harville',   group: 'Group 5' },
  { number: 'G05-019', first: 'Dudley',   last: 'Lewis',      group: 'Group 5' },
  { number: 'G05-020', first: 'Selena',   last: 'McCown',     group: 'Group 5' },
  { number: 'G05-021', first: 'Cody',     last: 'McWhirter',  group: 'Group 5' },
  { number: 'G05-022', first: 'Alex',     last: 'Melson',     group: 'Group 5' },
  { number: 'G05-023', first: 'Cody',     last: 'Morgan',     group: 'Group 5' },
  { number: 'G05-024', first: 'Stacey',   last: 'Parker',     group: 'Group 5' },
  { number: 'G05-025', first: 'Bradley',  last: 'Rushing',    group: 'Group 5' },
  { number: 'G05-026', first: 'Tina',     last: 'Winkles',    group: 'Group 5' },

  // --- Group 6 (11 employees) ---
  { number: 'G06-001', first: 'Robert',   last: 'Akers',      group: 'Group 6' },
  { number: 'G06-002', first: 'William',  last: 'Bracken',    group: 'Group 6' },
  { number: 'G06-003', first: 'Shane',    last: 'Morgan',     group: 'Group 6' },
  { number: 'G06-004', first: 'Jessie',   last: 'Bonham',     group: 'Group 6' },
  { number: 'G06-005', first: 'Amanda',   last: 'Bryant',     group: 'Group 6' },
  { number: 'G06-006', first: 'Summer',   last: 'Hogan',      group: 'Group 6' },
  { number: 'G06-007', first: 'Aaron',    last: 'Hulsey',     group: 'Group 6' },
  { number: 'G06-008', first: 'Chris',    last: 'Martin',     group: 'Group 6' },
  { number: 'G06-009', first: 'Alex',     last: 'Moore',      group: 'Group 6' },
  { number: 'G06-010', first: 'Miranda',  last: 'Triance',    group: 'Group 6' },
  { number: 'G06-011', first: 'Patricia', last: 'Wallace',    group: 'Group 6' },
];

export async function seedDemoData() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   SEEDING DEMO DATA                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    await initializeDatabase();
    await ensureAuthInitialized();

    // -----------------------------------------------------------------------
    // 1. Create the 6 employee groups in auth.db
    // -----------------------------------------------------------------------
    console.log('Creating employee groups...');
    for (let i = 1; i <= 6; i++) {
      await authDb.execute({
        sql: `INSERT OR IGNORE INTO groups (name, description) VALUES (?, ?)`,
        args: [`Group ${i}`, `Employee Group ${i}`],
      });
    }

    // Look up their IDs (auto-increment, so we can't assume them)
    const groupIdMap: Record<string, number> = {};
    for (let i = 1; i <= 6; i++) {
      const row = await authDb.execute({
        sql: 'SELECT id FROM groups WHERE name = ?',
        args: [`Group ${i}`],
      });
      if (row.rows.length > 0) {
        groupIdMap[`Group ${i}`] = Number(row.rows[0].id);
        console.log(`  ✓ Group ${i} (id=${groupIdMap[`Group ${i}`]})`);
      }
    }

    // -----------------------------------------------------------------------
    // 2. Create employees in hours.db
    // -----------------------------------------------------------------------
    console.log('');
    console.log(`Creating ${SEED_EMPLOYEES.length} employees...`);
    const employeeIds: Record<string, number> = {};

    for (const emp of SEED_EMPLOYEES) {
      const groupId = groupIdMap[emp.group];
      if (!groupId) {
        console.log(`  ⚠ Skipping ${emp.first} ${emp.last} — group "${emp.group}" not found`);
        continue;
      }
      try {
        const result = await db.execute({
          sql: `INSERT INTO employees (
                  employee_number, first_name, last_name, role, group_id,
                  employment_type, created_by, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [emp.number, emp.first, emp.last, null, groupId, 'full_time', 1, 1],
        });
        employeeIds[emp.number] = Number(result.lastInsertRowid);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        if (msg.includes('UNIQUE constraint failed')) {
          const existing = await db.execute({
            sql: 'SELECT id FROM employees WHERE employee_number = ?',
            args: [emp.number],
          });
          if (existing.rows.length > 0) {
            employeeIds[emp.number] = Number((existing.rows[0] as unknown as { id: number }).id);
            console.log(`  ⊘ ${emp.first} ${emp.last} already exists`);
          }
        } else {
          throw error;
        }
      }
    }
    console.log(`  ✓ ${Object.keys(employeeIds).length} employees ready`);

    // -----------------------------------------------------------------------
    // 3. Demo hours entries — a handful from Group 1 to exercise the UI
    //    G01-001 (Jessica Adams)  regular work pattern
    //    G01-003 (Tim Alexander)  overtime weeks to trigger the OT flag
    // -----------------------------------------------------------------------
    console.log('');
    console.log('Creating demo hours entries...');

    const hoursEntries: HoursSeedEntry[] = [
      ...range('G01-001', 70, 10, 8, 'onsite'),
      ...range('G01-001', 21, 5,  8, 'remote'),

      // Tim Alexander — two 50 h/week sprints (10 h × 5 days)
      ...range('G01-003', 28, 5, 10, 'onsite', 'Crunch week'),
      ...range('G01-003', 21, 5, 10, 'onsite', 'Crunch week'),
      ...range('G01-003', 70, 10, 8, 'onsite'),

      ...range('G01-006', 45, 10, 8, 'onsite'),
      ...range('G01-006', 7,  5,  8, 'remote'),

      ...range('G02-001', 60, 10, 8, 'onsite'),
      ...range('G02-001', 14, 5,  8, 'remote'),
    ];

    let entriesCreated = 0;
    for (const entry of hoursEntries) {
      const empId = employeeIds[entry.empNum];
      if (!empId) continue;
      try {
        const existing = await db.execute({
          sql: 'SELECT id FROM hours_entries WHERE employee_id = ? AND entry_date = ?',
          args: [empId, entry.date],
        });
        if (existing.rows.length > 0) {
          await db.execute({
            sql: `UPDATE hours_entries SET hours = ?, work_location = ?, notes = ?
                  WHERE employee_id = ? AND entry_date = ?`,
            args: [entry.hours, entry.workLocation, entry.notes, empId, entry.date],
          });
        } else {
          await db.execute({
            sql: `INSERT INTO hours_entries (employee_id, entry_date, hours, work_location, notes)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [empId, entry.date, entry.hours, entry.workLocation, entry.notes],
          });
        }
        entriesCreated++;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.log(`  ⚠ Entry error: ${msg}`);
      }
    }
    console.log(`  ✓ ${entriesCreated} hours entries created`);

    // -----------------------------------------------------------------------
    // 4. Demo user logins
    //    manager  — in Managers group (can_view_all), no linked employee
    //    hr       — in HR group (can_view_all), no linked employee
    //    employee — linked to Jessica Adams (G01-001) in Group 1
    // -----------------------------------------------------------------------
    console.log('');
    console.log('Creating demo user logins...');

    const group1Id = groupIdMap['Group 1'] ?? null;
    const jessicaId = employeeIds['G01-001'] ?? null;

    const demoUsers = [
      {
        username: 'manager',
        fullName: 'Demo Manager',
        email: 'manager@demo.com',
        groupId: 2,   // Managers
        roleId: 2,
        employeeId: null as number | null,
      },
      {
        username: 'hr',
        fullName: 'Demo HR',
        email: 'hr@demo.com',
        groupId: 3,   // HR
        roleId: 3,
        employeeId: null as number | null,
      },
      {
        username: 'employee',
        fullName: 'Jessica Adams',
        email: 'jessica.adams@demo.com',
        groupId: group1Id ?? 4,
        roleId: 6,
        employeeId: jessicaId,
      },
    ];

    const demoPasswordHash = await bcrypt.hash('demo123', 10);

    for (const u of demoUsers) {
      const existing = await authDb.execute({
        sql: 'SELECT id FROM users WHERE username = ?',
        args: [u.username],
      });

      if (existing.rows.length > 0) {
        await authDb.execute({
          sql: `UPDATE users
                SET password_hash = ?, full_name = ?, email = ?, group_id = ?,
                    role_id = ?, employee_id = ?, is_active = 1,
                    must_change_password = 0, updated_at = CURRENT_TIMESTAMP
                WHERE username = ?`,
          args: [demoPasswordHash, u.fullName, u.email, u.groupId, u.roleId, u.employeeId, u.username],
        });
        console.log(`  ⊘ ${u.username} already exists — refreshed`);
      } else {
        await authDb.execute({
          sql: `INSERT INTO users
                  (username, password_hash, full_name, email, group_id, role_id,
                   employee_id, is_active, is_superuser, color_mode, must_change_password)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 'system', 0)`,
          args: [u.username, demoPasswordHash, u.fullName, u.email, u.groupId, u.roleId, u.employeeId],
        });
        console.log(`  ✓ Created login: ${u.username} / demo123 (${u.fullName})`);
      }
    }

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    const totalEmployees = SEED_EMPLOYEES.length;
    const groupSummary = [1,2,3,4,5,6].map(i => {
      const count = SEED_EMPLOYEES.filter(e => e.group === `Group ${i}`).length;
      return `Group ${i}: ${count}`;
    }).join(', ');

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                  DEMO DATA SEEDING COMPLETE                ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Employees: ${totalEmployees} across 6 groups${' '.repeat(Math.max(0, 34 - String(totalEmployees).length))}║`);
    console.log(`║  ${groupSummary}${' '.repeat(Math.max(0, 57 - groupSummary.length))}║`);
    console.log('║                                                            ║');
    console.log(`║  Hours entries: ${entriesCreated} (Group 1 + Group 2 demo data)${' '.repeat(Math.max(0, 17 - String(entriesCreated).length))}║`);
    console.log('║  - Tim Alexander (G01-003) has overtime weeks              ║');
    console.log('║                                                            ║');
    console.log('║  Logins:                                                   ║');
    console.log('║    admin    / admin123  (Administrator)                    ║');
    console.log('║    manager  / demo123   (Manager — can view all groups)    ║');
    console.log('║    hr       / demo123   (HR — can view all groups)         ║');
    console.log('║    employee / demo123   (Jessica Adams, Group 1)           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  }
}
