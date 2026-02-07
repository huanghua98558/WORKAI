import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { businessRoles, robots } from '@/storage/database/new-schemas';
import { eq, desc, count } from 'drizzle-orm';

/**
 * GET /api/robots/business-roles
 * 获取业务角色列表（含机器人数量统计）
 */
export async function GET(request: NextRequest) {
  try {
    const roles = await db.query.businessRoles.findMany({
      orderBy: (businessRoles, { desc }) => [desc(businessRoles.createdAt)],
    });

    // 统计每个业务角色的机器人数量
    const rolesWithCount = await Promise.all(
      roles.map(async (role) => {
        const [{ count: robotCount }] = await db
          .select({ count: count() })
          .from(robots)
          .where(
            sql`config->>'businessRole' = ${role.code}`
          );

        return {
          id: role.id,
          name: role.name,
          code: role.code,
          description: role.description,
          aiBehavior: role.aiBehavior,
          staffEnabled: role.staffEnabled,
          staffTypeFilter: role.staffTypeFilter,
          keywords: role.keywords,
          defaultTaskPriority: role.defaultTaskPriority,
          enableTaskCreation: role.enableTaskCreation,
          robotCount: Number(robotCount),
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: rolesWithCount,
      count: rolesWithCount.length,
    });
  } catch (error) {
    console.error('Error in GET /api/robots/business-roles:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST /api/robots/business-roles
 * 新增业务角色
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.name || !body.code) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, code',
      }, { status: 400 });
    }

    // 验证 code 格式
    const validCodes = ['community_ops', 'conversion_staff', 'after_sales'];
    if (!validCodes.includes(body.code)) {
      return NextResponse.json({
        success: false,
        error: `Invalid code. Must be one of: ${validCodes.join(', ')}`,
      }, { status: 400 });
    }

    // 验证 aiBehavior 格式
    const validAiBehaviors = ['full_auto', 'semi_auto', 'record_only'];
    if (!validAiBehaviors.includes(body.aiBehavior)) {
      return NextResponse.json({
        success: false,
        error: `Invalid aiBehavior. Must be one of: ${validAiBehaviors.join(', ')}`,
      }, { status: 400 });
    }

    // 检查 code 是否已存在
    const existing = await db.query.businessRoles.findFirst({
      where: eq(businessRoles.code, body.code),
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: `Business role with code "${body.code}" already exists`,
      }, { status: 409 });
    }

    // 创建新业务角色
    const newRole = {
      id: crypto.randomUUID(),
      name: body.name,
      code: body.code,
      description: body.description || null,
      aiBehavior: body.aiBehavior || 'semi_auto',
      staffEnabled: body.staffEnabled ?? true,
      staffTypeFilter: body.staffTypeFilter || [],
      keywords: body.keywords || [],
      defaultTaskPriority: body.defaultTaskPriority || 'normal',
      enableTaskCreation: body.enableTaskCreation ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(businessRoles).values(newRole);

    return NextResponse.json({
      success: true,
      data: newRole,
      message: '业务角色创建成功',
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/robots/business-roles:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/robots/business-roles
 * 更新业务角色
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: id',
      }, { status: 400 });
    }

    // 验证 aiBehavior 格式
    if (body.aiBehavior) {
      const validAiBehaviors = ['full_auto', 'semi_auto', 'record_only'];
      if (!validAiBehaviors.includes(body.aiBehavior)) {
        return NextResponse.json({
          success: false,
          error: `Invalid aiBehavior. Must be one of: ${validAiBehaviors.join(', ')}`,
        }, { status: 400 });
      }
    }

    // 更新业务角色
    await db
      .update(businessRoles)
      .set({
        name: body.name,
        code: body.code,
        description: body.description,
        aiBehavior: body.aiBehavior,
        staffEnabled: body.staffEnabled,
        staffTypeFilter: body.staffTypeFilter,
        keywords: body.keywords,
        defaultTaskPriority: body.defaultTaskPriority,
        enableTaskCreation: body.enableTaskCreation,
        updatedAt: new Date(),
      })
      .where(eq(businessRoles.id, body.id));

    // 清除缓存
    const { robotBusinessRoleService } = await import('@/services/robot-business-role-service');
    robotBusinessRoleService.clearCache();

    return NextResponse.json({
      success: true,
      message: '业务角色更新成功',
    });
  } catch (error) {
    console.error('Error in PUT /api/robots/business-roles:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/robots/business-roles
 * 删除业务角色
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: id',
      }, { status: 400 });
    }

    // 检查是否有机器人使用该业务角色
    const role = await db.query.businessRoles.findFirst({
      where: eq(businessRoles.id, body.id),
    });

    if (!role) {
      return NextResponse.json({
        success: false,
        error: 'Business role not found',
      }, { status: 404 });
    }

    const [{ count: robotCount }] = await db
      .select({ count: count() })
      .from(robots)
      .where(
        sql`config->>'businessRole' = ${role.code}`
      );

    if (robotCount > 0) {
      return NextResponse.json({
        success: false,
        error: `无法删除：有 ${robotCount} 个机器人正在使用此业务角色`,
      }, { status: 409 });
    }

    // 删除业务角色
    await db
      .delete(businessRoles)
      .where(eq(businessRoles.id, body.id));

    // 清除缓存
    const { robotBusinessRoleService } = await import('@/services/robot-business-role-service');
    robotBusinessRoleService.clearCache();

    return NextResponse.json({
      success: true,
      message: '业务角色删除成功',
    });
  } catch (error) {
    console.error('Error in DELETE /api/robots/business-roles:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
