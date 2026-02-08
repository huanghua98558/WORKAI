import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要认证的路由列表
const protectedRoutes = [
  '/',
  '/admin',
  '/alerts',
  '/collab',
  '/collab-analytics',
  '/flow-engine',
  '/knowledge-base',
  '/monitoring',
  '/new-dashboard',
  '/profile',
  '/robot',
  '/settings',
  '/test',
];

// 公开路由（不需要认证）
const publicRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是公开路由
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 检查是否是受保护的路由
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    const token = request.cookies.get('access_token')?.value;

    // 如果没有 token，重定向到登录页
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 验证 token（可选，可以通过后端 API 验证）
    // 这里我们依赖后端 API 的认证机制
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (favicon 文件)
     * - public 文件夹中的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
