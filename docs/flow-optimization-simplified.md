# 流程引擎简化方案

## 🎯 简化原则

1. **去繁就简**：去掉独立且功能重复的流程
2. **功能整合**：将相关功能整合到同一个流程中
3. **配置驱动**：通过节点配置实现不同场景，无需增加流程数量
4. **实用优先**：保留核心功能，去掉过度设计

---

## 📊 简化后的流程架构

### 从6个流程 → 4个流程

| 原流程 | 简化后 | 变化 |
|-------|-------|------|
| 标准客服流程 | ✅ 整合到智能客服流程 | 合并 |
| 群组协作流程 | ✅ 整合到智能客服流程 | 合并 |
| 转化客服（新增） | ✅ 整合到智能客服流程 | 合并 |
| 满意度调查流程 | ✅ 整合到智能客服流程 | 合并 |
| 智能调度流程 | ❌ 去掉 | 移除 |
| 风险监控流程 | ✅ 整合到风险监控与告警流程 | 合并 |
| 告警处理流程 | ✅ 整合到风险监控与告警流程 | 合并 |
| 数据同步流程 | ✅ 保持不变 | 保留 |
| 监控与统计流程 | ✅ 简化功能 | 简化 |

---

## 🚀 最终流程方案（4个）

### 流程1：智能客服流程 ⭐（核心）

**整合功能**：
- ✅ 标准客服（单聊/私聊）
- ✅ 群组协作（多机器人协同）
- ✅ 转化客服（购买引导、商机记录）
- ✅ 满意度调查（会话结束触发）

**触发方式**：Webhook

**流程图**：
```
MESSAGE_ENTRY → SESSION_CREATE → INTENT_RECOGNITION → EMOTION_ANALYZE → DECISION
    ↓
DECISION_NODE（智能分流）
    ├→ 群组消息 → GROUP_DISPATCH → MULTI_ROBOT → MESSAGE_SYNC → MESSAGE_EXIT → FLOW_END
    │
    ├→ 转化意图（购买/价格/产品）→ CONVERSION_INTENT_DETECT → PRODUCT_RECOMMEND
    │   → LEAD_RECORD → AI_REPLY → MESSAGE_EXIT → FLOW_END
    │
    ├→ 负面情绪/投诉 → STAFF_INTERVENTION → TASK_ASSIGN → SEND_COMMAND → FLOW_END
    │
    ├→ 风险内容 → RISK_HANDLER → ALERT_SAVE → ALERT_NOTIFY → FLOW_END
    │
    ├→ 正常咨询 → AI_REPLY → MESSAGE_DISPATCH → MESSAGE_EXIT → FLOW_END
    │
    └→ 会话结束 → SATISFACTION_INFER → SATISFACTION_DECISION → FLOW_END
        ↓
        SATISFACTION_DECISION
            ├→ 高满意度 → LOG_SAVE → FLOW_END
            ├→ 中满意度 → SEND_THANK → FLOW_END
            └→ 低满意度 → TASK_ASSIGN（回访）→ ALERT_SAVE → FLOW_END
```

**核心节点**：

#### 1. 意图识别（扩展）
```json
{
  "intent": {
    "supportedIntents": [
      "咨询", "投诉", "售后", "互动", "购买",     // 原有
      "price_inquiry", "product_info", "business_opportunity"  // 新增转化意图
    ],
    "conversionIntents": [
      "购买",
      "price_inquiry",
      "product_info",
      "business_opportunity"
    ]
  }
}
```

#### 2. 决策节点（增强）
```json
{
  "conditions": [
    {
      "expression": "context.groupType === 'vip'",
      "label": "VIP群",
      "targetNodeId": "node_vip_robot",
      "priority": 1
    },
    {
      "expression": "context.conversionIntent === true",
      "label": "转化处理",
      "targetNodeId": "node_conversion_process",
      "priority": 2
    },
    {
      "expression": "context.emotion === 'negative' || context.intent === '投诉'",
      "label": "转人工",
      "targetNodeId": "node_staff_intervention",
      "priority": 3
    },
    {
      "expression": "context.riskLevel >= 3",
      "label": "风险处理",
      "targetNodeId": "node_risk_handler",
      "priority": 4
    },
    {
      "expression": "context.needReply === true",
      "label": "AI回复",
      "targetNodeId": "node_ai_reply",
      "priority": 5
    }
  ]
}
```

