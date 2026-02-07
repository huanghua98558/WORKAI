# 转化客服流程定义

## 📊 流程概述

**流程名称**：转化客服流程
**触发方式**：由智能客服主流程触发（或webhook触发）
**核心功能**：购买意图识别、产品推荐、商机记录、销售转接

---

## 🔄 完整流程定义

```json
{
  "name": "转化客服流程",
  "description": "购买意图识别、产品推荐、商机记录、销售转接的转化工作流",
  "status": "active",
  "triggerType": "webhook",
  "triggerConfig": {
    "webhookUrl": "/webhook/conversion/service",
    "method": "POST"
  },
  "nodes": [
    {
      "id": "node_1",
      "type": "MESSAGE_RECEIVE",
      "name": "接收转化请求",
      "description": "接收智能客服触发的转化请求或用户主动消息",
      "data": {
        "config": {
          "saveToDatabase": true,
          "extractFields": {
            "userId": true,
            "userName": true,
            "userMessage": true,
            "imageContext": true, // 图片上下文
            "imageUrl": true,     // 图片URL
            "sessionId": true
          }
        }
      },
      "nextNodeId": "node_2"
    },
    {
      "id": "node_2",
      "type": "IMAGE_PROCESS",
      "name": "产品图片分析",
      "description": "分析用户发送的产品图片，提取产品信息",
      "data": {
        "config": {
          "enableDetection": true,
          "enableRecognition": true,
          "enableAnalysis": true,
          "skipNodeId": "node_3",
          "productNodeId": "node_3"
        }
      }
    },
    {
      "id": "node_3",
      "type": "INTENT",
      "name": "购买意图识别",
      "description": "识别用户的购买意图和意向程度",
      "data": {
        "config": {
          "modelId": "doubao-pro-4k",
          "confidenceThreshold": 0.7,
          "supportedIntents": [
            "strong_purchase",   // 强购买意向
            "weak_purchase",     // 弱购买意向
            "product_inquiry",   // 产品咨询
            "price_negotiation", // 价格议价
            "comparison"         // 产品对比
          ],
          "enableSentimentAnalysis": true,
          "businessRoleMode": "per_role"
        }
      },
      "nextNodeId": "node_4"
    },
    {
      "id": "node_4",
      "type": "VARIABLE_SET",
      "name": "意向得分计算",
      "description": "根据意图、情感、历史行为计算意向得分",
      "data": {
        "config": {
          "scoreRule": "weighted",
          "factors": {
            "intent_weight": 0.4,
            "sentiment_weight": 0.3,
            "history_weight": 0.2,
            "engagement_weight": 0.1
          },
          "scoreRanges": {
            "high": { "min": 80, "max": 100 },
            "medium": { "min": 50, "max": 79 },
            "low": { "min": 0, "max": 49 }
          }
        }
      },
      "nextNodeId": "node_5"
    },
    {
      "id": "node_5",
      "type": "DECISION",
      "name": "意向分流",
      "description": "根据意向得分分流处理",
      "data": {
        "config": {
          "decisionMode": "priority",
          "conditions": [
            {
              "label": "高意向（≥80分）",
              "expression": "context.leadScore >= 80",
              "targetNodeId": "node_6"
            },
            {
              "label": "中意向（50-79分）",
              "expression": "context.leadScore >= 50 && context.leadScore < 80",
              "targetNodeId": "node_7"
            },
            {
              "label": "低意向（<50分）",
              "expression": "context.leadScore < 50",
              "targetNodeId": "node_8"
            }
          ]
        }
      }
    },
    {
      "id": "node_6",
      "type": "DATA_QUERY",
      "name": "产品推荐（高意向）",
      "description": "高意向用户，推荐精准产品并直接转接销售",
      "data": {
        "config": {
          "recommendationStrategy": "precision",
          "maxProducts": 3,
          "matchScoreThreshold": 0.85,
          "useImageProduct": true
        }
      },
      "nextNodeId": "node_9"
    },
    {
      "id": "node_7",
      "type": "DATA_QUERY",
      "name": "产品推荐（中意向）",
      "description": "中意向用户，推荐相关产品并引导转化",
      "data": {
        "config": {
          "recommendationStrategy": "balance",
          "maxProducts": 5,
          "matchScoreThreshold": 0.7,
          "useImageProduct": true
        }
      },
      "nextNodeId": "node_10"
    },
    {
      "id": "node_8",
      "type": "AI_REPLY",
      "name": "AI回复（低意向）",
      "description": "低意向用户，AI引导和培育",
      "data": {
        "config": {
          "modelId": "doubao-pro-4k",
          "temperature": 0.8,
          "maxTokens": 1000,
          "enableImageContext": true,
          "replyStrategy": "nurture"
        }
      },
      "nextNodeId": "node_11"
    },
    {
      "id": "node_9",
      "type": "DATA_QUERY",
      "name": "商机记录（高意向）",
      "description": "记录高意向商机，分配给销售",
      "data": {
        "config": {
          "leadPriority": "high",
          "autoAssign": true,
          "assignStrategy": "least_load",
          "includeImageInfo": true
        }
      },
      "nextNodeId": "node_12"
    },
    {
      "id": "node_10",
      "type": "AI_REPLY",
      "name": "AI回复并引导（中意向）",
      "description": "中意向用户，AI回复推荐产品并引导购买",
      "data": {
        "config": {
          "modelId": "doubao-pro-4k",
          "temperature": 0.7,
          "maxTokens": 1000,
          "enableImageContext": true,
          "includeProductInfo": true,
          "replyStrategy": "guide"
        }
      },
      "nextNodeId": "node_13"
    },
    {
      "id": "node_11",
      "type": "VARIABLE_SET",
      "name": "商机记录（低意向）",
      "description": "记录低意向商机，后续跟进",
      "data": {
        "config": {
          "leadPriority": "low",
          "autoAssign": false,
          "includeImageInfo": true
        }
      },
      "nextNodeId": "node_end"
    },
    {
      "id": "node_12",
      "type": "TASK_ASSIGN",
      "name": "销售转接（高意向）",
      "description": "高意向用户，立即转接销售",
      "data": {
        "config": {
          "taskName": "高意向客户跟进",
          "taskType": "sales_followup",
          "priority": "high",
          "assignTo": "sales_team",
          "dueTime": 3600, // 1小时内跟进
          "notifyAssignee": true
        }
      },
      "nextNodeId": "node_end"
    },
    {
      "id": "node_13",
      "type": "VARIABLE_SET",
      "name": "商机记录（中意向）",
      "description": "记录中意向商机，定期跟进",
      "data": {
        "config": {
          "leadPriority": "medium",
          "autoAssign": true,
          "assignStrategy": "round_robin",
          "includeImageInfo": true
        }
      },
      "nextNodeId": "node_end"
    },
    {
      "id": "node_end",
      "type": "END",
      "name": "流程结束",
      "description": "转化客服流程结束",
      "data": {
        "config": {
          "saveStatistics": true
        }
      }
    }
  ]
}
```

