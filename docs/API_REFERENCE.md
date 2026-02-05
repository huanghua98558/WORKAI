# WorkTool AI 2.1 信息中心 API 接口文档

## 📚 目录

- [概述](#概述)
- [通用说明](#通用说明)
- [消息管理 API](#消息管理-api)
- [会话管理 API](#会话管理-api)
- [工作人员管理 API](#工作人员管理-api)
- [统计分析 API](#统计分析-api)
- [错误码说明](#错误码说明)

---

## 概述

信息中心是 WorkTool AI 2.1 的独立后端数据服务，负责：
- 收集机器人上报的消息
- 进行发送者识别与会话管理
- 介入判断与协同决策
- AI集成与满意度推断
- 提供数据查询API供前端使用

**Base URL**: `http://localhost:5000/api`

---

## 通用说明

### 请求头

```http
Content-Type: application/json
Authorization: Bearer {token}  // 如需要
```

### 统一响应格式

#### 成功响应

```json
{
  "success": true,
  "data": { ... }
}
```

或带分页信息：

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### HTTP状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 消息管理 API

### 1. 创建消息

机器人上报消息到信息中心。

**接口**: `POST /api/messages`

**请求参数**:

```typescript
{
  robotId: string;              // 机器人ID
  sessionId: string;            // 会话ID
  senderId: string;             // 发送者ID
  senderName: string;           // 发送者名称
  senderAvatar?: string;        // 发送者头像URL
  content: string;              // 消息内容
  messageType: 'text' | 'image' | 'video' | 'file' | 'audio';  // 消息类型
  metadata?: Record<string, any>;  // 额外元数据
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "msg-123456",
    "robotId": "robot-001",
    "sessionId": "session-001",
    "senderId": "user-001",
    "senderName": "张三",
    "senderAvatar": "https://example.com/avatar.jpg",
    "content": "你好，我想咨询产品价格",
    "messageType": "text",
    "aiResponse": null,
    "aiResponseTime": null,
    "confidence": null,
    "humanIntervened": false,
    "mentions": [],
    "metadata": {},
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**特性**:
- ✅ 自动关联会话
- ✅ 智能提取@提及用户
- ✅ 集成发送者识别服务

---

### 2. 获取消息列表

查询消息，支持分页和多条件筛选。

**接口**: `GET /api/messages`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认50 |
| robotId | string | 否 | 机器人ID筛选 |
| sessionId | string | 否 | 会话ID筛选 |
| senderId | string | 否 | 发送者ID筛选 |
| messageType | string | 否 | 消息类型筛选 |
| startDate | string | 否 | 开始时间（ISO格式） |
| endDate | string | 否 | 结束时间（ISO格式） |
| sortBy | string | 否 | 排序字段，默认createdAt |
| sortOrder | 'asc' \| 'desc' | 否 | 排序方向，默认desc |

**请求示例**:

```http
GET /api/messages?page=1&pageSize=50&robotId=robot-001&startDate=2024-01-01&endDate=2024-01-31
```

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "msg-123456",
      "robotId": "robot-001",
      "sessionId": "session-001",
      "senderId": "user-001",
      "senderName": "张三",
      "content": "你好，我想咨询产品价格",
      "messageType": "text",
      "aiResponse": "您好！关于产品价格...",
      "aiResponseTime": "2024-01-15T10:30:02.000Z",
      "confidence": 0.95,
      "humanIntervened": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

### 3. 获取单条消息

根据ID获取消息详情。

**接口**: `GET /api/messages/{id}`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 消息ID |

**请求示例**:

```http
GET /api/messages/msg-123456
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "msg-123456",
    "robotId": "robot-001",
    "sessionId": "session-001",
    "senderId": "user-001",
    "senderName": "张三",
    "content": "你好，我想咨询产品价格",
    "messageType": "text",
    "aiResponse": "您好！关于产品价格...",
    "aiResponseTime": "2024-01-15T10:30:02.000Z",
    "confidence": 0.95,
    "humanIntervened": false,
    "satisfactionScore": null,
    "mentions": [],
    "metadata": {},
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:02.000Z"
  }
}
```

---

### 4. 更新消息

更新消息状态、AI回复等信息。

**接口**: `PUT /api/messages/{id}`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 消息ID |

**请求参数**:

```typescript
{
  aiResponse?: string;          // AI回复内容
  aiResponseTime?: Date;        // AI回复时间
  confidence?: number;          // 置信度
  humanIntervened?: boolean;    // 是否人工介入
  satisfactionScore?: number;   // 满意度评分 (1-5)
  metadata?: Record<string, any>;  // 更新元数据
}
```

**请求示例**:

```http
PUT /api/messages/msg-123456
Content-Type: application/json

{
  "aiResponse": "您好！关于产品价格，我们的产品定价...",
  "aiResponseTime": "2024-01-15T10:30:02.000Z",
  "confidence": 0.95
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "msg-123456",
    "aiResponse": "您好！关于产品价格，我们的产品定价...",
    "aiResponseTime": "2024-01-15T10:30:02.000Z",
    "confidence": 0.95,
    "updatedAt": "2024-01-15T10:30:05.000Z"
  }
}
```

---

### 5. 删除消息

软删除消息（不会真正删除数据）。

**接口**: `DELETE /api/messages/{id}`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 消息ID |

**请求示例**:

```http
DELETE /api/messages/msg-123456
```

**响应示例**:

```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

---

### 6. 消息流（SSE）

通过Server-Sent Events实时接收新消息。

**接口**: `GET /api/messages/stream`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| robotId | string | 否 | 机器人ID筛选 |
| sessionId | string | 否 | 会话ID筛选 |
| lastEventId | string | 否 | 最后事件ID（断线重连时使用） |

**请求示例**:

```http
GET /api/messages/stream?robotId=robot-001
Accept: text/event-stream
```

**SSE事件格式**:

```
event: message
id: msg-123456
data: {"id":"msg-123456","content":"你好","senderName":"张三",...}

event: heartbeat
id: heartbeat-123
data: {"type":"heartbeat","timestamp":"2024-01-15T10:30:00.000Z"}
```

**特性**:
- ✅ 实时推送新消息
- ✅ 支持断线重连
- ✅ 心跳机制保持连接

---

## 会话管理 API

### 1. 获取会话列表

查询会话，支持分页和多条件筛选。

**接口**: `GET /api/sessions`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认50 |
| robotId | string | 否 | 机器人ID筛选 |
| status | string | 否 | 会话状态筛选 (active, closed, archived) |
| userId | string | 否 | 用户ID筛选 |
| startDate | string | 否 | 开始时间（ISO格式） |
| endDate | string | 否 | 结束时间（ISO格式） |
| tag | string | 否 | 标签筛选 |

**请求示例**:

```http
GET /api/sessions?page=1&pageSize=50&robotId=robot-001&status=active
```

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "session-001",
      "robotId": "robot-001",
      "userId": "user-001",
      "userName": "张三",
      "userAvatar": "https://example.com/avatar.jpg",
      "status": "active",
      "tags": ["咨询", "价格"],
      "messageCount": 15,
      "lastMessage": {
        "id": "msg-123456",
        "content": "好的，谢谢你的回答",
        "senderName": "张三",
        "createdAt": "2024-01-15T10:30:00.000Z"
      },
      "lastActivityAt": "2024-01-15T10:30:00.000Z",
      "metadata": {},
      "createdAt": "2024-01-15T09:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 20,
    "totalPages": 1
  }
}
```

---

### 2. 获取单个会话

根据ID获取会话详情。

**接口**: `GET /api/sessions/{id}`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 会话ID |

**请求示例**:

```http
GET /api/sessions/session-001
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "session-001",
    "robotId": "robot-001",
    "userId": "user-001",
    "userName": "张三",
    "status": "active",
    "tags": ["咨询", "价格"],
    "messageCount": 15,
    "lastMessage": { ... },
    "lastActivityAt": "2024-01-15T10:30:00.000Z",
    "metadata": {},
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 3. 获取活跃会话

查询当前活跃中的会话。

**接口**: `GET /api/sessions/active`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| robotId | string | 否 | 机器人ID筛选 |
| limit | number | 否 | 返回数量限制，默认100 |

**请求示例**:

```http
GET /api/sessions/active?robotId=robot-001&limit=20
```

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "session-001",
      "robotId": "robot-001",
      "userId": "user-001",
      "userName": "张三",
      "status": "active",
      "messageCount": 15,
      "lastActivityAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "count": 5
  }
}
```

---

### 4. 更新会话

更新会话状态、标签等信息。

**接口**: `PUT /api/sessions/{id}`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 会话ID |

**请求参数**:

```typescript
{
  status?: 'active' | 'closed' | 'archived';  // 会话状态
  tags?: string[];                            // 更新标签
  metadata?: Record<string, any>;             // 更新元数据
}
```

**请求示例**:

```http
PUT /api/sessions/session-001
Content-Type: application/json

