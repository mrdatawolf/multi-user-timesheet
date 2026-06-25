import { authDb } from './db-auth';

/**
 * Get an app setting by key from auth.db
 */
export async function getAppSetting(key: string): Promise<string | null> {
  const result = await authDb.execute({
    sql: 'SELECT value FROM app_settings WHERE key = ?',
    args: [key],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return (result.rows[0] as unknown as { value: string }).value;
}

/**
 * Set an app setting (upsert) in auth.db
 */
export async function setAppSetting(key: string, value: string): Promise<void> {
  await authDb.execute({
    sql: `INSERT INTO app_settings (key, value, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP`,
    args: [key, value],
  });
}

/**
 * Get all app settings from auth.db
 */
export async function getAllAppSettings(): Promise<Record<string, string>> {
  const result = await authDb.execute('SELECT key, value FROM app_settings');
  const settings: Record<string, string> = {};

  for (const row of result.rows) {
    const r = row as unknown as { key: string; value: string };
    settings[r.key] = r.value;
  }

  return settings;
}

/**
 * Get the overtime threshold (hours/week) for an employee.
 * Resolution: employee override → group override → app_settings default → 40
 */
export async function getOvertimeThresholdHours(
  employeeOverride: number | null | undefined,
  groupOverride: number | null | undefined
): Promise<number> {
  if (employeeOverride != null) return employeeOverride;
  if (groupOverride != null) return groupOverride;

  const dbValue = await getAppSetting('overtime_threshold_hours');
  if (dbValue !== null) {
    const parsed = parseFloat(dbValue);
    if (!isNaN(parsed)) return parsed;
  }

  return 40;
}
