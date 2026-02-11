/**
 * v8.0 统一消息处理流程节点执行器
 */

import { BaseNodeExecutor } from './node-executors';
import { FlowContext } from '../flow-engine';

// ==================== 优先级判断节点执行器 ====================

export class PriorityCheckExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'PRIORITY_CHECK';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing Priority Check Node', {
      senderType: context.senderInfo?.senderType,
      config,
    });

    const senderType = context.senderInfo?.senderType || 'user';

    // 优先级规则
    // 运营（财神爷） > 工作人员 > 用户（号主）> 机器人
    let priority = 'low';
    let route = 'user_message';

    if (senderType === 'operation') {
      priority = 'highest';
      route = 'operation_message';
    } else if (senderType === 'staff') {
      priority = 'high';
      route = 'staff_message';
    } else if (senderType === 'user') {
      priority = 'medium';
      route = 'user_message';
    } else if (senderType === 'robot') {
      priority = 'lowest';
      route = 'monitor_only';
    }

    // 存储到上下文
    this.setContextValue(context, 'priority', priority);
    this.setContextValue(context, 'route', route);

    // 特殊处理：如果是监控机器人，标记为仅监控
    const robotRole = context.businessRole?.code;
    if (robotRole === 'MONITOR') {
      route = 'monitor_only';
    }

    return {
      success: true,
      senderType,
      priority,
      route,
      robotRole,
      timestamp: new Date().toISOString(),
    };
  }
}

// ==================== 运营消息处理节点执行器 ====================

export class OperationMessageExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'OPERATION_MESSAGE';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing Operation Message Node', {
      content: context.triggerData.content,
      config,
    });

    const content = context.triggerData.content;
    const operationId = context.senderInfo?.operationId;
    const operationName = context.senderInfo?.userId; // 运营昵称

    // 1. 语气识别
    const toneAnalysis = this.analyzeTone(content);

    // 2. 是否强硬/不耐烦
    const isAggressive = toneAnalysis.aggressive || false;

    // 3. 是否需要特殊处理
    const needsSpecialHandling = config.enableSpecialHandling && isAggressive;

    // 4. 保护用户：记录异常行为
    if (needsSpecialHandling && config.enableUserProtection) {
      await this.recordOperationBehavior(context, {
        operationId,
        operationName,
        content,
        tone: toneAnalysis,
        isAggressive,
        timestamp: new Date().toISOString(),
      });
    }

    // 5. 记录运营消息
    const record = {
      messageId: `msg_${Date.now()}`,
      operationId,
      operationName,
      content,
      tone: toneAnalysis,
      isAggressive,
      needsSpecialHandling,
      timestamp: new Date().toISOString(),
    };

    // 存储到上下文
    this.setContextValue(context, 'operationMessage', record);
    this.setContextValue(context, 'isAggressive', isAggressive);
    this.setContextValue(context, 'needsSpecialHandling', needsSpecialHandling);

    // 6. 是否需要人工介入
    const needsIntervention = config.enableIntervention && isAggressive;
    this.setContextValue(context, 'needsIntervention', needsIntervention);

    return {
      success: true,
      record,
      toneAnalysis,
      isAggressive,
      needsSpecialHandling,
      needsIntervention,
      timestamp: new Date().toISOString(),
    };
  }

  private analyzeTone(content: string): any {
    // 简单的语气分析（实际应该使用 AI）
    const aggressiveKeywords = ['马上', '必须', '立刻', '快点', '别废话', '听不懂吗', '蠢'];
    const hasAggressiveKeyword = aggressiveKeywords.some(keyword => content.includes(keyword));

    // 检查感叹号数量
    const exclamationCount = (content.match(/！/g) || []).length;
    const questionMarkCount = (content.match(/？/g) || []).length;

    return {
      aggressive: hasAggressiveKeyword || exclamationCount > 2,
      keywords: aggressiveKeywords.filter(k => content.includes(k)),
      exclamationCount,
      questionMarkCount,
    };
  }

  private async recordOperationBehavior(context: FlowContext, behavior: any): Promise<void> {
    // TODO: 记录到数据库
    console.log('Recording operation behavior:', behavior);
  }
}

