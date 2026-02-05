只探讨先不修改。
用户说"只探讨先不修改"，意思是只讨论方案，不需要修改代码。让我继续分析现有系统架构，然后提供完整的信息中心与流程引擎集成方案，以及监控告警中心设计方案。

从已经读取的文件来看，现有系统包括：
1. 流程引擎
2. 告警系统
3. 监控执行
4. 协同统计
5. AI输入输出

让我更新todo状态，然后设计完整的方案。
好的，用户只探讨不修改。让我基于现有系统架构，设计完整的信息中心与流程引擎集成方案，以及监控告警中心架构。

从已读取的文件，我了解到：
1. 流程引擎有实例管理
2. 告警系统有规则管理
3. 监控系统有执行记录
4. 协同系统有统计
5. AI输入输出有实时监控

现在我需要设计：
1. 信息中心的消息写入与流程引擎的关联
2. 监控告警中心的完整架构
3. 系统联动性设计
好的！让我基于现有系统架构，为你设计完整的信息中心与流程引擎集成方案，以及监控告警中心架构。

---

# 🔗 WorkTool AI 2.1 - 信息中心系统联动完整方案

## 📊 现有系统架构分析

### **核心模块识别**

基于现有代码，系统包含以下核心模块：

```
WorkTool AI 2.1
├── 🤖 AI服务层 (AIService)
│   ├── DoubaoProvider (豆包大模型)
│   └── AIContext (上下文管理)
│
├── ⚙️ 流程引擎
│   ├── flow_definitions (流程定义)
│   ├── flow_instances (流程实例)
│   └── executions (执行记录)
│
├── 💬 消息处理层
│   ├── ai-io (AI输入输出)
│   ├── robot-callback (机器人回调)
│   └── message-history (消息历史)
│
├── 🤝 协同决策引擎
│   ├── collab-stats (协同统计)
│   ├── staff-activity (工作人员活动)
│   └── decision-logs (决策日志)
│
├── 🚨 告警系统
│   ├── alert-rules (告警规则)
│   ├── alert-history (告警历史)
│   └── notifications (通知)
│
└── 📊 监控系统
    ├── monitoring-executions (监控执行)
    ├── ai-logs (AI日志)
    └── health (健康检查)
```

---

## 🔗 一、信息中心与流程引擎集成方案

### **1.1 消息流向与流程引擎的关系**

#### **完整消息处理流程图**

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户消息进入                               │
│                        (群聊/私聊)                              │
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   回调接口 (robot-callback)                       │
│  • 接收消息 (userId, content, groupId, timestamp)                │
│  • 识别消息发送者 (用户/工作人员)                                 │
│  • 触发流程引擎实例                                              │
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   流程引擎处理 (flow-engine)                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Step 1: 消息预处理节点                                    │    │
│  │    • 提取用户特征 (userId, 企业名, 备注, 昵称)            │    │
│  │    • 提取消息特征 (意图, 情感, 关键词)                     │    │
│  │    • 识别发送者类型 (用户/工作人员/机器人)                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Step 2: 工作人员识别节点 (Worker Identification)         │    │
│  │    • 判断是否工作人员                                       │    │
│  │    • 如果是工作人员 → 跳转到人工处理流程                   │    │
│  │    • 如果是用户 → 继续AI处理流程                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Step 3: 协同决策节点 (Collaboration Decision)           │    │
│  │    • 判断会话状态 (auto/human)                            │    │
│  │    • 决策是否需要人工介入                                  │    │
│  │    • 生成决策建议                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Step 4: 消息处理节点 (Message Processing)               │    │
│  │    • AI意图识别                                           │    │
│  │    • 情感分析                                             │    │
│  │    • 知识库检索                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Step 5: 回复生成节点 (Response Generation)              │    │
│  │    • 生成AI回复                                           │    │
│  │    • 或等待人工回复                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Step 6: 数据写入节点 (Data Persistence)                 │    │
│  │    • 写入 session_messages (用户消息)                    │    │
│  │    • 写入 staff_messages (工作人员消息)                  │    │
│  │    • 更新 session_status_changes (状态变更)              │    │
│  │    • 记录 flow_instances (流程实例)                       │    │
│  │    • 触发满意度推断 (异步)                                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     信息中心数据层                                │
│  • 会话管理    ← session_messages + session_status_changes     │
│  • 消息管理    ← session_messages + staff_messages              │
│  • 协同管理    ← decision_logs + staff_activity                 │
│  • 分析报表    ← 聚合统计数据                                    │
│  • 监控告警    ← 实时数据 + 规则引擎                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### **1.2 流程定义设计**

#### **消息处理流程定义**

