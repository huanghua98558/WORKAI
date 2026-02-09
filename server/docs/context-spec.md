# Context 数据规范文档

## 概述

本文档定义了 WorkTool AI 中枢系统中 Context 对象的数据结构、访问规范和使用指南。Context 对象在流程引擎中贯穿整个执行过程，用于在节点之间传递数据。

## Context 数据结构

```javascript
{
  // 核心标识
  sessionId: string,           // 会话 ID
  messageId: string,           // 消息 ID
  
  // 机器人信息（优先级：node.data.robotId > context.robotId > context.robot.robotId）
  robotId: string,             // 机器人 ID
  robotName: string,           // 机器人名称
  robot: {                     // 机器人对象
    robotId: string,
    robotName: string,
    // ... 其他机器人属性
  },
  
  // 用户信息
  userName: string,            // 用户名称
  userId: string,              // 用户 ID
  
  // 群组信息
  groupName: string,           // 群组名称
  groupId: string,             // 群组 ID
  
  // 消息信息
  message: {                   // 当前消息对象
    content: string,           // 文本内容
    spoken: string,            // 语音转文本内容
    // ... 其他消息属性
  },
  
  // 历史对话
  history: Array<{             // 历史消息列表
    role: 'user' | 'assistant' | 'system',
    content: string
  }>,
  
  // 意图识别
  intent: string,              // 当前意图
  
  // 变量存储
  variables: {                 // 自定义变量
    [key: string]: any
  },
  
  // 流程执行状态
  lastNodeType: string,        // 上一个节点类型
  flowId: string,              // 流程 ID
  
  // 协同分析结果
  collaborationDecision: {     // 人工协同决策
    shouldReply: boolean,
    reason: string,
    strategy: string,
    staffContext: object
  }
}
```

## ContextHelper 工具类

ContextHelper 提供了安全的 Context 字段访问方法，确保在多机器人环境下正确获取数据。

### 导入

```javascript
const ContextHelper = require('./server/lib/context-helper');
```

### 核心方法

#### 1. getRobotId(context, node)

获取机器人 ID，优先级：节点配置 > context.robotId > context.robot.robotId

```javascript
const robotId = ContextHelper.getRobotId(context, node);
```

**返回值**：`string` - 机器人 ID

**错误处理**：如果 robotId 不存在，会记录错误日志并抛出异常

#### 2. getRobotName(context, node)

获取机器人名称，优先级：节点配置 > context.robotName > context.robot.robotName

```javascript
const robotName = ContextHelper.getRobotName(context, node);
```

**返回值**：`string` - 机器人名称

**错误处理**：如果 robotName 不存在，会记录错误日志并抛出异常

#### 3. getMessageContent(context)

获取用户消息内容，支持多种字段

```javascript
const content = ContextHelper.getMessageContent(context);
```

**返回值**：`string` - 消息内容

**优先级**：context.message.content > context.message.spoken > context.userMessage

#### 4. getUserName(context)

获取用户名称

```javascript
const userName = ContextHelper.getUserName(context);
```

**返回值**：`string` - 用户名称

#### 5. getGroupName(context)

获取群组名称

```javascript
const groupName = ContextHelper.getGroupName(context);
```

**返回值**：`string` - 群组名称

#### 6. getSessionId(context)

获取会话 ID

```javascript
const sessionId = ContextHelper.getSessionId(context);
```

**返回值**：`string` - 会话 ID

#### 7. validate(context, requiredFields)

验证 Context 对象是否包含必需字段

```javascript
const isValid = ContextHelper.validate(context, ['sessionId', 'messageId', 'robotId']);
```

**参数**：
- `context`: Context 对象
- `requiredFields`: 必需字段数组

**返回值**：`{ valid: boolean, missing: string[] }`

#### 8. safeGet(context, path, defaultValue)

安全获取嵌套属性

```javascript
const value = ContextHelper.safeGet(context, 'robot.settings.mode', 'default');
```

**参数**：
- `context`: Context 对象
- `path`: 属性路径（使用点号分隔）
- `defaultValue`: 默认值（可选）

**返回值**：属性值或默认值

## 使用规范

### 1. 禁止直接访问 Context 字段

❌ **错误示例**：
```javascript
async handleMyNode(node, context) {
  const robotId = context.robotId;  // 直接访问
  const robotName = context.robotName;
  
  // ... 其他代码
}
```

✅ **正确示例**：
```javascript
async handleMyNode(node, context) {
  const robotId = ContextHelper.getRobotId(context, node);  // 使用 ContextHelper
  const robotName = ContextHelper.getRobotName(context, node);
  
  // ... 其他代码
}
```

### 2. 必须传入 node 参数

