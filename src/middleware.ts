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

  // 跳过 API 路由（不需要中间件认证）
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 检查是否是公开路由
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  if (isPublicRoute) {
    console.log('[Middleware] 公开路由，放行:', pathname);
    return NextResponse.next();
  }

  // 检查是否是受保护的路由
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    const token = request.cookies.get('access_token')?.value;

    console.log('[Middleware] 受保护路由:', pathname, 'Token存在:', !!token);

    // 如果没有 token，重定向到登录页
    if (!token) {
      // 避免无限重定向循环
      if (!pathname.startsWith('/auth/login')) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        console.log('[Middleware] 无 token，重定向到登录页');
        return NextResponse.redirect(loginUrl);
      }
    }
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
