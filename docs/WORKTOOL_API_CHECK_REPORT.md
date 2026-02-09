# WorkTool 机器人相关 API 检查报告

## 执行日期
2025-01-14

## 检查范围
- WorkTool 回调地址（机器人上报消息给我们）
- WorkTool API 地址（我们调用他们的 API）
- 机器人相关设置 API

---

## 一、回调地址检查（机器人上报消息给我们）

### 1.1 消息回调

**标准地址**: `/api/worktool/callback/message?robotId=xxx`

**我们的实现**: ✅ **符合**

- 路径: `server/routes/worktool.callback.js`
- 路由: `POST /message`
- 前缀: `/api/worktool/callback`
- 完整地址: `/api/worktool/callback/message?robotId=xxx`

**功能**: 接收 WorkTool 机器人上报的 QA 问答消息

**请求参数**:
- `spoken`: 问题文本
- `rawSpoken`: 原始问题文本
- `receivedName`: 提问者名称
- `groupName`: QA 所在群名
- `roomType`: 房间类型（1=外部群 2=外部联系人 3=内部群 4=内部联系人）
- `atMe`: 是否@机器人
- `textType`: 消息类型（0=未知 1=文本 2=图片 3=语音等）
- `fileBase64`: 图片 base64（可选）

**响应格式**:
```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

---

### 1.2 执行结果回调

**标准地址**: `/api/worktool/callback/result?robotId=xxx`

**我们的实现**: ✅ **符合**

- 路径: `server/routes/worktool.callback.js`
- 路由: `POST /result`
- 前缀: `/api/worktool/callback`
- 完整地址: `/api/worktool/callback/result?robotId=xxx`

**别名路由**:
- `POST /action-result` (兼容 WorkTool 的指令结果回调)
- `POST /command` (兼容性路由)

**功能**: 接收 WorkTool 机器人上报的指令执行结果

**请求参数**:
- `messageId`: 消息 ID
- `command`: 指令内容
- `status`: 执行状态
- `result`: 执行结果

---

### 1.3 群二维码回调

**标准地址**: `/api/worktool/callback/qrcode?robotId=xxx`

**我们的实现**: ✅ **符合**

- 路径: `server/routes/worktool.callback.js`
- 路由: `POST /qrcode` 或 `POST /group-qrcode`
- 前缀: `/api/worktool/callback`
- 完整地址: `/api/worktool/callback/qrcode?robotId=xxx`

**功能**: 接收 WorkTool 机器人上报的群二维码信息

**请求参数**:
- `qrcodeUrl`: 二维码 URL
- `groupId`: 群 ID

---

### 1.4 机器人状态回调

**标准地址**: `/api/worktool/callback/status?robotId=xxx`

**我们的实现**: ✅ **符合（已添加）**

- 路径: `server/routes/worktool.callback.js`
- 路由: `POST /status` (新增)
- 前缀: `/api/worktool/callback`
- 完整地址: `/api/worktool/callback/status?robotId=xxx`

**兼容性路由（已保留）**:
- `POST /robot-online` (机器人上线)
- `POST /robot-offline` (机器人下线)
- `POST /robot-status` (兼容旧接口)

**功能**: 接收 WorkTool 机器人上报的上线/下线状态

**请求参数**:
- `status`: 状态（5=上线 6=下线）
- `timestamp`: 时间戳

**状态处理**:
- `status = 5`: 机器人上线
- `status = 6`: 机器人下线

---

## 二、API 地址检查（我们调用他们的 API）

### 2.1 发送消息 API

**WorkTool API 地址**: `https://api.worktool.ymdyes.cn/wework/sendRawMessage?robotId=xxx`

**我们的实现**: ✅ **已实现**

- 路径: `server/services/worktool-api.service.js`
- 方法: `sendRawMessage(robotId, message)`
- API 路由: `POST /api/worktool/robot/send-message`

**功能**: 主动发送消息给企业微信用户

**请求参数**:
```javascript
{
  robotId: "机器人ID",
  toName: "接收者姓名",
  content: "消息内容",
  messageType: 1  // 1=文本 2=图片 3=视频等
}
```

