# API 接口设计

> **文档版本**: v1.0
> **创建日期**: 2024-01-01
> **维护者**: WorkTool AI 团队

---

## 📋 目录

- [一、接口概述](#一接口概述)
- [二、流程管理 API](#二流程管理-api)
- [三、流程实例 API](#三流程实例-api)
- [四、跟踪任务 API](#四跟踪任务-api)
- [五、指令队列 API](#五指令队列-api)
- [六、接口规范](#六接口规范)

---

## 一、接口概述

### 1.1 接口规范

**Base URL**: `/api/flow`

**认证方式**: 
- 使用 API Key 认证
- Header: `Authorization: Bearer <api_key>`

**请求格式**:
- Content-Type: `application/json`
- 字符编码: UTF-8

**响应格式**:
- Content-Type: `application/json`
- 统一响应结构（见下方）

### 1.2 统一响应结构

```typescript
// 成功响应
{
  success: true,
  code: 200,
  message: "操作成功",
  data: {
    // 响应数据
  }
}

// 错误响应
{
  success: false,
  code: 400 | 401 | 404 | 500,
  message: "错误描述",
  error: {
    code: "ERROR_CODE",
    details: "详细错误信息"
  }
}
```

### 1.3 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 认证失败 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 二、流程管理 API

### 2.1 创建流程定义

**接口**: `POST /api/flow/definitions`

**请求参数**:
```typescript
{
  name: string;              // 流程名称（必填）
  description?: string;      // 流程描述（可选）
  flow_type?: string;        // 流程类型，默认 "message_routing"
  nodes: Node[];             // 节点定义（必填）
  connections: Connection[]; // 连接关系（必填）
  version?: string;          // 版本号，默认 "1.0"
  status?: string;           // 状态：draft/active/inactive，默认 "draft"
}
```

**节点定义类型**:
```typescript
interface Node {
  id: string;               // 节点 ID（UUID）
  type: string;             // 节点类型
  name: string;             // 节点名称
  description?: string;     // 节点描述
  config: {                 // 节点配置
    [key: string]: any;
  };
  position: {               // 节点位置（用于可视化）
    x: number;
    y: number;
  };
}
```

**连接关系类型**:
```typescript
interface Connection {
  id: string;               // 连接 ID
  sourceId: string;         // 源节点 ID
  targetId: string;         // 目标节点 ID
  condition?: {             // 条件判断
    type: string;
    expression: string;
  };
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "流程创建成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "统一消息处理流程",
    "description": "根据发送者角色路由到不同处理分支",
    "flow_type": "message_routing",
    "version": "1.0",
    "status": "draft",
    "nodes": [...],
    "connections": [...],
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  }
}
```

**curl 示例**:
```bash
curl -X POST http://localhost:5000/api/flow/definitions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "name": "统一消息处理流程",
    "description": "根据发送者角色路由到不同处理分支",
    "flow_type": "message_routing",
    "nodes": [
      {
        "id": "node-1",
        "type": "trigger",
        "name": "消息接收与保存",
        "config": {},
        "position": {"x": 100, "y": 100}
      }
    ],
    "connections": []
  }'
```

---

### 2.2 更新流程定义

**接口**: `PUT /api/flow/definitions/:id`

**请求参数**:
```typescript
{
  name?: string;              // 流程名称
  description?: string;      // 流程描述
  nodes?: Node[];             // 节点定义
  connections?: Connection[]; // 连接关系
  version?: string;           // 版本号（修改后会自动增加）
  status?: string;           // 状态
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "流程更新成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "统一消息处理流程",
    "version": "1.1",
    "updated_at": "2024-01-01T11:00:00Z"
  }
}
```

---

### 2.3 删除流程定义

**接口**: `DELETE /api/flow/definitions/:id`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "流程删除成功",
  "data": null
}
```

---

### 2.4 查询流程列表

**接口**: `GET /api/flow/definitions`

**查询参数**:
```typescript
{
  status?: string;    // 状态筛选
  flow_type?: string; // 流程类型筛选
  page?: number;      // 页码，默认 1
  page_size?: number; // 每页数量，默认 20
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "total": 2,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "统一消息处理流程",
        "description": "根据发送者角色路由到不同处理分支",
        "flow_type": "message_routing",
        "version": "2.0",
        "status": "active",
        "created_at": "2024-01-01T10:00:00Z",
        "updated_at": "2024-01-01T10:00:00Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "售后处理流程",
        "description": "处理售后 @ 消息",
        "flow_type": "after_sales",
        "version": "1.0",
        "status": "draft",
        "created_at": "2024-01-01T09:00:00Z",
        "updated_at": "2024-01-01T09:00:00Z"
      }
    ]
  }
}
```

---

### 2.5 查询流程详情

**接口**: `GET /api/flow/definitions/:id`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "统一消息处理流程",
    "description": "根据发送者角色路由到不同处理分支",
    "flow_type": "message_routing",
    "version": "2.0",
    "status": "active",
    "nodes": [...],
    "connections": [...],
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  }
}
```

---

### 2.6 激活流程

**接口**: `POST /api/flow/definitions/:id/activate`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "流程激活成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

---

### 2.7 停用流程

**接口**: `POST /api/flow/definitions/:id/deactivate`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "流程停用成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "inactive",
    "updated_at": "2024-01-01T13:00:00Z"
  }
}
```

---

## 三、流程实例 API

### 3.1 查询流程实例列表

**接口**: `GET /api/flow/instances`

**查询参数**:
```typescript
{
  flow_definition_id?: string; // 流程定义 ID 筛选
  status?: string;            // 状态筛选
  started_after?: string;     // 开始时间之后（ISO 8601）
  started_before?: string;    // 开始时间之前（ISO 8601）
  page?: number;              // 页码，默认 1
  page_size?: number;         // 每页数量，默认 20
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "total": 100,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": "instance-1",
        "flow_definition_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "running",
        "current_node_id": "node-3",
        "started_at": "2024-01-01T10:00:00Z",
        "completed_at": null,
        "error_message": null,
        "total_execution_time": 0,
        "node_execution_count": 2,
        "success_node_count": 2,
        "failed_node_count": 0
      }
    ]
  }
}
```

---

### 3.2 查询流程实例详情

**接口**: `GET /api/flow/instances/:id`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "id": "instance-1",
    "flow_definition_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "running",
    "trigger_data": {
      "message": "这是一条测试消息",
      "sender": "user_123",
      "group_id": "group_456"
    },
    "context": {
      "senderRole": "user",
      "user_id": "user_123",
      "group_id": "group_456",
      "messages": [...]
    },
    "current_node_id": "node-3",
    "started_at": "2024-01-01T10:00:00Z",
    "completed_at": null,
    "error_message": null,
    "total_execution_time": 1500,
    "node_execution_count": 2,
    "success_node_count": 2,
    "failed_node_count": 0
  }
}
```

