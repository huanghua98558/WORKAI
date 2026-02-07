/**
 * 标准客服流程（完整版）
 * 功能：完整的客服工作流，包含接待、咨询、转人工、回访等环节
 * 适用场景：日常客户服务工作，覆盖从咨询到满意的全流程
 */

export const standardCustomerServiceFlow = {
  name: '标准客服流程',
  description: '完整的客服工作流：接待→咨询→解答→转人工→满意度调查→回访',
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
        name: '消息接收',
        description: '接收客户咨询消息',
        config: {
          saveToDatabase: true,
          saveToContext: true,
          enableWebSocketPush: true,
          pushTarget: 'panel1',
          extractBusinessRole: true,
          roleMapping: `VIP客户:包含'VIP','尊贵','金牌'字样
普通客户:包含'普通','一般'字样
新客户:包含'新','首次','试用'字样`,
          enableSmartPriorityDetection: true,
          priorityKeywords: {
            high: '紧急,投诉,问题,故障',
            low: '闲聊,问候',
          },
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
        description: '识别客户咨询意图',
        config: {
          modelId: 'doubao-pro-4k',
          confidenceThreshold: 0.7,
          fallbackIntent: 'chat',
          businessRoleMode: 'per_role',
          enableRoleOverride: true,
          supportedIntents: ['service', 'complaint', 'inquiry', 'praise', 'help'],
        },
      },
    },
    {
      id: 'node_3',
      type: 'decision',
      position: { x: 600, y: 100 },
      data: {
        name: '服务路由',
        description: '根据客户类型和意图路由',
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
              expression: 'context.intent === "complaint"',
              targetNodeId: 'node_5',
            },
            {
              label: '普通咨询',
              expression: 'true',
              targetNodeId: 'node_6',
            },
          ],
          defaultTarget: 'node_6',
        },
      },
    },
    {
      id: 'node_4',
      type: 'message_dispatch',
      position: { x: 850, y: 50 },
      data: {
        name: 'VIP客户分发',
        description: 'VIP客户优先服务',
        config: {
          enableBusinessRoleDispatch: true,
          staffOnlineCheck: 'priority_if_online',
          enablePriorityDispatch: true,
        },
      },
    },
    {
      id: 'node_5',
      type: 'message_dispatch',
      position: { x: 850, y: 150 },
      data: {
        name: '投诉分发',
        description: '投诉立即处理',
        config: {
          enableBusinessRoleDispatch: true,
          staffOnlineCheck: 'skip_if_online',
        },
      },
    },
    {
      id: 'node_6',
      type: 'ai_reply',
      position: { x: 850, y: 250 },
      data: {
        name: 'AI客服回复',
        description: 'AI自动回复',
        config: {
          modelId: 'doubao-pro-4k',
          temperature: 0.7,
          maxTokens: 1000,
          useContextHistory: true,
          enablePersonaOverride: true,
          defaultPersonaTone: 'friendly',
        },
      },
    },
    {
      id: 'node_7',
      type: 'decision',
      position: { x: 1100, y: 150 },
      data: {
        name: '满意度检测',
        description: '检测是否需要满意度调查',
        config: {
          decisionMode: 'priority',
          conditions: [
            {
              label: '需要调查',
              expression: 'context.sessionLength > 5 && context.intent !== "chat"',
              targetNodeId: 'node_8',
            },
            {
              label: '不需要',
              expression: 'true',
              targetNodeId: 'node_10',
            },
          ],
          defaultTarget: 'node_10',
        },
      },
    },
    {
      id: 'node_8',
      type: 'send_command',
      position: { x: 1350, y: 100 },
      data: {
        name: '发送满意度调查',
        description: '发送满意度调查问卷',
        config: {
          commandType: 'message',
          robotId: 'bot_001',
          messageContent: '请为本次服务打分（1-5星）：⭐⭐⭐⭐⭐',
        },
      },
    },
    {
      id: 'node_9',
      type: 'command_status',
      position: { x: 1600, y: 100 },
      data: {
        name: '记录满意度',
        description: '记录客户满意度',
        config: {
          saveToRobotCommands: true,
          updateSessionMessages: true,
          roleLogStrategy: 'per_role',
        },
      },
    },
    {
      id: 'node_10',
      type: 'end',
      position: { x: 1350, y: 200 },
      data: {
        name: '服务结束',
        description: '客服流程结束',
        config: {
          saveSession: true,
          saveStatistics: true,
          triggerNextAction: false,
        },
      },
    },
  ],
  edges: [
    { id: 'edge_1_2', source: 'node_1', target: 'node_2' },
    { id: 'edge_2_3', source: 'node_2', target: 'node_3' },
    { id: 'edge_3_4', source: 'node_3', target: 'node_4', label: 'VIP客户' },
    { id: 'edge_3_5', source: 'node_3', target: 'node_5', label: '投诉类' },
    { id: 'edge_3_6', source: 'node_3', target: 'node_6', label: '普通咨询' },
    { id: 'edge_4_7', source: 'node_4', target: 'node_7' },
    { id: 'edge_5_7', source: 'node_5', target: 'node_7' },
    { id: 'edge_6_7', source: 'node_6', target: 'node_7' },
    { id: 'edge_7_8', source: 'node_7', target: 'node_8', label: '需要调查' },
    { id: 'edge_7_10', source: 'node_7', target: 'node_10', label: '不需要' },
    { id: 'edge_8_9', source: 'node_8', target: 'node_9' },
    { id: 'edge_9_10', source: 'node_9', target: 'node_10' },
  ],
  timeout: 45000,
  retryConfig: { maxRetries: 3, retryInterval: 1000 },
};
