# WorkTool AI 中枢系统 - 模块升级详解（后端API篇）

## 📋 目录

1. [用户管理API](#1-用户管理api)
2. [角色权限API](#2-角色权限api)
3. [审计日志API](#3-审计日志api)
4. [告警配置API](#4-告警配置api)
5. [AI配置API](#5-ai配置api)
6. [工作人员监控API](#6-工作人员监控api)
7. [用户满意度API](#7-用户满意度api)
8. [腾讯文档API](#8-腾讯文档api)

---

## 1. 用户管理API

### 1.1 获取用户列表

**接口路径：** `GET /api/users`

**权限要求：** `user_view`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |
| search | string | 否 | 搜索关键词（用户名、邮箱、真实姓名） |
| status | string | 否 | 状态筛选（active、inactive、locked） |
| roleId | string | 否 | 角色筛选 |

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "user-001",
        "username": "admin",
        "email": "admin@example.com",
        "phone": "13800138000",
        "realName": "管理员",
        "status": "active",
        "createdAt": "2024-01-10T10:00:00.000Z",
        "updatedAt": "2024-01-10T10:00:00.000Z",
        "roles": [
          {
            "roleId": "role-001",
            "roleName": "超级管理员",
            "roleCode": "ADMIN"
          }
        ]
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

**实现代码：**

```javascript
fastify.get('/users', {
  onRequest: [verifyAuth, requirePermission('user_view')],
}, async (request, reply) => {
  try {
    const { page, pageSize, search, status, roleId } = request.query;
    const result = await userService.getUserList({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      search,
      status,
      roleId,
    });
    return reply.send({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error) {
    return reply.status(500).send({
      code: -1,
      message: error.message,
    });
  }
});
```

### 1.2 创建用户

**接口路径：** `POST /api/users`

**权限要求：** `user_create`

**请求参数：**

```json
{
  "username": "newuser",
  "password": "password123",
  "email": "newuser@example.com",
  "phone": "13800138001",
  "realName": "新用户",
  "status": "active",
  "roleIds": ["role-002"]
}
```

**返回参数：**

```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": "user-002",
    "username": "newuser",
    "email": "newuser@example.com",
    "phone": "13800138001",
    "realName": "新用户",
    "status": "active",
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-10T10:00:00.000Z"
  }
}
```

**实现代码：**

```javascript
fastify.post('/users', {
  onRequest: [verifyAuth, requirePermission('user_create')],
  schema: {
    body: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string' },
        password: { type: 'string', minLength: 6 },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        realName: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive', 'locked'] },
        roleIds: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}, async (request, reply) => {
  try {
    const result = await userService.createUser(request.body, request.user.id);
    return reply.send({
      code: 0,
      message: '创建成功',
      data: result,
    });
  } catch (error) {
    return reply.status(500).send({
      code: -1,
      message: error.message,
    });
  }
});
```

### 1.3 更新用户

**接口路径：** `PUT /api/users/:user_id`

**权限要求：** `user_update`

**请求参数：**

```json
{
  "email": "updated@example.com",
  "phone": "13800138002",
  "realName": "更新用户",
  "status": "active",
  "roleIds": ["role-002", "role-003"]
}
```

**返回参数：**

```json
{
  "code": 0,
  "message": "更新成功",
  "data": {
    "id": "user-002",
    "email": "updated@example.com",
    "phone": "13800138002",
    "realName": "更新用户",
    "status": "active",
    "updatedAt": "2024-01-10T11:00:00.000Z"
  }
}
```

### 1.4 删除用户

**接口路径：** `DELETE /api/users/:user_id`

**权限要求：** `user_delete`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| user_id | string | 是 | 用户ID（路径参数） |

**返回参数：**

```json
{
  "code": 0,
  "message": "删除成功",
  "data": {
    "success": true
  }
}
```

### 1.5 重置密码

**接口路径：** `POST /api/users/:user_id/reset-password`

**权限要求：** `user_update`

**请求参数：**

```json
{
  "newPassword": "newpassword123"
}
```

**返回参数：**

```json
{
  "code": 0,
  "message": "密码重置成功",
  "data": {
    "success": true
  }
}
```

### 1.6 锁定用户

**接口路径：** `POST /api/users/:user_id/lock`

**权限要求：** `user_update`

**请求参数：**

```json
{
  "lockMinutes": 30
}
```

**返回参数：**

```json
{
  "code": 0,
  "message": "用户锁定成功",
  "data": {
    "success": true,
    "lockedUntil": "2024-01-10T11:30:00.000Z"
  }
}
```

### 1.7 解锁用户

**接口路径：** `POST /api/users/:user_id/unlock`

**权限要求：** `user_update`

**返回参数：**

```json
{
  "code": 0,
  "message": "用户解锁成功",
  "data": {
    "success": true
  }
}
```

---

## 2. 角色权限API

### 2.1 获取角色列表

**接口路径：** `GET /api/roles`

**权限要求：** `role_view`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |
| search | string | 否 | 搜索关键词（角色名、角色代码） |
| isSystem | boolean | 否 | 是否系统角色 |

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "role-001",
        "roleName": "超级管理员",
        "roleCode": "ADMIN",
        "description": "拥有所有权限",
        "isSystem": true,
        "createdAt": "2024-01-10T10:00:00.000Z",
        "updatedAt": "2024-01-10T10:00:00.000Z",
        "permissionCount": 25,
        "userCount": 5
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 20
  }
}
```

### 2.2 创建角色

**接口路径：** `POST /api/roles`

**权限要求：** `role_create`

**请求参数：**

```json
{
  "roleName": "新角色",
  "roleCode": "NEW_ROLE",
  "description": "这是一个新角色",
  "isSystem": false,
  "permissionIds": ["perm-001", "perm-002"]
}
```

**返回参数：**

```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": "role-006",
    "roleName": "新角色",
    "roleCode": "NEW_ROLE",
    "description": "这是一个新角色",
    "isSystem": false,
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-10T10:00:00.000Z"
  }
}
```

### 2.3 更新角色

**接口路径：** `PUT /api/roles/:role_id`

**权限要求：** `role_update`

**请求参数：**

```json
{
  "roleName": "更新角色",
  "description": "角色描述已更新",
  "permissionIds": ["perm-001", "perm-002", "perm-003"]
}
```

### 2.4 删除角色

**接口路径：** `DELETE /api/roles/:role_id`

**权限要求：** `role_delete`

### 2.5 获取角色详情

**接口路径：** `GET /api/roles/:role_id`

**权限要求：** `role_view`

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "role-001",
    "roleName": "超级管理员",
    "roleCode": "ADMIN",
    "description": "拥有所有权限",
    "isSystem": true,
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-10T10:00:00.000Z",
    "permissions": [
      {
        "permissionId": "perm-001",
        "permissionName": "查看仪表盘",
        "permissionCode": "dashboard_view",
        "resourceType": "dashboard",
        "actionType": "view"
      }
    ],
    "users": [
      {
        "userId": "user-001",
        "username": "admin",
        "realName": "管理员",
        "email": "admin@example.com"
      }
    ]
  }
}
```

### 2.6 获取角色权限

**接口路径：** `GET /api/roles/:role_id/permissions`

**权限要求：** `role_view`

### 2.7 更新角色权限

**接口路径：** `PUT /api/roles/:role_id/permissions`

**权限要求：** `role_update`

**请求参数：**

```json
{
  "permissionIds": ["perm-001", "perm-002", "perm-003"]
}
```

### 2.8 获取权限列表

**接口路径：** `GET /api/permissions`

**权限要求：** `permission_view`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |
| resourceType | string | 否 | 资源类型筛选 |
| actionType | string | 否 | 操作类型筛选 |

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "perm-001",
        "permissionName": "查看仪表盘",
        "permissionCode": "dashboard_view",
        "resourceType": "dashboard",
        "actionType": "view",
        "description": "可以访问仪表盘",
        "createdAt": "2024-01-10T10:00:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "pageSize": 20
  }
}
```

### 2.9 获取权限树

**接口路径：** `GET /api/permissions/tree`

**权限要求：** `permission_view`

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "dashboard": [
      {
        "id": "perm-001",
        "name": "查看仪表盘",
        "code": "dashboard_view",
        "action": "view"
      }
    ],
    "robot": [
      {
        "id": "perm-002",
        "name": "查看机器人",
        "code": "robot_view",
        "action": "view"
      },
      {
        "id": "perm-003",
        "name": "配置机器人",
        "code": "robot_config",
        "action": "config"
      }
    ]
  }
}
```

---

## 3. 审计日志API

### 3.1 获取审计日志列表

**接口路径：** `GET /api/audit-logs`

**权限要求：** `audit_log_view`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |
| userId | string | 否 | 用户ID筛选 |
| operationType | string | 否 | 操作类型筛选 |
| resourceType | string | 否 | 资源类型筛选 |
| startDate | string | 否 | 开始日期（ISO格式） |
| endDate | string | 否 | 结束日期（ISO格式） |

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "log-001",
        "userId": "user-001",
        "userName": "admin",
        "operationType": "create",
        "resourceType": "user",
        "resourceId": "user-002",
        "description": "创建用户：newuser",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "requestData": {},
        "responseData": {},
        "status": "success",
        "errorMessage": null,
        "createdAt": "2024-01-10T10:00:00.000Z"
      }
    ],
    "total": 1000,
    "page": 1,
    "pageSize": 20
  }
}
```

### 3.2 获取日志详情

**接口路径：** `GET /api/audit-logs/:log_id`

**权限要求：** `audit_log_view`

### 3.3 获取日志统计

**接口路径：** `GET /api/audit-logs/statistics`

**权限要求：** `audit_log_view`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| startDate | string | 否 | 开始日期（ISO格式） |
| endDate | string | 否 | 结束日期（ISO格式） |

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "totalLogs": 1000,
    "successLogs": 950,
    "failedLogs": 50,
    "operationTypeStats": {
      "create": 200,
      "update": 300,
      "delete": 50,
      "login": 450
    },
    "resourceTypeStats": {
      "user": 150,
      "role": 50,
      "permission": 30,
      "robot": 200,
      "session": 300,
      "alert": 270
    },
    "topUsers": [
      {
        "userId": "user-001",
        "userName": "admin",
        "operationCount": 500
      }
    ]
  }
}
```

