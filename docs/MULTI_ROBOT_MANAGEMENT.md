# 多机器人管理架构说明

## 概述
系统支持管理多个 WorkTool 机器人，每个机器人都有唯一的 robotId。系统确保消息和回复都正确关联到对应的机器人，避免混淆。

## 数据库设计

### 1. robots 表
存储所有机器人的配置信息：
- `robotId`: 机器人的唯一标识符（64字符限制）
- `name`: 机器人名称
- `nickname`: 机器人昵称（从 WorkTool API 获取）
- `apiBaseUrl`: WorkTool API 基础地址
- `isActive`: 是否启用

### 2. session_messages 表
存储所有消息记录，每条消息都关联到具体的机器人：
- `sessionId`: 会话ID
- `robotId`: 关联的机器人ID
- `robotName`: 机器人名称（优先使用 nickname，其次 name，最后 robotId）
- `content`: 消息内容
- `isFromUser`: 是否来自用户
- `isFromBot`: 是否来自机器人

## 消息处理流程

### 1. 接收消息
```
WorkTool 回调 → /api/callback/message?robotId={robotId}
                ↓
         验证 robotId 参数
                ↓
      根据 robotId 查询机器人信息
                ↓
    robotService.getRobotByRobotId(robotId)
                ↓
    获取 robot 对象（包含 robotId, name, nickname）
                ↓
  messageProcessingService.processMessage(message, robot)
```

### 2. 处理消息
```
processMessage(message, robot)
        ↓
验证 robot 对象（必须有 robotId）
        ↓
获取机器人显示名称
robotDisplayName = robot.nickname || robot.name || robot.robotId
        ↓
解析消息内容（fromName, groupName, roomType）
        ↓
获取或创建会话（sessionId 基于用户和群组）
        ↓
保存用户消息到数据库
sessionMessageService.saveUserMessage(
  sessionId,
  messageContext,
  messageId,
  robot  // ✅ 传递完整的 robot 对象
)
```

### 3. 保存消息
```javascript
saveUserMessage(sessionId, messageContext, messageId, robot) {
  // 获取机器人名称：优先使用 nickname，其次 name，最后 robotId
  const robotName = robot?.nickname || robot?.name || robot?.robotId || '未知机器人';

  const message = {
    sessionId,
    robotId: robot?.robotId,
    robotName,  // ✅ 确保机器人名称不为空
    content: messageContext.content,
    // ... 其他字段
  };

  // 保存到数据库
  db.insert(sessionMessages).values(message);
}
```

### 4. 生成回复
```
AI 意图识别 → 决策是否回复 → 生成回复内容
        ↓
根据消息类型确定接收方
- 私聊（roomType = 2 或 4）：recipient = fromName
- 群聊：recipient = groupName
        ↓
发送回复
worktoolService.sendTextMessage(
  robot.robotId,  // ✅ 使用原始 robotId
  recipient,
  reply
)
        ↓
保存机器人回复
sessionMessageService.saveBotMessage(
  sessionId,
  reply,
  messageContext,
  intent,
  robot  // ✅ 传递完整的 robot 对象
)
```

### 5. 发送消息
```javascript
sendTextMessage(robotId, toName, content) {
  // ✅ 使用传入的 robotId（与接收消息时相同）
  const robot = await robotService.getRobotByRobotId(robotId);

  // 构建请求体
  const requestBody = {
    socketType: 2,
    list: [
      {
        type: 203,
        titleList: [toName],
        receivedContent: content
      }
    ]
  };

  // 发送到 WorkTool API
  axios.post(apiUrl, requestBody, {
    params: { robotId: robotId }
  });
}
```

## 多机器人隔离机制

### 1. 消息隔离
- 每条消息都记录 `robotId`
- 会话（session）基于用户和群组，不跨机器人
- 同一个用户在不同群组的消息属于不同会话

### 2. 回复隔离
- 回复时使用相同的 `robotId`
- 不会将回复发送给其他机器人
- 日志中记录 `robotId` 和 `robotDisplayName` 便于追踪

### 3. 配置隔离
- 每个机器人有独立的 `apiBaseUrl`
- 每个机器人可以独立启用/禁用
- AI 模型配置可以按机器人定制

