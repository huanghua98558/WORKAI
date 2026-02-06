/**
 * AI日志适配器
 * 将后端ai_io_logs表的数据转换为前端所需的格式
 */

// 后端数据格式（来自ai_io_logs表）
export interface BackendAILog {
  id: number;
  sessionId: string;
  messageId?: string;
  robotId?: string;
  robotName?: string;
  operationType: string;
  aiInput?: string;
  aiOutput?: string;
  modelId?: string;
  temperature?: number;
  requestDuration?: number;
  status: string;
  errorMessage?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  createdAt: string;
}

// 前端数据格式
export interface AILog {
  id: number;
  session_id: string;
  message_id?: string;
  robot_id?: string;
  robot_name?: string;
  prompt: string;
  response?: string;
  model?: string;
  temperature?: number;
  duration?: number;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  tokens?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  intent?: string;
  user_name?: string;
  group_name?: string;
}

/**
 * 适配后端AI日志数据为前端格式
 */
export function adaptBackendAILogsToFrontend(backendLogs: BackendAILog[]): AILog[] {
  return backendLogs.map((log) => {
    // 提取意图信息（从operationType中提取）
    let intent = '';
    if (log.operationType && log.operationType !== 'chat') {
      intent = log.operationType;
    }

    return {
      id: log.id,
      session_id: log.sessionId,
      message_id: log.messageId,
      robot_id: log.robotId,
      robot_name: log.robotName,
      prompt: log.aiInput || '',
      response: log.aiOutput,
      model: log.modelId,
      temperature: log.temperature,
      duration: log.requestDuration,
      status: log.status === 'processing' ? 'processing' : 
             log.status === 'completed' ? 'completed' : 
             log.status === 'failed' ? 'failed' : 'processing',
      error_message: log.errorMessage,
      created_at: log.createdAt,
      intent: intent || undefined,
      tokens: {
        input_tokens: log.inputTokens || 0,
        output_tokens: log.outputTokens || 0,
        total_tokens: log.totalTokens || 0
      }
    };
  });
}

/**
 * 格式化时间
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms?: number): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * 格式化Token数
 */
export function formatTokens(tokens?: number): string {
  if (!tokens) return '-';
  if (tokens < 1000) return tokens.toString();
  return `${(tokens / 1000).toFixed(1)}k`;
}
