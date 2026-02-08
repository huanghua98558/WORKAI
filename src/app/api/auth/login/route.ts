import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, rememberMe = false } = body;

    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, rememberMe }),
    });

    const result = await response.json();

    if (result.code === 0) {
      // 创建响应并设置 cookies
      const res = NextResponse.json(result);

      // 设置 access_token cookie (httpOnly, secure, sameSite)
      const accessTokenExpiry = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60; // 30天或1小时
      res.cookies.set('access_token', result.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: accessTokenExpiry,
        path: '/',
      });

      // 设置 refresh_token cookie (httpOnly, secure, sameSite)
      const refreshTokenExpiry = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30天或7天
      res.cookies.set('refresh_token', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshTokenExpiry,
        path: '/',
      });

      return res;
    }

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { code: 500, message: '网络错误，请稍后重试' },
      { status: 500 }
    );
  }
}