// ==================== 工作人员消息处理节点执行器 ====================

export class StaffMessageExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'STAFF_MESSAGE_HANDLER';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing Staff Message Node', {
      staffId: context.senderInfo?.staffId,
      staffType: context.senderInfo?.staffType,
      config,
    });

    const staffId = context.senderInfo?.staffId;
    const staffType = context.senderInfo?.staffType;
    const content = context.triggerData.content;

    // 验证必要参数
    if (!staffId) {
      throw new Error('Staff ID is required for staff message handling');
    }

    // 1. 记录工作人员活跃度
    const activityRecord = {
      staffId,
      staffType,
      content,
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
    };

    // 2. 更新工作人员状态
    await this.updateStaffStatus(staffId, 'online');

    // 3. 记录会话中的工作人员消息
    const record = {
      messageId: `msg_${Date.now()}`,
      staffId,
      staffType,
      content,
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
    };

    // 4. 判断是否需要协助
    const needsAssistance = this.checkNeedsAssistance(context, content, config);

    // 5. 协作决策：是否让机器人介入
    const robotIntervention = needsAssistance && config.enableRobotAssist;

    // 存储到上下文
    this.setContextValue(context, 'staffActivity', activityRecord);
    this.setContextValue(context, 'staffMessage', record);
    this.setContextValue(context, 'needsAssistance', needsAssistance);
    this.setContextValue(context, 'robotIntervention', robotIntervention);

    return {
      success: true,
      record,
      activityRecord,
      needsAssistance,
      robotIntervention,
      timestamp: new Date().toISOString(),
    };
  }

  private async updateStaffStatus(staffId: string, status: string): Promise<void> {
    // TODO: 更新工作人员状态到数据库
    console.log(`Updating staff ${staffId} status to ${status}`);
  }

  private checkNeedsAssistance(context: FlowContext, content: string, config: any): boolean {
    // 简单的协助需求判断
    // 1. 工作人员请求帮助（例如：@机器人）
    if (content.includes('@')) {
      return true;
    }

    // 2. 工作人员忙碌（通过历史消息判断）
    // TODO: 实现实际的忙碌判断逻辑

    return false;
  }
}

// ==================== 用户消息处理节点执行器 ====================

