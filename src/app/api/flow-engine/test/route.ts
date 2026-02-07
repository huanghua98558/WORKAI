import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/flow-engine/test
 * 手动触发流程测试执行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowName, flowDefinitionId, triggerData } = body;

    if (!flowName && !flowDefinitionId) {
      return NextResponse.json(
        { success: false, error: 'flowName 或 flowDefinitionId 参数必填' },
        { status: 400 }
      );
    }

    // 查找流程定义
    const query = flowDefinitionId
      ? 'SELECT * FROM flow_definitions WHERE id = $1 AND is_active = true'
      : 'SELECT * FROM flow_definitions WHERE name = $1 AND is_active = true';

    const params = flowDefinitionId ? [flowDefinitionId] : [flowName];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到活跃版本的流程定义' },
        { status: 404 }
      );
    }

    const flowDefinition = result.rows[0];

    // 创建流程实例
    const instanceResult = await pool.query(
      `INSERT INTO flow_instances (
        flow_definition_id,
        flow_name,
        status,
        trigger_data,
        started_at
      ) VALUES ($1, $2, 'running', $3, NOW())
      RETURNING *`,
      [flowDefinition.id, flowDefinition.name, triggerData || {}]
    );

    const instance = instanceResult.rows[0];

    // TODO: 实际执行流程逻辑
    // 这里应该调用流程执行引擎
    // 暂时只是创建实例，标记为测试

    return NextResponse.json({
      success: true,
      data: {
        instance: {
          id: instance.id,
          flowDefinitionId: instance.flow_definition_id,
          flowName: instance.flow_name,
          status: instance.status,
          triggerData: instance.trigger_data,
          startedAt: instance.started_at,
        },
        flowDefinition: {
          id: flowDefinition.id,
          name: flowDefinition.name,
          version: flowDefinition.version,
          nodes: flowDefinition.nodes,
          edges: flowDefinition.edges,
        },
      },
      message: '流程测试已启动',
    });
  } catch (error: any) {
    console.error('[POST /api/flow-engine/test] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/flow-engine/test?instanceId=xxx
 * 获取测试执行结果
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const instanceId = searchParams.get('instanceId');

    if (!instanceId) {
      return NextResponse.json(
        { success: false, error: 'instanceId 参数必填' },
        { status: 400 }
      );
    }

    // 查询流程实例
    const instanceResult = await pool.query(
      'SELECT * FROM flow_instances WHERE id = $1',
      [instanceId]
    );

    if (instanceResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到流程实例' },
        { status: 404 }
      );
    }

    const instance = instanceResult.rows[0];

    // 查询执行日志
    const logsResult = await pool.query(
      'SELECT * FROM flow_execution_logs WHERE flow_instance_id = $1 ORDER BY started_at',
      [instanceId]
    );

    return NextResponse.json({
      success: true,
      data: {
        instance: {
          id: instance.id,
          flowDefinitionId: instance.flow_definition_id,
          flowName: instance.flow_name,
          status: instance.status,
          currentNodeId: instance.current_node_id,
          triggerData: instance.trigger_data,
          outputData: instance.output_data,
          errorMessage: instance.error_message,
          startedAt: instance.started_at,
          completedAt: instance.completed_at,
          processingTime: instance.processing_time,
          retryCount: instance.retry_count,
        },
        logs: logsResult.rows.map((log) => ({
          id: log.id,
          nodeId: log.node_id,
          nodeType: log.node_type,
          nodeName: log.node_name,
          status: log.status,
          inputData: log.input_data,
          outputData: log.output_data,
          errorMessage: log.error_message,
          startedAt: log.started_at,
          completedAt: log.completed_at,
          processingTime: log.processing_time,
        })),
      },
    });
  } catch (error: any) {
    console.error('[GET /api/flow-engine/test] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