{
  "status": "closed",
  "tags": ["咨询", "价格", "已解决"]
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "session-001",
    "status": "closed",
    "tags": ["咨询", "价格", "已解决"],
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 5. 会话流（SSE）

通过Server-Sent Events实时接收会话更新。

**接口**: `GET /api/sessions/stream`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| robotId | string | 否 | 机器人ID筛选 |
| lastEventId | string | 否 | 最后事件ID（断线重连时使用） |

**请求示例**:

```http
GET /api/sessions/stream?robotId=robot-001
Accept: text/event-stream
```

**SSE事件格式**:

```
event: session
id: session-001
data: {"id":"session-001","status":"active","messageCount":16,...}

event: heartbeat
id: heartbeat-456
data: {"type":"heartbeat","timestamp":"2024-01-15T10:31:00.000Z"}
```

---

## 工作人员管理 API

### 1. 获取工作人员列表

查询工作人员，支持分页和多条件筛选。

**接口**: `GET /api/staff`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认50 |
| platform | string | 否 | 平台筛选 |
| search | string | 否 | 模糊搜索（名称） |
| status | string | 否 | 状态筛选 (active, inactive) |

**请求示例**:

```http
GET /api/staff?page=1&pageSize=50&platform=wechat&status=active
```

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "staff-001",
      "platform": "wechat",
      "platformUserId": "wx_123456",
      "name": "李四",
      "status": "active",
      "roles": ["staff", "supervisor"],
      "tags": ["售前", "VIP"],
      "metadata": {
        "department": "客服部",
        "level": "高级客服"
      },
      "createdAt": "2024-01-01T09:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 10,
    "totalPages": 1
  }
}
```

---

### 2. 创建工作人员

注册新工作人员到系统。

**接口**: `POST /api/staff`

**请求参数**:

```typescript
{
  id?: string;                      // 工作人员ID（可选，系统自动生成）
  platform: string;                 // 平台标识
  platformUserId: string;           // 平台用户ID
  name: string;                     // 工作人员名称
  status?: 'active' | 'inactive';   // 状态，默认active
  roles?: string[];                 // 角色列表，默认['staff']
  tags?: string[];                  // 标签列表
  metadata?: Record<string, any>;   // 额外元数据
}
```

**请求示例**:

```http
POST /api/staff
Content-Type: application/json