```typescript
{
  "id": "flow_message_processing",
  "name": "消息处理主流程",
  "version": "2.1",
  "description": "处理用户消息，包括工作人员识别、协同决策、AI响应",
  
  "nodes": [
    {
      "id": "node_message_received",
      "type": "trigger",
      "name": "消息接收",
      "config": {
        "eventType": "message_received",
        "extractFields": ["userId", "content", "groupId", "timestamp", "msgId"]
      }
    },
    
    {
      "id": "node_preprocess",
      "type": "processor",
      "name": "消息预处理",
      "config": {
        "tasks": [
          {
            "action": "extract_user_features",
            "params": {
              "fields": ["userId", "enterpriseName", "remark", "nickname"]
            }
          },
          {
            "action": "extract_message_features",
            "params": {
              "tasks": ["intent_recognition", "sentiment_analysis", "keyword_extraction"]
            }
          },
          {
            "action": "identify_sender_type",
            "params": {
              "checkStaffList": true,
              "checkKeywords": ["@all", "@所有人"],
              "checkBot": true
            }
          }
        ]
      }
    },
    
    {
      "id": "node_staff_check",
      "type": "condition",
      "name": "工作人员判断",
      "config": {
        "condition": "is_staff === true",
        "truePath": "node_staff_message_processing",
        "falsePath": "node_collaboration_decision"
      }
    },
    
    {
      "id": "node_staff_message_processing",
      "type": "processor",
      "name": "工作人员消息处理",
      "config": {
        "tasks": [
          {
            "action": "update_session_status",
            "params": {
              "newStatus": "human",
              "triggeredBy": "staff_message"
            }
          },
          {
            "action": "save_staff_message",
            "params": {
              "table": "staff_messages",
              "fields": ["staffId", "content", "sessionId", "timestamp"]
            }
          },
          {
            "action": "trigger_satisfaction_inference",
            "params": {
              "async": true,
              "delay": 5000 // 5秒后触发
            }
          },
          {
            "action": "send_notification",
            "params": {
              "channel": "monitoring_dashboard",
              "event": "staff_message_received",
              "data": {
                "staffId": "${staffId}",
                "sessionId": "${sessionId}",
                "content": "${content}"
              }
            }
          }
        ]
      }
    },
    
    {
      "id": "node_collaboration_decision",
      "type": "processor",
      "name": "协同决策",
      "config": {
        "tasks": [
          {
            "action": "get_session_status",
            "params": {
              "sessionId": "${sessionId}"
            }
          },
          {
            "action": "check_manual_override",
            "params": {
              "checkStaffCommands": true
            }
          },
          {
            "action": "evaluate_intervention_needed",
            "params": {
              "rules": [
                "complex_question",
                "negative_emotion",
                "escalation_request"
              ]
            }
          },
          {
            "action": "make_decision",
            "params": {
              "output": "decision_result",
              "fields": ["need_intervention", "reason", "confidence"]
            }
          },
          {
            "action": "log_decision",
            "params": {
              "table": "decision_logs",
              "fields": ["sessionId", "decision", "reason", "confidence", "timestamp"]
            }
          }
        ]
      }
    },
    
    {
      "id": "node_ai_processing",
      "type": "processor",
      "name": "AI处理",
      "config": {
        "tasks": [
          {
            "action": "intent_recognition",
            "params": {
              "model": "doubao",
              "threshold": 0.7
            }
          },
          {
            "action": "knowledge_retrieval",
            "params": {
              "vectorDb": "doubao_embedding",
              "topK": 5
            }
          },
          {
            "action": "generate_response",
            "params": {
              "model": "doubao",
              "promptTemplate": "customer_service",
              "contextLength": 10
            }
          }
        ]
      }
    },
    
    {
      "id": "node_save_message",
      "type": "processor",
      "name": "保存消息",
      "config": {
        "tasks": [
          {
            "action": "save_user_message",
            "params": {
              "table": "session_messages",
              "fields": ["userId", "content", "sessionId", "intent", "confidence", "timestamp"]
            }
          },
          {
            "action": "save_ai_response",
            "params": {
              "table": "session_messages",
              "fields": ["botId", "content", "sessionId", "timestamp", "intent"]
            }
          }
        ]
      }
    },
    
    {
      "id": "node_satisfaction_inference",
      "type": "processor",
      "name": "满意度推断",
      "config": {
        "async": true,
        "delay": 10000, // 10秒后异步执行
        "tasks": [
          {
            "action": "keyword_inference",
            "params": {
              "positiveKeywords": ["谢谢", "解决了", "满意", "好"],
              "negativeKeywords": ["差", "不行", "没用", "投诉"]
            }
          },
          {
            "action": "duration_inference",
            "params": {
              "thresholds": {
                "short": 3, // 3分钟内
                "normal": 10,
                "long": 20
              }
            }
          },
          {
            "action": "turn_inference",
            "params": {
              "thresholds": {
                "quick": 3,
                "normal": 6,
                "long": 10
              }
            }
          },
          {
            "action": "sentiment_inference",
            "params": {
              "model": "doubao"
            }
          },
          {
            "action": "calculate_overall_score",
            "params": {
              "weights": {
                "keyword": 0.4,
                "duration": 0.25,
                "turn": 0.2,
                "sentiment": 0.15
              }
            }
          },
          {
            "action": "save_satisfaction",
            "params": {
              "table": "session_satisfaction",
              "fields": ["sessionId", "overallScore", "overallConfidence", "scores", "calculatedAt"]
            }
          },
          {
            "action": "check_alert_triggers",
            "params": {
              "rules": [
                "low_satisfaction_alert",
                "continuous_low_satisfaction_alert"
              ]
            }
          }
        ]
      }
    },
    
    {
      "id": "node_send_to_monitoring",
      "type": "processor",
      "name": "发送到监控中心",
      "config": {
        "tasks": [
          {
            "action": "push_to_websocket",
            "params": {
              "channel": "monitoring_realtime",
              "event": "message_processed",
              "data": {
                "sessionId": "${sessionId}",
                "type": "${messageType}",
                "content": "${content}",
                "satisfaction": "${satisfactionScore}"
              }
            }
          },
          {
            "action": "update_redis_cache",
            "params": {
              "key": "session:${sessionId}:latest",
              "ttl": 3600,
              "data": {
                "lastMessage": "${content}",
                "lastMessageTime": "${timestamp}",
                "satisfaction": "${satisfactionScore}"
              }
            }
          }
        ]
      }
    }
  ],
  
  "edges": [
    { "from": "node_message_received", "to": "node_preprocess" },
    { "from": "node_preprocess", "to": "node_staff_check" },
    { "from": "node_staff_check", "to": "node_staff_message_processing", "condition": "true" },
    { "from": "node_staff_check", "to": "node_collaboration_decision", "condition": "false" },
    { "from": "node_collaboration_decision", "to": "node_ai_processing" },
    { "from": "node_ai_processing", "to": "node_save_message" },
    { "from": "node_save_message", "to": "node_satisfaction_inference" },
    { "from": "node_satisfaction_inference", "to": "node_send_to_monitoring" }
  ]
}
```

---

### **1.3 流程实例与会话的关联**

#### **数据关联设计**

```typescript
// flow_instances 表扩展字段
interface FlowInstance {
  id: string;
  flowDefinitionId: string;
  flowName: string;
  
  // 关联会话
  sessionId: string;        // 关联 session_messages.session_id
  userId: string;           // 关联 session_messages.user_id
  groupId?: string;         // 群聊ID
  botId: string;            // 机器人ID
  
  // 流程状态
  currentNodeId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  
  // 触发数据
  triggerData: {
    messageType: 'user' | 'staff' | 'bot';
    content: string;
    timestamp: string;
    msgId: string;
  };
  
  // 执行结果
  result?: {
    response: string;        // AI回复内容
    decision: any;           // 协同决策结果
    satisfaction?: number;   // 满意度分数
  };
  
  // 时间记录
  startedAt: string;
  completedAt?: string;
  error?: string;
  
  // 元数据
  metadata: {
    userFeatures: any;
    messageFeatures: any;
    staffIdentified: boolean;
    interventionNeeded: boolean;
  };
}

// session_messages 表关联流程实例
interface SessionMessage {
  id: string;
  sessionId: string;
  userId?: string;
  botId?: string;
  staffId?: string;
  content: string;
  messageType: 'user' | 'bot' | 'staff';
  timestamp: string;
  
  // 关联流程实例
  flowInstanceId?: string;   // 关联 flow_instances.id
  
  // 意图和情感
  intent?: string;
  confidence?: number;
  sentiment?: string;
  
  // 满意度推断
  satisfactionInferred?: boolean;
  satisfactionScore?: number;
}

// decision_logs 表
interface DecisionLog {
  id: string;
  sessionId: string;
  flowInstanceId: string;
  
  // 决策内容
  decision: 'auto_continue' | 'need_intervention' | 'staff_override';
  reason: string;
  confidence: number;
  
  // 决策依据
  factors: {
    isStaffMessage: boolean;
    negativeEmotion: boolean;
    complexQuestion: boolean;
    escalationRequest: boolean;
  };
  
  timestamp: string;
}
```

