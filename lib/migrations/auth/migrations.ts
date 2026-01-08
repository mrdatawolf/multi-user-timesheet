import { Migration } from '../index';
import { migration as addSuperuser } from './001_add_superuser_to_users';
import { migration as createUserGroupPermissions } from './002_create_user_group_permissions';
import { migration as addUserPreferences } from './003_add_user_preferences';

/**
 * Auth Database Migrations
 *
 * These migrations are run against the auth.db database
 * on server startup. They are executed in order and tracked
 * in the migrations table.
 *
 * To add a new migration:
 * 1. Create a new file: 00X_migration_name.ts
 * 2. Export a migration object with name, description, and up/down functions
 * 3. Import and add to this array
 */
export const authMigrations: Migration[] = [
  addSuperuser,
  createUserGroupPermissions,
  addUserPreferences,
];
