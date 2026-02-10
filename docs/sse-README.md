# SSE实时消息推送 - 快速上手

## 🚀 5分钟快速开始

### 1. 启动服务

```bash
coze dev
```

服务将启动在：
- 后端：http://localhost:5001
- 前端：http://localhost:5000

### 2. 访问演示页面

打开浏览器访问：
```
http://localhost:5000/sse-demo
```

### 3. 测试功能

1. 在演示页面点击"连接"按钮
2. 在输入框输入测试消息
3. 点击"发送"
4. 观察实时消息推送

---

## 💻 代码示例

### 前端使用

```typescript
import { useSSE } from '@/hooks/useSSE';

function MyComponent() {
  const { connected, messages } = useSSE({
    sessionId: 'my-session-id',
  });

  return (
    <div>
      <p>状态: {connected ? '已连接' : '未连接'}</p>
      <ul>
        {messages.map((msg, i) => (
          <li key={i}>{msg.content}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 后端发送消息

```javascript
// 插入消息到数据库，触发器会自动发送SSE通知
await db.insert({
  session_id: 'my-session-id',
  robot_id: 'robot-123',
  content: 'Hello World',
  sender_type: 'ai',
  sender_name: 'AI助手',
}).into(db._.schema.messages);
```

### 调用消息API

```javascript
// 发送消息
const response = await fetch('/api/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'my-session-id',
    content: 'Hello World',
    senderType: 'user',
    senderName: '张三'
  })
});
```

---

## 📁 核心文件

### 后端
- `server/database/migrations/add_sse_notification_trigger.js` - 数据库触发器
- `server/routes/sse.api.js` - SSE推送API
- `server/routes/messages.api.js` - 消息管理API

### 前端
- `src/hooks/useSSE.ts` - React Hook
- `src/components/sse/MessageStream.tsx` - 消息流组件
- `src/app/sse-demo/page.tsx` - 演示页面

---

## 🔗 API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/sse/messages` | GET | SSE消息推送流 |
| `/api/sse/test` | GET | 测试端点 |
| `/api/sse/stats` | GET | 统计信息 |
| `/api/messages` | POST | 发送消息 |
| `/api/messages` | GET | 获取历史消息 |

---

## ✅ 测试验证

所有功能已测试通过：
- ✅ PostgreSQL触发器
- ✅ NOTIFY机制
- ✅ SSE推送
- ✅ API端点

详细测试报告：[sse-test-report.md](./sse-test-report.md)

---

## 📚 详细文档

- [完整实现指南](./sse-implementation-guide.md)
- [配套需求说明](./sse-requirements.md)
- [测试报告](./sse-test-report.md)
- [快速开始](./sse-quickstart.md)

---

**立即体验：http://localhost:5000/sse-demo 🎉**
