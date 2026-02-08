import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { code: 401, message: '未授权' },
        { status: 401 }
      );
    }

    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/sessions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { code: 500, message: '获取会话列表失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { code: 401, message: '未授权' },
        { status: 401 }
      );
    }

    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/sessions/others`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Delete sessions error:', error);
    return NextResponse.json(
      { code: 500, message: '销毁会话失败' },
      { status: 500 }
    );
  }
}
