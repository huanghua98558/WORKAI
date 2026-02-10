# WorkTool机器人AI集成完整流程示例

## 📊 消息流程全景图

```
┌─────────────────────────────────────────────────────────────────┐
│                    WorkTool机器人消息完整流程                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1] 用户发送消息                                                │
│      │                                                         │
│      ▼                                                         │
│  企业微信平台                                                   │
│      │                                                         │
│      ▼ (Webhook POST)                                          │
│  WorkTool 回调接口                                              │
│  /api/worktool/callback/message?robotId=wt22phhjpt2xboerspxsote472xdnyq2│
│      │                                                         │
│      ├─▶ 机器人验证                                            │
│      │   └─▶ robotId: wt22phhjpt2xboerspxsote472xdnyq2           │
│      │   └─▶ robotName: 潘语欣                                 │
│      │   └─▶ apiBaseUrl: https://api.worktool.com/wework       │
│      │                                                         │
│      ├─▶ 保存消息到数据库                                      │
│      │                                                         │
│      ├─▶ AI分析（新增）                                        │
│      │   │                                                     │
│      │   └─▶ RobotAIService.analyze(robot, message, context)  │
│      │       │                                                 │
│      │       ├─▶ 意图识别                                      │
│      │       │   └─▶ result: after_sales_scan_qrcode          │
│      │       │                                                 │
│      │       ├─▶ 情感分析                                      │
│      │       │   └─▶ result: neutral (0.5)                     │
│      │       │                                                 │
│      │       ├─▶ 生成回复建议                                   │
│      │       │   └─▶ content: "您好，请点击链接进行扫码..."     │
│      │       │   └─▶ replyType: group_at_user                  │
│      │       │   └─▶ atUser: true                              │
│      │       │                                                 │
│      │       └─▶ 返回完整分析结果                               │
│      │           └─▶ needReply: true                           │
│      │                                                         │
│      └─▶ 判断是否需要回复                                        │
│          │                                                     │
│          └─▶ needReply == true                                 │
│              │                                                 │
│              ▼                                                 │
│          [2] 发送AI回复（WorkTool消息发送）                     │
│              │                                                 │
│              ├─▶ worktoolService.sendTextMessage()             │
│              │   │                                             │
│              │   ├─▶ 生成sendId                                │
│              │   │   └─▶ send-1234567890-abc123                │
│              │   │                                             │
│              │   ├─▶ 构建请求体                                │
│              │   │   └─▶ socketType: 203                        │
│              │   │   └─▶ titleList: ["张三"]                   │
│              │   │   └─▶ receivedContent: AI回复内容           │
│              │   │   └─▶ atList: ["张三"] (如果atUser=true)     │
│              │   │                                             │
│              │   ├─▶ 调用WorkTool API                          │
│              │   │   └─▶ POST https://api.worktool.com/wework/sendRawMessage│
│              │   │   └─▶ params: { robotId: wt22phhjpt2xboerspxsote472xdnyq2 }│
│              │   │                                             │
│              │   ├─▶ API响应                                    │
│              │   │   └─▶ statusCode: 200                       │
│              │   │   └─▶ code: 0 (成功)                        │
│              │   │   └─▶ message: "成功"                       │
│              │   │                                             │
│              │   └─▶ 返回成功结果                                │
│              │       └─▶ success: true                         │
│              │       └─▶ processingTime: 234ms                 │
│              │                                                 │
│              └─▶ 日志输出                                      │
│                  [WorkTool] 开始发送消息...                    │
│                  [WorkTool] 机器人验证通过...                   │
│                  [WorkTool] API 响应...                        │
│                  [WorkTool] 发送成功...                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 一、消息接收与AI分析流程

### 1.1 消息接收日志

```javascript
// server/routes/worktool.callback.js

