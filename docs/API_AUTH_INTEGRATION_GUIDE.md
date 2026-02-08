# WorkTool AI - API 权限验证集成指南

## 概述

本文档说明如何在 WorkTool AI 项目的各个 API 路由中集成权限验证，确保基于角色的数据隔离和权限控制。

## 核心组件

### 1. 认证 Hook (`server/hooks/auth.hook.js`)

提供以下预置的认证中间件：

| Hook | 说明 |
|------|------|
| `verifyAuth` | 验证用户身份，附加 `request.user` 和 `request.session` |
| `requireSuperAdmin` | 验证超级管理员权限 |
| `requireAdmin` | 验证管理员或超级管理员权限 |
| `requireRobotAccess(robotIdParam)` | 验证用户是否有权限访问指定机器人 |
| `requireRobotDelete(robotIdParam)` | 验证用户是否有权限删除指定机器人 |
| `filterAccessibleRobots` | 附加 `request.accessibleRobotIds` 到请求 |

### 2. 权限服务 (`server/services/permission.service.js`)

提供核心权限判断逻辑：

```javascript
// 获取用户可访问的所有机器人ID
await permissionService.getAccessibleRobotIds(userId);

// 检查用户是否有权限访问机器人
await permissionService.hasRobotAccess(userId, robotId);

// 检查用户是否有权限删除机器人
await permissionService.canDeleteRobot(userId, robotId);

// 检查是否为超级管理员
await permissionService.isSuperAdmin(userId);

// 检查是否为管理员
await permissionService.isAdmin(userId);
```

### 3. 会话服务 (`server/services/session.service.js`)

提供会话管理：

```javascript
// 创建会话
const result = await sessionService.createSession(user, { ip, userAgent, deviceType });

// 验证会话
const sessionData = await sessionService.verifySession(token);

// 销毁会话
await sessionService.destroySession(token);

// 刷新令牌
const tokens = await sessionService.refreshTokens(refreshToken);

// 获取用户所有会话
await sessionService.getUserSessions(userId);
```

### 4. 审计日志服务 (`server/services/audit-log.service.js`)

记录操作日志：

```javascript
await auditLogService.logAction({
  userId: user.id,
  action: 'create_robot',
  actionType: 'write',
  resourceType: 'robot',
  resourceId: robotId,
  status: 'success',
  ipAddress: request.ip,
  userAgent: request.headers['user-agent']
});
```

## API 路由集成示例

### 示例 1: 机器人 API - 获取列表

```javascript
// server/routes/robots.api.js
const { filterAccessibleRobots } = require('../hooks/auth.hook');

async function robotRoutes(fastify, options) {
  // 获取机器人列表 - 只返回用户有权限的机器人
  fastify.get('/', {
    onRequest: [filterAccessibleRobots],
  }, async (request, reply) => {
    const db = await getDb();
    const { accessibleRobotIds } = request;

    // 只查询用户有权限的机器人
    const robots = await db
      .select()
      .from(robots)
      .where(sql`${robots.id} IN ${accessibleRobotIds}`)
      .orderBy(sql`${robots.createdAt} DESC`);

    return reply.send({
      code: 0,
      message: '获取成功',
      data: robots
    });
  });
}
```

### 示例 2: 机器人 API - 创建

```javascript
const { verifyAuth } = require('../hooks/auth.hook');
const { auditLogService } = require('../services/audit-log.service');

async function robotRoutes(fastify, options) {
  // 创建机器人
  fastify.post('/', {
    onRequest: [verifyAuth],
  }, async (request, reply) => {
    const { user } = request;
    const { name, description } = request.body;

    const db = await getDb();

    // 创建机器人，设置 owner_id 为当前用户
    const [robot] = await db.insert(robots).values({
      name,
      description,
      ownerId: user.id,  // 设置 owner_id
      isSystem: false    // 用户创建的机器人非系统机器人
    }).returning();

    // 记录审计日志
    await auditLogService.logAction({
      userId: user.id,
      action: 'create_robot',
      actionType: 'write',
      resourceType: 'robot',
      resourceId: robot.id,
      status: 'success',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    });

    return reply.send({
      code: 0,
      message: '创建成功',
      data: robot
    });
  });
}
```

### 示例 3: 机器人 API - 获取详情

```javascript
const { requireRobotAccess } = require('../hooks/auth.hook');

async function robotRoutes(fastify, options) {
  // 获取机器人详情
  fastify.get('/:robotId', {
    onRequest: [requireRobotAccess('robotId')],
  }, async (request, reply) => {
    const { robotId } = request.params;
    const db = await getDb();

    const robot = await db
      .select()
      .from(robots)
      .where(eq(robots.id, robotId))
      .limit(1);

    if (!robot || robot.length === 0) {
      return reply.status(404).send({
        code: 404,
        message: '机器人不存在',
        error: 'Not Found'
      });
    }

    return reply.send({
      code: 0,
      message: '获取成功',
      data: robot[0]
    });
  });
}
```

### 示例 4: 机器人 API - 删除