在调用 `getRobotId` 或 `getRobotName` 时，必须传入 `node` 参数，以确保能够读取节点配置。

❌ **错误示例**：
```javascript
const robotId = ContextHelper.getRobotId(context);  // 缺少 node 参数
```

✅ **正确示例**：
```javascript
const robotId = ContextHelper.getRobotId(context, node);  // 包含 node 参数
```

### 3. 错误处理

所有 ContextHelper 方法都会在关键字段缺失时记录错误日志。节点处理器应该捕获可能的异常。

```javascript
async handleMyNode(node, context) {
  try {
    const robotId = ContextHelper.getRobotId(context, node);
    const robotName = ContextHelper.getRobotName(context, node);
    
    // ... 业务逻辑
  } catch (error) {
    logger.error('获取机器人信息失败', { error: error.message, nodeId: node.id });
    
    return {
      success: false,
      error: '无法获取机器人信息',
      context: {
        ...context,
        lastNodeType: 'my_node',
        nodeError: error.message
      }
    };
  }
}
```

### 4. 日志记录

在关键操作处记录详细的上下文信息，便于调试和问题追踪。

```javascript
const robotId = ContextHelper.getRobotId(context, node);
const robotName = ContextHelper.getRobotName(context, node);

logger.info('节点执行信息', {
  nodeId: node.id,
  nodeType: node.type,
  robotId,
  robotName,
  sessionId: ContextHelper.getSessionId(context),
  userName: ContextHelper.getUserName(context)
});
```

## robotId 获取优先级

在多机器人环境下，robotId 可能有多个来源。ContextHelper 按以下优先级获取：

1. **节点配置**：`node.data.robotId` - 如果节点配置中指定了机器人 ID，优先使用
2. **Context 顶层**：`context.robotId` - 其次使用 Context 顶层的 robotId
3. **Robot 对象**：`context.robot.robotId` - 最后使用 robot 对象中的 robotId

```javascript
getRobotId(context, node) {
  // 优先级 1: 节点配置
  if (node?.data?.robotId) {
    logger.info(`[ContextHelper] robotId 来源: 节点配置 (${node.id})`, {
      robotId: node.data.robotId,
      nodeId: node.id
    });
    return node.data.robotId;
  }
  
  // 优先级 2: Context 顶层
  if (context?.robotId) {
    logger.info('[ContextHelper] robotId 来源: context.robotId', {
      robotId: context.robotId
    });
    return context.robotId;
  }
  
  // 优先级 3: Robot 对象
  if (context?.robot?.robotId) {
    logger.info('[ContextHelper] robotId 来源: context.robot.robotId', {
      robotId: context.robot.robotId
    });
    return context.robot.robotId;
  }
  
  // 所有来源均无效，抛出错误
  const error = new Error('无法获取 robotId：context、context.robot 和 node.data 中均未找到有效 robotId');
  logger.error('[ContextHelper] getRobotId 失败', {
    contextKeys: Object.keys(context || {}),
    hasRobot: !!context?.robot,
    nodeId: node?.id,
    nodeDataKeys: Object.keys(node?.data || {})
  });
  throw error;
}
```

## 已修改的节点列表

以下节点已按照 ContextHelper 规范进行修改：

1. **handleSendCommandNode** - 发送指令节点
   - 使用 `ContextHelper.getRobotId(context, node)` 获取机器人 ID
   - 使用 `ContextHelper.getMessageContent(context)` 获取消息内容
   - 使用 `ContextHelper.getUserName(context)` 获取用户名称
   - 使用 `ContextHelper.getGroupName(context)` 获取群组名称

2. **handleAIReplyNode** - AI 回复节点
   - 使用 `ContextHelper.getRobotId(context, node)` 获取机器人 ID
   - 使用 `ContextHelper.getRobotName(context, node)` 获取机器人名称

3. **handleAIChatNode** - AI 对话节点
   - 使用 `ContextHelper.getRobotId(context, node)` 获取机器人 ID
   - 使用 `ContextHelper.getRobotName(context, node)` 获取机器人名称

4. **handleIntentNode** - 意图识别节点
   - 使用 `ContextHelper.getMessageContent(context)` 获取用户消息
   - 使用 `ContextHelper.getRobotId(context, node)` 获取机器人 ID
   - 使用 `ContextHelper.getRobotName(context, node)` 获取机器人名称
   - 使用 `ContextHelper.getUserId(context)` 获取用户 ID
   - 使用 `ContextHelper.getUserName(context)` 获取用户名称
   - 使用 `ContextHelper.getGroupId(context)` 获取群组 ID
   - 使用 `ContextHelper.getGroupName(context)` 获取群组名称
   - 使用 `ContextHelper.getSessionId(context)` 获取会话 ID
   - 使用 `ContextHelper.getMessageId(context)` 获取消息 ID