export class UserMessageExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'USER_MESSAGE_HANDLER';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing User Message Node', {
      userId: context.senderInfo?.userId,
      config,
    });

    const userId = context.senderInfo?.userId;
    const content = context.triggerData.content;

    // 1. 上下文分析
    const contextAnalysis = await this.analyzeContext(context);

    // 2. 意图初步判断（节点级别，详细判断在后续意图判断节点）
    const initialIntent = this.extractInitialIntent(content);

    // 3. 情绪分析（节点级别，详细分析在后续情感分析节点）
    const emotion = this.extractEmotion(content);

    // 4. 记录用户消息
    const record = {
      messageId: `msg_${Date.now()}`,
      userId,
      content,
      initialIntent,
      emotion,
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId,
    };

    // 5. 存储到上下文
    this.setContextValue(context, 'userMessage', record);
    this.setContextValue(context, 'contextAnalysis', contextAnalysis);
    this.setContextValue(context, 'initialIntent', initialIntent);
    this.setContextValue(context, 'emotion', emotion);

    // 6. 判断是否需要立即回复
    const needsImmediateReply = this.checkNeedsImmediateReply(content, emotion);

    return {
      success: true,
      record,
      contextAnalysis,
      initialIntent,
      emotion,
      needsImmediateReply,
      timestamp: new Date().toISOString(),
    };
  }

  private async analyzeContext(context: FlowContext): Promise<any> {
    // 获取最近的对话历史
    // TODO: 实现实际的上下文分析
    return {
      recentMessageCount: 0,
      lastUserMessage: null,
      lastStaffMessage: null,
      lastRobotMessage: null,
    };
  }

  private extractInitialIntent(content: string): string {
    // 简单的意图提取（节点级别）
    if (content.includes('实名') || content.includes('认证')) {
      return 'authentication';
    } else if (content.includes('手机') || content.includes('绑定')) {
      return 'bind_phone';
    } else if (content.includes('商品') || content.includes('上架')) {
      return 'product';
    } else if (content.includes('申诉') || content.includes('推荐')) {
      return 'appeal';
    } else if (content.includes('在') && content.length < 5) {
      return 'availability_response';
    }
    return 'unknown';
  }

  private extractEmotion(content: string): string {
    // 简单的情绪提取
    const positiveKeywords = ['谢谢', '好的', '没问题', '收到', '可以'];
    const negativeKeywords = ['不行', '不好', '麻烦', '急', '快点', '为什么', '怎么'];

    const hasPositive = positiveKeywords.some(k => content.includes(k));
    const hasNegative = negativeKeywords.some(k => content.includes(k));

    if (hasPositive) return 'positive';
    if (hasNegative) return 'negative';
    return 'neutral';
  }

  private checkNeedsImmediateReply(content: string, emotion: string): boolean {
    // 负面情绪需要立即回复
    if (emotion === 'negative') return true;

    // 紧急关键词需要立即回复
    const urgentKeywords = ['急', '快点', '马上', '立刻', '非常重要'];
    if (urgentKeywords.some(k => content.includes(k))) return true;

    return false;
  }
}

// ==================== 图片识别节点执行器 ====================

export class ImageRecognitionExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'IMAGE_RECOGNITION';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('[IMAGE_RECOGNITION] Starting execution', {
      imageUrl: context.triggerData.imageUrl,
      senderType: context.senderInfo?.senderType,
    });

    const imageUrl = context.triggerData.imageUrl;

    // 如果没有图片 URL，跳过图片识别
    if (!imageUrl) {
      console.log('[IMAGE_RECOGNITION] No image URL provided, skipping image recognition');
      this.setContextValue(context, 'imageRecognitionResult', {
        skipped: true,
        reason: 'no_image_url',
        timestamp: new Date().toISOString(),
      });
      return {
        success: true,
        skipped: true,
        reason: 'no_image_url',
        message: 'No image URL provided, skipped image recognition',
      };
    }

    try {
      // 1. OCR 文字提取
      console.log('[IMAGE_RECOGNITION] Extracting text from image...');
      const ocrResult = await this.extractText(imageUrl);

      // 2. 图像分类
      console.log('[IMAGE_RECOGNITION] Classifying image...');
      const imageClassification = await this.classifyImage(imageUrl);

      // 3. 情感分析（从图像中）
      console.log('[IMAGE_RECOGNITION] Analyzing image emotion...');
      const imageEmotion = await this.analyzeImageEmotion(imageUrl);

      // 4. 结合上下文判断意图
      console.log('[IMAGE_RECOGNITION] Recognizing intent...');
      const intent = await this.recognizeIntent(ocrResult, imageClassification, context);

      // 存储到上下文
      this.setContextValue(context, 'imageRecognition', {
        ocrResult,
        imageClassification,
        imageEmotion,
        intent,
      });

      // 5. 如果提取到文字，可以作为文本消息处理
      if (ocrResult.text && ocrResult.text.length > 0) {
        this.setContextValue(context, 'extractedText', ocrResult.text);
      }

      console.log('[IMAGE_RECOGNITION] Execution completed successfully', {
        hasText: ocrResult.text && ocrResult.text.length > 0,
        classification: imageClassification,
        intent,
      });

      return {
        success: true,
        ocrResult,
        imageClassification,
        imageEmotion,
        intent,
        hasExtractedText: ocrResult.text && ocrResult.text.length > 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('[IMAGE_RECOGNITION] Execution failed:', {
        error: error.message,
        stack: error.stack,
        imageUrl,
      });

      // 存储错误到上下文
      this.setContextValue(context, 'imageRecognitionError', {
        error: error.message,
        imageUrl,
        timestamp: new Date().toISOString(),
      });

      throw new Error(`Image recognition failed: ${error.message}`);
    }
  }

  private async extractText(imageUrl: string): Promise<any> {
    // TODO: 实现实际的 OCR 识别
    // 使用 coze-coding-dev-sdk 的 Vision Model
    const { LLMClient, Config } = await import('coze-coding-dev-sdk');
    const llmConfig = new Config();
    const client = new LLMClient(llmConfig);

    const messages = [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: '请提取这张图片中的所有文字内容。' },
          {
            type: 'image_url' as const,
            image_url: {
              url: imageUrl,
              detail: 'high' as const,
            },
          },
        ],
      },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-6-vision-250815',
      temperature: 0.3,
    });

    return {
      text: response.content || '',
      confidence: 0.95,
    };
  }

  private async classifyImage(imageUrl: string): Promise<any> {
    // TODO: 实现实际的图像分类
    return {
      type: 'screenshot', // screenshot, photo, document, qr_code, etc.
      description: '屏幕截图',
      confidence: 0.9,
    };
  }

  private async analyzeImageEmotion(imageUrl: string): Promise<any> {
    // TODO: 实现实际的图像情感分析
    return {
      emotion: 'neutral',
      confidence: 0.85,
    };
  }

  private async recognizeIntent(ocrResult: any, classification: any, context: FlowContext): Promise<string> {
    // 结合 OCR 结果和图像类型判断意图
    if (ocrResult.text && ocrResult.text.length > 0) {
      // 如果提取到文字，使用文本意图识别
      const text = ocrResult.text;
      if (text.includes('实名') || text.includes('认证')) {
        return 'authentication';
      } else if (text.includes('绑定') || text.includes('手机')) {
        return 'bind_phone';
      }
    }

    // 根据图像类型判断
    if (classification.type === 'qr_code') {
      return 'qr_code_scan';
    } else if (classification.type === 'screenshot') {
      return 'screenshot_upload';
    }

    return 'unknown';
  }
}