console.log('===== 消息回调请求 =====', {
  requestId: 'req-001',
  robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
  timestamp: new Date().toISOString(),
  callbackData: {
    spoken: '@潘语欣 为什么我的视频号发不了作品？',
    rawSpoken: '@潘语欣 为什么我的视频号发不了作品？',
    receivedName: '张三',
    groupName: '视频号A群',
    roomType: 1,  // 外部群
    atMe: true,
    textType: 1   // 文本
  }
});
```

**输出示例：**
```
===== 消息回调请求 =====
{
  requestId: 'req-001',
  robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
  timestamp: '2024-01-01T12:00:00.000Z',
  callbackData: {
    spoken: '@潘语欣 为什么我的视频号发不了作品？',
    rawSpoken: '@潘语欣 为什么我的视频号发不了作品？',
    receivedName: '张三',
    groupName: '视频号A群',
    roomType: 1,
    atMe: true,
    textType: 1
  }
}
```

### 1.2 机器人验证

```javascript
// 查询机器人配置
const robot = await robotService.getRobotByRobotId('wt22phhjpt2xboerspxsote472xdnyq2');

console.log('✅ 机器人验证通过:', {
  robotId: robot.robotId,
  robotName: robot.name,
  apiBaseUrl: robot.apiBaseUrl,
  isActive: robot.isActive
});
```

**输出示例：**
```
✅ 机器人验证通过: 潘语欣 (wt22phhjpt2xboerspxsote472xdnyq2)
{
  robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
  robotName: '潘语欣',
  apiBaseUrl: 'https://api.worktool.com/wework',
  isActive: true
}
```

### 1.3 AI分析（新增）

```javascript
// server/services/message-processing.service.js

const robotAIService = require('./robot-ai.service');

// 构建消息对象
const message = {
  messageId: generateRequestId(),
  content: callbackData.spoken,
  senderName: callbackData.receivedName,
  timestamp: new Date()
};

// 构建上下文对象
const context = {
  sessionId: `session-${robot.robotId}-${callbackData.receivedName}`,
  groupName: callbackData.groupName,
  roomType: callbackData.roomType,
  atMe: callbackData.atMe
};

// 调用机器人AI分析
console.log('[MessageProcessing] 开始AI分析...');
const aiAnalysis = await robotAIService.analyze(robot, message, context);

console.log('[MessageProcessing] AI分析完成:', {
  robotId: aiAnalysis.robotId,
  intent: aiAnalysis.intent.type,
  intentConfidence: aiAnalysis.intent.confidence,
  emotion: aiAnalysis.emotion.type,
  emotionScore: aiAnalysis.emotion.score,
  needReply: aiAnalysis.needReply,
  replyContent: aiAnalysis.replySuggestion?.content?.substring(0, 50),
  responseTime: aiAnalysis.metadata.responseTime
});
```

**输出示例：**
```
[MessageProcessing] 开始AI分析...
[MessageProcessing] AI分析完成:
{
  robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
  intent: 'after_sales_selfie',
  intentConfidence: 0.95,
  emotion: 'neutral',
  emotionScore: 0.5,
  needReply: true,
  replyContent: '您好，视频号发不了作品可能是由于未完成实名认证...',
  responseTime: 1200
}
```

---

## 二、AI分析结果数据结构

### 2.1 完整AI分析结果

```javascript
{
  // 机器人信息
  robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
  robotName: '潘语欣',
  sessionId: 'session-wt22phhjpt2xboerspxsote472xdnyq2-张三',
  messageId: 'msg-001',

  // 意图识别结果
  intent: {
    type: 'after_sales_selfie',
    confidence: 0.95,
    reasoning: '用户提到视频号发不了作品，这是典型的自拍申诉问题',
    keywords: ['视频号', '发不了', '作品']
  },

  // 情感分析结果
  emotion: {
    type: 'neutral',
    score: 0.5,
    reasoning: '用户语气平和，表达问题比较客观'
  },

  // 回复建议
  replySuggestion: {
    content: '您好，视频号发不了作品可能是由于未完成实名认证或违规操作。建议您先进行自拍申诉，我们会尽快为您处理。',
    replyType: 'group_at_user',
    atUser: true
  },

  // 是否需要回复
  needReply: true,

  // 元数据
  metadata: {
    modelId: 'model-deepseek-chat',
    modelType: 'robot',
    responseTime: 1200,
    tokensUsed: {
      input: 150,
      output: 80,
      total: 230
    },
    cost: 0.01
  }
}
```

### 2.2 AI分析日志输出

```javascript
console.log('===== AI分析结果 =====', {
  // 基本信息
  robotId: aiAnalysis.robotId,
  robotName: aiAnalysis.robotName,
  sessionId: aiAnalysis.sessionId,

  // 意图识别
  intent: {
    type: aiAnalysis.intent.type,
    confidence: aiAnalysis.intent.confidence,
    reasoning: aiAnalysis.intent.reasoning,
    keywords: aiAnalysis.intent.keywords
  },

  // 情感分析
  emotion: {
    type: aiAnalysis.emotion.type,
    score: aiAnalysis.emotion.score,
    reasoning: aiAnalysis.emotion.reasoning
  },

  // 回复建议
  reply: {
    needReply: aiAnalysis.needReply,
    content: aiAnalysis.replySuggestion?.content?.substring(0, 100),
    replyType: aiAnalysis.replySuggestion?.replyType,
    atUser: aiAnalysis.replySuggestion?.atUser
  },

  // 性能指标
  performance: {
    responseTime: aiAnalysis.metadata.responseTime,
    tokensUsed: aiAnalysis.metadata.tokensUsed.total,
    cost: aiAnalysis.metadata.cost
  }
});
```

**输出示例：**
```
===== AI分析结果 =====
{
  robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
  robotName: '潘语欣',
  sessionId: 'session-wt22phhjpt2xboerspxsote472xdnyq2-张三',

  intent: {
    type: 'after_sales_selfie',
    confidence: 0.95,
    reasoning: '用户提到视频号发不了作品，这是典型的自拍申诉问题',
    keywords: ['视频号', '发不了', '作品']
  },

  emotion: {
    type: 'neutral',
    score: 0.5,
    reasoning: '用户语气平和，表达问题比较客观'
  },

  reply: {
    needReply: true,
    content: '您好，视频号发不了作品可能是由于未完成实名认证或违规操作...',
    replyType: 'group_at_user',
    atUser: true
  },

  performance: {
    responseTime: 1200,
    tokensUsed: 230,
    cost: 0.01
  }
}
```

---

## 三、消息发送流程（集成AI分析结果）

### 3.1 判断是否需要回复

```javascript
// server/services/message-processing.service.js