---

### **1.4 信息中心读取流程数据**

#### **实时监控读取流程实例**

```typescript
// GET /api/monitoring/realtime/flow-stats
interface FlowStatsResponse {
  // 流程实例统计
  totalInstances: number;
  runningInstances: number;
  completedInstances: number;
  failedInstances: number;
  
  // 流程性能
  avgExecutionTime: number;  // 平均执行时间（毫秒）
  successRate: number;       // 成功率
  
  // 按流程定义统计
  byFlowDefinition: {
    [flowName: string]: {
      total: number;
      running: number;
      completed: number;
      failed: number;
      avgTime: number;
    }
  };
  
  // 按会话统计
  bySession: {
    sessionId: string;
    instanceCount: number;
    avgExecutionTime: number;
    lastExecutedAt: string;
  }[];
}

// GET /api/monitoring/realtime/recent-executions
interface RecentExecutionsResponse {
  executions: {
    id: string;
    sessionId: string;
    userId: string;
    flowName: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    executionTime?: number;
    triggerData: {
      messageType: string;
      content: string;
    };
    result?: any;
    error?: string;
  }[];
}
```

#### **会话分析读取流程数据**

```typescript
// GET /api/sessions/:sessionId/flow-instances
interface SessionFlowInstancesResponse {
  sessionId: string;
  instances: {
    id: string;
    flowName: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    executionTime?: number;
    currentNode: string;
    triggerData: any;
    result?: any;
    error?: string;
    decisionLog?: DecisionLog;
  }[];
  
  // 流程统计
  statistics: {
    totalInstances: number;
    completedInstances: number;
    avgExecutionTime: number;
    successRate: number;
    interventionRate: number;  // 人工介入率
  };
}
```

---

## 🚨 二、监控告警中心架构设计

### **2.1 监控告警中心整体架构**

```
┌─────────────────────────────────────────────────────────────────┐
│                     监控告警中心（前端）                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 实时监控  │  │ 告警管理  │  │ 事件分析  │  │ 通知管理  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐                                  │
│  │ 规则配置  │  │ 告警历史  │                                  │
│  └──────────┘  └──────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   告警引擎（后端）                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 规则引擎  │  │ 事件采集  │  │ 评估器   │  │ 告警触发  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐                                  │
│  │ 聚合器   │  │ 压缩器   │                                  │
│  └──────────┘  └──────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   数据源层                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 流程引擎  │  │ 满意度   │  │ 协同决策  │  │ 消息流   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ 系统指标  │  │ 工作人员  │  │ 会话状态  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### **2.2 监控告警中心页面结构**

#### **主导航设计**

```
监控告警中心
├── 📊 实时监控（默认首页）
│   ├── 系统概览
│   ├── 流程监控
│   ├── 告警概览
│   └── 事件流
│
├── 🚨 告警管理
│   ├── 告警规则
│   ├── 告警列表
│   ├── 告警处理
│   └── 告警统计
│
├── 📋 事件分析
│   ├── 事件列表
│   ├── 事件详情
│   ├── 事件统计
│   └── 事件趋势
│
├── 🔔 通知管理
│   ├── 通知渠道
│   ├── 通知历史
│   ├── 通知模板
│   └── 通知统计
│
├── ⚙️ 规则配置
│   ├── 告警规则
│   ├── 聚合规则
│   ├── 压缩规则
│   └── 通知规则
│
└── 📜 告警历史
    ├── 告警记录
    ├── 处理历史
    ├── 处理统计
    └── 趋势分析
```

---

### **2.3 实时监控模块设计**

#### **页面布局**

```
┌───────────────────────────────────────────────────────────────┐
│  实时监控                                        刷新: 10秒  🔄 │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  系统概览                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 流程实例数    │  │ 活跃会话数    │  │ 告警触发数    │       │
│  │   1,256      │  │     85       │  │     12       │       │
│  │  → 运行中  45│  │  → 自动 70   │  │  → 未处理 5   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 平均执行时间  │  │ 成功率        │  │ 满意度均值    │       │
│  │   1.2秒      │  │   99.2%      │  │   4.2分      │       │
│  │  ↓ 0.1秒     │  │  → 稳定      │  │  ↑ 0.2分     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  流程监控                                            查看全部  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  流程名称              运行中  完成  失败  平均耗时     │ │
│  │  消息处理流程              15    1240    5   1.1秒    │ │
│  │  满意度推断流程            8     980    2   0.8秒    │ │
│  │  协同决策流程              5     756    0   0.5秒    │ │
│  │  通知发送流程              3     620    1   0.3秒    │ │
│  └─────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────┤
│  告警概览                                    未处理告警: 5     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  🔴 低满意度告警 (未处理)                                 │ │
│  │     会话: sess_001  满意度: 2.0分  时间: 2分钟前        │ │
│  │     [立即处理]  [忽略]                                     │ │
│  │                                                         │ │
│  │  🟡 连续低满意度告警 (未处理)                             │ │
│  │     工作人员: 张三  连续3次低分  时间: 5分钟前          │ │
│  │     [立即处理]  [忽略]                                     │ │
│  │                                                         │ │
│  │  🟠 流程失败告警 (未处理)                                │ │
│  │     流程: 满意度推断  错误: 超时  时间: 1分钟前         │ │
│  │     [立即处理]  [查看日志]                                 │ │
│  │                                                         │ │
│  │  [查看全部告警]                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────┤
│  事件流 (最新20条)                           更多 →          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  18:32  🟢 INFO    流程实例完成 - flow_msg_001            │ │
│  │  18:31  🟢 INFO    消息处理成功 - sess_001               │ │
│  │  18:30  🔴 ERROR   满意度推断失败 - sess_002 (超时)     │ │
│  │  18:29  🟡 WARN    低满意度告警触发 - sess_003 (2.0分)   │ │
│  │  18:28  🟢 INFO    工作人员消息接收 - 张三               │ │
│  │  18:27  🟢 INFO    协同决策生成 - 需要人工介入           │ │
│  │  18:26  🟢 INFO    AI响应生成成功 - 豆包                 │ │
│  │  18:25  🔴 ERROR   流程实例失败 - flow_satisfaction_001  │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

