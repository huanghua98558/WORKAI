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

// 前端数据转后端数据
function transformInstanceToBackend(data: any) {
  return {
    ...data,
    flowDefinitionId: data.definition_id,
    flowName: data.definition_name,
    currentNodeId: data.current_node,
    triggerData: data.input_data,
    result: data.output_data,
    errorMessage: data.error_message,
    startedAt: data.started_at,
    completedAt: data.completed_at,
  };
}

/**
 * GET /api/flow-engine/instances
 * 获取流程实例列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const url = new URL(`${BACKEND_URL}/api/flow-engine/instances`);
    
    // 转发查询参数
    if (searchParams.get('flowDefinitionId')) {
      url.searchParams.append('flowDefinitionId', searchParams.get('flowDefinitionId')!);
    }
    if (searchParams.get('status')) {
      url.searchParams.append('status', searchParams.get('status')!);
    }
    if (searchParams.get('limit')) {
      url.searchParams.append('limit', searchParams.get('limit')!);
    }
    if (searchParams.get('offset')) {
      url.searchParams.append('offset', searchParams.get('offset')!);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // 转换数据格式
    if (data.data && Array.isArray(data.data)) {
      const transformedData = data.data.map(transformInstanceToFrontend);
      return NextResponse.json({
        success: data.success !== false,
        data: transformedData,
        total: data.total || transformedData.length,
        error: data.error,
      }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Flow engine instances proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch flow instances' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flow-engine/instances
 * 创建新的流程实例
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 转换前端字段为后端字段
    const transformedBody = {
      flowDefinitionId: body.definition_id,
      triggerData: body.input_data || body.trigger_data || {},
      metadata: body.metadata || {},
    };
    
    const url = new URL(`${BACKEND_URL}/api/flow-engine/instances`);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedBody),
    });

    const data = await response.json();
    
    // 转换返回数据的字段名称
    if (data.data) {
      const transformedData = transformInstanceToFrontend(data.data);
      return NextResponse.json({ 
        ...data, 
        data: transformedData 
      }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Create flow instance proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create flow instance' },
      { status: 500 }
    );
  }
}
