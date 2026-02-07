import { messages, NewMessage } from '@/storage/database/new-schemas';
import { db } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';

export interface CreateMessageInput {
  sessionId: string;
  robotId: string;
  content: string;
  contentType?: 'text' | 'image' | 'audio' | 'video' | 'file';
  senderId: string;
  senderType: 'user' | 'staff' | 'system' | 'ai';
  senderName?: string;
  messageType?: 'message' | 'system' | 'notification';
  aiModel?: string;
  aiProvider?: string;
  aiResponseTime?: number;
  aiTokensUsed?: number;
  aiCost?: number;
  aiConfidence?: number;
  intentRef?: string;
  intentConfidence?: number;
  emotion?: string;
  emotionScore?: number;
  metadata?: Record<string, any>;
}

export interface MessageResult {
  success: boolean;
  message?: NewMessage;
  error?: string;
}

/**
 * 消息服务
 * 负责消息的接收、验证、保存和处理
 */
export class MessageService {
  /**
   * 创建消息
   */
  async createMessage(input: CreateMessageInput): Promise<MessageResult> {
    try {
      // 验证必填字段
      if (!input.sessionId || !input.robotId || !input.content || !input.senderId || !input.senderType) {
        return {
          success: false,
          error: 'Missing required fields: sessionId, robotId, content, senderId, senderType',
        };
      }

      // 创建消息数据
      const newMessage: NewMessage = {
        sessionId: input.sessionId,
        robotId: input.robotId,
        content: input.content,
        contentType: input.contentType || 'text',
        senderId: input.senderId,
        senderType: input.senderType,
        senderName: input.senderName,
        messageType: input.messageType || 'message',
        aiModel: input.aiModel,
        aiProvider: input.aiProvider,
        aiResponseTime: input.aiResponseTime,
        aiTokensUsed: input.aiTokensUsed,
        aiCost: input.aiCost ? String(input.aiCost) : undefined,
        aiConfidence: input.aiConfidence ? String(input.aiConfidence) : undefined,
        intentRef: input.intentRef,
        intentConfidence: input.intentConfidence ? String(input.intentConfidence) : undefined,
        emotion: input.emotion,
        emotionScore: input.emotionScore ? String(input.emotionScore) : undefined,
        metadata: input.metadata || {},
      };

      // 保存到数据库
      const result = await db.insert(messages).values(newMessage).returning();

      return {
        success: true,
        message: result[0],
      };
    } catch (error) {
      console.error('Error creating message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取消息列表
   */
  async getMessages(params: {
    sessionId?: string;
    robotId?: string;
    senderId?: string;
    senderType?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const conditions = [];
      
      if (params.sessionId) {
        conditions.push(eq(messages.sessionId, params.sessionId));
      }
      if (params.robotId) {
        conditions.push(eq(messages.robotId, params.robotId));
      }
      if (params.senderId) {
        conditions.push(eq(messages.senderId, params.senderId));
      }
      if (params.senderType) {
        conditions.push(eq(messages.senderType, params.senderType));
      }

      const query = db
        .select()
        .from(messages)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(messages.createdAt))
        .limit(params.limit || 100)
        .offset(params.offset || 0);

      const result = await query;
      
      return {
        success: true,
        messages: result,
      };
    } catch (error) {
      console.error('Error getting messages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        messages: [],
      };
    }
  }

  /**
   * 获取消息详情
   */
  async getMessageById(messageId: string) {
    try {
      const result = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (result.length === 0) {
        return {
          success: false,
          error: 'Message not found',
          message: null,
        };
      }

      return {
        success: true,
        message: result[0],
      };
    } catch (error) {
      console.error('Error getting message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: null,
      };
    }
  }

  /**
   * 更新消息
   */
  async updateMessage(messageId: string, updates: Partial<NewMessage>) {
    try {
      const result = await db
        .update(messages)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(messages.id, messageId))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Message not found',
          message: null,
        };
      }

      return {
        success: true,
        message: result[0],
      };
    } catch (error) {
      console.error('Error updating message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: null,
      };
    }
  }

  /**
   * 删除消息
   */
  async deleteMessage(messageId: string) {
    try {
      const result = await db
        .delete(messages)
        .where(eq(messages.id, messageId))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Message not found',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 处理消息（完整流程）
   * 1. 接收消息
   * 2. 识别发送者
   * 3. 保存消息
   * 4. 更新会话统计
   * 5. 触发后续处理（AI回复、介入判断等）
   */
  async processMessage(input: CreateMessageInput): Promise<MessageResult> {
    try {
      // TODO: 集成发送者识别服务
      // const senderResult = await senderIdentificationService.identify(input);
      
      // 创建消息
      const result = await this.createMessage(input);
      
      if (!result.success) {
        return result;
      }

      // TODO: 更新会话统计
      // await sessionService.updateStats(input.sessionId, input.senderType);

      // TODO: 触发AI回复（如果是用户消息）
      // if (input.senderType === 'user') {
      //   await aiService.generateReply(input.sessionId, input.content);
      // }

      // TODO: 触发介入判断（如果是工作人员消息）
      // if (input.senderType === 'staff') {
      //   await interventionService.judge(input);
      // }

      return result;
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 导出单例
export const messageService = new MessageService();
