import { NextRequest, NextResponse } from 'next/server';
import { interventionService } from '@/lib/services/intervention-service';

/**
 * 创建介入记录
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.sessionId || !body.staffId || !body.staffName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: sessionId, staffId, staffName',
        },
        { status: 400 }
      );
    }

    const result = await interventionService.createIntervention({
      sessionId: body.sessionId,
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
    console.error('Error in POST /api/interventions:', error);
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
 * 获取介入记录列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params = {
      sessionId: searchParams.get('sessionId') || undefined,
      staffId: searchParams.get('staffId') || undefined,
      status: searchParams.get('status') || undefined,
      interventionType: searchParams.get('interventionType') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const result = await interventionService.getInterventions(params);

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
        limit: params.limit || 100,
        offset: params.offset || 0,
        count: result.interventions.length,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/interventions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
