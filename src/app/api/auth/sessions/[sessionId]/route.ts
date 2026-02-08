import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { code: 401, message: '未授权' },
        { status: 401 }
      );
    }

    const { sessionId } = await params;

    const response = await fetch(
      `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/sessions/${sessionId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { code: 500, message: '销毁会话失败' },
      { status: 500 }
    );
  }
}
