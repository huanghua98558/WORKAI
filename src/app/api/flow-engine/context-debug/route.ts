import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/flow-engine/context-debug
 * 测试 ContextHelper 方法
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { context } = body;

    if (!context || typeof context !== 'object') {
      return NextResponse.json(
        { success: false, error: 'context 参数必填且必须是对象' },
        { status: 400 }
      );
    }

    // 由于 ContextHelper 在 server/lib/context-helper.js
    // 我们需要在 Node.js 环境中运行
    // 这里我们模拟 ContextHelper 的逻辑进行测试
    
    // 临时模拟 ContextHelper 的行为（实际应该导入真实的 ContextHelper）
    // 由于路径问题，这里我们使用简化版本的逻辑
    
    const getRobotId = (ctx: any, node: any = {}) => {
      // 优先级 1: 节点配置
      if (node?.data?.robotId) {
        return {
          value: node.data.robotId,
          source: `节点配置 (${node.id || 'unknown'})`
        };
      }
      // 优先级 2: Context 顶层
      if (ctx?.robotId) {
        return {
          value: ctx.robotId,
          source: 'context.robotId'
        };
      }
      // 优先级 3: Robot 对象
      if (ctx?.robot?.robotId) {
        return {
          value: ctx.robot.robotId,
          source: 'context.robot.robotId'
        };
      }
      return {
        value: undefined,
        source: '未找到'
      };
    };

    const getRobotName = (ctx: any, node: any = {}) => {
      // 优先级 1: 节点配置
      if (node?.data?.robotName) {
        return {
          value: node.data.robotName,
          source: `节点配置 (${node.id || 'unknown'})`
        };
      }
      // 优先级 2: Context 顶层
      if (ctx?.robotName) {
        return {
          value: ctx.robotName,
          source: 'context.robotName'
        };
      }
      // 优先级 3: Robot 对象
      if (ctx?.robot?.robotName) {
        return {
          value: ctx.robot.robotName,
          source: 'context.robot.robotName'
        };
      }
      return {
        value: undefined,
        source: '未找到'
      };
    };

    // 测试不同的 node 配置
    const testCases = [
      {
        name: '无节点配置',
        node: {},
        robotIdResult: getRobotId(context, {}),
        robotNameResult: getRobotName(context, {})
      },
      {
        name: '有节点配置',
        node: { id: 'test-node', data: { robotId: 'from-node', robotName: 'from-node-name' } },
        robotIdResult: getRobotId(context, { id: 'test-node', data: { robotId: 'from-node', robotName: 'from-node-name' } }),
        robotNameResult: getRobotName(context, { id: 'test-node', data: { robotId: 'from-node', robotName: 'from-node-name' } })
      }
    ];

    // 获取关键字段
    const results = {
      robotId: testCases[0].robotIdResult.value,
      robotIdSource: testCases[0].robotIdResult.source,
      robotName: testCases[0].robotNameResult.value,
      robotNameSource: testCases[0].robotNameResult.source,
      sessionId: context?.sessionId,
      messageId: context?.messageId,
      userName: context?.userName,
      groupName: context?.groupName,
      userId: context?.userId,
      groupId: context?.groupId,
      messageContent: context?.message?.content,
      hasRobot: !!context?.robot,
      contextKeys: Object.keys(context || {}),
      testCases
    };

    return NextResponse.json({
      success: true,
      data: results,
      message: 'ContextHelper 测试完成'
    });
  } catch (error: any) {
    console.error('[POST /api/flow-engine/context-debug] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
