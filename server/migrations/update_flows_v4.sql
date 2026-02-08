-- WorkTool AI 流程优化 v4.0
-- 从6个流程优化为4个流程
-- 优化时间：2026-02-08

-- ============================================
-- 第一步：停用所有现有流程
-- ============================================
UPDATE flow_definitions SET is_active = false, is_default = false WHERE is_active = true;

-- ============================================
-- 第二步：删除旧流程（保留备份）
-- ============================================
DELETE FROM flow_definitions WHERE id IN (
  'flow_group_collaboration',
  'flow_risk_monitoring',
  'flow_data_sync',
  'flow_satisfaction_survey',
  'flow_alert_escalation',
  'flow_standard_customer_service'
);

-- ============================================
-- 第三步：创建4个新流程
-- ============================================

-- ============================================
-- 流程1：统一消息处理流程
-- ============================================
INSERT INTO flow_definitions (
  id,
  name,
  description,
  version,
  is_active,
  is_default,
  trigger_type,
  priority,
  timeout,
  nodes,
  edges,
  created_at,
  updated_at
) VALUES (
  'flow_unified_message_handling',
  '统一消息处理流程',
  '统一处理所有消息场景（个人消息、群组消息），支持问答库、意图识别、情绪分析、风险检测、AI回复、人工转接、多机器人协作',
  '4.0.0',
  true,
  true,
  'webhook',
  100,
  30000,
  '[
    {
      "id": "node_00",
      "type": "start",
      "data": {
        "name": "开始",
        "config": {
          "initialVariables": {
            "flowStartTime": "{{now}}",
            "flowVersion": "4.0.0"
          }
        }
      },
      "position": {"x": 0, "y": 100}
    },
    {
      "id": "node_01",
      "type": "message_receive",
      "data": {
        "name": "消息接收",
        "description": "接收WorkTool消息并保存到数据库",
        "config": {
          "saveToInfoCenter": true,
          "senderIdentification": true,
          "messageDeduplication": true,
          "dedupWindow": 600
        }
      },
      "position": {"x": 150, "y": 100}
    },
    {
      "id": "node_02",
      "type": "session_create",
      "data": {
        "name": "会话创建",
        "description": "创建或获取会话",
        "config": {
          "autoCreate": true,
          "sessionTimeout": 1800000,
          "sessionTTL": 86400000,
          "mergeConcurrentSessions": true
        }
      },
      "position": {"x": 250, "y": 100}
    },
    {
      "id": "node_03",
      "type": "qa_match",
      "data": {
        "name": "问答匹配",
        "description": "问答库关键词匹配",
        "config": {
          "matchType": "keyword",
          "priority": 10,
          "isExactMatch": false,
          "groupLimit": true,
          "enabled": true,
          "matchThreshold": 0.8,
          "maxResults": 3
        }
      },
      "position": {"x": 350, "y": 100}
    },
    {
      "id": "node_04",
      "type": "intent",
      "data": {
        "name": "意图识别",
        "description": "AI识别用户消息意图",
        "config": {
          "modelId": "doubao-pro-4k",
          "supportedIntents": ["咨询", "投诉", "售后", "互动", "购买", "预约", "查询", "其他"],
          "confidenceThreshold": 0.7,
          "enableEmotionAnalysis": true,
          "fallbackIntent": "咨询",
          "useContext": true
        }
      },
      "position": {"x": 450, "y": 100}
    },
    {
      "id": "node_05",
      "type": "emotion_analyze",
      "data": {
        "name": "情绪分析",
        "description": "分析用户情绪",
        "config": {
          "modelId": "doubao-pro-4k",
          "emotionTypes": ["positive", "neutral", "negative", "angry", "sad", "happy"],
          "emotionThreshold": 0.6,
          "useKeywords": true
        }
      },
      "position": {"x": 550, "y": 100}
    },
    {
      "id": "node_06",
      "type": "risk_detect",
      "data": {
        "name": "风险检测",
        "description": "检测消息中的敏感内容",
        "config": {
          "modelId": "doubao-pro-4k",
          "riskKeywords": ["暴力", "色情", "政治", "诈骗", "辱骂", "威胁"],
          "riskLevels": {"high": 0.8, "medium": 0.5, "low": 0.3}
        }
      },
      "position": {"x": 650, "y": 100}
    },
    {
      "id": "node_07",
      "type": "document_search",
      "data": {
        "name": "文档检索",
        "description": "检索相关文档",
        "config": {
          "searchType": "semantic",
          "maxResults": 5,
          "similarityThreshold": 0.7,
          "category": "all",
          "useEmbedding": true
        }
      },
      "position": {"x": 750, "y": 100}
    },
    {
      "id": "node_08",
      "type": "decision",
      "data": {
        "name": "群组识别",
        "description": "识别群组类型",
        "config": {
          "conditions": [
            {"label": "VIP群", "expression": "context.groupType === ''vip''", "targetNodeId": "node_09"},
            {"label": "技术支持群", "expression": "context.groupType === ''support''", "targetNodeId": "node_09"},
            {"label": "销售群", "expression": "context.groupType === ''sales''", "targetNodeId": "node_09"},
            {"label": "个人", "expression": "context.isPersonalMessage === true", "targetNodeId": "node_09"}
          ]
        }
      },
      "position": {"x": 850, "y": 100}
    },
    {
      "id": "node_09",
      "type": "robot_dispatch",
      "data": {
        "name": "机器人调度",
        "description": "根据群组类型调度机器人",
        "config": {
          "robotMapping": {
            "vip": {"robotId": "robot_vip_001", "priority": "high", "role": "service"},
            "support": {"robotId": "robot_support_001", "priority": "medium", "role": "technical"},
            "sales": {"robotId": "robot_sales_001", "priority": "low", "role": "sales"},
            "personal": {"robotId": "robot_default_001", "priority": "medium", "role": "assistant"}
          },
          "loadBalancing": "least_busy",
          "fallbackRobotId": "robot_default_001"
        }
      },
      "position": {"x": 950, "y": 100}
    },
    {
      "id": "node_10",
      "type": "decision",
      "data": {
        "name": "决策分流",
        "description": "根据意图、情绪、风险判断处理方式",
        "config": {
          "conditions": [
            {"label": "问答匹配", "expression": "context.qaMatched === true", "targetNodeId": "node_14"},
            {"label": "转人工", "expression": "context.intent === ''投诉'' || context.emotion === ''negative'' || context.emotion === ''angry'' || context.riskLevel >= 3", "targetNodeId": "node_11"},
            {"label": "高风险告警", "expression": "context.riskLevel >= 4", "targetNodeId": "node_13"},
            {"label": "AI回复", "expression": "context.needReply === true", "targetNodeId": "node_12"},
            {"label": "忽略", "expression": "true", "targetNodeId": "node_14"}
          ]
        }
      },
      "position": {"x": 1050, "y": 100}
    },
    {
      "id": "node_11",
      "type": "staff_intervention",
      "data": {
        "name": "人工转接",
        "description": "转人工客服",
        "config": {
          "assignStrategy": "least_busy",
          "autoAssign": true,
          "teamMapping": {"vip": "vip_team", "support": "support_team", "sales": "sales_team", "default": "general_team"},
          "escalationTimeout": 300000,
          "notifyChannels": ["email", "websocket", "sms"],
          "allowUserSelect": true
        }
      },
      "position": {"x": 1050, "y": 250}
    },
    {
      "id": "node_12",
      "type": "ai_reply",
      "data": {
        "name": "AI回复",
        "description": "生成智能客服回复",
        "config": {
          "modelId": "doubao-pro-4k",
          "maxTokens": 2000,
          "temperature": 0.7,
          "useTemplate": true,
          "useDocuments": true,
          "useContext": true,
          "useHistory": true,
          "historyLength": 10,
          "templateMapping": {"vip": "template_vip", "support": "template_support", "sales": "template_sales", "default": "template_default"},
          "responseStyle": "professional"
        }
      },
      "position": {"x": 1200, "y": 100}
    },
    {
      "id": "node_13",
      "type": "message_dispatch",
      "data": {
        "name": "消息分发",
        "description": "分发消息到多个渠道",
        "config": {
          "dispatchType": "auto",
          "channels": ["robot", "email", "sms"],
          "fallbackChannels": ["robot"],
          "batchSend": false,
          "retryCount": 3,
          "retryInterval": 1000
        }
      },
      "position": {"x": 1350, "y": 100}
    },
    {
      "id": "node_14",
      "type": "alert_save",
      "data": {
        "name": "告警入库",
        "description": "保存风险告警",
        "config": {
          "alertLevel": "high",
          "alertType": "risk",
          "autoEscalate": true,
          "escalationLevel": "high",
          "enableNotification": true,
          "saveToDatabase": true
        }
      },
      "position": {"x": 1200, "y": 250}
    },
    {
      "id": "node_15",
      "type": "end",
      "data": {
        "name": "结束",
        "description": "流程结束"
      },
      "position": {"x": 1500, "y": 100}
    }
  ]',
  '[
    {"id": "edge_00", "source": "node_00", "target": "node_01"},
    {"id": "edge_01", "source": "node_01", "target": "node_02"},
    {"id": "edge_02", "source": "node_02", "target": "node_03"},
    {"id": "edge_03", "source": "node_03", "target": "node_04"},
    {"id": "edge_04", "source": "node_04", "target": "node_05"},
    {"id": "edge_05", "source": "node_05", "target": "node_06"},
    {"id": "edge_06", "source": "node_06", "target": "node_07"},
    {"id": "edge_07", "source": "node_07", "target": "node_08"},
    {"id": "edge_08", "source": "node_08", "target": "node_09"},
    {"id": "edge_09", "source": "node_09", "target": "node_10"},
    {"id": "edge_10", "label": "转人工", "source": "node_10", "target": "node_11"},
    {"id": "edge_11", "label": "AI回复", "source": "node_10", "target": "node_12"},
    {"id": "edge_12", "label": "风险", "source": "node_10", "target": "node_14"},
    {"id": "edge_13", "label": "忽略/问答", "source": "node_10", "target": "node_15"},
    {"id": "edge_14", "source": "node_11", "target": "node_15"},
    {"id": "edge_15", "source": "node_12", "target": "node_13"},
    {"id": "edge_16", "source": "node_13", "target": "node_15"},
    {"id": "edge_17", "source": "node_14", "target": "node_15"}
  ]',
  NOW(),
  NOW()
);

