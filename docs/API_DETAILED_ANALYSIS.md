# WorkTool API 详细分析报告

## 📋 执行摘要

经过详细检查，当前系统的API结构**部分符合**WorkTool标准规范。回调地址基本符合，但发送地址的API需要进一步调整。

---

## 🔍 详细对比

### 一、回调地址（WorkTool主动推送给我们）

#### 1. 消息回调 ✅

**标准规范：**
```
POST /api/worktool/callback/message?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
POST /api/worktool/callback/message
```
- 文件：`server/routes/worktool.callback.js`
- 端点：`fastify.post('/message', ...)`
- 注册路径：`/api/worktool/callback/message` ✅

**状态：✅ 完全符合**

---

#### 2. 执行结果回调 ✅

**标准规范：**
```
POST /api/worktool/callback/result?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
POST /api/worktool/callback/result
```
- 文件：`server/routes/worktool.callback.js`
- 端点：`fastify.post('/result', ...)`
- 注册路径：`/api/worktool/callback/result` ✅

**状态：✅ 完全符合**

---

#### 3. 群二维码回调 ✅

**标准规范：**
```
POST /api/worktool/callback/qrcode?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
POST /api/worktool/callback/qrcode
```
- 文件：`server/routes/worktool.callback.js`
- 端点：`fastify.post('/qrcode', ...)`
- 注册路径：`/api/worktool/callback/qrcode` ✅

**状态：✅ 完全符合**

---

#### 4. 机器人状态回调 ⚠️

**标准规范：**
```
POST /api/worktool/callback/status?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
POST /api/worktool/callback/robot-online
POST /api/worktool/callback/robot-offline
POST /api/worktool/callback/robot-status
```
- 文件：`server/routes/worktool.callback.js`
- 端点：
  - `fastify.post('/robot-online', ...)`
  - `fastify.post('/robot-offline', ...)`
  - `fastify.post('/robot-status', ...)`
- 注册路径：
  - `/api/worktool/callback/robot-online` ❌
  - `/api/worktool/callback/robot-offline` ❌
  - `/api/worktool/callback/robot-status` ❌

**状态：⚠️ 需要调整**

**建议修改：**
```javascript
// 当前：3个独立端点
POST /api/worktool/callback/robot-online
POST /api/worktool/callback/robot-offline
POST /api/worktool/callback/robot-status

// 建议：统一为1个端点，通过参数区分
POST /api/worktool/callback/status
// 请求体包含：{ "status": "online|offline", "timestamp": "..." }
```

---

### 二、发送地址（我们主动调用WorkTool）

#### 1. 发送消息 ❓

**标准规范：**
```
POST https://api.worktool.ymdyes.cn/wework/sendRawMessage?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
- 文件：`server/routes/worktool-conversion-robot.api.js`
- 功能：获取转化客服机器人信息
- API路径：`GET /api/worktool/conversion-robot`
- 发送消息功能：`worktoolService.sendImage()`（在服务层）

**状态：❓ 需要确认**
- 当前系统没有 `/wework/sendRawMessage` 端点
- 需要检查 `worktoolService` 中的发送消息方法

---

#### 2. 机器人后端通讯加密地址 ❓

**标准规范：**
```
POST https://api.worktool.ymdyes.cn/robot/robotInfo/update?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
- 文件：`server/routes/robot-protected.api.js`
- 端点：
  - `GET /api/admin/robots` - 获取列表
  - `GET /api/admin/robots/:id` - 获取详情
  - `POST /api/admin/robots` - 创建
  - `PUT /api/admin/robots/:id` - 更新
  - `DELETE /api/admin/robots/:id` - 删除

**状态：❓ 需要确认**
- 当前系统使用 `/api/admin/robots/:id` 更新机器人信息
- 标准规范使用 `/robot/robotInfo/update?robotId=xxx`
- 路径不一致

---

#### 3. 获取机器人信息 ❓

**标准规范：**
```
GET https://api.worktool.ymdyes.cn/robot/robotInfo/get?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
- 文件：`server/routes/robot-protected.api.js`
- 端点：
  - `GET /api/admin/robots/:id`
  - `GET /api/admin/robots/by-robot-id/:robotId`

**状态：❓ 部分符合**
- 有 `by-robot-id` 端点，但路径是 `/api/admin/robots/by-robot-id/:robotId`
- 标准规范使用 `/robot/robotInfo/get?robotId=xxx`
- 路径不一致

---

#### 4. 查询机器人是否在线 ❓

**标准规范：**
```
GET https://api.worktool.ymdyes.cn/robot/robotInfo/online?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
- 需要检查是否有此端点

**状态：❓ 需要确认**

---

#### 5. 查询机器人登录日志 ❓

**标准规范：**
```
GET https://api.worktool.ymdyes.cn/robot/robotInfo/onlineInfos?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
- 需要检查是否有此端点

**状态：❓ 需要确认**

---

#### 6. 指令消息API调用查询 ❓

**标准规范：**
```
GET https://api.worktool.ymdyes.cn/wework/listRawMessage?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
- 需要检查是否有此端点

**状态：❓ 需要确认**

---

#### 7. 指令执行结果查询 ❓

**标准规范：**
```
GET https://api.worktool.ymdyes.cn/robot/rawMsg/list?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
- 文件：`server/routes/robot-command.api.js`
- 需要查看具体端点

**状态：❓ 需要确认**

---

#### 8. 机器人消息回调日志列表查询 ❓

**标准规范：**
```
GET https://api.worktool.ymdyes.cn/robot/qaLog/list?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
- 文件：`server/routes/qa.api.js`
- 需要查看具体端点

**状态：❓ 需要确认**