---

## 🎯 流程说明

### 触发方式

1. **智能客服主流程触发**
   - 识别到产品场景（图片识别）
   - 识别到转化意图（意图识别）

2. **用户主动咨询**
   - 用户直接发送产品咨询消息
   - 通过webhook直接触发

### 核心功能

#### 1. 产品图片分析
- 识别图片中的产品信息
- 提取产品名称、价格、规格
- 支持多种产品类型

#### 2. 购买意图识别
- 强购买意向：立即想买，询问价格、购买方式
- 弱购买意向：感兴趣，但还在犹豫
- 产品咨询：想了解产品详情
- 价格议价：询问价格优惠
- 产品对比：对比不同产品

#### 3. 意向得分计算

**计算公式**：
```
leadScore = (intentScore * 0.4) + (sentimentScore * 0.3) + (historyScore * 0.2) + (engagementScore * 0.1)
```

**得分范围**：
- 高意向：80-100分
- 中意向：50-79分
- 低意向：0-49分

#### 4. 产品推荐策略

| 意向等级 | 推荐策略 | 产品数量 | 匹配阈值 |
|---------|---------|---------|---------|
| 高意向 | 精准推荐 | 3个 | ≥85% |
| 中意向 | 平衡推荐 | 5个 | ≥70% |
| 低意向 | AI引导培育 | 无 | 无 |

