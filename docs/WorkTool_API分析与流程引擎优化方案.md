# WorkTool API 文档分析与流程引擎优化方案

## 📋 WorkTool API 核心能力验证

### 1. ✅ 消息接收与回调机制

**WorkTool 要求**：
- 回调必须在 **3秒内** 返回 HTTP 200，否则视为失败
- 回调内容包含：`spoken`、`rawSpoken`、`roomType`、`atMe` 等字段

**现有实现** ✅：
```javascript
// server/routes/worktool.callback.js
// 1. 立即返回成功响应
reply.send(successResponse({}, 'success'));

// 2. 使用 setImmediate 异步处理消息
(async () => {
  try {
    await handleMessageAsync(callbackData, requestId, robot);
  } catch (error) {
    // 错误处理
  }
})();
```

**验证结果**：✅ 完全符合要求

---

### 2. ✅ 机器人消息发送与控制

**WorkTool 支持的指令**：
- ✅ 发送文本（已实现）
- ✅ 发送图片/文件（需补充）
- ✅ 创建/解散群（需补充）
- ✅ 修改群/好友信息（需补充）
- ✅ 群发（已实现）
- ✅ 消息撤回（需补充）
- ✅ 获取指令执行结果（需补充）
- ✅ 查询机器人信息（已实现）

**现有实现** ✅：
```javascript
// server/services/worktool.service.js
class WorkToolService {
  async sendTextMessage(robotId, toName, content, atList = []) {
    const sendId = `send-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // ... 实现发送逻辑
    return { success: true, sendId, processingTime };
  }
  
  async sendBatchMessages(robotId, messages) {
    // ... 实现批量发送
  }
  
  async getRobotInfo(robotId) {
    // ... 实现获取机器人信息
  }
}
```

**需要补充**：
- ❌ `sendImage(robotId, toName, base64)` - 发送图片
- ❌ `sendFile(robotId, toName, fileId)` - 发送文件
- ❌ `recallMessage(robotId, messageId)` - 撤回消息
- ❌ `createCommand(robotId, command)` - 创建群
- ❌ `getCommandResult(sendId)` - 获取指令执行结果

---

### 3. ✅ 异步回调与执行结果通知

**WorkTool 机制**：
- 机器人执行指令后会**异步回调**结果到配置的回调URL
- 回调携带 `sendId` 等标识

**现有实现** ✅：
```javascript
// server/routes/worktool.callback.js
// 指令结果回调接口
fastify.post('/command', async (request, reply) => {
  const { robotId } = request.query;
  const callbackData = request.body;
  
  // TODO: 处理指令结果（记录到数据库、触发后续流程等）
  // await robotCommandService.updateSendStatus(callbackData.sendId, callbackData.status);
  
  reply.send(successResponse({}, 'success'));
});
```

**问题**：❌ **TODO 未实现**，需要补充指令状态更新逻辑

---

### 4. ✅ 机器人回调配置

**WorkTool 要求**：
- 需要通过 API 配置回调 URL
- POST `robot/robotInfo/update` 配置回调地址

**现有实现**：❌ **未实现**

需要补充：
```javascript
async updateRobotCallbackUrl(robotId, callbackUrl) {
  // 调用 WorkTool API 配置回调URL
  const robot = await robotService.getRobotByRobotId(robotId);
  const baseUrl = robot.apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
  const apiUrl = `${baseUrl}/wework/robot/robotInfo/update`;
  
  const response = await axios.post(apiUrl, {
    robotId,
    callbackUrl: callbackUrl
  });
  
  return response.data;
}
```

---

### 5. ✅ 调用频率和限制

**WorkTool 限制**：
- 默认限制约 **60次/分钟**（≈ 1次/秒）
- 超出限制会返回 429 错误

**现有实现**：❌ **未实现限流**

需要补充：
```javascript
// 使用令牌桶算法实现限流
class RateLimiter {
  constructor(rate = 60, per = 60000) {
    this.rate = rate;          // 速率（60次）
    this.per = per;            // 时间窗口（60000ms）
    this.allowance = rate;     // 当前允许的请求数
    this.lastCheck = Date.now();
  }
  