---

## 4. 告警配置API

### 4.1 获取告警时间间隔配置

**接口路径：** `GET /api/alerts/config/intervals`

**权限要求：** `config_view`

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "alert_interval_staff_no_reply": 30,
    "alert_interval_user_uncooperative": 60,
    "alert_interval_task_unfinished": 1440,
    "alert_interval_task_no_follow": 3
  }
}
```

### 4.2 更新告警时间间隔配置

**接口路径：** `PUT /api/alerts/config/intervals`

**权限要求：** `config_update`

**请求参数：**

```json
{
  "alert_interval_staff_no_reply": 30,
  "alert_interval_user_uncooperative": 60,
  "alert_interval_task_unfinished": 1440,
  "alert_interval_task_no_follow": 3
}
```

**返回参数：**

```json
{
  "code": 0,
  "message": "更新成功",
  "data": {
    "alert_interval_staff_no_reply": 30,
    "alert_interval_user_uncooperative": 60,
    "alert_interval_task_unfinished": 1440,
    "alert_interval_task_no_follow": 3
  }
}
```

### 4.3 获取告警等级配置

**接口路径：** `GET /api/alerts/config/levels`

**权限要求：** `config_view`

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "P0": {
      "threshold": 3,
      "escalationLevel": 3,
      "escalationInterval": 1800
    },
    "P1": {
      "threshold": 5,
      "escalationLevel": 2,
      "escalationInterval": 3600
    },
    "P2": {
      "threshold": 10,
      "escalationLevel": 1,
      "escalationInterval": 7200
    }
  }
}
```

