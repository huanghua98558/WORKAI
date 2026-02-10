/**
 * 流程引擎类型定义 - v6.1 优化版 (16种核心节点类型)
 */

// ============================================
// 流程状态枚举
// ============================================
export const FlowStatus = {
  PENDING: 'pending',      // 待执行
  RUNNING: 'running',      // 运行中
  COMPLETED: 'completed',  // 已完成
  FAILED: 'failed',        // 失败
  CANCELLED: 'cancelled',  // 已取消
  TIMEOUT: 'timeout'       // 超时
} as const;

// ============================================
// 触发类型枚举
// ============================================
export const TriggerType = {
  WEBHOOK: 'webhook',      // Webhook 触发
  MANUAL: 'manual',        // 手动触发
  SCHEDULED: 'scheduled'   // 定时触发
} as const;

// ============================================
// 核心节点类型（16种）
// ============================================
export const NODE_TYPES = {
  // ========== 基础节点（6种）==========
  START: 'start',                    // 开始节点 - 流程起点
  END: 'end',                        // 结束节点 - 流程终点
  DECISION: 'decision',              // 决策节点 - 条件路由
  CONDITION: 'condition',            // 条件节点 - 条件判断
  FLOW_CALL: 'flow_call',            // 流程调用节点 - 调用其他流程
  DELAY: 'delay',                    // 延迟节点 - 延迟执行

  // ========== 多任务节点（8种）==========
  MULTI_TASK_AI: 'multi_task_ai',          // AI处理多任务 - 对话/分析/识别/生成
  MULTI_TASK_DATA: 'multi_task_data',      // 数据处理多任务 - 查询/转换/聚合
  MULTI_TASK_HTTP: 'multi_task_http',      // HTTP请求多任务 - 请求/上传/下载
  MULTI_TASK_TASK: 'multi_task_task',      // 任务管理多任务 - 创建/分配/更新
  MULTI_TASK_ALERT: 'multi_task_alert',    // 告警管理多任务 - 规则评估/保存/通知/升级
  MULTI_TASK_STAFF: 'multi_task_staff',    // 人员管理多任务 - 匹配/转移/通知/介入
  MULTI_TASK_ANALYSIS: 'multi_task_analysis', // 协同分析多任务 - 活跃度/满意度/报告
  MULTI_TASK_ROBOT: 'multi_task_robot',    // 机器人交互多任务 - 调度/指令/状态
  MULTI_TASK_MESSAGE: 'multi_task_message', // 消息管理多任务 - 接收/分发/同步

  // ========== 专用节点（5种）==========
  SESSION: 'session',                  // 会话管理节点 - 创建/获取/更新会话
  CONTEXT: 'context',                  // 上下文节点 - 检索和增强上下文
  NOTIFICATION: 'notification',        // 通知节点 - 发送通知
  LOG: 'log',                          // 日志节点 - 记录日志
  CUSTOM: 'custom',                    // 自定义节点 - 执行自定义代码

  // ========== 流程控制节点（3种）==========
  LOOP: 'loop',                        // 循环节点 - 循环执行
  PARALLEL: 'parallel',                // 并行节点 - 并行执行
  TRY_CATCH: 'try_catch',               // 异常处理节点 - 异常捕获
} as const;