if (aiAnalysis.needReply && aiAnalysis.replySuggestion) {
  console.log('[MessageProcessing] 决定发送AI回复');

  // 发送回复
  const sendResult = await this.sendAIReply(robot, message, aiAnalysis.replySuggestion);

  console.log('[MessageProcessing] AI回复发送完成:', {
    success: sendResult.success,
    sendId: sendResult.sendId,
    processingTime: sendResult.processingTime
  });

  return {
    success: true,
    type: 'ai_reply',
    aiAnalysis,
    sendResult
  };
} else {
  console.log('[MessageProcessing] 决定不发送回复');

  return {
    success: true,
    type: 'no_reply',
    aiAnalysis,
    message: aiAnalysis.needReply
      ? 'AI分析建议不回复'
      : 'AI未提供回复建议'
  };
}
```

### 3.2 发送AI回复

```javascript
// server/services/message-processing.service.js

async sendAIReply(robot, message, replySuggestion) {
  const worktoolService = require('./worktool.service');

  console.log('[WorkTool] 开始发送AI回复', {
    robotId: robot.robotId,
    robotName: robot.name,
    toName: message.senderName,
    replyType: replySuggestion.replyType,
    atUser: replySuggestion.atUser,
    contentLength: replySuggestion.content.length
  });

  // 构建atList
  const atList = replySuggestion.atUser ? [message.senderName] : [];

  // 调用WorkTool发送消息
  const result = await worktoolService.sendTextMessage(
    robot.robotId,
    message.senderName,
    replySuggestion.content,
    atList
  );

  console.log('[WorkTool] AI回复发送结果:', {
    success: result.success,
    sendId: result.sendId,
    processingTime: result.processingTime
  });

  return result;
}
```

### 3.3 WorkTool消息发送（现有代码）

```javascript
// server/services/worktool.service.js

