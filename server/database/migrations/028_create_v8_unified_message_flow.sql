-- ============================================
-- WorkTool AI - v8.0 统一消息处理流程创建脚本
-- Migration: 028_create_v8_unified_message_flow.sql
-- ============================================

-- 插入 v8.0 统一消息处理流程定义
INSERT INTO flow_definitions (
  id,
  name,
  description,
  version,
  is_active,
  trigger_type,
  trigger_config,
  nodes,
  edges,
  variables,
  timeout,
  retry_config,
  created_by
) VALUES (
  'unified-message-routing-v8',
  '统一消息处理流程 v8.0',
  'v8.0 统一消息处理流程：包含优先级判断、运营消息特殊处理、图片消息处理、协同分析、介入决策等核心功能',
  '8.0.0',
  true,
  'webhook',
  '{
    "webhookUrl": "/api/robots/callback",
    "verifySignature": true,
    "idempotencyCheck": true,
    "timeout": 5000
  }'::jsonb,
  '[
    {
      "id": "node_webhook_trigger",
      "name": "Webhook触发器",
      "nodeType": "trigger_webhook",
      "position": {"x": 100, "y": 50},
      "data": {
        "config": {
          "webhookUrl": "/api/robots/callback",
          "verifySignature": true,
          "idempotencyCheck": true,
          "timeout": 5000
        }
      }
    },
    {
      "id": "node_message_receive",
      "name": "消息接收与保存",
      "nodeType": "multi_task_message",
      "position": {"x": 100, "y": 150},
      "data": {
        "config": {
          "saveToMessagesTable": true,
          "saveToSessionMessages": true,
          "pushToMonitorQueue": true,
          "messageSend": {
            "messageType": "text",
            "atUser": false
          },
          "taskDescription": "接收并保存企业微信群消息"
        }
      }
    },
    {
      "id": "node_priority_check",
      "name": "优先级判断",
      "nodeType": "PRIORITY_CHECK",
      "position": {"x": 100, "y": 250},
      "data": {
        "config": {
          "priorityRules": {
            "P0": {
              "keywords": ["紧急", "投诉", "投诉中", "封号", "封禁", "报警", "严重错误", "无法使用", "系统崩溃", "数据丢失"],
              "description": "最高优先级：紧急问题、投诉、系统故障"
            },
            "P1": {
              "keywords": ["投诉", "不满意", "退款", "退费", "返现", "奖励", "赔偿", "质量", "问题", "故障", "错误"],
              "description": "高优先级：投诉、退款、质量问题"
            },
            "P2": {
              "keywords": ["咨询", "求助", "麻烦", "不会", "怎么", "如何", "问题", "疑问"],
              "description": "中优先级：普通咨询、求助"
            },
            "P3": {
              "keywords": ["谢谢", "感谢", "收到", "好的", "明白", "了解", "可以"],
              "description": "低优先级：确认、感谢"
            }
          },
          "defaultPriority": "P2",
          "alertThreshold": "P0"
        }
      }
    },
    {
      "id": "node_sender_identify",
      "name": "发送者身份识别",
      "nodeType": "multi_task_ai",
      "position": {"x": 300, "y": 250},
      "data": {
        "config": {
          "taskType": "role_identification",
          "taskDescription": "识别发送者角色：运营/工作人员/用户/机器人",
          "interventionJudgment": {
            "staffRules": {
              "activeStatus": "active",
              "responseTimeThreshold": 30,
              "userReplyStrategy": "immediate"
            },
            "operatorRules": {
              "interventionStrategy": "immediate",
              "recordAbnormalBehavior": true,
              "toneDetection": "enabled"
            }
          }
        }
      }
    },
    {
      "id": "node_image_recognition",
      "name": "图片识别",
      "nodeType": "IMAGE_RECOGNITION",
      "position": {"x": 300, "y": 350},
      "data": {
        "config": {
          "enableOCR": true,
          "enableContentAnalysis": true,
          "ocrConfig": {
            "extractText": true,
            "minConfidence": 0.7
          },
          "contentAnalysisConfig": {
            "detectObjects": true,
            "detectText": true,
            "extractKeyInfo": true
          },
          "taskDescription": "识别图片内容，提取文字和关键信息"
        }
      }
    },
    {
      "id": "node_route_branch",
      "name": "角色路由",
      "nodeType": "condition",
      "position": {"x": 500, "y": 350},
      "data": {
        "config": {
          "conditionField": "context.senderRole",
          "branches": [
            {
              "condition": "context.priority === \"P0\"",
              "priority": 0,
              "targetNodeId": "node_high_priority_handling"
            },
            {
              "condition": "context.senderRole === \"operation\"",
              "priority": 1,
              "targetNodeId": "node_operation_handling"
            },
            {
              "condition": "context.senderRole === \"group_assistant\" || context.senderRole === \"after_sales\"",
              "priority": 2,
              "targetNodeId": "node_staff_handling"
            },
            {
              "condition": "context.routeToAfterSales === true",
              "priority": 3,
              "targetNodeId": "node_after_sales_handling"
            },
            {
              "condition": "context.senderRole === \"user\"",
              "priority": 4,
              "targetNodeId": "node_user_handling"
            },
            {
              "condition": "context.senderRole === \"robot\"",
              "priority": 5,
              "targetNodeId": "node_robot_handling"
            }
          ]
        }
      }
    },
    {
      "id": "node_high_priority_handling",
      "name": "高优先级处理",
      "nodeType": "USER_MESSAGE_HANDLER",
      "position": {"x": 700, "y": 50},
      "data": {
        "config": {
          "priority": "P0",
          "immediateAlert": true,
          "alertLevel": "critical",
          "messageSend": {
            "messageType": "text",
            "atUser": true,
            "replyDelay": {
              "dayShift": {"min": 0, "max": 0},
              "lateNightHigh": {"min": 60, "max": 120},
              "lateNightMedium": {"min": 180, "max": 300},
              "lateNightLow": {"noReply": true},
              "nightShift": {"min": 30, "max": 90}
            }
          },
          "taskDescription": "处理高优先级紧急消息，立即告警并快速响应",
          "requireStaffIntervention": true
        }
      }
    },
    {
      "id": "node_operation_handling",
      "name": "运营消息处理",
      "nodeType": "OPERATION_MESSAGE",
      "position": {"x": 700, "y": 150},
      "data": {
        "config": {
          "taskType": "multi_task",
          "taskDescription": "处理运营（财神爷）消息，识别要求、跟踪号主响应、检测冲突",
          "contextRetrieval": {
            "sessionType": "group",
            "userProfileFields": ["cooperationLevel", "satisfactionScore"],
            "newUserOptimization": {
              "shortResponse": true,
              "crossGroupHistory": true
            }
          },
          "interventionJudgment": {
            "staffRules": {
              "activeStatus": "active",
              "responseTimeThreshold": 30,
              "userReplyStrategy": "immediate"
            },
            "operatorRules": {
              "interventionStrategy": "immediate",
              "recordAbnormalBehavior": true,
              "toneDetection": "enabled"
            }
          },
          "specialHandling": {
            "detectCommands": true,
            "trackResponse": true,
            "detectConflicts": true,
            "commandKeywords": ["@所有人", "全员", "紧急", "重要通知", "任务分配"]
          }
        }
      }
    },
    {
      "id": "node_staff_handling",
      "name": "工作人员消息处理",
      "nodeType": "STAFF_MESSAGE_HANDLER",
      "position": {"x": 700, "y": 250},
      "data": {
        "config": {
          "taskType": "multi_task",
          "taskDescription": "记录工作人员活跃度、判断是否需要介入",
          "contextRetrieval": {
            "sessionType": "group",
            "userProfileFields": ["satisfactionScore", "cooperationLevel"],
            "loadExtendedInfo": true
          },
          "interventionJudgment": {
            "staffRules": {
              "activeStatus": "active",
              "responseTimeThreshold": 30,
              "userReplyStrategy": "immediate"
            }
          },
          "trackMetrics": {
            "trackResponseTime": true,
            "trackActivity": true,
            "trackCollaboration": true
          }
        }
      }
    },
    {
      "id": "node_after_sales_handling",
      "name": "售后任务处理",
      "nodeType": "after_sales_task",
      "position": {"x": 700, "y": 350},
      "data": {
        "config": {
          "taskType": "task_completion",
          "taskTypes": [
            "扫码认证",
            "绑定手机",
            "上传视频",
            "删除商品",
            "分享链接",
            "修改资料",
            "实名认证",
            "其他"
          ],
          "taskDescription": "处理售后任务，包括机器人安抚、任务跟踪、腾讯文档同步",
          "taskTimeoutMinutes": 60,
          "tencentDocSync": {
            "docUrl": "",
            "enabled": true,
            "syncMode": "auto",
            "taskIdColumnName": "任务ID",
            "statusColumnName": "状态"
          },
          "reminderIntervalMinutes": 15,
          "robotComfort": {
            "online": "{userName}，好的，请稍等，售后人员马上就来处理 👍",
            "offline": "{userName}，好的，请稍等，已通知售后人员，马上会来处理 🔔",
            "busy": "{userName}，好的，请稍等，售后人员正在处理其他任务，马上就来 ⏳"
          },
          "cooperationScoreRules": {
            "immediateResponse": 5,
            "completedOnTime": 5,
            "completedLate": 2,
            "refused": 0
          }
        }
      }
    },
    {
      "id": "node_user_handling",
      "name": "用户消息处理",
      "nodeType": "USER_MESSAGE_HANDLER",
      "position": {"x": 700, "y": 450},
      "data": {
        "config": {
          "taskType": "multi_task",
          "taskDescription": "处理用户消息：意图识别、告警判断、AI回复、延迟控制、机器人通讯",
          "contextRetrieval": {
            "sessionType": "user",
            "contextLength": 10,
            "userProfileFields": [
              "satisfactionScore",
              "emotion",
              "cooperationLevel",
              "complaintCount"
            ],
            "newUserOptimization": {
              "priorityGuidance": true,
              "crossGroupHistory": true,
              "enabled": true
            }
          },
          "interventionJudgment": {
            "staffRules": {
              "activeStatus": "active",
              "responseTimeThreshold": 30,
              "userReplyStrategy": "immediate"
            }
          },
          "messageSend": {
            "messageType": "text",
            "atUser": true,
            "replyDelay": {
              "dayShift": {"min": 0, "max": 0},
              "lateNightHigh": {"min": 300, "max": 600},
              "lateNightMedium": {"min": 600, "max": 1800},
              "lateNightLow": {"noReply": true},
              "nightShift": {"min": 60, "max": 300}
            },
            "robotRole": "auto",
            "crossRobotSend": false
          },
          "timeRestriction": {
            "dayShift": {
              "enabled": true,
              "start": "9:00",
              "end": "21:00"
            },
            "nightShift": {
              "enabled": true,
              "start": "21:00",
              "end": "24:00"
            },
            "lateNight": {
              "enabled": true,
              "start": "00:00",
              "end": "06:00"
            }
          }
        }
      }
    },
    {
      "id": "node_robot_handling",
      "name": "机器人消息处理",
      "nodeType": "MONITOR_ONLY",
      "position": {"x": 700, "y": 550},
      "data": {
        "config": {
          "taskType": "robot_monitor",
          "taskDescription": "监控机器人消息，记录日志，不执行回复",
          "messageSend": {
            "messageType": "text",
            "atUser": false
          },
          "saveLog": true
        }
      }
    },
    {
      "id": "node_collaboration_analysis",
      "name": "协同分析",
      "nodeType": "COLLABORATION_ANALYSIS_NODE",
      "position": {"x": 900, "y": 350},
      "data": {
        "config": {
          "analysisDimensions": [
            "staff_activity",
            "user_satisfaction",
            "collaboration_efficiency",
            "problem_resolution"
          ],
          "timeWindow": {
            "duration": "7d",
            "type": "rolling"
          },
          "thresholds": {
            "lowActivityRate": 0.3,
            "lowSatisfactionScore": 3.0,
            "highCollaborationTime": 3600,
            "lowResolutionRate": 0.7
          },
          "taskDescription": "分析协同效率、工作人员活跃度、用户满意度、问题解决率"
        }
      }
    },
    {
      "id": "node_intervention_decision",
      "name": "介入决策",
      "nodeType": "INTERVENTION_DECISION",
      "position": {"x": 1100, "y": 350},
      "data": {
        "config": {
          "interventionCriteria": {
            "highPriorityMessages": true,
            "negativeEmotion": true,
            "longResponseTime": true,
            "complaintKeywords": true,
            "lowCollaboration": true
          },
          "rules": {
            "priority": ["P0", "P1"],
            "responseTimeThreshold": 300,
            "negativeEmotionThreshold": 0.7,
            "complaintKeywords": ["投诉", "不满意", "质量问题"]
          },
          "taskDescription": "基于分析结果和业务规则，决定是否需要人工介入"
        }
      }
    },
    {
      "id": "node_session_management",
      "name": "会话管理与分析",
      "nodeType": "end",
      "position": {"x": 1300, "y": 350},
      "data": {
        "config": {
          "updateContext": true,
          "updateSessionStatus": true,
          "triggerCollaborationAnalysis": true,
          "pushToMonitor": true
        }
      }
    }
  ]'::jsonb,
  '[
    {
      "source": "node_webhook_trigger",
      "target": "node_message_receive"
    },
    {
      "source": "node_message_receive",
      "target": "node_priority_check"
    },
    {
      "source": "node_priority_check",
      "target": "node_sender_identify"
    },
    {
      "source": "node_sender_identify",
      "target": "node_image_recognition"
    },
    {
      "source": "node_image_recognition",
      "target": "node_route_branch"
    },
    {
      "condition": "context.priority === \"P0\"",
      "source": "node_route_branch",
      "target": "node_high_priority_handling"
    },
    {
      "condition": "context.senderRole === \"operation\"",
      "source": "node_route_branch",
      "target": "node_operation_handling"
    },
    {
      "condition": "context.senderRole === \"group_assistant\" || context.senderRole === \"after_sales\"",
      "source": "node_route_branch",
      "target": "node_staff_handling"
    },
    {
      "condition": "context.routeToAfterSales === true",
      "source": "node_route_branch",
      "target": "node_after_sales_handling"
    },
    {
      "condition": "context.senderRole === \"user\"",
      "source": "node_route_branch",
      "target": "node_user_handling"
    },
    {
      "condition": "context.senderRole === \"robot\"",
      "source": "node_route_branch",
      "target": "node_robot_handling"
    },
    {
      "source": "node_high_priority_handling",
      "target": "node_collaboration_analysis"
    },
    {
      "source": "node_operation_handling",
      "target": "node_collaboration_analysis"
    },
    {
      "source": "node_staff_handling",
      "target": "node_collaboration_analysis"
    },
    {
      "source": "node_after_sales_handling",
      "target": "node_collaboration_analysis"
    },
    {
      "source": "node_user_handling",
      "target": "node_collaboration_analysis"
    },
    {
      "source": "node_robot_handling",
      "target": "node_collaboration_analysis"
    },
    {
      "source": "node_collaboration_analysis",
      "target": "node_intervention_decision"
    },
    {
      "source": "node_intervention_decision",
      "target": "node_session_management"
    }
  ]'::jsonb,
  '{
    "systemConfig": {
      "timezone": "Asia/Shanghai",
      "locale": "zh-CN"
    },
    "robotRoles": {
      "MONITOR": {
        "name": "监控机器人",
        "priority": 4
      },
      "NOTIFIER": {
        "name": "通知机器人",
        "priority": 2
      },
      "DAY_REPLY": {
        "name": "白班回复机器人",
        "priority": 1
      },
      "NIGHT_REPLY": {
        "name": "晚班回复机器人",
        "priority": 1
      },
      "AFTER_SALES_1": {
        "name": "售后机器人早班",
        "priority": 1
      },
      "AFTER_SALES_2": {
        "name": "售后机器人晚班",
        "priority": 1
      }
    },
    "alertLevels": {
      "P0": {
        "name": "紧急",
        "color": "#ef4444",
        "immediateAlert": true
      },
      "P1": {
        "name": "高",
        "color": "#f97316",
        "immediateAlert": true
      },
      "P2": {
        "name": "中",
        "color": "#eab308",
        "immediateAlert": false
      },
      "P3": {
        "name": "低",
        "color": "#22c55e",
        "immediateAlert": false
      }
    }
  }'::jsonb,
  60000,
  '{
    "maxRetries": 3,
    "retryInterval": 1000
  }'::jsonb,
  'system'
);