---

### 3.3 查询流程执行日志

**接口**: `GET /api/flow/instances/:id/logs`

**查询参数**:
```typescript
{
  node_id?: string;   // 节点 ID 筛选
  status?: string;    // 状态筛选
  page?: number;      // 页码，默认 1
  page_size?: number; // 每页数量，默认 50
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "total": 5,
    "page": 1,
    "page_size": 50,
    "items": [
      {
        "id": "log-1",
        "flow_instance_id": "instance-1",
        "node_id": "node-1",
        "node_type": "trigger",
        "node_name": "消息接收与保存",
        "status": "completed",
        "input_data": {
          "message": "这是一条测试消息"
        },
        "output_data": {
          "saved": true,
          "message_id": "msg_123"
        },
        "execution_time": 500,
        "started_at": "2024-01-01T10:00:00Z",
        "completed_at": "2024-01-01T10:00:01Z",
        "error_message": null,
        "error_stack": null
      }
    ]
  }
}
```

---

### 3.4 取消流程实例

**接口**: `POST /api/flow/instances/:id/cancel`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "流程实例已取消",
  "data": {
    "id": "instance-1",
    "status": "cancelled",
    "updated_at": "2024-01-01T11:00:00Z"
  }
}
```

---

## 四、跟踪任务 API

### 4.1 创建跟踪任务

**接口**: `POST /api/flow/track-tasks`

**请求参数**:
```typescript
{
  task_type: string;         // 任务类型：operation/after_sales/alert
  group_id: string;          // 群 ID
  group_name: string;        // 群名
  operation_id?: string;     // 运营 ID（运营任务必填）
  operation_name?: string;   // 运营名称
  staff_id?: string;         // 工作人员 ID（售后任务必填）
  staff_name?: string;       // 工作人员名称
  target_user_id: string;    // 目标用户 ID（必填）
  target_user_name: string;  // 目标用户名称
  requirement: string;       // 任务要求（必填）
  priority?: string;         // 优先级，默认 "medium"
  deadline?: string;         // 截止时间（ISO 8601）
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "跟踪任务创建成功",
  "data": {
    "id": "task-1",
    "task_type": "operation",
    "group_id": "group_456",
    "group_name": "测试群",
    "operation_id": "op_123",
    "operation_name": "财神爷",
    "target_user_id": "user_789",
    "target_user_name": "张三",
    "requirement": "需要配合完成实名认证",
    "priority": "high",
    "status": "pending",
    "deadline": "2024-01-01T12:00:00Z",
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  }
}
```

---

### 4.2 更新跟踪任务

**接口**: `PUT /api/flow/track-tasks/:id`

**请求参数**:
```typescript
{
  status?: string;           // 状态
  priority?: string;         // 优先级
  deadline?: string;         // 截止时间
  response_detected_at?: string; // 响应检测时间
  completed_at?: string;     // 完成时间
  conflict_detected?: boolean; // 是否检测到冲突
  conflict_resolved?: boolean; // 冲突是否已解决
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "跟踪任务更新成功",
  "data": {
    "id": "task-1",
    "status": "responded",
    "response_detected_at": "2024-01-01T10:05:00Z",
    "updated_at": "2024-01-01T10:05:00Z"
  }
}
```

---

### 4.3 删除跟踪任务

**接口**: `DELETE /api/flow/track-tasks/:id`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "跟踪任务删除成功",
  "data": null
}
```

