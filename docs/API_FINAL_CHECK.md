# WorkTool 回调地址和API地址完整检查

## 📋 概述

根据WorkTool提供的规范，检查我们当前系统的实现情况。

---

## 🔗 第一部分：我们提供给机器人APP的通讯地址（回调地址）

**用途：** 机器人上报消息给我们

**我们需要实现的端点：**

| 回调类型 | 标准地址 | 我们当前的实现 | 状态 |
|---------|---------|--------------|------|
| 消息回调 | `/api/worktool/callback/message?robotId=xxx` | `/api/worktool/callback/message` | ✅ **已实现** |
| 执行结果回调 | `/api/worktool/callback/result?robotId=xxx` | `/api/worktool/callback/result` | ✅ **已实现** |
| 群二维码回调 | `/api/worktool/callback/qrcode?robotId=xxx` | `/api/worktool/callback/qrcode` | ✅ **已实现** |
| 机器人上线回调 | `/api/worktool/callback/status?robotId=xxx` | `/api/worktool/callback/robot-online` | ⚠️ **端点不一致** |
| 机器人下线回调 | `/api/worktool/callback/status?robotId=xxx` | `/api/worktool/callback/robot-offline` | ⚠️ **端点不一致** |

### 详细检查

#### 1. 消息回调 ✅

**标准地址：**
```
POST /api/worktool/callback/message?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**我们的实现：**
```javascript
// server/routes/worktool.callback.js
fastify.post('/message', {
  preHandler: [circuitBreakerMiddleware]
}, async (request, reply) => {
  const { robotId } = request.query;
  // 处理消息回调逻辑
});
```

**注册路径：**
```
POST /api/worktool/callback/message
```

**状态：✅ 完全符合**

---

#### 2. 执行结果回调 ✅

**标准地址：**
```
POST /api/worktool/callback/result?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**我们的实现：**
```javascript
// server/routes/worktool.callback.js
fastify.post('/result', {
  preHandler: [circuitBreakerMiddleware]
}, async (request, reply) => {
  const { robotId } = request.query;
  // 处理执行结果回调逻辑
});
```

**注册路径：**
```
POST /api/worktool/callback/result
```

**状态：✅ 完全符合**

---

#### 3. 群二维码回调 ✅

**标准地址：**
```
POST /api/worktool/callback/qrcode?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**我们的实现：**
```javascript
// server/routes/worktool.callback.js
fastify.post('/qrcode', {
  preHandler: [circuitBreakerMiddleware]
}, async (request, reply) => {
  const { robotId } = request.query;
  // 处理群二维码回调逻辑
});
```

**注册路径：**
```
POST /api/worktool/callback/qrcode
```

**状态：✅ 完全符合**

---

#### 4. 机器人上线回调 ⚠️

**标准地址：**
```
POST /api/worktool/callback/status?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**我们的实现：**
```javascript
// server/routes/worktool.callback.js
fastify.post('/robot-online', {
  preHandler: [circuitBreakerMiddleware]
}, async (request, reply) => {
  const { robotId } = request.query;
  // 处理机器人上线回调逻辑
});
```

**注册路径：**
```
POST /api/worktool/callback/robot-online
```

**状态：⚠️ 端点不一致**

**问题：**
- 标准规范使用 `/status` 端点
- 我们使用 `/robot-online` 端点
- 需要统一为 `/status` 端点

---

#### 5. 机器人下线回调 ⚠️

**标准地址：**
```
POST /api/worktool/callback/status?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**我们的实现：**
```javascript
// server/routes/worktool.callback.js
fastify.post('/robot-offline', {
  preHandler: [circuitBreakerMiddleware]
}, async (request, reply) => {
  const { robotId } = request.query;
  // 处理机器人下线回调逻辑
});
```

**注册路径：**
```
POST /api/worktool/callback/robot-offline
```

**状态：⚠️ 端点不一致**

**问题：**
- 标准规范使用 `/status` 端点
- 我们使用 `/robot-offline` 端点
- 需要统一为 `/status` 端点

---

## 🔗 第二部分：他们提供给我们的，我们发消息给机器人服务器的地址（API地址）

**用途：** 我们调用他们的API发送消息或查询信息

**我们需要调用的API：**

| API功能 | 标准地址 | 我们的调用方式 | 状态 |
|---------|---------|--------------|------|
| 发送消息 | `/wework/sendRawMessage?robotId=xxx` | 需要在代码中调用 | ❓ 需要确认 |
| 机器人后端通讯加密 | `/robot/robotInfo/update?robotId=xxx` | 需要在代码中调用 | ❓ 需要确认 |
| 获取机器人信息 | `/robot/robotInfo/get?robotId=xxx` | 需要在代码中调用 | ❓ 需要确认 |
| 查询机器人是否在线 | `/robot/robotInfo/online?robotId=xxx` | 需要在代码中调用 | ❓ 需要确认 |
| 查询机器人登录日志 | `/robot/robotInfo/onlineInfos?robotId=xxx` | 需要在代码中调用 | ❓ 需要确认 |
| 指令消息API调用查询 | `/wework/listRawMessage?robotId=xxx` | 需要在代码中调用 | ❓ 需要确认 |
| 指令执行结果查询 | `/robot/rawMsg/list?robotId=xxx` | 需要在代码中调用 | ❓ 需要确认 |
| 机器人消息回调日志查询 | `/robot/qaLog/list?robotId=xxx` | 需要在代码中调用 | ❓ 需要确认 |

### 详细说明

这些API地址都是 **WorkTool提供的**，我们不需要实现这些端点，只需要在需要时调用它们的API。

**调用示例：**

```javascript
// 发送消息
const response = await fetch('https://api.worktool.ymdyes.cn/wework/sendRawMessage?robotId=wt22phhjpt2xboerspxsote472xdnyq2', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    toName: '用户姓名',
    content: '消息内容',
    messageType: 1
  })
});

