import { NextRequest, NextResponse } from 'next/server';
import { interventionService } from '@/lib/services/intervention-service';

/**
 * 解决介入记录
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
          error: 'Intervention ID is required',
        },
        { status: 400 }
      );
    }

    const { resolvedBy, resolutionNote } = body;

    if (!resolvedBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: resolvedBy',
        },
        { status: 400 }
      );
    }

    const result = await interventionService.resolveIntervention(
      id,
      resolvedBy,
      resolutionNote
    );

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
      message: '介入记录解决成功',
    });
  } catch (error) {
    console.error('Error in POST /api/interventions/[id]/resolve:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
