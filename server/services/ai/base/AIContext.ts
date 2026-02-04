/**
 * AI上下文定义
 * 用于在AI调用过程中传递上下文信息
 */

export interface AIContext {
  /**
   * 机器人ID
   */
  robotId: string;

  /**
   * 会话ID
   */
  sessionId: string;

  /**
   * 用户ID
   */
  userId?: string;

  /**
   * 角色ID
   */
  personaId?: string;

  /**
   * 角色类型
   */
  personaType?: string;

  /**
   * 自定义变量
   */
  variables?: Record<string, any>;

  /**
   * 额外数据
   */
  extra?: Record<string, any>;
}

/**
 * 意图识别结果
 */
export interface IntentRecognitionResult {
  /**
   * 意图类型
   */
  intent: string;

  /**
   * 置信度 (0-1)
   */
  confidence: number;

  /**
   * 意图分类
   */
  category?: string;

  /**
   * 意图描述
   */
  description?: string;

  /**
   * 额外数据
   */
  extra?: Record<string, any>;
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  /**
   * 角色 (user | assistant | system)
   */
  role: 'user' | 'assistant' | 'system';

  /**
   * 消息内容
   */
  content: string;

  /**
   * 时间戳
   */
  timestamp?: string;

  /**
   * 额外数据
   */
  extra?: Record<string, any>;
}

/**
 * 生成选项
 */
export interface GenerateOptions {
  /**
   * 温度 (0-2)
   */
  temperature?: number;

  /**
   * 最大Token数
   */
  maxTokens?: number;

  /**
   * Top P (0-1)
   */
  topP?: number;

  /**
   * 流式输出
   */
  stream?: boolean;

  /**
   * 使用话术模板
   */
  template?: {
    id: string;
    variables: Record<string, any>;
  };

  /**
   * 额外数据
   */
  extra?: Record<string, any>;
}

/**
 * 生成回复结果
 */
export interface GenerateReplyResult {
  /**
   * 回复内容
   */
  reply: string;

  /**
   * 使用的模型
   */
  model: string;

  /**
   * 使用的Token数
   */
  tokens?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /**
   * 耗时（毫秒）
   */
  latency: number;

  /**
   * 是否成功
   */
  success: boolean;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 额外数据
   */
  extra?: Record<string, any>;
}

/**
 * 报告生成选项
 */
export interface ReportOptions {
  /**
   * 报告类型
   */
  reportType: string;

  /**
   * 报告模板
   */
  template?: string;

  /**
   * 报告格式
   */
  format?: 'markdown' | 'html' | 'json';

  /**
   * 额外数据
   */
  extra?: Record<string, any>;
}

/**
 * 报告生成结果
 */
export interface GenerateReportResult {
  /**
   * 报告内容
   */
  content: string;

  /**
   * 报告格式
   */
  format: string;

  /**
   * 使用的模型
   */
  model: string;

  /**
   * 耗时（毫秒）
   */
  latency: number;

  /**
   * 是否成功
   */
  success: boolean;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 额外数据
   */
  extra?: Record<string, any>;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  /**
   * 是否健康
   */
  healthy: boolean;

  /**
   * 响应时间（毫秒）
   */
  responseTime: number;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 额外信息
   */
  info?: Record<string, any>;
}