-- ============================================
-- 流程2：统一告警处理流程
-- ============================================
INSERT INTO flow_definitions (
  id,
  name,
  description,
  version,
  is_active,
  is_default,
  trigger_type,
  priority,
  timeout,
  nodes,
  edges,
  created_at,
  updated_at
) VALUES (
  'flow_unified_alert_handling',
  '统一告警处理流程',
  '统一处理所有告警和风险（消息风险触发、手动触发、其他流程触发），支持多级别告警、去重、限流、升级、多渠道通知',
  '4.0.0',
  true,
  false,
  'webhook',
  90,
  60000,
  '[
    {
      "id": "node_00",
      "type": "start",
      "data": {
        "name": "开始",
        "config": {
          "initialVariables": {
            "flowStartTime": "{{now}}",
            "alertSource": "{{context.alertSource}}"
          }
        }
      },
      "position": {"x": 0, "y": 100}
    },
    {
      "id": "node_01",
      "type": "alert_receive",
      "data": {
        "name": "告警接收",
        "description": "接收告警/风险信息",
        "config": {
          "acceptMultipleSources": true,
          "sources": ["flow", "api", "webhook", "manual"],
          "validatePayload": true,
          "normalizeAlert": true
        }
      },
      "position": {"x": 150, "y": 100}
    },
    {
      "id": "node_02",
      "type": "alert_dedup",
      "data": {
        "name": "告警去重",
        "description": "去重处理",
        "config": {
          "dedupWindow": 300,
          "dedupKey": "sessionId:intentType:content",
          "enabled": true,
          "dedupStrategy": "first_match"
        }
      },
      "position": {"x": 250, "y": 100}
    },
    {
      "id": "node_03",
      "type": "alert_rate_limit",
      "data": {
        "name": "告警限流",
        "description": "限流处理",
        "config": {
          "rateLimit": 10,
          "rateWindow": 60,
          "rateKey": "sessionId:intentType",
          "enabled": true,
          "limitStrategy": "drop"
        }
      },
      "position": {"x": 350, "y": 100}
    },
    {
      "id": "node_04",
      "type": "alert_rule",
      "data": {
        "name": "级别判断",
        "description": "根据规则判断告警级别",
        "config": {
          "rules": [
            {
              "level": "P1",
              "condition": "critical",
              "responseTime": "5min",
              "channels": ["sms", "phone", "email", "wechat"]
            },
            {
              "level": "P2",
              "condition": "riskScore >= 0.8",
              "responseTime": "15min",
              "channels": ["sms", "email", "wechat"]
            },
            {
              "level": "P3",
              "condition": "riskScore >= 0.5 && riskScore < 0.8",
              "responseTime": "1hour",
              "channels": ["email", "wechat"]
            },
            {
              "level": "P4",
              "condition": "riskScore < 0.5",
              "responseTime": "24hour",
              "channels": ["log"]
            }
          ]
        }
      },
      "position": {"x": 450, "y": 100}
    },
    {
      "id": "node_05",
      "type": "alert_group",
      "data": {
        "name": "告警分组",
        "description": "分组处理",
        "config": {
          "groupingStrategy": "intent_type",
          "groupMapping": {
            "risk": "risk_group",
            "complaint": "complaint_group",
            "system": "system_group",
            "default": "default_group"
          },
          "enableBatching": true,
          "batchSize": 5
        }
      },
      "position": {"x": 550, "y": 100}
    },
    {
      "id": "node_06",
      "type": "decision",
      "data": {
        "name": "分流处理",
        "description": "根据级别分流处理",
        "config": {
          "conditions": [
            {"label": "P1/P2紧急", "expression": "context.alertLevel === ''P1'' || context.alertLevel === ''P2''", "targetNodeId": "node_07"},
            {"label": "P3重要", "expression": "context.alertLevel === ''P3''", "targetNodeId": "node_08"},
            {"label": "P4普通", "expression": "context.alertLevel === ''P4''", "targetNodeId": "node_09"}
          ]
        }
      },
      "position": {"x": 650, "y": 100}
    },
    {
      "id": "node_07",
      "type": "alert_notify",
      "data": {
        "name": "紧急通知",
        "description": "P1/P2级别紧急通知",
        "config": {
          "notificationChannels": {
            "sms": {"enabled": true, "provider": "aliyun", "recipients": ["admin", "manager"]},
            "email": {"enabled": true, "recipients": ["admin", "manager", "team"]},
            "phone": {"enabled": true, "recipients": ["on_call"]},
            "wechat": {"enabled": true, "provider": "worktool", "recipients": ["admin", "manager"]}
          },
          "messageTemplate": "告警级别: {{alertLevel}}\\n告警类型: {{alertType}}\\n风险分数: {{riskScore}}\\n内容: {{content}}\\n时间: {{timestamp}}",
          "retryCount": 3,
          "retryInterval": 60000
        }
      },
      "position": {"x": 750, "y": 100}
    },
    {
      "id": "node_08",
      "type": "alert_notify",
      "data": {
        "name": "告警通知",
        "description": "P3级别告警通知",
        "config": {
          "notificationChannels": {
            "email": {"enabled": true, "recipients": ["admin", "manager"]},
            "wechat": {"enabled": true, "provider": "worktool", "recipients": ["admin", "manager"]}
          },
          "messageTemplate": "告警级别: {{alertLevel}}\\n告警类型: {{alertType}}\\n内容: {{content}}\\n时间: {{timestamp}}",
          "retryCount": 3,
          "retryInterval": 60000
        }
      },
      "position": {"x": 750, "y": 250}
    },
    {
      "id": "node_09",
      "type": "log_save",
      "data": {
        "name": "记录日志",
        "description": "记录日志",
        "config": {
          "message": "P4级别告警已记录: {{context.alertMessage}}",
          "logLevel": "info",
          "logSource": "flow_unified_alert_handling"
        }
      },
      "position": {"x": 750, "y": 400}
    },
    {
      "id": "node_10",
      "type": "alert_escalate",
      "data": {
        "name": "升级判断",
        "description": "判断是否需要升级",
        "config": {
          "escalationRules": [
            {"condition": "repeatCount >= 3 && alertLevel === ''P3''", "escalateTo": "P2", "escalateAfter": "30min"},
            {"condition": "repeatCount >= 5 && alertLevel === ''P4''", "escalateTo": "P3", "escalateAfter": "1hour"}
          ],
          "maxEscalationLevel": "P1",
          "enableAutoEscalate": true
        }
      },
      "position": {"x": 850, "y": 250}
    },
    {
      "id": "node_11",
      "type": "end",
      "data": {
        "name": "结束",
        "description": "流程结束"
      },
      "position": {"x": 1000, "y": 100}
    }
  ]',
  '[
    {"id": "edge_00", "source": "node_00", "target": "node_01"},
    {"id": "edge_01", "source": "node_01", "target": "node_02"},
    {"id": "edge_02", "source": "node_02", "target": "node_03"},
    {"id": "edge_03", "source": "node_03", "target": "node_04"},
    {"id": "edge_04", "source": "node_04", "target": "node_05"},
    {"id": "edge_05", "source": "node_05", "target": "node_06"},
    {"id": "edge_06", "label": "P1/P2", "source": "node_06", "target": "node_07"},
    {"id": "edge_07", "label": "P3", "source": "node_06", "target": "node_08"},
    {"id": "edge_08", "label": "P4", "source": "node_06", "target": "node_09"},
    {"id": "edge_09", "source": "node_07", "target": "node_11"},
    {"id": "edge_10", "source": "node_08", "target": "node_10"},
    {"id": "edge_11", "source": "node_09", "target": "node_10"},
    {"id": "edge_12", "source": "node_10", "target": "node_11"}
  ]',
  NOW(),
  NOW()
);