#### 5. 商机记录

**记录内容**：
- 用户信息
- 意向得分
- 推荐产品
- 图片信息（如果有）
- 会话历史

**分配策略**：
- 高意向：自动分配给负载最少的销售
- 中意向：按轮询分配
- 低意向：暂不分配，后续跟进

#### 6. 销售转接

**高意向用户**：
- 立即创建跟进任务
- 1小时内跟进
- 通知销售人员

---

## 📊 数据流转

### 高意向用户流程

```
接收转化请求
  ↓
产品图片分析（如果有）
  ↓
购买意图识别（strong_purchase）
  ↓
意向得分计算（≥80分）
  ↓
高意向分流
  ↓
产品推荐（3个精准产品）
  ↓
商机记录（高优先级）
  ↓
销售转接（1小时内跟进）
  ↓
流程结束
```

### 中意向用户流程

```
接收转化请求
  ↓
产品图片分析（如果有）
  ↓
购买意图识别（weak_purchase/product_inquiry）
  ↓
意向得分计算（50-79分）
  ↓
中意向分流
  ↓
产品推荐（5个相关产品）
  ↓
AI回复并引导购买
  ↓
商机记录（中优先级，轮询分配）
  ↓
流程结束
```

### 低意向用户流程

```
接收转化请求
  ↓
购买意图识别（无明确意向）
  ↓
意向得分计算（<50分）
  ↓
低意向分流
  ↓
AI回复（引导和培育）
  ↓
商机记录（低优先级，暂不分配）
  ↓
流程结束
```

---

## 🔧 配置说明

### 转化客服流程配置

```typescript
export const conversionServiceFlow = {
  name: '转化客服流程',
  description: '购买意图识别、产品推荐、商机记录、销售转接',
  status: 'active',
  triggerType: 'webhook',
  triggerConfig: {
    webhookUrl: '/webhook/conversion/service',
    method: 'POST',
  },
  nodes: [
    // ... 上面定义的节点
  ],
};
```

### 智能客服主流程中的触发配置

```typescript
{
  id: "node_trigger_conversion",
  type: "FLOW_TRIGGER",
  name: "触发转化客服流程",
  description: "触发转化客服流程进行产品推荐",
  data: {
    config: {
      targetFlowId: "flow_conversion_service",
      passData: ["userId", "userName", "imageContext", "imageUrl", "sessionId"]
    }
  }
}
```

---

## 📝 总结

### 转化客服流程的定位

1. **独立流程**：不依赖其他流程，可独立运行
2. **可被触发**：可由智能客服主流程触发
3. **完整闭环**：从意图识别到销售转接，完整转化链路
4. **数据驱动**：基于意向得分和产品匹配度进行决策

### 与其他流程的关系

```
智能客服主流程
  ├─ 识别到产品场景 → 触发转化客服流程
  └─ 识别到转化意图 → 触发转化客服流程

转化客服流程
  ├─ 高意向 → 销售转接
  ├─ 中意向 → 人工跟进
  └─ 低意向 → AI培育

风险监控流程
  └─ 独立运行，监控系统风险
```

### 最终流程架构

**5个核心流程**：
1. ✅ 智能客服主流程
2. ✅ 转化客服流程（独立）
3. ✅ 风险监控与告警流程
4. ✅ 数据同步流程
5. ✅ 监控与统计流程

这样功能更完整，职责更清晰！
