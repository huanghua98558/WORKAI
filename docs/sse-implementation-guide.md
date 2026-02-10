# SSE（Server-Sent Events）实时消息推送 - 完整使用指南

## 📋 目录

1. [概述](#概述)
2. [架构说明](#架构说明)
3. [安装步骤](#安装步骤)
4. [后端使用](#后端使用)
5. [前端使用](#前端使用)
6. [测试方法](#测试方法)
7. [故障排查](#故障排查)
8. [性能优化](#性能优化)

---

## 概述

### 什么是SSE？

SSE（Server-Sent Events）是一种服务器向客户端推送实时数据的技术，基于HTTP协议，单向通信（服务器→客户端）。

### SSE vs WebSocket

| 特性 | SSE | WebSocket |
|------|-----|-----------|
| 协议 | HTTP | WebSocket |
| 通信方向 | 服务器→客户端 | 双向 |
| 自动重连 | ✅ 支持 | ❌ 需要手动实现 |
| 浏览器支持 | ✅ 原生支持 | ✅ 原生支持 |
| 实现难度 | ✅ 简单 | ⚠️ 中等 |
| 性能 | ✅ 好 | ✅ 优秀 |

### 本方案特点

✅ **基于PostgreSQL LISTEN/NOTIFY** - 无需额外服务
✅ **实时性强** - 毫秒级推送
✅ **自动重连** - 断线自动重连
✅ **心跳保活** - 30秒心跳检测
✅ **按会话过滤** - 支持按sessionId过滤消息

---

## 架构说明

### 系统架构

```
┌─────────────┐
│   前端页面   │
│  (Next.js)  │
└──────┬──────┘
       │ SSE连接
       ↓
┌─────────────┐
│  后端API    │
│  (Fastify)  │
└──────┬──────┘
       │ LISTEN
       ↓
┌─────────────┐
│ PostgreSQL  │
│   数据库     │
└──────┬──────┘
       │ NOTIFY
       ↓
┌─────────────┐
│ 触发器     │
│ (Trigger)   │
└──────┬──────┘
       │ 新消息插入
       ↓
┌─────────────┐
│ session_messages │
│   数据表     │
└─────────────┘
```

### 工作流程

1. **前端发起SSE连接**
   ```
   GET /api/sse/messages?sessionId=xxx
   ```

2. **后端监听PostgreSQL通道**
   ```sql
   LISTEN session_messages:xxx
   ```

3. **新消息插入数据库**
   ```sql
   INSERT INTO session_messages (...)
   ```

4. **触发器自动发送通知**
   ```sql
   NOTIFY session_messages:xxx, '...'
   ```

5. **后端收到通知，推送给前端**
   ```
   SSE → data: {"type": "message", "data": {...}}
   ```

---

## 安装步骤

### 1. 运行数据库迁移脚本

```bash
cd server
node database/migrations/add_sse_notification_trigger.js
```

**预期输出：**
```
✓ 通知函数创建成功
✓ 触发器创建成功
✅ SSE通知机制添加成功！

📋 使用说明：
   - 频道格式：session_messages:<sessionId>
   - 全局频道：session_messages:global
   - 通知内容：新消息的JSON数据
```

### 2. 重启后端服务

```bash
# 停止后端服务
pkill -f "node server/app.js"

# 启动后端服务
node server/app.js
```

### 3. 验证触发器

```sql
-- 连接到PostgreSQL
psql -U your_user -d your_database

-- 查看触发器
SELECT
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgenabled AS is_enabled
FROM pg_trigger
WHERE tgname = 'trigger_notify_new_message';
```

**预期输出：**
```
 trigger_name                 | table_name       | is_enabled
------------------------------+------------------+------------
 trigger_notify_new_message    | session_messages| O
```

### 4. 测试触发器

```sql
-- 测试：插入一条消息，观察通知
INSERT INTO session_messages (
  session_id,
  content,
  is_from_bot,
  is_human,
  intent,
  created_at
) VALUES (
  'test-session',
  '测试消息',
  false,
  true,
  'test',
  NOW()
);
```

---

## 后端使用

### 1. SSE API端点

#### 消息流推送

**端点：** `GET /api/sse/messages`

**参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 否 | 会话ID，不提供则监听全局消息 |
| robotId | string | 否 | 机器人ID，用于过滤消息 |

**响应：** SSE流

**示例：**
```bash
curl -N "http://localhost:5001/api/sse/messages?sessionId=123"
```

**响应格式：**
```
data: {"type":"connected","message":"SSE连接成功","timestamp":"2024-01-01T00:00:00.000Z","sessionId":"123"}

data: {"type":"message","data":{"id":"1","sessionId":"123","content":"你好","isFromBot":false},"timestamp":"2024-01-01T00:00:00.000Z"}

data: {"type":"heartbeat","timestamp":"2024-01-01T00:00:30.000Z"}
```

#### SSE连接统计

**端点：** `GET /api/sse/stats`

**响应示例：**
```json
{
  "success": true,
  "data": {
    "totalConnections": 5,
    "channels": {
      "session_messages:123": 2,
      "session_messages:456": 1,
      "session_messages:global": 2
    }
  }
}
```

### 2. 代码示例

#### 监听单个会话

```javascript
const eventSource = new EventSource('http://localhost:5001/api/sse/messages?sessionId=123');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'connected':
      console.log('✅ 已连接');
      break;

    case 'message':
      console.log('📨 收到新消息:', data.data);
      break;

    case 'heartbeat':
      console.log('💓 心跳');
      break;

    case 'error':
      console.error('❌ 错误:', data.error);
      break;
  }
};
```

#### 监听全局消息

```javascript
const eventSource = new EventSource('http://localhost:5001/api/sse/messages');
```

#### 按机器人过滤

```javascript
const eventSource = new EventSource(
  'http://localhost:5001/api/sse/messages?robotId=robot-123'
);
```

---

## 前端使用

### 1. 使用useSSE Hook

#### 基础用法

```tsx
'use client';

import { useSSE } from '@/hooks/useSSE';

export default function MyComponent() {
  const {
    connected,
    messages,
    error,
    reconnectAttempts,
    connect,
    disconnect,
  } = useSSE({
    sessionId: 'your-session-id',
    onMessage: (message) => {
      console.log('收到新消息:', message);
    },
    onError: (error) => {
      console.error('SSE错误:', error);
    },
  });

  return (
    <div>
      <div>连接状态: {connected ? '已连接' : '已断开'}</div>
      <div>消息数量: {messages.length}</div>
      {error && <div>错误: {error.message}</div>}
      <div>重连次数: {reconnectAttempts}</div>

      <button onClick={connected ? disconnect : connect}>
        {connected ? '断开' : '连接'}
      </button>
    </div>
  );
}
```

#### 高级用法

```tsx
'use client';

import { useSSE } from '@/hooks/useSSE';

export default function AdvancedSSEExample() {
  const {
    connected,
    messages,
    error,
    reconnectAttempts,
    connect,
    disconnect,
    clearMessages,
  } = useSSE({
    sessionId: 'your-session-id',
    robotId: 'your-robot-id',
    reconnectInterval: 5000, // 5秒后重连
    maxReconnectAttempts: 20, // 最多重连20次
    onMessage: (message) => {
      // 处理新消息
      if (message.isFromBot) {
        // 机器人消息
        console.log('机器人:', message.content);
      } else if (message.isHuman) {
        // 用户消息
        console.log('用户:', message.content);
      }
    },
    onConnected: () => {
      console.log('✅ SSE已连接');
      // 可以在这里做一些初始化操作
    },
    onDisconnected: () => {
      console.log('❌ SSE已断开');
      // 可以在这里清理资源
    },
    onError: (error) => {
      console.error('❌ SSE错误:', error);
      // 可以在这里显示错误提示
    },
  });

  return (
    <div className="p-4">
      {/* 连接状态 */}
      <div className={`mb-4 p-2 rounded ${
        connected ? 'bg-green-100' : 'bg-red-100'
      }`}>
        {connected ? '✅ 已连接' : '❌ 已断开'}
        {reconnectAttempts > 0 && ` · 重连中 (${reconnectAttempts}/10)`}
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="mb-4 p-2 bg-red-100 rounded">
          错误: {error.message}
        </div>
      )}

      {/* 消息列表 */}
      <div className="space-y-2">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-2 rounded ${
              message.isFromBot ? 'bg-blue-100' : 'bg-gray-100'
            }`}
          >
            <div className="font-semibold">
              {message.isFromBot ? '机器人' : '用户'}
            </div>
            <div>{message.content}</div>
            <div className="text-sm text-gray-500">
              {message.createdAt}
            </div>
          </div>
        ))}
      </div>

      {/* 控制按钮 */}
      <div className="mt-4 space-x-2">
        <button onClick={connected ? disconnect : connect}>
          {connected ? '断开' : '连接'}
        </button>
        <button onClick={clearMessages}>
          清空消息
        </button>
      </div>
    </div>
  );
}
```

### 2. 使用MessageStream组件

#### 基础用法

```tsx
'use client';

import { MessageStream } from '@/components/sse/MessageStream';

export default function MyPage() {
  return (
    <div className="h-[600px]">
      <MessageStream
        sessionId="your-session-id"
        onNewMessage={(message) => {
          console.log('新消息:', message);
        }}
      />
    </div>
  );
}
```

#### 高级用法

```tsx
'use client';

import { useState } from 'react';
import { MessageStream } from '@/components/sse/MessageStream';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ChatPage() {
  const [sessionId] = useState('chat-session-123');
  const [input, setInput] = useState('');

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // 发送消息到后端
    await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        content: input,
        isHuman: true,
      }),
    });

    setInput('');
  };

  return (
    <div className="flex flex-col h-screen">
      {/* 消息流 */}
      <div className="flex-1">
        <MessageStream
          sessionId={sessionId}
          onNewMessage={(message) => {
            // 可以在这里做额外的处理
            if (message.isFromBot) {
              // 机器人回复
              console.log('机器人回复:', message.content);
            }
          }}
        />
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <Button onClick={handleSendMessage}>
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## 测试方法

### 1. 后端测试

#### 测试1：验证SSE连接

```bash
curl -N "http://localhost:5001/api/sse/messages?sessionId=test-session"
```

**预期输出：**
```
data: {"type":"connected","message":"SSE连接成功","timestamp":"2024-01-01T00:00:00.000Z","sessionId":"test-session"}

data: {"type":"heartbeat","timestamp":"2024-01-01T00:00:30.000Z"}
```

#### 测试2：插入消息并观察推送

**终端1：** 保持SSE连接
```bash
curl -N "http://localhost:5001/api/sse/messages?sessionId=test-session"
```

**终端2：** 插入消息
```bash
psql -U your_user -d your_database -c "
INSERT INTO session_messages (
  session_id,
  content,
  is_from_bot,
  is_human,
  intent,
  created_at
) VALUES (
  'test-session',
  '测试消息',
  false,
  true,
  'test',
  NOW()
);
"
```

**预期输出（终端1）：**
```
data: {"type":"message","data":{"id":"1","sessionId":"test-session","content":"测试消息","isFromBot":false,"isHuman":true,"intent":"test","createdAt":"2024-01-01T00:00:00.000Z"},"timestamp":"2024-01-01T00:00:00.000Z"}
```

#### 测试3：查看SSE统计

```bash
curl "http://localhost:5001/api/sse/stats"
```

**预期输出：**
```json
{
  "success": true,
  "data": {
    "totalConnections": 1,
    "channels": {
      "session_messages:test-session": 1
    }
  }
}
```

### 2. 前端测试

#### 测试1：使用浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 切换到Console标签
3. 运行以下代码：

```javascript
const eventSource = new EventSource(
  'http://localhost:5001/api/sse/messages?sessionId=browser-test'
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('[SSE]', data);
};
```

4. 插入一条消息，观察控制台输出

#### 测试2：使用React组件

1. 创建一个测试页面
2. 使用MessageStream组件
3. 打开浏览器访问该页面
4. 观察实时消息推送

---

## 故障排查

### 问题1：SSE连接失败

**症状：**
```
GET /api/sse/messages 500 Internal Server Error
```

**可能原因：**
1. PostgreSQL连接失败
2. 数据库权限不足
3. 触发器未创建

**解决方案：**
```sql
-- 检查触发器是否存在
SELECT * FROM pg_trigger WHERE tgname = 'trigger_notify_new_message';

-- 重新创建触发器
node server/database/migrations/add_sse_notification_trigger.js
```

### 问题2：收不到消息

**症状：**
```
SSE连接成功，但插入消息后收不到推送
```

**可能原因：**
1. 触发器未触发
2. LISTEN通道名称不匹配
3. PostgreSQL配置问题

**解决方案：**
```sql
-- 检查PostgreSQL配置
SHOW listen_addresses;  -- 应该为 '*'
SHOW max_connections;   -- 应该足够大

-- 手动测试NOTIFY
LISTEN session_messages:test;
NOTIFY session_messages:test, '{"test":"data"}';

-- 查看监听状态
SELECT * FROM pg_listening_channels();
```

### 问题3：频繁断线重连

**症状：**
```
SSE连接频繁断开并重连
```

**可能原因：**
1. 网络不稳定
2. 后端服务重启
3. 连接超时

**解决方案：**
```typescript
// 增加重连间隔
const { connect, disconnect } = useSSE({
  sessionId: 'xxx',
  reconnectInterval: 5000,  // 5秒后重连
  maxReconnectAttempts: 20, // 最多重连20次
});
```

### 问题4：性能问题

**症状：**
```
SSE连接过多导致性能下降
```

**解决方案：**
1. 限制并发连接数
2. 使用连接池
3. 优化数据库查询

---

## 性能优化

### 1. 数据库优化

```sql
-- 创建索引
CREATE INDEX idx_session_messages_session_id ON session_messages(session_id);
CREATE INDEX idx_session_messages_created_at ON session_messages(created_at DESC);

-- 分析查询计划
EXPLAIN ANALYZE SELECT * FROM session_messages WHERE session_id = 'xxx';
```

### 2. 连接管理

```javascript
// 限制最大连接数
const MAX_CONNECTIONS = 100;
if (activeConnections.size >= MAX_CONNECTIONS) {
  return reply.code(503).send({
    success: false,
    error: '已达到最大连接数',
  });
}
```

### 3. 消息压缩

```javascript
// 使用gzip压缩
reply.header('Content-Encoding', 'gzip');
```

### 4. 负载均衡

```nginx
# Nginx配置
upstream sse_backend {
  least_conn;
  server backend1:5001;
  server backend2:5001;
  server backend3:5001;
}
```

---

## 已知问题和修复记录

### 修复1: 触发器表名错误 (2026-02-10)

**问题描述**:
- 触发器绑定到错误的表 `session_messages`
- 实际的表名是 `messages`
- 字段映射也不正确

**修复步骤**:
1. 删除旧触发器和函数
2. 重新创建触发器函数，使用正确的字段映射
3. 在 `messages` 表上创建触发器

**修改文件**:
- `server/database/migrations/add_sse_notification_trigger.js`

**验证方法**:
```bash
# 检查触发器
node check-trigger.js

# 测试触发器
node test-trigger.js
```

---

### 修复2: SSE API使用共享连接 (2026-02-10)

**问题描述**:
- SSE API使用 `getDb()` 返回的共享连接
- 共享连接无法正确接收PostgreSQL通知事件
- 导致SSE无法实时推送消息

**修复步骤**:
1. 修改SSE API，使用独立的PostgreSQL连接
2. 每个SSE请求创建新的 `pg.Client`
3. 在连接断开时关闭独立连接

**修改文件**:
- `server/routes/sse.api.js`

**关键代码变更**:
```javascript
// 旧代码（错误）
const db = await getDb();
const sql = db.session.client;
await sql.query(`LISTEN ${channel}`);

// 新代码（正确）
const sseClient = new pg.Client({
  connectionString: process.env.PGDATABASE_URL,
});
await sseClient.connect();
await sseClient.query(`LISTEN ${channel}`);
```

**验证方法**:
```bash
# 测试NOTIFY机制
node test-notify-2.js

# 测试完整SSE流程
node test-sse.js

# 测试后端API
bash test-backend-api.sh
```

---

## 总结

本方案提供了一个完整的SSE实时消息推送解决方案，具有以下特点：

✅ **实时性强** - 毫秒级推送
✅ **自动重连** - 断线自动重连
✅ **心跳保活** - 30秒心跳检测
✅ **按会话过滤** - 支持按sessionId过滤
✅ **无需额外服务** - 基于PostgreSQL LISTEN/NOTIFY
✅ **易于使用** - 提供React Hook和组件
✅ **性能优化** - 支持连接池和负载均衡

---

**生成时间：** 2024年
**版本：** 1.0.0
**作者：** WorkTool AI Team