### **2.4 告警规则设计**

#### **预置告警规则**

```typescript
// alert_rules 表定义
interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'critical' | 'warning' | 'info';
  category: 'satisfaction' | 'performance' | 'availability' | 'collaboration';
  
  // 触发条件
  condition: {
    metric: string;           // 监控指标
    operator: '>' | '<' | '=' | '>=' | '<=' | '!=' | 'between';
    threshold: number | [number, number];
    timeWindow: number;       // 时间窗口（秒）
    aggregation: 'avg' | 'sum' | 'count' | 'min' | 'max' | 'last';
  };
  
  // 告警聚合
  aggregation: {
    enabled: boolean;
    window: number;           // 聚合窗口（秒）
    threshold: number;        // 聚合阈值
  };
  
  // 告警压缩
  suppression: {
    enabled: boolean;
    window: number;           // 压缩窗口（秒）
    maxAlerts: number;        // 最大告警数
  };
  
  // 通知配置
  notification: {
    channels: ('bot' | 'email' | 'wechat' | 'sms')[];
    recipients: string[];     // 接收人ID列表
    template: string;         // 通知模板ID
  };
  
  // 创建和更新信息
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// 预置告警规则列表
const PRESET_ALERT_RULES: AlertRule[] = [
  // 满意度相关
  {
    id: "rule_low_satisfaction",
    name: "低满意度告警",
    description: "当会话满意度低于阈值时触发",
    enabled: true,
    severity: "critical",
    category: "satisfaction",
    condition: {
      metric: "session_satisfaction.overallScore",
      operator: "<=",
      threshold: 2.5,
      timeWindow: 60,
      aggregation: "last"
    },
    aggregation: {
      enabled: false
    },
    suppression: {
      enabled: true,
      window: 300,
      maxAlerts: 1
    },
    notification: {
      channels: ["bot"],
      recipients: ["@all"],
      template: "template_low_satisfaction"
    }
  },
  
  {
    id: "rule_continuous_low_satisfaction",
    name: "连续低满意度告警",
    description: "当同一工作人员连续出现低满意度时触发",
    enabled: true,
    severity: "warning",
    category: "collaboration",
    condition: {
      metric: "staff_performance.low_satisfaction_count",
      operator: ">=",
      threshold: 3,
      timeWindow: 3600,
      aggregation: "count"
    },
    aggregation: {
      enabled: true,
      window: 3600,
      threshold: 3
    },
    suppression: {
      enabled: true,
      window: 1800,
      maxAlerts: 1
    },
    notification: {
      channels: ["bot", "email"],
      recipients: ["@张三", "admin@company.com"],
      template: "template_continuous_low_satisfaction"
    }
  },
  
  {
    id: "rule_staff_satisfaction_decline",
    name: "工作人员满意度下降告警",
    description: "当工作人员平均满意度下降超过阈值时触发",
    enabled: true,
    severity: "warning",
    category: "collaboration",
    condition: {
      metric: "staff_performance.avg_satisfaction_change",
      operator: "<=",
      threshold: -0.5,
      timeWindow: 86400,
      aggregation: "avg"
    },
    aggregation: {
      enabled: false
    },
    suppression: {
      enabled: true,
      window: 3600,
      maxAlerts: 1
    },
    notification: {
      channels: ["bot"],
      recipients: ["@张三"],
      template: "template_staff_satisfaction_decline"
    }
  },
  
  {
    id: "rule_overall_satisfaction_decline",
    name: "整体满意度下降告警",
    description: "当整体满意度下降超过阈值时触发",
    enabled: true,
    severity: "warning",
    category: "satisfaction",
    condition: {
      metric: "overall_satisfaction.avg_score_change",
      operator: "<=",
      threshold: -0.3,
      timeWindow: 3600,
      aggregation: "avg"
    },
    aggregation: {
      enabled: false
    },
    suppression: {
      enabled: true,
      window: 1800,
      maxAlerts: 1
    },
    notification: {
      channels: ["bot", "email"],
      recipients: ["@all", "admin@company.com"],
      template: "template_overall_satisfaction_decline"
    }
  },
  
  // 性能相关
  {
    id: "rule_flow_execution_timeout",
    name: "流程执行超时告警",
    description: "当流程执行时间超过阈值时触发",
    enabled: true,
    severity: "warning",
    category: "performance",
    condition: {
      metric: "flow_instance.execution_time",
      operator: ">",
      threshold: 5000,
      timeWindow: 60,
      aggregation: "max"
    },
    aggregation: {
      enabled: false
    },
    suppression: {
      enabled: true,
      window: 300,
      maxAlerts: 3
    },
    notification: {
      channels: ["bot"],
      recipients: ["@技术组"],
      template: "template_flow_timeout"
    }
  },
  
  {
    id: "rule_flow_failure_rate",
    name: "流程失败率告警",
    description: "当流程失败率超过阈值时触发",
    enabled: true,
    severity: "critical",
    category: "availability",
    condition: {
      metric: "flow_instance.failure_rate",
      operator: ">=",
      threshold: 0.05,
      timeWindow: 300,
      aggregation: "avg"
    },
    aggregation: {
      enabled: true,
      window: 300,
      threshold: 0.05
    },
    suppression: {
      enabled: true,
      window: 600,
      maxAlerts: 1
    },
    notification: {
      channels: ["bot", "email"],
      recipients: ["@技术组", "admin@company.com"],
      template: "template_flow_failure_rate"
    }
  },
  
  // 协同相关
  {
    id: "rule_high_intervention_rate",
    name: "高人工介入率告警",
    description: "当人工介入率超过阈值时触发",
    enabled: true,
    severity: "warning",
    category: "collaboration",
    condition: {
      metric: "collaboration.intervention_rate",
      operator: ">=",
      threshold: 0.2,
      timeWindow: 3600,
      aggregation: "avg"
    },
    aggregation: {
      enabled: false
    },
    suppression: {
      enabled: true,
      window: 1800,
      maxAlerts: 1
    },
    notification: {
      channels: ["bot"],
      recipients: ["@运营组"],
      template: "template_high_intervention_rate"
    }
  },
  
  {
    id: "rule_staff_overload",
    name: "工作人员过载告警",
    description: "当工作人员同时处理会话数超过阈值时触发",
    enabled: true,
    severity: "warning",
    category: "collaboration",
    condition: {
      metric: "staff_performance.active_sessions",
      operator: ">=",
      threshold: 5,
      timeWindow: 60,
      aggregation: "max"
    },
    aggregation: {
      enabled: false
    },
    suppression: {
      enabled: true,
      window: 600,
      maxAlerts: 1
    },
    notification: {
      channels: ["bot"],
      recipients: ["@张三"],
      template: "template_staff_overload"
    }
  },
  
  // 系统相关
  {
    id: "rule_high_message_volume",
    name: "高消息量告警",
    description: "当消息量超过阈值时触发（可能为攻击）",
    enabled: true,
    severity: "critical",
    category: "availability",
    condition: {
      metric: "message.count",
      operator: ">=",
      threshold: 100,
      timeWindow: 60,
      aggregation: "count"
    },
    aggregation: {
      enabled: true,
      window: 60,
      threshold: 100
    },
    suppression: {
      enabled: true,
      window: 300,
      maxAlerts: 1
    },
    notification: {
      channels: ["bot", "email", "sms"],
      recipients: ["@技术组", "admin@company.com"],
      template: "template_high_message_volume"
    }
  },
  
  {
    id: "rule_long_session",
    name: "长会话告警",
    description: "当会话持续时间超过阈值时触发",
    enabled: true,
    severity: "info",
    category: "performance",
    condition: {
      metric: "session.duration",
      operator: ">=",
      threshold: 1800,
      timeWindow: 60,
      aggregation: "max"
    },
    aggregation: {
      enabled: false
    },
    suppression: {
      enabled: true,
      window: 600,
      maxAlerts: 1
    },
    notification: {
      channels: ["bot"],
      recipients: ["@张三"],
      template: "template_long_session"
    }
  }
];
```

