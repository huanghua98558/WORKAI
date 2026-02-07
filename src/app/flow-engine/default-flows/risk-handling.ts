/**
 * 风险处理流程
 * 功能：AI安抚用户并通知人工介入，支持任务创建和告警功能
 * 新增功能：
 * - 任务创建感知：自动创建处理任务并分配给相关人员
 * - 风险等级升级策略：根据处理情况自动升级或降级风险
 * - AI行为风险策略：根据AI行为模式调整风险处理策略
 */

export const riskHandlingFlow = {
  name: '风险处理流程（任务协同版）',
  description: 'AI安抚用户并通知人工介入，支持任务创建和告警功能',
  status: 'active',
  triggerType: 'webhook',
  triggerConfig: {
    webhookUrl: '/webhook/risk/detected',
    method: 'POST',
  },
  nodes: [
    {
      id: 'node_1',
      type: 'message_receive',
      position: { x: 100, y: 100 },
      data: {
        name: '风险消息接收',
        description: '接收风险检测消息',
        config: {
          saveToDatabase: true,
          saveToContext: true,
          enableWebSocketPush: true,
          pushTarget: 'panel1',

          // ========== 业务角色提取配置 ==========
          extractBusinessRole: true,
          roleMapping: `风险组:包含'风险','安全','审计'字样
技术组:包含'技术','开发','研发'字样
客服组:包含'客服','售后','支持'字样`,

          // ========== 优先级智能检测 ==========
          enableSmartPriorityDetection: true,
          priorityKeywords: {
            high: '严重,紧急,漏洞,攻击,数据泄露',
            low: '警告,提示,提醒',
          },
        },
      },
    },
    {
      id: 'node_2',
      type: 'intent',
      position: { x: 350, y: 100 },
      data: {
        name: '风险评估',
        description: '评估风险类型和等级',
        config: {
          modelId: 'doubao-pro-4k',
          confidenceThreshold: 0.9,
          fallbackIntent: 'unknown',

          // ========== 业务角色感知配置 ==========
          businessRoleMode: 'per_role',
          enableRoleOverride: true,
          fallbackIntentBehavior: 'role_fallback',

          // 支持的意图列表
          supportedIntents: ['risk', 'spam', 'complaint', 'security', 'fraud'],
        },
      },
    },
    {
      id: 'node_3',
      type: 'decision',
      position: { x: 600, y: 100 },
      data: {
        name: '风险等级判断',
        description: '判断风险等级并选择处理策略',
        config: {
          decisionMode: 'priority',
          conditions: [
            {
              label: '严重风险',
              expression: 'context.intent === "risk" && context.confidence > 0.9',
              targetNodeId: 'node_4',
            },
            {
              label: '中等风险',
              expression: 'context.intent === "risk" || context.intent === "complaint"',
              targetNodeId: 'node_5',
            },
            {
              label: '低风险',
              expression: 'true',
              targetNodeId: 'node_6',
            },
          ],
          defaultTarget: 'node_6',

          // ========== AI行为感知配置 ==========
          enableAIBehaviorTrigger: true,
          defaultAIBehaviorMode: 'semi_auto',
          enablePriorityBasedDecision: true,
          priorityRules: {
            high: {
              branch: 'node_4',
              aiBehaviorMode: 'full_auto',
            },
            medium: {
              branch: 'node_5',
              aiBehaviorMode: 'semi_auto',
            },
            low: {
              branch: 'node_6',
              aiBehaviorMode: 'record_only',
            },
          },
        },
      },
    },
    {
      id: 'node_4',
      type: 'risk_handler',
      position: { x: 850, y: 50 },
      data: {
        name: '严重风险处理',
        description: '处理严重风险，立即通知',
        config: {
          riskLevel: 'critical',
          pacifyStrategy: 'immediate',
          notifyStaff: true,

          // ========== 任务创建感知配置 ==========
          enableTaskCreation: true,
          taskConfig: {
            priority: 'high',
            assignee: 'risk_group',
            deadline: 3600, // 1小时
          },

          // ========== 风险等级升级策略 ==========
          escalationStrategy: 'auto',
          escalationRules: {
            critical: {
              escalateAfter: 1800, // 30分钟后升级
              escalateTo: 'incident_manager',
            },
          },

          // ========== AI行为风险策略 ==========
          aiBehaviorStrategy: 'full_auto',
          aiBehaviorConfig: {
            enableImmediateAction: true,
            requireHumanApproval: false,
            autoEscalate: true,
          },
        },
      },
    },
    {
      id: 'node_5',
      type: 'risk_handler',
      position: { x: 850, y: 150 },
      data: {
        name: '中等风险处理',
        description: '处理中等风险，记录并通知',
        config: {
          riskLevel: 'warning',
          pacifyStrategy: 'gentle',
          notifyStaff: true,

          // ========== 任务创建感知配置 ==========
          enableTaskCreation: true,
          taskConfig: {
            priority: 'medium',
            assignee: 'support_group',
            deadline: 7200, // 2小时
          },

          // ========== 风险等级升级策略 ==========
          escalationStrategy: 'manual',
          escalationRules: {
            warning: {
              escalateAfter: 3600, // 1小时后升级
              escalateTo: 'risk_group',
            },
          },

          // ========== AI行为风险策略 ==========
          aiBehaviorStrategy: 'semi_auto',
          aiBehaviorConfig: {
            enableImmediateAction: true,
            requireHumanApproval: true,
            autoEscalate: false,
          },
        },
      },
    },
    {
      id: 'node_6',
      type: 'ai_reply',
      position: { x: 850, y: 250 },
      data: {
        name: '低风险回复',
        description: 'AI安抚低风险用户',
        config: {
          modelId: 'doubao-pro-4k',
          temperature: 0.8,
          maxTokens: 500,
          useContextHistory: true,
          contextWindowSize: 5,

          // ========== 人设配置 ==========
          enablePersonaOverride: true,
          defaultPersonaTone: 'friendly',
          aiBehaviorResponse: {
            full_auto: {
              enableAutoReply: true,
              requireApproval: false,
              autoConfidenceThreshold: 0.7,
            },
          },
        },
      },
    },
    {
      id: 'node_7',
      type: 'alert_save',
      position: { x: 1100, y: 100 },
      data: {
        name: '告警入库',
        description: '保存告警信息到数据库',
        config: {
          alertType: 'intent',
          alertLevel: 'warning',
          intentType: 'risk',

          // ========== 告警级别配置 ==========
          alertLevelConfig: {
            critical: {
              autoEscalate: true,
              escalateAfter: 1800,
              notifyChannels: ['email', 'sms', 'webhook'],
            },
            warning: {
              autoEscalate: false,
              notifyChannels: ['email', 'webhook'],
            },
          },

          // ========== 任务创建能力 ==========
          enableTaskCreation: true,
          taskCreationConfig: {
            autoCreate: true,
            taskTemplate: 'risk_handling',
            defaultAssignee: 'risk_manager',
          },
        },
      },
    },
    {
      id: 'node_8',
      type: 'command_status',
      position: { x: 1350, y: 100 },
      data: {
        name: '记录处理状态',
        description: '记录风险处理状态',
        config: {
          saveToRobotCommands: true,
          updateSessionMessages: true,
          enableWebSocketPush: true,
          pushTarget: 'both',

          // ========== 业务角色日志策略 ==========
          roleLogStrategy: 'per_role',
          enableRoleFilter: true,

          // ========== AI行为日志策略 ==========
          logAIBehavior: true,
          logBehaviorMode: true,
          logExecutionTime: true,
          logConfidence: true,
        },
      },
    },
    {
      id: 'node_9',
      type: 'end',
      position: { x: 1600, y: 100 },
      data: {
        name: '流程结束',
        description: '风险处理完成',
        config: {
          saveSession: true,
          saveStatistics: true,
          triggerNextAction: false,
        },
      },
    },
  ],
  edges: [
    {
      id: 'edge_1_2',
      source: 'node_1',
      target: 'node_2',
      label: '消息接收完成',
    },
    {
      id: 'edge_2_3',
      source: 'node_2',
      target: 'node_3',
      label: '风险评估完成',
    },
    {
      id: 'edge_3_4',
      source: 'node_3',
      target: 'node_4',
      label: '严重风险',
    },
    {
      id: 'edge_3_5',
      source: 'node_3',
      target: 'node_5',
      label: '中等风险',
    },
    {
      id: 'edge_3_6',
      source: 'node_3',
      target: 'node_6',
      label: '低风险',
    },
    {
      id: 'edge_4_7',
      source: 'node_4',
      target: 'node_7',
      label: '严重风险处理完成',
    },
    {
      id: 'edge_5_7',
      source: 'node_5',
      target: 'node_7',
      label: '中等风险处理完成',
    },
    {
      id: 'edge_6_7',
      source: 'node_6',
      target: 'node_7',
      label: '低风险回复完成',
    },
    {
      id: 'edge_7_8',
      source: 'node_7',
      target: 'node_8',
      label: '告警保存完成',
    },
    {
      id: 'edge_8_9',
      source: 'node_8',
      target: 'node_9',
      label: '状态记录完成',
    },
  ],
  variables: {
    // 全局变量
    'system.riskThreshold': 0.8,
    'system.maxRiskRetries': 5,
    'system.riskEscalationTimeout': 1800,
    'system.enableAutoTaskCreation': true,
  },
  timeout: 120000, // 2分钟超时
  retryConfig: {
    maxRetries: 5,
    retryInterval: 2000,
  },
};
