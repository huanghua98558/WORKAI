import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 后端 URL 配置
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, rememberMe = false } = body;

    console.log('[Login API] 尝试登录:', { username, backendUrl: BACKEND_URL });

    // 使用 AbortController 设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, rememberMe }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();
      console.log('[Login API] 后端响应:', { code: result.code, message: result.message });

      if (result.code === 0) {
        console.log('[Login API] 登录成功，设置 cookies');
        // 创建响应并设置 cookies
        const res = NextResponse.json(result);

        // 设置 access_token cookie (httpOnly, secure, sameSite)
        const accessTokenExpiry = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60; // 30天或1小时
        res.cookies.set('access_token', result.data.accessToken, {
          httpOnly: true,
          secure: false, // 允许非 HTTPS 环境
          sameSite: 'lax',
          maxAge: accessTokenExpiry,
          path: '/',
        });

        console.log('[Login API] 已设置 access_token cookie, expiry:', accessTokenExpiry);

        // 设置 refresh_token cookie (httpOnly, secure, sameSite)
        const refreshTokenExpiry = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30天或7天
        res.cookies.set('refresh_token', result.data.refreshToken, {
          httpOnly: true,
          secure: false, // 允许非 HTTPS 环境
          sameSite: 'lax',
          maxAge: refreshTokenExpiry,
          path: '/',
        });

        console.log('[Login API] 已设置 refresh_token cookie, expiry:', refreshTokenExpiry);

        return res;
      }

      return NextResponse.json(result, { status: response.status });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('[Login API] 请求超时');
        return NextResponse.json(
          { code: -1, message: '请求超时，请检查网络连接' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[Login API] 错误:', error.message);
    return NextResponse.json(
      { code: -1, message: `无法连接到服务器: ${error.message}` },
      { status: 500 }
    );
  }
}