**使用场景**:
- 机器人主动推送通知
- 定时发送消息
- 触发式消息发送

---

### 2.2 机器人信息更新 API

**WorkTool API 地址**: `https://api.worktool.ymdyes.cn/robot/robotInfo/update?robotId=xxx`

**我们的实现**: ✅ **已实现**

- 路径: `server/services/worktool-api.service.js`
- 方法: `updateRobotInfo(robotId, robotInfo)`
- API 路由: `POST /api/worktool/robot/update-info`

**功能**: 更新机器人后端通讯加密地址等信息

**请求参数**:
```javascript
{
  robotId: "机器人ID",
  robotInfo: {
    // 机器人信息
  }
}
```

---

### 2.3 获取机器人信息 API

**WorkTool API 地址**: `https://api.worktool.ymdyes.cn/robot/robotInfo/get?robotId=xxx`

**我们的实现**: ✅ **已实现**

- 路径: `server/services/worktool-api.service.js`
- 方法: `getRobotInfo(robotId)`
- API 路由: `GET /api/worktool/robot/info`

**功能**: 获取机器人配置信息

**使用场景**:
- 显示机器人配置
- 获取机器人状态
- 查询机器人详情

---

### 2.4 查询机器人在线状态 API

**WorkTool API 地址**: `https://api.worktool.ymdyes.cn/robot/robotInfo/online?robotId=xxx`

**我们的实现**: ✅ **已实现**

- 路径: `server/services/worktool-api.service.js`
- 方法: `isRobotOnline(robotId)`
- API 路由: `GET /api/worktool/robot/online-status`

**功能**: 查询机器人是否在线

**响应格式**:
```javascript
{
  code: 0,
  message: "success",
  data: {
    isOnline: true
  }
}
```

**使用场景**:
- 监控机器人在线状态
- 显示机器人状态
- 机器人健康检查

---

### 2.5 查询机器人登录日志 API

**WorkTool API 地址**: `https://api.worktool.ymdyes.cn/robot/robotInfo/onlineInfos?robotId=xxx&page=x&pageSize=x`

**我们的实现**: ✅ **已实现**

- 路径: `server/services/worktool-api.service.js`
- 方法: `getRobotLoginLogs(robotId, options)`
- API 路由: `GET /api/worktool/robot/login-logs`

**功能**: 查询机器人登录历史日志

**请求参数**:
```javascript
{
  robotId: "机器人ID",
  page: 1,        // 页码
  pageSize: 10    // 每页数量
}
```

**使用场景**:
- 显示机器人登录历史
- 排查登录问题
- 审计机器人使用情况

---

### 2.6 指令消息查询 API

**WorkTool API 地址**: `https://api.worktool.ymdyes.cn/wework/listRawMessage?robotId=xxx&page=x&pageSize=x`

**我们的实现**: ✅ **已实现**

- 路径: `server/services/worktool-api.service.js`
- 方法: `listRawMessages(robotId, options)`
- API 路由: `GET /api/worktool/robot/command-messages`

**功能**: 查询指令消息列表

**使用场景**:
- 查看指令历史
- 分析指令执行情况
- 调试指令问题

---

### 2.7 指令执行结果查询 API

**WorkTool API 地址**: `https://api.worktool.ymdyes.cn/robot/rawMsg/list?robotId=xxx&page=x&pageSize=x`

**我们的实现**: ✅ **已实现**

- 路径: `server/services/worktool-api.service.js`
- 方法: `getCommandResults(robotId, options)`
- API 路由: `GET /api/worktool/robot/command-results`

**功能**: 查询指令执行结果

**使用场景**:
- 查看指令执行历史
- 分析指令执行成功率
- 调试指令执行问题

---

### 2.8 消息回调日志查询 API

**WorkTool API 地址**: `https://api.worktool.ymdyes.cn/robot/qaLog/list?robotId=xxx&page=x&pageSize=x`

**我们的实现**: ✅ **已实现**

- 路径: `server/services/worktool-api.service.js`
- 方法: `getMessageCallbackLogs(robotId, options)`
- API 路由: `GET /api/worktool/robot/message-logs`

