import { authDb as db } from './db-auth';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  email?: string;
  group_id: number;
  is_active: number;
  is_superuser?: number;
  color_mode?: 'light' | 'dark' | 'system';
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
    sql: `INSERT INTO users (username, password_hash, full_name, email, group_id, is_active, is_superuser, color_mode)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      user.username,
      user.password_hash,
      user.full_name,
      user.email || null,
      user.group_id,
      user.is_active,
      user.is_superuser || 0,
      user.color_mode || 'system',
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

// App settings queries (for global admin settings like theme)
export async function getAppSetting(key: string): Promise<string | null> {
  const result = await db.execute({
    sql: 'SELECT value FROM app_settings WHERE key = ?',
    args: [key],
  });
  return result.rows[0] ? (result.rows[0] as any).value : null;
}

export async function setAppSetting(key: string, value: string, userId?: number): Promise<void> {
  await db.execute({
    sql: `INSERT OR REPLACE INTO app_settings (key, value, updated_by, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    args: [key, value, userId || null],
  });
}

// User preferences queries
export async function updateUserColorMode(userId: number, colorMode: 'light' | 'dark' | 'system'): Promise<void> {
  await db.execute({
    sql: 'UPDATE users SET color_mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [colorMode, userId],
  });
}

// ============================================================================
// PHASE 2: User-specific CRUD permissions
// ============================================================================

export interface UserGroupPermission {
  id: number;
  user_id: number;
  group_id: number;
  can_create: number;
  can_read: number;
  can_update: number;
  can_delete: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get all group permissions for a user
 */
export async function getUserGroupPermissions(userId: number): Promise<UserGroupPermission[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM user_group_permissions WHERE user_id = ?',
    args: [userId],
  });
  return result.rows as unknown as UserGroupPermission[];
}

/**
 * Get permission for a specific user and group
 */
export async function getUserGroupPermission(userId: number, groupId: number): Promise<UserGroupPermission | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM user_group_permissions WHERE user_id = ? AND group_id = ?',
    args: [userId, groupId],
  });
  return (result.rows[0] as unknown as UserGroupPermission) || null;
}

/**
 * Set CRUD permissions for a user on a specific group
 */
export async function setUserGroupPermission(
  userId: number,
  groupId: number,
  permissions: { can_create: boolean; can_read: boolean; can_update: boolean; can_delete: boolean }
): Promise<void> {
  await db.execute({
    sql: `INSERT OR REPLACE INTO user_group_permissions
          (user_id, group_id, can_create, can_read, can_update, can_delete, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    args: [
      userId,
      groupId,
      permissions.can_create ? 1 : 0,
      permissions.can_read ? 1 : 0,
      permissions.can_update ? 1 : 0,
      permissions.can_delete ? 1 : 0,
    ],
  });
}

/**
 * Remove all permissions for a user on a specific group
 */
export async function removeUserGroupPermission(userId: number, groupId: number): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM user_group_permissions WHERE user_id = ? AND group_id = ?',
    args: [userId, groupId],
  });
}

/**
 * Check if user is a superuser
 */
export async function isSuperuser(userId: number): Promise<boolean> {
  const user = await getUserById(userId);
  return user?.is_superuser === 1;
}

/**
 * Check if user can create employees in a group
 */
export async function canUserCreateInGroup(userId: number, groupId: number): Promise<boolean> {
  // Superuser can do anything
  if (await isSuperuser(userId)) return true;

  const permission = await getUserGroupPermission(userId, groupId);
  return permission?.can_create === 1;
}

/**
 * Check if user can read/view employees in a group
 */
export async function canUserReadGroup(userId: number, groupId: number): Promise<boolean> {
  // Superuser can do anything
  if (await isSuperuser(userId)) return true;

  const permission = await getUserGroupPermission(userId, groupId);
  return permission?.can_read === 1;
}

/**
 * Check if user can update employees in a group
 */
export async function canUserUpdateInGroup(userId: number, groupId: number): Promise<boolean> {
  // Superuser can do anything
  if (await isSuperuser(userId)) return true;

  const permission = await getUserGroupPermission(userId, groupId);
  return permission?.can_update === 1;
}

/**
 * Check if user can delete employees in a group
 */
export async function canUserDeleteInGroup(userId: number, groupId: number): Promise<boolean> {
  // Superuser can do anything
  if (await isSuperuser(userId)) return true;

  const permission = await getUserGroupPermission(userId, groupId);
  return permission?.can_delete === 1;
}

/**
 * Get all groups a user can read (view)
 */
export async function getUserReadableGroups(userId: number): Promise<number[]> {
  // Superuser can read all groups
  if (await isSuperuser(userId)) {
    const allGroups = await getAllGroups();
    return allGroups.map(g => g.id);
  }

  const permissions = await getUserGroupPermissions(userId);
  return permissions.filter(p => p.can_read === 1).map(p => p.group_id);
}

/**
 * Get all groups a user can create employees in
 */
export async function getUserCreatableGroups(userId: number): Promise<number[]> {
  // Superuser can create in all groups
  if (await isSuperuser(userId)) {
    const allGroups = await getAllGroups();
    return allGroups.map(g => g.id);
  }

  const permissions = await getUserGroupPermissions(userId);
  return permissions.filter(p => p.can_create === 1).map(p => p.group_id);
}
