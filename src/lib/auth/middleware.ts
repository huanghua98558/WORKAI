/**
 * API 认证和授权中间件
 */

import { NextRequest, NextResponse } from 'next/server';

// 定义用户权限
export enum Permission {
  ROBOT_READ = 'robot:read',
  ROBOT_WRITE = 'robot:write',
  ROBOT_DELETE = 'robot:delete',
  GROUP_READ = 'group:read',
  GROUP_WRITE = 'group:write',
  GROUP_DELETE = 'group:delete',
  ROLE_READ = 'role:read',
  ROLE_WRITE = 'role:write',
  COMMAND_SEND = 'command:send',
  COMMAND_READ = 'command:read',
  MONITOR_READ = 'monitor:read',
  CONFIG_READ = 'config:read',
  CONFIG_WRITE = 'config:write',
}

// 定义用户角色及其权限
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: Object.values(Permission),
  operator: [
    Permission.ROBOT_READ,
    Permission.ROBOT_WRITE,
    Permission.GROUP_READ,
    Permission.ROLE_READ,
    Permission.COMMAND_SEND,
    Permission.COMMAND_READ,
    Permission.MONITOR_READ,
  ],
  viewer: [
    Permission.ROBOT_READ,
    Permission.GROUP_READ,
    Permission.ROLE_READ,
    Permission.COMMAND_READ,
    Permission.MONITOR_READ,
    Permission.CONFIG_READ,
  ],
};

/**
 * 验证 API Token
 * @param request 请求对象
 * @returns 用户信息或 null
 */
export async function verifyToken(request: NextRequest): Promise<any | null> {
  try {
    // 从 Authorization header 获取 token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    // 在实际应用中，这里应该验证 JWT 或查询数据库
    // 这里简化处理，假设 token 就是用户 ID
    // TODO: 实现真正的 JWT 验证
    
    // 从环境变量获取 admin token
    const adminToken = process.env.ADMIN_TOKEN;
    if (adminToken && token === adminToken) {
      return {
        id: 'admin',
        role: 'admin',
        name: 'Administrator',
      };
    }

    // 验证 token 格式（简化版）
    if (token.length < 10) {
      return null;
    }

    // 模拟从数据库查询用户
    // TODO: 实现真实的用户查询
    return {
      id: token,
      role: 'operator', // 默认角色
      name: 'User',
    };
  } catch (error) {
    console.error('Token 验证失败:', error);
    return null;
  }
}

/**
 * 检查用户是否有指定权限
 * @param user 用户信息
 * @param permission 需要的权限
 * @returns 是否有权限
 */
export function hasPermission(user: any, permission: Permission): boolean {
  if (!user || !user.role) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes(permission);
}

/**
 * 认证中间件
 * 验证用户身份
 */
export async function authenticate(request: NextRequest): Promise<NextResponse | null> {
  const user = await verifyToken(request);

  if (!user) {
    return NextResponse.json(
      { success: false, message: '未授权，请提供有效的访问令牌' },
      { status: 401 }
    );
  }

  return null; // 认证通过
}

/**
 * 授权中间件
 * 验证用户权限
 */
export function authorize(user: any, permission: Permission): NextResponse | null {
  if (!hasPermission(user, permission)) {
    return NextResponse.json(
      { success: false, message: '权限不足' },
      { status: 403 }
    );
  }

  return null; // 授权通过
}

/**
 * 组合认证和授权中间件
 */
export async function authGuard(request: NextRequest, permission?: Permission): Promise<NextResponse | null> {
  // 认证
  const authError = await authenticate(request);
  if (authError) {
    return authError;
  }

  // 获取用户信息
  const user = await verifyToken(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: '获取用户信息失败' },
      { status: 500 }
    );
  }

  // 授权
  if (permission) {
    const authzError = authorize(user, permission);
    if (authzError) {
      return authzError;
    }
  }

  return null; // 通过
}

/**
 * 从请求中获取用户信息
 * @param request 请求对象
 * @returns 用户信息
 */
export async function getUserFromRequest(request: NextRequest): Promise<any | null> {
  return await verifyToken(request);
}

/**
 * API 路由包装器 - 自动处理认证
 */
export function withAuth(
  handler: (request: NextRequest, context?: any, user?: any) => Promise<NextResponse>,
  permission?: Permission
) {
  return async (request: NextRequest, context?: any) => {
    // 认证检查
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '未授权，请提供有效的访问令牌' },
        { status: 401 }
      );
    }

    // 权限检查
    if (permission && !hasPermission(user, permission)) {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      );
    }

    // 执行处理函数
    return handler(request, context, user);
  };
}

/**
 * 可选认证中间件 - 如果有 token 则验证，没有则继续
 */
export async function optionalAuth(request: NextRequest): Promise<any | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return await verifyToken(request);
}

/**
 * 从请求中获取客户端 IP
 */
export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * 记录 API 访问日志
 */
export function logApiAccess(request: NextRequest, user: any | null, response?: NextResponse) {
  const logData = {
    method: request.method,
    url: request.url,
    ip: getClientIP(request),
    userId: user?.id || null,
    userRole: user?.role || null,
    status: response?.status || null,
    timestamp: new Date().toISOString(),
  };

  // TODO: 将日志写入数据库或日志文件
  console.log('API Access:', JSON.stringify(logData));
}