---

## 📊 总结对比表

| 功能分类 | 功能 | 标准路径 | 当前路径 | 状态 |
|---------|------|---------|---------|------|
| **回调地址** | 消息回调 | `/api/worktool/callback/message` | `/api/worktool/callback/message` | ✅ |
| | 执行结果回调 | `/api/worktool/callback/result` | `/api/worktool/callback/result` | ✅ |
| | 群二维码回调 | `/api/worktool/callback/qrcode` | `/api/worktool/callback/qrcode` | ✅ |
| | 机器人状态回调 | `/api/worktool/callback/status` | `/api/worktool/callback/robot-*` | ⚠️ |
| **发送地址** | 发送消息 | `/wework/sendRawMessage` | ❓ | ❓ |
| | 机器人信息更新 | `/robot/robotInfo/update` | `/api/admin/robots/:id` | ❓ |
| | 获取机器人信息 | `/robot/robotInfo/get` | `/api/admin/robots/by-robot-id/:robotId` | ❓ |
| | 查询在线状态 | `/robot/robotInfo/online` | ❓ | ❓ |
| | 查询登录日志 | `/robot/robotInfo/onlineInfos` | ❓ | ❓ |
| | 指令消息查询 | `/wework/listRawMessage` | ❓ | ❓ |
| | 指令结果查询 | `/robot/rawMsg/list` | ❓ | ❓ |
| | 消息日志查询 | `/robot/qaLog/list` | ❓ | ❓ |

---

## 🎯 问题和建议

### 问题1：机器人状态回调路径不一致

**问题描述：**
- 标准：`/api/worktool/callback/status`
- 当前：`/api/worktool/callback/robot-online`, `/robot-offline`, `/robot-status`

**影响：**
- WorkTool无法正确推送机器人状态信息

**解决方案：**
```javascript
// 在 server/routes/worktool.callback.js 中修改
// 添加统一的status端点
fastify.post('/status', {
  preHandler: [verifySignatureMiddleware, circuitBreakerMiddleware]
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

---

### 问题2：发送地址API路径不符合规范

**问题描述：**
- 所有发送地址的API路径都不符合标准规范
- 例如：`/api/admin/robots/:id` vs `/robot/robotInfo/update`

**影响：**
- 第三方系统无法正确调用我们的API
- 集成可能失败

**解决方案：**

#### 方案A：调整现有API路径
```javascript
// 在 server/routes/robot-protected.api.js 中添加
fastify.put('/robot/robotInfo/update', {
  onRequest: [verifyAuth]
}, async (request, reply) => {
  const { robotId } = request.query;
  // 实现更新逻辑
});

fastify.get('/robot/robotInfo/get', {
  onRequest: [verifyAuth]
}, async (request, reply) => {
  const { robotId } = request.query;
  // 实现获取逻辑
});

fastify.get('/robot/robotInfo/online', {
  onRequest: [verifyAuth]
}, async (request, reply) => {
  const { robotId } = request.query;
  // 实现在线状态查询逻辑
});

fastify.get('/robot/robotInfo/onlineInfos', {
  onRequest: [verifyAuth]
}, async (request, reply) => {
  const { robotId } = request.query;
  // 实现登录日志查询逻辑
});
```

#### 方案B：创建新的API路由文件
创建 `server/routes/worktool-robot.api.js`，专门用于WorkTool机器人信息相关API。

---

### 问题3：缺少部分API端点

**问题描述：**
- 缺少发送消息的API端点
- 缺少指令消息查询的API端点
- 缺少指令结果查询的API端点
- 缺少消息日志查询的API端点

**解决方案：**

需要创建以下API端点：
```javascript
// 在 server/routes/worktool-message.api.js 中添加
fastify.post('/wework/sendRawMessage', {
  onRequest: [verifyAuth]
}, async (request, reply) => {
  const { robotId } = request.query;
  const { toName, content, messageType } = request.body;
  // 实现发送消息逻辑
});

fastify.get('/wework/listRawMessage', {
  onRequest: [verifyAuth]
}, async (request, reply) => {
  const { robotId } = request.query;
  // 实现指令消息查询逻辑
});

fastify.get('/robot/rawMsg/list', {
  onRequest: [verifyAuth]
}, async (request, reply) => {
  const { robotId } = request.query;
  // 实现指令结果查询逻辑
});

fastify.get('/robot/qaLog/list', {
  onRequest: [verifyAuth]
}, async (request, reply) => {
  const { robotId } = request.query;
  // 实现消息日志查询逻辑
});
```

---

## 📝 下一步行动建议

### 优先级1：紧急修复（影响集成）

1. ✅ 确认WorkTool回调地址是否正确（已确认，基本符合）
2. ⚠️ 修改机器人状态回调路径
3. ❓ 检查并添加所有发送地址的API端点

### 优先级2：高优先级（影响功能）

1. 创建符合规范的发送消息API
2. 创建符合规范的机器人信息管理API
3. 创建符合规范的日志查询API

### 优先级3：中优先级（优化）

1. 统一API路径规范
2. 添加API文档
3. 添加API版本控制

---

## 🔍 详细检查清单

- [ ] 检查 `worktoolService.sendImage()` 方法的实现
- [ ] 检查 `worktoolService.sendTextMessage()` 方法是否存在
- [ ] 检查 `robot-command.api.js` 的所有端点
- [ ] 检查 `qa.api.js` 的所有端点
- [ ] 创建符合规范的API路由文件
- [ ] 测试所有API端点
- [ ] 更新API文档

---

**文档生成时间**: 2026年2月9日
**文档版本**: v1.1
**检查人员**: WorkTool AI 系统管理员