-- 插入 v8.0 流程变量配置
INSERT INTO flow_variables (
  flow_definition_id,
  variable_name,
  variable_type,
  default_value,
  description,
  is_sensitive,
  is_required,
  validation_rules,
  created_at
) VALUES
-- 优先级相关变量
('unified-message-routing-v8', 'priority', 'string', 'P2', '消息优先级（P0-P3）', false, true, '{"enum": ["P0", "P1", "P2", "P3"]}'::jsonb, NOW()),
('unified-message-routing-v8', 'priorityThreshold', 'string', 'P0', '告警触发优先级阈值', false, false, '{"enum": ["P0", "P1", "P2", "P3"]}'::jsonb, NOW()),

-- 角色相关变量
('unified-message-routing-v8', 'senderRole', 'string', 'user', '发送者角色（user/staff/operation/robot）', false, true, '{"enum": ["user", "staff", "operation", "robot"]}'::jsonb, NOW()),
('unified-message-routing-v8', 'routeToAfterSales', 'boolean', false, '是否路由到售后处理', false, false, NULL, NOW()),

-- 图片识别相关变量
('unified-message-routing-v8', 'hasImage', 'boolean', false, '是否包含图片', false, false, NULL, NOW()),
('unified-message-routing-v8', 'imageContent', 'object', '{}', '图片识别结果（OCR文字、物体检测等）', false, false, NULL, NOW()),
('unified-message-routing-v8', 'extractedText', 'string', '', '从图片中提取的文字', false, false, NULL, NOW()),