// ==================== 协同分析节点执行器 ====================

export class CollaborationAnalysisExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'COLLABORATION_ANALYSIS_NODE';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing Collaboration Analysis Node', {
      sessionId: context.sessionId,
      config,
    });

    const analysisTypes = config.analysisTypes || [
      'staff_activity',
      'user_satisfaction',
      'collaboration_efficiency',
      'problem_resolution',
    ];

    const results: any = {};

    // 1. 工作人员活跃度分析
    if (analysisTypes.includes('staff_activity') && context.senderInfo?.senderType === 'staff') {
      results.staffActivity = await this.analyzeStaffActivity(context);
    }

    // 2. 用户满意度分析
    if (analysisTypes.includes('user_satisfaction')) {
      results.userSatisfaction = await this.analyzeUserSatisfaction(context);
    }

    // 3. 协同效率分析
    if (analysisTypes.includes('collaboration_efficiency')) {
      results.collaborationEfficiency = await this.analyzeCollaborationEfficiency(context);
    }

    // 4. 问题解决率分析
    if (analysisTypes.includes('problem_resolution')) {
      results.problemResolution = await this.analyzeProblemResolution(context);
    }

    // 存储到上下文
    this.setContextValue(context, 'collaborationAnalysis', results);

    // 5. 生成分析摘要
    const summary = this.generateSummary(results);

    return {
      success: true,
      results,
      summary,
      timestamp: new Date().toISOString(),
    };
  }

  private async analyzeStaffActivity(context: FlowContext): Promise<any> {
    // TODO: 实现实际的工作人员活跃度分析
    const staffId = context.senderInfo?.staffId;
    const staffType = context.senderInfo?.staffType;

    return {
      staffId,
      staffType,
      messageCount: 1,
      responseTime: 0,
      status: 'active',
      lastActivityAt: new Date().toISOString(),
    };
  }

  private async analyzeUserSatisfaction(context: FlowContext): Promise<any> {
    // TODO: 实现实际的用户满意度分析
    const userId = context.senderInfo?.userId;
    const emotion = context.variables?.emotion || 'neutral';

    return {
      userId,
      satisfactionScore: emotion === 'positive' ? 5 : emotion === 'negative' ? 2 : 3,
      emotion,
      trend: 'stable',
    };
  }

  private async analyzeCollaborationEfficiency(context: FlowContext): Promise<any> {
    // TODO: 实现实际的协同效率分析
    return {
      aiHandledCount: 0,
      humanHandledCount: 0,
      collaborationCount: 0,
      handoverRate: 0,
    };
  }

  private async analyzeProblemResolution(context: FlowContext): Promise<any> {
    // TODO: 实现实际的问题解决率分析
    return {
      totalProblems: 0,
      resolvedProblems: 0,
      resolutionRate: 0,
      avgResolutionTime: 0,
    };
  }

  private generateSummary(results: any): string {
    const parts: string[] = [];

    if (results.staffActivity) {
      parts.push(`工作人员活跃度：${results.staffActivity.status}`);
    }

    if (results.userSatisfaction) {
      parts.push(`用户满意度：${results.userSatisfaction.satisfactionScore}/5`);
    }

    return parts.join('，') || '协同分析完成';
  }
}