### 4.4 更新告警等级配置

**接口路径：** `PUT /api/alerts/config/levels`

**权限要求：** `config_update`

**请求参数：**

```json
{
  "P0": {
    "threshold": 3,
    "escalationLevel": 3,
    "escalationInterval": 1800
  },
  "P1": {
    "threshold": 5,
    "escalationLevel": 2,
    "escalationInterval": 3600
  },
  "P2": {
    "threshold": 10,
    "escalationLevel": 1,
    "escalationInterval": 7200
  }
}
```

---

## 5. AI配置API

### 5.1 获取AI Prompt配置

**接口路径：** `GET /api/ai/config/prompts`

**权限要求：** `config_view`

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "ai_system_prompt": {
      "key": "ai_system_prompt",
      "currentVersion": 1,
      "content": "你是一个智能客服助手，负责企业微信社群的自动回复和协同分析。",
      "versions": [
        {
          "version": 1,
          "content": "你是一个智能客服助手，负责企业微信社群的自动回复和协同分析。",
          "isActive": true,
          "createdAt": "2024-01-10T10:00:00.000Z"
        }
      ]
    },
    "ai_intent_prompt": {
      "key": "ai_intent_prompt",
      "currentVersion": 1,
      "content": "请分析以下消息的意图，返回意图类型：",
      "versions": [
        {
          "version": 1,
          "content": "请分析以下消息的意图，返回意图类型：",
          "isActive": true,
          "createdAt": "2024-01-10T10:00:00.000Z"
        }
      ]
    },
    "ai_sentiment_prompt": {
      "key": "ai_sentiment_prompt",
      "currentVersion": 1,
      "content": "请分析以下消息的情感极性（正面、负面、中性）：",
      "versions": [
        {
          "version": 1,
          "content": "请分析以下消息的情感极性（正面、负面、中性）：",
          "isActive": true,
          "createdAt": "2024-01-10T10:00:00.000Z"
        }
      ]
    },
    "ai_reply_prompt": {
      "key": "ai_reply_prompt",
      "currentVersion": 1,
      "content": "请根据上下文生成合适的回复：",
      "versions": [
        {
          "version": 1,
          "content": "请根据上下文生成合适的回复：",
          "isActive": true,
          "createdAt": "2024-01-10T10:00:00.000Z"
        }
      ]
    },
    "ai_alert_prompt": {
      "key": "ai_alert_prompt",
      "currentVersion": 1,
      "content": "请判断是否需要告警：",
      "versions": [
        {
          "version": 1,
          "content": "请判断是否需要告警：",
          "isActive": true,
          "createdAt": "2024-01-10T10:00:00.000Z"
        }
      ]
    },
    "ai_intervention_prompt": {
      "key": "ai_intervention_prompt",
      "currentVersion": 1,
      "content": "请判断是否需要人工介入：",
      "versions": [
        {
          "version": 1,
          "content": "请判断是否需要人工介入：",
          "isActive": true,
          "createdAt": "2024-01-10T10:00:00.000Z"
        }
      ]
    }
  }
}
```

### 5.2 更新AI Prompt配置

**接口路径：** `PUT /api/ai/config/prompts`

**权限要求：** `config_update`

**请求参数：**

```json
{
  "ai_system_prompt": "你是一个智能客服助手，负责企业微信社群的自动回复和协同分析。【更新】",
  "ai_intent_prompt": "请分析以下消息的意图，返回意图类型：【更新】",
  "ai_sentiment_prompt": "请分析以下消息的情感极性（正面、负面、中性）：【更新】",
  "ai_reply_prompt": "请根据上下文生成合适的回复：【更新】",
  "ai_alert_prompt": "请判断是否需要告警：【更新】",
  "ai_intervention_prompt": "请判断是否需要人工介入：【更新】"
}
```

### 5.3 创建Prompt版本

**接口路径：** `POST /api/ai/config/prompts/:prompt_key/version`

**权限要求：** `config_update`

**请求参数：**

```json
{
  "promptContent": "新的Prompt内容"
}
```

### 5.4 获取Prompt版本列表

**接口路径：** `GET /api/ai/config/prompts/:prompt_key/versions`

**权限要求：** `config_view`

### 5.5 激活Prompt版本

**接口路径：** `PUT /api/ai/config/prompts/:prompt_key/activate`

**权限要求：** `config_update`

**请求参数：**

```json
{
  "version": 2
}
```

---

## 6. 工作人员监控API

### 6.1 获取工作人员活动列表

**接口路径：** `GET /api/staff/activity`

**权限要求：** `dashboard_view`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |
| staffId | string | 否 | 工作人员ID筛选 |
| activityType | string | 否 | 活动类型筛选 |
| startDate | string | 否 | 开始日期（ISO格式） |
| endDate | string | 否 | 结束日期（ISO格式） |

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "activity-001",
        "staffId": "staff-001",
        "staffName": "售后人工A",
        "activityType": "login",
        "activityData": {
          "loginTime": "2024-01-10T09:00:00.000Z",
          "ipAddress": "192.168.1.100"
        },
        "createdAt": "2024-01-10T09:00:00.000Z"
      }
    ],
    "total": 500,
    "page": 1,
    "pageSize": 20
  }
}
```