  async acquire() {
    const now = Date.now();
    const timePassed = now - this.lastCheck;
    
    // 恢复允许的请求数
    this.allowance += timePassed * (this.rate / this.per);
    
    if (this.allowance > this.rate) {
      this.allowance = this.rate;
    }
    
    if (this.allowance < 1) {
      // 超过限制，等待
      const waitTime = (1 - this.allowance) * (this.per / this.rate);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquire();
    }
    
    this.allowance--;
    this.lastCheck = now;
    return true;
  }
}

// 在 sendTextMessage 中使用
async sendTextMessage(robotId, toName, content, atList = []) {
  await this.rateLimiter.acquire();
  // ... 发送逻辑
}
```

---

## 🎯 WorkTool API 对设计方案的优化建议

### 优化1：消息回调格式标准化

**WorkTool 字段映射**：

| WorkTool 字段 | 内部字段 | 说明 |
|--------------|---------|------|
| `spoken` | `originalMessage` | 消息内容 |
| `rawSpoken` | `rawMessage` | 原始消息内容 |
| `receivedName` | `userName` | 发送者名称 |
| `groupName` | `groupName` | 群名称 |
| `roomType` | `roomType` | 房间类型（1=外部群 2=外部联系人 3=内部群 4=内部联系人） |
| `atMe` | `atMe` | 是否@机器人 |
| `textType` | `textType` | 消息类型（0=未知 1=文本 2=图片 3=语音） |
| `fileBase64` | `fileBase64` | 图片base64（可选） |

**现有实现** ✅：
```javascript
// server/routes/worktool.callback.js
const message = {
  messageId: requestId,
  spoken: callbackData.spoken,
  rawSpoken: callbackData.rawSpoken,
  fromName: callbackData.receivedName,
  groupName: callbackData.groupName,
  roomType: callbackData.roomType,
  atMe: callbackData.atMe,
  textType: callbackData.textType,
  fileBase64: callbackData.fileBase64,
  timestamp: new Date().toISOString()
};
```

**验证结果**：✅ 完全符合映射

---

### 优化2：指令发送 + 执行结果确认分离处理

**推荐模式**：
1. `send_command` 节点 → 调用 WorkTool 发送接口
2. WorkTool 异步回调执行结果 → 更新 `robotCommands` 表
3. `command_status` 节点 → 从 DB 读取状态并驱动下一步流程

**现有实现**：
- ✅ `sendTextMessage` 已实现，返回 `sendId`
- ❌ 指令回调处理未完成（TODO）
- ❌ `command_status` 节点未实现

**需要补充**：
```javascript
// 1. 指令回调处理
fastify.post('/command', async (request, reply) => {
  const { robotId } = request.query;
  const callbackData = request.body;
  
  // 更新指令状态
  await robotCommandService.updateSendStatus(
    callbackData.sendId,
    callbackData.status,
    callbackData.result
  );
  
  // WebSocket推送
  await websocketService.push('panel2', {
    type: 'command_result',
    data: {
      sendId: callbackData.sendId,
      status: callbackData.status,
      result: callbackData.result
    }
  });
  
  reply.send(successResponse({}, 'success'));
});

// 2. command_status 节点实现
async handleCommandStatusNode(node, context) {
  const { sendId } = context;
  
  // 从数据库查询指令状态
  const command = await robotCommandService.getCommandBySendId(sendId);
  
  return {
    success: true,
    context: {
      ...context,
      commandStatus: command.status,
      commandResult: command.result
    }
  };
}
```

---

### 优化3：接口限流 & 重试机制内置

**WorkTool 限制**：
- 60次/分钟（≈ 1次/秒）
- 超出返回 429 错误

**现有实现**：❌ **未实现**

**需要补充**：
```javascript
class WorkToolService {
  constructor() {
    // 限流器（每个机器人独立限流）
    this.rateLimiters = new Map();
    
    // 获取或创建限流器
    this.getRateLimiter(robotId) {
      if (!this.rateLimiters.has(robotId)) {
        this.rateLimiters.set(robotId, new RateLimiter(60, 60000));
      }
      return this.rateLimiters.get(robotId);
    }
  }
  
