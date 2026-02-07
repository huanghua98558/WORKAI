# 流程引擎节点配置指南

## 目录

- [概述](#概述)
- [节点类型](#节点类型)
- [核心配置功能](#核心配置功能)
- [节点详细配置](#节点详细配置)
- [最佳实践](#最佳实践)

---

## 概述

流程引擎包含14种节点类型，每种节点都有特定的功能。通过配置节点的各种属性，可以实现灵活的业务逻辑编排。

### 核心能力

1. **业务角色感知**：自动识别业务角色并应用相应的配置
2. **AI行为感知**：根据AI行为模式智能调整处理策略
3. **工作人员感知**：检测工作人员状态并优化流程执行
4. **优先级智能检测**：自动判断消息优先级
5. **任务创建感知**：自动创建和分配任务

---

## 节点类型

### 基础节点（2个）

| 节点类型 | 说明 | 分类 |
|---------|------|------|
| 消息接收节点 | 接收WorkTool消息并保存到数据库 | basic |
| 结束节点 | 流程结束点，可配置返回消息和清理操作 | basic |

### AI节点（2个）

| 节点类型 | 说明 | 分类 |
|---------|------|------|
| 意图识别节点 | 使用AI识别用户消息的意图 | ai |
| AI回复节点 | 使用大语言模型生成智能客服回复 | ai |

### 逻辑节点（2个）

| 节点类型 | 说明 | 分类 |
|---------|------|------|
| 决策节点 | 根据条件判断后续流程分支 | logic |
| 消息分发节点 | 判断群发或私发，确定消息发送目标 | logic |

### 操作节点（3个）

| 节点类型 | 说明 | 分类 |
|---------|------|------|
| 发送指令节点 | 调用WorkTool API发送消息或指令 | action |
| 机器人分发节点 | 将消息分发给指定的机器人处理 | action |
| 执行通知节点 | 通过多种渠道发送通知 | action |

### 数据库节点（1个）

| 节点类型 | 说明 | 分类 |
|---------|------|------|
| 指令状态节点 | 保存指令执行状态到数据库 | database |

### 告警节点（2个）

| 节点类型 | 说明 | 分类 |
|---------|------|------|
| 告警入库节点 | 保存告警信息到数据库 | alert |
| 告警规则节点 | 判断告警规则并执行升级操作 | alert |

### 风险节点（2个）

| 节点类型 | 说明 | 分类 |
|---------|------|------|
| 风险处理节点 | AI安抚用户并通知人工介入 | risk |
| 监控节点 | 实时监听群内消息 | risk |

---

## 核心配置功能

### 1. 业务角色感知配置

#### 功能说明
根据群组名称或用户信息自动提取业务角色，并应用角色特定的配置。

#### 配置项

```typescript
{
  // 业务角色模式
  businessRoleMode: 'global' | 'per_role',

  // 是否允许角色配置覆盖全局配置
  enableRoleOverride: boolean,

  // 角色映射规则
  roleMapping: string,
}
```

#### 配置示例

```javascript
{
  businessRoleMode: 'per_role',
  enableRoleOverride: true,
  roleMapping: `
    售后:包含'售后','客服','支持'字样
    营销:包含'营销','推广','销售'字样
    技术:包含'技术','开发','研发'字样
  `
}
```

#### 适用节点
- 意图识别节点
- 消息接收节点
- 消息分发节点
- 决策节点

---

### 2. AI行为感知配置

#### 功能说明
根据AI行为模式智能调整处理策略，支持全自动、半自动和仅记录三种模式。

#### 配置项

```typescript
{
  // 是否启用AI行为触发
  enableAIBehaviorTrigger: boolean,

  // 默认AI行为模式
  defaultAIBehaviorMode: 'full_auto' | 'semi_auto' | 'record_only',

  // AI行为触发条件
  aiBehaviorTrigger: {
    enableImmediateAction: boolean,
    requireHumanApproval: boolean,
    autoEscalate: boolean,
  },

  // 优先级规则
  enablePriorityBasedDecision: boolean,
  priorityRules: {
    high: {
      branch: string,
      aiBehaviorMode: 'full_auto' | 'semi_auto' | 'record_only',
    },
    medium: { /* 同上 */ },
    low: { /* 同上 */ },
  },
}
```

#### AI行为模式说明

| 模式 | 说明 | 适用场景 |
|-----|------|---------|
| full_auto | AI自动处理，无需人工干预 | 标准场景、快速响应 |
| semi_auto | AI初步处理，关键操作需人工审批 | 复杂场景、需监督 |
| record_only | 仅记录信息，不执行操作 | 审计场景、信息采集 |

#### 适用节点
- 决策节点
- 发送指令节点
- 风险处理节点
- AI回复节点

---

### 3. 工作人员感知配置

#### 功能说明
检测工作人员在线状态，并根据状态调整流程执行策略。

#### 配置项

```typescript
{
  // 工作人员在线检测模式
  staffOnlineCheck: 'disabled' | 'skip_if_online' | 'priority_if_online',

  // 重试策略
  staffRetryStrategy: {
    mode: 'standard' | 'staff_aware' | 'smart',
    skipIfStaffOnline: boolean,
    staffOnlineCheckTimeout: number, // 秒
  },

  // 在线检测超时
  staffOnlineCheckTimeout: number,
}
```

#### 在线检测模式说明

| 模式 | 说明 | 行为 |
|-----|------|------|
| disabled | 禁用检测 | 不检测工作人员状态 |
| skip_if_online | 在线时跳过 | 工作人员在线时跳过某些操作 |
| priority_if_online | 在线时优先 | 工作人员在线时优先处理 |

#### 适用节点
- 消息分发节点
- 发送指令节点
- 消息接收节点

---

### 4. 优先级智能检测配置

#### 功能说明
根据消息内容和业务角色自动判断消息优先级。

#### 配置项

```typescript
{
  // 是否启用智能优先级检测
  enableSmartPriorityDetection: boolean,

  // 优先级关键词
  priorityKeywords: {
    high: string, // 高优先级关键词，逗号分隔
    low: string,  // 低优先级关键词，逗号分隔
  },

  // 优先级分发规则
  enablePriorityDispatch: boolean,
  priorityRules: {
    high: { targetNodeId: string },
    medium: { targetNodeId: string },
    low: { targetNodeId: string },
  },
}
```

#### 配置示例

```javascript
{
  enableSmartPriorityDetection: true,
  priorityKeywords: {
    high: '紧急,投诉,问题,故障,严重',
    low: '闲聊,问候,谢谢,你好',
  }
}
```

#### 适用节点
- 消息接收节点
- 消息分发节点
- 决策节点

---

### 5. 任务创建感知配置

#### 功能说明
自动创建处理任务并分配给相关人员，支持任务创建能力配置。

#### 配置项

```typescript
{
  // 是否启用任务创建
  enableTaskCreation: boolean,

  // 任务配置
  taskConfig: {
    priority: 'high' | 'medium' | 'low',
    assignee: string,
    deadline: number, // 秒
  },

  // 自动创建配置
  autoCreate: boolean,
  taskTemplate: string,
  defaultAssignee: string,
}
```

#### 适用节点
- 风险处理节点
- 告警入库节点
- 消息分发节点

---

### 6. 日志策略配置

#### 功能说明
配置业务角色日志和AI行为日志的记录策略。

#### 配置项

```typescript
{
  // 业务角色日志策略
  roleLogStrategy: 'global' | 'per_role' | 'mixed',
  enableRoleFilter: boolean,

  // AI行为日志策略
  logAIBehavior: boolean,
  logBehaviorMode: boolean,
  logExecutionTime: boolean,
  logConfidence: boolean,
}
```

#### 适用节点
- 指令状态节点
- 消息接收节点
- 所有需要日志记录的节点

---

### 7. 人设配置

#### 功能说明
为AI回复配置不同的人设和语调，支持人设覆盖和AI行为响应策略。

#### 配置项

```typescript
{
  // 是否允许人设配置覆盖全局配置
  enablePersonaOverride: boolean,

  // 默认语调
  defaultPersonaTone: 'formal' | 'casual' | 'friendly' | 'professional',

  // AI行为响应策略
  aiBehaviorResponse: {
    full_auto: {
      enableAutoReply: boolean,
      requireApproval: boolean,
      autoConfidenceThreshold: number,
    },
    semi_auto: { /* 同上 */ },
    record_only: { /* 同上 */ },
  },
}
```

#### 语调说明

| 语调 | 说明 | 适用场景 |
|-----|------|---------|
| formal | 正式 | 商务沟通、技术支持 |
| casual | 轻松 | 日常交流、用户互动 |
| friendly | 友好 | 客户服务、咨询回复 |
| professional | 专业 | 专业咨询、技术解答 |

#### 适用节点
- AI回复节点
- 意图识别节点

---

## 节点详细配置

### 消息接收节点

#### 功能
接收WorkTool消息并保存到数据库，提取消息元数据。

#### 核心配置

```typescript
{
  // 数据保存配置
  saveToDatabase: boolean,
  saveToContext: boolean,

  // 字段提取配置
  extractFields: {
    messageId: boolean,
    sessionId: boolean,
    userName: boolean,
    groupName: boolean,
    roomType: boolean,
    atMe: boolean,
  },

  // WebSocket推送配置
  enableWebSocketPush: boolean,
  pushTarget: 'panel1' | 'panel2' | 'both',

  // 业务角色提取配置
  extractBusinessRole: boolean,
  roleMapping: string,

  // 优先级智能检测
  enableSmartPriorityDetection: boolean,
  priorityKeywords: {
    high: string,
    low: string,
  },

  // 工作人员状态记录
  trackStaffActivity: boolean,
}
```

#### 使用场景
- 消息入口
- 数据采集
- 实时监控

---

### 意图识别节点

#### 功能
使用AI识别用户消息的意图（咨询、投诉、售后等）。

#### 核心配置

```typescript
{
  // AI模型选择
  modelId: string,

  // 置信度阈值
  confidenceThreshold: number,

  // 默认意图
  fallbackIntent: string,

  // 支持的意图列表
  supportedIntents: string[],

  // 上下文保存
  saveToContext: boolean,
  contextKey: string,

  // 自定义提示词
  systemPrompt: string,

  // 业务角色感知配置
  businessRoleMode: 'global' | 'per_role',
  enableRoleOverride: boolean,
  fallbackIntentBehavior: string,
}
```

#### 使用场景
- 意图分析
- 消息分类
- 自动路由

---

### 决策节点

#### 功能
根据条件判断后续流程分支。

#### 核心配置

```typescript
{
  // 决策模式
  decisionMode: 'priority' | 'all' | 'any',

  // 默认分支
  defaultTarget: string,

  // 决策条件
  conditions: [
    {
      label: string,
      expression: string,
      targetNodeId: string,
    }
  ],

  // 高级配置
  enableLogging: boolean,
  strictMode: boolean,

  // AI行为感知配置
  enableAIBehaviorTrigger: boolean,
  defaultAIBehaviorMode: 'full_auto' | 'semi_auto' | 'record_only',
  enablePriorityBasedDecision: boolean,
  priorityRules: {
    high: { branch: string, aiBehaviorMode: string },
    medium: { /* 同上 */ },
    low: { /* 同上 */ },
  },
}
```

#### 使用场景
- 条件分支
- 优先级判断
- 智能路由

---

### AI回复节点

#### 功能
使用大语言模型生成智能客服回复。

#### 核心配置

```typescript
{
  // AI模型选择
  modelId: string,

  // 人设选择
  personaId: string,

  // 生成参数
  temperature: number,
  maxTokens: number,

  // 上下文配置
  useContextHistory: boolean,
  contextWindowSize: number,

  // 高级功能
  enableThinking: boolean,

  // 系统提示词
  systemPrompt: string,

  // 人设配置
  enablePersonaOverride: boolean,
  defaultPersonaTone: string,
  aiBehaviorResponse: {
    full_auto: { enableAutoReply, requireApproval, autoConfidenceThreshold },
    semi_auto: { /* 同上 */ },
    record_only: { /* 同上 */ },
  },
}
```

#### 使用场景
- 智能客服
- 自动回复
- 内容生成

---

### 消息分发节点

#### 功能
判断群发或私发模式，确定消息发送目标。

#### 核心配置

```typescript
{
  // 群发配置
  groupDispatch: {
    enabled: boolean,
    targetNameSource: 'context' | 'custom',
  },

  // 私发配置
  privateDispatch: {
    enabled: boolean,
    targetNameSource: 'context' | 'custom',
  },

  // @机器人配置
  atMe: {
    requireAtMe: boolean,
    onNotAtMe: 'ignore' | 'continue',
  },

  // 业务角色感知配置
  enableBusinessRoleDispatch: boolean,

  // 工作人员感知配置
  staffOnlineCheck: 'disabled' | 'skip_if_online' | 'priority_if_online',

  // 优先级分发规则
  enablePriorityDispatch: boolean,
  priorityRules: {
    high: { targetNodeId: string },
    medium: { targetNodeId: string },
    low: { targetNodeId: string },
  },
}
```

#### 使用场景
- 消息分发
- 目标路由
- 群组管理

---

### 发送指令节点

#### 功能
调用WorkTool API发送消息或指令。

#### 核心配置

```typescript
{
  // 指令类型
  commandType: 'message' | 'notification' | 'command',

  // 机器人ID
  robotId: string,

  // 接收者配置
  recipients: string[],
  recipientsFromContext: boolean,
  recipientsExpression: string,

  // 消息内容
  messageSource: 'ai_response' | 'fixed' | 'template' | 'custom',
  messageContent: string,
  messageTemplate: string,

  // 高级配置
  priority: 'low' | 'normal' | 'high',
  saveLog: boolean,
  enableRetry: boolean,
  retryCount: number,
  retryDelay: number,

  // @人配置
  enableAtList: boolean,
  dynamicAtListExpression: string,

  // 业务角色优先级配置
  businessRolePriority: {
    mode: 'global' | 'per_role',
    roles: {
      high: string,
      medium: string,
    },
  },

  // 工作人员重试策略
  staffRetryStrategy: {
    mode: 'standard' | 'staff_aware' | 'smart',
    skipIfStaffOnline: boolean,
    staffOnlineCheckTimeout: number,
  },

  // AI行为执行策略
  aiBehaviorExecution: {
    mode: 'auto' | 'conditional' | 'manual',
    executeOnHighConfidence: number,
    executeOnIntention: string,
  },
}
```

#### 使用场景
- 消息发送
- 指令执行
- 通知推送

---

### 指令状态节点

#### 功能
保存指令执行状态到数据库。

#### 核心配置

```typescript
{
  // 保存配置
  saveToRobotCommands: boolean,
  updateSessionMessages: boolean,

  // WebSocket推送配置
  enableWebSocketPush: boolean,
  pushTarget: 'panel1' | 'panel2' | 'both',

  // 业务角色日志策略
  roleLogStrategy: 'global' | 'per_role' | 'mixed',
  enableRoleFilter: boolean,

  // AI行为日志策略
  logAIBehavior: boolean,
  logBehaviorMode: boolean,
  logExecutionTime: boolean,
  logConfidence: boolean,
}
```

#### 使用场景
- 状态记录
- 日志保存
- 数据追踪

---

### 风险处理节点

#### 功能
AI安抚用户并通知人工介入。

#### 核心配置

```typescript
{
  // 风险等级
  riskLevel: 'critical' | 'warning' | 'info',

  // 安抚策略
  pacifyStrategy: 'immediate' | 'gentle' | 'delayed',

  // 是否通知工作人员
  notifyStaff: boolean,

  // 任务创建感知配置
  enableTaskCreation: boolean,
  taskConfig: {
    priority: 'high' | 'medium' | 'low',
    assignee: string,
    deadline: number,
  },

  // 风险等级升级策略
  escalationStrategy: 'auto' | 'manual',
  escalationRules: {
    critical: { escalateAfter: number, escalateTo: string },
    warning: { escalateAfter: number, escalateTo: string },
  },

  // AI行为风险策略
  aiBehaviorStrategy: 'full_auto' | 'semi_auto' | 'record_only',
  aiBehaviorConfig: {
    enableImmediateAction: boolean,
    requireHumanApproval: boolean,
    autoEscalate: boolean,
  },
}
```

#### 使用场景
- 风险处理
- 投诉处理
- 异常处理

---

### 告警入库节点

#### 功能
保存告警信息到数据库。

#### 核心配置

```typescript
{
  // 告警类型
  alertType: 'intent' | 'keyword' | 'frequency' | 'custom',

  // 意图类型
  intentType: string,

  // 告警级别
  alertLevel: 'critical' | 'warning' | 'info',

  // 关键词列表
  keywords: string[],

  // 告警级别配置
  alertLevelConfig: {
    critical: {
      autoEscalate: boolean,
      escalateAfter: number,
      notifyChannels: string[],
    },
    warning: { /* 同上 */ },
  },

  // 任务创建能力
  enableTaskCreation: boolean,
  taskCreationConfig: {
    autoCreate: boolean,
    taskTemplate: string,
    defaultAssignee: string,
  },
}
```

#### 使用场景
- 告警记录
- 风险监控
- 异常追踪

---

### 监控节点

#### 功能
实时监听群内消息，支持关键词和风险检测。

#### 核心配置

```typescript
{
  // 监控关键词
  keywords: string[],

  // 风险检测
  enableRiskDetection: boolean,

  // 自动告警
  enableAutoAlert: boolean,

  // 业务角色关键词感知
  businessRoleKeywords: {
    [roleId: string]: string[],
  },
}
```

#### 使用场景
- 实时监控
- 风险检测
- 自动告警

---

### 结束节点

#### 功能
流程结束点，可配置返回消息和清理操作。

#### 核心配置

```typescript
{
  // 会话保存
  saveSession: boolean,

  // 数据统计上报
  saveStatistics: boolean,

  // 后续动作触发
  triggerNextAction: boolean,

  // 返回消息
  returnMessage: string,

  // 清理操作
  cleanupContext: boolean,
}
```

#### 使用场景
- 流程结束
- 数据保存
- 统计上报

---

## 最佳实践

### 1. 配置优先级

1. **优先使用业务角色感知**：减少重复配置，提高灵活性
2. **合理设置AI行为模式**：根据场景选择全自动、半自动或仅记录
3. **启用工作人员感知**：优化资源使用，避免重复通知

### 2. 性能优化

1. **避免过度复杂配置**：保持配置简洁明了
2. **合理使用日志记录**：避免记录过多无关信息
3. **设置合理的超时时间**：防止流程长时间阻塞

### 3. 安全考虑

1. **启用人工审批**：对关键操作要求人工确认
2. **设置合理的置信度阈值**：避免AI误判
3. **配置权限控制**：确保任务分配给合适的人员

### 4. 可维护性

1. **使用清晰的配置命名**：便于理解和维护
2. **添加配置注释**：说明配置的目的和影响
3. **定期审查配置**：根据业务变化调整配置

---

## 附录

### 业务角色列表

详见 `src/app/flow-engine/config/business-roles.ts`

### AI模型列表

- doubao-pro-4k（推荐）
- doubao-pro-32k
- doubao-pro-128k
- deepseek-chat
- deepseek-coder
- kimi-moonshot-v1-8k
- kimi-moonshot-v1-32k

### 优先级级别

- 高优先级（high）：紧急处理，立即响应
- 中优先级（medium）：正常处理，尽快响应
- 低优先级（low）：非紧急，可稍后处理

---

## 更新日志

- **2026-02-07**: 新增业务角色感知、AI行为感知、工作人员感知等核心配置功能
