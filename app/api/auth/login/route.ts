import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateToken, getClientIP, getUserAgent } from '@/lib/middleware/auth';
import { updateUserLastLogin, getGroupById, getUserRole } from '@/lib/queries-auth';
import { logAudit } from '@/lib/queries-auth';

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
