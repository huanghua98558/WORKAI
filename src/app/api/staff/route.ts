import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { staff } from '@/storage/database/new-schemas/staff';
import { and, eq, like } from 'drizzle-orm';

/**
 * 获取工作人员列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;

    const conditions = [];

    if (status) {
      conditions.push(eq(staff.status, status as 'active' | 'inactive'));
    }

    if (search) {
      conditions.push(like(staff.name, `%${search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, total] = await Promise.all([
      db
        .select()
        .from(staff)
        .where(where)
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .orderBy(staff.createdAt),
      db.select({ count: staff.id }).from(staff).where(where),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total: total.length,
        totalPages: Math.ceil(total.length / pageSize),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/staff:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * 创建工作人员
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newStaff = {
      id: body.id || crypto.randomUUID(),
      name: body.name,
      email: body.email,
      role: body.role || 'staff',
      status: body.status || 'offline',
      permissions: body.permissions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(staff).values(newStaff).returning();

    return NextResponse.json(
      {
        success: true,
        data: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/staff:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