---

### **2.5 告警引擎工作流程**

#### **告警触发流程**

```
┌─────────────────────────────────────────────────────────────┐
│                    数据采集（事件源）                          │
│  • 流程引擎完成事件 (flow_instance.completed)                │
│  • 流程引擎失败事件 (flow_instance.failed)                   │
│  • 满意度计算完成 (satisfaction_calculated)                  │
│  • 工作人员消息接收 (staff_message_received)                 │
│  • 协同决策生成 (decision_made)                             │
│  • 消息处理完成 (message_processed)                         │
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    事件采集器                                 │
│  • 从消息队列接收事件                                        │
│  • 解析事件数据                                              │
│  • 提取关键指标                                              │
│  • 存储到 events 表                                          │
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    评估器                                     │
│  • 加载启用的告警规则                                        │
│  • 评估每个规则是否触发                                      │
│  • 计算规则条件是否满足                                      │
│  • 生成告警事件                                              │
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    聚合器                                     │
│  • 将相似告警聚合到一起                                      │
│  • 按时间窗口聚合                                            │
│  • 按维度聚合（工作人员、会话等）                             │
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    压缩器                                     │
│  • 在压缩窗口内抑制重复告警                                  │
│  • 限制最大告警数量                                          │
│  • 合并相似告警                                              │
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    告警触发器                                 │
│  • 生成告警记录                                              │
│  • 写入 alert_history 表                                     │
│  • 更新告警统计                                              │
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    通知发送器                                 │
│  • 根据规则配置选择通知渠道                                  │
│  • 使用通知模板生成消息                                      │
│  • 发送通知（机器人消息、邮件、企业微信等）                   │
│  • 记录通知历史                                              │
└─────────────────────────────┬───────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    实时推送                                   │
│  • WebSocket 推送到监控中心                                  │
│  • 更新实时指标                                              │
│  • 触发前端告警提示                                          │
└─────────────────────────────────────────────────────────────┘
```

---

### **2.6 告警数据模型**

#### **核心表结构**

```typescript
// alert_history 表
interface AlertHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  
  // 告警信息
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  
  // 触发数据
  metric: string;
  currentValue: number;
  threshold: number;
  condition: string;
  
  // 关联数据
  sessionId?: string;
  staffId?: string;
  flowInstanceId?: string;
  userId?: string;
  
  // 时间信息
  triggeredAt: string;
  resolvedAt?: string;
  
  // 处理信息
  status: 'pending' | 'acknowledged' | 'resolved' | 'suppressed';
  handledBy?: string;
  handledAt?: string;
  handleNote?: string;
  
  // 通知信息
  notificationSent: boolean;
  notificationChannels: string[];
  notificationRecipients: string[];
}

// alert_stats 表
interface AlertStats {
  id: string;
  date: string; // YYYY-MM-DD
  
  // 按严重级别统计
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  
  // 按类别统计
  satisfactionCount: number;
  performanceCount: number;
  availabilityCount: number;
  collaborationCount: number;
  
  // 按状态统计
  pendingCount: number;
  acknowledgedCount: number;
  resolvedCount: number;
  
  // 响应时间统计
  avgResponseTime: number; // 秒
  maxResponseTime: number;
  minResponseTime: number;
  
  // 创建时间
  createdAt: string;
  updatedAt: string;
}
```

---

## 🔗 三、系统联动性设计

### **3.1 完整数据流向**

