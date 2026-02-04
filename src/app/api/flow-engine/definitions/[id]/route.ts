import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// 后端数据转前端数据
function transformToFrontend(data: any) {
  return {
    ...data,
    status: data.isActive ? 'active' : 'inactive',
    trigger_type: data.triggerType,
    trigger_config: data.triggerConfig || {},
    created_at: data.createdAt,
    updated_at: data.updatedAt,
    created_by: data.createdBy,
    edges: data.edges || [],
    variables: data.variables || {},
    timeout: data.timeout || 30000,
    retryConfig: data.retryConfig || { maxRetries: 3, retryInterval: 1000 },
    // 保留原始字段
    is_active: data.isActive,
    triggerType: data.triggerType,
    triggerConfig: data.triggerConfig,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy,
  };
}

// 前端数据转后端数据
function transformToBackend(data: any) {
  return {
    ...data,
    is_active: data.status === 'active',
    trigger_type: data.trigger_type,
    trigger_config: data.trigger_config || {},
    updated_at: new Date().toISOString(),
    created_by: data.created_by || null,
    retry_config: data.retryConfig || { maxRetries: 3, retryInterval: 1000 },
  };
}

/**
 * GET /api/flow-engine/definitions/[id]
 * 获取流程定义详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const url = new URL(`${BACKEND_URL}/api/flow-engine/definitions/${id}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // 转换数据格式
    if (data.data) {
      const transformedData = transformToFrontend(data.data);
      return NextResponse.json({ 
        ...data, 
        data: transformedData 
      }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Get flow definition proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get flow definition' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/flow-engine/definitions/[id]
 * 更新流程定义
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const body = await request.json();
    
    // 转换前端字段为后端字段
    const transformedBody = transformToBackend(body);
    
    const url = new URL(`${BACKEND_URL}/api/flow-engine/definitions/${id}`);

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedBody),
    });

    const data = await response.json();
    
    // 转换返回数据的字段名称
    if (data.data) {
      const transformedData = transformToFrontend(data.data);
      return NextResponse.json({ 
        ...data, 
        data: transformedData 
      }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Update flow definition proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update flow definition' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/flow-engine/definitions/[id]
 * 删除流程定义
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const url = new URL(`${BACKEND_URL}/api/flow-engine/definitions/${id}`);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Delete flow definition proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete flow definition' },
      { status: 500 }
    );
  }
}
