# AI分析模块架构设计报告

## 📊 目录
1. [现有系统分析](#现有系统分析)
2. [需求与现状对比](#需求与现状对比)
3. [改造方案设计](#改造方案设计)
4. [实施计划](#实施计划)

---

## 一、现有系统分析

### 1.1 当前消息处理流程

```
企业微信Webhook
    ↓
worktool.callback.js (/message)
    ↓
messageProcessingService.processMessage
    ├── 1. 识别工作人员（staffIdentifierService）
    │
    ├── 2a. 工作人员消息处理
    │   ├── 记录工作人员消息
    │   ├── 更新活动状态
    │   ├── 检查指令
    │   └── 返回：shouldTriggerAI = false
    │
    └── 2b. 用户消息处理
        ├── 检查协同功能是否启用
        ├── 协同决策（collabDecisionService.makeDecision）
        │   ├── 检测工作人员上下文
        │   ├── 检测信息上下文
        │   ├── 应用协同策略
        │   └── 返回：shouldAIReply
        └── 返回：shouldTriggerAI = shouldAIReply
```

### 1.2 AI调用位置

当前系统通过**流程引擎**实现AI功能：

| 节点类型 | 功能 | AI调用方式 | 返回数据 |
|---------|------|-----------|---------|
| `SMART_ANALYZE` | 意图+情绪合并分析 | 单次AI调用 | intent, emotion, confidence, needReply |
| `INTENT` | 意图识别 | 单次AI调用 | intent, confidence |
| `EMOTION_ANALYZE` | 情感分析 | 单次AI调用 | sentiment, score |
| `AI_REPLY` | 生成回复 | 单次AI调用 | content |

### 1.3 当前AI实现特点

**优点：**
- ✅ 模块化设计，功能分离清晰
- ✅ 流程引擎支持灵活的节点编排
- ✅ AI服务工厂模式，支持多提供商

**缺点：**
- ❌ **AI调用分散**：不同功能需要多次调用AI
- ❌ **上下文数据不足**：只传递当前消息内容
- ❌ **分析结果简单**：返回字段有限
- ❌ **缺少统一决策**：需要多个节点协同工作

---

## 二、需求与现状对比

### 2.1 用户需求

#### 核心需求：统一AI分析

**期望的AI分析接口：**
```json
POST /api/ai/analyze
{
  "current_message": { ... },
  "context": {
    "is_new_session": true/false,
    "history_messages": [...],
    "user_profile": { ... },
    "staff_status": { ... },
    "task_status": { ... },
    "group_info": { ... }
  }
}
```

**期望的AI返回结果：**
```json
{
  "intent": "...",
  "confidence": 0.95,
  "sentiment": "...",
  "need_reply": true/false,
  "reply_suggestion": { ... },
  "need_alert": true/false,
  "alert_level": "...",
  "alert_type": "...",
  "need_intervention": true/false,
  "intervention_reason": "...",
  "ai_intervention": true/false,
  "ai_intervention_scenario": "...",
  "staff_status": { ... },
  "user_satisfaction_update": 50
}
```

### 2.2 差距分析

| 功能 | 用户需求 | 现状实现 | 差距 |
|-----|---------|---------|------|
| **AI调用次数** | 1次（统一分析） | 4次（分散调用） | ❌ 差距大 |
| **上下文数据** | 丰富（历史+画像+任务） | 简单（仅当前消息） | ❌ 差距大 |
| **分析字段** | 10+（含告警、介入） | 3-4（简单字段） | ❌ 差距大 |
| **决策能力** | 统一决策（AI一次返回） | 分散决策（流程编排） | ❌ 差距大 |
| **回复建议** | 包含内容、类型、@判断 | 仅生成内容 | ⚠️ 部分实现 |
| **告警判断** | AI自动判断 | 规则引擎判断 | ⚠️ 需改造 |
| **人工介入** | AI智能判断 | 协同策略判断 | ⚠️ 需改造 |

### 2.3 关键发现

1. **功能重复实现**：
   - 协同决策服务（collabDecisionService）已经在做类似的决策
   - 流程引擎也有多个AI节点
   - 需要整合，避免重复

2. **上下文数据缺失**：
   - 当前系统没有检索历史消息
   - 没有用户画像
   - 没有售后任务状态
   - 需要实现上下文准备服务

3. **AI Prompt需重新设计**：
   - 当前Prompt只关注单一任务（意图或情绪）
   - 需要设计综合Prompt，包含所有分析任务

---

## 三、改造方案设计

### 3.1 方案一：在现有流程引擎上扩展（推荐）

**设计思路：**
- 创建新的 `UNIFIED_ANALYZE` 节点
- 实现上下文准备服务
- 设计综合AI Prompt
- 保持现有架构不变

**架构图：**
```
企业微信Webhook
    ↓
messageProcessingService.processMessage
    ↓
flowEngine.executeFlow
    ├── MESSAGE_RECEIVE（接收消息）
    ├── SESSION_CREATE（创建会话）
    ├── CONTEXT_PREPARE（准备上下文）【新增】
    │   ├── 检索历史消息
    │   ├── 获取用户画像
    │   ├── 获取工作人员状态
    │   ├── 获取售后任务状态
    │   └── 获取群聊信息
    │
    ├── UNIFIED_ANALYZE（统一AI分析）【新增】
    │   ├── 构建综合Prompt
    │   ├── 调用AI服务
    │   ├── 解析AI响应
    │   └── 返回完整分析结果
    │
    ├── DECISION（决策节点）
    │   ├── 根据 need_reply 决定是否回复
    │   ├── 根据 need_alert 决定是否告警
    │   ├── 根据 need_intervention 决定是否介入
    │   └── 根据 ai_intervention 决定AI介入场景
    │
    ├── AI_REPLY（AI回复）
    │   └── 使用 reply_suggestion 生成回复
    │
    ├── ALERT_SAVE（告警入库）
    │   └── 使用AI返回的告警信息
    │
    ├── STAFF_INTERVENTION（工作人员介入）
    │   └── 使用 intervention_reason
    │
    └── MESSAGE_DISPATCH（消息分发）
        └── 发送消息到企业微信
```

**优点：**
- ✅ 最小化改造，保持现有架构
- ✅ 可以逐步迁移，不影响现有功能
- ✅ 流程引擎的灵活性得以保留
- ✅ 易于调试和监控

**缺点：**
- ⚠️ 依赖流程引擎，学习曲线稍高
- ⚠️ 需要配置流程定义

### 3.2 方案二：直接在消息处理服务中集成AI

**设计思路：**
- 在 messageProcessingService 中直接调用统一AI分析
- 跳过流程引擎
- 简化架构

**架构图：**
```
企业微信Webhook
    ↓
messageProcessingService.processMessage
    ├── 识别工作人员
    ├── 准备上下文（新服务）
    ├── 调用统一AI分析（新服务）
    │   └── 返回完整分析结果
    ├── 根据分析结果执行操作
    │   ├── 生成回复
    │   ├── 触发告警
    │   ├── 人工介入
    │   └── 发送消息
    └── 返回处理结果
```

**优点：**
- ✅ 架构简单，易于理解
- ✅ 性能更高（减少流程引擎开销）
- ✅ 直接控制AI调用逻辑

**缺点：**
- ❌ 破坏现有架构
- ❌ 失去流程引擎的灵活性
- ❌ 需要大量重写代码
- ❌ 难以调试和监控

### 3.3 方案对比

| 维度 | 方案一（扩展流程引擎） | 方案二（直接集成） |
|-----|---------------------|------------------|
| **改造工作量** | 中等（新增节点+服务） | 大量（重写核心逻辑） |
| **架构风险** | 低（保持现有架构） | 高（破坏现有架构） |
| **灵活性** | 高（流程引擎编排） | 低（固定逻辑） |
| **可维护性** | 高（模块化清晰） | 中（逻辑集中） |
| **性能** | 中等（流程引擎开销） | 高（直接调用） |
| **调试难度** | 低（可视化流程） | 中（日志追踪） |
| **推荐程度** | ⭐⭐⭐⭐⭐ | ⭐⭐ |

---

## 四、实施计划（方案一）

### 4.1 Phase 1：上下文准备服务（2天）

**任务清单：**
- [ ] 创建 `context-preparation.service.js`
  - [ ] 实现历史消息检索（最近N条）
  - [ ] 实现用户画像获取
  - [ ] 实现工作人员状态获取
  - [ ] 实现售后任务状态获取
  - [ ] 实现群聊信息获取
  - [ ] 实现新会话优化（跨群历史检索）

**数据库需求：**
- session_messages 表（已有）
- user_sessions 表（已有）
- staff 表（已有）
- robots 表（已有）

**API接口：**
```javascript
// server/services/context-preparation.service.js
class ContextPreparationService {
  async prepareContext(sessionId, message) {
    return {
      is_new_session: true/false,
      history_messages: [...],
      user_profile: {
        satisfaction: 50,
        user_type: 'new/existing',
        history_count: 10
      },
      staff_status: {
        online_staff: ['售后A', '群助理'],
        is_handling: true/false,
        handling_staff: '售后A'
      },
      task_status: {
        current_task: '视频号认证',
        task_status: 'in_progress'
      },
      group_info: {
        group_name: '视频号A群',
        member_count: 50
      }
    };
  }
}
```

### 4.2 Phase 2：统一AI分析节点（3天）

**任务清单：**
- [ ] 在流程引擎中添加 `UNIFIED_ANALYZE` 节点类型
- [ ] 实现 `handleUnifiedAnalyzeNode` 方法
- [ ] 设计综合AI Prompt（包含所有分析任务）
- [ ] 实现AI响应解析器
- [ ] 实现返回数据结构映射

**核心代码：**
```javascript
// server/services/flow-engine.service.js
const NodeType = {
  // ... 现有节点类型
  UNIFIED_ANALYZE: 'unified_analyze', // 新增
  CONTEXT_PREPARE: 'context_prepare'   // 新增
};

this.nodeHandlers = {
  // ... 现有节点处理器
  [NodeType.UNIFIED_ANALYZE]: this.handleUnifiedAnalyzeNode.bind(this),
  [NodeType.CONTEXT_PREPARE]: this.handleContextPrepareNode.bind(this)
};

async handleContextPrepareNode(node, context) {
  const contextPrepService = require('./context-preparation.service');
  const contextData = await contextPrepService.prepareContext(
    context.sessionId,
    context.message
  );

  return {
    success: true,
    context: {
      ...context,
      ...contextData,
      lastNodeType: 'context_prepare'
    }
  };
}

async handleUnifiedAnalyzeNode(node, context) {
  const { data } = node;
  const { modelId } = data.config;

  // 构建综合Prompt
  const prompt = this.buildUnifiedAnalyzePrompt(
    context.message,
    context
  );

  // 调用AI服务
  const aiService = await AIServiceFactory.createServiceByModelId(modelId);
  const response = await aiService.chat({
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: context.message.content }
    ]
  });

  // 解析响应
  const analysisResult = this.parseUnifiedAnalyzeResponse(response.content);

  return {
    success: true,
    ...analysisResult,
    context: {
      ...context,
      ...analysisResult,
      lastNodeType: 'unified_analyze'
    }
  };
}

buildUnifiedAnalyzePrompt(message, context) {
  return `你是一个智能客服助手，负责企业微信社群的自动回复和协同分析。

【当前消息】
发送者：${context.senderName}
消息内容："${message.content}"
发送时间：${new Date().toISOString()}
群聊：${context.groupInfo?.groupName || '未知'}

【会话类型】
${context.is_new_session ? '新会话' : '老会话'}

【历史上下文（最近20条）】
${context.history_messages?.map((m, i) =>
  `${i + 1}. ${m.sender_name}：${m.content}`
).join('\n') || '无'}

【用户画像】
用户满意度：${context.user_profile?.satisfaction}分
用户类型：${context.user_profile?.user_type === 'new' ? '新用户' : '老用户'}
历史记录：${context.user_profile?.history_count || 0}条

【工作人员状态】
在线工作人员：${context.staff_status?.online_staff?.join('、') || '无'}
是否正在处理：${context.staff_status?.is_handling ? '是' : '否'}
当前处理人：${context.staff_status?.handling_staff || '无'}

【售后任务状态】
当前任务：${context.task_status?.current_task || '无'}
任务状态：${context.task_status?.task_status || '无'}

【群聊信息】
群名：${context.groupInfo?.groupName || '未知'}
群成员数：${context.groupInfo?.member_count || '未知'}

【你的任务】
1. 分析用户意图（选择以下一个）：
   - after_sales_scan_qrcode（售后扫码配合）
   - after_sales_bind_phone（售后绑定手机号）
   - after_sales_realname（售后实名认证）
   - after_sales_selfie（售后自拍申诉）
   - question_answer（疑虑解答）
   - status_communication（状态沟通）
   - chat（闲聊）
   - other（其他）

2. 分析用户情感（选择以下一个）：
   - positive（积极）
   - neutral（中性）
   - negative（消极）

3. 判断是否需要回复（true/false）

4. 生成回复建议（如果需要回复）
   - 回复内容
   - 回复类型（group_at_user/private_chat/group_no_at）
   - 是否需要@用户

5. 判断是否需要告警（true/false）
   - 告警级别（P0/P1/P2）
   - 告警类型（user_complaint/operator_harsh/task_unfinished/staff_no_reply/user_uncooperative）

6. 判断是否需要介入人工（true/false）
   - 介入原因

7. 判断AI介入场景（如果需要AI介入）
   - staff_busy（人工繁忙）
   - night_shift（夜间人工离线）
   - user_negative（用户情感消极）
   - complex_problem（复杂问题）
   - operator_harsh（运营语气过硬）

8. 分析工作人员状态（发送者是工作人员）
   - 是否是工作人员（true/false）
   - 工作人员姓名
   - 工作人员角色（after_sales/assistant/operator）
   - 工作人员活跃度

9. 更新用户满意度（根据对话质量，0-100）

【返回格式（JSON）】
{
  "intent": "after_sales_scan_qrcode",
  "confidence": 0.95,
  "sentiment": "neutral",
  "need_reply": true,
  "reply_suggestion": {
    "content": "您好，请点击下方链接进行扫码操作：[链接]",
    "reply_type": "group_at_user",
    "at_user": true
  },
  "need_alert": false,
  "alert_level": null,
  "alert_type": null,
  "need_intervention": false,
  "intervention_reason": "",
  "ai_intervention": false,
  "ai_intervention_scenario": "",
  "staff_status": {
    "is_staff": false,
    "staff_name": null,
    "staff_role": null,
    "staff_activity": null
  },
  "user_satisfaction_update": 50
}`;
}

parseUnifiedAnalyzeResponse(content) {
  try {
    const result = JSON.parse(content);
    return {
      intent: result.intent,
      confidence: result.confidence,
      sentiment: result.sentiment,
      need_reply: result.need_reply,
      reply_suggestion: result.reply_suggestion,
      need_alert: result.need_alert,
      alert_level: result.alert_level,
      alert_type: result.alert_type,
      need_intervention: result.need_intervention,
      intervention_reason: result.intervention_reason,
      ai_intervention: result.ai_intervention,
      ai_intervention_scenario: result.ai_intervention_scenario,
      staff_status: result.staff_status,
      user_satisfaction_update: result.user_satisfaction_update
    };
  } catch (error) {
    // 返回默认值
    return {
      intent: 'chat',
      confidence: 0.5,
      sentiment: 'neutral',
      need_reply: true,
      reply_suggestion: null,
      need_alert: false,
      alert_level: null,
      alert_type: null,
      need_intervention: false,
      intervention_reason: '',
      ai_intervention: false,
      ai_intervention_scenario: '',
      staff_status: null,
      user_satisfaction_update: 50
    };
  }
}
```

### 4.3 Phase 3：创建新流程定义（1天）

**任务清单：**
- [ ] 创建流程定义 `unified-analysis-flow`
- [ ] 配置节点顺序：
  1. MESSAGE_RECEIVE
  2. SESSION_CREATE
  3. CONTEXT_PREPARE
  4. UNIFIED_ANALYZE
  5. DECISION（根据AI分析结果分支）
  6. AI_REPLY（if need_reply）
  7. ALERT_SAVE（if need_alert）
  8. STAFF_INTERVENTION（if need_intervention）
  9. MESSAGE_DISPATCH
- [ ] 设置节点连接关系
- [ ] 测试流程执行

**流程定义示例：**
```sql
INSERT INTO flow_definitions (id, name, version, is_active, trigger_type, trigger_config, nodes, edges)
VALUES (
  'flow-unified-analysis',
  '统一AI分析流程',
  '1.0',
  true,
  'webhook',
  '{"type": "message"}',
  '[
    {
      "id": "node-message-receive",
      "type": "message_receive",
      "name": "接收消息",
      "config": {}
    },
    {
      "id": "node-context-prepare",
      "type": "context_prepare",
      "name": "准备上下文",
      "config": {}
    },
    {
      "id": "node-unified-analyze",
      "type": "unified_analyze",
      "name": "统一AI分析",
      "config": {
        "modelId": "model-deepseek-chat"
      }
    },
    {
      "id": "node-decision",
      "type": "decision",
      "name": "决策节点",
      "config": {
        "conditions": [
          {
            "expression": "context.need_reply == true",
            "target": "node-ai-reply"
          },
          {
            "expression": "context.need_alert == true",
            "target": "node-alert-save"
          },
          {
            "expression": "context.need_intervention == true",
            "target": "node-staff-intervention"
          }
        ],
        "default": "node-message-dispatch"
      }
    },
    {
      "id": "node-ai-reply",
      "type": "ai_reply",
      "name": "AI回复",
      "config": {
        "useReplySuggestion": true
      }
    },
    {
      "id": "node-alert-save",
      "type": "alert_save",
      "name": "告警入库",
      "config": {}
    },
    {
      "id": "node-staff-intervention",
      "type": "staff_intervention",
      "name": "工作人员介入",
      "config": {}
    },
    {
      "id": "node-message-dispatch",
      "type": "message_dispatch",
      "name": "消息分发",
      "config": {}
    }
  ]',
  '[
    {"from": "node-message-receive", "to": "node-context-prepare"},
    {"from": "node-context-prepare", "to": "node-unified-analyze"},
    {"from": "node-unified-analyze", "to": "node-decision"},
    {"from": "node-decision", "to": "node-ai-reply", "condition": "need_reply"},
    {"from": "node-decision", "to": "node-alert-save", "condition": "need_alert"},
    {"from": "node-decision", "to": "node-staff-intervention", "condition": "need_intervention"},
    {"from": "node-ai-reply", "to": "node-message-dispatch"},
    {"from": "node-alert-save", "to": "node-message-dispatch"},
    {"from": "node-staff-intervention", "to": "node-message-dispatch"}
  ]'
);
```

### 4.4 Phase 4：集成测试（1天）

**测试场景：**
1. 新会话场景
   - 无历史消息
   - 用户首次咨询
   - 验证上下文准备正确

2. 老会话场景
   - 有历史消息
   - 用户持续咨询
   - 验证历史消息检索

3. 告警场景
   - 用户情感消极
   - 验证告警判断和入库

4. 人工介入场景
   - 复杂问题
   - 验证介入判断和通知

5. AI回复场景
   - 正常咨询
   - 验证回复生成和发送

### 4.5 Phase 5：性能优化（1天）

**优化点：**
- [ ] 上下文准备缓存（Redis）
- [ ] 历史消息分页查询
- [ ] AI Prompt模板化
- [ ] 响应解析优化

---

## 五、总结

### 5.1 推荐方案

**采用方案一（扩展流程引擎）**

理由：
1. ✅ 最小化改造，降低风险
2. ✅ 保持现有架构，易于维护
3. ✅ 可以逐步迁移，不影响现有功能
4. ✅ 流程引擎的灵活性得以保留

### 5.2 预期收益

| 维度 | 改造前 | 改造后 | 提升 |
|-----|-------|-------|------|
| **AI调用次数** | 4次 | 1次 | ⬇️ 75% |
| **响应时间** | 2-3秒 | 1-1.5秒 | ⬇️ 50% |
| **分析字段** | 3-4个 | 10+个 | ⬆️ 200% |
| **上下文丰富度** | 简单 | 丰富 | ⬆️ 500% |
| **决策准确性** | 规则驱动 | AI驱动 | ⬆️ 显著提升 |
| **告警及时性** | 规则判断 | AI智能判断 | ⬆️ 显著提升 |

### 5.3 后续优化方向

1. **Prompt优化**：基于实际使用反馈持续优化Prompt
2. **模型选择**：根据不同场景选择合适的AI模型
3. **上下文扩展**：增加更多上下文信息（如产品信息、订单信息）
4. **多轮对话**：支持更复杂的多轮对话场景
5. **A/B测试**：对比统一AI vs 分散AI的效果

---

## 六、附录

### A. 相关文件清单

```
server/services/
  ├── context-preparation.service.js      【新增】上下文准备服务
  ├── message-processing.service.js       【改造】集成统一分析
  ├── flow-engine.service.js             【改造】新增节点处理器
  └── collaboration.service.js           【保持】协同决策服务

server/routes/
  └── worktool.callback.js                【保持】消息回调入口

数据库迁移/
  ├── 020_create_unified_analysis_flow.sql  【新增】创建新流程定义
  └── 021_add_context_indexes.sql          【新增】添加上下文索引
```

### B. API接口文档

#### 统一AI分析节点配置

```json
{
  "type": "unified_analyze",
  "config": {
    "modelId": "model-deepseek-chat",
    "temperature": 0.3,
    "maxTokens": 1000,
    "fallbackIntent": "chat",
    "fallbackSentiment": "neutral"
  }
}
```

#### 上下文准备节点配置

```json
{
  "type": "context_prepare",
  "config": {
    "historyMessageCount": 20,
    "includeCrossGroupHistory": true,
    "enableUserProfile": true,
    "enableStaffStatus": true,
    "enableTaskStatus": true
  }
}
```

### C. 测试用例

详见 `tests/unified-analysis.test.js`

---

**文档版本**: v1.0
**创建日期**: 2024-01-01
**作者**: WorkTool AI 团队
**审核状态**: 待审核