```
┌───────────────────────────────────────────────────────────────┐
│                        用户消息进入                             │
└─────────────────────────────┬─────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────┐
│                    回调接口接收                                │
│  • 识别发送者（用户/工作人员）                                │
│  • 提取消息特征                                              │
└─────────────────────────────┬─────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────┐
│                    流程引擎启动                                │
│  • 创建流程实例 (flow_instances)                              │
│  • 执行消息处理流程                                          │
└─────────────────────────────┬─────────────────────────────────┘
                              ↓
         ┌────────────────────┼────────────────────┐
         ↓                    ↓                    ↓
    ┌─────────┐        ┌──────────┐        ┌──────────┐
    │ 消息处理 │        │ 协同决策  │        │ 满意度   │
    │ 节点     │        │ 节点      │        │ 推断节点  │
    └────┬────┘        └─────┬────┘        └────┬─────┘
         ↓                   ↓                   ↓
    ┌─────────┐        ┌──────────┐        ┌──────────┐
    │ 写入消息  │        │ 记录决策  │        │ 计算分数  │
    │ (session │        │ (decision │        │ (session  │
    │ _messages│        │ _logs)   │        │ _satisfac │
    │ )        │        │          │        │ tion)    │
    └────┬────┘        └─────┬────┘        └────┬─────┘
         └────────────────────┼────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  流程实例完成    │
                    │  (flow_instances)│
                    └──────┬───────────┘
                           ↓
                    ┌──────────────────┐
                    │  触发事件        │
                    │  (消息队列)      │
                    └──────┬───────────┘
                           ↓
         ┌─────────────────┼──────────────────┐
         ↓                 ↓                  ↓
    ┌──────────┐     ┌──────────┐      ┌──────────┐
    │ 满意度   │     │ 告警引擎  │      │ 通知服务  │
    │ 推断     │     │ (评估     │      │ (发送通知)│
    │ (异步)   │     │  规则)    │      │          │
    └────┬─────┘     └────┬─────┘      └────┬─────┘
         ↓                ↓                 ↓
    ┌──────────┐     ┌──────────┐      ┌──────────┐
    │ 更新     │     │ 生成告警  │      │ 发送     │
    │ 满意度   │     │ (alert_   │      │ 通知     │
    │ 分数     │     │ history)  │      │ (notifi  │
    │          │     │          │      │ cation)  │
    └────┬─────┘     └────┬─────┘      └────┬─────┘
         └─────────────────┼──────────────────┘
                           ↓
                    ┌──────────────────┐
                    │  实时推送        │
                    │  (WebSocket)     │
                    └──────┬───────────┘
                           ↓
                    ┌──────────────────┐
                    │  信息中心        │
                    │  - 实时监控      │
                    │  - 会话分析      │
                    │  - 协同分析      │
                    │  - 监控告警      │
                    └──────────────────┘
```

---

### **3.2 信息中心与各模块的联动**

#### **联动关系表**

| 信息中心模块 | 依赖的数据源 | 提供的能力 | 触发条件 |
|------------|------------|----------|---------|
| **实时监控** | flow_instances, session_messages, alert_history | 实时指标、消息流、告警概览 | 消息处理完成、告警触发 |
| **会话分析** | session_messages, session_satisfaction, flow_instances | 会话列表、会话详情、满意度分析 | 用户查询、定时聚合 |
| **协同分析** | decision_logs, staff_messages, staff_performance | 人工介入分析、工作人员绩效、满意度分析 | 工作人员处理、决策生成 |
| **工作人员管理** | staff_activity, staff_performance, session_satisfaction | 工作人员列表、绩效分析、工作负载 | 工作人员活动、满意度更新 |
| **数据报表** | 所有聚合表 | 日报/周报/月报、自定义报表 | 定时任务、用户请求 |
| **监控告警** | alert_history, alert_rules, events | 告警管理、规则配置、事件分析 | 告警触发、规则变更 |
| **设置** | alert_rules, notification_methods | 告警规则、通知配置、系统设置 | 用户配置变更 |

---

### **3.3 关键联动场景**

#### **场景1：用户发送消息 → 实时监控更新**

```
1. 用户发送消息
   ↓
2. 回调接口接收消息
   ↓
3. 流程引擎创建实例并执行
   ├─ 消息预处理
   ├─ 工作人员识别
   ├─ 协同决策
   ├─ AI处理
   └─ 消息保存
   ↓
4. 流程实例完成
   ↓
5. 写入 session_messages
   ↓
6. 触发事件到消息队列
   ↓
7. 实时推送服务接收事件
   ↓
8. WebSocket 推送到信息中心
   ├─ 更新实时消息流
   ├─ 更新会话状态
   └─ 更新工作人员在线状态
```

#### **场景2：满意度推断 → 告警触发 → 通知发送**

```
1. 消息处理完成
   ↓
2. 异步触发满意度推断
   ├─ 关键词推断
   ├─ 时长推断
   ├─ 轮次推断
   └─ 情感推断
   ↓
3. 计算综合满意度分数
   ↓
4. 写入 session_satisfaction
   ↓
5. 触发告警规则评估
   ├─ 评估低满意度规则
   ├─ 评估连续低满意度规则
   └─ 评估工作人员满意度下降规则
   ↓
6. 告警触发（如果满足条件）
   ├─ 生成告警记录
   ├─ 写入 alert_history
   └─ 聚合/压缩告警
   ↓
7. 发送通知
   ├─ 机器人消息
   ├─ 邮件通知
   └─ 企业微信通知
   ↓
8. WebSocket 推送到信息中心
   ├─ 更新告警概览
   ├─ 更新满意度分布
   └─ 更新工作人员绩效
```

#### **场景3：工作人员发送消息 → 状态变更 → 协同分析更新**

```
1. 工作人员发送消息
   ↓
2. 回调接口接收消息
   ↓
3. 识别为工作人员消息
   ↓
4. 流程引擎跳转到工作人员处理流程
   ├─ 更新会话状态为人工
   ├─ 保存工作人员消息
   ├─ 记录决策日志
   └─ 触发满意度推断
   ↓
5. 写入 staff_messages
   ↓
6. 更新 session_status_changes
   ↓
7. 写入 decision_logs
   ↓
8. 更新 staff_activity
   ↓
9. WebSocket 推送到信息中心
   ├─ 更新会话状态分布
   ├─ 更新人工介入统计
   ├─ 更新工作人员绩效
   └─ 更新协同分析数据
```

#### **场景4：流程失败 → 告警触发 → 故障排查**

```
1. 流程执行异常
   ↓
2. 流程实例失败
   ├─ 记录失败原因
   ├─ 更新状态为 failed
   └─ 记录错误信息
   ↓
3. 写入 flow_instances
   ↓
4. 触发告警规则评估
   └─ 评估流程失败率规则
   ↓
5. 告警触发
   ├─ 生成告警记录
   └─ 写入 alert_history
   ↓
6. 发送通知
   └─ 发送给技术组
   ↓
7. WebSocket 推送到信息中心
   ├─ 更新流程监控
   ├─ 更新告警列表
   └─ 更新事件流
   ↓
8. 管理员查看告警详情
   ├─ 查看流程实例详情
   ├─ 查看错误堆栈
   └─ 查看相关会话
   ↓
9. 管理员处理告警
   ├─ 标记为已处理
   ├─ 添加处理备注
   └─ 触发系统修复流程
```

---

### **3.4 实时数据同步机制**

#### **WebSocket 频道设计**