-- 协同分析相关变量
('unified-message-routing-v8', 'collaborationScore', 'number', 0, '协同评分（0-100）', false, false, '{"min": 0, "max": 100}'::jsonb, NOW()),
('unified-message-routing-v8', 'staffActivityRate', 'number', 0, '工作人员活跃率（0-1）', false, false, '{"min": 0, "max": 1}'::jsonb, NOW()),
('unified-message-routing-v8', 'userSatisfactionScore', 'number', 4.5, '用户满意度评分（0-5）', false, false, '{"min": 0, "max": 5}'::jsonb, NOW()),
('unified-message-routing-v8', 'problemResolutionRate', 'number', 0, '问题解决率（0-1）', false, false, '{"min": 0, "max": 1}'::jsonb, NOW()),

-- 介入决策相关变量
('unified-message-routing-v8', 'requireIntervention', 'boolean', false, '是否需要人工介入', false, false, NULL, NOW()),
('unified-message-routing-v8', 'interventionReason', 'string', '', '介入原因', false, false, NULL, NOW()),
('unified-message-routing-v8', 'interventionLevel', 'string', 'normal', '介入级别（normal/urgent/critical）', false, false, '{"enum": ["normal", "urgent", "critical"]}'::jsonb, NOW()),

-- 时间控制相关变量
('unified-message-routing-v8', 'responseTime', 'number', 0, '响应时间（秒）', false, false, '{"min": 0}'::jsonb, NOW()),
('unified-message-routing-v8', 'collaborationTime', 'number', 0, '协同处理时间（秒）', false, false, '{"min": 0}'::jsonb, NOW()),

