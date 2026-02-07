/**
 * 标准消息接收流程
 * 功能：接收WorkTool消息，提取业务角色，智能检测优先级，记录工作人员状态
 * 新增功能：
 * - 业务角色提取：根据群组名称自动提取业务角色
 * - 优先级智能检测：根据消息内容自动判断消息优先级
 * - 工作人员状态记录：检测工作人员的在线状态和活跃度
 */

export const standardMessageReceiveFlow = {
  name: '标准消息接收流程（业务角色感知版）',
  description: '接收WorkTool消息，自动提取业务角色，智能检测优先级，记录工作人员状态',
  status: 'active',
  triggerType: 'webhook',
  triggerConfig: {
    webhookUrl: '/webhook/worktool/message',
    method: 'POST',
  },
  nodes: [
    {
      id: 'node_1',
      type: 'message_receive',
      position: { x: 100, y: 100 },
      data: {
        name: '消息接收',
        description: '接收WorkTool消息并保存',
        config: {
          // 基础配置
          saveToDatabase: true,
          saveToContext: true,
          enableWebSocketPush: true,
          pushTarget: 'both',

          // 字段提取
          extractFields: {
            messageId: true,
            sessionId: true,
            userName: true,
            groupName: true,
            roomType: true,
            atMe: true,
          },

          // ========== 新增：业务角色提取配置 ==========
          extractBusinessRole: true,
          roleMapping: `售后:包含'售后','客服','支持'字样
营销:包含'营销','推广','销售'字样
技术:包含'技术','开发','研发'字样
运营:包含'运营','活动','推广'字样
财务:包含'财务','发票','账单'字样`,

          // ========== 新增：优先级智能检测 ==========
          enableSmartPriorityDetection: true,
          priorityKeywords: {
            high: '紧急,投诉,问题,故障,严重,错误',
            low: '闲聊,问候,谢谢,你好',
          },

          // ========== 新增：工作人员状态记录 ==========
          trackStaffActivity: true,
        },
      },
    },
    {
      id: 'node_2',
      type: 'intent',
      position: { x: 350, y: 100 },
      data: {
        name: '意图识别',
        description: '识别用户消息意图',
        config: {
          modelId: 'doubao-pro-4k',
          confidenceThreshold: 0.7,
          fallbackIntent: 'unknown',

          // ========== 业务角色感知配置 ==========
          businessRoleMode: 'per_role',
          enableRoleOverride: true,
          fallbackIntentBehavior: 'role_fallback',
        },
      },
    },
    {
      id: 'node_3',
      type: 'decision',
      position: { x: 600, y: 100 },
      data: {
        name: '优先级决策',
        description: '根据优先级和业务角色分发',
        config: {
          decisionMode: 'priority',
          conditions: [
            {
              label: '高优先级',
              expression: 'context.priority === "high"',
              targetNodeId: 'node_4',
            },
            {
              label: '中优先级',
              expression: 'context.priority === "medium"',
              targetNodeId: 'node_5',
            },
            {
              label: '低优先级',
              expression: 'context.priority === "low"',
              targetNodeId: 'node_6',
            },
          ],
          defaultTarget: 'node_5',

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
      type: 'message_dispatch',
      position: { x: 850, y: 50 },
      data: {
        name: '高优先级分发',
        description: '分发高优先级消息',
        config: {
          groupDispatch: {
            enabled: true,
            targetNameSource: 'context',
          },
          privateDispatch: {
            enabled: false,
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
              targetNodeId: 'node_5',
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
      type: 'ai_reply',
      position: { x: 850, y: 150 },
      data: {
        name: 'AI客服回复',
        description: '使用AI生成智能回复',
        config: {
          modelId: 'doubao-pro-4k',
          temperature: 0.7,
          maxTokens: 1000,
          useContextHistory: true,
          contextWindowSize: 10,

          // ========== 人设配置 ==========
          enablePersonaOverride: true,
          defaultPersonaTone: 'professional',
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
      id: 'node_6',
      type: 'end',
      position: { x: 1100, y: 150 },
      data: {
        name: '流程结束',
        description: '保存会话并结束流程',
        config: {
          saveSession: true,
          saveStatistics: true,
          triggerNextAction: false,
        },
      },
    },
    {
      id: 'node_7',
      type: 'send_command',
      position: { x: 1100, y: 50 },
      data: {
        name: '发送高优先级通知',
        description: '发送通知给工作人员',
        config: {
          commandType: 'notification',
          robotId: 'bot_001',
          priority: 'high',

          // ========== 业务角色优先级配置 ==========
          businessRolePriority: {
            mode: 'per_role',
            roles: {
              high: '技术,售后',
              medium: '营销,运营',
            },
          },

          // ========== 工作人员重试策略 ==========
          staffRetryStrategy: {
            mode: 'staff_aware',
            skipIfStaffOnline: true,
            staffOnlineCheckTimeout: 5,
          },

          // ========== AI行为执行策略 ==========
          aiBehaviorExecution: {
            mode: 'conditional',
            executeOnHighConfidence: 0.8,
            executeOnIntention: 'complaint,risk',
          },
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
      label: '高优先级',
    },
    {
      id: 'edge_3_5',
      source: 'node_3',
      target: 'node_5',
      label: '中优先级',
    },
    {
      id: 'edge_3_6',
      source: 'node_3',
      target: 'node_6',
      label: '低优先级',
    },
    {
      id: 'edge_4_7',
      source: 'node_4',
      target: 'node_7',
      label: '分发高优先级消息',
    },
    {
      id: 'edge_5_6',
      source: 'node_5',
      target: 'node_6',
      label: 'AI回复完成',
    },
    {
      id: 'edge_7_6',
      source: 'node_7',
      target: 'node_6',
      label: '通知发送完成',
    },
  ],
  variables: {
    // 全局变量
    'system.botId': 'bot_001',
    'system.maxRetries': 3,
    'system.retryInterval': 1000,
  },
  timeout: 30000,
  retryConfig: {
    maxRetries: 3,
    retryInterval: 1000,
  },
};