// ==================== 介入决策节点执行器 ====================

export class InterventionDecisionExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'INTERVENTION_DECISION';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing Intervention Decision Node', {
      sessionId: context.sessionId,
      config,
    });

    // 1. 获取上下文信息
    const emotion = context.variables?.emotion || 'neutral';
    const userSatisfaction = context.variables?.collaborationAnalysis?.userSatisfaction;
    const staffActivity = context.variables?.staffActivity;
    const recentMessages = context.variables?.contextAnalysis?.recentMessageCount || 0;

    // 2. 判断是否需要介入
    let needsIntervention = false;
    let interventionReason: string[] = [];

    // 2.1 用户情绪为负面
    if (emotion === 'negative') {
      needsIntervention = true;
      interventionReason.push('用户情绪负面');
    }

    // 2.2 用户满意度低
    if (userSatisfaction && userSatisfaction.satisfactionScore <= 2) {
      needsIntervention = true;
      interventionReason.push('用户满意度低');
    }

    // 2.3 工作人员长时间未响应（超过5分钟无回复）
    if (staffActivity && staffActivity.responseTime > 300) {
      needsIntervention = true;
      interventionReason.push('工作人员响应超时');
    }

    // 2.4 用户多次提问未解决（连续3条用户消息）
    if (recentMessages >= 3) {
      needsIntervention = true;
      interventionReason.push('用户多次提问未解决');
    }

    // 2.5 紧急关键词
    const content = context.triggerData.content;
    const urgentKeywords = ['急', '非常重要', '紧急', '马上'];
    if (urgentKeywords.some(k => content.includes(k))) {
      needsIntervention = true;
      interventionReason.push('紧急情况');
    }

    // 3. 决定介入方式
    let interventionType = 'none';
    if (needsIntervention) {
      if (emotion === 'negative' || urgentKeywords.some(k => content.includes(k))) {
        interventionType = 'priority'; // 优先介入
      } else {
        interventionType = 'normal'; // 正常介入
      }
    }

    // 存储到上下文
    this.setContextValue(context, 'needsIntervention', needsIntervention);
    this.setContextValue(context, 'interventionType', interventionType);
    this.setContextValue(context, 'interventionReason', interventionReason);

    return {
      success: true,
      needsIntervention,
      interventionType,
      interventionReason,
      timestamp: new Date().toISOString(),
    };
  }
}

// ==================== 监控节点执行器 ====================