  async sendTextMessage(robotId, toName, content, atList = [], retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 2000;
    
    try {
      // 限流
      const rateLimiter = this.getRateLimiter(robotId);
      await rateLimiter.acquire();
      
      // 发送请求
      const response = await axios.post(apiUrl, requestBody, {
        timeout: 10000
      });
      
      return { success: true, sendId, data: response.data };
    } catch (error) {
      // 429错误：重试
      if (error.response?.status === 429 && retryCount < maxRetries) {
        console.log('触发限流，等待后重试', { retryCount, robotId });
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.sendTextMessage(robotId, toName, content, atList, retryCount + 1);
      }
      
      throw error;
    }
  }
}
```

---

### 优化4：命令与执行结果辨识（sendId 追踪）

**WorkTool 说明**：
- 同一个 `messageId` 可能被拆成多条链路执行
- 回调可能触发一次或多次

**推荐方案**：
1. 在 `send_command` 节点生成唯一业务 `sendId`
2. 把 `sendId` 存入 `robotCommands` 表
3. 回调时根据 `sendId` 匹配并更新执行结果

**现有实现**：
- ✅ `sendTextMessage` 已生成 `sendId`
- ❌ 需要保存到 `robotCommands` 表

**需要补充**：
```javascript
// send_command 节点实现
async handleSendCommandNode(node, context) {
  const { data } = node;
  const robotId = context.robotId;
  
  // 获取消息内容
  const messageContent = context.aiResponse || data.fixedMessage || '';
  
  // 调用 WorkTool 服务
  const sendResult = await worktoolService.sendTextMessage(
    robotId,
    context.targetName || context.userName,
    messageContent,
    []
  );
  
  // 保存指令记录到 robotCommands 表
  if (sendResult.success) {
    await robotCommandService.saveCommand({
      robotId,
      commandType: 'sendMessage',
      targetName: context.targetName,
      messageContent,
      status: 'pending',
      sendId: sendResult.sendId,
      sessionId: context.sessionId,
      messageId: context.messageId,
      createdAt: new Date()
    });
  }
  
  return {
    success: sendResult.success,
    context: {
      ...context,
      sendId: sendResult.sendId,
      commandStatus: 'pending'
    }
  };
}
```

---

### 优化5：正式生产环境必须考虑文件类型消息

**WorkTool 支持**：
- 图片问答
- 文件上传处理
- 语音处理

**需要补充**：
```javascript
// 1. 消息接收节点支持文件类型
async handleMessageReceiveNode(node, context, input) {
  const messageContext = {
    // ... 其他字段
    textType: input.textType,
    fileBase64: input.fileBase64
  };
  
  // 保存文件（如果有）
  if (input.fileBase64) {
    const fileUrl = await storageService.saveFile(input.fileBase64);
    messageContext.fileUrl = fileUrl;
  }
  
  return { success: true, context: messageContext };
}

// 2. 发送图片节点
async handleSendImageNode(node, context) {
  const { data } = node;
  const imageBase64 = data.imageBase64 || context.fileBase64;
  
  const sendResult = await worktoolService.sendImage(
    context.robotId,
    context.targetName,
    imageBase64
  );
  
  return { success: true, context: { ...context, sendId: sendResult.sendId } };
}
```

---

## 🔧 统一 Context 标准格式（基于 WorkTool 回调）

```typescript
interface StandardContext {
  // ============ 机器人识别信息 ============
  robotId: string;              // 机器人ID
  robotName: string;            // 机器人名称

  // ============ 会话信息 ============
  sessionId: string;            // 会话ID
  messageId: string;            // 消息ID

  // ============ 用户信息 ============
  userId: string;               // 用户ID
  userName: string;             // 用户名（receivedName）

  // ============ 群组信息 ============
  groupId?: string;             // 群组ID
  groupName?: string;           // 群组名称
  groupRemark?: string;         // 群组备注名
  roomType: number;             // 房间类型（1=外部群 2=外部联系人 3=内部群 4=内部联系人）
  isGroup: boolean;             // 是否群聊

  // ============ 消息信息 ============
  originalMessage: string;      // 消息内容（spoken）
  rawMessage: string;           // 原始消息内容（rawSpoken）
  textType: number;             // 消息类型（0=未知 1=文本 2=图片 3=语音）
  fileBase64?: string;          // 文件base64
  atMe: boolean;                // 是否@机器人

  // ============ AI识别结果 ============
  intent?: string;              // 意图类型
  intentConfidence?: number;    // 意图置信度
  aiResponse?: string;          // AI回复内容

  // ============ 指令信息 ============
  targetName?: string;          // 发送目标
  sendId?: string;              // 发送ID
  commandStatus?: string;       // 指令状态

