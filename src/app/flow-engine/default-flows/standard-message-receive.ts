/**
 * 标准消息接收流程（增强版）
 * 功能：接收WorkTool消息，提取业务角色，智能检测优先级，记录工作人员状态
 * 增强功能：
 * - 消息重复检测和去重
 * - 敏感词过滤和安全检查
 * - 限流保护和防刷机制
 * - 多级超时和重试处理
 * - 异常恢复和容错机制
 * - 用户画像增强和行为分析
 */

export const standardMessageReceiveFlow = {
  name: '标准消息接收流程（增强版）',
  description: '接收WorkTool消息，自动提取业务角色，智能检测优先级，支持重复检测、敏感词过滤、限流保护等复杂场景',
  status: 'active',
  triggerType: 'webhook',
  triggerConfig: {
    webhookUrl: '/webhook/worktool/message',
    method: 'POST',
    // 鉴权配置
    auth: {
      type: 'api_key',
      headerName: 'X-API-Key',
    },
  },
  nodes: [
    {
      id: 'node_1',
      type: 'message_receive',
      position: { x: 100, y: 100 },
      data: {
        name: '消息接收与预处理',
        description: '接收WorkTool消息，进行重复检测、敏感词过滤、限流保护',
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
            userId: true,
            timestamp: true,
          },

          // ========== 增强功能：消息重复检测 ==========
          enableDuplicateDetection: true,
          duplicateDetectionWindow: 60, // 60秒内相同消息视为重复
          duplicateAction: 'skip', // skip | mark | process

          // ========== 增强功能：敏感词过滤 ==========
          enableSensitiveFilter: true,
          sensitiveKeywords: [
            '政治敏感词', '暴力词汇', '色情词汇', '违法词汇'
          ],
          sensitiveAction: 'block', // block | replace | mark

          // ========== 增强功能：限流保护 ==========
          enableRateLimiting: true,
          rateLimitConfig: {
            maxMessagesPerMinute: 30,
            maxMessagesPerHour: 500,
            perUser: true,
            perGroup: true,
          },
          rateLimitAction: 'queue', // reject | queue | throttle

          // ========== 业务角色提取配置 ==========
          extractBusinessRole: true,
          roleMapping: `售后:包含'售后','客服','支持','帮助'字样
营销:包含'营销','推广','销售','市场'字样
技术:包含'技术','开发','研发','工程'字样
运营:包含'运营','活动','推广','策划'字样
财务:包含'财务','发票','账单','结算'字样
风控:包含'风控','安全','审计','合规'字样
产品:包含'产品','需求','规划'字样
人事:包含'人事','HR','招聘'字样`,

          // ========== 增强功能：用户画像提取 ==========
          enableUserProfile: true,
          userProfileFields: [
            'messageFrequency',
            'responseTime',
            'preferredTopics',
            'interactionStyle',
          ],

          // ========== 优先级智能检测 ==========
          enableSmartPriorityDetection: true,
          priorityKeywords: {
            high: '紧急,投诉,问题,故障,严重,错误,崩溃,无法使用',
            medium: '询问,了解,想知道,咨询,帮助,支持',
            low: '闲聊,问候,谢谢,你好,点赞,表情',
          },
          priorityRules: {
            escalateAfter: 1800, // 30分钟后升级
            degradeAfter: 7200, // 2小时后降级
          },

          // ========== 工作人员状态记录 ==========
          trackStaffActivity: true,
          staffDetectionConfig: {
    checkInterval: 30, // 30秒检测一次
    offlineTimeout: 300, // 5分钟无消息视为离线
  },
        },
      },
    },
    {
      id: 'node_2',
      type: 'decision',
      position: { x: 350, y: 100 },
      data: {
        name: '预处理检查',
        description: '检查消息是否重复、包含敏感词、超过限流',
        config: {
          decisionMode: 'priority',
          conditions: [
            {
              label: '重复消息',
              expression: 'context.isDuplicate === true',
              targetNodeId: 'node_11', // 跳过处理
            },
            {
              label: '包含敏感词',
              expression: 'context.containsSensitive === true',
              targetNodeId: 'node_12', // 敏感词处理
            },
            {
              label: '超过限流',
              expression: 'context.isRateLimited === true',
              targetNodeId: 'node_13', // 限流处理
            },
            {
              label: '正常消息',
              expression: 'true',
              targetNodeId: 'node_3', // 继续处理
            },
          ],
          defaultTarget: 'node_3',
        },
      },
    },
    {
      id: 'node_3',
      type: 'intent',
      position: { x: 600, y: 100 },
      data: {
        name: '意图识别与情感分析',
        description: '识别用户消息意图，分析情感倾向',
        config: {
          modelId: 'doubao-pro-4k',
          confidenceThreshold: 0.7,
          fallbackIntent: 'unknown',

          // ========== 业务角色感知配置 ==========
          businessRoleMode: 'per_role',
          enableRoleOverride: true,
          fallbackIntentBehavior: 'role_fallback',

          // ========== 增强功能：情感分析 ==========
          enableSentimentAnalysis: true,
          sentimentThreshold: {
            positive: 0.6,
            negative: 0.4,
          },

          // ========== 增强功能：上下文增强 ==========
          enableContextEnhancement: true,
          contextEnhancementConfig: {
    includeUserProfile: true,
    includeHistoricalMessages: true,
    includeUserRole: true,
    maxContextSize: 20,
  },
        },
      },
    },
    {
      id: 'node_4',
      type: 'decision',
      position: { x: 850, y: 100 },
      data: {
        name: '智能路由决策',
        description: '根据优先级、情感、业务角色智能路由',
        config: {
          decisionMode: 'priority',
          conditions: [
            {
              label: '紧急且负面',
              expression: 'context.priority === "high" && context.sentiment === "negative"',
              targetNodeId: 'node_5',
            },
            {
              label: '紧急',
              expression: 'context.priority === "high"',
              targetNodeId: 'node_5',
            },
            {
              label: '负面情绪',
              expression: 'context.sentiment === "negative"',
              targetNodeId: 'node_6',
            },
            {
              label: 'VIP客户',
              expression: 'context.userProfile.isVIP === true',
              targetNodeId: 'node_7',
            },
            {
              label: '普通咨询',
              expression: 'true',
              targetNodeId: 'node_8',
            },
          ],
          defaultTarget: 'node_8',

          // ========== AI行为感知配置 ==========
          enableAIBehaviorTrigger: true,
          defaultAIBehaviorMode: 'semi_auto',
          enablePriorityBasedDecision: true,
          priorityRules: {
            high: {
              branch: 'node_5',
              aiBehaviorMode: 'full_auto',
              requireEscalation: true,
            },
            medium: {
              branch: 'node_6',
              aiBehaviorMode: 'semi_auto',
            },
            low: {
              branch: 'node_8',
              aiBehaviorMode: 'full_auto',
            },
          },
        },
      },
    },
    {
      id: 'node_5',
      type: 'message_dispatch',
      position: { x: 1100, y: 50 },
      data: {
        name: '紧急消息分发',
        description: '紧急消息优先分发，立即通知工作人员',
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

          // ========== 增强功能：多渠道通知 ==========
          enableMultiChannelNotify: true,
          notifyChannels: ['robot', 'email', 'sms', 'webhook'],

          // ========== 优先级分发规则 ==========
          enablePriorityDispatch: true,
          priorityRules: {
            high: {
              targetNodeId: 'node_9',
              responseTimeLimit: 300, // 5分钟内响应
            },
          },
        },
      },
    },
    {
      id: 'node_6',
      type: 'ai_reply',
      position: { x: 1100, y: 150 },
      data: {
        name: '情绪安抚回复',
        description: 'AI安抚负面情绪用户',
        config: {
          modelId: 'doubao-pro-4k',
          temperature: 0.8,
          maxTokens: 800,
          useContextHistory: true,
          contextWindowSize: 10,

          // ========== 人设配置 ==========
          enablePersonaOverride: true,
          defaultPersonaTone: 'empathetic',
          aiBehaviorResponse: {
            semi_auto: {
              enableAutoReply: true,
              requireApproval: true,
              autoConfidenceThreshold: 0.7,
            },
          },

          // ========== 增强功能：情绪安抚策略 ==========
          pacificationStrategy: {
    acknowledge: true,
    apologize: true,
    reassure: true,
    offerHelp: true,
  },
        },
      },
    },
    {
      id: 'node_7',
      type: 'message_dispatch',
      position: { x: 1100, y: 250 },
      data: {
        name: 'VIP客户分发',
        description: 'VIP客户专属服务分发',
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

          // ========== VIP专属配置 ==========
          vipConfig: {
    priorityBoost: 2,
    exclusiveChannel: true,
    dedicatedStaff: true,
  },
        },
      },
    },
    {
      id: 'node_8',
      type: 'ai_reply',
      position: { x: 1100, y: 350 },
      data: {
        name: '标准AI回复',
        description: '标准智能回复',
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
          },
        },
      },
    },
    {
      id: 'node_9',
      type: 'send_command',
      position: { x: 1350, y: 50 },
      data: {
        name: '发送紧急通知',
        description: '发送紧急通知给工作人员',
        config: {
          commandType: 'notification',
          robotId: 'bot_001',
          priority: 'high',

          // ========== 业务角色优先级配置 ==========
          businessRolePriority: {
            mode: 'per_role',
            roles: {
              high: '技术,售后,风控',
              medium: '运营,产品',
            },
          },

          // ========== 工作人员重试策略 ==========
          staffRetryStrategy: {
            mode: 'staff_aware',
            skipIfStaffOnline: false,
    staffOnlineCheckTimeout: 3,
    escalateIfNoResponse: true,
    escalateAfter: 600, // 10分钟后升级
  },

          // ========== AI行为执行策略 ==========
          aiBehaviorExecution: {
            mode: 'conditional',
            executeOnHighConfidence: 0.7,
            executeOnIntention: 'complaint,risk,emergency',
          },
        },
      },
    },
    {
      id: 'node_10',
      type: 'command_status',
      position: { x: 1600, y: 100 },
      data: {
        name: '记录处理日志',
        description: '记录详细处理日志',
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

          // ========== 增强功能：详细日志 ==========
          logDetailedInfo: {
    logDuplicateCheck: true,
    logSensitiveFilter: true,
    logRateLimit: true,
    logSentiment: true,
    logUserProfile: true,
  },
        },
      },
    },
    {
      id: 'node_11',
      type: 'end',
      position: { x: 500, y: 300 },
      data: {
        name: '跳过处理（重复消息）',
        description: '重复消息，跳过处理',
        config: {
          saveSession: false,
          saveStatistics: true,
          triggerNextAction: false,
        },
      },
    },
    {
      id: 'node_12',
      type: 'risk_handler',
      position: { x: 500, y: 380 },
      data: {
        name: '敏感词处理',
        description: '处理包含敏感词的消息',
        config: {
          riskLevel: 'warning',
          pacifyStrategy: 'delayed',
          notifyStaff: false,
          enableTaskCreation: false,
          aiBehaviorStrategy: 'record_only',
        },
      },
    },
    {
      id: 'node_13',
      type: 'send_command',
      position: { x: 500, y: 460 },
      data: {
        name: '限流通知',
        description: '通知用户已达到限流',
        config: {
          commandType: 'message',
          robotId: 'bot_001',
          priority: 'low',
          messageContent: '您的消息发送频率过高，请稍后再试。',
          businessRolePriority: {
            mode: 'global',
          },
        },
      },
    },
  ],
  edges: [
    // 主流程
    { id: 'edge_1_2', source: 'node_1', target: 'node_2', label: '消息接收完成' },
    { id: 'edge_2_3', source: 'node_2', target: 'node_3', label: '正常消息' },
    { id: 'edge_2_11', source: 'node_2', target: 'node_11', label: '重复消息' },
    { id: 'edge_2_12', source: 'node_2', target: 'node_12', label: '包含敏感词' },
    { id: 'edge_2_13', source: 'node_2', target: 'node_13', label: '超过限流' },
    { id: 'edge_3_4', source: 'node_3', target: 'node_4', label: '意图识别完成' },
    { id: 'edge_4_5', source: 'node_4', target: 'node_5', label: '紧急且负面' },
    { id: 'edge_4_6', source: 'node_4', target: 'node_6', label: '负面情绪' },
    { id: 'edge_4_7', source: 'node_4', target: 'node_7', label: 'VIP客户' },
    { id: 'edge_4_8', source: 'node_4', target: 'node_8', label: '普通咨询' },
    { id: 'edge_5_9', source: 'node_5', target: 'node_9', label: '紧急分发' },
    { id: 'edge_6_10', source: 'node_6', target: 'node_10', label: '安抚完成' },
    { id: 'edge_7_10', source: 'node_7', target: 'node_10', label: 'VIP分发完成' },
    { id: 'edge_8_10', source: 'node_8', target: 'node_10', label: 'AI回复完成' },
    { id: 'edge_9_10', source: 'node_9', target: 'node_10', label: '通知发送完成' },
  ],
  variables: {
    // 全局变量
    'system.botId': 'bot_001',
    'system.maxRetries': 5,
    'system.retryInterval': 2000,
    'system.enableDuplicateDetection': true,
    'system.enableSensitiveFilter': true,
    'system.enableRateLimiting': true,
    'system.enableSentimentAnalysis': true,
    'system.duplicateWindow': 60,
    'system.sensitiveAction': 'block',
    'system.rateLimit.maxPerMinute': 30,
    'system.rateLimit.maxPerHour': 500,
  },
  timeout: 60000, // 60秒超时
  retryConfig: {
    maxRetries: 5,
    retryInterval: 2000,
  },
};