### 6.2 获取工作人员统计

**接口路径：** `GET /api/staff/statistics`

**权限要求：** `dashboard_view`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| startDate | string | 否 | 开始日期（ISO格式） |
| endDate | string | 否 | 结束日期（ISO格式） |

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "totalStaff": 10,
    "activeStaff": 8,
    "staffStats": [
      {
        "staffId": "staff-001",
        "staffName": "售后人工A",
        "activityCount": 100,
        "averageResponseTime": 120,
        "totalWorkTime": 480,
        "taskCount": 50,
        "taskCompletionRate": 95
      }
    ]
  }
}
```

### 6.3 获取工作人员详情

**接口路径：** `GET /api/staff/:staff_id`

**权限要求：** `dashboard_view`

---

## 7. 用户满意度API

### 7.1 获取用户满意度列表

**接口路径：** `GET /api/users/satisfaction`

**权限要求：** `dashboard_view`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |
| userId | string | 否 | 用户ID筛选 |
| groupId | string | 否 | 群组ID筛选 |
| sentiment | string | 否 | 情感筛选（positive、negative、neutral） |
| startDate | string | 否 | 开始日期（ISO格式） |
| endDate | string | 否 | 结束日期（ISO格式） |

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "satisfaction-001",
        "userId": "user-001",
        "userName": "用户A",
        "groupId": "group-001",
        "groupName": "测试群组",
        "sentiment": "positive",
        "sentimentIntensity": "high",
        "score": 1,
        "createdAt": "2024-01-10T10:00:00.000Z"
      }
    ],
    "total": 500,
    "page": 1,
    "pageSize": 20
  }
}
```

