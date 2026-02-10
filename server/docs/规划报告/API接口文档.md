# WorkTool AI 中枢系统 - API接口文档

## 📋 目录

1. [API概述](#1-api概述)
2. [认证接口](#2-认证接口)
3. [用户管理接口](#3-用户管理接口)
4. [角色权限接口](#4-角色权限接口)
5. [会话管理接口](#5-会话管理接口)
6. [告警管理接口](#6-告警管理接口)
7. [售后任务接口](#7-售后任务接口)
8. [工作人员监控接口](#8-工作人员监控接口)
9. [用户满意度接口](#9-用户满意度接口)
10. [腾讯文档接口](#10-腾讯文档接口)

---

## 1. API概述

### 1.1 基本信息

```
Base URL: https://api.example.com
协议: HTTPS
认证方式: Bearer Token (JWT)
响应格式: JSON
字符编码: UTF-8
```

### 1.2 通用响应格式

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": "2024-01-10T10:00:00Z"
}
```

### 1.3 错误响应格式

```json
{
  "success": false,
  "code": 400,
  "message": "请求参数错误",
  "errors": [
    {
      "field": "username",
      "message": "用户名不能为空"
    }
  ],
  "timestamp": "2024-01-10T10:00:00Z"
}
```

### 1.4 HTTP状态码

```
200 OK - 请求成功
201 Created - 资源创建成功
400 Bad Request - 请求参数错误
401 Unauthorized - 未认证
403 Forbidden - 无权限
404 Not Found - 资源不存在
500 Internal Server Error - 服务器内部错误
```

---

## 2. 认证接口

### 2.1 用户登录

**接口地址：** `POST /api/auth/login`

**请求参数：**
```json
{
  "username": "string", // 用户名（必填）
  "password": "string"  // 密码（必填）
}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800,
    "user": {
      "id": "user-001",
      "username": "admin",
      "email": "admin@example.com",
      "realName": "管理员",
      "avatar": "https://example.com/avatar.png",
      "roles": ["admin"],
      "permissions": ["*"]
    }
  }
}
```

### 2.2 刷新令牌

**接口地址：** `POST /api/auth/refresh`

**请求参数：**
```json
{
  "refreshToken": "string" // 刷新令牌（必填）
}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "message": "令牌刷新成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800
  }
}
```

### 2.3 用户登出

**接口地址：** `POST /api/auth/logout`

**请求头：**
```
Authorization: Bearer {token}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "message": "登出成功"
}
```

---

## 3. 用户管理接口

### 3.1 获取用户列表

**接口地址：** `GET /api/users`

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**
```
page: number (可选，默认1)
pageSize: number (可选，默认20)
search: string (可选，搜索关键词)
role: string (可选，角色筛选)
status: string (可选，状态筛选：active/inactive)
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "list": [
      {
        "id": "user-001",
        "username": "admin",
        "email": "admin@example.com",
        "realName": "管理员",
        "avatar": "https://example.com/avatar.png",
        "roles": ["admin"],
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-10T00:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

### 3.2 创建用户

**接口地址：** `POST /api/users`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{
  "username": "string",    // 用户名（必填，唯一）
  "email": "string",       // 邮箱（必填，唯一）
  "password": "string",    // 密码（必填，至少8位）
  "realName": "string",    // 真实姓名（可选）
  "avatar": "string",      // 头像URL（可选）
  "roles": ["string"],     // 角色列表（可选）
  "status": "active"       // 状态（可选，默认active）
}
```

**返回参数：**
```json
{
  "success": true,
  "code": 201,
  "message": "用户创建成功",
  "data": {
    "id": "user-002",
    "username": "testuser",
    "email": "test@example.com",
    "realName": "测试用户",
    "roles": ["user"],
    "status": "active",
    "createdAt": "2024-01-10T10:00:00Z"
  }
}
```

### 3.3 更新用户

**接口地址：** `PUT /api/users/{id}`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{
  "email": "string",       // 邮箱（可选）
  "realName": "string",    // 真实姓名（可选）
  "avatar": "string",      // 头像URL（可选）
  "roles": ["string"],     // 角色列表（可选）
  "status": "active"       // 状态（可选）
}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "message": "用户更新成功",
  "data": {
    "id": "user-001",
    "username": "admin",
    "email": "admin@example.com",
    "realName": "管理员",
    "roles": ["admin"],
    "status": "active",
    "updatedAt": "2024-01-10T10:00:00Z"
  }
}
```

### 3.4 删除用户

**接口地址：** `DELETE /api/users/{id}`

**请求头：**
```
Authorization: Bearer {token}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "message": "用户删除成功"
}
```

### 3.5 重置用户密码

**接口地址：** `POST /api/users/{id}/reset-password`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{
  "newPassword": "string" // 新密码（必填，至少8位）
}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "message": "密码重置成功"
}
```

---

## 4. 角色权限接口

### 4.1 获取角色列表

**接口地址：** `GET /api/roles`

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**
```
page: number (可选，默认1)
pageSize: number (可选，默认20)
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "list": [
      {
        "id": "role-001",
        "name": "admin",
        "description": "管理员角色",
        "permissions": ["*"],
        "userCount": 5,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 10
  }
}
```

### 4.2 创建角色

**接口地址：** `POST /api/roles`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{
  "name": "string",          // 角色名称（必填，唯一）
  "description": "string",   // 角色描述（可选）
  "permissions": ["string"]  // 权限列表（可选）
}
```

**返回参数：**
```json
{
  "success": true,
  "code": 201,
  "message": "角色创建成功",
  "data": {
    "id": "role-002",
    "name": "staff",
    "description": "工作人员角色",
    "permissions": ["sessions:view", "alerts:view"],
    "createdAt": "2024-01-10T10:00:00Z"
  }
}
```

### 4.3 更新角色

**接口地址：** `PUT /api/roles/{id}`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{
  "name": "string",          // 角色名称（可选）
  "description": "string",   // 角色描述（可选）
  "permissions": ["string"]  // 权限列表（可选）
}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "message": "角色更新成功",
  "data": {
    "id": "role-001",
    "name": "admin",
    "description": "管理员角色",
    "permissions": ["*"],
    "updatedAt": "2024-01-10T10:00:00Z"
  }
}
```

### 4.4 删除角色

**接口地址：** `DELETE /api/roles/{id}`

**请求头：**
```
Authorization: Bearer {token}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "message": "角色删除成功"
}
```

### 4.5 获取权限列表

**接口地址：** `GET /api/permissions`

**请求头：**
```
Authorization: Bearer {token}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "modules": [
      {
        "name": "用户管理",
        "key": "users",
        "permissions": [
          {
            "name": "查看用户",
            "key": "users:view",
            "description": "查看用户列表和详情"
          },
          {
            "name": "创建用户",
            "key": "users:create",
            "description": "创建新用户"
          },
          {
            "name": "更新用户",
            "key": "users:update",
            "description": "更新用户信息"
          },
          {
            "name": "删除用户",
            "key": "users:delete",
            "description": "删除用户"
          }
        ]
      }
    ]
  }
}
```

---

## 5. 会话管理接口

### 5.1 获取会话列表

**接口地址：** `GET /api/sessions`

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**
```
page: number (可选，默认1)
pageSize: number (可选，默认20)
userId: string (可选，用户ID筛选)
groupId: string (可选，群组ID筛选)
status: string (可选，状态筛选)
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "list": [
      {
        "sessionId": "SES-001",
        "userId": "user-001",
        "userName": "张三",
        "groupId": "GRP-001",
        "groupName": "客户服务群",
        "lastActiveTime": "2024-01-10T10:00:00Z",
        "messageCount": 45,
        "botReplyCount": 20,
        "humanReplyCount": 10,
        "createdAt": "2024-01-09T10:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

### 5.2 获取会话详情

**接口地址：** `GET /api/sessions/{sessionId}`

**请求头：**
```
Authorization: Bearer {token}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "sessionId": "SES-001",
    "userId": "user-001",
    "userName": "张三",
    "groupId": "GRP-001",
    "groupName": "客户服务群",
    "lastActiveTime": "2024-01-10T10:00:00Z",
    "messageCount": 45,
    "botReplyCount": 20,
    "humanReplyCount": 10,
    "createdAt": "2024-01-09T10:00:00Z",
    "satisfactionScore": 85,
    "complaintCount": 1,
    "taskCount": 2
  }
}
```

### 5.3 获取会话消息

**接口地址：** `GET /api/sessions/{sessionId}/messages`

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**
```
page: number (可选，默认1)
pageSize: number (可选，默认20)
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "list": [
      {
        "id": "msg-001",
        "sessionId": "SES-001",
        "userId": "user-001",
        "userName": "张三",
        "content": "产品坏了，怎么退货？",
        "messageType": "text",
        "isFromUser": true,
        "isFromBot": false,
        "isHuman": false,
        "sentiment": "negative",
        "sentimentIntensity": "medium",
        "timestamp": "2024-01-10T10:00:00Z"
      },
      {
        "id": "msg-002",
        "sessionId": "SES-001",
        "userId": "bot-001",
        "userName": "客服机器人",
        "content": "您好，可以为您处理退货...",
        "messageType": "text",
        "isFromUser": false,
        "isFromBot": true,
        "isHuman": false,
        "sentiment": "neutral",
        "sentimentIntensity": "low",
        "timestamp": "2024-01-10T10:03:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 45
  }
}
```

---

## 6. 告警管理接口

### 6.1 获取告警列表

**接口地址：** `GET /api/alerts`

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**
```
page: number (可选，默认1)
pageSize: number (可选，默认20)
status: string (可选，状态筛选)
alertLevel: string (可选，级别筛选)
alertType: string (可选，类型筛选)
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "list": [
      {
        "alertId": "ALT-001",
        "alertType": "user_complaint",
        "alertLevel": "P0",
        "sessionId": "SES-001",
        "userId": "user-001",
        "userName": "张三",
        "groupId": "GRP-001",
        "groupName": "客户服务群",
        "messageContent": "你们的产品太差了，我要投诉！",
        "reason": "用户严重投诉",
        "status": "created",
        "createdAt": "2024-01-10T10:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

### 6.2 确认告警

**接口地址：** `POST /api/alerts/{alertId}/acknowledge`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "message": "告警确认成功",
  "data": {
    "alertId": "ALT-001",
    "status": "acknowledged",
    "acknowledgedBy": "user-002",
    "acknowledgedAt": "2024-01-10T10:05:00Z"
  }
}
```

### 6.3 解决告警

**接口地址：** `POST /api/alerts/{alertId}/resolve`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{
  "resolveNotes": "string" // 解决说明（可选）
}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "message": "告警解决成功",
  "data": {
    "alertId": "ALT-001",
    "status": "resolved",
    "resolvedBy": "user-002",
    "resolvedAt": "2024-01-10T10:10:00Z",
    "resolveNotes": "已安抚用户情绪"
  }
}
```

---

## 7. 售后任务接口

### 7.1 获取任务列表

**接口地址：** `GET /api/tasks`

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**
```
page: number (可选，默认1)
pageSize: number (可选，默认20)
status: string (可选，状态筛选)
taskType: string (可选，类型筛选)
priority: string (可选，优先级筛选)
assignedTo: string (可选，分配人筛选)
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "list": [
      {
        "taskId": "TSK-001",
        "taskType": "refund",
        "sessionId": "SES-001",
        "userId": "user-001",
        "userName": "张三",
        "groupId": "GRP-001",
        "groupName": "客户服务群",
        "description": "用户申请退款，金额100元",
        "priority": "P1",
        "status": "pending",
        "assignedTo": null,
        "assignedAt": null,
        "createdAt": "2024-01-10T10:00:00Z",
        "tencentDocsId": "DOC-001",
        "tencentDocsRowNumber": 10
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 45
  }
}
```

### 7.2 创建任务

**接口地址：** `POST /api/tasks`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{
  "taskType": "string",      // 任务类型（必填）
  "sessionId": "string",     // 会话ID（必填）
  "userId": "string",        // 用户ID（必填）
  "userName": "string",      // 用户名（必填）
  "groupId": "string",       // 群组ID（必填）
  "groupName": "string",     // 群组名（必填）
  "description": "string",   // 描述（必填）
  "details": {},             // 详情（可选）
  "priority": "P2",          // 优先级（可选，默认P2）
  "syncToTencentDocs": true  // 同步到腾讯文档（可选，默认true）
}
```

### 7.3 分配任务

**接口地址：** `POST /api/tasks/{taskId}/assign`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{
  "assignedTo": "string" // 分配给（必填）
}
```

### 7.4 完成任务

**接口地址：** `POST /api/tasks/{taskId}/complete`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{
  "completionNotes": "string" // 完成说明（可选）
}
```

---

## 8. 工作人员监控接口

### 8.1 获取工作人员活动列表

**接口地址：** `GET /api/staff/activities`

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**
```
page: number (可选，默认1)
pageSize: number (可选，默认20)
staffId: string (可选，工作人员ID筛选)
activityType: string (可选，活动类型筛选)
startTime: string (可选，开始时间)
endTime: string (可选，结束时间)
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "list": [
      {
        "id": "activity-001",
        "staffId": "staff-001",
        "staffName": "售后人工A",
        "activityType": "acknowledge_alert",
        "activityData": {
          "alertId": "ALT-001"
        },
        "activityTime": "2024-01-10T10:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

### 8.2 获取工作人员活动统计

**接口地址：** `GET /api/staff/activities/statistics`

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**
```
staffId: string (可选，工作人员ID筛选)
startTime: string (可选，开始时间)
endTime: string (可选，结束时间)
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "activityCount": [
      {
        "staffId": "staff-001",
        "staffName": "售后人工A",
        "activityType": "acknowledge_alert",
        "count": 10
      }
    ],
    "responseTime": [
      {
        "staffId": "staff-001",
        "staffName": "售后人工A",
        "avgResponseTime": 120,
        "minResponseTime": 60,
        "maxResponseTime": 300
      }
    ]
  }
}
```

### 8.3 获取工作人员工作负载

**接口地址：** `GET /api/staff/workload`

**请求头：**
```
Authorization: Bearer {token}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "currentTasks": [
      {
        "staffId": "staff-001",
        "currentTaskCount": 3
      }
    ],
    "todayTasks": [
      {
        "staffId": "staff-001",
        "todayTaskCount": 5
      }
    ],
    "weekTasks": [
      {
        "staffId": "staff-001",
        "weekTaskCount": 20
      }
    ]
  }
}
```

### 8.4 获取工作人员质量评分

**接口地址：** `GET /api/staff/quality-score`

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**
```
staffId: string (可选，工作人员ID筛选)
startTime: string (可选，开始时间)
endTime: string (可选，结束时间)
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "staffId": "staff-001",
    "responseTimeScore": 85,
    "processingQualityScore": 90,
    "collaborationQualityScore": 80,
    "overallScore": 86
  }
}
```

---

## 9. 用户满意度接口

### 9.1 获取用户满意度列表

**接口地址：** `GET /api/users/satisfaction`

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**
```
page: number (可选，默认1)
pageSize: number (可选，默认20)
userId: string (可选，用户ID筛选)
userName: string (可选，用户名筛选)
minScore: number (可选，最小满意度)
maxScore: number (可选，最大满意度)
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "list": [
      {
        "userId": "user-001",
        "username": "zhangsan",
        "realName": "张三",
        "satisfactionScore": 85,
        "positiveCount": 20,
        "neutralCount": 10,
        "negativeCount": 5,
        "totalMessageCount": 35,
        "complaintCount": 1,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-10T00:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

### 9.2 获取用户满意度统计

**接口地址：** `GET /api/users/satisfaction/statistics`

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**
```
startTime: string (可选，开始时间)
endTime: string (可选，结束时间)
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "overall": {
      "avgScore": 75,
      "minScore": 40,
      "maxScore": 100,
      "totalUsers": 100
    },
    "sentimentDistribution": [
      {
        "sentiment": "positive",
        "count": 50,
        "percentage": 50
      },
      {
        "sentiment": "neutral",
        "count": 30,
        "percentage": 30
      },
      {
        "sentiment": "negative",
        "count": 20,
        "percentage": 20
      }
    ],
    "scoreDistribution": [
      {
        "scoreLevel": "优秀",
        "userCount": 30
      },
      {
        "scoreLevel": "良好",
        "userCount": 25
      },
      {
        "scoreLevel": "一般",
        "userCount": 25
      },
      {
        "scoreLevel": "差",
        "userCount": 20
      }
    ]
  }
}
```

---

## 10. 腾讯文档接口

### 10.1 获取同步日志

**接口地址：** `GET /api/tencent-docs/sync-logs`

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**
```
page: number (可选，默认1)
pageSize: number (可选，默认20)
taskId: string (可选，任务ID筛选)
status: string (可选，状态筛选：insert/update/failed)
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "list": [
      {
        "id": "sync-log-001",
        "taskId": "TSK-001",
        "documentId": "DOC-001",
        "rowNumber": 10,
        "status": "insert",
        "error": null,
        "syncedAt": "2024-01-10T10:00:00Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

### 10.2 手动触发同步

**接口地址：** `POST /api/tencent-docs/sync/{taskId}`

**请求头：**
```
Authorization: Bearer {token}
```

**返回参数：**
```json
{
  "success": true,
  "code": 200,
  "message": "同步任务已创建",
  "data": {
    "taskId": "TSK-001",
    "syncId": "sync-001"
  }
}
```

---

**文档版本**：v1.0

**最后更新**：2024-01-10

**文档作者**：WorkTool AI 团队
