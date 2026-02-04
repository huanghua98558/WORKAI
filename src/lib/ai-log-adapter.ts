/**
 * AI交互日志数据适配器
 * 用于将后端API返回的AI日志数据转换为前端组件期望的格式
 */

export interface AILogBackend {
  id: number;
  sessionId: string;
  messageId: string;
  robotId: string;
  robotName?: string;
  operationType?: string;
  aiInput: string;
  aiOutput: string;
  modelId?: string;
  temperature?: number;
  requestDuration?: number;
  status: 'success' | 'error' | 'processing';
  errorMessage?: string;
  createdAt: string;
  userId?: string;
  userName?: string;
  groupId?: string;
  groupName?: string;
}

export interface AILog {
  id: string;
  processing_id: string;
  robot_id: string;
  robot_name?: string;
  session_id: string;
  user_id: string;
  user_name?: string;
  group_id?: string;
  group_name?: string;
  intent?: string;
  prompt: string;
  response: string;
  model?: string;
  provider?: string;
  role?: string;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration?: number;
  tokens?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * 将后端AI日志数据转换为前端组件期望的格式
 */
export function adaptBackendAILogToFrontend(backendLog: AILogBackend): AILog {
  // 解析AI输入和输出
  let prompt = backendLog.aiInput || '';
  let response = backendLog.aiOutput || '';
  let intent = '';

  // 尝试从operationType提取意图
  if (backendLog.operationType === 'intent_recognition') {
    intent = 'intent_recognition';
  }

  // 尝试从AI输出中提取意图（如果是意图识别的结果）
  try {
    if (backendLog.aiOutput) {
      const outputJson = JSON.parse(backendLog.aiOutput);
      if (outputJson.intent) {
        intent = outputJson.intent;
      }
    }
  } catch (e) {
    // 如果不是JSON，忽略
  }

  // 状态映射
  let status: 'processing' | 'completed' | 'failed';
  if (backendLog.status === 'success') {
    status = 'completed';
  } else if (backendLog.status === 'error') {
    status = 'failed';
  } else {
    status = backendLog.status as any;
  }

  return {
    id: backendLog.id.toString(),
    processing_id: backendLog.messageId || backendLog.id.toString(),
    robot_id: backendLog.robotId,
    robot_name: backendLog.robotName,
    session_id: backendLog.sessionId,
    user_id: backendLog.userId || '',
    user_name: backendLog.userName,
    group_id: backendLog.groupId,
    group_name: backendLog.groupName,
    intent: intent,
    prompt: prompt,
    response: response,
    model: backendLog.modelId,
    provider: 'doubao',
    role: backendLog.operationType,
    status: status,
    error_message: backendLog.errorMessage,
    started_at: backendLog.createdAt,
    completed_at: backendLog.createdAt,
    duration: backendLog.requestDuration,
    tokens: undefined, // 后端暂未返回token信息
  };
}

/**
 * 批量转换AI日志数据
 */
export function adaptBackendAILogsToFrontend(backendLogs: AILogBackend[]): AILog[] {
  return backendLogs.map(adaptBackendAILogToFrontend);
}