## 避免混淆的关键点

### 1. robotId 的传递
```javascript
// ✅ 正确：robotId 从查询参数获取，贯穿整个流程
const { robotId } = request.query;
const robot = await robotService.getRobotByRobotId(robotId);
processMessage(message, robot);  // 传递完整 robot 对象

// ❌ 错误：不使用 robotId，或中途丢失
```

### 2. robot 对象的传递
```javascript
// ✅ 正确：传递完整的 robot 对象
saveUserMessage(sessionId, messageContext, messageId, robot);

// ❌ 错误：只传递 robotId 或 robotName
saveUserMessage(sessionId, messageContext, messageId, robot.robotId);
```

### 3. 机器人名称的获取
```javascript
// ✅ 正确：使用优先级获取机器人名称
const robotName = robot?.nickname || robot?.name || robot?.robotId || '未知机器人';

// ❌ 错误：只使用 name，可能导致名称为空
const robotName = robot?.name || '未知机器人';
```

### 4. 接收方的确定
```javascript
// ✅ 正确：根据消息类型确定接收方
const recipient = toType === 'single'
  ? messageContext.fromName   // 私聊：发送给发送者
  : messageContext.groupName; // 群聊：发送到群

// ❌ 错误：始终使用 groupName，私聊时无法发送
const recipient = messageContext.groupName;
```

## 日志追踪

系统在关键步骤记录日志，便于追踪消息流向：

### 1. 接收消息日志
```
[MessageProcessing] ===== 开始处理消息 =====
{
  robotId: "robot_001",
  robotName: "客服机器人",
  robotNickname: "小助手",
  robotDisplayName: "小助手",
  userId: "张三",
  groupId: "技术支持群",
  content: "如何使用系统？"
}
```

### 2. 保存消息日志
```
[SessionMessage] 准备保存用户消息
{
  sessionId: "session_001",
  robotId: "robot_001",
  robotName: "小助手",
  contentLength: 10
}

[SessionMessage] 用户消息保存成功
{
  sessionId: "session_001",
  robotId: "robot_001",
  robotName: "小助手"
}
```

### 3. 发送回复日志
```
[MessageProcessing] generateReply步骤: 开始发送回复
{
  toType: "single",
  recipient: "张三",
  robotId: "robot_001",
  replyLength: 50
}

[WorkTool] 开始发送文本消息
{
  sendId: "send-xxx",
  robotId: "robot_001",
  toName: "张三",
  contentLength: 50
}

[WorkTool] 发送消息成功
{
  sendId: "send-xxx",
  robotId: "robot_001",
  toName: "张三",
  processingTime: 150
}
```

## 故障排查

### 问题1：机器人名称显示为"未知机器人"
**原因**：
- 机器人的 name 和 nickname 都为空
- 旧数据的 robotName 字段未填充

**解决**：
- 修复后的代码会自动使用 robotId 作为 fallback
- 对于旧数据，系统会根据 robotId 从 robots 表查询最新的名称

### 问题2：消息发送到错误的机器人
**原因**：
- robotId 传递过程中丢失或被覆盖
- 使用了错误的 robotId

**解决**：
- 检查日志中的 robotId 是否一致
- 确保 robot 对象完整传递
- 使用验证机制确保 robotId 不为空

### 问题3：私聊消息无法发送
**原因**：
- 使用了 groupName 而不是 fromName 作为接收方

**解决**：
- 修复后的代码会根据 roomType 正确确定接收方
- 私聊：使用 fromName
- 群聊：使用 groupName

## 最佳实践

1. **始终传递完整的 robot 对象**
   - 包含 robotId, name, nickname 等所有字段
   - 避免中途丢失信息

2. **使用日志追踪**
   - 记录关键步骤的 robotId 和 robotName
   - 便于排查问题

3. **验证数据完整性**
   - 在保存消息前验证 robotId
   - 确保 robotName 不为空

4. **使用优先级获取名称**
   - nickname > name > robotId
   - 确保始终有可显示的名称

5. **按消息类型确定接收方**
   - 私聊和群聊使用不同的接收方
   - 避免混淆
