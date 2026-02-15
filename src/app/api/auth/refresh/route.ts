import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    console.log('[Refresh API] 尝试刷新令牌');

    const response = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
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
        secure: false, // 允许非 HTTPS 环境
        sameSite: 'lax',
        maxAge: 60 * 60,
        path: '/',
      });

      res.cookies.set('refresh_token', result.data.refreshToken, {
        httpOnly: true,
        secure: false, // 允许非 HTTPS 环境
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return res;
    }

    return NextResponse.json(result, { status: response.status });
  } catch (error: any) {
    console.error('[Refresh API] 错误:', error.message);
    return NextResponse.json(
      { code: -1, message: `刷新失败: ${error.message}` },
      { status: 500 }
    );
  }
}
