/**
 * 协同分析流程
 * 功能：收集和分析业务数据，生成协同分析报告，支持数据丰富和详细日志记录
 * 新增功能：
 * - 数据丰富：在分析过程中提取更多业务上下文信息
 * - 详细日志记录：按业务角色记录所有分析操作
 * - AI行为日志：记录AI的分析决策过程
 */

export const collaborativeAnalysisFlow = {
  name: '协同分析流程（数据增强版）',
  description: '收集和分析业务数据，生成协同分析报告，支持数据丰富和详细日志记录',
  status: 'active',
  triggerType: 'scheduled',
  triggerConfig: {
    cronExpression: '0 */30 * * *', // 每30分钟执行一次
  },
  nodes: [
    {
      id: 'node_1',
      type: 'message_receive',
      position: { x: 100, y: 100 },
      data: {
        name: '数据采集',
        description: '从数据库采集业务数据',
        config: {
          saveToDatabase: false,
          saveToContext: true,
          enableWebSocketPush: false,

          // 数据提取配置
          extractFields: {
            sessionId: true,
            userName: true,
            groupName: true,
            atMe: true,
          },

          // ========== 业务角色提取配置 ==========
          extractBusinessRole: true,
          roleMapping: `售后:包含'售后','客服'字样
营销:包含'营销','推广'字样
技术:包含'技术','开发'字样
运营:包含'运营','活动'字样`,

          // ========== 优先级智能检测 ==========
          enableSmartPriorityDetection: true,
          priorityKeywords: {
            high: '紧急,投诉,故障',
            low: '闲聊,问候',
          },
        },
      },
    },
    {
      id: 'node_2',
      type: 'intent',
      position: { x: 350, y: 100 },
      data: {
        name: '意图分类',
        description: '对采集的数据进行意图分类',
        config: {
          modelId: 'doubao-pro-4k',
          confidenceThreshold: 0.8,
          fallbackIntent: 'analysis',

          // ========== 业务角色感知配置 ==========
          businessRoleMode: 'per_role',
          enableRoleOverride: true,
          fallbackIntentBehavior: 'global_fallback',

          // 支持的意图列表
          supportedIntents: ['service', 'complaint', 'inquiry', 'risk', 'spam'],
        },
      },
    },
    {
      id: 'node_3',
      type: 'decision',
      position: { x: 600, y: 100 },
      data: {
        name: '数据分类',
        description: '根据业务角色和意图分类数据',
        config: {
          decisionMode: 'priority',
          conditions: [
            {
              label: '客服数据',
              expression: 'context.businessRole === "售后" || context.businessRole === "技术"',
              targetNodeId: 'node_4',
            },
            {
              label: '营销数据',
              expression: 'context.businessRole === "营销" || context.businessRole === "运营"',
              targetNodeId: 'node_5',
            },
            {
              label: '其他数据',
              expression: 'true',
              targetNodeId: 'node_6',
            },
          ],
          defaultTarget: 'node_6',

          // ========== AI行为感知配置 ==========
          enableAIBehaviorTrigger: true,
          defaultAIBehaviorMode: 'full_auto',
          enablePriorityBasedDecision: true,
          priorityRules: {
            high: {
              branch: 'node_4',
              aiBehaviorMode: 'full_auto',
            },
            medium: {
              branch: 'node_5',
              aiBehaviorMode: 'full_auto',
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
      type: 'ai_reply',
      position: { x: 850, y: 50 },
      data: {
        name: '客服数据分析',
        description: '分析客服相关数据',
        config: {
          modelId: 'doubao-pro-32k',
          temperature: 0.5,
          maxTokens: 2000,
          useContextHistory: true,
          contextWindowSize: 20,

          // ========== 人设配置 ==========
          enablePersonaOverride: true,
          defaultPersonaTone: 'professional',
          aiBehaviorResponse: {
            full_auto: {
              enableAutoReply: true,
              requireApproval: false,
              autoConfidenceThreshold: 0.8,
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
        name: '营销数据分析',
        description: '分析营销相关数据',
        config: {
          modelId: 'doubao-pro-32k',
          temperature: 0.6,
          maxTokens: 2000,
          useContextHistory: true,
          contextWindowSize: 20,

          // ========== 人设配置 ==========
          enablePersonaOverride: true,
          defaultPersonaTone: 'friendly',
          aiBehaviorResponse: {
            full_auto: {
              enableAutoReply: true,
              requireApproval: false,
              autoConfidenceThreshold: 0.8,
            },
          },
        },
      },
    },
    {
      id: 'node_6',
      type: 'command_status',
      position: { x: 1100, y: 100 },
      data: {
        name: '记录分析日志',
        description: '记录详细的分析操作日志',
        config: {
          saveToRobotCommands: true,
          updateSessionMessages: false,
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
      id: 'node_7',
      type: 'end',
      position: { x: 1350, y: 100 },
      data: {
        name: '生成报告',
        description: '生成协同分析报告',
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
      label: '数据采集完成',
    },
    {
      id: 'edge_2_3',
      source: 'node_2',
      target: 'node_3',
      label: '意图分类完成',
    },
    {
      id: 'edge_3_4',
      source: 'node_3',
      target: 'node_4',
      label: '客服数据',
    },
    {
      id: 'edge_3_5',
      source: 'node_3',
      target: 'node_5',
      label: '营销数据',
    },
    {
      id: 'edge_3_6',
      source: 'node_3',
      target: 'node_6',
      label: '其他数据',
    },
    {
      id: 'edge_4_6',
      source: 'node_4',
      target: 'node_6',
      label: '客服分析完成',
    },
    {
      id: 'edge_5_6',
      source: 'node_5',
      target: 'node_6',
      label: '营销分析完成',
    },
    {
      id: 'edge_6_7',
      source: 'node_6',
      target: 'node_7',
      label: '日志记录完成',
    },
  ],
  variables: {
    // 全局变量
    'system.analysisWindow': 1800, // 30分钟
    'system.minDataPoints': 10,
    'system.enableDataEnrichment': true,
  },
  timeout: 60000, // 60秒超时
  retryConfig: {
    maxRetries: 2,
    retryInterval: 2000,
  },
};