---

### 4.4 查询跟踪任务列表

**接口**: `GET /api/flow/track-tasks`

**查询参数**:
```typescript
{
  task_type?: string;      // 任务类型筛选
  status?: string;         // 状态筛选
  priority?: string;       // 优先级筛选
  target_user_id?: string; // 目标用户 ID 筛选
  group_id?: string;       // 群 ID 筛选
  staff_id?: string;       // 工作人员 ID 筛选
  page?: number;           // 页码，默认 1
  page_size?: number;      // 每页数量，默认 20
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "total": 10,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": "task-1",
        "task_type": "operation",
        "group_id": "group_456",
        "group_name": "测试群",
        "operation_id": "op_123",
        "operation_name": "财神爷",
        "target_user_id": "user_789",
        "target_user_name": "张三",
        "requirement": "需要配合完成实名认证",
        "priority": "high",
        "status": "responded",
        "deadline": "2024-01-01T12:00:00Z",
        "response_detected_at": "2024-01-01T10:05:00Z",
        "completed_at": null,
        "created_at": "2024-01-01T10:00:00Z",
        "updated_at": "2024-01-01T10:05:00Z"
      }
    ]
  }
}
```

---

### 4.5 完成跟踪任务

**接口**: `POST /api/flow/track-tasks/:id/complete`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "跟踪任务已完成",
  "data": {
    "id": "task-1",
    "status": "completed",
    "completed_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

---

## 五、指令队列 API

### 5.1 添加指令到队列

**接口**: `POST /api/flow/robot-queue`

**请求参数**:
```typescript
{
  robot_id: string;      // 机器人 ID（必填）
  robot_type: string;    // 机器人类型：monitor/notification/reply（必填）
  command: {             // 指令内容（必填）
    type: string;
    params: any;
  };
  priority?: number;     // 优先级 1-10，默认 5
  delay_seconds?: number; // 延迟秒数，默认 0
  scheduled_at?: string; // 计划执行时间（ISO 8601）
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "指令已添加到队列",
  "data": {
    "id": "cmd-1",
    "robot_id": "robot_123",
    "robot_type": "reply",
    "command": {
      "type": "send_message",
      "params": {
        "group_id": "group_456",
        "content": "这是一条回复消息"
      }
    },
    "status": "pending",
    "priority": 5,
    "delay_seconds": 0,
    "scheduled_at": "2024-01-01T10:00:00Z",
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

---

### 5.2 查询指令队列

**接口**: `GET /api/flow/robot-queue`

**查询参数**:
```typescript
{
  robot_id?: string;      // 机器人 ID 筛选
  robot_type?: string;    // 机器人类型筛选
  status?: string;        // 状态筛选
  priority?: number;      // 优先级筛选
  scheduled_after?: string; // 计划执行时间之后
  page?: number;          // 页码，默认 1
  page_size?: number;     // 每页数量，默认 20
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "total": 50,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": "cmd-1",
        "robot_id": "robot_123",
        "robot_type": "reply",
        "command": {
          "type": "send_message",
          "params": {
            "group_id": "group_456",
            "content": "这是一条回复消息"
          }
        },
        "status": "pending",
        "priority": 5,
        "delay_seconds": 0,
        "scheduled_at": "2024-01-01T10:00:00Z",
        "created_at": "2024-01-01T10:00:00Z",
        "updated_at": "2024-01-01T10:00:00Z"
      }
    ]
  }
}
```

---

### 5.3 更新指令状态

**接口**: `PUT /api/flow/robot-queue/:id/status`

**请求参数**:
```typescript
{
  status: string;             // 新状态：pending/sent/success/failed/timeout
  sent_at?: string;           // 发送时间
  result_checked_at?: string; // 结果检查时间
  result?: any;               // 执行结果
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "指令状态更新成功",
  "data": {
    "id": "cmd-1",
    "status": "success",
    "sent_at": "2024-01-01T10:01:00Z",
    "result_checked_at": "2024-01-01T10:02:00Z",
    "result": {
      "success": true,
      "message": "消息发送成功"
    },
    "updated_at": "2024-01-01T10:02:00Z"
  }
}
```

---

### 5.4 检查指令执行结果

**接口**: `POST /api/flow/robot-queue/:id/check`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "结果检查完成",
  "data": {
    "id": "cmd-1",
    "status": "success",
    "result": {
      "success": true,
      "message": "消息发送成功",
      "message_id": "msg_456"
    },
    "result_checked_at": "2024-01-01T10:02:00Z",
    "retry_count": 0,
    "updated_at": "2024-01-01T10:02:00Z"
  }
}
```