// ========== 保留兼容性：旧节点类型映射 ==========
export const NODE_TYPES_LEGACY = {
  // AI相关（已合并到 MULTI_TASK_AI）
  AI_CHAT: 'ai_chat',
  INTENT: 'intent',
  EMOTION_ANALYZE: 'emotion_analyze',
  AI_REPLY: 'ai_reply',
  AI_REPLY_ENHANCED: 'ai_reply_enhanced',
  RISK_DETECT: 'risk_detect',
  SMART_ANALYZE: 'smart_analyze',
  UNIFIED_ANALYZE: 'unified_analyze',

  // 消息相关（已合并到 MULTI_TASK_MESSAGE）
  MESSAGE_RECEIVE: 'message_receive',
  MESSAGE_DISPATCH: 'message_dispatch',
  MESSAGE_SYNC: 'message_sync',
  STAFF_MESSAGE: 'staff_message',

  // 告警相关（已合并到 MULTI_TASK_ALERT）
  ALERT_SAVE: 'alert_save',
  ALERT_RULE: 'alert_rule',
  ALERT_NOTIFY: 'alert_notify',
  ALERT_ESCALATE: 'alert_escalate',

  // 机器人相关（已合并到 MULTI_TASK_ROBOT）
  ROBOT_DISPATCH: 'robot_dispatch',
  SEND_COMMAND: 'send_command',
  COMMAND_STATUS: 'command_status',

  // 人员相关（已合并到 MULTI_TASK_STAFF）
  STAFF_INTERVENTION: 'staff_intervention',
  HUMAN_HANDOVER: 'human_handover',

  // 数据相关（已合并到 MULTI_TASK_DATA）
  DATA_QUERY: 'data_query',
  DATA_TRANSFORM: 'data_transform',
  VARIABLE_SET: 'variable_set',
  SATISFACTION_INFER: 'satisfaction_infer',

  // HTTP相关（已合并到 MULTI_TASK_HTTP）
  HTTP_REQUEST: 'http_request',
  IMAGE_PROCESS: 'image_process',

  // 任务相关（已合并到 MULTI_TASK_TASK）
  TASK_ASSIGN: 'task_assign',

  // 分析相关（已合并到 MULTI_TASK_ANALYSIS）
  COLLABORATION_ANALYZE: 'collaboration_analyze',

  // 会话相关（已合并到 SESSION）
  SESSION_CREATE: 'session_create',

  // 上下文相关（已合并到 CONTEXT）
  CONTEXT_ENHANCER: 'context_enhancer',

  // 日志相关（已合并到 LOG）
  LOG_SAVE: 'log_save',

  // 其他
  SERVICE: 'service',
  RISK_HANDLER: 'risk_handler',
  MONITOR: 'monitor',
  EXECUTE_NOTIFICATION: 'execute_notification',
} as const;

