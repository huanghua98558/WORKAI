/**
 * 统一的消息数据接口
 * 用于在不同模块之间传递消息数据
 */
export interface UnifiedMessage {
  /** 消息唯一标识 */
  id: string;
  /** 处理ID（用于业务消息监控） */
  processingId?: string;
  /** 机器人ID */
  robotId?: string;
  /** 机器人名称 */
  robotName?: string;
  /** 会话ID */
  sessionId: string;
  /** 用户ID */
  userId?: string;
  /** 用户名称 */
  userName?: string;
  /** 人工客服名称 */
  operatorName?: string;
  /** 群组ID */
  groupId?: string;
  /** 群组名称 */
  groupName?: string;
  /** 消息内容 */
  content: string;
  /** 消息来源类型 */
  source: 'user' | 'ai' | 'human';
  /** 是否来自用户 */
  isFromUser: boolean;
  /** 是否来自人工客服 */
  isHuman?: boolean;
  /** 意图 */
  intent?: string;
  /** 消息状态 */
  status: 'processing' | 'completed' | 'failed' | 'success' | 'error';
  /** 错误消息 */
  errorMessage?: string;
  /** AI响应 */
  aiResponse?: string;
  /** 开始时间 */
  startedAt: string;
  /** 完成时间 */
  completedAt?: string;
  /** 处理时长（毫秒） */
  duration?: number;
  /** 节点类型 */
  nodeType?: string;
  /** 额外数据 */
  extraData?: any;
}

/**
 * 业务消息监控的执行数据接口
 */
export interface MessageExecution {
  id?: string;
  processing_id: string;
  robot_id: string;
  robot_name?: string;
  session_id: string;
  user_id: string;
  group_id: string;
  user_name?: string;
  group_name?: string;
  message_content: string;
  intent?: string;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  ai_response?: string;
  started_at: string;
  completed_at?: string;
  duration?: number;
  node_type?: string;
  steps?: any;
  decision?: any;
  created_at?: string;
}

/**
 * 将业务消息监控的执行数据转换为统一的消息格式
 */
export function adaptExecutionToUnifiedMessage(execution: any): UnifiedMessage {
  // 处理两种数据结构：
  // 1. 旧结构：直接包含 message_content 和 ai_response 字段
  // 2. 新结构：包含 steps 对象，用户消息和 AI 响应在 steps 中

  const userContent = execution.message_content ||
                     execution.steps?.user_message?.content ||
                     '';

  const aiResponse = execution.ai_response ||
                    execution.steps?.ai_response?.response ||
                    '';

  const intent = execution.intent ||
                execution.steps?.intent_recognition?.result ||
                '';

  const errorMessage = execution.error_message ||
                     execution.errorMessage ||
                     '';

  const startTime = execution.started_at ||
                   execution.start_time ||
                   execution.createdAt ||
                   execution.created_at ||
                   '';

  const endTime = execution.completed_at ||
                 execution.end_time ||
                 '';

  const duration = execution.duration ||
                  execution.processing_time ||
                  0;

  const nodeType = execution.node_type ||
                  execution.steps?.node_type ||
                  '';

  const robotName = execution.robot_name ||
                   execution.robotName ||
                   '';

  const userName = execution.user_name ||
                  execution.userId ||
                  '';

  const groupName = execution.group_name ||
                   execution.groupId ||
                   '';

  const groupId = execution.group_id ||
                 execution.groupId ||
                 '';

  const userId = execution.user_id ||
                execution.userId ||
                '';

  const sessionId = execution.session_id ||
                   execution.sessionId ||
                   '';

  return {
    id: execution.id || execution.processing_id || execution.processingId || '',
    processingId: execution.processing_id || execution.processingId,
    robotId: execution.robot_id || execution.robotId,
    robotName: robotName,
    sessionId: sessionId,
    userId: userId,
    userName: userName,
    groupId: groupId,
    groupName: groupName,
    content: userContent,
    source: 'user',
    isFromUser: true,
    intent: intent,
    status: execution.status as any,
    errorMessage: errorMessage,
    aiResponse: aiResponse,
    startedAt: startTime,
    completedAt: endTime,
    duration: duration,
    nodeType: nodeType,
    extraData: {
      steps: execution.steps,
      decision: execution.decision
    }
  };
}

/**
 * 批量转换执行数据列表
 */
export function adaptExecutionsToUnifiedMessages(executions: MessageExecution[]): UnifiedMessage[] {
  return executions.map(adaptExecutionToUnifiedMessage);
}

/**
 * MonitoringTab的执行数据接口
 */
export interface Execution {
  processing_id: string;
  robot_id: string;
  robot_name?: string;
  session_id: string;
  user_id: string;
  group_id: string;
  status: string;
  start_time: string;
  end_time: string;
  processing_time: number;
  error_message?: string;
  steps: any;
  decision: any;
  created_at?: string;
}

/**
 * 将MonitoringTab的执行数据转换为统一的消息格式
 */
export function adaptMonitoringExecutionToUnifiedMessage(execution: Execution): UnifiedMessage {
  const userMessage = execution.steps?.user_message?.content || '';
  
  return {
    id: execution.processing_id,
    processingId: execution.processing_id,
    robotId: execution.robot_id,
    robotName: execution.robot_name,
    sessionId: execution.session_id,
    userId: execution.user_id,
    groupId: execution.group_id,
    content: userMessage,
    source: 'user',
    isFromUser: true,
    status: execution.status as any,
    errorMessage: execution.error_message,
    aiResponse: execution.steps?.ai_response?.response || '',
    startedAt: execution.created_at || execution.start_time,
    completedAt: execution.end_time,
    duration: execution.processing_time,
    extraData: {
      steps: execution.steps,
      decision: execution.decision
    }
  };
}

/**
 * 会话消息接口
 */
export interface SessionMessage {
  id?: string;
  sessionId?: string;
  message_id?: string;
  content: string;
  isFromUser: boolean;
  isHuman?: boolean;
  userName?: string;
  robotName?: string;
  robotId?: string;
  operatorName?: string;
  intent?: string;
  timestamp: string;
  extraData?: any;
}

/**
 * 将会话消息转换为统一的消息格式
 */
export function adaptSessionMessageToUnifiedMessage(message: SessionMessage): UnifiedMessage {
  return {
    id: message.id || message.message_id || message.timestamp,
    sessionId: message.sessionId || '',
    userId: message.userName,
    userName: message.userName,
    robotId: message.robotId,
    robotName: message.robotName,
    content: message.content,
    source: message.isFromUser ? 'user' : (message.isHuman ? 'human' : 'ai'),
    isFromUser: message.isFromUser,
    isHuman: message.isHuman,
    operatorName: message.operatorName,
    intent: message.intent,
    status: 'completed',
    startedAt: message.timestamp,
    completedAt: message.timestamp,
    extraData: message.extraData
  };
}
