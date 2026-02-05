import { staff } from '@/storage/database/new-schemas';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';

export interface SenderInfo {
  senderId: string;
  senderType: 'user' | 'staff' | 'system' | 'ai';
  senderName?: string;
  staffId?: string;
}

export interface IdentificationResult {
  success: boolean;
  senderInfo?: SenderInfo;
  error?: string;
}

/**
 * 发送者识别服务
 * 负责识别消息发送者的类型和身份
 */
export class SenderIdentificationService {
  /**
   * 工作人员ID前缀列表（可根据实际情况配置）
   */
  private readonly STAFF_PREFIXES = ['staff_', 'admin_', 'operator_', 'support_'];
  
  /**
   * 系统发送者ID列表
   */
  private readonly SYSTEM_SENDERS = ['system', 'bot', 'assistant', 'ai'];
  
  /**
   * AI发送者ID列表
   */
  private readonly AI_SENDERS = ['ai_', 'assistant_', 'chatgpt_', 'doubao_', 'claude_'];

  /**
   * 识别发送者
   * 根据senderId和上下文信息识别发送者类型
   */
  async identifySender(
    senderId: string,
    senderName?: string,
    context?: {
      isGroup?: boolean;
      hasMention?: boolean;
    }
  ): Promise<IdentificationResult> {
    try {
      if (!senderId) {
        return {
          success: false,
          error: 'senderId is required',
        };
      }

      // 1. 检查是否是系统发送者
      if (this.isSystemSender(senderId)) {
        return {
          success: true,
          senderInfo: {
            senderId,
            senderType: 'system',
            senderName: senderName || 'System',
          },
        };
      }

      // 2. 检查是否是AI发送者
      if (this.isAISender(senderId)) {
        return {
          success: true,
          senderInfo: {
            senderId,
            senderType: 'ai',
            senderName: senderName || 'AI Assistant',
          },
        };
      }

      // 3. 检查是否是工作人员
      const staffResult = await this.identifyStaff(senderId, senderName);
      if (staffResult.success && staffResult.senderInfo) {
        return staffResult;
      }

      // 4. 默认认为是用户
      return {
        success: true,
        senderInfo: {
          senderId,
          senderType: 'user',
          senderName: senderName,
        },
      };
    } catch (error) {
      console.error('Error identifying sender:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 识别是否是系统发送者
   */
  private isSystemSender(senderId: string): boolean {
    return this.SYSTEM_SENDERS.some(prefix => 
      senderId === prefix || senderId.startsWith(prefix)
    );
  }

  /**
   * 识别是否是AI发送者
   */
  private isAISender(senderId: string): boolean {
    return this.AI_SENDERS.some(prefix => senderId.startsWith(prefix));
  }

  /**
   * 识别工作人员
   * 通过ID匹配或前缀匹配
   */
  private async identifyStaff(
    senderId: string,
    senderName?: string
  ): Promise<IdentificationResult> {
    try {
      // 1. 通过ID精确匹配
      const exactMatch = await db
        .select()
        .from(staff)
        .where(eq(staff.id, senderId))
        .limit(1);

      if (exactMatch.length > 0) {
        return {
          success: true,
          senderInfo: {
            senderId,
            senderType: 'staff',
            senderName: senderName || exactMatch[0].name,
            staffId: exactMatch[0].id,
          },
        };
      }

      // 2. 通过邮箱匹配（假设senderId可能是邮箱）
      const emailMatch = await db
        .select()
        .from(staff)
        .where(eq(staff.email, senderId))
        .limit(1);

      if (emailMatch.length > 0) {
        return {
          success: true,
          senderInfo: {
            senderId: emailMatch[0].id,
            senderType: 'staff',
            senderName: senderName || emailMatch[0].name,
            staffId: emailMatch[0].id,
          },
        };
      }

      // 3. 通过名称模糊匹配
      if (senderName) {
        const nameMatch = await db
          .select()
          .from(staff)
          .where(eq(staff.name, senderName))
          .limit(1);

        if (nameMatch.length > 0) {
          return {
            success: true,
            senderInfo: {
              senderId: nameMatch[0].id,
              senderType: 'staff',
              senderName: nameMatch[0].name,
              staffId: nameMatch[0].id,
            },
          };
        }
      }

      // 4. 通过前缀匹配
      if (this.STAFF_PREFIXES.some(prefix => senderId.startsWith(prefix))) {
        return {
          success: true,
          senderInfo: {
            senderId,
            senderType: 'staff',
            senderName: senderName,
            staffId: senderId,
          },
        };
      }

      // 不是工作人员
      return {
        success: false,
        error: 'Not identified as staff',
      };
    } catch (error) {
      console.error('Error identifying staff:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 批量识别发送者
   */
  async identifySenders(
    senders: Array<{ senderId: string; senderName?: string }>
  ): Promise<IdentificationResult[]> {
    const results = await Promise.all(
      senders.map(sender => this.identifySender(sender.senderId, sender.senderName))
    );

    return results;
  }

  /**
   * 更新用户画像（TODO：后续实现）
   */
  async updateUserProfile(
    userId: string,
    interactionData: {
      sessionId: string;
      messageCount: number;
      lastInteractionAt: Date;
      interests?: string[];
    }
  ): Promise<void> {
    // TODO: 实现用户画像更新逻辑
    // 1. 获取或创建用户画像
    // 2. 更新用户偏好、兴趣等
    // 3. 记录用户行为模式
    console.log('Update user profile:', userId, interactionData);
  }

  /**
   * 获取发送者统计信息
   */
  async getSenderStats(senderId: string, senderType: string) {
    try {
      // TODO: 实现发送者统计
      return {
        success: true,
        stats: {
          totalMessages: 0,
          totalSessions: 0,
          lastActive: null,
        },
      };
    } catch (error) {
      console.error('Error getting sender stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stats: null,
      };
    }
  }
}

// 导出单例
export const senderIdentificationService = new SenderIdentificationService();