// 获取机器人信息
const robotInfo = await fetch('https://api.worktool.ymdyes.cn/robot/robotInfo/get?robotId=wt22phhjpt2xboerspxsote472xdnyq2');
```

---

## 📊 总结

### 回调地址（我们实现）

| 回调类型 | 状态 | 需要调整 |
|---------|------|---------|
| 消息回调 | ✅ 已实现 | 不需要 |
| 执行结果回调 | ✅ 已实现 | 不需要 |
| 群二维码回调 | ✅ 已实现 | 不需要 |
| 机器人上线回调 | ⚠️ 端点不一致 | 需要调整为 `/status` |
| 机器人下线回调 | ⚠️ 端点不一致 | 需要调整为 `/status` |

### API地址（我们调用）

| API功能 | 状态 | 说明 |
|---------|------|------|
| 发送消息 | ❓ 需要确认 | 需要在代码中调用WorkTool的API |
| 机器人后端通讯加密 | ❓ 需要确认 | 需要在代码中调用WorkTool的API |
| 获取机器人信息 | ❓ 需要确认 | 需要在代码中调用WorkTool的API |
| 查询机器人是否在线 | ❓ 需要确认 | 需要在代码中调用WorkTool的API |
| 查询机器人登录日志 | ❓ 需要确认 | 需要在代码中调用WorkTool的API |
| 指令消息API调用查询 | ❓ 需要确认 | 需要在代码中调用WorkTool的API |
| 指令执行结果查询 | ❓ 需要确认 | 需要在代码中调用WorkTool的API |
| 机器人消息回调日志查询 | ❓ 需要确认 | 需要在代码中调用WorkTool的API |

---

## 🎯 需要做的事情

### 优先级1：调整机器人状态回调端点（必须）

**当前实现：**
```javascript
POST /api/worktool/callback/robot-online
POST /api/worktool/callback/robot-offline
POST /api/worktool/callback/robot-status
```

**需要改为：**
```javascript
POST /api/worktool/callback/status
```

**实现方式：**
```javascript
// 在 server/routes/worktool.callback.js 中
fastify.post('/status', {
  preHandler: [circuitBreakerMiddleware]
}, async (request, reply) => {
  const { robotId } = request.query;
  const { status, timestamp } = request.body;

  // 根据status字段处理上线/下线
  if (status === 'online') {
    // 处理上线逻辑
  } else if (status === 'offline') {
    // 处理下线逻辑
  }

  return reply.send(successResponse({ success: true }));
});
```

### 优先级2：确认API调用需求（可选）

**问题：**
1. 您的系统是否需要主动发送消息给用户？
2. 您的系统是否需要查询机器人信息？
3. 您的系统是否需要查询登录日志？

**如果需要：**
- 在代码中实现调用WorkTool API的逻辑
- 创建相应的服务方法

**如果不需要：**
- 可以忽略这些API调用

---

## 📝 结论

### 回调地址（机器人上报消息给我们）

**✅ 基本符合规范**
- 3个回调端点完全符合（消息、执行结果、二维码）
- 2个回调端点需要调整（机器人上线、下线）

**需要调整：**
- 将 `/robot-online` 和 `/robot-offline` 统一为 `/status`

### API地址（我们调用他们的API）

**❓ 需要根据实际需求确认**
- 这些是WorkTool提供的API，我们不需要实现
- 只需要在需要时调用它们的API
- 是否需要调用取决于您的系统功能需求

---

**文档生成时间**: 2026年2月9日
**文档版本**: v4.0（最终确认版）
**结论**: 回调地址基本符合，需要调整机器人状态回调端点；API地址取决于系统功能需求