```javascript
const { requireRobotDelete } = require('../hooks/auth.hook');
const { auditLogService } = require('../services/audit-log.service');

async function robotRoutes(fastify, options) {
  // 删除机器人
  fastify.delete('/:robotId', {
    onRequest: [requireRobotDelete('robotId')],
  }, async (request, reply) => {
    const { robotId } = request.params;
    const { user } = request;
    const db = await getDb();

    // 删除机器人
    await db.delete(robots).where(eq(robots.id, robotId));

    // 记录审计日志
    await auditLogService.logAction({
      userId: user.id,
      action: 'delete_robot',
      actionType: 'delete',
      resourceType: 'robot',
      resourceId: robotId,
      status: 'success',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    });

    return reply.send({
      code: 0,
      message: '删除成功'
    });
  });
}
```

### 示例 5: 会话 API - 获取会话列表

```javascript
const { verifyAuth } = require('../hooks/auth.hook');

async function conversationRoutes(fastify, options) {
  // 获取会话列表 - 只返回用户有权限的机器人的会话
  fastify.get('/', {
    onRequest: [verifyAuth],
  }, async (request, reply) => {
    const { user } = request;
    const db = await getDb();

    // 获取用户可访问的机器人ID
    const accessibleRobotIds = await permissionService.getAccessibleRobotIds(user.id);

    // 查询这些机器人的会话
    const conversations = await db
      .select()
      .from(conversations)
      .where(sql`${conversations.robotId} IN ${accessibleRobotIds}`)
      .orderBy(sql`${conversations.createdAt} DESC`);

    return reply.send({
      code: 0,
      message: '获取成功',
      data: conversations
    });
  });
}
```

### 示例 6: 管理员专属接口

```javascript
const { requireAdmin } = require('../hooks/auth.hook');

async function adminRoutes(fastify, options) {
  // 获取所有用户列表 - 仅管理员
  fastify.get('/users', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const db = await getDb();

    const users = await db
      .select()
      .from(users)
      .orderBy(sql`${users.createdAt} DESC`);

    return reply.send({
      code: 0,
      message: '获取成功',
      data: users
    });
  });

  // 为用户分配机器人权限 - 仅管理员
  fastify.post('/permissions', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const { userId, robotId, permissions } = request.body;
    const { user } = request;
    const db = await getDb();

    // 创建权限记录
    await db.insert(robotPermissions).values({
      userId,
      robotId,
      permissions,  // { read: true, write: true, delete: false }
      grantedBy: user.id,
      grantedAt: new Date()
    });

    return reply.send({
      code: 0,
      message: '权限分配成功'
    });
  });
}
```

## 认证流程

### 1. 登录流程

```
客户端 → POST /api/auth/login
       ↓
验证用户名密码
       ↓
创建会话 → user_sessions 表
       ↓
生成 JWT access token 和 refresh token
       ↓
返回 tokens 和用户信息
```

### 2. 受保护资源访问流程

```
客户端 → GET /api/robots (带 Authorization: Bearer <token>)
       ↓
verifyAuth Hook 验证 token
       ↓
检查会话有效性
       ↓
附加 user 和 session 到 request
       ↓
执行业务逻辑（带权限过滤）
       ↓
返回数据
```

### 3. 登出流程

```
客户端 → POST /api/auth/logout
       ↓
从 user_sessions 中删除会话
       ↓
返回成功
```

## 前端集成示例

### 使用 axios 发起请求

```javascript
import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api'
});

// 请求拦截器 - 自动添加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理 token 刷新
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // 401 错误，尝试刷新 token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('/api/auth/refresh', {
          refreshToken
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', newRefreshToken);

        // 重试原请求
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // 刷新失败，跳转登录页
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// 使用示例
export async function getRobots() {
  return await api.get('/robots');
}

export async function createRobot(data) {
  return await api.post('/robots', data);
}
```

## 数据隔离策略

### 1. 机器人访问控制

- **超级管理员**: 可访问所有机器人
- **管理员**: 可访问自己创建的机器人 + 被授权的机器人
- **普通用户**: 只能访问 `owner_id = 自己` 或 `robot_permissions` 表中有记录的机器人

### 2. 删除权限

- **超级管理员**: 可删除任何机器人
- **其他角色**: 只能删除自己创建的机器人（`owner_id = 自己`），不能删除 `is_system = true` 的机器人

### 3. 会话和消息

- 会话和消息通过关联的 `robot_id` 进行过滤
- 只能访问用户有权限的机器人的会话和消息

## 安全最佳实践

1. **密码安全**: 使用 bcrypt 加密，12轮加盐
2. **登录失败锁定**: 5次失败锁定30分钟
3. **令牌过期**: Access token 15分钟，Refresh token 7天
4. **会话管理**: 支持多设备登录，可查看和注销会话
5. **审计日志**: 记录所有敏感操作
6. **权限检查**: 每个API都进行权限验证

## 下一步

1. 在 `server/routes/robots.api.js` 中集成权限验证
2. 在 `server/routes/conversations.api.js` 中集成权限验证
3. 在 `server/routes/messages.api.js` 中集成权限验证
4. 创建前端登录、注册、个人资料页面
