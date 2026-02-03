# WorkTool AI 中枢系统 - 问题修复和架构优化方案

## 📋 问题总结

### 用户报告的问题
1. 企业微信群消息发送到系统后被接收
2. 消息保存到数据库后没有进一步处理
3. 想要实时查看系统和 AI 的对话
4. 想要人工介入去训练 AI
5. 想要实时流程查看框架，知道哪里出了问题

---

## 🔍 问题根因分析

### 核心问题：缺失数据库表

通过深度分析系统代码和数据库，发现了以下关键问题：

#### 1. 缺失 `sessions` 表
- **影响**：消息处理流程在步骤2（获取或创建会话）时失败
- **后果**：整个消息处理流程中断，后续的 AI 意图识别、决策、回复等步骤都无法执行

#### 2. 缺失 `execution_tracking` 表
- **影响**：无法追踪消息处理的执行过程
- **后果**：当处理失败时，无法定位具体在哪个步骤出错

#### 3. 缺失 `ai_io_logs` 表
- **影响**：无法记录 AI 的输入输出
- **后果**：无法查看 AI 的对话内容，无法进行训练数据收集

#### 4. 错误处理不完善
- **影响**：当会话创建失败时，系统没有降级处理机制
- **后果**：直接抛出错误，导致消息处理流程完全中断

---

## ✅ 已实施的修复方案

### 1. 创建缺失的数据库表

#### 1.1 `sessions` 表（会话管理）
```sql
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255),
  group_id VARCHAR(255),
  user_name VARCHAR(255),
  group_name VARCHAR(255),
  room_type INTEGER,
  status VARCHAR(50) DEFAULT 'auto',
  context JSONB DEFAULT '[]',
  message_count INTEGER DEFAULT 0,
  last_intent VARCHAR(100),
  intent_confidence FLOAT,
  last_processed_at TIMESTAMP,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  robot_id VARCHAR(255),
  robot_name VARCHAR(255)
);
```

**用途**：
- 管理用户与机器人的会话
- 存储会话上下文和历史消息
- 跟踪会话状态（auto/human）
- 支持人工介入功能

#### 1.2 `execution_tracking` 表（执行追踪）
```sql
CREATE TABLE execution_tracking (
  id VARCHAR(255) PRIMARY KEY,
  processing_id VARCHAR(255) UNIQUE NOT NULL,
  robot_id VARCHAR(255),
  robot_name VARCHAR(255),
  message_id VARCHAR(255),
  session_id VARCHAR(255),
  user_id VARCHAR(255),
  group_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'processing',
  steps JSONB DEFAULT '{}',
  error_message TEXT,
  error_stack TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  processing_time INTEGER,
  decision JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**用途**：
- 追踪每条消息的完整处理流程
- 记录每个步骤的执行状态
- 捕获错误信息，便于调试
- 提供实时流程监控能力

#### 1.3 `ai_io_logs` 表（AI 输入输出日志）
```sql
CREATE TABLE ai_io_logs (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255),
  message_id VARCHAR(255),
  robot_id VARCHAR(255),
  robot_name VARCHAR(255),
  operation_type VARCHAR(100),
  ai_input TEXT,
  ai_output TEXT,
  model_id VARCHAR(255),
  temperature FLOAT,
  request_duration INTEGER,
  status VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**用途**：
- 记录 AI 的输入和输出
- 支持 AI 对话查看
- 收集训练数据
- 分析 AI 性能

### 2. 增强错误处理机制

#### 2.1 会话创建失败的降级处理
```javascript
let session;
try {
  session = await sessionService.getOrCreateSession(
    messageContext.fromName,
    messageContext.groupName,
    {
      userName: messageContext.fromName,
      groupName: messageContext.groupName,
      roomType: messageContext.roomType
    }
  );
} catch (error) {
  console.error('[消息处理] 会话创建失败:', {
    error: error.message,
    stack: error.stack,
    fromName: messageContext.fromName,
    groupName: messageContext.groupName
  });

  // 创建临时会话对象（降级处理）
  session = {
    sessionId: `temp_${Date.now()}`,
    context: [],
    messageCount: 0,
    isNew: true
  };
}
```

