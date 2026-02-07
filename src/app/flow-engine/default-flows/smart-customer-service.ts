/**
 * 智能客服流程
 * 功能：AI智能客服，支持工作人员感知和优先级策略
 * 新增功能：
 * - 工作人员感知：检测工作人员在线状态并调整客服策略
 * - 优先级策略：根据用户需求智能调整服务优先级
 * - 人性化交互：根据用户类型提供个性化服务
 */

export const smartCustomerServiceFlow = {
  name: '智能客服流程（工作人员感知版）',
  description: 'AI智能客服，支持工作人员感知和优先级策略',
  status: 'active',
  triggerType: 'webhook',
  triggerConfig: {
    webhookUrl: '/webhook/customer/service',
    method: 'POST',
  },
  nodes: [
    {
      id: 'node_1',
      type: 'message_receive',
      position: { x: 100, y: 100 },
      data: {
        name: '用户消息接收',
        description: '接收用户咨询消息',
        config: {
          saveToDatabase: true,
          saveToContext: true,
          enableWebSocketPush: true,
          pushTarget: 'both',

          // ========== 业务角色提取配置 ==========
          extractBusinessRole: true,
          roleMapping: `VIP客户:包含'VIP','尊贵','金牌'字样
普通客户:包含'普通','一般'字样
新客户:包含'新','首次'字样`,

          // ========== 优先级智能检测 ==========
          enableSmartPriorityDetection: true,
          priorityKeywords: {
            high: '紧急,投诉,问题,咨询',
            medium: '询问,了解,想知道',
            low: '闲聊,问候,闲谈',
          },

          // ========== 工作人员状态记录 ==========
          trackStaffActivity: true,
        },
      },
    },
    {
      id: 'node_2',
      type: 'intent',
      position: { x: 350, y: 100 },
      data: {
        name: '用户意图识别',
        description: '识别用户咨询意图',
        config: {
          modelId: 'doubao-pro-4k',
          confidenceThreshold: 0.75,
          fallbackIntent: 'chat',

          // ========== 业务角色感知配置 ==========
          businessRoleMode: 'per_role',
          enableRoleOverride: true,
          fallbackIntentBehavior: 'role_fallback',

          // 支持的意图列表
          supportedIntents: ['service', 'help', 'chat', 'complaint', 'inquiry', 'order', 'praise'],
        },
      },
    },
    {
      id: 'node_3',
      type: 'decision',
      position: { x: 600, y: 100 },
      data: {
        name: '服务策略选择',
        description: '根据用户类型和意图选择服务策略',
        config: {
          decisionMode: 'priority',
          conditions: [
            {
              label: 'VIP客户',
              expression: 'context.businessRole === "VIP客户"',
              targetNodeId: 'node_4',
            },
            {
              label: '投诉类',
              expression: 'context.intent === "complaint" || context.intent === "risk"',
              targetNodeId: 'node_5',
            },
            {
              label: '普通咨询',
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
              aiBehaviorMode: 'full_auto',
            },
          },
        },
      },
    },
    {
      id: 'node_4',
      type: 'message_dispatch',
      position: { x: 850, y: 50 },
      data: {
        name: 'VIP客户分发',
        description: '优先处理VIP客户',
        config: {
          groupDispatch: {
            enabled: true,
            targetNameSource: 'context',
          },
          privateDispatch: {
            enabled: true,
          },

          // ========== 业务角色感知配置 ==========
          enableBusinessRoleDispatch: true,

          // ========== 工作人员感知配置 ==========
          staffOnlineCheck: 'priority_if_online',

          // ========== 优先级分发规则 ==========
          enablePriorityDispatch: true,
          priorityRules: {
            high: {
              targetNodeId: 'node_7',
            },
            medium: {
              targetNodeId: 'node_6',
            },
            low: {
              targetNodeId: 'node_6',
            },
          },
        },
      },
    },
    {
      id: 'node_5',
      type: 'message_dispatch',
      position: { x: 850, y: 150 },
      data: {
        name: '投诉处理分发',
        description: '分发投诉类消息',
        config: {
          groupDispatch: {
            enabled: true,
            targetNameSource: 'context',
          },
          privateDispatch: {
            enabled: true,
          },

          // ========== 业务角色感知配置 ==========
          enableBusinessRoleDispatch: true,

          // ========== 工作人员感知配置 ==========
          staffOnlineCheck: 'skip_if_online',

          // ========== 优先级分发规则 ==========
          enablePriorityDispatch: true,
          priorityRules: {
            high: {
              targetNodeId: 'node_7',
            },
          },
        },
      },
    },
    {
      id: 'node_6',
      type: 'ai_reply',
      position: { x: 850, y: 250 },
      data: {
        name: 'AI智能客服',
        description: 'AI自动回复普通咨询',
        config: {
          modelId: 'doubao-pro-4k',
          temperature: 0.7,
          maxTokens: 1000,
          useContextHistory: true,
          contextWindowSize: 10,

          // ========== 人设配置 ==========
          enablePersonaOverride: true,
          defaultPersonaTone: 'friendly',
          aiBehaviorResponse: {
            full_auto: {
              enableAutoReply: true,
              requireApproval: false,
              autoConfidenceThreshold: 0.8,
            },
            semi_auto: {
              enableAutoReply: true,
              requireApproval: true,
              autoConfidenceThreshold: 0.6,
            },
            record_only: {
              enableAutoReply: false,
              requireApproval: false,
            },
          },
        },
      },
    },
    {
      id: 'node_7',
      type: 'send_command',
      position: { x: 1100, y: 100 },
      data: {
        name: '通知工作人员',
        description: '通知工作人员处理重要咨询',
        config: {
          commandType: 'notification',
          robotId: 'bot_002',
          priority: 'high',

          // ========== 业务角色优先级配置 ==========
          businessRolePriority: {
            mode: 'per_role',
            roles: {
              high: 'VIP客户',
              medium: '新客户',
            },
          },

          // ========== 工作人员重试策略 ==========
          staffRetryStrategy: {
            mode: 'staff_aware',
            skipIfStaffOnline: false,
            staffOnlineCheckTimeout: 3,
          },

          // ========== AI行为执行策略 ==========
          aiBehaviorExecution: {
            mode: 'conditional',
            executeOnHighConfidence: 0.7,
            executeOnIntention: 'service,help,complaint',
          },
        },
      },
    },
    {
      id: 'node_8',
      type: 'command_status',
      position: { x: 1350, y: 100 },
      data: {
        name: '记录服务日志',
        description: '记录客户服务日志',
        config: {
          saveToRobotCommands: true,
          updateSessionMessages: true,
          enableWebSocketPush: true,
          pushTarget: 'panel2',

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
        name: '服务结束',
        description: '客户服务完成',
        config: {
          saveSession: true,
          saveStatistics: true,
          triggerNextAction: true,
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
      label: '意图识别完成',
    },
    {
      id: 'edge_3_4',
      source: 'node_3',
      target: 'node_4',
      label: 'VIP客户',
    },
    {
      id: 'edge_3_5',
      source: 'node_3',
      target: 'node_5',
      label: '投诉类',
    },
    {
      id: 'edge_3_6',
      source: 'node_3',
      target: 'node_6',
      label: '普通咨询',
    },
    {
      id: 'edge_4_7',
      source: 'node_4',
      target: 'node_7',
      label: 'VIP客户分发',
    },
    {
      id: 'edge_5_7',
      source: 'node_5',
      target: 'node_7',
      label: '投诉处理分发',
    },
    {
      id: 'edge_6_8',
      source: 'node_6',
      target: 'node_8',
      label: 'AI回复完成',
    },
    {
      id: 'edge_7_8',
      source: 'node_7',
      target: 'node_8',
      label: '通知发送完成',
    },
    {
      id: 'edge_8_9',
      source: 'node_8',
      target: 'node_9',
      label: '日志记录完成',
    },
  ],
  variables: {
    // 全局变量
    'system.defaultBotId': 'bot_002',
    'system.maxResponseTime': 30000, // 30秒
    'system.enableSmartRouting': true,
    'system.vipPriorityBoost': 2,
  },
  timeout: 45000, // 45秒超时
  retryConfig: {
    maxRetries: 3,
    retryInterval: 1000,
  },
};