---

### 5.5 重试指令

**接口**: `POST /api/flow/robot-queue/:id/retry`

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "指令已重新加入队列",
  "data": {
    "id": "cmd-1",
    "status": "pending",
    "retry_count": 1,
    "scheduled_at": "2024-01-01T10:03:00Z",
    "updated_at": "2024-01-01T10:03:00Z"
  }
}
```

---

## 六、接口规范

### 6.1 错误码

| 错误码 | 说明 |
|--------|------|
| `FLOW_NOT_FOUND` | 流程不存在 |
| `FLOW_ALREADY_ACTIVE` | 流程已激活 |
| `FLOW_ALREADY_INACTIVE` | 流程已停用 |
| `INSTANCE_NOT_FOUND` | 流程实例不存在 |
| `INSTANCE_CANNOT_CANCEL` | 流程实例无法取消 |
| `TASK_NOT_FOUND` | 跟踪任务不存在 |
| `COMMAND_NOT_FOUND` | 指令不存在 |
| `COMMAND_MAX_RETRY` | 指令已超过最大重试次数 |
| `INVALID_PARAMETER` | 请求参数错误 |
| `UNAUTHORIZED` | 认证失败 |

### 6.2 错误响应示例

```json
{
  "success": false,
  "code": 404,
  "message": "流程不存在",
  "error": {
    "code": "FLOW_NOT_FOUND",
    "details": "Flow definition with id 'xxx' not found"
  }
}
```

### 6.3 分页规范

所有列表查询接口都支持分页：

**查询参数**:
```typescript
{
  page?: number;      // 页码，默认 1
  page_size?: number; // 每页数量，默认 20，最大 100
}
```

**响应格式**:
```typescript
{
  total: number;      // 总数量
  page: number;       // 当前页码
  page_size: number;  // 每页数量
  items: any[];       // 数据列表
}
```

### 6.4 时间格式

所有时间字段使用 **ISO 8601** 格式：

```
2024-01-01T10:00:00Z
2024-01-01T10:00:00.123Z
```

### 6.5 幂等性

所有 `POST` 和 `PUT` 接口都支持幂等性检查：

- Header: `Idempotency-Key: <unique_key>`
- 系统会根据 `Idempotency-Key` 缓存响应，相同 key 的请求会返回相同结果

---

## 总结

API 接口设计文档包含了流程引擎、跟踪任务、指令队列的完整接口定义，包括：

✅ **流程管理 API**：创建/更新/删除/查询/激活/停用流程
✅ **流程实例 API**：查询实例/详情/日志/取消实例
✅ **跟踪任务 API**：创建/更新/删除/查询/完成任务
✅ **指令队列 API**：添加/查询/更新/检查/重试指令
✅ **统一规范**：认证、响应结构、错误码、分页、时间格式

---

**文档结束**
