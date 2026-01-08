import { NextRequest, NextResponse } from 'next/server';
import {
  getAllUsers,
  getUserById,
  createUser,
  type User
} from '@/lib/queries-auth';
import { getAuthUser, hashPassword, getClientIP, getUserAgent } from '@/lib/middleware/auth';
import { logAudit } from '@/lib/queries-auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can view users (only master and HR can view all users)
    if (!authUser.group?.is_master && !authUser.group?.can_view_all) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view users' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (userId) {
      const user = await getUserById(parseInt(userId));
      if (user) {
        // Don't send password hash
        const { password_hash, ...userWithoutPassword } = user;
        return NextResponse.json(userWithoutPassword);
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    } else {
      const users = await getAllUsers();
      // Remove password hashes from all users
      const usersWithoutPasswords = users.map(({ password_hash, ...user }) => user);
      return NextResponse.json(usersWithoutPasswords);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can create users (only master and HR can create users)
    if (!authUser.group?.is_master && !authUser.group?.can_edit_all) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to create users' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.username || !body.password || !body.full_name || !body.group_id) {
      return NextResponse.json(
        { error: 'Missing required fields: username, password, full_name, group_id' },
        { status: 400 }
      );
    }

    // Hash the password
    const password_hash = await hashPassword(body.password);

    const newUser = await createUser({
      username: body.username,
      password_hash,
      full_name: body.full_name,
      email: body.email,
      group_id: body.group_id,
      is_active: body.is_active !== undefined ? body.is_active : 1,
      is_superuser: body.is_superuser !== undefined ? body.is_superuser : 0,
      color_mode: 'system'
    });

    // Log audit entry
    await logAudit({
      user_id: authUser.id,
      action: 'CREATE',
      table_name: 'users',
      record_id: newUser.id,
      new_values: JSON.stringify({
        username: newUser.username,
        full_name: newUser.full_name,
        email: newUser.email,
        group_id: newUser.group_id,
      }),
      ip_address: getClientIP(request),
      user_agent: getUserAgent(request),
    });

    // Don't send password hash
    const { password_hash: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can edit users (only master and HR can edit users)
    if (!authUser.group?.is_master && !authUser.group?.can_edit_all) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to edit users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const userId = body.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get old values for audit log
    const oldUser = await getUserById(userId);
    if (!oldUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build update query
    const updates: string[] = [];
    const args: any[] = [];

    if (body.full_name !== undefined) {
      updates.push('full_name = ?');
      args.push(body.full_name);
    }

    if (body.email !== undefined) {
      updates.push('email = ?');
      args.push(body.email);
    }

    if (body.group_id !== undefined) {
      updates.push('group_id = ?');
      args.push(body.group_id);
    }

    if (body.is_active !== undefined) {
      updates.push('is_active = ?');
      args.push(body.is_active);
    }

    if (body.is_superuser !== undefined) {
      updates.push('is_superuser = ?');
      args.push(body.is_superuser);
    }

    if (body.password) {
      updates.push('password_hash = ?');
      args.push(await hashPassword(body.password));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    args.push(userId);

    const { authDb } = await import('@/lib/db-auth');
    await authDb.execute({
      sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    // Get updated user
    const updatedUser = await getUserById(userId);

    // Log audit entry
    await logAudit({
      user_id: authUser.id,
      action: 'UPDATE',
      table_name: 'users',
      record_id: userId,
      old_values: JSON.stringify({
        full_name: oldUser.full_name,
        email: oldUser.email,
        group_id: oldUser.group_id,
        is_active: oldUser.is_active,
      }),
      new_values: JSON.stringify({
        full_name: updatedUser?.full_name,
        email: updatedUser?.email,
        group_id: updatedUser?.group_id,
        is_active: updatedUser?.is_active,
      }),
      ip_address: getClientIP(request),
      user_agent: getUserAgent(request),
    });

    if (updatedUser) {
      const { password_hash, ...userWithoutPassword } = updatedUser;
      return NextResponse.json(userWithoutPassword);
    }

    return NextResponse.json({ error: 'Failed to fetch updated user' }, { status: 500 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can delete users (only master can delete users)
    if (!authUser.group?.is_master) {
      return NextResponse.json(
        { error: 'Forbidden: Only master administrators can delete users' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user for audit log
    const user = await getUserById(parseInt(userId));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't actually delete, just deactivate
    const { authDb } = await import('@/lib/db-auth');
    await authDb.execute({
      sql: 'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [userId],
    });

    // Log audit entry
    await logAudit({
      user_id: authUser.id,
      action: 'DELETE',
      table_name: 'users',
      record_id: parseInt(userId),
      old_values: JSON.stringify({
        username: user.username,
        full_name: user.full_name,
        is_active: user.is_active,
      }),
      new_values: JSON.stringify({
        is_active: 0,
      }),
      ip_address: getClientIP(request),
      user_agent: getUserAgent(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