// 节点元数据（v6.1 优化版 - 16种核心节点类型 + 兼容性旧节点类型）
export const NODE_METADATA = {
  // ========== 基础节点（6种）==========
  [NODE_TYPES.START]: {
    name: '开始节点',
    description: '流程的起点（v6.1）',
    icon: '▶️',
    color: 'bg-green-500',
    category: 'basic',
    hasInputs: false,
    hasOutputs: true,
  },
  [NODE_TYPES.END]: {
    name: '结束节点',
    description: '流程的终点（v6.1）',
    icon: '⏹️',
    color: 'bg-gray-500',
    category: 'basic',
    hasInputs: true,
    hasOutputs: false,
  },
  [NODE_TYPES.DECISION]: {
    name: '决策节点',
    description: '根据条件路由到不同节点（v6.1）',
    icon: '🔀',
    color: 'bg-orange-500',
    category: 'logic',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.CONDITION]: {
    name: '条件节点',
    description: '条件判断（v6.1）',
    icon: '❓',
    color: 'bg-yellow-500',
    category: 'logic',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.FLOW_CALL]: {
    name: '流程调用节点',
    description: '调用其他流程（v6.1）',
    icon: '📞',
    color: 'bg-purple-600',
    category: 'logic',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.DELAY]: {
    name: '延迟节点',
    description: '延迟执行（v6.1）',
    icon: '⏱️',
    color: 'bg-gray-400',
    category: 'logic',
    hasInputs: true,
    hasOutputs: true,
  },

  // ========== 多任务节点（8种）==========
  [NODE_TYPES.MULTI_TASK_AI]: {
    name: 'AI处理多任务',
    description: '对话/分析/识别/生成（v6.1 - 合并了ai_chat, intent, emotion_analyze等）',
    icon: '🧠',
    color: 'bg-purple-500',
    category: 'ai',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.MULTI_TASK_DATA]: {
    name: '数据处理多任务',
    description: '查询/转换/聚合（v6.1 - 合并了data_query, data_transform等）',
    icon: '🗄️',
    color: 'bg-blue-500',
    category: 'database',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.MULTI_TASK_HTTP]: {
    name: 'HTTP请求多任务',
    description: '请求/上传/下载（v6.1 - 合并了http_request, image_process等）',
    icon: '🌐',
    color: 'bg-cyan-500',
    category: 'action',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.MULTI_TASK_TASK]: {
    name: '任务管理多任务',
    description: '创建/分配/更新（v6.1 - 合并了task_assign等）',
    icon: '📋',
    color: 'bg-indigo-500',
    category: 'database',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.MULTI_TASK_ALERT]: {
    name: '告警管理多任务',
    description: '规则评估/保存/通知/升级（v6.1 - 合并了alert_rule, alert_save等）',
    icon: '🔔',
    color: 'bg-red-500',
    category: 'alert',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.MULTI_TASK_STAFF]: {
    name: '人员管理多任务',
    description: '匹配/转移/通知/介入（v6.1 - 合并了human_handover, staff_intervention等）',
    icon: '👥',
    color: 'bg-pink-500',
    category: 'action',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.MULTI_TASK_ANALYSIS]: {
    name: '协同分析多任务',
    description: '活跃度/满意度/报告（v6.1 - 合并了collaboration_analyze, satisfaction_infer等）',
    icon: '📊',
    color: 'bg-teal-500',
    category: 'analysis',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.MULTI_TASK_ROBOT]: {
    name: '机器人交互多任务',
    description: '调度/指令/状态（v6.1 - 合并了robot_dispatch, send_command等）',
    icon: '🤖',
    color: 'bg-blue-600',
    category: 'action',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.MULTI_TASK_MESSAGE]: {
    name: '消息管理多任务',
    description: '接收/分发/同步（v6.1 - 合并了message_receive, message_dispatch等）',
    icon: '📨',
    color: 'bg-green-500',
    category: 'basic',
    hasInputs: true,
    hasOutputs: true,
  },

  // ========== 专用节点（5种）==========
  [NODE_TYPES.SESSION]: {
    name: '会话管理节点',
    description: '创建/获取/更新会话（v6.1 - 替代session_create）',
    icon: '💬',
    color: 'bg-emerald-500',
    category: 'database',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.CONTEXT]: {
    name: '上下文节点',
    description: '检索和增强上下文（v6.1 - 替代context_enhancer）',
    icon: '🔮',
    color: 'bg-indigo-600',
    category: 'ai',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.NOTIFICATION]: {
    name: '通知节点',
    description: '发送通知（v6.1）',
    icon: '📢',
    color: 'bg-pink-500',
    category: 'action',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.LOG]: {
    name: '日志节点',
    description: '记录日志（v6.1 - 替代log_save）',
    icon: '📝',
    color: 'bg-slate-500',
    category: 'database',
    hasInputs: true,
    hasOutputs: false,
  },
  [NODE_TYPES.CUSTOM]: {
    name: '自定义节点',
    description: '执行自定义代码（v6.1）',
    icon: '⚙️',
    color: 'bg-gray-600',
    category: 'custom',
    hasInputs: true,
    hasOutputs: true,
  },

  // ========== 流程控制节点（3种）==========
  [NODE_TYPES.LOOP]: {
    name: '循环节点',
    description: '循环执行（v6.1）',
    icon: '🔁',
    color: 'bg-violet-500',
    category: 'logic',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.PARALLEL]: {
    name: '并行节点',
    description: '并行执行（v6.1）',
    icon: '⚡',
    color: 'bg-yellow-500',
    category: 'logic',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES.TRY_CATCH]: {
    name: '异常处理节点',
    description: '异常捕获（v6.1）',
    icon: '🛡️',
    color: 'bg-amber-600',
    category: 'logic',
    hasInputs: true,
    hasOutputs: true,
  },

  // ========== 已废弃的节点类型（保留兼容性）==========
  [NODE_TYPES_LEGACY.MESSAGE_RECEIVE]: {
    name: '消息接收 [已废弃]',
    description: '请使用 multi_task_message（v6.1）',
    icon: '📥',
    color: 'bg-gray-400',
    category: 'deprecated',
    hasInputs: false,
    hasOutputs: true,
  },
  [NODE_TYPES_LEGACY.INTENT]: {
    name: '意图识别 [已废弃]',
    description: '请使用 multi_task_ai（v6.1）',
    icon: '🧠',
    color: 'bg-gray-400',
    category: 'deprecated',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES_LEGACY.AI_REPLY]: {
    name: 'AI客服回复 [已废弃]',
    description: '请使用 multi_task_ai（v6.1）',
    icon: '⚡',
    color: 'bg-gray-400',
    category: 'deprecated',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES_LEGACY.MESSAGE_DISPATCH]: {
    name: '消息分发 [已废弃]',
    description: '请使用 multi_task_message（v6.1）',
    icon: '🔀',
    color: 'bg-gray-400',
    category: 'deprecated',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES_LEGACY.SEND_COMMAND]: {
    name: '发送指令 [已废弃]',
    description: '请使用 multi_task_robot（v6.1）',
    icon: '💬',
    color: 'bg-gray-400',
    category: 'deprecated',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES_LEGACY.ALERT_SAVE]: {
    name: '告警入库 [已废弃]',
    description: '请使用 multi_task_alert（v6.1）',
    icon: '🔔',
    color: 'bg-gray-400',
    category: 'deprecated',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES_LEGACY.ALERT_RULE]: {
    name: '告警规则判断 [已废弃]',
    description: '请使用 multi_task_alert（v6.1）',
    icon: '⚖️',
    color: 'bg-gray-400',
    category: 'deprecated',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES_LEGACY.RISK_HANDLER]: {
    name: '风险处理 [已废弃]',
    description: '请使用 multi_task_alert（v6.1）',
    icon: '⚠️',
    color: 'bg-gray-400',
    category: 'deprecated',
    hasInputs: true,
    hasOutputs: true,
  },
  [NODE_TYPES_LEGACY.ROBOT_DISPATCH]: {
    name: '机器人分发 [已废弃]',
    description: '请使用 multi_task_robot（v6.1）',
    icon: '🤖',
    color: 'bg-gray-400',
    category: 'deprecated',
    hasInputs: true,
    hasOutputs: true,
  },
} as const;

