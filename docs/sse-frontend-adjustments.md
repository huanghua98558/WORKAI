# SSE前端调整说明

## 📋 概述

前端SSE功能已经实现，以下是需要了解的调整和使用方法。

---

## ✅ 已完成的调整

### 1. 更新前端SSE代理路由

**文件：** `src/app/api/messages/stream/route.ts`

**改动：**
- 之前：只有模拟实现，发送假的心跳包
- 现在：代理到后端真实的SSE API，使用PostgreSQL LISTEN/NOTIFY机制

**功能：**
- 代理前端SSE请求到后端
- 支持sessionId和robotId参数
- 转发后端的SSE流式响应
- 错误处理和连接管理

### 2. 创建React Hook

**文件：** `src/hooks/useSSE.ts`

**功能：**
- 管理SSE连接
- 自动重连机制（最多10次）
- 心跳保活（30秒）
- 消息接收和处理
- 连接状态管理

**使用示例：**
```typescript
const { connected, messages, error, reconnectAttempts } = useSSE({
  sessionId: 'your-session-id',
  robotId: 'your-robot-id',
  onMessage: (message) => {
    console.log('收到新消息:', message);
  },
});
```

### 3. 创建可视化组件

**文件：** `src/components/sse/MessageStream.tsx`

**功能：**
- 显示实时消息流
- 连接状态指示
- 消息列表展示
- 自动滚动
- 消息分类（用户/机器人/系统）

**使用示例：**
```tsx
<MessageStream
  sessionId="your-session-id"
  onNewMessage={(message) => {
    console.log('新消息:', message);
  }}
/>
```

### 4. 创建演示页面

**文件：** `src/app/sse-demo/page.tsx`

**功能：**
- SSE功能演示
- 连接管理
- 消息发送测试
- 设置界面
- 使用说明

**访问地址：**
```
http://localhost:5000/sse-demo
```

---

## 🚀 如何使用

### 方法1：使用useSSE Hook

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
    robotId: 'your-robot-id',
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    onMessage: (message) => {
      console.log('收到新消息:', message);
    },
    onConnected: () => {
      console.log('SSE已连接');
    },
    onDisconnected: () => {
      console.log('SSE已断开');
    },
    onError: (error) => {
      console.error('SSE错误:', error);
    },
  });

  return (
    <div>
      <div>连接状态: {connected ? '已连接' : '已断开'}</div>
      <div>消息数量: {messages.length}</div>
      <div>重连次数: {reconnectAttempts}</div>

      <button onClick={connected ? disconnect : connect}>
        {connected ? '断开' : '连接'}
      </button>

      {messages.map((message, index) => (
        <div key={index}>
          {message.content}
        </div>
      ))}
    </div>
  );
}
```

### 方法2：使用MessageStream组件

```tsx
'use client';

import { MessageStream } from '@/components/sse/MessageStream';

export default function MyPage() {
  return (
    <div className="h-[600px]">
      <MessageStream
        sessionId="your-session-id"
        robotId="your-robot-id"
        onNewMessage={(message) => {
          console.log('新消息:', message);
        }}
      />
    </div>
  );
}
```

### 方法3：直接使用EventSource

```tsx
'use client';

import { useEffect, useState } from 'react';

export default function DirectSSEExample() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource(
      '/api/messages/stream?sessionId=your-session-id'
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'connected':
          console.log('✅ 已连接');
          break;

        case 'message':
          console.log('📨 收到新消息:', data.data);
          setMessages((prev) => [...prev, data.data]);
          break;

        case 'heartbeat':
          console.log('💓 心跳');
          break;

        case 'error':
          console.error('❌ 错误:', data.error);
          break;
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE连接错误:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div>
      {messages.map((message, index) => (
        <div key={index}>{message.content}</div>
      ))}
    </div>
  );
}
```

---

## 🔧 环境变量配置

确保在 `.env.local` 中配置了正确的后端URL：

```env
# 后端API地址
BACKEND_URL=http://localhost:5001
```

---

## 📊 前后端API对应关系

### 前端API

| 前端API | 后端API | 功能 |
|---------|---------|------|
| `/api/messages/stream` | `/api/sse/messages` | 消息流推送（代理） |
| `/api/sse/stats` | `/api/sse/stats` | SSE连接统计 |

### 使用建议

1. **推荐使用前端代理** - 使用 `/api/messages/stream` 而不是直接调用后端API
2. **使用useSSE Hook** - 更简单的API，自动管理连接
3. **使用MessageStream组件** - 开箱即用的可视化组件

---

## 🎯 集成到现有页面

### 示例：集成到聊天页面

```tsx
'use client';

import { MessageStream } from '@/components/sse/MessageStream';
import { useSearchParams } from 'next/navigation';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') || 'default';

  return (
    <div className="h-screen flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b">
        <h1>聊天 - {sessionId}</h1>
      </div>

      {/* 消息流 */}
      <div className="flex-1">
        <MessageStream sessionId={sessionId} />
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t">
        {/* 输入框实现 */}
      </div>
    </div>
  );
}
```

---

## ⚠️ 注意事项

### 1. 客户端组件

useSSE Hook和MessageStream组件都是客户端组件，需要在组件顶部添加 `'use client'`。

### 2. 会话ID管理

- 确保sessionId唯一性
- 建议使用UUID或时间戳
- 同一个sessionId会共享消息

### 3. 连接管理

- 页面卸载时会自动关闭连接
- 不要创建多个相同sessionId的连接
- 合理使用连接和断开按钮

### 4. 错误处理

- 监听error回调
- 显示错误提示
- 提供重连选项

---

## 🧪 测试方法

### 1. 访问演示页面

```
http://localhost:5000/sse-demo
```

### 2. 使用浏览器控制台

```javascript
// 连接到SSE
const eventSource = new EventSource('/api/messages/stream?sessionId=test');

// 监听消息
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};
```

### 3. 插入测试消息

```sql
INSERT INTO session_messages (
  session_id,
  content,
  is_from_bot,
  is_human,
  created_at
) VALUES (
  'test',
  '测试消息',
  false,
  true,
  NOW()
);
```

---

## 📚 相关文档

- [完整使用指南](./sse-implementation-guide.md)
- [快速开始指南](./sse-quickstart.md)
- [前端API分析](./frontend-api-analysis.md)

---

## 🎉 总结

前端SSE功能已经完整实现，包括：

✅ **前端代理路由** - 代理到后端SSE API
✅ **React Hook** - 简化SSE连接管理
✅ **可视化组件** - 开箱即用的消息流组件
✅ **演示页面** - 完整的功能演示
✅ **文档完善** - 详细的使用说明

用户可以根据需要选择使用方式：
- 简单场景：使用MessageStream组件
- 自定义场景：使用useSSE Hook
- 完全控制：直接使用EventSource

---

**生成时间：** 2024年
**版本：** 1.0.0
