import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (token) {
      await fetch(`${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }

    // 清除 cookies
    const res = NextResponse.json({ code: 0, message: '登出成功' });
    res.cookies.delete('access_token');
    res.cookies.delete('refresh_token');

    return res;
  } catch (error) {
    console.error('Logout error:', error);

    // 即使后端出错，也要清除 cookies
    const res = NextResponse.json({ code: 0, message: '登出成功' });
    res.cookies.delete('access_token');
    res.cookies.delete('refresh_token');

    return res;
  }
}