-- 消息内容相关变量
('unified-message-routing-v8', 'messageIntent', 'string', 'unknown', '消息意图（咨询/投诉/求助/确认/其他）', false, false, '{"enum": ["咨询", "投诉", "求助", "确认", "其他", "unknown"]}'::jsonb, NOW()),
('unified-message-routing-v8', 'userEmotion', 'string', 'neutral', '用户情绪（positive/neutral/negative）', false, false, '{"enum": ["positive", "neutral", "negative"]}'::jsonb, NOW());

-- 禁用 v7.0 流程，启用 v8.0 流程
UPDATE flow_definitions
SET is_active = false
WHERE id = 'unified-message-routing-v7';

UPDATE flow_definitions
SET is_active = true
WHERE id = 'unified-message-routing-v8';

-- 添加注释
COMMENT ON TABLE flow_definitions IS '流程定义表 - v8.0 统一消息处理流程已创建';
COMMENT ON TABLE flow_variables IS '流程变量表 - v8.0 流程变量已配置';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE 'v8.0 统一消息处理流程创建成功';
  RAISE NOTICE '流程ID: unified-message-routing-v8';
  RAISE NOTICE '版本: 8.0.0';
  RAISE NOTICE '包含节点数: 14';
  RAISE NOTICE '包含边数: 20';
  RAISE NOTICE '流程变量数: 16';
END $$;
