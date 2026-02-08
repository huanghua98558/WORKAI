import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const result = await response.json();

    if (result.code === 0) {
      // 更新 cookies
      const res = NextResponse.json(result);

      res.cookies.set('access_token', result.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60,
        path: '/',
      });

      res.cookies.set('refresh_token', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return res;
    }

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { code: 500, message: '刷新失败' },
      { status: 500 }
    );
  }
}