  // ============ 执行元数据 ============
  executionPath: string[];      // 执行路径
  startTime: number;            // 开始时间
  currentNodeId: string;        // 当前节点ID
  variables: Record<string, any>; // 自定义变量
}
```

---

## 📦 WorkTool Service 统一封装（推荐）

```javascript
class WorkToolService {
  // ============ 消息发送 ============
  
  /**
   * 发送文本消息
   */
  async sendText(robotId, target, content, atList = []) {}
  
  /**
   * 发送图片
   */
  async sendImage(robotId, target, base64) {}
  
  /**
   * 发送文件
   */
  async sendFile(robotId, target, fileId) {}
  
  /**
   * 批量发送
   */
  async sendBatch(robotId, messages) {}
  
  // ============ 群组管理 ============
  
  /**
   * 创建群
   */
  async createGroup(robotId, groupName, memberNames) {}
  
  /**
   * 解散群
   */
  async dismissGroup(robotId, groupName) {}
  
  /**
   * 修改群信息
   */
  async updateGroupInfo(robotId, groupName, info) {}
  
  /**
   * 修改好友信息
   */
  async updateFriendInfo(robotId, userName, info) {}
  
  // ============ 消息管理 ============
  
  /**
   * 撤回消息
   */
  async recallMessage(robotId, messageId) {}
  
  /**
   * 获取指令执行结果
   */
  async getCommandResult(sendId) {}
  
  // ============ 机器人信息 ============
  
  /**
   * 获取机器人信息
   */
  async getRobotInfo(robotId) {}
  
  /**
   * 获取机器人在线状态
   */
  async getOnlineStatus(robotId) {}
  
  // ============ 回调配置 ============
  
  /**
   * 更新机器人回调URL
   */
  async updateCallbackUrl(robotId, callbackUrl) {}
}
```

---

## ✅ 总结

### 现有实现验证

| 功能 | 状态 | 说明 |
|------|------|------|
| 消息回调（3秒响应） | ✅ 已实现 | 立即返回HTTP 200，异步处理 |
| WorkTool参数映射 | ✅ 已实现 | 完全符合字段映射 |
| 流程引擎执行 | ✅ 已实现 | 优先使用流程引擎处理消息 |
| 幂等性检查 | ✅ 已实现 | 防止重复处理 |
| 指令发送（文本） | ✅ 已实现 | sendTextMessage |
| 指令发送（批量） | ✅ 已实现 | sendBatchMessages |
| 获取机器人信息 | ✅ 已实现 | getRobotInfo |

### 需要补充

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 指令回调处理 | P0 | 更新robotCommands表状态 |
| 11种节点处理器 | P0 | 实现完整的节点逻辑 |
| 接口限流 | P0 | 60次/分钟限制 |
| 指令状态记录节点 | P1 | 从DB读取指令状态 |
| 发送图片/文件 | P1 | 扩展WorkTool Service |
| 更新机器人回调URL | P2 | 配置回调地址 |
| 群组管理API | P2 | 创建/解散群等 |

### 下一步行动计划

1. **立即执行**（P0）：
   - ✅ 完成指令回调处理逻辑
   - ✅ 实现11种节点处理器
   - ✅ 添加接口限流机制

2. **近期完成**（P1）：
   - ✅ 实现指令状态记录节点
   - ✅ 扩展WorkTool Service（图片/文件）

3. **后期优化**（P2）：
   - ✅ 实现群组管理API
   - ✅ 添加机器人回调URL配置

---

## 🎉 结论

**WorkTool API 文档对我们的设计方案有极大的帮助**：

1. ✅ **验证了设计的正确性**：
   - 统一上下文传递机制 ✅
   - 异步回调机制 ✅
   - sendId 追踪机制 ✅

2. ✅ **发现了需要补充的功能**：
   - 指令回调处理（TODO）
   - 接口限流
   - 11种节点处理器
   - 文件类型消息支持

3. ✅ **提供了具体的实现指导**：
   - 字段映射规则
   - 回调URL配置
   - 限流策略
   - 重试机制

**现有系统已经实现了核心架构**，现在需要：
1. 补充11种节点处理器
2. 完善指令回调处理
3. 添加接口限流
4. 扩展WorkTool Service

感谢提供的WorkTool API文档！这让我们能够更准确地实现流程引擎。🚀
