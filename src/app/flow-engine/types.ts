/**
 * 流程引擎类型定义 - 12种节点类型
 */

// 基础节点类型（12种）
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

// 节点元数据（12种）
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

// ========== 节点配置类型定义 ==========

// MESSAGE_RECEIVE 节点配置
export interface MessageReceiveConfig {
  saveToDatabase: boolean;      // 是否保存到数据库
  validateContent: boolean;     // 是否验证内容
  allowedSources?: string[];    // 允许的消息来源
  maxMessageLength?: number;    // 最大消息长度
}

// INTENT 节点配置
export interface IntentConfig {
  modelId: string;              // AI模型ID
  supportedIntents: string[];   // 支持的意图列表
  confidenceThreshold?: number; // 置信度阈值（0-1）
  fallbackIntent?: string;      // 默认意图
  saveToContext: boolean;       // 是否保存到上下文
}

// DECISION 节点配置
export interface DecisionConfig {
  conditionType: 'expression' | 'rule'; // 条件类型
  condition: string;          // 条件表达式
  rules?: DecisionRule[];     // 规则列表
  trueLabel?: string;         // True分支标签
  falseLabel?: string;        // False分支标签
}

export interface DecisionRule {
  id: string;
  name: string;
  condition: string;
  label: string;
}

// AI_REPLY 节点配置
export interface AIReplyConfig {
  modelId: string;              // AI模型ID
  temperature?: number;         // 温度参数（0-1）
  maxTokens?: number;          // 最大token数
  systemPrompt?: string;       // 系统提示词
  useContextHistory: boolean;   // 是否使用上下文历史
  contextWindowSize?: number;   // 上下文窗口大小
  personaId?: string;          // 人设ID
  enableThinking: boolean;      // 是否启用思考模式
}

// MESSAGE_DISPATCH 节点配置
export interface MessageDispatchConfig {
  dispatchMode: 'single' | 'broadcast' | 'conditional'; // 分发模式
  targetType: 'user' | 'group' | 'robot'; // 目标类型
  rules?: DispatchRule[];      // 分发规则
  defaultTargets?: string[];   // 默认目标
}

export interface DispatchRule {
  id: string;
  name: string;
  condition: string;
  targets: string[];
}

// SEND_COMMAND 节点配置
export interface SendCommandConfig {
  commandType: 'message' | 'notification' | 'command'; // 指令类型
  messageContent: string;      // 消息内容
  recipients: string[];        // 接收者列表
  robotId: string;             // 机器人ID
  saveLog: boolean;            // 是否保存日志
  priority?: 'low' | 'normal' | 'high'; // 优先级
  retryCount?: number;         // 重试次数
}

// COMMAND_STATUS 节点配置
export interface CommandStatusConfig {
  statusType: 'success' | 'failure' | 'pending'; // 状态类型
  saveToDatabase: boolean;     // 是否保存到数据库
  customStatus?: string;       // 自定义状态
  errorMessage?: string;       // 错误消息
  metadata?: Record<string, any>; // 元数据
}

// END 节点配置
export interface EndConfig {
  endType: 'success' | 'failure' | 'manual'; // 结束类型
  returnMessage?: string;      // 返回消息
  saveSession: boolean;        // 是否保存会话
  cleanupContext: boolean;     // 是否清理上下文
}

// ALERT_SAVE 节点配置
export interface AlertSaveConfig {
  alertType: string;           // 告警类型
  alertLevel: 'low' | 'medium' | 'high' | 'critical'; // 告警级别
  alertTitle: string;          // 告警标题
  alertContent: string;        // 告警内容
  source: string;              // 告警来源
  tags?: string[];             // 标签
  assignee?: string;           // 负责人
  dueDate?: string;            // 截止日期
}

// ALERT_RULE 节点配置
export interface AlertRuleConfig {
  ruleType: 'threshold' | 'pattern' | 'frequency'; // 规则类型
  threshold?: number;          // 阈值
  pattern?: string;            // 匹配模式
  frequency?: number;          // 频率（次/分钟）
  escalationLevel: number;     // 升级级别
  escalateTo: string[];        // 升级目标
  notifyChannels: string[];    // 通知渠道
}

// RISK_HANDLER 节点配置
export interface RiskHandlerConfig {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'; // 风险级别
  aiSoothing: boolean;         // 是否启用AI安抚
  soothingModelId?: string;    // 安抚AI模型ID
  notifyHumans: boolean;       // 是否通知人工
  notifyTargets: string[];     // 通知目标
  escalationStrategy: 'immediate' | 'timeout' | 'manual'; // 升级策略
  escalateAfterMinutes?: number; // 升级时间（分钟）
}

// MONITOR 节点配置
export interface MonitorConfig {
  monitorType: 'message' | 'user' | 'keyword' | 'risk'; // 监控类型
  targets: string[];           // 监控目标
  keywords?: string[];         // 关键词列表
  riskThreshold?: number;      // 风险阈值
  alertOnMatch: boolean;       // 匹配时是否告警
  realtime: boolean;           // 是否实时监控
  intervalSeconds?: number;    // 间隔（秒）
}

// 节点配置联合类型
export type NodeConfig =
  | MessageReceiveConfig
  | IntentConfig
  | DecisionConfig
  | AIReplyConfig
  | MessageDispatchConfig
  | SendCommandConfig
  | CommandStatusConfig
  | EndConfig
  | AlertSaveConfig
  | AlertRuleConfig
  | RiskHandlerConfig
  | MonitorConfig;

// 根据节点类型获取配置类型
export type GetConfigByNodeType<T extends string> = T extends 'message_receive'
  ? MessageReceiveConfig
  : T extends 'intent'
  ? IntentConfig
  : T extends 'decision'
  ? DecisionConfig
  : T extends 'ai_reply'
  ? AIReplyConfig
  : T extends 'message_dispatch'
  ? MessageDispatchConfig
  : T extends 'send_command'
  ? SendCommandConfig
  : T extends 'command_status'
  ? CommandStatusConfig
  : T extends 'end'
  ? EndConfig
  : T extends 'alert_save'
  ? AlertSaveConfig
  : T extends 'alert_rule'
  ? AlertRuleConfig
  : T extends 'risk_handler'
  ? RiskHandlerConfig
  : T extends 'monitor'
  ? MonitorConfig
  : Record<string, any>;