#### 3. 转化意图检测（新增）
```json
{
  "conversionIntentDetect": {
    "conversionIntents": ["购买", "price_inquiry", "product_info"],
    "confidenceThreshold": 0.7,
    "leadScoringRules": {
      "highIntent": 100,
      "mediumIntent": 60,
      "lowIntent": 30
    }
  }
}
```

#### 4. 产品推荐（新增）
```json
{
  "productRecommend": {
    "enableRecommendation": true,
    "recommendationModel": "collaborative_filtering",
    "factors": [
      "user_history",
      "intent_keywords",
      "user_profile"
    ]
  }
}
```

#### 5. 商机记录（新增）
```json
{
  "leadRecord": {
    "saveToCRM": true,
    "leadFields": {
      "userId": "{{context.userId}}",
      "intent": "{{context.conversionIntent}}",
      "score": "{{context.leadScore}}",
      "products": "{{context.recommendedProducts}}",
      "status": "new"
    },
    "autoAssignSales": true
  }
}
```

#### 6. 人工接管（简化）
```json
{
  "staffIntervention": {
    "assignStrategy": "least_busy",  // 简化：只保留最少负载分配
    "autoAssign": true,
    "notifyChannels": ["websocket"]
  }
}
```

#### 7. 满意度推断（新增）
```json
{
  "satisfactionInfer": {
    "triggerCondition": "session_ended",
    "minMessageCount": 3,
    "minDuration": 60000,
    "scoringModel": "doubao-pro-4k"
  }
}
```

**预计耗时**：3-5秒

---

### 流程2：风险监控与告警流程

**整合功能**：
- ✅ 风险监控
- ✅ 告警处理
- ✅ 告警升级
- ✅ 多渠道通知

**触发方式**：
1. 定时触发（默认每5分钟）- 主动监控
2. 事件触发（Webhook）- 高风险事件

**流程图**：
```
START → MONITOR_NODE → RISK_DETECT → RISK_LEVEL_DECISION → DECISION
    ↓
DECISION_NODE
    ├→ HIGH_RISK (level 4-5) → ALERT_SAVE → ALERT_NOTIFY → ESCALATION → FLOW_END
    ├→ MEDIUM_RISK (level 3) → LOG_SAVE → ESCALATION_CHECK → ALERT_NOTIFY → FLOW_END
    └→ LOW_RISK (level 1-2) → LOG_SAVE → FLOW_END
```

**核心功能保持不变**

**预计耗时**：1-4秒

---

### 流程3：数据同步流程

**功能**：
- ✅ 数据查询
- ✅ 数据转换
- ✅ 数据验证
- ✅ 增量同步
- ✅ 冲突解决（简化：保留最新）

**触发方式**：Scheduled（每小时一次）

**流程图**：
```
START → DATA_QUERY → DATA_TRANSFORM → DATA_VALIDATION → DECISION
    ↓
DECISION_NODE
    ├→ SUCCESS → UPDATE_DATABASE → LOG_SAVE → FLOW_END
    ├→ CONFLICT → UPDATE_DATABASE (keep_newest) → LOG_SAVE → FLOW_END
    └→ FAILED → LOG_ERROR → ALERT_SAVE → FLOW_END
```

**简化点**：
- 冲突解决策略简化为只保留最新数据
- 去掉复杂的手动处理策略

**预计耗时**：5-15秒

---

### 流程4：监控与统计流程（简化）

**功能**：
- ✅ 系统指标监控（简化核心指标）
- ✅ 员工回复监测（简化：基础功能）
- ✅ 性能统计
- ❌ 去掉复杂的频率调整和异常检测

**触发方式**：Scheduled（每10分钟）

**流程图**：
```
START → SYSTEM_MONITOR → STAFF_MONITOR → STATISTICS_CALC → DECISION
    ↓
DECISION_NODE
    ├→ NORMAL → LOG_SAVE → FLOW_END
    └→ ABNORMAL → LOG_SAVE → ALERT_SAVE → FLOW_END
```

