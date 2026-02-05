import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '@/lib/services/session-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.robotId || !body.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: robotId, userId',
        },
        { status: 400 }
      );
    }

    const result = await sessionService.getOrCreateSession({
      robotId: body.robotId,
      userId: body.userId,
      userName: body.userName,
      userAvatarUrl: body.userAvatarUrl,
      userSource: body.userSource,
      sessionType: body.sessionType,
      metadata: body.metadata,
    });

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
      data: result.session,
    });
  } catch (error) {
    console.error('Error in POST /api/sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params = {
      robotId: searchParams.get('robotId') || undefined,
      userId: searchParams.get('userId') || undefined,
      status: searchParams.get('status') as 'active' | 'ended' | 'transferred' | 'archived' | undefined,
      staffIntervened: searchParams.get('staffIntervened') === 'true' ? true : 
                         searchParams.get('staffIntervened') === 'false' ? false : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const result = await sessionService.getSessions(params);

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
        offset: params.offset || 0,
        count: result.sessions.length,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