{
  "platform": "wechat",
  "platformUserId": "wx_789012",
  "name": "王五",
  "status": "active",
  "roles": ["staff"],
  "tags": ["售后"]
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "staff-002",
    "platform": "wechat",
    "platformUserId": "wx_789012",
    "name": "王五",
    "status": "active",
    "roles": ["staff"],
    "tags": ["售后"],
    "metadata": {},
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

## 统计分析 API

### 1. 获取统计数据

获取综合统计数据和趋势分析。

**接口**: `GET /api/stats`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 否 | 开始时间（ISO格式） |
| endDate | string | 否 | 结束时间（ISO格式） |
| robotId | string | 否 | 机器人ID筛选 |

**请求示例**:

```http
GET /api/stats?startDate=2024-01-01&endDate=2024-01-31&robotId=robot-001
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "messages": {
      "total": 1500
    },
    "sessions": {
      "total": 300
    },
    "aiResponses": {
      "total": 1200,
      "avgResponseTime": 2.5
    },
    "humanIntervention": {
      "total": 150,
      "rate": 10.0
    },
    "satisfaction": {
      "avgScore": 4.2,
      "highSatisfaction": 800,
      "lowSatisfaction": 50
    },
    "dailyTrends": [
      {
        "date": "2024-01-15T00:00:00.000Z",
        "count": 50
      },
      {
        "date": "2024-01-16T00:00:00.000Z",
        "count": 55
      }
    ]
  }
}
```

**统计指标说明**:

- **messages.total**: 消息总数
- **sessions.total**: 会话总数
- **aiResponses.total**: AI回复总数
- **aiResponses.avgResponseTime**: AI平均响应时间（秒）
- **humanIntervention.total**: 人工介入总数
- **humanIntervention.rate**: 人工介入率（百分比）
- **satisfaction.avgScore**: 平均满意度评分（1-5分）
- **satisfaction.highSatisfaction**: 高满意度消息数（评分≥4）
- **satisfaction.lowSatisfaction**: 低满意度消息数（评分≤2）
- **dailyTrends**: 每日消息趋势图（最近30天）

---

## 错误码说明

### HTTP状态码

| 状态码 | 说明 | 示例场景 |
|-------|------|----------|
| 200 | 请求成功 | 成功获取数据 |
| 201 | 创建成功 | 成功创建资源 |
| 400 | 请求参数错误 | 缺少必填参数 |
| 401 | 未授权 | Token无效或过期 |
| 404 | 资源不存在 | 消息ID不存在 |
| 500 | 服务器内部错误 | 数据库连接失败 |

### 错误响应示例

```json
{
  "success": false,
  "error": "Message not found"
}
```

```json
{
  "success": false,
  "error": "Missing required field: robotId"
}
```

---

## 附录

### 数据类型定义

#### Message（消息）

```typescript
interface Message {
  id: string;
  robotId: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'file' | 'audio';
  aiResponse?: string;
  aiResponseTime?: Date;
  confidence?: number;
  humanIntervened: boolean;
  satisfactionScore?: number;
  mentions: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Session（会话）

```typescript
interface Session {
  id: string;
  robotId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  status: 'active' | 'closed' | 'archived';
  tags: string[];
  messageCount: number;
  lastMessage?: {
    id: string;
    content: string;
    senderName: string;
    createdAt: Date;
  };
  lastActivityAt: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Staff（工作人员）

```typescript
interface Staff {
  id: string;
  platform: string;
  platformUserId: string;
  name: string;
  status: 'active' | 'inactive';
  roles: string[];
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 更新日志

### v1.0.0 (2024-01-15)

- ✅ 完成消息管理API（6个接口）
- ✅ 完成会话管理API（5个接口）
- ✅ 完成工作人员管理API（2个接口）
- ✅ 完成统计分析API（1个接口）
- ✅ 支持SSE实时推送
- ✅ 支持多条件筛选与分页

---

## 联系方式

如有问题或建议，请联系开发团队。

**文档版本**: v1.0.0
**最后更新**: 2024-01-15
