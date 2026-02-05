import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '@/lib/services/session-service';

/**
 * 获取活跃会话列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params = {
      robotId: searchParams.get('robotId') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    const result = await sessionService.getActiveSessions(params);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.sessions,
      pagination: {
        limit: params.limit || 100,
        count: result.sessions.length,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/sessions/active:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
