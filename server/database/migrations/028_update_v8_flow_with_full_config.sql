-- ============================================
-- WorkTool AI - v8.0 流程配置补充脚本
-- Migration: 028_update_v8_flow_with_full_config.sql
-- ============================================

-- 更新 v8.0 流程定义，添加完整的节点配置和优先级规则
UPDATE flow_definitions
SET nodes = '[
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
            "keywords": ["紧急", "投诉中", "封号", "封禁", "报警", "严重错误", "无法使用", "系统崩溃", "数据丢失"],
            "description": "最高优先级：紧急问题、严重投诉、系统故障"
          },
          "P1": {
            "keywords": ["投诉", "不满意", "退款", "退费", "返现", "奖励", "赔偿", "质量", "故障", "错误"],
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
]'::jsonb
WHERE id = 'unified-message-routing-v8';

-- 添加注释
COMMENT ON COLUMN flow_definitions.nodes IS '流程节点配置，包含节点类型、位置、数据配置等';
COMMENT ON COLUMN flow_definitions.variables IS '流程变量配置，包含机器人角色、告警级别等';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE 'v8.0 流程配置更新成功';
  RAISE NOTICE '已添加完整的节点配置、优先级规则、图片识别配置、协同分析配置等';
END $$;
