# SSE 快速开始指南

## 🚀 5分钟快速上手

### 步骤1：运行数据库迁移（1分钟）

```bash
cd server
node database/migrations/add_sse_notification_trigger.js
```

### 步骤2：重启后端服务（1分钟）

```bash
# 停止后端服务
pkill -f "node server/app.js"

# 启动后端服务
node server/app.js
```

### 步骤3：在前端使用SSE（2分钟）

#### 方法A：使用useSSE Hook

```tsx
'use client';

import { useSSE } from '@/hooks/useSSE';

export default function MyComponent() {
  const { connected, messages } = useSSE({
    sessionId: 'your-session-id',
    onMessage: (message) => {
      console.log('收到新消息:', message);
    },
  });

  return (
    <div>
      <div>状态: {connected ? '已连接' : '已断开'}</div>
      <div>消息数量: {messages.length}</div>
    </div>
  );
}
```

#### 方法B：使用MessageStream组件

```tsx
'use client';

import { MessageStream } from '@/components/sse/MessageStream';

export default function MyPage() {
  return (
    <div className="h-[600px]">
      <MessageStream sessionId="your-session-id" />
    </div>
  );
}
```

### 步骤4：测试（1分钟）

```bash
# 测试SSE连接
curl -N "http://localhost:5001/api/sse/messages?sessionId=test"

# 在另一个终端插入测试消息
psql -U your_user -d your_database -c "
INSERT INTO session_messages (session_id, content, is_from_bot, is_human)
VALUES ('test', '测试消息', false, true);
"
```

✅ 完成！你应该能看到实时消息推送了。

---

## 📚 详细文档

- [完整使用指南](./sse-implementation-guide.md)
- [API文档](./frontend-api-analysis.md)