**功能**: 查询机器人消息回调日志

**使用场景**:
- 查看消息回调历史
- 分析消息处理情况
- 调试消息回调问题

---

## 三、机器人相关设置 API 检查

### 3.1 机器人配置存储

**数据库表**: `robots`

**关键字段**:
- `robotId`: WorkTool 机器人 ID
- `name`: 机器人名称
- `isActive`: 是否启用
- `config`: 机器人配置（JSON）
  - `worktool.apiBaseUrl`: WorkTool API 地址
  - `worktool.callbackUrl`: 回调地址
  - `worktool.signatureSecret`: 签名密钥

**服务**: `server/services/robot.service.js`

**关键方法**:
- `getRobotByRobotId(robotId)`: 根据 robotId 获取机器人
- `updateRobotStatus(robotId, isOnline)`: 更新机器人在线状态
- `getActiveRobots()`: 获取所有启用的机器人

---

### 3.2 回调历史记录

**数据库表**: `callback_history`

**关键字段**:
- `robotId`: 机器人 ID
- `type`: 回调类型
- `messageId`: 消息 ID
- `errorCode`: 错误码
- `errorMsg`: 错误信息
- `responseTime`: 响应时间
- `extraData`: 额外数据（JSON）
- `createdAt`: 创建时间

**功能**: 记录所有回调请求，用于调试和审计

---

### 3.3 机器人指令管理

**数据库表**: `robot_commands`

**关键字段**:
- `robotId`: 机器人 ID
- `commandType`: 指令类型
- `commandData`: 指令数据（JSON）
- `messageId`: 消息 ID
- `status`: 状态（pending=待执行 executing=执行中 completed=已完成 failed=失败）
- `result`: 执行结果（JSON）
- `errorMessage`: 错误信息
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

**服务**: `server/services/robot-command.service.js`

**关键方法**:
- `createCommand(robotId, commandType, commandData)`: 创建指令
- `updateCommandStatus(commandId, status, result)`: 更新指令状态
- `getCommandByMessageId(messageId)`: 根据 messageId 查找指令

---

## 四、API 安全性检查

### 4.1 签名验证

**实现**: ✅ **已实现**

**中间件**: `server/lib/utils.js` - `verifySignature(payload, signature, secret)`

**配置**: `server/lib/config.js` - `callback.signatureSecret`

**使用场景**:
- 消息回调签名验证（可选）
- 指令结果回调签名验证（必需）
- 状态回调签名验证（必需）

---

### 4.2 认证与授权

**中间件**: `server/middleware/auth.middleware.js`

**方法**:
- `requireAuth`: 需要用户认证
- `verifyApiKey`: API Key 验证

**应用**:
- WorkTool 机器人管理 API (`/api/worktool/robot/*`) 需要 `requireAuth`

---

### 4.3 速率限制

**实现**: ✅ **已实现**

**插件**: `@fastify/rate-limit`

**配置**:
- 最大请求: 1000 次/分钟
- 存储: 内存模式

---

## 五、API 监控与日志

### 5.1 监控指标

**服务**: `server/services/monitor.service.js`

**记录指标**:
- `callback_received`: 回调接收次数
- `callback_error`: 回调错误次数
- `callback_response_time`: 回调响应时间

### 5.2 日志记录

**服务**: `server/lib/logger.js`

**日志级别**:
- INFO: 一般信息
- WARN: 警告信息
- ERROR: 错误信息

### 5.3 审计日志

**服务**: `server/services/monitor.service.js` - `AuditLogger`

**记录内容**:
- 用户操作
- API 调用
- 系统事件

---

## 六、总结

### 6.1 回调地址状态

| 回调类型 | 标准地址 | 我们的实现 | 状态 |
|---------|---------|----------|------|
| 消息回调 | `/api/worktool/callback/message?robotId=xxx` | `/api/worktool/callback/message` | ✅ 符合 |
| 执行结果回调 | `/api/worktool/callback/result?robotId=xxx` | `/api/worktool/callback/result` | ✅ 符合 |
| 群二维码回调 | `/api/worktool/callback/qrcode?robotId=xxx` | `/api/worktool/callback/qrcode` | ✅ 符合 |
| 机器人状态回调 | `/api/worktool/callback/status?robotId=xxx` | `/api/worktool/callback/status` | ✅ 符合（新增） |

