import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/services/user-service';

/**
 * 获取用户上下文信息
 * GET /api/users/[id]/context
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required',
        },
        { status: 400 }
      );
    }

    // 1. 获取用户基本信息
    const userResult = await userService.getUserById(id);
    if (!userResult.success || !userResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // 2. 构建上下文数据
    const contextData: any = {
      user: {
        id: userResult.user.id,
        username: userResult.user.username,
        email: userResult.user.email,
        role: userResult.user.role,
        isActive: userResult.user.isActive,
        createdAt: userResult.user.createdAt,
      },
    };

    return NextResponse.json({
      success: true,
      data: contextData,
    });
  } catch (error) {
    console.error('[API] 获取用户上下文失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