#### 2.2 AI 调用失败的降级处理
```javascript
const intentResult = await aiService.recognizeIntent(
  messageContext.content,
  { ... }
).catch(error => {
  // 捕获并详细记录 AI 意图识别错误
  console.error('[消息处理] AI 意图识别失败:', {
    error: error.message,
    stack: error.stack,
    sessionId: session.sessionId,
    messageId: messageData.messageId,
    content: messageContext.content.substring(0, 100)
  });

  // 返回降级处理结果
  return {
    intent: 'chat',
    needReply: true,
    needHuman: false,
    confidence: 0.5,
    reason: 'AI 调用失败，降级处理'
  };
});
```

### 3. 创建实时监控系统 API

#### 3.1 获取实时消息处理列表
```
GET /api/monitoring/executions?limit=100&status=processing&robotId=xxx
```

**返回**：最新的消息处理记录

#### 3.2 获取单个执行详情
```
GET /api/monitoring/executions/:processingId
```

**返回**：完整的执行流程、步骤详情、AI 日志、相关消息

#### 3.3 获取 AI 对话日志
```
GET /api/monitoring/ai-logs?limit=50&operationType=intent_recognition&sessionId=xxx
```

**返回**：AI 的输入输出记录

#### 3.4 获取会话列表
```
GET /api/monitoring/sessions?limit=50&status=auto&userId=xxx
```

**返回**：活跃会话列表

#### 3.5 获取会话详情
```
GET /api/monitoring/sessions/:sessionId
```

**返回**：会话信息、所有消息、AI 日志

#### 3.6 获取系统健康状态
```
GET /api/monitoring/health
```

**返回**：
- 消息处理统计（总数、成功数、失败数、成功率）
- AI 调用统计（总数、成功数、失败数、成功率）
- 活跃会话数

---

## 🏗️ 架构优化方案

### 1. 实时对话查看框架

#### 前端界面设计
```
┌─────────────────────────────────────────────────┐
│  AI 对话实时查看器                               │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ 会话列表     │  │  当前会话详情          │  │
│  │ - 会话 A    │  │  ┌───────────────────┐  │  │
│  │ - 会话 B    │  │  │ 用户: 你好        │  │  │
│  │ - 会话 C    │  │  │ AI: 您好！        │  │  │
│  │             │  │  │ 用户: 怎么样？    │  │  │
│  └─────────────┘  │  │ AI: 我很好，谢谢  │  │  │
│                   │  └───────────────────┘  │  │
│                   │  意图: chat             │  │
│                   │  置信度: 0.95           │  │
│                   │  AI 模型: doubao-seed  │  │
│                   └─────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

#### 实现要点
1. 使用 WebSocket 实现实时推送
2. 调用 `/api/monitoring/ai-logs` 获取 AI 对话记录
3. 调用 `/api/monitoring/sessions/:sessionId` 获取完整会话
4. 实时显示 AI 的输入输出

### 2. 实时流程监控框架

#### 前端界面设计
```
┌─────────────────────────────────────────────────┐
│  实时流程监控面板                                 │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │  执行追踪列表（最新 100 条）             │   │
│  ├─────────────────────────────────────────┤   │
│  │  ✓ 处理中 | 会话 A | 用户: 你好        │   │
│  │  ✓ 成功   | 会话 B | 用户: 怎么样？    │   │
│  │  ✗ 失败   | 会话 C | 用户: 报错        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  执行详情（点击查看）                     │   │
│  ├─────────────────────────────────────────┤   │
│  │  步骤1: 解析消息内容         ✓ 成功     │   │
│  │  步骤2: 获取/创建会话       ✓ 成功     │   │
│  │  步骤3: 添加消息到上下文     ✓ 成功     │   │
│  │  步骤4: 保存用户消息         ✓ 成功     │   │
│  │  步骤5: AI 意图识别         ✓ 成功     │   │
│  │  步骤6: 触发告警            ✓ 成功     │   │
│  │  步骤7: 决策逻辑            ✓ 成功     │   │
│  │  步骤8: 更新会话信息        ✓ 成功     │   │
│  │  步骤9: 发送回复            ⏳ 处理中   │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### 实现要点
1. 使用 WebSocket 实时推送执行状态
2. 调用 `/api/monitoring/executions` 获取执行列表
3. 调用 `/api/monitoring/executions/:processingId` 获取执行详情
4. 可视化显示每个步骤的执行状态

