# WorkTool AI 2.1 - 流程引擎系统完整规划与开发方案

## 📋 目录

- [一、系统架构总览](#一系统架构总览)
- [二、现有系统功能区分析](#二现有系统功能区分析)
- [三、流程引擎节点体系规划](#三流程引擎节点体系规划)
- [四、默认流程定义](#四默认流程定义)
- [五、可视化操作设计](#五可视化操作设计)
- [六、完整开发方案](#六完整开发方案)
- [七、实施步骤](#七实施步骤)

---

## 一、系统架构总览

### 1.1 系统分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端展示层 (Next.js 5000)                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 流程编辑器   │  │ 机器人管理   │  │ 数据分析     │          │
│  │ (可视化编排) │  │   (配置)     │  │   (报表)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↕ API调用
┌─────────────────────────────────────────────────────────────────┐
│                    业务逻辑层 (Backend 5001)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              流程引擎 (Flow Engine)                       │   │
│  │  流程编排 | 节点执行 | 状态管理 | 事务处理               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓ 调用                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ AI服务   │ │ 告警服务 │ │ 风险管理 │ │ 监控服务 │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓ 数据存储
┌─────────────────────────────────────────────────────────────────┐
│                    数据存储层 (PostgreSQL)                      │
├─────────────────────────────────────────────────────────────────┤
│  流程定义表 | 流程实例表 | 执行日志表 | 消息表 | 会话表          │
│  告警表 | 风险表 | AI配置表 | 机器人表 | 工作人员表            │
└─────────────────────────────────────────────────────────────────┘
                              ↓ 数据同步
┌─────────────────────────────────────────────────────────────────┐
│              消息中心 (InfoCenter - 独立服务 9001)              │
├─────────────────────────────────────────────────────────────────┤
│  消息收集 | 会话管理 | 发送者识别 | 数据查询API                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

✅ **复用现有功能区**：所有节点都基于现有系统功能搭建
✅ **可视化操作**：提供拖拽式流程编排界面
✅ **配置驱动**：每个节点都支持灵活的配置参数
✅ **数据闭环**：流程引擎与消息中心数据完全同步
✅ **扩展性**：支持自定义节点类型和处理器

---

## 二、现有系统功能区分析

### 2.1 已有功能区列表

| 功能区 | 对应API | 核心能力 | 可用节点 |
|--------|---------|----------|----------|
| **消息中心** | `/api/messages`<br>`/api/sessions`<br>`/api/staff` | 消息收集、会话管理、发送者识别 | MESSAGE_RECEIVE<br>SESSION_CREATE<br>SENDER_IDENTIFY |
| **AI模块** | `/api/ai/models`<br>`/api/ai/personas`<br>`/api/ai/templates` | 意图识别、AI回复、角色配置、话术模板 | INTENT<br>AI_REPLY<br>AI_CHAT<br>EMOTION_ANALYZE |
| **机器人管理** | `/api/robots`<br>`/api/robot-groups`<br>`/api/robot-roles` | 机器人配置、分组管理、角色权限 | ROBOT_CONFIG<br>ROBOT_DISPATCH |
| **告警系统** | `/api/alert-config`<br>`/api/alert-enhanced` | 告警规则、告警入库、告警升级 | ALERT_SAVE<br>alert_rule<br>ALERT_ESCALATE |
| **风险管理** | `/api/risk` | 风险检测、风险处理、安抚用户 | RISK_HANDLER<br>RISK_DETECT |
| **监控系统** | `/api/monitoring`<br>`/ws` | 实时监控、日志记录、WebSocket推送 | MONITOR<br>LOG_SAVE |
| **协同工作** | `/api/collab` | 工作人员介入、协同决策、任务分配 | STAFF_INTERVENTION<br>COLLAB_DECISION |
| **流程引擎** | `/api/flow-engine` | 流程定义、实例执行、日志查询 | (所有节点编排) |

### 2.2 数据流转关系

```
机器人接收消息
    ↓
[流程引擎触发]
    ↓
消息接收节点 → 调用消息中心API → 保存消息
    ↓
意图识别节点 → 调用AI服务 → 识别意图
    ↓
决策节点 → 根据意图/情绪/规则判断分支
    ↓
┌─────┴─────┬──────────┬──────────┐
↓           ↓          ↓          ↓
AI回复      风险处理    工作人员介入  告警触发
    ↓           ↓          ↓          ↓
生成回复     安抚用户    转人工      保存告警
    ↓           ↓          ↓          ↓
消息分发 → 调用机器人API → 发送消息 → 保存到消息中心
```

---

## 三、流程引擎节点体系规划

### 3.1 完整节点类型列表

#### 基础节点

| 节点类型 | 节点ID | 描述 | 配置项 | 输出 |
|---------|--------|------|--------|------|
| 消息接收 | `message_receive` | 接收WorkTool消息并保存 | robotId, messageType | message, sessionId, senderInfo |
| 会话创建 | `session_create` | 创建或获取会话 | robotId, userId, userName | sessionId, session |
| 开始节点 | `start` | 流程开始 | 初始变量 | 初始上下文 |
| 结束节点 | `end` | 流程结束 | 返回数据 | 流程结果 |

#### AI节点

| 节点类型 | 节点ID | 描述 | 配置项 | 输出 |
|---------|--------|------|--------|------|
| 意图识别 | `intent` | AI识别用户消息意图 | modelId, supportedIntents | intent, confidence, needReply, needHuman |
| AI回复 | `ai_reply` | 生成智能客服回复 | modelId, templateId, roleId, temperature | aiResponse, model, usage |
| AI对话 | `ai_chat` | 多轮对话交互 | modelId, contextLength | aiResponse, context |
| 情绪分析 | `emotion_analyze` | 分析用户情绪 | modelId | emotion, score |
| 满意度推断 | `satisfaction_infer` | 推断用户满意度 | sessionId | satisfaction, reason |

#### 逻辑节点

| 节点类型 | 节点ID | 描述 | 配置项 | 输出 |
|---------|--------|------|--------|------|
| 决策节点 | `decision` | 根据条件判断分支 | conditions (条件表达式列表) | conditionResult |
| 条件分支 | `condition_branch` | 条件判断 | expression | branchResult |
| 循环节点 | `loop` | 循环执行 | maxIterations | loopResult |
| 并行节点 | `parallel` | 并行执行多个节点 | branchCount | parallelResults |

#### 操作节点

| 节点类型 | 节点ID | 描述 | 配置项 | 输出 |
|---------|--------|------|--------|------|
| 消息分发 | `message_dispatch` | 判断群发/私发 | dispatchType (group/private) | dispatchTarget |
| 发送指令 | `send_command` | 调用WorkTool API发送 | message, target, type | commandResult |
| 变量设置 | `variable_set` | 设置流程变量 | variableName, value | updatedContext |
| 数据查询 | `data_query` | 查询数据库 | tableName, query | queryResult |
| HTTP请求 | `http_request` | 调用外部API | url, method, headers | httpResponse |

#### 数据节点

| 节点类型 | 节点ID | 描述 | 配置项 | 输出 |
|---------|--------|------|--------|------|
| 指令状态记录 | `command_status` | 保存指令状态 | status, message | savedStatus |
| 日志保存 | `log_save` | 保存执行日志 | logLevel, message | logId |
| 统计记录 | `stats_save` | 记录统计数据 | metrics | statsResult |
| 数据转换 | `data_transform` | 数据格式转换 | transformRules | transformedData |

#### 告警节点

| 节点类型 | 节点ID | 描述 | 配置项 | 输出 |
|---------|--------|------|--------|------|
| 告警入库 | `alert_save` | 保存告警信息 | level, message, source | alertId |
| 告警规则判断 | `alert_rule` | 判断告警规则并升级 | ruleId, conditions | shouldEscalate |
| 告警升级 | `alert_escalate` | 告警升级处理 | escalationLevel | escalationResult |
| 告警通知 | `alert_notify` | 发送告警通知 | channels (email/sms/webhook) | notifyResult |

#### 风险节点

| 节点类型 | 节点ID | 描述 | 配置项 | 输出 |
|---------|--------|------|--------|------|
| 风险检测 | `risk_detect` | 检测消息风险 | riskRules | riskLevel, riskType |
| 风险处理 | `risk_handler` | AI安抚用户并通知人工 | riskLevel, template | riskAction |
| 风险记录 | `risk_save` | 保存风险信息 | riskInfo | riskId |

#### 协同节点

| 节点类型 | 节点ID | 描述 | 配置项 | 输出 |
|---------|--------|------|--------|------|
| 工作人员介入 | `staff_intervention` | 转人工客服 | staffId, reason | interventionId |
| 任务分配 | `task_assign` | 分配任务给工作人员 | staffId, task | taskId |
| 协同决策 | `collab_decision` | 多人协同决策 | participants, options | decisionResult |
| 消息同步 | `message_sync` | 同步消息到工作人员 | syncChannels | syncResult |

#### 监控节点

| 节点类型 | 节点ID | 描述 | 配置项 | 输出 |
|---------|--------|------|--------|------|
| 监控节点 | `monitor` | 实时监听群内消息 | monitorType, keywords | monitorResult |
| 性能监控 | `performance_monitor` | 监控流程性能 | metrics | performanceData |
| 异常检测 | `anomaly_detect` | 检测异常行为 | anomalyRules | anomalyResult |

#### 机器人节点

| 节点类型 | 节点ID | 描述 | 配置项 | 输出 |
|---------|--------|------|--------|------|
| 机器人配置 | `robot_config` | 获取/设置机器人配置 | robotId | config |
| 机器人分发 | `robot_dispatch` | 分发消息到多个机器人 | robotIds | dispatchResult |
| 机器人状态 | `robot_status` | 获取机器人状态 | robotId | status |

### 3.2 节点配置示例

#### 意图识别节点配置

```json
{
  "type": "intent",
  "id": "intent_001",
  "name": "意图识别",
  "config": {
    "modelId": "doubao-pro-4k",
    "supportedIntents": ["咨询", "投诉", "售后", "互动", "购买", "其他"],
    "confidenceThreshold": 0.7,
    "enableEmotionAnalysis": true,
    "enableSatisfactionInference": false
  },
  "inputs": ["message"],
  "outputs": ["intent", "confidence", "needReply", "needHuman", "emotion"]
}
```

#### AI回复节点配置

```json
{
  "type": "ai_reply",
  "id": "ai_reply_001",
  "name": "AI客服回复",
  "config": {
    "modelId": "doubao-pro-4k",
    "useTemplate": true,
    "templateId": "template_001",
    "templateVariables": {
      "userName": "{{context.userName}}",
      "groupName": "{{context.groupName}}",
      "robotName": "{{context.robotName}}"
    },
    "temperature": 0.7,
    "maxTokens": 2000,
    "enableStream": false
  },
  "inputs": ["intent", "message", "context"],
  "outputs": ["aiResponse", "model", "usage"]
}
```

#### 决策节点配置

```json
{
  "type": "decision",
  "id": "decision_001",
  "name": "意图分流",
  "config": {
    "conditions": [
      {
        "expression": "context.intent === '投诉' || context.emotion === 'negative'",
        "label": "转人工",
        "targetNodeId": "staff_intervention"
      },
      {
        "expression": "context.intent === '咨询' || context.intent === '购买'",
        "label": "AI回复",
        "targetNodeId": "ai_reply"
      },
      {
        "expression": "context.riskLevel >= 3",
        "label": "风险处理",
        "targetNodeId": "risk_handler"
      },
      {
        "expression": "true",
        "label": "默认分支",
        "targetNodeId": "default_reply"
      }
    ]
  },
  "inputs": ["context"],
  "outputs": ["conditionResult"]
}
```

---

## 四、默认流程定义

### 4.1 流程1：标准客服流程

**流程名称**：`standard_customer_service`
**流程描述**：处理标准的客户咨询场景，包含意图识别、AI回复、人工转接
**触发类型**：webhook（机器人消息回调）

**流程图**：
```
[消息接收] → [会话创建] → [意图识别] → [情绪分析] → [决策分流]
                                                 ↓
                                ┌──────────────┼──────────────┐
                                ↓              ↓              ↓
                            [投诉转人工]   [AI回复]      [风险处理]
                                ↓              ↓              ↓
                            [工作人员介入]  [消息分发]    [风险记录]
                                ↓              ↓              ↓
                            [发送指令]    [发送指令]    [告警入库]
                                ↓              ↓              ↓
                            [状态记录]    [状态记录]    [结束节点]
                                ↓              ↓
                                └───────→ [结束节点] ←───────┘
```

**流程定义JSON**：

```json
{
  "id": "flow_standard_customer_service",
  "name": "标准客服流程",
  "description": "处理标准客户咨询，支持意图识别、AI回复、人工转接",
  "version": "1.0.0",
  "triggerType": "webhook",
  "triggerConfig": {
    "webhookUrl": "/api/worktool/callback",
    "eventType": "message"
  },
  "nodes": [
    {
      "id": "node_01",
      "type": "message_receive",
      "position": { "x": 100, "y": 100 },
      "data": {
        "name": "消息接收",
        "description": "接收WorkTool消息并保存到数据库",
        "config": {
          "saveToInfoCenter": true,
          "senderIdentification": true
        }
      }
    },
    {
      "id": "node_02",
      "type": "session_create",
      "position": { "x": 250, "y": 100 },
      "data": {
        "name": "会话创建",
        "description": "创建或获取会话",
        "config": {
          "autoCreate": true,
          "sessionTimeout": 1800000
        }
      }
    },
    {
      "id": "node_03",
      "type": "intent",
      "position": { "x": 400, "y": 100 },
      "data": {
        "name": "意图识别",
        "description": "AI识别用户消息意图",
        "config": {
          "modelId": "doubao-pro-4k",
          "supportedIntents": ["咨询", "投诉", "售后", "互动", "购买", "其他"],
          "confidenceThreshold": 0.7,
          "enableEmotionAnalysis": true
        }
      }
    },
    {
      "id": "node_04",
      "type": "emotion_analyze",
      "position": { "x": 550, "y": 100 },
      "data": {
        "name": "情绪分析",
        "description": "分析用户情绪",
        "config": {
          "modelId": "doubao-pro-4k",
          "emotionTypes": ["positive", "neutral", "negative"]
        }
      }
    },
    {
      "id": "node_05",
      "type": "decision",
      "position": { "x": 700, "y": 100 },
      "data": {
        "name": "决策分流",
        "description": "根据意图和情绪判断处理方式",
        "config": {
          "conditions": [
            {
              "expression": "context.intent === '投诉' || context.emotion === 'negative'",
              "label": "转人工",
              "targetNodeId": "node_06"
            },
            {
              "expression": "context.riskLevel >= 3",
              "label": "风险处理",
              "targetNodeId": "node_11"
            },
            {
              "expression": "context.needReply === true",
              "label": "AI回复",
              "targetNodeId": "node_08"
            },
            {
              "expression": "true",
              "label": "忽略",
              "targetNodeId": "node_13"
            }
          ]
        }
      }
    },
    {
      "id": "node_06",
      "type": "staff_intervention",
      "position": { "x": 700, "y": 250 },
      "data": {
        "name": "工作人员介入",
        "description": "转人工客服",
        "config": {
          "autoAssign": true,
          "assignStrategy": "least_busy"
        }
      }
    },
    {
      "id": "node_07",
      "type": "send_command",
      "position": { "x": 850, "y": 250 },
      "data": {
        "name": "发送指令",
        "description": "通知工作人员",
        "config": {
          "message": "客户需要人工介入，请尽快处理",
          "notifyChannels": ["email", "websocket"]
        }
      }
    },
    {
      "id": "node_08",
      "type": "ai_reply",
      "position": { "x": 850, "y": 100 },
      "data": {
        "name": "AI回复",
        "description": "生成智能客服回复",
        "config": {
          "modelId": "doubao-pro-4k",
          "useTemplate": true,
          "templateId": "template_default",
          "temperature": 0.7,
          "maxTokens": 2000
        }
      }
    },
    {
      "id": "node_09",
      "type": "message_dispatch",
      "position": { "x": 1000, "y": 100 },
      "data": {
        "name": "消息分发",
        "description": "判断发送目标",
        "config": {
          "dispatchType": "auto"
        }
      }
    },
    {
      "id": "node_10",
      "type": "send_command",
      "position": { "x": 1150, "y": 100 },
      "data": {
        "name": "发送消息",
        "description": "调用机器人API发送消息",
        "config": {
          "saveToInfoCenter": true
        }
      }
    },
    {
      "id": "node_11",
      "type": "risk_handler",
      "position": { "x": 700, "y": 400 },
      "data": {
        "name": "风险处理",
        "description": "安抚用户并通知人工",
        "config": {
          "autoEscalate": true,
          "escalationLevel": "high"
        }
      }
    },
    {
      "id": "node_12",
      "type": "alert_save",
      "position": { "x": 850, "y": 400 },
      "data": {
        "name": "告警入库",
        "description": "保存风险告警",
        "config": {
          "alertLevel": "high",
          "alertType": "risk"
        }
      }
    },
    {
      "id": "node_13",
      "type": "end",
      "position": { "x": 1300, "y": 100 },
      "data": {
        "name": "结束",
        "description": "流程结束"
      }
    }
  ],
  "edges": [
    { "id": "edge_01", "source": "node_01", "target": "node_02" },
    { "id": "edge_02", "source": "node_02", "target": "node_03" },
    { "id": "edge_03", "source": "node_03", "target": "node_04" },
    { "id": "edge_04", "source": "node_04", "target": "node_05" },
    { "id": "edge_05", "source": "node_05", "target": "node_06", "label": "转人工" },
    { "id": "edge_06", "source": "node_05", "target": "node_08", "label": "AI回复" },
    { "id": "edge_07", "source": "node_05", "target": "node_11", "label": "风险" },
    { "id": "edge_08", "source": "node_05", "target": "node_13", "label": "忽略" },
    { "id": "edge_09", "source": "node_06", "target": "node_07" },
    { "id": "edge_10", "source": "node_07", "target": "node_13" },
    { "id": "edge_11", "source": "node_08", "target": "node_09" },
    { "id": "edge_12", "source": "node_09", "target": "node_10" },
    { "id": "edge_13", "source": "node_10", "target": "node_13" },
    { "id": "edge_14", "source": "node_11", "target": "node_12" },
    { "id": "edge_15", "source": "node_12", "target": "node_13" }
  ]
}
```

### 4.2 流程2：风险监控流程

**流程名称**：`risk_monitoring`
**流程描述**：实时监控群内消息，检测风险内容并触发告警
**触发类型**：scheduled（定时任务，每5分钟执行一次）

**流程图**：
```
[开始节点] → [监控节点] → [风险检测] → [决策判断]
                                        ↓
                            ┌───────────┼───────────┐
                            ↓           ↓           ↓
                        [高风险]    [中风险]    [低风险]
                            ↓           ↓           ↓
                        [告警入库]  [记录日志]   [正常处理]
                            ↓           ↓           ↓
                        [告警升级]  [结束节点]   [结束节点]
                            ↓
                        [发送通知]
                            ↓
                        [结束节点]
```

### 4.3 流程3：告警处理流程

**流程名称**：`alert_escalation`
**流程描述**：处理告警升级，按级别通知不同人员
**触发类型**：webhook（告警触发）

**流程图**：
```
[告警接收] → [告警规则判断] → [决策分流]
                                    ↓
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
                [P4级别]         [P3级别]         [P2/P1级别]
                    ↓               ↓               ↓
                [记录日志]      [发送邮件]      [电话通知]
                    ↓               ↓               ↓
                [结束节点]      [升级判断]      [创建工单]
                                    ↓               ↓
                                [结束节点]      [管理层通知]
                                                    ↓
                                                [结束节点]
```

### 4.4 流程4：群组协作流程

**流程名称**：`group_collaboration`
**流程描述**：多机器人协同工作，支持群组消息分发和任务分配
**触发类型**：webhook（群组消息）

**流程图**：
```
[消息接收] → [群组识别] → [机器人分发] → [意图识别]
                                        ↓
                            ┌───────────┼───────────┐
                            ↓           ↓           ↓
                        [机器人A]    [机器人B]    [机器人C]
                            ↓           ↓           ↓
                        [AI回复]    [AI回复]    [转人工]
                            ↓           ↓           ↓
                        [消息汇总] ← ← ← ← ← ← ← ← ←
                            ↓
                        [去重处理]
                            ↓
                        [消息发送]
                            ↓
                        [结束节点]
```

### 4.5 流程5：数据同步流程

**流程名称**：`data_sync`
**流程描述**：定时同步消息中心数据到流程引擎，保证数据一致性
**触发类型**：scheduled（每天凌晨2点执行）

**流程图**：
```
[开始节点] → [查询消息中心] → [数据转换] → [数据验证]
                                        ↓
                                [成功]   [失败]
                                  ↓         ↓
                            [更新数据库] [记录错误]
                                  ↓         ↓
                            [记录日志]  [告警通知]
                                  ↓         ↓
                            [结束节点]  [结束节点]
```

### 4.6 流程6：满意度调查流程

**流程名称**：`satisfaction_survey`
**流程描述**：在会话结束后自动发送满意度调查
**触发类型**：webhook（会话关闭事件）

**流程图**：
```
[会话关闭事件] → [获取会话信息] → [满意度推断] → [决策判断]
                                              ↓
                                  ┌───────────┼───────────┐
                                  ↓           ↓           ↓
                              [高满意度]   [中满意度]   [低满意度]
                                  ↓           ↓           ↓
                              [记录日志]  [发送感谢]  [主动回访]
                                  ↓           ↓           ↓
                              [结束节点]  [结束节点]   [创建工单]
                                                  ↓
                                              [结束节点]
```

---

## 五、可视化操作设计

### 5.1 流程编辑器界面设计

```
┌─────────────────────────────────────────────────────────────────┐
│  流程编辑器 - 标准客服流程                          [保存] [发布] │
├────────────┬──────────────────────────────────┬─────────────────┤
│            │                                   │                 │
│   节点面板  │          画布区域                 │   属性面板      │
│            │                                   │                 │
│  ┌───────┐ │   [消息接收] → [会话创建] → [意图识别]  │   节点属性    │
│  │ 基础   │ │       ↓           ↓              │  ┌──────────┐  │
│  ├───────┤ │   [情绪分析] → [决策分流]          │  │ 节点名称 │  │
│  │📥 消息│ │       ↓                          │  ├──────────┤  │
│  │📝 会话│ │   ┌─────┴─────┬─────────┐        │  │ 节点类型 │  │
│  │⏹️ 结束│ │   ↓           ↓         ↓        │  ├──────────┤  │
│  ├───────┤ │ [转人工]    [AI回复]   [风险]    │  │ 配置项   │  │
│  │ AI    │ │   ↓           ↓         ↓        │  │          │  │
│  ├───────┤ │ [工作人员]  [分发]     [告警]    │  └──────────┘  │
│  │🧠 意图│ │   ↓           ↓         ↓        │                 │
│  │⚡ AI  │ │ [发送]      [发送]     [保存]    │   流程属性    │
│  │😊 情绪│ │   ↓           ↓         ↓        │  ┌──────────┐  │
│  ├───────┤ │   └───────────┴─────────┴────┐    │  │ 流程名称 │  │
│  │ 逻辑   │ │                               ↓    │  ├──────────┤  │
│  ├───────┤ │                          [结束节点]   │  │ 触发类型 │  │
│  │🔀 决策│ │                                         │  ├──────────┤  │
│  │🔄 循环│ │                                         │  │ 超时设置 │  │
│  │↔️ 并行│ │                                         │  └──────────┘  │
│  ├───────┤ │                                         │                 │
│  │ 操作   │ │                                         │   执行日志    │
│  ├───────┤ │                                         │  ┌──────────┐  │
│  │💬 发送│ │                                         │  │ 日志列表 │  │
│  │📊 查询│ │                                         │  └──────────┘  │
│  ├───────┤ │                                         │                 │
│  │ 告警   │ │                                         │                 │
│  ├───────┤ │                                         │                 │
│  │🔔 告警│ │                                         │                 │
│  │⚠️ 风险│ │                                         │                 │
│  ├───────┤ │                                         │                 │
│  │ 协同   │ │                                         │                 │
│  ├───────┤ │                                         │                 │
│  │👥 工作│ │                                         │                 │
│  │📋 任务│ │                                         │                 │
│  └───────┘ │                                         │                 │
│            │                                         │                 │
└────────────┴───────────────────────────────────┴─────────────────┘
```

### 5.2 拖拽操作流程

1. **从左侧面板拖拽节点**到画布
2. **点击节点**打开属性面板，配置节点参数
3. **拖拽连线**连接节点，定义数据流向
4. **保存流程**，生成流程定义JSON
5. **发布流程**，激活流程实例

### 5.3 节点配置界面

每个节点都有独立的配置表单，例如：

#### 意图识别节点配置表单

```
┌─────────────────────────────────────────┐
│ 意图识别节点配置                          │
├─────────────────────────────────────────┤
│ 节点名称: [意图识别                ]    │
│                                          │
│ AI模型:                                 │
│ [豆包 Pro 4K ▼]                          │
│                                          │
│ 支持意图:                                │
│ ☑ 咨询   ☑ 投诉   ☑ 售后                │
│ ☑ 互动   ☑ 购买   ☑ 其他                │
│ [+ 添加意图]                             │
│                                          │
│ 置信度阈值: [0.7    ] (0-1)              │
│                                          │
│ 高级选项:                                │
│ ☑ 启用情绪分析                          │
│ ☑ 启用满意度推断                        │
│ ☑ 记录详细日志                          │
│                                          │
│           [取消]  [保存]                 │
└─────────────────────────────────────────┘
```

---

## 六、完整开发方案

### 6.1 开发阶段规划

#### 阶段一：流程引擎核心增强（1-2周）

**目标**：完善流程引擎核心功能，支持更多节点类型

**任务**：
1. ✅ 扩展节点类型（完善现有节点体系）
2. ✅ 实现节点配置验证
3. ✅ 优化流程执行性能
4. ✅ 增强错误处理和重试机制

**交付物**：
- 完整的节点类型定义
- 节点处理器实现
- 流程执行引擎优化

#### 阶段二：可视化编辑器（2-3周）

**目标**：开发拖拽式流程编辑器

**任务**：
1. ✅ 设计节点面板和节点图标
2. ✅ 实现拖拽和连线功能
3. ✅ 开发属性配置面板
4. ✅ 实现流程预览和验证
5. ✅ 集成流程保存和加载

**技术栈**：
- ReactFlow（流程编排库）
- Radix UI（UI组件库）
- Tailwind CSS（样式）

**交付物**：
- 流程编辑器页面
- 节点组件库
- 配置表单组件

#### 阶段三：默认流程实现（1-2周）

**目标**：实现6个默认流程定义

**任务**：
1. ✅ 实现标准客服流程
2. ✅ 实现风险监控流程
3. ✅ 实现告警处理流程
4. ✅ 实现群组协作流程
5. ✅ 实现数据同步流程
6. ✅ 实现满意度调查流程

**交付物**：
- 6个完整的流程定义JSON
- 流程测试用例
- 流程执行日志

#### 阶段四：消息中心集成（1周）

**目标**：打通流程引擎与消息中心的集成

**任务**：
1. ✅ 实现MESSAGE_RECEIVE节点调用消息中心API
2. ✅ 实现SESSION_CREATE节点调用消息中心API
3. ✅ 实现SEND_COMMAND节点保存AI回复到消息中心
4. ✅ 实现数据同步机制

**交付物**：
- 消息中心集成文档
- API调用封装
- 数据同步脚本

#### 阶段五：测试与优化（1-2周）

**目标**：全面测试和性能优化

**任务**：
1. ✅ 单元测试（节点处理器）
2. ✅ 集成测试（完整流程）
3. ✅ 性能测试（并发执行）
4. ✅ 安全测试（权限验证）
5. ✅ 用户体验优化

**交付物**：
- 测试报告
- 性能优化文档
- 用户使用手册

### 6.2 技术实现细节

#### 6.2.1 节点处理器接口

```javascript
// server/services/flow-engine/nodes/BaseNodeHandler.js

class BaseNodeHandler {
  /**
   * 执行节点
   * @param {Object} node - 节点配置
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object>} 执行结果
   */
  async execute(node, context) {
    throw new Error('子类必须实现execute方法');
  }

  /**
   * 验证节点配置
   * @param {Object} config - 节点配置
   * @returns {Object} 验证结果 { valid: boolean, errors: string[] }
   */
  validateConfig(config) {
    return { valid: true, errors: [] };
  }

  /**
   * 获取节点元数据
   * @returns {Object} 节点元数据
   */
  getMetadata() {
    return {
      name: this.constructor.name,
      description: '',
      category: 'basic',
      inputs: [],
      outputs: [],
      configFields: []
    };
  }
}
```

#### 6.2.2 消息接收节点实现

```javascript
// server/services/flow-engine/nodes/MessageReceiveNode.js

const BaseNodeHandler = require('./BaseNodeHandler');
const axios = require('axios');

class MessageReceiveNode extends BaseNodeHandler {
  async execute(node, context) {
    const { config } = node.data;
    const { message } = context.triggerData;

    // 1. 保存消息到消息中心
    if (config.saveToInfoCenter) {
      await this.saveToInfoCenter(message, context);
    }

    // 2. 识别发送者
    let senderInfo = context.senderInfo;
    if (config.senderIdentification && !senderInfo) {
      senderInfo = await this.identifySender(message.senderId);
    }

    // 3. 更新上下文
    return {
      success: true,
      message,
      senderInfo,
      context: {
        ...context,
        message,
        senderInfo
      }
    };
  }

  async saveToInfoCenter(message, context) {
    const infoCenterUrl = process.env.INFO_CENTER_URL || 'http://localhost:5000';

    await axios.post(`${infoCenterUrl}/api/messages`, {
      robotId: message.robotId,
      sessionId: message.sessionId,
      senderId: message.senderId,
      senderType: message.senderType || 'user',
      senderName: message.senderName,
      content: message.content,
      messageType: message.messageType || 'text'
    });
  }

  async identifySender(senderId) {
    const infoCenterUrl = process.env.INFO_CENTER_URL || 'http://localhost:5000';

    const response = await axios.get(`${infoCenterUrl}/api/staff`, {
      params: { search: senderId }
    });

    if (response.data.data && response.data.data.length > 0) {
      return {
        senderId,
        senderType: 'staff',
        senderName: response.data.data[0].name,
        staffId: response.data.data[0].id
      };
    }

    return {
      senderId,
      senderType: 'user'
    };
  }

  validateConfig(config) {
    const errors = [];

    if (!config) {
      errors.push('缺少配置');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getMetadata() {
    return {
      name: '消息接收',
      description: '接收WorkTool消息并保存到数据库',
      category: 'basic',
      inputs: ['triggerData'],
      outputs: ['message', 'senderInfo', 'context'],
      configFields: [
        {
          name: 'saveToInfoCenter',
          type: 'boolean',
          label: '保存到消息中心',
          default: true
        },
        {
          name: 'senderIdentification',
          type: 'boolean',
          label: '识别发送者',
          default: true
        }
      ]
    };
  }
}

module.exports = MessageReceiveNode;
```

#### 6.2.3 流程编辑器前端实现

```typescript
// src/app/flow-engine/editor/page.tsx

'use client';

import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { NODE_TYPES, NODE_METADATA } from '../types';
import { createNode } from '../utils/nodeFactory';

// 节点组件
import MessageReceiveNode from '../nodes/MessageReceiveNode';
import IntentNode from '../nodes/IntentNode';
import AIReplyNode from '../nodes/AIReplyNode';
import DecisionNode from '../nodes/DecisionNode';

const nodeTypes: NodeTypes = {
  message_receive: MessageReceiveNode,
  intent: IntentNode,
  ai_reply: AIReplyNode,
  decision: DecisionNode,
};

export default function FlowEditorPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      console.log('Node dragged:', node);
    },
    []
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  const handleAddNode = useCallback(
    (nodeType: string) => {
      const newNode = createNode(nodeType);
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const handleSaveFlow = useCallback(async () => {
    const flowData = {
      name: '新建流程',
      description: '',
      nodes,
      edges,
    };

    // 调用API保存流程
    const response = await fetch('/api/flow-engine/definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flowData),
    });

    if (response.ok) {
      alert('流程保存成功！');
    }
  }, [nodes, edges]);

  return (
    <div className="h-screen flex">
      {/* 左侧节点面板 */}
      <div className="w-64 bg-gray-50 border-r p-4">
        <h2 className="text-lg font-bold mb-4">节点面板</h2>
        <div className="space-y-2">
          {Object.entries(NODE_METADATA).map(([type, meta]) => (
            <button
              key={type}
              onClick={() => handleAddNode(type)}
              className="w-full text-left p-2 rounded hover:bg-gray-200 flex items-center gap-2"
            >
              <span>{meta.icon}</span>
              <span>{meta.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 中间画布区域 */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {/* 顶部工具栏 */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={handleSaveFlow}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            保存流程
          </button>
          <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            发布流程
          </button>
        </div>
      </div>

      {/* 右侧属性面板 */}
      <div className="w-80 bg-gray-50 border-l p-4">
        <h2 className="text-lg font-bold mb-4">属性面板</h2>
        {selectedNode ? (
          <div>
            <h3 className="font-semibold">{selectedNode.data.name}</h3>
            <p className="text-sm text-gray-600">
              {NODE_METADATA[selectedNode.type as keyof typeof NODE_METADATA]?.description}
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">节点类型</label>
              <input
                type="text"
                value={selectedNode.type}
                disabled
                className="w-full p-2 border rounded bg-gray-100"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">节点配置</label>
              <textarea
                value={JSON.stringify(selectedNode.data.config, null, 2)}
                onChange={(e) => {
                  const updatedNode = {
                    ...selectedNode,
                    data: {
                      ...selectedNode.data,
                      config: JSON.parse(e.target.value),
                    },
                  };
                  setNodes((nds) =>
                    nds.map((n) => (n.id === updatedNode.id ? updatedNode : n))
                  );
                }}
                className="w-full p-2 border rounded h-40"
              />
            </div>
          </div>
        ) : (
          <p className="text-gray-500">请选择一个节点查看属性</p>
        )}
      </div>
    </div>
  );
}
```

---

## 七、实施步骤

### 第一周：流程引擎核心增强

1. **Day 1-2**：扩展节点类型定义
   - 完善节点类型枚举
   - 定义节点配置Schema
   - 创建节点基类

2. **Day 3-4**：实现核心节点处理器
   - MESSAGE_RECEIVE
   - INTENT
   - AI_REPLY
   - DECISION

3. **Day 5**：单元测试和文档

### 第二周：可视化编辑器开发

1. **Day 1-2**：搭建编辑器基础框架
   - 集成ReactFlow
   - 创建节点面板
   - 实现拖拽功能

2. **Day 3-4**：开发属性配置面板
   - 节点属性表单
   - 流程属性表单
   - 配置验证

3. **Day 5**：流程保存和加载

### 第三周：默认流程实现

1. **Day 1-2**：实现标准客服流程
2. **Day 3**：实现风险监控流程
3. **Day 4**：实现告警处理流程
4. **Day 5**：测试和优化

### 第四周：消息中心集成和测试

1. **Day 1-2**：实现消息中心集成
2. **Day 3-4**：全面测试
3. **Day 5**：文档和部署

---

## 总结

本规划基于现有系统功能区，设计了完整的流程引擎节点体系，提供了6个默认流程定义，涵盖了系统的主要功能场景。通过可视化编辑器，用户可以灵活地编排流程，实现各种业务逻辑。

**关键优势**：
- ✅ 完全基于现有功能，无需重复开发
- ✅ 可视化操作，降低使用门槛
- ✅ 节点类型丰富，覆盖各种场景
- ✅ 默认流程开箱即用
- ✅ 与消息中心完美集成
- ✅ 支持自定义节点扩展

**预期成果**：
- 一个功能完整的流程引擎系统
- 6个经过验证的默认流程
- 可视化流程编辑器
- 完整的开发和使用文档