export class MonitorOnlyExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'MONITOR_ONLY';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing Monitor Only Node', {
      robotId: context.triggerData.robotId,
      content: context.triggerData.content?.substring(0, 50),
    });

    // 监控节点仅记录消息，不进行任何处理
    const record = {
      messageId: `msg_${Date.now()}`,
      robotId: context.triggerData.robotId,
      content: context.triggerData.content,
      senderId: context.triggerData.senderId,
      senderName: context.triggerData.senderName,
      groupId: context.triggerData.groupId,
      groupName: context.triggerData.groupName,
      timestamp: new Date().toISOString(),
    };

    // TODO: 保存到监控日志表
    console.log('Monitoring message:', record);

    return {
      success: true,
      record,
      action: 'monitored_only',
      timestamp: new Date().toISOString(),
    };
  }
}

// ==================== 通知分发节点执行器 ====================

export class NotificationDispatchExecutor extends BaseNodeExecutor {
  protected getNodeType(): string {
    return 'NOTIFICATION_DISPATCH';
  }

  protected async doExecute(context: FlowContext, config: any): Promise<any> {
    console.log('Executing Notification Dispatch Node', {
      notificationType: config.notificationType,
      config,
    });

    const notificationType = config.notificationType; // alert, task, system
    const recipients = config.recipients || []; // 接收者列表
    const content = config.content;
    const robotId = config.robotId; // 使用哪个机器人发送

    // 1. 根据通知类型选择机器人
    const targetRobotId = await this.selectRobotForNotification(notificationType, robotId, context);

    // 2. 构建通知内容
    const notificationContent = this.buildNotificationContent(notificationType, content, context);

    // 3. 发送通知
    const sendResult = await this.sendNotification(targetRobotId, recipients, notificationContent);

    // 4. 记录通知日志
    const record = {
      notificationId: `notif_${Date.now()}`,
      type: notificationType,
      recipients,
      content: notificationContent,
      robotId: targetRobotId,
      sendResult,
      timestamp: new Date().toISOString(),
    };

    // TODO: 保存到通知记录表

    return {
      success: sendResult.success,
      record,
      sendResult,
      timestamp: new Date().toISOString(),
    };
  }

  private async selectRobotForNotification(
    notificationType: string,
    robotId: string | undefined,
    context: FlowContext
  ): Promise<string> {
    // 如果指定了机器人，使用指定的机器人
    if (robotId) {
      return robotId;
    }

    // 根据通知类型选择机器人
    // P0 告警 → 通知机器人
    if (notificationType === 'alert_p0') {
      // TODO: 获取通知机器人列表，选择可用的
      return 'notifier_robot_001';
    }

    // 任务提醒 → 通知机器人
    if (notificationType === 'task') {
      return 'notifier_robot_001';
    }

    // 系统通知 → 通知机器人
    if (notificationType === 'system') {
      return 'notifier_robot_001';
    }

    // 默认使用触发消息的机器人
    return context.triggerData.robotId;
  }

  private buildNotificationContent(notificationType: string, content: string, context: FlowContext): string {
    const template = content || '${default}';
    const now = new Date().toLocaleString('zh-CN');

    const variables = {
      timestamp: now,
      sessionId: context.sessionId || 'N/A',
      groupName: context.triggerData.groupName || 'N/A',
      userName: context.triggerData.senderName || 'N/A',
    };

    // 替换变量
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(`\${${key}}`, String(value));
    });

    return result;
  }

  private async sendNotification(
    robotId: string,
    recipients: string[],
    content: string
  ): Promise<any> {
    // TODO: 调用机器人 API 发送通知
    const { workToolApi } = await import('../worktool-api-proxy');

    const results = [];

    for (const recipient of recipients) {
      const result = await workToolApi.sendMessage({
        robotId,
        toName: recipient,
        content,
        messageType: 1,
      });

      results.push({
        recipient,
        success: result.success,
        data: result.data,
        error: result.error,
      });
    }

    return {
      success: results.every(r => r.success),
      results,
    };
  }
}
