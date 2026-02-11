/**
 * 流程引擎测试 API
 * 用于测试流程执行引擎的各项功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { flowEngine } from '@/lib/services/flow-engine';
import { db } from '@/lib/db';
import { flowInstances, flowExecutionLogs } from '@/storage/database/shared/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * POST /api/flow-engine/test
 * 测试流程执行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('Flow engine test request:', body);

    // 验证参数
    if (!body.robotId || !body.content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: robotId, content' },
        { status: 400 }
      );
    }

    // 获取默认流程
    const flowDefinition = await flowEngine.getDefaultFlowByTriggerType('webhook');

    if (!flowDefinition) {
      return NextResponse.json(
        { success: false, error: 'No default flow found for trigger type: webhook' },
        { status: 404 }
      );
    }

    console.log('Found flow definition:', {
      id: flowDefinition.id,
      name: flowDefinition.name,
      nodeCount: flowDefinition.nodes.length,
      edgeCount: flowDefinition.edges.length,
    });

    // 构建触发数据
    const triggerData = {
      robotId: body.robotId,
      content: body.content,
      senderId: body.senderId || 'test_user_001',
      senderName: body.senderName || '测试用户',
      senderType: 'user' as const,
      groupId: body.groupId || 'test_group',
      groupName: body.groupName || '测试群',
      timestamp: new Date().toISOString(),
    };

    // 构建初始上下文
    const initialContext = {
      senderInfo: {
        senderType: 'user' as const,
        userId: triggerData.senderId,
      },
      businessRole: null as any,
      aiConfig: {
        provider: 'doubao',
        model: 'doubao-pro',
      },
      variables: {},
    };

    // 创建流程实例
    const flowInstance = await flowEngine.createFlowInstance(
      flowDefinition.id,
      'webhook',
      triggerData,
      initialContext
    );

    console.log('Flow instance created:', {
      instanceId: flowInstance.id,
      flowName: flowInstance.flowName,
      currentNodeId: flowInstance.currentNodeId,
    });

    // 执行流程
    const completedInstance = await flowEngine.executeFlowInstance(flowInstance.id);

    console.log('Flow execution completed:', {
      instanceId: completedInstance.id,
      status: completedInstance.status,
      processingTime: completedInstance.processingTime,
      result: completedInstance.result,
    });

    // 获取执行日志
    const executionLogs = await db
      .select()
      .from(flowExecutionLogs)
      .where(eq(flowExecutionLogs.flowInstanceId, flowInstance.id))
      .orderBy(desc(flowExecutionLogs.createdAt));

    return NextResponse.json({
      success: true,
      message: 'Flow execution test completed',
      data: {
        flowDefinition: {
          id: flowDefinition.id,
          name: flowDefinition.name,
          version: flowDefinition.version,
        },
        instance: {
          id: completedInstance.id,
          flowName: completedInstance.flowName,
          status: completedInstance.status,
          processingTime: completedInstance.processingTime,
          errorMessage: completedInstance.errorMessage,
          retryCount: completedInstance.retryCount,
        },
        executionLogs: executionLogs.map(log => ({
          nodeId: log.nodeId,
          nodeType: log.nodeType,
          nodeName: log.nodeName,
          status: log.status,
          processingTime: log.processingTime,
          errorMessage: log.errorMessage,
        })),
      },
    });
  } catch (error: any) {
    console.error('Flow engine test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/flow-engine/test
 * 获取测试状态
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const instanceId = searchParams.get('instanceId');

  if (instanceId) {
    // 获取指定实例的详细信息
    const [instance] = await db
      .select()
      .from(flowInstances)
      .where(eq(flowInstances.id, instanceId))
      .limit(1);

    if (!instance) {
      return NextResponse.json(
        { success: false, error: 'Instance not found' },
        { status: 404 }
      );
    }

    const executionLogs = await db
      .select()
      .from(flowExecutionLogs)
      .where(eq(flowExecutionLogs.flowInstanceId, instanceId))
      .orderBy(desc(flowExecutionLogs.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        instance,
        executionLogs,
      },
    });
  } else {
    // 获取最近的测试实例
    const instances = await db
      .select()
      .from(flowInstances)
      .where(eq(flowInstances.triggerType, 'webhook'))
      .orderBy(desc(flowInstances.createdAt))
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        instances,
      },
    });
  }
}