-- ============================================
-- 流程3：人工转接流程
-- ============================================
INSERT INTO flow_definitions (
  id,
  name,
  description,
  version,
  is_active,
  is_default,
  trigger_type,
  priority,
  timeout,
  nodes,
  edges,
  created_at,
  updated_at
) VALUES (
  'flow_human_handover',
  '人工转接流程',
  '处理复杂的人工转接场景，支持团队分配、技能匹配、等待队列、超时处理、转接记录',
  '4.0.0',
  true,
  false,
  'api',
  80,
  600000,
  '[
    {
      "id": "node_00",
      "type": "start",
      "data": {
        "name": "开始",
        "config": {
          "initialVariables": {
            "handoverStartTime": "{{now}}",
            "handoverType": "unknown"
          }
        }
      },
      "position": {"x": 0, "y": 100}
    },
    {
      "id": "node_01",
      "type": "data_query",
      "data": {
        "name": "获取转接请求",
        "description": "获取转接请求信息",
        "config": {
          "source": "api",
          "endpoint": "/api/handover/{{context.handoverId}}",
          "timeout": 5000
        }
      },
      "position": {"x": 150, "y": 100}
    },
    {
      "id": "node_02",
      "type": "decision",
      "data": {
        "name": "识别转接类型",
        "description": "识别转接类型",
        "config": {
          "conditions": [
            {"label": "技能匹配", "expression": "context.handoverType === ''skill_based''", "targetNodeId": "node_03"},
            {"label": "队列等待", "expression": "context.handoverType === ''queue_wait''", "targetNodeId": "node_06"},
            {"label": "指定客服", "expression": "context.handoverType === ''specific_agent''", "targetNodeId": "node_09"}
          ]
        }
      },
      "position": {"x": 250, "y": 100}
    },
    {
      "id": "node_03",
      "type": "task_assign",
      "data": {
        "name": "技能匹配",
        "description": "匹配在线客服",
        "config": {
          "assignStrategy": "skill_matching",
          "requiredSkills": ["customer_service"],
          "skillLevels": ["intermediate", "advanced"],
          "excludeBusyAgents": true,
          "excludeOfflineAgents": true,
          "maxAgentsToCheck": 10,
          "fallbackStrategy": "least_busy"
        }
      },
      "position": {"x": 400, "y": 100}
    },
    {
      "id": "node_04",
      "type": "data_query",
      "data": {
        "name": "检查忙碌状态",
        "description": "检查客服忙碌状态",
        "config": {
          "source": "database",
          "query": "SELECT * FROM agents WHERE id = {{context.agentId}} AND status = ''online''",
          "timeout": 3000
        }
      },
      "position": {"x": 550, "y": 100}
    },
    {
      "id": "node_05",
      "type": "task_assign",
      "data": {
        "name": "分配客服",
        "description": "分配客服",
        "config": {
          "assignTo": "{{context.agentId}}",
          "assignStrategy": "direct",
          "assignmentType": "handover",
          "notifyAgent": true,
          "notifyChannels": ["websocket", "email"]
        }
      },
      "position": {"x": 700, "y": 100}
    },
    {
      "id": "node_06",
      "type": "variable_set",
      "data": {
        "name": "加入等待队列",
        "description": "加入等待队列",
        "config": {
          "variableName": "waitQueuePosition",
          "variableValue": "{{context.currentQueueSize + 1}}",
          "queueName": "handover_queue",
          "maxQueueSize": 50,
          "estimatedWaitTime": "{{context.currentQueueSize * 2}}min"
        }
      },
      "position": {"x": 400, "y": 250}
    },
    {
      "id": "node_07",
      "type": "decision",
      "data": {
        "name": "等待超时判断",
        "description": "判断等待是否超时",
        "config": {
          "conditions": [
            {"label": "超时", "expression": "context.waitTime > 600000", "targetNodeId": "node_08"},
            {"label": "分配成功", "expression": "context.agentAssigned === true", "targetNodeId": "node_05"}
          ]
        }
      },
      "position": {"x": 550, "y": 250}
    },
    {
      "id": "node_08",
      "type": "alert_escalate",
      "data": {
        "name": "升级处理",
        "description": "升级处理",
        "config": {
          "escalateTo": "manager",
          "escalationReason": "等待超时",
          "escalationLevel": "P2",
          "notifyChannels": ["phone", "email"],
          "createTicket": true
        }
      },
      "position": {"x": 700, "y": 250}
    },
    {
      "id": "node_09",
      "type": "data_query",
      "data": {
        "name": "检查客服状态",
        "description": "检查客服状态",
        "config": {
          "source": "database",
          "query": "SELECT * FROM agents WHERE id = {{context.agentId}} AND status = ''online''",
          "timeout": 3000
        }
      },
      "position": {"x": 400, "y": 400}
    },
    {
      "id": "node_10",
      "type": "send_command",
      "data": {
        "name": "通知用户",
        "description": "通知用户转接成功",
        "config": {
          "message": "已为您转接到人工客服，请耐心等待...",
          "commandType": "notification",
          "sendTo": "user",
          "channels": ["robot", "websocket"],
          "saveToInfoCenter": true
        }
      },
      "position": {"x": 850, "y": 100}
    },
    {
      "id": "node_11",
      "type": "end",
      "data": {
        "name": "结束",
        "description": "流程结束"
      },
      "position": {"x": 1000, "y": 100}
    }
  ]',
  '[
    {"id": "edge_00", "source": "node_00", "target": "node_01"},
    {"id": "edge_01", "source": "node_01", "target": "node_02"},
    {"id": "edge_02", "label": "技能匹配", "source": "node_02", "target": "node_03"},
    {"id": "edge_03", "label": "队列等待", "source": "node_02", "target": "node_06"},
    {"id": "edge_04", "label": "指定客服", "source": "node_02", "target": "node_09"},
    {"id": "edge_05", "source": "node_03", "target": "node_04"},
    {"id": "edge_06", "source": "node_04", "target": "node_05"},
    {"id": "edge_07", "source": "node_05", "target": "node_10"},
    {"id": "edge_08", "source": "node_06", "target": "node_07"},
    {"id": "edge_09", "label": "超时", "source": "node_07", "target": "node_08"},
    {"id": "edge_10", "label": "分配成功", "source": "node_07", "target": "node_05"},
    {"id": "edge_11", "source": "node_08", "target": "node_11"},
    {"id": "edge_12", "source": "node_09", "target": "node_05"},
    {"id": "edge_13", "source": "node_10", "target": "node_11"}
  ]',
  NOW(),
  NOW()
);