```typescript
// WebSocket 频道定义
interface WebSocketChannels {
  // 实时监控频道
  'monitoring:realtime': {
    events: {
      'metrics:update': {
        data: {
          totalSessions: number;
          activeSessions: number;
          satisfaction: number;
          interventionCount: number;
          timestamp: string;
        }
      },
      'message:stream': {
        data: {
          id: string;
          type: 'user' | 'staff' | 'bot';
          content: string;
          sessionId: string;
          staffId?: string;
          timestamp: string;
        }
      },
      'status:change': {
        data: {
          sessionId: string;
          oldStatus: string;
          newStatus: string;
          triggeredBy: string;
          timestamp: string;
        }
      }
    }
  },
  
  // 告警频道
  'alerts:realtime': {
    events: {
      'alert:triggered': {
        data: {
          alertId: string;
          ruleId: string;
          severity: string;
          message: string;
          sessionId?: string;
          staffId?: string;
          timestamp: string;
        }
      },
      'alert:resolved': {
        data: {
          alertId: string;
          resolvedBy: string;
          resolvedAt: string;
          handleNote?: string;
        }
      }
    }
  },
  
  // 会话频道
  'sessions:realtime': {
    events: {
      'session:created': {
        data: {
          sessionId: string;
          userId: string;
          botId: string;
          createdAt: string;
        }
      },
      'session:updated': {
        data: {
          sessionId: string;
          updates: {
            status?: string;
            satisfaction?: number;
            messageCount?: number;
          };
          updatedAt: string;
        }
      }
    }
  },
  
  // 工作人员频道
  'staff:realtime': {
    events: {
      'staff:online': {
        data: {
          staffId: string;
          staffName: string;
          onlineAt: string;
        }
      },
      'staff:offline': {
        data: {
          staffId: string;
          staffName: string;
          offlineAt: string;
        }
      },
      'staff:message': {
        data: {
          staffId: string;
          sessionId: string;
          content: string;
          timestamp: string;
        }
      }
    }
  },
  
  // 流程引擎频道
  'flows:realtime': {
    events: {
      'flow:started': {
        data: {
          flowInstanceId: string;
          flowName: string;
          sessionId: string;
          startedAt: string;
        }
      },
      'flow:completed': {
        data: {
          flowInstanceId: string;
          flowName: string;
          sessionId: string;
          completedAt: string;
          executionTime: number;
          result?: any;
        }
      },
      'flow:failed': {
        data: {
          flowInstanceId: string;
          flowName: string;
          sessionId: string;
          failedAt: string;
          errorMessage: string;
        }
      }
    }
  }
}
```

---

### **3.5 数据缓存策略**

#### **Redis 缓存设计**

```typescript
// Redis 缓存键设计
interface RedisCacheKeys {
  // 会话相关
  'session:{sessionId}:info': {
    ttl: 3600;
    data: {
      sessionId: string;
      userId: string;
      botId: string;
      status: string;
      createdAt: string;
      lastMessage: string;
      lastMessageTime: string;
      satisfaction?: number;
    }
  },
  
  'session:{sessionId}:messages': {
    ttl: 1800;
    data: {
      messages: Array<{
        id: string;
        type: string;
        content: string;
        timestamp: string;
      }>;
    }
  },
  
  'session:{sessionId}:satisfaction': {
    ttl: 7200;
    data: {
      overallScore: number;
      overallConfidence: number;
      scores: any[];
      calculatedAt: string;
    }
  },
  
  // 工作人员相关
  'staff:{staffId}:info': {
    ttl: 1800;
    data: {
      staffId: string;
      staffName: string;
      status: 'online' | 'offline';
      activeSessions: number;
      todayMessages: number;
      avgSatisfaction: number;
    }
  },
  
  'staff:{staffId}:active-sessions': {
    ttl: 300;
    data: {
      sessionIds: string[];
    }
  },
  
  // 实时指标
  'metrics:realtime': {
    ttl: 60;
    data: {
      totalSessions: number;
      activeSessions: number;
      onlineStaff: number;
      todaySatisfaction: number;
      interventionCount: number;
      avgResponseTime: number;
      timestamp: string;
    }
  },
  
  // 告警相关
  'alerts:pending': {
    ttl: 300;
    data: {
      alerts: Array<{
        id: string;
        severity: string;
        message: string;
        triggeredAt: string;
      }>;
    }
  },
  
  // 流程实例相关
  'flow:{flowInstanceId}:info': {
    ttl: 600;
    data: {
      flowInstanceId: string;
      flowName: string;
      sessionId: string;
      status: string;
      currentNode: string;
      startedAt: string;
      triggerData: any;
    }
  }
}
```

---

## 📋 四、完整实施方案

### **4.1 实施步骤**

```
Phase 1: 流程引擎集成（2周）
├── 设计消息处理流程定义
├── 实现流程节点处理器
├── 集成消息回调接口
├── 实现流程实例与会话关联
└── 验证数据流转

Phase 2: 告警引擎开发（3周）
├── 设计告警规则引擎
├── 实现事件采集器
├── 实现评估器、聚合器、压缩器
├── 开发告警触发器
└── 实现通知发送器

Phase 3: 监控告警中心前端（2周）
├── 开发实时监控页面
├── 开发告警管理页面
├── 开发事件分析页面
├── 开发通知管理页面
└── 开发规则配置页面

Phase 4: 系统联动完善（2周）
├── 完善 WebSocket 推送
├── 优化数据缓存策略
├── 实现实时数据同步
└── 联动测试

Phase 5: 优化和测试（1周）
├── 性能优化
├── 压力测试
├── 用户体验优化
└── 文档完善
```

---
## 信息中心系统联动完整设计方案

### 一、信息中心与流程引擎集成方案

#### 1.1 消息流向与流程引擎的关系

**完整消息处理流程：**
```
用户消息 → 回调接口 → 流程引擎 → 消息预处理 → 工作人员识别 → 协同决策 → 消息处理 → 回复生成 → 数据写入 → 满意度推断 → 监控推送 → 信息中心
```

#### 1.2 流程定义设计

**消息处理主流程：**
- **消息接收节点**：接收消息并提取字段
- **消息预处理节点**：提取用户特征、消息特征、识别发送者类型
- **工作人员判断节点**：判断是否为工作人员消息
- **工作人员消息处理节点**：更新会话状态、保存消息、触发满意度推断、发送通知
- **协同决策节点**：获取会话状态、检查手动覆盖、评估是否需要介入、生成决策、记录决策
- **AI处理节点**：意图识别、知识库检索、生成响应
- **保存消息节点**：保存用户消息和AI响应
- **满意度推断节点**：异步执行关键词推断、时长推断、轮次推断、情感推断、计算综合分数、保存满意度、检查告警触发
- **发送到监控中心节点**：WebSocket推送、更新Redis缓存

#### 1.3 流程实例与会话的关联

