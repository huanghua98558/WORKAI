/**
 * 节点类型定义
 */

// 节点类型定义

// 基础节点类型
export const NODE_TYPES = {
  // 文档节点1
  MESSAGE_RECEIVE: 'message_receive',

  // 文档节点2
  INTENT: 'intent',

  // 文档节点3
  DECISION: 'decision',

  // 文档节点4
  AI_REPLY: 'ai_reply',

  // 文档节点5
  MESSAGE_DISPATCH: 'message_dispatch',

  // 文档节点6
  SEND_COMMAND: 'send_command',

  // 文档节点7
  COMMAND_STATUS: 'command_status',

  // 文档节点8
  END: 'end',

  // 文档节点B1
  ALERT_SAVE: 'alert_save',

  // 文档节点B2
  ALERT_RULE: 'alert_rule',

  // 风险处理节点
  RISK_HANDLER: 'risk_handler',

  // 监控节点
  MONITOR: 'monitor',
} as const;

// 节点元数据
export const NODE_METADATA = {
  [NODE_TYPES.MESSAGE_RECEIVE]: {
    name: '消息接收',
    description: '接收WorkTool消息并保存到数据库',
    icon: '📥',
    color: 'bg-green-500',
    category: 'basic',
    hasInputs: false,
    hasOutputs: true,
  },
  [NODE_TYPES.INTENT]: {
    name: '意图识别',
    description: 'AI识别用户消息意图',
    icon: '🧠',
    color: 'bg-purple-500',
    category: 'ai',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.DECISION]: {
    name: '决策节点',
    description: '根据条件判断后续流程',
    icon: '🔀',
    color: 'bg-orange-500',
    category: 'logic',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.AI_REPLY]: {
    name: 'AI客服回复',
    description: '生成智能客服回复内容',
    icon: '⚡',
    color: 'bg-yellow-500',
    category: 'ai',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.MESSAGE_DISPATCH]: {
    name: '消息分发',
    description: '判断群发/私发，确定发送目标',
    icon: '🔀',
    color: 'bg-blue-500',
    category: 'logic',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.SEND_COMMAND]: {
    name: '发送指令',
    description: '调用WorkTool API发送消息',
    icon: '💬',
    color: 'bg-cyan-500',
    category: 'action',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.COMMAND_STATUS]: {
    name: '指令状态记录',
    description: '保存指令状态到数据库',
    icon: '📝',
    color: 'bg-indigo-500',
    category: 'database',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.END]: {
    name: '结束节点',
    description: '流程结束',
    icon: '⏹️',
    color: 'bg-gray-500',
    category: 'basic',
    hasInputs: true,
    hasOutputs: false,
  },
  [NODE_TYPES.ALERT_SAVE]: {
    name: '告警入库',
    description: '保存告警信息到数据库',
    icon: '🔔',
    color: 'bg-red-500',
    category: 'alert',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.ALERT_RULE]: {
    name: '告警规则判断',
    description: '判断告警规则并升级',
    icon: '⚖️',
    color: 'bg-amber-500',
    category: 'alert',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.RISK_HANDLER]: {
    name: '风险处理',
    description: 'AI安抚用户并通知人工',
    icon: '⚠️',
    color: 'bg-red-500',
    category: 'risk',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.MONITOR]: {
    name: '监控节点',
    description: '实时监听群内消息',
    icon: '👁️',
    color: 'bg-cyan-500',
    category: 'risk',
    hasInputs: true,
    hasOutputs: true,
  },
} as const;

// 节点分类
export const NODE_CATEGORIES = {
  basic: '基础节点',
  ai: 'AI节点',
  logic: '逻辑节点',
  action: '操作节点',
  database: '数据库节点',
  alert: '告警节点',
  risk: '风险节点',
} as const;

// 节点数据类型
export interface NodeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    name: string;
    description?: string;
    config?: Record<string, any>;
  };
}

// 边数据类型
export interface EdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

// 流程定义类型
export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  triggerType: 'webhook' | 'manual' | 'scheduled';
  nodes: NodeData[];
  edges: EdgeData[];
  version?: string;
  isActive?: boolean;
}
