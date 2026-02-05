import { NextRequest, NextResponse } from 'next/server';
import { interventionService } from '@/lib/services/intervention-service';

/**
 * 获取会话的介入记录列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session ID is required',
        },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const result = await interventionService.getInterventions({
      sessionId: id,
      status: searchParams.get('status') || undefined,
      interventionType: searchParams.get('interventionType') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
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
      data: result.interventions,
      pagination: {
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
        offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
        count: result.interventions.length,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/sessions/[id]/interventions:', error);
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
 * 为会话创建介入记录
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session ID is required',
        },
        { status: 400 }
      );
    }

    // 验证必填字段
    if (!body.staffId || !body.staffName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: staffId, staffName',
        },
        { status: 400 }
      );
    }

    const result = await interventionService.createIntervention({
      sessionId: id,
      staffId: body.staffId,
      staffName: body.staffName,
      messageId: body.messageId,
      interventionType: body.interventionType,
      reason: body.reason,
      interventionContent: body.interventionContent,
      messageSnapshot: body.messageSnapshot,
      sessionSnapshot: body.sessionSnapshot,
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
      data: result.intervention,
      message: '介入记录创建成功',
    });
  } catch (error) {
    console.error('Error in POST /api/sessions/[id]/interventions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