5. **handleNotificationNode** - 通知节点
   - 使用 `ContextHelper.getRobotId(context, node)` 获取机器人 ID
   - 使用 `ContextHelper.getRobotName(context, node)` 获取机器人名称
   - 使用 `ContextHelper.getSessionId(context)` 获取会话 ID
   - 使用 `ContextHelper.getUserId(context)` 获取用户 ID
   - 使用 `ContextHelper.getUserName(context)` 获取用户名称
   - 使用 `ContextHelper.getGroupId(context)` 获取群组 ID
   - 使用 `ContextHelper.getGroupName(context)` 获取群组名称
   - 使用 `ContextHelper.getMessageContent(context)` 获取消息内容

## 已排查的节点列表

以下节点已排查，确认无需使用 ContextHelper（主要用于状态管理或服务调用，不直接访问 robotId 等关键字段）：

- handleStartNode - 开始节点
- handleEndNode - 结束节点
- handleConditionNode - 条件节点（主要用于意图判断）
- handleServiceNode - 服务节点（主要通过 parameters 传递参数）
- handleHumanHandoverNode - 人工转接节点（仅使用 context.sessionId）
- handleRiskHandlerNode - 风险处理节点（主要通过 context 传递给风险服务）
- handleMonitorNode - 监控节点（主要通过 context 传递给监控服务）
- handleMessageReceiveNode - 消息接收节点（主要用于消息处理和保存）
- handleSessionCreateNode - 会话创建节点（主要用于会话管理）
- handleEmotionAnalyzeNode - 情绪分析节点（主要用于情绪分析）
- handleDecisionNode - 决策节点（主要用于条件判断）
- handleMessageDispatchNode - 消息分发节点（主要用于消息分发）
- handleStaffInterventionNode - 工作人员干预节点（仅使用 context.sessionId）
- handleAlertSaveNode - 告警保存节点（主要用于告警保存）
- handleAlertRuleNode - 告警规则节点（主要用于规则判断）

## 测试验证

### 单元测试

```javascript
const ContextHelper = require('./server/lib/context-helper');

describe('ContextHelper', () => {
  test('getRobotId 应该从节点配置获取', () => {
    const context = { robotId: 'robot-1', robot: { robotId: 'robot-2' } };
    const node = { id: 'node-1', data: { robotId: 'robot-3' } };
    
    const result = ContextHelper.getRobotId(context, node);
    expect(result).toBe('robot-3');
  });
  
  test('getRobotId 应该从 context.robotId 获取', () => {
    const context = { robotId: 'robot-1', robot: { robotId: 'robot-2' } };
    const node = { id: 'node-1', data: {} };
    
    const result = ContextHelper.getRobotId(context, node);
    expect(result).toBe('robot-1');
  });
  
  test('getRobotId 应该从 context.robot.robotId 获取', () => {
    const context = { robot: { robotId: 'robot-2' } };
    const node = { id: 'node-1', data: {} };
    
    const result = ContextHelper.getRobotId(context, node);
    expect(result).toBe('robot-2');
  });
  
  test('getRobotId 应该在无法获取时抛出错误', () => {
    const context = {};
    const node = { id: 'node-1', data: {} };
    
    expect(() => ContextHelper.getRobotId(context, node)).toThrow();
  });
});
```

### 集成测试

测试流程引擎在多机器人环境下正确传递 robotId：

1. 创建包含多个机器人的流程
2. 在不同节点中验证 robotId 的正确性
3. 检查日志中的来源记录是否正确

## 常见问题

### Q1: 为什么不能直接访问 context.robotId？

A: 在多机器人环境下，context.robotId 可能不存在或不准确。ContextHelper 提供了统一的获取逻辑，确保在所有场景下都能正确获取 robotId，并记录来源便于调试。

### Q2: 节点配置的 robotId 优先级最高，为什么？

A: 节点配置的 robotId 允许在特定节点中覆盖默认的机器人，例如在某些特殊节点中需要使用不同的机器人发送消息。

### Q3: ContextHelper 会在 robotId 不存在时抛出错误，如何处理？

A: 可以使用 try-catch 捕获异常，或者使用 `safeGet` 方法获取嵌套属性。同时确保 Context 对象在传递到节点之前已经正确初始化。

## 版本历史

- **v1.0.0** (2024-01-XX)
  - 初始版本
  - 创建 ContextHelper 工具类
  - 修改 handleSendCommandNode、handleAIReplyNode、handleAIChatNode

## 相关文档

- [流程引擎设计文档](./flow-engine-design.md)
- [节点开发指南](./node-development-guide.md)
- [多机器人管理指南](./multi-robot-management.md)