**数据关联设计：**
- `flow_instances` 表：存储流程实例，包含 `sessionId`、`userId`、`groupId`、`botId` 等关联字段
- `session_messages` 表：存储消息，包含 `flowInstanceId` 关联字段
- `decision_logs` 表：存储决策日志，包含 `sessionId`、`flowInstanceId` 关联字段

#### 1.4 信息中心读取流程数据

**API接口：**
- `GET /api/monitoring/realtime/flow-stats`：获取流程实例统计
- `GET /api/monitoring/realtime/recent-executions`：获取最近执行记录
- `GET /api/sessions/:sessionId/flow-instances`：获取会话的流程实例列表

---

### 二、监控告警中心架构设计

#### 2.1 监控告警中心整体架构

```
监控告警中心前端 → 告警引擎 → 数据源层
```

**核心模块：**
- 告警引擎：规则引擎、事件采集、评估器、告警触发、聚合器、压缩器
- 数据源层：流程引擎、满意度、协同决策、消息流、系统指标、工作人员、会话状态

#### 2.2 监控告警中心页面结构

**主导航：**
- 📊 实时监控：系统概览、流程监控、告警概览、事件流
- 🚨 告警管理：告警规则、告警列表、告警处理、告警统计
- 📋 事件分析：事件列表、事件详情、事件统计、事件趋势
- 🔔 通知管理：通知渠道、通知历史、通知模板、通知统计
- ⚙️ 规则配置：告警规则、聚合规则、压缩规则、通知规则
- 📜 告警历史：告警记录、处理历史、处理统计、趋势分析

#### 2.3 实时监控模块设计

**核心指标：**
- 系统概览：流程实例数、活跃会话数、告警触发数、平均执行时间、成功率、满意度均值
- 流程监控：各流程的运行中、完成、失败数量、平均耗时
- 告警概览：未处理告警列表，包含低满意度、连续低满意度、流程失败等告警
- 事件流：最新20条事件（INFO、WARN、ERROR级别）

#### 2.4 告警规则设计

**预置告警规则（10条）：**
1. 低满意度告警：满意度 ≤ 2.5分
2. 连续低满意度告警：工作人员连续3次低分
3. 工作人员满意度下降告警：平均满意度下降 ≥ 0.5分
4. 整体满意度下降告警：整体满意度下降 ≥ 0.3分
5. 流程执行超时告警：执行时间 > 5秒
6. 流程失败率告警：失败率 ≥ 5%
7. 高人工介入率告警：人工介入率 ≥ 20%
8. 工作人员过载告警：同时处理会话数 ≥ 5
9. 高消息量告警：消息量 ≥ 100条/分钟
10. 长会话告警：会话持续时间 ≥ 30分钟

#### 2.5 告警引擎工作流程

**告警触发流程：**
```
数据采集 → 事件采集器 → 评估器 → 聚合器 → 压缩器 → 告警触发器 → 通知发送器 → 实时推送
```

#### 2.6 告警数据模型

**核心表结构：**
- `alert_history`：告警历史记录，包含规则信息、触发数据、关联数据、时间信息、处理信息、通知信息
- `alert_stats`：告警统计，按日期统计各级别、各类别的告警数量及响应时间

---

### 三、系统联动性设计

#### 3.1 完整数据流向

```
用户消息 → 回调接口 → 流程引擎 → 消息处理/协同决策/满意度推断 → 流程实例完成 → 触发事件 → 满意度推断/告警引擎/通知服务 → 实时推送 → 信息中心
```

#### 3.2 信息中心与各模块的联动

**联动关系：**
- 实时监控：依赖 flow_instances、session_messages、alert_history
- 会话分析：依赖 session_messages、session_satisfaction、flow_instances
- 协同分析：依赖 decision_logs、staff_messages、staff_performance
- 工作人员管理：依赖 staff_activity、staff_performance、session_satisfaction
- 数据报表：依赖所有聚合表
- 监控告警：依赖 alert_history、alert_rules、events
- 设置：依赖 alert_rules、notification_methods

#### 3.3 关键联动场景

**场景1：用户发送消息 → 实时监控更新**
- 消息处理完成 → 写入消息 → 触发事件 → WebSocket推送 → 更新实时监控

**场景2：满意度推断 → 告警触发 → 通知发送**
- 满意度计算完成 → 告警规则评估 → 告警触发 → 发送通知 → WebSocket推送

**场景3：工作人员发送消息 → 状态变更 → 协同分析更新**
- 工作人员消息 → 更新会话状态 → 记录决策 → 更新工作人员活动 → WebSocket推送

**场景4：流程失败 → 告警触发 → 故障排查**
- 流程失败 → 告警规则评估 → 告警触发 → 发送通知 → WebSocket推送 → 管理员处理

#### 3.4 实时数据同步机制

**WebSocket 频道设计：**
- `monitoring:realtime`：实时监控（指标更新、消息流、状态变更）
- `alerts:realtime`：告警（告警触发、告警解决）
- `sessions:realtime`：会话（会话创建、会话更新）
- `staff:realtime`：工作人员（上线、下线、发送消息）
- `flows:realtime`：流程引擎（流程开始、流程完成、流程失败）

#### 3.5 数据缓存策略

**Redis 缓存键设计：**
- 会话相关：`session:{sessionId}:info`、`session:{sessionId}:messages`、`session:{sessionId}:satisfaction`
- 工作人员相关：`staff:{staffId}:info`、`staff:{staffId}:active-sessions`
- 实时指标：`metrics:realtime`
- 告警相关：`alerts:pending`
- 流程实例相关：`flow:{flowInstanceId}:info`

---

### 四、完整实施方案

**实施步骤（共5个阶段，10周）：**

**Phase 1：流程引擎集成（2周）**
- 设计消息处理流程定义
- 实现流程节点处理器
- 集成消息回调接口
- 实现流程实例与会话关联
- 验证数据流转

**Phase 2：告警引擎开发（3周）**
- 设计告警规则引擎
- 实现事件采集器
- 实现评估器、聚合器、压缩器
- 开发告警触发器
- 实现通知发送器

**Phase 3：监控告警中心前端（2周）**
- 开发实时监控页面
- 开发告警管理页面
- 开发事件分析页面
- 开发通知管理页面
- 开发规则配置页面

**Phase 4：系统联动完善（2周）**
- 完善 WebSocket 推送
- 优化数据缓存策略
- 实现实时数据同步
- 联动测试

**Phase 5：优化和测试（1周）**
- 性能优化
- 压力测试
- 用户体验优化
- 文档完善