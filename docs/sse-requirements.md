# SSE功能配套需求说明

## 📋 概述

SSE（Server-Sent Events）核心功能已经完整实现并测试通过，但为了让它在实际业务中发挥作用，需要配合以下功能。

---

## ✅ 已完成的核心功能

### 1. 数据库层 ✅
- PostgreSQL LISTEN/NOTIFY机制
- 触发器自动发送通知
- 表名：`messages`

### 2. 后端API层 ✅
- SSE消息推送API：`GET /api/sse/messages`
- 测试端点：`GET /api/sse/test`
- 统计端点：`GET /api/sse/stats`

### 3. 前端组件层 ✅
- React Hook：`useSSE`
- 可视化组件：`MessageStream`
- 演示页面：`/sse-demo`

### 4. 测试验证 ✅
- 触发器测试
- NOTIFY机制测试
- 完整流程测试

---

## 🔧 需要补充的配套功能

### 1. 消息发送API ✅（已添加）

**文件**: `server/routes/messages.api.js`

**端点**:
- `POST /api/messages` - 发送消息
- `GET /api/messages` - 获取消息历史

**使用示例**:
```javascript
// 发送消息
const response = await fetch('/api/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'session-123',
    content: 'Hello World',
    senderType: 'user',
    senderName: '张三'
  })
});

// 获取消息历史
const response = await fetch('/api/messages?sessionId=session-123&limit=50');
```

---

### 2. 认证/授权（推荐）

**需求**:
- 当前SSE端点没有认证
- 需要根据业务需求添加认证中间件

**实现方式**:
```javascript
// server/routes/sse.api.js
fastify.get('/sse/messages', {
  onRequest: [fastify.authenticate] // 添加认证
}, async (request, reply) => {
  // SSE逻辑
});
```

---

### 3. 消息历史加载（推荐）

**需求**:
- SSE只推送新消息
- 需要加载历史消息显示完整对话

**实现方式**:
```javascript
// 前端
useEffect(() => {
  async function loadHistory() {
    const response = await fetch(`/api/messages?sessionId=${sessionId}&limit=50`);
    const data = await response.json();
    setHistoryMessages(data.data.messages);
  }
  loadHistory();
}, [sessionId]);
```

---

### 4. 消息格式化（推荐）

**需求**:
- 支持多种消息类型：文本、图片、音频、视频、文件
- 根据类型渲染不同的UI

**实现方式**:
```typescript
// src/components/sse/MessageItem.tsx
function MessageItem({ message }) {
  switch (message.contentType) {
    case 'image':
      return <img src={message.content} alt="消息图片" />;
    case 'text':
    default:
      return <p>{message.content}</p>;
  }
}
```

---

### 5. 错误处理和UI反馈（推荐）

**需求**:
- 连接失败时的友好提示
- 重连进度的显示
- 错误消息的展示

**实现方式**:
```typescript
// 使用useSSE Hook的错误状态
const { error, reconnectAttempts } = useSSE({ sessionId });

{error && (
  <div className="error-banner">
    连接失败，正在重连... ({reconnectAttempts}/10)
  </div>
)}
```

---

### 6. 性能监控（推荐）

**需求**:
- 监控SSE连接数
- 监控消息推送延迟
- 设置告警阈值

**实现方式**:
```javascript
// 使用Prometheus指标
const sseConnectionsGauge = prometheusClient.register.getSingleMetric(
  'sse_connections_total'
);
```

---

### 7. 配置管理（可选）

**需求**:
- 心跳间隔可配置
- 重连策略可配置
- 超时时间可配置

**实现方式**:
```javascript
// config/sse.config.js
module.exports = {
  heartbeatInterval: 30000,
  maxReconnectAttempts: 10,
  reconnectInterval: 3000,
  connectionTimeout: 10000,
};
```

---

## 🎯 快速开始

### 最小可用版本

如果你想快速体验SSE功能，只需要以下步骤：

1. **启动后端服务**:
```bash
coze dev
```

2. **访问演示页面**:
```
http://localhost:5000/sse-demo
```

3. **使用演示页面**:
- 输入会话ID
- 点击"连接"
- 发送测试消息
- 查看实时推送

### 完整集成版本

如果你要在实际业务中使用SSE功能，需要：

1. **添加认证**（推荐）
2. **加载历史消息**（推荐）
3. **实现消息发送**（已提供API）
4. **格式化消息展示**（推荐）
5. **添加错误处理**（推荐）

---

## 📊 使用场景

### 1. 实时聊天
- 用户与AI机器人对话
- 实时显示AI回复
- 支持多人协作

### 2. 实时通知
- 系统公告推送
- 任务状态更新
- 预警消息

### 3. 实时监控
- 机器人状态监控
- 任务执行进度
- 系统指标

### 4. 实时协作
- 多人编辑文档
- 实时同步状态
- 协作评论

---

## 🔍 故障排查

### 问题1: 消息发送成功但没有收到推送

**检查**:
1. 触发器是否正确创建：`node check-trigger.js`
2. SSE连接是否成功：查看演示页面连接状态
3. 通道名称是否正确：`session_messages:{sessionId}`

### 问题2: 连接频繁断开

**可能原因**:
1. 网络不稳定
2. 数据库连接超时
3. 服务器负载过高

**解决方案**:
1. 增加重连次数
2. 增加数据库连接池大小
3. 优化服务器性能

### 问题3: 消息推送延迟高

**可能原因**:
1. 数据库负载高
2. 网络延迟
3. PostgreSQL通知队列拥堵

**解决方案**:
1. 优化数据库查询
2. 增加数据库资源
3. 监控PostgreSQL性能

---

## 📚 参考文档

- [SSE实现指南](./sse-implementation-guide.md)
- [SSE快速开始](./sse-quickstart.md)
- [SSE测试报告](./sse-test-report.md)
- [SSE前端调整说明](./sse-frontend-adjustments.md)

---

## 🎉 总结

SSE核心功能已经完整实现并测试通过，可以立即使用！

**最小可用配置**:
- ✅ 数据库触发器
- ✅ 后端SSE API
- ✅ 前端useSSE Hook
- ✅ 演示页面
- ✅ 消息发送API（新增）

**推荐配置**（根据业务需求添加）:
- 🔐 认证/授权
- 📜 消息历史加载
- 🎨 消息格式化
- ⚠️ 错误处理
- 📊 性能监控

立即访问 `/sse-demo` 体验实时消息推送功能！
