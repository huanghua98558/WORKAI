import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { flowInstances, flowExecutionLogs } from '@/storage/database/shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

/**
 * GET /api/monitoring/executions
 * 获取流程执行记录列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 50;

    console.log('[监控] 查询执行记录，limit:', limit);

    // 查询流程实例
    const instances = await db
      .select()
      .from(flowInstances)
      .orderBy(desc(flowInstances.createdAt))
      .limit(limit);

    console.log('[监控] 查询到', instances.length, '条流程实例');

    // 为每个实例查询相关的日志
    const result = await Promise.all(
      instances.map(async (instance: any) => {
        try {
          const logs = await db
            .select()
            .from(flowExecutionLogs)
            .where(eq(flowExecutionLogs.flowInstanceId, instance.id))
            .orderBy(desc(flowExecutionLogs.createdAt));

          // 提取消息内容（从result中）
          const resultData = instance.result || {};
          const triggerData = resultData.triggerData || {};
          const steps = resultData.steps || {};

          const messageContent = steps.user_message ||
                                triggerData.content ||
                                '';

          // 提取机器人ID和名称（从triggerData中）
          const robotId = triggerData.robotId || '';
          const robotName = triggerData.robotName || null;

          // 提取用户信息（从triggerData中）
          const senderId = triggerData.senderId || null;
          const userId = senderId;
          const groupRef = triggerData.groupId || null;

          return {
            id: instance.id,
            processingId: instance.processingId,
            robotId,
            robotName,
            sessionId: instance.sessionId || '',
            userId,
            groupRef,
            status: instance.status,
            startTime: instance.createdAt,
            endTime: instance.updatedAt,
            processingTime: instance.processingTime,
            errorMessage: instance.errorMessage,
            errorStack: instance.errorMessage,
            steps: steps,
            decision: resultData.decision || {},
            messageContent,
            createdAt: instance.createdAt,
            logs,
          };
        } catch (error) {
          console.error('[监控] 处理实例日志失败:', instance.id, error);
          // 返回基本数据
          return {
            id: instance.id,
            processingId: instance.processingId,
            robotId: '',
            robotName: null,
            sessionId: instance.sessionId || '',
            userId: null,
            groupRef: null,
            status: instance.status,
            startTime: instance.createdAt,
            endTime: instance.updatedAt,
            processingTime: instance.processingTime,
            errorMessage: instance.errorMessage,
            errorStack: instance.errorMessage,
            steps: {},
            decision: {},
            messageContent: '',
            createdAt: instance.createdAt,
            logs: [],
          };
        }
      })
    );

    console.log('[监控] 返回', result.length, '条记录');

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    console.error('[监控] 获取执行记录失败:', error);
    return NextResponse.json(
      {
        code: -1,
        message: '获取执行记录失败',
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