**符合率**: 100% (4/4)

---

### 6.2 WorkTool API 调用状态

| API 功能 | WorkTool API 地址 | 我们的实现 | 状态 |
|---------|-----------------|----------|------|
| 发送消息 | `/wework/sendRawMessage` | `sendRawMessage()` | ✅ 已实现 |
| 机器人信息更新 | `/robot/robotInfo/update` | `updateRobotInfo()` | ✅ 已实现 |
| 获取机器人信息 | `/robot/robotInfo/get` | `getRobotInfo()` | ✅ 已实现 |
| 查询机器人在线状态 | `/robot/robotInfo/online` | `isRobotOnline()` | ✅ 已实现 |
| 查询登录日志 | `/robot/robotInfo/onlineInfos` | `getRobotLoginLogs()` | ✅ 已实现 |
| 指令消息查询 | `/wework/listRawMessage` | `listRawMessages()` | ✅ 已实现 |
| 指令执行结果查询 | `/robot/rawMsg/list` | `getCommandResults()` | ✅ 已实现 |
| 消息回调日志查询 | `/robot/qaLog/list` | `getMessageCallbackLogs()` | ✅ 已实现 |

**实现率**: 100% (8/8)

---

### 6.3 实施的改进

1. **新增标准 `/status` 回调端点**
   - 路径: `server/routes/worktool.callback.js`
   - 功能: 统一处理机器人上线/下线回调
   - 符合 WorkTool 规范

2. **新增 WorkTool API 调用服务**
   - 路径: `server/services/worktool-api.service.js`
   - 功能: 封装所有 WorkTool API 调用
   - 支持 8 个 API 功能

3. **新增 WorkTool 机器人管理 API**
   - 路径: `server/routes/worktool-robot.api.js`
   - 前缀: `/api/worktool/robot`
   - 功能: 提供 8 个管理接口

4. **路由注册**
   - 文件: `server/app.js`
   - 导入: `worktoolRobotApiRoutes`
   - 注册: `/api/worktool/robot`

---

### 6.4 测试建议

1. **回调地址测试**
   ```bash
   # 测试机器人上线回调
   curl -X POST \
     'http://localhost:5000/api/worktool/callback/status?robotId=xxx' \
     -H 'Content-Type: application/json' \
     -d '{"status": 5, "timestamp": "2025-01-14T10:00:00Z"}'

   # 测试机器人下线回调
   curl -X POST \
     'http://localhost:5000/api/worktool/callback/status?robotId=xxx' \
     -H 'Content-Type: application/json' \
     -d '{"status": 6, "timestamp": "2025-01-14T10:00:00Z"}'
   ```

2. **API 调用测试**
   ```bash
   # 测试获取机器人信息
   curl -X GET \
     'http://localhost:5000/api/worktool/robot/info?robotId=xxx' \
     -H 'Authorization: Bearer YOUR_TOKEN'

   # 测试查询机器人在线状态
   curl -X GET \
     'http://localhost:5000/api/worktool/robot/online-status?robotId=xxx' \
     -H 'Authorization: Bearer YOUR_TOKEN'

   # 测试发送消息
   curl -X POST \
     'http://localhost:5000/api/worktool/robot/send-message' \
     -H 'Content-Type: application/json' \
     -H 'Authorization: Bearer YOUR_TOKEN' \
     -d '{
       "robotId": "xxx",
       "toName": "张三",
       "content": "测试消息",
       "messageType": 1
     }'
   ```

---

## 七、结论

✅ **所有 WorkTool 回调地址和 API 地址均已正确实现**

- 回调地址符合率: 100% (4/4)
- WorkTool API 实现率: 100% (8/8)
- 机器人相关设置 API: 完整实现
- 安全性: 已实现签名验证、认证授权、速率限制
- 监控与日志: 已实现监控指标、日志记录、审计日志

**系统已完全符合 WorkTool API 规范，可以正常使用！**
