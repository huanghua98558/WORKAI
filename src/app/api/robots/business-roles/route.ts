import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { businessRoles, robots } from '@/storage/database/new-schemas';
import { eq, and, or, like, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const robotId = searchParams.get('robotId') || undefined;

    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(businessRoles.name, `%${search}%`),
          like(businessRoles.code, `%${search}%`),
          like(businessRoles.description || '', `%${search}%`)
        )
      );
    }

    if (robotId) {
      conditions.push(
        or(
          eq(businessRoles.robotId, robotId),
          sql`${businessRoles.robotId} IS NULL`
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 查询业务角色列表（包含机器人信息）
    const rolesList = await db
      .select({
        id: businessRoles.id,
        name: businessRoles.name,
        code: businessRoles.code,
        description: businessRoles.description,
        aiBehavior: businessRoles.aiBehavior,
        staffEnabled: businessRoles.staffEnabled,
        staffTypeFilter: businessRoles.staffTypeFilter,
        keywords: businessRoles.keywords,
        enableTaskCreation: businessRoles.enableTaskCreation,
        defaultTaskPriority: businessRoles.defaultTaskPriority,
        robotId: businessRoles.robotId,
        createdAt: businessRoles.createdAt,
        updatedAt: businessRoles.updatedAt,
        robotName: robots.name,
        robotRobotId: robots.id,
      })
      .from(businessRoles)
      .leftJoin(robots, eq(businessRoles.robotId, robots.id))
      .where(whereClause)
      .orderBy(desc(businessRoles.createdAt))
      .limit(limit)
      .offset(offset);

    // 查询总数
    const totalCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(businessRoles)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: rolesList,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        pages: Math.ceil((totalCount[0]?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('获取业务角色列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取业务角色列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      description,
      aiBehavior,
      staffEnabled,
      staffTypeFilter,
      keywords,
      enableTaskCreation,
      defaultTaskPriority,
      robotId,
    } = body;

    // 验证必填字段
    if (!name || !code || !aiBehavior) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段：name, code, aiBehavior' },
        { status: 400 }
      );
    }

    // 检查 code 是否已存在
    const existing = await db
      .select()
      .from(businessRoles)
      .where(eq(businessRoles.code, code))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: '业务角色编码已存在' },
        { status: 400 }
      );
    }

    // 创建业务角色
    const newRole = await db
      .insert(businessRoles)
      .values({
        name,
        code,
        description,
        aiBehavior,
        staffEnabled: staffEnabled ?? true,
        staffTypeFilter: staffTypeFilter || [],
        keywords: keywords || [],
        enableTaskCreation: enableTaskCreation ?? true, // 修改默认值为 true
        defaultTaskPriority: defaultTaskPriority || 'normal',
        robotId: robotId || null,
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newRole[0],
    });
  } catch (error) {
    console.error('创建业务角色失败:', error);
    return NextResponse.json(
      { success: false, error: '创建业务角色失败: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      code,
      description,
      aiBehavior,
      staffEnabled,
      staffTypeFilter,
      keywords,
      enableTaskCreation,
      defaultTaskPriority,
      robotId,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段：id' },
        { status: 400 }
      );
    }

    // 更新业务角色
    const updatedRole = await db
      .update(businessRoles)
      .set({
        ...(name && { name }),
        description,
        aiBehavior,
        staffEnabled,
        staffTypeFilter,
        keywords,
        enableTaskCreation,
        defaultTaskPriority,
        robotId,
        updatedAt: new Date(),
      })
      .where(eq(businessRoles.id, id))
      .returning();

    if (updatedRole.length === 0) {
      return NextResponse.json(
        { success: false, error: '业务角色不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedRole[0],
    });
  } catch (error) {
    console.error('更新业务角色失败:', error);
    return NextResponse.json(
      { success: false, error: '更新业务角色失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少必填参数：id' },
        { status: 400 }
      );
    }

    // 删除业务角色
    const deletedRole = await db
      .delete(businessRoles)
      .where(eq(businessRoles.id, id))
      .returning();

    if (deletedRole.length === 0) {
      return NextResponse.json(
        { success: false, error: '业务角色不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '业务角色删除成功',
    });
  } catch (error) {
    console.error('删除业务角色失败:', error);
    return NextResponse.json(
      { success: false, error: '删除业务角色失败' },
      { status: 500 }
    );
  }
}
