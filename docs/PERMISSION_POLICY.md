# WorkTool AI 权限策略配置

## 1. 权限模型概述

WorkTool AI 采用分层权限模型：
- **角色层**: superadmin > admin > operator
- **资源层**: robots, sessions, messages, flows, prompts
- **操作层**: read, write, delete, manage

## 2. 角色定义

### 2.1 超级管理员 (superadmin)
- **权限范围**: 拥有系统所有权限
- **机器人管理**: 可以查看、创建、编辑、删除所有机器人
- **用户管理**: 可以查看、创建、编辑、删除所有用户
- **系统配置**: 可以访问和管理所有系统配置
- **审计日志**: 可以查看所有审计日志

### 2.2 管理员 (admin)
- **权限范围**: 管理被分配的资源
- **机器人管理**:
  - 可以查看所有机器人
  - 可以创建机器人（owner_id = 自己）
  - 可以编辑自己创建的机器人
  - 可以删除自己创建的机器人（不能删除 is_system=true 的机器人）
  - 可以分配机器人权限给其他用户
- **用户管理**:
  - 可以查看所有用户列表
  - 可以分配机器人权限给用户
  - 不能删除用户
- **审计日志**: 可以查看所有审计日志

### 2.3 普通用户 (operator)
- **权限范围**: 只能访问被授权的资源
- **机器人管理**:
  - 只能查看 owner_id = 自己 或 robot_permissions 中有记录的机器人
  - 可以创建机器人（owner_id = 自己）
  - 可以编辑自己创建的机器人
  - 只能删除自己创建的机器人（不能删除 is_system=true 的机器人）
  - 不能分配权限给其他用户
- **会话和消息**:
  - 只能查看授权机器人的会话和消息
- **审计日志**: 只能查看自己的审计日志

## 3. 权限策略矩阵

| 资源 | 操作 | superadmin | admin | operator |
|------|------|------------|-------|----------|
| robots | read | 全部 | 全部 | 授权的 |
| robots | create | 任意 | 自己 | 自己 |
| robots | update | 全部 | 自己 | 自己 |
| robots | delete | 全部 | 自己（非系统） | 自己（非系统） |
| robots | assign | 全部 | 可以 | 不能 |
| users | read | 全部 | 列表 | 无 |
| users | create | 任意 | 不能 | 不能 |
| users | update | 全部 | 不能 | 仅自己 |
| users | delete | 全部 | 不能 | 不能 |
| sessions | read | 全部 | 授权机器人的 | 授权机器人的 |
| messages | read | 全部 | 授权机器人的 | 授权机器人的 |
| flows | read | 全部 | 授权机器人的 | 授权机器人的 |
| prompts | read | 全部 | 全部 | 授权机器人的 |
| prompts | update | 全部 | 全部 | 不能 |
| audit_logs | read | 全部 | 全部 | 仅自己 |

## 4. 权限检查规则

### 4.1 机器人访问
```javascript
// 规则：
// - superadmin: 可以访问所有机器人
// - admin/operator: 可以访问 owner_id = userId 的机器人
// - admin/operator: 可以访问 robot_permissions 中有记录的机器人

hasRobotAccess(userId, robotId) {
  if (isSuperAdmin(userId)) return true;
  return (
    robot.ownerId === userId ||
    robotPermissions.exists({ userId, robotId, isActive: true })
  );
}
```

### 4.2 机器人删除
```javascript
// 规则：
// - superadmin: 可以删除任何机器人
// - admin/operator: 只能删除 owner_id = userId 且 is_system = false 的机器人

canDeleteRobot(userId, robotId) {
  if (isSuperAdmin(userId)) return true;
  return robot.ownerId === userId && !robot.isSystem;
}
```

### 4.3 机器人权限分配
```javascript
// 规则：
// - superadmin: 可以分配任何机器人给任何用户
// - admin: 可以分配 owner_id = 自己 的机器人给其他用户
// - operator: 不能分配权限

canAssignRobotPermissions(currentUserId, robotId) {
  if (isSuperAdmin(currentUserId)) return true;
  if (isAdmin(currentUserId)) {
    return robot.ownerId === currentUserId;
  }
  return false;
}
```

### 4.4 审计日志访问
```javascript
// 规则：
// - superadmin: 可以查看所有审计日志
// - admin: 可以查看所有审计日志
// - operator: 只能查看自己的审计日志

canViewAuditLogs(userId, targetUserId) {
  if (isSuperAdmin(userId) || isAdmin(userId)) return true;
  return userId === targetUserId;
}
```

## 5. 权限配置

### 5.1 机器人权限类型
```javascript
const PERMISSION_TYPES = {
  read: {
    label: '查看',
    description: '可以查看机器人详情和相关数据'
  },
  write: {
    label: '编辑',
    description: '可以编辑机器人配置'
  },
  delete: {
    label: '删除',
    description: '可以删除机器人（非系统机器人）'
  },
  view_sessions: {
    label: '查看会话',
    description: '可以查看机器人的会话记录'
  },
  view_messages: {
    label: '查看消息',
    description: '可以查看机器人的消息记录'
  }
};
```

### 5.2 默认权限
```javascript
const DEFAULT_PERMISSIONS = {
  superadmin: ['read', 'write', 'delete', 'view_sessions', 'view_messages'],
  admin: ['read', 'write', 'delete', 'view_sessions', 'view_messages'],
  operator: ['read', 'view_sessions', 'view_messages']
};
```

## 6. API 权限装饰器

### 6.1 常用权限 Hook
```javascript
// 基础认证
verifyAuth

// 角色检查
requireSuperAdmin
requireAdmin

// 资源权限检查
requireRobotAccess(robotIdParam)
requireRobotDelete(robotIdParam)

// 权限过滤
filterAccessibleRobots
filterAccessibleSessions
```

## 7. 业务场景权限示例

### 场景1: 普通用户查看机器人列表
```javascript
// API: GET /api/robots
// 需要认证: 是
// 权限检查: verifyAuth + filterAccessibleRobots
// 结果: 只返回用户有权限的机器人
```

### 场景2: 管理员为用户分配机器人权限
```javascript
// API: POST /api/robots/:id/permissions
// 需要认证: 是
// 权限检查: verifyAuth + requireAdmin + canAssignRobotPermissions
// 结果: 创建权限记录
```

### 场景3: 超级管理员删除系统机器人
```javascript
// API: DELETE /api/robots/:id
// 需要认证: 是
// 权限检查: verifyAuth + requireRobotDelete
// 结果: 可以删除（因为 isSuperAdmin）
```

### 场景4: 普通用户尝试删除系统机器人
```javascript
// API: DELETE /api/robots/:id
// 需要认证: 是
// 权限检查: verifyAuth + requireRobotDelete
// 结果: 403 Forbidden（因为 robot.isSystem = true 且不是 owner）
```

## 8. 扩展点

### 8.1 自定义权限策略
可以通过扩展 `permission.service.js` 来添加自定义权限规则：

```javascript
async function customPermissionCheck(userId, resource, action) {
  // 自定义权限逻辑
  return true/false;
}
```

### 8.2 权限缓存
为了提高性能，可以将权限检查结果缓存到 Redis：

```javascript
// 缓存键: permissions:{userId}:{resourceType}:{resourceId}
// 缓存时间: 5分钟
```

## 9. 安全注意事项

1. **最小权限原则**: 用户只拥有完成工作所需的最小权限
2. **权限继承**: 创建的资源默认属于创建者
3. **权限审计**: 所有权限变更都记录在审计日志中
4. **定期审查**: 管理员应定期审查用户权限
5. **权限隔离**: 不同租户的数据严格隔离