// 节点分类（v6.1 更新版）
export const NODE_CATEGORIES = {
  basic: '基础节点',
  ai: 'AI节点',
  logic: '逻辑节点',
  action: '操作节点',
  database: '数据库节点',
  alert: '告警节点',
  risk: '风险节点',
  analysis: '分析节点',
  custom: '自定义节点',
  deprecated: '已废弃节点',
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

  // ========== 阶段一新增：业务角色感知 ==========
  businessRoleMode: 'global' | 'per_role';  // 业务角色模式：global=全局配置, per_role=按角色配置
  roleBasedIntents?: {                        // 基于角色的意图配置
    [roleCode: string]: {
      supportedIntents: string[];            // 该角色支持的意图
      confidenceThreshold: number;           // 该角色的置信度阈值
      systemPrompt?: string                  // 该角色的自定义提示词
    }
  };
  fallbackIntentBehavior: 'global_fallback' | 'role_fallback' | 'none'; // 未识别时的行为
  enableRoleOverride: boolean;               // 是否允许角色配置覆盖全局配置
}

// DECISION 节点配置
export interface DecisionConfig {
  conditionType: 'expression' | 'rule'; // 条件类型
  condition: string;          // 条件表达式
  rules?: DecisionRule[];     // 规则列表
  trueLabel?: string;         // True分支标签
  falseLabel?: string;        // False分支标签

  // ========== 阶段一新增：AI 行为感知 ==========
  enableAIBehaviorTrigger: boolean;       // 是否启用 AI 行为触发
  aiBehaviorTrigger: {                    // AI 行为触发条件
    full_auto: DecisionRule[];            // 全自动模式的决策规则
    semi_auto: DecisionRule[];            // 半自动模式的决策规则
    record_only: DecisionRule[];          // 仅记录模式的决策规则
  };
  defaultAIBehaviorMode: 'full_auto' | 'semi_auto' | 'record_only'; // 默认 AI 行为模式
  enablePriorityBasedDecision: boolean;   // 是否启用基于优先级的决策
  priorityRules: {                         // 优先级规则
    high: { branch: string; aiBehaviorMode: string };
    medium: { branch: string; aiBehaviorMode: string };
    low: { branch: string; aiBehaviorMode: string };
  };
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

  // 新增：工作人员联动配置
  adaptiveReply?: boolean;     // 是否启用自适应回复（工作人员联动）
  staffPresenceDetection?: boolean; // 是否检测工作人员存在
  replyModeWhenStaffOnline?: 'normal' | 'low_priority' | 'delay' | 'skip'; // 工作人员在线时的回复模式
  staffDetectionWindow?: number; // 工作人员检测窗口（分钟）