### 7.2 获取用户满意度统计

**接口路径：** `GET /api/users/satisfaction/statistics`

**权限要求：** `dashboard_view`

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "totalUsers": 1000,
    "satisfactionDistribution": {
      "excellent": 600,
      "good": 300,
      "average": 80,
      "poor": 15,
      "veryPoor": 5
    },
    "averageScore": 75,
    "sentimentDistribution": {
      "positive": 600,
      "neutral": 300,
      "negative": 100
    },
    "satisfactionTrend": [
      {
        "date": "2024-01-01",
        "averageScore": 70
      },
      {
        "date": "2024-01-02",
        "averageScore": 72
      }
    ]
  }
}
```

### 7.3 获取用户满意度详情

**接口路径：** `GET /api/users/:user_id/satisfaction`

**权限要求：** `dashboard_view`

---

## 8. 腾讯文档API

### 8.1 获取腾讯文档同步日志

**接口路径：** `GET /api/tencent-doc/sync-logs`

**权限要求：** `config_view`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |
| syncType | string | 否 | 同步类型筛选（realtime、incremental、scheduled） |
| syncStatus | string | 否 | 同步状态筛选（success、failed） |
| dataType | string | 否 | 数据类型筛选（after_sales_task、etc.） |

**返回参数：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "sync-log-001",
        "syncType": "realtime",
        "dataType": "after_sales_task",
        "dataId": "task-001",
        "syncStatus": "success",
        "syncData": {
          "taskId": "task-001",
          "status": "completed"
        },
        "errorMessage": null,
        "syncedAt": "2024-01-10T10:00:00.000Z"
      }
    ],
    "total": 500,
    "page": 1,
    "pageSize": 20
  }
}
```

### 8.2 手动触发同步

**接口路径：** `POST /api/tencent-doc/sync`

**权限要求：** `config_update`

**请求参数：**

```json
{
  "syncType": "incremental",
  "dataType": "after_sales_task"
}
```

**返回参数：**

```json
{
  "code": 0,
  "message": "同步任务已创建",
  "data": {
    "taskId": "sync-task-001",
    "status": "pending"
  }
}
```

---

**文档版本**：v1.0

**最后更新**：2024-01-10

**文档作者**：WorkTool AI 团队
