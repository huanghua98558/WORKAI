import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// 后端数据转前端数据
function transformInstanceToFrontend(data: any) {
  return {
    ...data,
    definition_id: data.flow_definition_id,
    definition_name: data.flow_name,
    current_node: data.current_node_id,
    input_data: data.trigger_data,
    output_data: data.result,
    error_message: data.error_message,
    started_at: data.started_at,
    completed_at: data.completed_at,
    // 保留原始字段
    flowDefinitionId: data.flow_definition_id,
    flowName: data.flow_name,
    currentNodeId: data.current_node_id,
    triggerData: data.trigger_data,
    result: data.result,
    errorMessage: data.error_message,
    startedAt: data.started_at,
    completedAt: data.completed_at,
  };
}

/**
 * GET /api/flow-engine/instances/[id]
 * 获取流程实例详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const url = new URL(`${BACKEND_URL}/api/flow-engine/instances/${id}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // 转换数据格式
    if (data.data) {
      const transformedData = transformInstanceToFrontend(data.data);
      return NextResponse.json({ 
        ...data, 
        data: transformedData 
      }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get flow instance proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get flow instance' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flow-engine/instances/[id]/execute
 * 执行流程实例
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const url = new URL(`${BACKEND_URL}/api/flow-engine/instances/${id}/execute`);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Execute flow instance proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute flow instance' },
      { status: 500 }
    );
  }
}