  // ========== 阶段一新增：人设配置 ==========
  businessRolePersonas: {                     // 基于角色的人设配置
    [roleCode: string]: {
      persona: string;                        // 角色人设描述
      tone: 'formal' | 'casual' | 'friendly' | 'professional'; // 语调
      responseLength: 'short' | 'medium' | 'long'; // 回复长度
      enableContext: boolean;                 // 是否启用上下文
      contextWindow: number;                  // 上下文窗口大小
      customSystemPrompt?: string             // 自定义系统提示词
    }
  };
  aiBehaviorResponse: {                       // AI 行为响应策略
    full_auto: {                              // 全自动模式
      enableAutoReply: boolean;
      requireApproval: boolean;
      autoConfidenceThreshold: number;
    };
    semi_auto: {                              // 半自动模式
      enableAutoReply: boolean;
      requireApproval: boolean;
      autoConfidenceThreshold: number;
    };
    record_only: {                            // 仅记录模式
      enableAutoReply: boolean;
      requireApproval: boolean;
    }
  };
  enablePersonaOverride: boolean;             // 是否允许人设配置覆盖全局配置
  defaultPersonaTone: 'formal' | 'casual' | 'friendly' | 'professional'; // 默认语调
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
  riskMode?: 'auto_notify' | 'human' | 'auto' | 'ignore'; // 处理模式
  aiSoothing: boolean;         // 是否启用AI安抚
  soothingModelId?: string;    // 安抚AI模型ID
  notifyHumans: boolean;       // 是否通知人工
  notifyTargets: string[];     // 通知目标
  escalationStrategy: 'immediate' | 'timeout' | 'manual'; // 升级策略
  escalateAfterMinutes?: number; // 升级时间（分钟）
  enableStaffDetection?: boolean; // 是否启用工作人员检测（协同分析匹配）
  monitoringDuration?: number; // 监听时长（秒）
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
  duration?: number;           // 监听时长（秒）
  detectStaff?: boolean;       // 是否检测工作人员（协同分析匹配）
  detectUserSatisfaction?: boolean; // 是否检测用户满意度（协同分析匹配）
  detectEscalation?: boolean;  // 是否检测升级信号（协同分析匹配）
}

// ROBOT_DISPATCH 节点配置（第13种节点）
export interface RobotDispatchConfig {
  robotId: string;                    // 机器人ID
  dispatchMode: 'single' | 'round_robin' | 'load_balancing' | 'random'; // 分发模式
  priority: 'low' | 'normal' | 'high'; // 优先级
  maxConcurrentTasks?: number;        // 最大并发任务数
  timeoutSeconds?: number;            // 超时时间（秒）
  retryOnFailure: boolean;            // 失败时是否重试
  maxRetries?: number;                // 最大重试次数
  retryDelaySeconds?: number;         // 重试延迟（秒）
  fallbackRobotId?: string;           // 失败时的备用机器人ID
  dispatchRules?: DispatchRule[];     // 分发规则
  logDispatch: boolean;               // 是否记录分发日志
  notifyOnFailure: boolean;           // 失败时是否通知
  notifyChannels?: string[];          // 通知渠道
}

export interface DispatchRule {
  id: string;
  name: string;
  condition: string;                  // 规则条件表达式
  robotId: string;                    // 指定机器人ID
  priority: number;                   // 优先级
}

// EXECUTE_NOTIFICATION 节点配置（第14种节点）
export interface ExecuteNotificationConfig {
  // 通知渠道配置
  enableRobotNotification?: boolean;  // 机器人通知
  enableEmailNotification?: boolean;  // 邮件通知
  enableSMSNotification?: boolean;    // 短信通知
  enableWebhookNotification?: boolean; // Webhook通知

  // 机器人通知配置
  robotSendType?: 'private' | 'group' | 'both'; // 发送方式
  robotTarget?: string;              // 目标用户/群组

  // 邮件通知配置
  emailRecipients?: string[];        // 邮件接收者列表
  emailSubject?: string;             // 邮件主题
  emailBody?: string;                // 邮件正文

  // 短信通知配置
  smsRecipients?: string[];          // 短信接收者列表
  smsContent?: string;              // 短信内容

  // Webhook通知配置
  webhookUrl?: string;              // Webhook URL
  webhookMethod?: 'POST' | 'GET';    // HTTP方法
  webhookHeaders?: Record<string, string>; // 请求头
  webhookIncludeHeaders?: boolean;  // 是否包含请求头

  // 通知内容配置
  notificationTitle?: string;       // 标题
  notificationBody?: string;        // 正文内容
  notificationTemplate?: 'default' | 'simple' | 'detailed' | 'custom'; // 消息模板

  // 优先级配置
  notificationPriority?: 'low' | 'normal' | 'high' | 'urgent'; // 优先级
  notificationUrgency?: 'low' | 'medium' | 'high' | 'critical'; // 紧急程度

  // 重试配置
  enableNotificationRetry?: boolean; // 是否启用重试
  maxRetryAttempts?: number;        // 最大重试次数
  retryDelaySeconds?: number;       // 重试延迟（秒）

  // 高级配置
  asyncNotification?: boolean;     // 异步发送通知
  batchSend?: boolean;             // 批量发送
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
  | MonitorConfig
  | RobotDispatchConfig
  | ExecuteNotificationConfig;

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
  : T extends 'robot_dispatch'
  ? RobotDispatchConfig
  : T extends 'execute_notification'
  ? ExecuteNotificationConfig
  : Record<string, any>;
