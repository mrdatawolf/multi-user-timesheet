import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getClientIP, getUserAgent } from '@/lib/middleware/auth';
import { logAudit } from '@/lib/queries-auth';
import {
  getColorConfigs,
  getColorConfig,
  saveColorConfig,
  deleteColorConfig,
  getAvailableColors,
  SemanticColor,
} from '@/lib/color-config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/color-config
 * Returns all color configurations and available colors
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all color configs from database
    const colorConfigs = await getColorConfigs();

    // Get available colors
    const availableColors = getAvailableColors();

    return NextResponse.json({
      colorConfigs,
      availableColors,
    });
  } catch (error) {
    console.error('Error fetching color configs:', error);
    return NextResponse.json({ error: 'Failed to fetch color configs' }, { status: 500 });
  }
}

/**
 * POST /api/color-config
 * Create or update a color configuration
 * Body: { configType: 'status', configKey: string, colorName: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superusers or master group can configure colors
    if (!authUser.is_superuser && !authUser.group?.is_master) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can configure colors' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { configType, configKey, colorName } = body;

    // Validate config type
    if (configType !== 'status') {
      return NextResponse.json(
        { error: 'Invalid config type. Must be "status"' },
        { status: 400 }
      );
    }

    // Validate config key
    if (!configKey || typeof configKey !== 'string') {
      return NextResponse.json({ error: 'Config key is required' }, { status: 400 });
    }

    // Validate color name
    const availableColors = getAvailableColors();
    const validColorNames = availableColors.map((c) => c.name);
    if (!colorName || !validColorNames.includes(colorName)) {
      return NextResponse.json(
        { error: `Invalid color. Must be one of: ${validColorNames.join(', ')}` },
        { status: 400 }
      );
    }

    // Get old value for audit log
    const oldConfig = await getColorConfig(configType, configKey);

    // Save the configuration
    await saveColorConfig(configType, configKey, colorName as SemanticColor);

    // Log audit entry
    await logAudit({
      user_id: authUser.id,
      action: oldConfig ? 'UPDATE' : 'CREATE',
      table_name: 'color_config',
      record_id: oldConfig?.id || 0,
      old_values: oldConfig ? JSON.stringify(oldConfig) : undefined,
      new_values: JSON.stringify({ configType, configKey, colorName }),
      ip_address: getClientIP(request),
      user_agent: getUserAgent(request),
    });

    return NextResponse.json({
      success: true,
      message: `Color configuration ${oldConfig ? 'updated' : 'created'} successfully`,
    });
  } catch (error) {
    console.error('Error saving color config:', error);
    return NextResponse.json({ error: 'Failed to save color config' }, { status: 500 });
  }
}

/**
 * DELETE /api/color-config
 * Delete a color configuration (revert to default)
 * Query params: configType, configKey
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superusers or master group can configure colors
    if (!authUser.is_superuser && !authUser.group?.is_master) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can configure colors' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const configType = searchParams.get('configType');
    const configKey = searchParams.get('configKey');

    if (!configType || !configKey) {
      return NextResponse.json(
        { error: 'configType and configKey are required' },
        { status: 400 }
      );
    }

    // Get old value for audit log
    const oldConfig = await getColorConfig(configType, configKey);
    if (!oldConfig) {
      return NextResponse.json(
        { error: 'Color configuration not found' },
        { status: 404 }
      );
    }

    // Delete the configuration
    await deleteColorConfig(configType, configKey);

    // Log audit entry
    await logAudit({
      user_id: authUser.id,
      action: 'DELETE',
      table_name: 'color_config',
      record_id: oldConfig.id,
      old_values: JSON.stringify(oldConfig),
      ip_address: getClientIP(request),
      user_agent: getUserAgent(request),
    });

    return NextResponse.json({
      success: true,
      message: 'Color configuration deleted (reverted to default)',
    });
  } catch (error) {
    console.error('Error deleting color config:', error);
    return NextResponse.json({ error: 'Failed to delete color config' }, { status: 500 });
  }
}