**简化点**：
- 去掉频率自动调整
- 去掉复杂的异常检测规则
- 只保留基础监控和告警

**节点配置**：
```json
{
  "systemMonitor": {
    "metrics": [
      "callback_received",
      "callback_processed",
      "ai_success_rate"
    ]
  },
  "staffMonitor": {
    "enableReplyTracking": true,
    "alertThreshold": 5  // 连续5次未回复触发告警
  }
}
```

**预计耗时**：1-2秒

---

## 📊 简化前后对比

| 对比项 | 优化前（6个流程） | 简化后（4个流程） | 改进 |
|-------|-----------------|-----------------|------|
| **流程数量** | 6个 | 4个 | ✅ 减少33% |
| **功能覆盖** | 10/14核心功能 | 14/14核心功能 | ✅ 覆盖率100% |
| **场景覆盖** | 6个场景 | 10+个场景 | ✅ 场景更全面 |
| **流程复杂度** | 中 | 低 | ✅ 更简洁 |
| **配置灵活性** | 高 | 高 | ✅ 保持不变 |
| **维护成本** | 中 | 低 | ✅ 更易维护 |
| **转化客服** | ❌ 缺失 | ✅ 已整合 | ✅ 新增 |
| **任务调度** | ❌ 复杂 | ✅ 简化 | ✅ 简化 |

---

## ✅ 简化的核心优势

### 1. 流程更简洁
- 从6个流程减少到4个
- 去掉独立且功能重复的流程
- 智能客服流程整合了80%的客服相关功能

### 2. 功能更全面
- 新增转化客服功能（购买引导、商机记录）
- 覆盖所有核心功能模块（14/14）
- 场景覆盖更全面（10+个）

### 3. 维护更简单
- 流程数量减少，维护成本降低
- 配置集中，便于管理
- 新人更容易理解

### 4. 实施更快
- 4个流程 vs 6个流程
- 实施周期缩短30%
- 测试工作量减少

---

## 🎯 功能覆盖确认

| 功能模块 | 覆盖流程 | 状态 |
|---------|---------|------|
| 消息接收与处理 | 智能客服流程 | ✅ |
| 意图识别系统 | 智能客服流程 | ✅ |
| 情绪分析系统 | 智能客服流程 | ✅ |
| 会话管理 | 智能客服流程 | ✅ |
| AI回复系统 | 智能客服流程 | ✅ |
| **转化客服系统** | **智能客服流程** | ✅ |
| **满意度调查系统** | **智能客服流程** | ✅ |
| **群组协作系统** | **智能客服流程** | ✅ |
| 工作人员干预 | 智能客服流程 | ✅ |
| 消息分发系统 | 智能客服流程 | ✅ |
| 指令管理系统 | 智能客服流程 | ✅ |
| 风险管理系统 | 风险监控与告警流程 | ✅ |
| 监控预警系统 | 风险监控与告警流程 | ✅ |
| 告警升级系统 | 风险监控与告警流程 | ✅ |
| 数据同步系统 | 数据同步流程 | ✅ |
| 监控与统计 | 监控与统计流程 | ✅ |

---

## 🚀 实施建议

### 实施步骤（简化版）

**阶段一：整合智能客服流程**（2-3天）
1. 合并标准客服流程
2. 合并群组协作流程
3. 新增转化客服分支
4. 新增满意度调查分支

**阶段二：整合风险监控流程**（1-2天）
1. 合并风险监控流程
2. 合并告警处理流程

**阶段三：优化其他流程**（1-2天）
1. 简化数据同步流程
2. 简化监控与统计流程

**阶段四：测试验证**（2-3天）

**总周期**：6-10天

---

## 🎉 总结

简化后的4个流程方案：

1. **智能客服流程** - 整合了所有客服相关功能（标准客服、群组协作、转化客服、满意度调查）
2. **风险监控与告警流程** - 整合了风险监控和告警处理
3. **数据同步流程** - 保持核心数据同步功能
4. **监控与统计流程** - 简化后的基础监控

**核心优势**：
- ✅ 流程数量从6个减少到4个
- ✅ 功能覆盖率从71%提升到100%
- ✅ 新增转化客服功能
- ✅ 维护成本降低
- ✅ 实施周期缩短
