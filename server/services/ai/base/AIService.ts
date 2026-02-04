/**
 * AI服务接口
 * 定义所有AI服务提供商必须实现的方法
 */

import type {
  AIContext,
  IntentRecognitionResult,
  ChatMessage,
  GenerateOptions,
  GenerateReplyResult,
  ReportOptions,
  GenerateReportResult,
  HealthCheckResult
} from './AIContext';

/**
 * AI服务接口
 */
export default interface AIService {
  /**
   * 意图识别
   * @param message - 用户消息
   * @param context - AI上下文
   * @returns 意图识别结果
   */
  recognizeIntent(
    message: string,
    context: AIContext
  ): Promise<IntentRecognitionResult>;

  /**
   * 生成回复
   * @param messages - 聊天消息历史
   * @param options - 生成选项
   * @returns 生成回复结果
   */
  generateReply(
    messages: ChatMessage[],
    options: GenerateOptions
  ): Promise<GenerateReplyResult>;

  /**
   * 生成报告
   * @param data - 数据
   * @param options - 报告生成选项
   * @returns 报告生成结果
   */
  generateReport(
    data: any,
    options: ReportOptions
  ): Promise<GenerateReportResult>;

  /**
   * 健康检查
   * @returns 健康检查结果
   */
  healthCheck(): Promise<HealthCheckResult>;

  /**
   * 获取模型名称
   * @returns 模型名称
   */
  getModelName(): string;

  /**
   * 获取模型ID
   * @returns 模型ID
   */
  getModelId(): string;

  /**
   * 获取提供商名称
   * @returns 提供商名称
   */
  getProviderName(): string;

  /**
   * 获取支持的能力列表
   * @returns 能力列表
   */
  getCapabilities(): string[];
}
