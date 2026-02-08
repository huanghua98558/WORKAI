import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { robots } from '@/storage/database/new-schemas';
import { eq } from 'drizzle-orm';
import { robotBusinessRoleService } from '@/services/robot-business-role-service';

/**
 * GET /api/robots/[id]/business-role
 * 获取机器人的业务角色配置
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const result = await robotBusinessRoleService.getBusinessConfigByRobotId(id);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        businessRole: result.businessConfig.businessRole,
        businessConfig: result.businessConfig.businessConfig,
        businessRoleName: result.businessRole?.name,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/robots/[id]/business-role:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * PATCH /api/robots/[id]/business-role
 * 更新机器人的业务角色配置
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // 获取当前机器人配置
    const robotResult = await db
      .select()
      .from(robots)
      .where(eq(robots.id, id))
      .limit(1);

    const currentRobot = robotResult[0] || null;

    if (!currentRobot) {
      return NextResponse.json({
        success: false,
        error: 'Robot not found',
      }, { status: 404 });
    }

    // 合并配置
    const currentConfig = currentRobot.config as any || {};
    const updatedConfig = {
      ...currentConfig,
      businessRole: body.businessRole || currentConfig.businessRole,
      businessConfig: body.businessConfig || currentConfig.businessConfig || {},
    };

    // 更新机器人
    await db
      .update(robots)
      .set({
        config: updatedConfig,
        updatedAt: new Date(),
      })
      .where(eq(robots.id, id));

    // 清除缓存
    robotBusinessRoleService.clearCache(id);

    return NextResponse.json({
      success: true,
      data: {
        businessRole: updatedConfig.businessRole,
        businessConfig: updatedConfig.businessConfig,
      },
      message: '业务角色配置更新成功',
    });
  } catch (error) {
    console.error('Error in PATCH /api/robots/[id]/business-role:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
