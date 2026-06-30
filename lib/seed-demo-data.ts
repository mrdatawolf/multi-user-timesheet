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

interface HoursSeedEntry {
  empNum: string;
  date: string;
  hours: number;
  workLocation: 'onsite' | 'remote' | null;
  notes: string | null;
}

// Week of June 8–13, 2026 (Mon–Sat) — matches "FOR THE PERIOD ENDING Jun 13, 2026"
// in both source Excel files. Hours distributed 8h/day Mon–Fri for REG, then OT on Sat.
const WEEK_DATES = ['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12'];
const SAT = '2026-06-13';

function weekEntries(empNum: string, reg: number, ot: number): HoursSeedEntry[] {
  const entries: HoursSeedEntry[] = [];
  let remaining = reg;
  for (const date of WEEK_DATES) {
    if (remaining <= 0) break;
    entries.push({ empNum, date, hours: Math.min(8, remaining), workLocation: 'onsite', notes: null });
    remaining -= 8;
  }
  if (ot > 0) {
    entries.push({ empNum, date: SAT, hours: ot, workLocation: 'onsite', notes: null });
  }
  return entries;
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
    // 3. Hours entries from Worksheet.xlsx, period ending Jun 13, 2026.
    //    REG hours are distributed 8h/day Mon–Fri; OT goes on Saturday.
    //    Names were matched from Worksheet.xlsx to TIME SHEETS.xls groupings.
    //    Employees with 0 hours or no clear name match are omitted.
    // -----------------------------------------------------------------------
    console.log('');
    console.log('Creating demo hours entries...');

    const hoursEntries: HoursSeedEntry[] = [
      // Group 1
      ...weekEntries('G01-003', 40,     0),    // Alexander, Tim
      ...weekEntries('G01-006', 30,     0),    // Hammack, George D.
      ...weekEntries('G01-007', 40,     0),    // Hulsey, Ashley
      ...weekEntries('G01-009', 30,     0),    // Lay, Michael
      ...weekEntries('G01-010', 40,    11),    // Lewis, Ricky
      ...weekEntries('G01-011', 40,    19),    // McGaughy, Johnny
      ...weekEntries('G01-012', 37,     0),    // McWhirter, Alex
      ...weekEntries('G01-013', 40,    11),    // McWhirter, Kenneth
      ...weekEntries('G01-014', 40,     9),    // Naylor, Dennis
      ...weekEntries('G01-018', 40,     0),    // Triance, Griffin
      ...weekEntries('G01-020', 40,     0),    // Warren, Lonnie
      ...weekEntries('G01-021', 40,    10),    // Akers, Robert
      ...weekEntries('G01-022', 32,     0),    // Carter, Billy
      ...weekEntries('G01-024', 40,     5),    // Bell, Earnie
      ...weekEntries('G01-025', 38.5,   0),    // Cochran, Pat ("Cochran, Patricia")
      ...weekEntries('G01-026', 36,     0),    // Garrison, Lee
      ...weekEntries('G01-028', 40,     7),    // McCullar, Justin
      ...weekEntries('G01-029', 40,     2.5),  // Hammack, Brian

      // Group 2
      ...weekEntries('G02-001', 40,     0),    // Stewart, Larry
      ...weekEntries('G02-002', 40,    10),    // Bagwell, Devin
      ...weekEntries('G02-003', 40,     0),    // Beckman, Patrick
      ...weekEntries('G02-004', 40,     6),    // Dodd, Stephen
      ...weekEntries('G02-005', 40,     0),    // Gann, Chris ("Gann, Christopher")
      ...weekEntries('G02-006', 40,    10),    // Gittlein, Andrew
      ...weekEntries('G02-007', 40,     0),    // Jeffreys, Seth
      ...weekEntries('G02-009', 34,     0),    // Myers, Jayden
      ...weekEntries('G02-010', 20,     0),    // Reeves, Coy
      ...weekEntries('G02-011', 40,     6),    // Smith, Eric

      // Group 3
      ...weekEntries('G03-002', 37,     0),    // Pigg, Tara
      ...weekEntries('G03-003', 15,     0),    // Riddle, Bonnie

      // Group 4
      ...weekEntries('G04-003', 40,    11.75), // Walker, Barbara

      // Group 5
      ...weekEntries('G05-001', 40,     0),    // Boatright, Randy
      ...weekEntries('G05-002', 40,     0),    // Cagle, Bradley ("Cagle, Olan")
      ...weekEntries('G05-003', 40,     0),    // Snoddy, Leisa
      ...weekEntries('G05-004', 38.25,  0),    // Walker, Anthony
      ...weekEntries('G05-006', 40,     0),    // Morgan, Shane
      ...weekEntries('G05-007', 40,     1),    // Bryant, Nathan
      ...weekEntries('G05-008', 40,    20),    // Crow, Brad ("Crow, Bradley")
      ...weekEntries('G05-011', 40,    15),    // Potter, Victor
      ...weekEntries('G05-012', 40,    15),    // Vess, Michael
      ...weekEntries('G05-013', 40,     0),    // Crow, Cameron
      ...weekEntries('G05-014', 40,     0),    // Crow, Jennifer
      ...weekEntries('G05-015', 40,     0),    // Dean, Thomas
      ...weekEntries('G05-016', 40,     0),    // Gustus, Dylon
      ...weekEntries('G05-017', 34,     0),    // Hammack, George (Group 5)
      ...weekEntries('G05-019', 40,    20),    // Lewis, Dudley
      ...weekEntries('G05-020', 40,     0),    // McCown, Selena
      ...weekEntries('G05-021', 20,     0),    // McWhirter, Cody
      ...weekEntries('G05-022', 40,     0),    // Melson, Alex
      ...weekEntries('G05-023', 40,    10),    // Morgan, Cody
      ...weekEntries('G05-026', 40,     0),    // Winkles, Tina

      // Group 6
      ...weekEntries('G06-002', 40,     0),    // Bracken, William
      ...weekEntries('G06-007', 40,     0),    // Hulsey, Aaron
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
    console.log(`║  Hours entries: ${entriesCreated} (real data, week of Jun 8–13 2026)${' '.repeat(Math.max(0, 12 - String(entriesCreated).length))}║`);
    console.log('║  - Period ending Jun 13 matches source Worksheet.xlsx      ║');
    console.log('║  - Multiple OT employees (McGaughy 19h, Crow 20h, etc.)    ║');
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
