import { NextRequest, NextResponse } from 'next/server';
import { messageService } from '@/lib/services/message-service';
import { sessionService } from '@/lib/services/session-service';
import { senderIdentificationService } from '@/lib/services/sender-identification';
import { collaborationDecisionService } from '@/lib/services/collaboration-decision-service';
import { staffTypeService } from '@/services/staff-type-service';
import { robotBusinessRoleService } from '@/services/robot-business-role-service';
import { afterSalesTaskService } from '@/services/after-sales-task-service';
import { staffMessageContextService } from '@/services/staff-message-context-service';
import { getKeywordsByScenario } from '@/config/keywords';
import { StaffType } from '@/services/staff-type-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.robotId || !body.content || !body.senderId || !body.senderType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: robotId, content, senderId, senderType',
        },
        { status: 400 }
      );
    }

    // 识别发送者（如果未提供）
    let senderInfo = body.senderInfo;
    let staffType: StaffType | null = null;

    if (!senderInfo) {
      const identificationResult = await senderIdentificationService.identifySender(
        body.senderId,
        body.senderName
      );
      
      if (!identificationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to identify sender: ${identificationResult.error}`,
          },
          { status: 400 }
        );
      }
      
      senderInfo = identificationResult.senderInfo;

      // 如果是工作人员，获取工作人员类型
      if (senderInfo?.senderType === 'staff' && senderInfo?.staffId) {
        const staffTypeResult = await staffTypeService.getStaffTypeByIdentifier(senderInfo.staffId);
        if (staffTypeResult.success && staffTypeResult.staffType) {
          staffType = staffTypeResult.staffType;
        }
      }
    }

    // 获取或创建会话
    let sessionId = body.sessionId;
    if (!sessionId) {
      const sessionResult = await sessionService.getOrCreateSession({
        robotId: body.robotId,
        userId: body.senderId,
        userName: body.senderName,
        sessionType: body.sessionType,
      });

      if (!sessionResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to create/get session: ${sessionResult.error}`,
          },
          { status: 500 }
        );
      }

      sessionId = sessionResult.session!.id;
    }

    // 创建消息
    const messageResult = await messageService.createMessage({
      sessionId,
      robotId: body.robotId,
      content: body.content,
      contentType: body.contentType,
      senderId: body.senderId,
      senderType: body.senderType,
      senderName: body.senderName,
      messageType: body.messageType,
      aiModel: body.aiModel,
      aiProvider: body.aiProvider,
      aiResponseTime: body.aiResponseTime,
      aiTokensUsed: body.aiTokensUsed,
      aiCost: body.aiCost,
      aiConfidence: body.aiConfidence,
      intentRef: body.intentRef,
      intentConfidence: body.intentConfidence,
      emotion: body.emotion,
      emotionScore: body.emotionScore,
      metadata: body.metadata,
    });

    if (!messageResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create message: ${messageResult.error}`,
        },
        { status: 500 }
      );
    }

    // 更新会话统计
    await sessionService.updateSessionStats(sessionId, body.senderType);

    // 记录工作人员介入
    if (senderInfo?.senderType === 'staff' && senderInfo?.staffId) {
      await sessionService.recordStaffIntervention(sessionId, senderInfo.staffId);
    }

    // 获取业务角色配置（核心联动）
    let businessRoleCode: string | null = null;
    let businessRoleName: string | null = null;
    let shouldAiReply = body.aiEnabled !== false;  // 默认AI回复

    try {
      const businessConfigResult = await robotBusinessRoleService.getBusinessConfigByRobotId(body.robotId);
      if (businessConfigResult.success && businessConfigResult.businessConfig) {
        businessRoleCode = businessConfigResult.businessConfig.businessRole;
        businessRoleName = businessConfigResult.businessRole?.name || null;

        // 判断AI是否应该回复
        const shouldReplyResult = await robotBusinessRoleService.shouldAiReply(
          body.robotId,
          body.senderType as 'user' | 'staff'
        );
        if (shouldReplyResult.success) {
          shouldAiReply = shouldReplyResult.shouldReply;
        }
      }
    } catch (error) {
      console.error('[POST /api/messages] 获取业务角色配置失败:', error);
      // 业务角色配置失败不影响主流程，使用默认行为
    }

    // 记录决策日志（方案3：决策日志，增强版）
    try {
      const savedMessage = messageResult.message!;

      // 如果是用户消息，记录初始决策
      if (body.senderType === 'user') {
        await collaborationDecisionService.recordDecision({
          sessionId,
          messageId: savedMessage.id || '',
          robotId: body.robotId,
          shouldAiReply: shouldAiReply,  // 根据业务角色判断
          aiAction: shouldAiReply ? 'processing' : 'none',  // 初始状态
          staffAction: 'none',
          priority: 'medium',
          reason: businessRoleName
            ? `${businessRoleName}：${shouldAiReply ? 'AI回复' : 'AI不回复'}用户消息`
            : '用户消息已接收',
          strategy: businessRoleName ? `${businessRoleName}策略` : (shouldAiReply ? 'AI优先' : '等待人工'),
          messageType: 'user',
        });
      } 
      // 如果是AI回复，更新决策
      else if (body.senderType === 'ai' && body.parentMessageId) {
        await collaborationDecisionService.updateDecision(body.parentMessageId, {
          aiAction: 'replied',
          priority: 'low',
          reason: 'AI已回复',
        });
      }
      // 如果是工作人员回复，更新决策
      else if (senderInfo?.senderType === 'staff' && body.parentMessageId) {
        // 判断是否识别工作人员（核心联动）
        let shouldIdentify = true;
        let identifyReason = '';

        try {
          const identifyResult = await robotBusinessRoleService.shouldIdentifyStaff(
            body.robotId,
            staffType ? String(staffType) : 'unknown'
          );
          if (identifyResult.success) {
            shouldIdentify = identifyResult.shouldIdentify;
            identifyReason = identifyResult.reason || '';
          }
        } catch (error) {
          console.error('[POST /api/messages] 判断工作人员识别失败:', error);
          // 默认识别工作人员
        }

        // 将 staffType 映射到决策日志接受的格式
        let decisionStaffType: 'management' | 'community' | 'after_sales' | 'conversion' | null = null;
        if (staffType) {
          const staffTypeStr = String(staffType);
          if (staffTypeStr.includes('management')) {
            decisionStaffType = 'management';
          } else if (staffTypeStr.includes('community')) {
            decisionStaffType = 'community';
          } else if (staffTypeStr.includes('after_sales')) {
            decisionStaffType = 'after_sales';
          } else if (staffTypeStr.includes('conversion')) {
            decisionStaffType = 'conversion';
          }
        }

        await collaborationDecisionService.updateDecision(body.parentMessageId, {
          staffAction: shouldIdentify ? 'replied' : 'ignored',
          priority: 'low',
          reason: identifyReason || `员工 ${senderInfo.staffName} (${staffType}) 已回复`,
        });

        // 如果识别为工作人员，记录上下文
        if (shouldIdentify) {
          try {
            await staffMessageContextService.recordStaffMessage({
              messageId: savedMessage.id || '',
              sessionId,
              staffUserId: senderInfo.staffId,
              staffName: senderInfo.staffName || '',
              staffType: staffType || StaffType.MANAGEMENT,
              content: body.content,
              relatedUserId: body.relatedUserId,  // 如果有 @用户
              isMention: body.isMention || false,
              metadata: body.metadata,
            });
          } catch (contextError) {
            console.error('[POST /api/messages] 记录工作人员消息上下文失败:', contextError);
          }

          // 检查是否需要创建售后任务（基于业务角色配置）
          if (businessRoleCode === 'after_sales' && staffType === 'after_sales' && body.isMention) {
            try {
              // 从业务角色配置获取关键词
              const businessConfig = await robotBusinessRoleService.getBusinessConfigByRobotId(body.robotId);
              const keywords = businessConfig.success && businessConfig.businessConfig && businessConfig.businessConfig.businessConfig
                ? businessConfig.businessConfig.businessConfig.keywords
                : getKeywordsByScenario('after_sales');

              const hasKeyword = keywords.some(keyword =>
                body.content.toLowerCase().includes(keyword.toLowerCase())
              );

              if (hasKeyword) {
                const matchedKeyword = keywords.find(k =>
                  body.content.toLowerCase().includes(k.toLowerCase())
                );

                await afterSalesTaskService.createTask({
                  sessionId,
                  staffUserId: senderInfo.staffId,
                  staffName: senderInfo.staffName || '',
                  userId: body.relatedUserId || body.senderId,
                  userName: body.relatedUserName || body.senderName,
                  taskType: 'general',
                  priority: businessConfig.success && businessConfig.businessConfig && businessConfig.businessConfig.businessConfig?.defaultTaskPriority
                    ? businessConfig.businessConfig.businessConfig.defaultTaskPriority as any
                    : 'normal',
                  status: 'pending',
                  title: `售后任务 - ${body.content.substring(0, 50)}`,
                  description: body.content,
                  messageId: savedMessage.id,
                  keyword: matchedKeyword,
                });
                console.log('[POST /api/messages] 售后任务已创建');
              }
            } catch (taskError) {
              console.error('[POST /api/messages] 创建售后任务失败:', taskError);
            }
          }
        }
      }
    } catch (decisionError) {
      // 决策记录失败不影响主流程，只记录错误
      console.error('[POST /api/messages] 记录决策失败:', decisionError);
    }

    // TODO: 触发AI回复（如果是用户消息）
    // if (body.senderType === 'user' && body.aiEnabled !== false) {
    //   // 调用AI服务生成回复
    // }

    // TODO: 触发介入判断（如果是工作人员消息）
    // if (senderInfo?.senderType === 'staff') {
    //   // 调用介入判断服务
    // }

    return NextResponse.json({
      success: true,
      data: {
        message: messageResult.message,
        sessionId,
        businessRole: businessRoleCode,  // 返回业务角色信息
        businessRoleName: businessRoleName,  // 返回业务角色名称
        shouldAiReply: shouldAiReply,  // 返回是否应该AI回复
      },
    });
  } catch (error) {
    console.error('Error in POST /api/messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params = {
      sessionId: searchParams.get('sessionId') || undefined,
      robotId: searchParams.get('robotId') || undefined,
      senderId: searchParams.get('senderId') || undefined,
      senderType: searchParams.get('senderType') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const result = await messageService.getMessages(params);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.messages,
      pagination: {
        limit: params.limit || 100,
        offset: params.offset || 0,
        count: result.messages.length,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
