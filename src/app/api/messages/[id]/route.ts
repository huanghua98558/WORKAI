import { NextRequest, NextResponse } from 'next/server';
import { messageService } from '@/lib/services/message-service';

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
          error: 'Message ID is required',
        },
        { status: 400 }
      );
    }

    const result = await messageService.getMessageById(id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.error === 'Message not found' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.message,
    });
  } catch (error) {
    console.error('Error in GET /api/messages/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

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
          error: 'Message ID is required',
        },
        { status: 400 }
      );
    }

    const result = await messageService.updateMessage(id, body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.error === 'Message not found' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.message,
    });
  } catch (error) {
    console.error('Error in PUT /api/messages/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

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
          error: 'Message ID is required',
        },
        { status: 400 }
      );
    }

    const result = await messageService.deleteMessage(id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.error === 'Message not found' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/messages/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