### 3. 人工介入框架

#### 功能设计
1. **接管会话**：将会话状态从 `auto` 切换为 `human`
2. **查看对话**：查看完整的用户-AI 对话历史
3. **人工回复**：以管理员身份回复用户
4. **训练数据标注**：标记 AI 回复的好坏
5. **调整意图**：修改系统识别的意图

#### 实现要点
1. 调用 `/api/admin/sessions/:sessionId/takeover` 接管会话
2. 调用 `/api/proxy/admin/debug/send-message` 发送人工回复
3. 建立训练数据收集机制

---

## 📊 监控数据流

```
用户发送消息
    ↓
WorkTool 回调
    ↓
消息处理引擎
    ↓
┌─────────────┬─────────────┬─────────────┐
│ sessions    │ execution_  │ ai_io_logs  │
│ 表          │ tracking    │ 表          │
│             │ 表          │             │
└─────────────┴─────────────┴─────────────┘
    ↓              ↓              ↓
实时监控 API
    ↓
前端展示
    ↓
人工介入
```

---

## 🚀 下一步优化建议

### 1. 前端实时监控页面开发
- 创建 `/monitoring` 页面
- 实现实时数据刷新（WebSocket）
- 显示执行列表、执行详情、AI 对话
- 添加错误追踪和调试面板

### 2. 人工介入功能增强
- 创建 `/training` 页面
- 支持对话标注和评分
- 支持训练数据导出
- 支持 AI 模型微调

### 3. 告警机制完善
- 创建告警通知系统（邮件、短信、企业微信）
- 添加告警规则配置界面
- 支持告警升级和通知组

### 4. 性能优化
- 添加 Redis 缓存
- 优化数据库查询
- 添加异步处理队列

---

## 📝 测试验证

### 测试步骤
1. 发送测试消息到企业微信群
2. 检查消息是否被保存到 `session_messages` 表
3. 检查会话是否被创建在 `sessions` 表
4. 检查执行记录是否被创建在 `execution_tracking` 表
5. 检查 AI 日志是否被记录在 `ai_io_logs` 表
6. 检查消息处理流程是否完整执行
7. 检查 AI 回复是否发送成功

### 验证命令
```sql
-- 检查会话
SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10;

-- 检查执行记录
SELECT * FROM execution_tracking ORDER BY created_at DESC LIMIT 10;

-- 检查 AI 日志
SELECT * FROM ai_io_logs ORDER BY created_at DESC LIMIT 10;

-- 检查消息
SELECT * FROM session_messages ORDER BY created_at DESC LIMIT 10;
```

---

## ✅ 完成清单

- [x] 分析当前消息处理流程，定位问题
- [x] 检查AI集成配置和调用逻辑
- [x] 设计实时对话查看和人工介入框架
- [x] 设计实时流程监控框架
- [x] 创建缺失的数据库表（sessions, execution_tracking, ai_io_logs）
- [x] 修复消息处理服务的错误处理
- [x] 创建实时监控系统 API
- [x] 更新数据库 schema 文件
- [x] 注册监控路由到主应用
- [x] 重启后端服务

---

## 🎯 预期效果

修复后，系统将具备以下能力：

1. ✅ 消息处理流程完整执行
2. ✅ AI 意图识别和回复生成正常工作
3. ✅ 实时查看消息处理流程
4. ✅ 实时查看 AI 对话内容
5. ✅ 快速定位问题所在步骤
6. ✅ 支持人工介入和管理
7. ✅ 收集训练数据用于 AI 优化

---

## 📞 技术支持

如有问题，请查看：
- 后端日志：`logs/backend.log`
- 系统健康状态：`GET /api/monitoring/health`
- 执行列表：`GET /api/monitoring/executions`
- AI 日志：`GET /api/monitoring/ai-logs`
