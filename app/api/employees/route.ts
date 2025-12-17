import { NextResponse } from 'next/server';
import { getAllEmployees, createEmployee, getEmployeeById } from '@/lib/queries-sqlite';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('id');

    if (employeeId) {
      const employee = await getEmployeeById(parseInt(employeeId));
      if (employee) {
        return NextResponse.json(employee);
      } else {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
    } else {
      const employees = await getAllEmployees();
      return NextResponse.json(employees);
    }
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const newEmployee = await createEmployee({
      employee_number: body.employee_number,
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      role: body.role || 'employee',
      is_active: 1
    });

    return NextResponse.json(newEmployee);
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
