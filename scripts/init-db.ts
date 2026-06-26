import { initializeDatabase } from '../lib/db-sqlite';
import { createEmployee } from '../lib/queries-sqlite';
import { db } from '../lib/db-sqlite';

async function main() {
  console.log('Initializing database...');

  // Initialize tables
  await initializeDatabase();
  console.log('✓ Tables created');

  // Create sample employees
  const employees = [
    { number: 'EMP001', first: 'John', last: 'Smith', email: 'john.smith@company.com' },
    { number: 'EMP002', first: 'Sarah', last: 'Johnson', email: 'sarah.johnson@company.com' },
    { number: 'EMP003', first: 'Michael', last: 'Williams', email: 'michael.williams@company.com' },
    { number: 'EMP004', first: 'Emily', last: 'Brown', email: 'emily.brown@company.com' },
  ];

  console.log('\nCreating employees...');
  for (const emp of employees) {
    await createEmployee({
      employee_number: emp.number,
      first_name: emp.first,
      last_name: emp.last,
      email: emp.email,
      role: 'employee',
      is_active: 1,
    });
    console.log(`  ✓ ${emp.first} ${emp.last}`);
  }

  // Create sample hours entries (weekday hours for employee 1)
  console.log('\nCreating sample hours entries...');
  const year = new Date().getFullYear();
  const entries: { month: number; day: number; hours: number; workLocation: 'onsite' | 'remote' }[] = [];
  for (let day = 1; day <= 28; day++) {
    const date = new Date(year, 0, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    entries.push({ month: 1, day, hours: 8, workLocation: day % 5 === 0 ? 'remote' : 'onsite' });
  }

  for (const entry of entries) {
    const date = `${year}-${String(entry.month).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}`;
    await db.execute({
      sql: 'INSERT INTO hours_entries (employee_id, entry_date, hours, work_location) VALUES (?, ?, ?, ?)',
      args: [1, date, entry.hours, entry.workLocation],
    });
  }

  console.log(`✓ Created ${entries.length} hours entries`);
  console.log('\n✓ Database initialization complete!\n');
}

main().catch(console.error);
