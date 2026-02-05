import { NextRequest, NextResponse } from 'next/server';
import { interventionService } from '@/lib/services/intervention-service';

/**
 * 获取介入记录详情
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
          error: 'Intervention ID is required',
        },
        { status: 400 }
      );
    }

    const result = await interventionService.getInterventionById(id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.error === 'Intervention not found' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.intervention,
    });
  } catch (error) {
    console.error('Error in GET /api/interventions/[id]:', error);
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
 * 更新介入记录
 */
export async function PUT(
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
          error: 'Intervention ID is required',
        },
        { status: 400 }
      );
    }

    const result = await interventionService.updateIntervention(id, body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.error === 'Intervention not found' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.intervention,
      message: '介入记录更新成功',
    });
  } catch (error) {
    console.error('Error in PUT /api/interventions/[id]:', error);
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
 * 删除介入记录
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Intervention ID is required',
        },
        { status: 400 }
      );
    }

    const result = await interventionService.deleteIntervention(id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.error === 'Intervention not found' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '介入记录删除成功',
    });
  } catch (error) {
    console.error('Error in DELETE /api/interventions/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
