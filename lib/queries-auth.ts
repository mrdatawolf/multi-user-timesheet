import { authDb as db } from './db-auth';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  email?: string;
  group_id: number;
  is_active: number;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  is_master: number;
  can_view_all: number;
  can_edit_all: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: number;
  user_id: number;
  action: string;
  table_name: string;
  record_id?: number;
  old_values?: string;
  new_values?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface GroupPermission {
  id: number;
  group_id: number;
  target_group_id: number;
  can_view: number;
  can_edit: number;
}

// User queries
export async function getUserByUsername(username: string): Promise<User | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE username = ? AND is_active = 1',
    args: [username],
  });
  return (result.rows[0] as unknown as User) || null;
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as User) || null;
}

export async function getAllUsers(): Promise<User[]> {
  const result = await db.execute('SELECT * FROM users ORDER BY full_name');
  return result.rows as unknown as User[];
}

export async function createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login'>): Promise<User> {
  const result = await db.execute({
    sql: `INSERT INTO users (username, password_hash, full_name, email, group_id, is_active)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      user.username,
      user.password_hash,
      user.full_name,
      user.email || null,
      user.group_id,
      user.is_active,
    ],
  });

  const id = Number(result.lastInsertRowid);
  return { id, ...user, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}

export async function updateUserLastLogin(userId: number): Promise<void> {
  await db.execute({
    sql: 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
    args: [userId],
  });
}

// Group queries
export async function getAllGroups(): Promise<Group[]> {
  const result = await db.execute('SELECT * FROM groups ORDER BY name');
  return result.rows as unknown as Group[];
}

export async function getGroupById(id: number): Promise<Group | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM groups WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as Group) || null;
}

export async function createGroup(group: Omit<Group, 'id' | 'created_at' | 'updated_at'>): Promise<Group> {
  const result = await db.execute({
    sql: `INSERT INTO groups (name, description, is_master, can_view_all, can_edit_all)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      group.name,
      group.description || null,
      group.is_master || 0,
      group.can_view_all || 0,
      group.can_edit_all || 0,
    ],
  });

  const id = Number(result.lastInsertRowid);
  return { id, ...group, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}

// Permission queries
export async function getGroupPermissions(groupId: number): Promise<GroupPermission[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM group_permissions WHERE group_id = ?',
    args: [groupId],
  });
  return result.rows as unknown as GroupPermission[];
}

export async function setGroupPermission(
  groupId: number,
  targetGroupId: number,
  canView: boolean,
  canEdit: boolean
): Promise<void> {
  await db.execute({
    sql: `INSERT OR REPLACE INTO group_permissions (group_id, target_group_id, can_view, can_edit)
          VALUES (?, ?, ?, ?)`,
    args: [groupId, targetGroupId, canView ? 1 : 0, canEdit ? 1 : 0],
  });
}

export async function canUserViewGroup(userId: number, targetGroupId: number): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) return false;

  const group = await getGroupById(user.group_id);
  if (!group) return false;

  // Master group can view all
  if (group.is_master || group.can_view_all) return true;

  // Check specific permission
  const result = await db.execute({
    sql: `SELECT can_view FROM group_permissions
          WHERE group_id = ? AND target_group_id = ? AND can_view = 1`,
    args: [user.group_id, targetGroupId],
  });

  return result.rows.length > 0;
}

export async function canUserEditGroup(userId: number, targetGroupId: number): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) return false;

  const group = await getGroupById(user.group_id);
  if (!group) return false;

  // Master group can edit all
  if (group.is_master || group.can_edit_all) return true;

  // Check specific permission
  const result = await db.execute({
    sql: `SELECT can_edit FROM group_permissions
          WHERE group_id = ? AND target_group_id = ? AND can_edit = 1`,
    args: [user.group_id, targetGroupId],
  });

  return result.rows.length > 0;
}

// Audit log queries
export async function logAudit(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<void> {
  await db.execute({
    sql: `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      entry.user_id,
      entry.action,
      entry.table_name,
      entry.record_id || null,
      entry.old_values || null,
      entry.new_values || null,
      entry.ip_address || null,
      entry.user_agent || null,
    ],
  });
}

export async function getAuditLog(limit = 100, offset = 0): Promise<AuditLogEntry[]> {
  const result = await db.execute({
    sql: `SELECT al.*, u.username, u.full_name
          FROM audit_log al
          JOIN users u ON al.user_id = u.id
          ORDER BY al.created_at DESC
          LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });
  return result.rows as unknown as AuditLogEntry[];
}

export async function getAuditLogForRecord(tableName: string, recordId: number): Promise<AuditLogEntry[]> {
  const result = await db.execute({
    sql: `SELECT al.*, u.username, u.full_name
          FROM audit_log al
          JOIN users u ON al.user_id = u.id
          WHERE al.table_name = ? AND al.record_id = ?
          ORDER BY al.created_at DESC`,
    args: [tableName, recordId],
  });
  return result.rows as unknown as AuditLogEntry[];
}

export async function getAuditLogForUser(userId: number, limit = 50): Promise<AuditLogEntry[]> {
  const result = await db.execute({
    sql: `SELECT al.*, u.username, u.full_name
          FROM audit_log al
          JOIN users u ON al.user_id = u.id
          WHERE al.user_id = ?
          ORDER BY al.created_at DESC
          LIMIT ?`,
    args: [userId, limit],
  });
  return result.rows as unknown as AuditLogEntry[];
}