-- ============================================
-- 流程4：协作决策流程
-- ============================================
INSERT INTO flow_definitions (
  id,
  name,
  description,
  version,
  is_active,
  is_default,
  trigger_type,
  priority,
  timeout,
  nodes,
  edges,
  created_at,
  updated_at
) VALUES (
  'flow_collaboration_decision',
  '协作决策流程',
  '处理多机器人协作决策，支持机器人选择、负载均衡、任务分配、协作协调、结果汇总',
  '4.0.0',
  true,
  false,
  'api',
  70,
  120000,
  '[
    {
      "id": "node_00",
      "type": "start",
      "data": {
        "name": "开始",
        "config": {
          "initialVariables": {
            "collaborationStartTime": "{{now}}",
            "taskType": "unknown"
          }
        }
      },
      "position": {"x": 0, "y": 100}
    },
    {
      "id": "node_01",
      "type": "data_query",
      "data": {
        "name": "接收协作请求",
        "description": "接收协作请求",
        "config": {
          "source": "api",
          "endpoint": "/api/collaboration/{{context.collaborationId}}",
          "timeout": 5000
        }
      },
      "position": {"x": 150, "y": 100}
    },
    {
      "id": "node_02",
      "type": "emotion_analyze",
      "data": {
        "name": "分析任务复杂度",
        "description": "分析任务复杂度",
        "config": {
          "modelId": "doubao-pro-4k",
          "analysisType": "task_complexity",
          "complexityFactors": ["length", "intent", "entities", "dependencies"],
          "complexityLevels": {
            "simple": "single_robot",
            "medium": "multiple_robots",
            "complex": "human_intervention"
          }
        }
      },
      "position": {"x": 250, "y": 100}
    },
    {
      "id": "node_03",
      "type": "decision",
      "data": {
        "name": "决策策略",
        "description": "决定处理策略",
        "config": {
          "conditions": [
            {"label": "单个机器人", "expression": "context.taskComplexity === ''simple''", "targetNodeId": "node_04"},
            {"label": "多个机器人", "expression": "context.taskComplexity === ''medium''", "targetNodeId": "node_07"},
            {"label": "需要人工", "expression": "context.taskComplexity === ''complex''", "targetNodeId": "node_handover"}
          ]
        }
      },
      "position": {"x": 350, "y": 100}
    },
    {
      "id": "node_04",
      "type": "robot_dispatch",
      "data": {
        "name": "选择机器人",
        "description": "选择单个机器人",
        "config": {
          "robotId": "robot_default_001",
          "priority": "medium",
          "role": "assistant",
          "loadBalancing": "least_busy",
          "healthCheck": true
        }
      },
      "position": {"x": 500, "y": 100}
    },
    {
      "id": "node_05",
      "type": "task_assign",
      "data": {
        "name": "分配任务",
        "description": "分配任务",
        "config": {
          "assignTo": "{{context.robotId}}",
          "taskType": "collaboration",
          "taskData": "{{context.taskData}}",
          "priority": "medium",
          "timeout": 60000
        }
      },
      "position": {"x": 650, "y": 100}
    },
    {
      "id": "node_06",
      "type": "data_query",
      "data": {
        "name": "获取结果",
        "description": "获取结果",
        "config": {
          "source": "api",
          "endpoint": "/api/collaboration/{{context.collaborationId}}/result",
          "timeout": 5000
        }
      },
      "position": {"x": 800, "y": 100}
    },
    {
      "id": "node_07",
      "type": "robot_dispatch",
      "data": {
        "name": "选择机器人组",
        "description": "选择多个机器人",
        "config": {
          "robotGroup": "collaboration_group",
          "robotCount": 3,
          "loadBalancing": "round_robin",
          "parallelExecution": true
        }
      },
      "position": {"x": 500, "y": 250}
    },
    {
      "id": "node_08",
      "type": "task_assign",
      "data": {
        "name": "并行分配任务",
        "description": "并行分配任务",
        "config": {
          "assignTo": "{{context.robotIds}}",
          "taskType": "collaboration",
          "taskData": "{{context.taskData}}",
          "priority": "medium",
          "timeout": 120000,
          "parallel": true
        }
      },
      "position": {"x": 650, "y": 250}
    },
    {
      "id": "node_09",
      "type": "variable_set",
      "data": {
        "name": "协调执行",
        "description": "协调执行",
        "config": {
          "variableName": "collaborationStatus",
          "variableValue": "coordinating",
          "coordinationStrategy": "majority_vote",
          "timeout": 120000
        }
      },
      "position": {"x": 800, "y": 250}
    },
    {
      "id": "node_10",
      "type": "data_transform",
      "data": {
        "name": "结果汇总",
        "description": "结果汇总",
        "config": {
          "transformRules": [
            {"rule": "aggregate_results", "strategy": "majority_vote"},
            {"rule": "format_output", "format": "json"}
          ]
        }
      },
      "position": {"x": 950, "y": 250}
    },
    {
      "id": "node_11",
      "type": "end",
      "data": {
        "name": "结束",
        "description": "流程结束"
      },
      "position": {"x": 1100, "y": 100}
    }
  ]',
  '[
    {"id": "edge_00", "source": "node_00", "target": "node_01"},
    {"id": "edge_01", "source": "node_01", "target": "node_02"},
    {"id": "edge_02", "source": "node_02", "target": "node_03"},
    {"id": "edge_03", "label": "单个机器人", "source": "node_03", "target": "node_04"},
    {"id": "edge_04", "label": "多个机器人", "source": "node_03", "target": "node_07"},
    {"id": "edge_05", "label": "需要人工", "source": "node_03", "target": "node_handover"},
    {"id": "edge_06", "source": "node_04", "target": "node_05"},
    {"id": "edge_07", "source": "node_05", "target": "node_06"},
    {"id": "edge_08", "source": "node_06", "target": "node_11"},
    {"id": "edge_09", "source": "node_07", "target": "node_08"},
    {"id": "edge_10", "source": "node_08", "target": "node_09"},
    {"id": "edge_11", "source": "node_09", "target": "node_10"},
    {"id": "edge_12", "source": "node_10", "target": "node_11"}
  ]',
  NOW(),
  NOW()
);

-- ============================================
-- 完成提示
-- ============================================
SELECT '流程优化完成！' AS message;
SELECT COUNT(*) AS new_flow_count FROM flow_definitions WHERE is_active = true;
