import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (result.code === 0) {
      // 创建响应并设置 cookies
      const res = NextResponse.json(result);

      // 设置 access_token cookie (httpOnly, secure, sameSite)
      res.cookies.set('access_token', result.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1小时
        path: '/',
      });

      // 设置 refresh_token cookie (httpOnly, secure, sameSite)
      res.cookies.set('refresh_token', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7天
        path: '/',
      });

      return res;
    }

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json(
      { code: 500, message: '登录失败' },
      { status: 500 }
    );
  }
}