async sendTextMessage(robotId, toName, content, atList = []) {
  const sendId = `send-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  console.log('[WorkTool] 开始发送消息:', {
    sendId,
    robotId,
    toName,
    contentLength: content.length
  });

  try {
    // 获取机器人配置
    const robot = await robotService.getRobotByRobotId(robotId);

    if (!robot) {
      console.error('[WorkTool] 发送消息失败：机器人不存在', { sendId, robotId });
      throw new Error(`机器人不存在: ${robotId}`);
    }

    console.log('[WorkTool] 机器人验证通过:', {
      sendId,
      robotId,
      robotName: robot.name,
      apiBaseUrl: robot.apiBaseUrl
    });

    // 构建请求体
    const requestBody = {
      socketType: 203,
      list: [
        {
          type: 203,
          titleList: [toName],
          receivedContent: content,
          ...(atList.length > 0 && { atList })
        }
      ],
      callbackUrl: robot.resultCallbackUrl || robot.messageCallbackUrl
    };

    // 调用API
    const baseUrl = robot.apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
    const apiUrl = `${baseUrl}/wework/sendRawMessage`;

    console.log('[WorkTool] 调用 API:', {
      sendId,
      apiUrl,
      robotId
    });

    const response = await axios.post(apiUrl, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      params: { robotId: robotId },
      timeout: 10000
    });

    const processingTime = Date.now() - startTime;

    console.log('[WorkTool] API 响应:', {
      sendId,
      statusCode: response.status,
      responseData: response.data,
      processingTime
    });

    if (response.data && response.data.code === 0) {
      console.log('[WorkTool] 发送成功:', {
        sendId,
        robotId,
        toName,
        processingTime
      });

      return {
        success: true,
        message: '发送成功',
        data: response.data.data,
        sendId,
        processingTime
      };
    } else {
      console.warn('[WorkTool] 发送消息失败：API 返回非成功状态', {
        sendId,
        apiCode: response.data?.code,
        apiMessage: response.data?.message
      });

      return {
        success: false,
        message: response.data?.message || '发送失败',
        sendId,
        processingTime
      };
    }

  } catch (error) {
    console.error('[WorkTool] 发送消息失败:', {
      sendId,
      robotId,
      error: error.message
    });
    throw error;
  }
}
```

---

## 四、完整日志输出示例

### 4.1 用户消息接收 → AI分析 → 发送回复

```
===== 消息回调请求 =====
{
  requestId: 'req-20240101-001',
  robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
  timestamp: '2024-01-01T12:00:00.000Z',
  callbackData: {
    spoken: '@潘语欣 为什么我的视频号发不了作品？',
    receivedName: '张三',
    groupName: '视频号A群',
    atMe: true
  }
}

✅ 机器人验证通过: 潘语欣 (wt22phhjpt2xboerspxsote472xdnyq2)
{
  robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
  robotName: '潘语欣',
  apiBaseUrl: 'https://api.worktool.com/wework'
}

[MessageProcessing] 开始AI分析...
[MessageProcessing] AI分析完成:
{
  robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
  intent: 'after_sales_selfie',
  intentConfidence: 0.95,
  emotion: 'neutral',
  emotionScore: 0.5,
  needReply: true,
  replyContent: '您好，视频号发不了作品可能是由于未完成实名认证...',
  responseTime: 1200
}

===== AI分析结果 =====
{
  robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
  robotName: '潘语欣',

  intent: {
    type: 'after_sales_selfie',
    confidence: 0.95,
    reasoning: '用户提到视频号发不了作品，这是典型的自拍申诉问题'
  },

  emotion: {
    type: 'neutral',
    score: 0.5
  },

  reply: {
    needReply: true,
    content: '您好，视频号发不了作品可能是由于未完成实名认证...',
    replyType: 'group_at_user',
    atUser: true
  },

  performance: {
    responseTime: 1200,
    tokensUsed: 230,
    cost: 0.01
  }
}

[MessageProcessing] 决定发送AI回复

[WorkTool] 开始发送消息: {
  sendId: 'send-1704105600123-abc123',
  robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
  toName: '张三',
  contentLength: 88
}

[WorkTool] 机器人验证通过: {
  sendId: 'send-1704105600123-abc123',
  robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
  robotName: '潘语欣',
  apiBaseUrl: 'https://api.worktool.com/wework'
}

[WorkTool] API 响应: {
  sendId: 'send-1704105600123-abc123',
  statusCode: 200,
  responseData: { code: 0, message: '成功', data: { ... } },
  processingTime: 234
}

[WorkTool] 发送成功: {
  sendId: 'send-1704105600123-abc123',
  robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
  toName: '张三',
  processingTime: 234
}

[MessageProcessing] AI回复发送完成:
{
  success: true,
  sendId: 'send-1704105600123-abc123',
  processingTime: 234
}
```

---

## 五、关键代码集成点

### 5.1 在worktool.callback.js中集成AI分析

```javascript
// server/routes/worktool.callback.js

const robotAIService = require('../services/robot-ai.service');

fastify.post('/message', async (request, reply) => {
  const startTime = Date.now();
  const callbackData = request.body;
  const { robotId } = request.query;

  try {
    // 1. 验证机器人
    const robot = await robotService.getRobotByRobotId(robotId);
    if (!robot || !robot.isActive) {
      return reply.status(404).send(errorResponse(404, '机器人不存在或未启用'));
    }

    console.log('✅ 机器人验证通过:', robot.name, `(${robotId})`);

    // 2. 构建消息对象
    const message = {
      messageId: generateRequestId(),
      content: callbackData.spoken,
      senderName: callbackData.receivedName,
      timestamp: new Date()
    };

    // 3. 构建上下文对象
    const context = {
      sessionId: `session-${robotId}-${callbackData.receivedName}`,
      groupName: callbackData.groupName,
      roomType: callbackData.roomType,
      atMe: callbackData.atMe
    };

    // 4. AI分析（新增）
    console.log('[Callback] 开始AI分析...');
    const aiAnalysis = await robotAIService.analyze(robot, message, context);

    // 5. 判断是否需要回复
    if (aiAnalysis.needReply && aiAnalysis.replySuggestion) {
      console.log('[Callback] 决定发送AI回复');

      // 异步发送回复（不阻塞Webhook响应）
      setImmediate(async () => {
        try {
          const worktoolService = require('../services/worktool.service');
          const atList = aiAnalysis.replySuggestion.atUser
            ? [callbackData.receivedName]
            : [];

          await worktoolService.sendTextMessage(
            robotId,
            callbackData.receivedName,
            aiAnalysis.replySuggestion.content,
            atList
          );

          console.log('[Callback] AI回复发送成功');
        } catch (error) {
          console.error('[Callback] AI回复发送失败:', error);
        }
      });
    }

    // 6. 立即返回响应
    return reply.send(successResponse({ aiAnalysis }));

  } catch (error) {
    console.error('[Callback] 处理失败:', error);
    return reply.status(500).send(errorResponse(500, error.message));
  }
});
```

---

## 六、总结

### 6.1 关键流程

1. **消息接收** → WorkTool回调接口接收企业微信消息
2. **机器人验证** → 根据robotId查询机器人配置
3. **AI分析** → RobotAIService分析消息（意图+情感+回复建议）
4. **决策判断** → 根据needReply决定是否发送回复
5. **发送回复** → 调用WorkTool API发送AI生成的回复

### 6.2 数据流转

```
用户消息
    ↓
{ spoken: "@潘语欣 为什么我的视频号发不了作品？" }
    ↓
AI分析
    ↓
{
  intent: { type: "after_sales_selfie", confidence: 0.95 },
  emotion: { type: "neutral", score: 0.5 },
  replySuggestion: {
    content: "您好，视频号发不了作品...",
    replyType: "group_at_user",
    atUser: true
  },
  needReply: true
}
    ↓
WorkTool发送
    ↓
{
  socketType: 203,
  list: [{
    type: 203,
    titleList: ["张三"],
    receivedContent: "您好，视频号发不了作品...",
    atList: ["张三"]
  }]
}
```

### 6.3 日志规范

- **统一前缀**：`[模块名]` 如 `[WorkTool]`、`[MessageProcessing]`、`[RobotAI]`
- **关键信息**：robotId、sendId、processingTime
- **分层输出**：开始 → 验证 → 分析 → 决策 → 发送 → 完成

---

**文档版本**: v1.0
**创建日期**: 2024-01-01
**作者**: WorkTool AI 团队
