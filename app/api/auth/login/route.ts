import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateToken, getClientIP, getUserAgent, verifyPassword } from '@/lib/middleware/auth';
import { updateUserLastLogin, getGroupById, getUserRole } from '@/lib/queries-auth';
import { logAudit } from '@/lib/queries-auth';
import { authDb } from '@/lib/db-auth';
import { db } from '@/lib/db-sqlite';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const user = await authenticateUser(username, password);
    if (!user) {
      // In development, provide more detailed error info for debugging
      if (process.env.NODE_ENV === 'development') {
        // Check if user exists at all (including inactive)
        const anyUser = await authDb.execute({
          sql: 'SELECT id, username, is_active, password_hash FROM users WHERE username = ? COLLATE NOCASE',
          args: [username],
        });

        if (anyUser.rows.length === 0) {
          console.log(`Login failed: User '${username}' not found in database`);
          return NextResponse.json(
            { error: 'Invalid username or password', debug: 'User not found' },
            { status: 401 }
          );
        }

        const foundUser = anyUser.rows[0] as any;
        if (foundUser.is_active !== 1) {
          console.log(`Login failed: User '${username}' is inactive (is_active=${foundUser.is_active})`);
          return NextResponse.json(
            { error: 'Invalid username or password', debug: 'User is inactive' },
            { status: 401 }
          );
        }

        // Check password
        const passwordValid = await verifyPassword(password, foundUser.password_hash);
        if (!passwordValid) {
          console.log(`Login failed: Password mismatch for user '${username}'`);
          return NextResponse.json(
            { error: 'Invalid username or password', debug: 'Password mismatch' },
            { status: 401 }
          );
        }

        console.log(`Login failed: Unknown reason for user '${username}'`);
      }

      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken(user);

    // Update last login
    await updateUserLastLogin(user.id);

    // Get user's group and role
    const group = await getGroupById(user.group_id);
    const role = await getUserRole(user.id);

    // Look up employee abbreviation from attendance.db if user is linked
    let employee_abbreviation: string | undefined;
    if (user.employee_id) {
      try {
        const empResult = await db.execute({
          sql: 'SELECT abbreviation FROM employees WHERE id = ?',
          args: [user.employee_id],
        });
        employee_abbreviation = (empResult.rows[0] as any)?.abbreviation || undefined;
      } catch {
        // Non-fatal
      }
    }

    // Log audit entry
    await logAudit({
      user_id: user.id,
      action: 'LOGIN',
      table_name: 'users',
      record_id: user.id,
      ip_address: getClientIP(request),
      user_agent: getUserAgent(request),
    });

    // Return user info (without password hash)
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        group_id: user.group_id,
        role_id: user.role_id,
        employee_id: user.employee_id,
        employee_abbreviation,
        is_superuser: user.is_superuser, // Deprecated
        group: group,
        role: role,
      },
      token,
    });

    // Set token as HTTP-only cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
