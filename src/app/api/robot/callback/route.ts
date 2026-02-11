/**
 * 机器人消息回调接口
 * 接收 WorkTool 机器人的消息回调，并触发流程执行
 */

import { NextRequest, NextResponse } from 'next/server';
import { flowEngine } from '@/lib/services/flow-engine';
import { senderIdentificationService } from '@/lib/services/sender-identification';
import { staffTypeService } from '@/services/staff-type-service';
import { robotBusinessRoleService } from '@/services/robot-business-role-service';
import { sessionService } from '@/lib/services/session-service';

// 回调数据接口
interface RobotCallbackData {
  robotId: string;
  spoken: string;
  receivedName: string;
  groupName: string;
  timestamp?: string;
  senderName?: string;
  signature?: string;
  eventId?: string;
  [key: string]: any;
}

/**
 * POST /api/robot/callback
 * 接收机器人消息回调
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 解析回调数据
    const body: RobotCallbackData = await request.json();

    console.log('===== 机器人回调接收 =====', {
      robotId: body.robotId,
      receivedName: body.receivedName,
      groupName: body.groupName,
      spoken: body.spoken?.substring(0, 50),
      timestamp: new Date().toISOString(),
    });

    // 验证必填字段
    if (!body.robotId || !body.spoken || !body.receivedName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: robotId, spoken, receivedName',
        },
        { status: 400 }
      );
    }

    // 构建触发数据
    const triggerData = {
      robotId: body.robotId,
      content: body.spoken,
      senderId: body.receivedName,
      senderName: body.senderName || body.receivedName,
      senderType: 'user' as const, // 默认为用户，后续会通过识别服务确定
      groupId: body.groupName,
      groupName: body.groupName,
      timestamp: body.timestamp || new Date().toISOString(),
      signature: body.signature,
      eventId: body.eventId,
    };

    // 识别发送者
    const identificationResult = await senderIdentificationService.identifySender(
      triggerData.senderId,
      triggerData.senderName
    );

    if (!identificationResult.success) {
      console.error('Sender identification failed:', identificationResult.error);
      // 即使识别失败也继续处理，使用默认值
    }

    const senderInfo = identificationResult.senderInfo;
    // 类型转换：将 'system' 和 'ai' 转换为 'robot'
    const mappedSenderType = senderInfo?.senderType === 'system' || senderInfo?.senderType === 'ai'
      ? 'robot' as const
      : (senderInfo?.senderType || 'user') as 'user' | 'staff' | 'operation' | 'robot';
    triggerData.senderType = mappedSenderType;

    // 如果是工作人员，获取工作人员类型
    let staffType = null;
    if (senderInfo?.senderType === 'staff' && senderInfo?.staffId) {
      const staffTypeResult = await staffTypeService.getStaffTypeByIdentifier(senderInfo.staffId);
      if (staffTypeResult.success && staffTypeResult.staffType) {
        staffType = staffTypeResult.staffType;
      }
    }

    // 获取或创建会话
    let sessionId;
    try {
      const sessionResult = await sessionService.getOrCreateSession({
        robotId: triggerData.robotId,
        userId: triggerData.senderId,
        userName: triggerData.senderName,
        sessionType: 'group',
      });

      if (sessionResult.success && sessionResult.session) {
        sessionId = sessionResult.session.id;
      }
    } catch (error) {
      console.error('Session creation failed:', error);
      // 即使会话创建失败也继续处理
    }

    // 获取业务角色配置
    let businessRole = undefined;
    try {
      const businessConfigResult = await robotBusinessRoleService.getBusinessConfigByRobotId(
        triggerData.robotId
      );
      if (businessConfigResult.success && businessConfigResult.businessConfig) {
        businessRole = {
          code: businessConfigResult.businessConfig.businessRole,
          name: businessConfigResult.businessConfig.businessRole || '未知角色',
          config: businessConfigResult.businessConfig,
        };
      }
    } catch (error) {
      console.error('Business role config fetch failed:', error);
    }

    // 根据发送者类型确定触发类型
    let triggerType = 'webhook_message';
    if (mappedSenderType === 'operation') {
      triggerType = 'operation_message';
    } else if (mappedSenderType === 'staff') {
      triggerType = 'staff_message';
    } else if (mappedSenderType === 'user') {
      triggerType = 'user_message';
    }

    // 获取默认流程定义
    const flowDefinition = await flowEngine.getDefaultFlowByTriggerType(triggerType);

    if (!flowDefinition) {
      console.warn(`No default flow found for trigger type: ${triggerType}`);
      
      // 如果没有找到流程定义，返回成功但不执行流程
      return NextResponse.json({
        success: true,
        message: 'No flow defined for this trigger type',
        triggerType,
        senderType: triggerData.senderType,
        processingTime: Date.now() - startTime,
      });
    }

    // 构建初始上下文
    const initialContext = {
      senderInfo: {
        senderType: mappedSenderType,
        userId: senderInfo?.senderId,  // 使用 senderId 作为 userId
        staffId: senderInfo?.staffId,
        staffType: staffType ? String(staffType) : undefined,
        operationId: undefined,  // SenderInfo 中没有这个字段
      },
      sessionId,
      businessRole: businessRole || undefined,
      aiConfig: flowDefinition.variables?.aiConfig || {},
      variables: {},
    };

    // 创建流程实例
    const flowInstance = await flowEngine.createFlowInstance(
      flowDefinition.id,
      triggerType,
      triggerData,
      initialContext
    );

    console.log('Flow instance created:', {
      instanceId: flowInstance.id,
      flowName: flowInstance.flowName,
      currentNodeId: flowInstance.currentNodeId,
    });

    // 异步执行流程（不等待完成）
    flowEngine
      .executeFlowInstance(flowInstance.id)
      .then((completedInstance) => {
        console.log('Flow execution completed:', {
          instanceId: completedInstance.id,
          status: completedInstance.status,
          processingTime: completedInstance.processingTime,
        });
      })
      .catch((error) => {
        console.error('Flow execution failed:', {
          instanceId: flowInstance.id,
          error: error.message,
          stack: error.stack,
        });
      });

    // 立即返回响应
    return NextResponse.json({
      success: true,
      message: 'Flow execution started',
      data: {
        instanceId: flowInstance.id,
        flowName: flowInstance.flowName,
        triggerType,
        senderType: triggerData.senderType,
      },
      processingTime: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error('Robot callback processing failed:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        processingTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/robot/callback
 * 健康检查
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Robot callback API is running',
    timestamp: new Date().toISOString(),
  });
}
