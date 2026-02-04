import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

/**
 * 字段转换工具函数
 * 后端使用 snake_case (is_active, created_at)
 * 前端期望 camelCase (status, created_at)
 */

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
 * GET /api/flow-engine/definitions
 * 获取流程定义列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const url = new URL(`${BACKEND_URL}/api/flow-engine/definitions`);
    
    // 转发查询参数
    if (searchParams.get('isActive')) {
      url.searchParams.append('isActive', searchParams.get('isActive')!);
    }
    if (searchParams.get('triggerType')) {
      url.searchParams.append('triggerType', searchParams.get('triggerType')!);
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
      const transformedData = data.data.map(transformToFrontend);
      return NextResponse.json({
        success: data.success !== false,
        data: transformedData,
        total: data.total || transformedData.length,
        error: data.error,
      }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Flow engine definitions proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch flow definitions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flow-engine/definitions
 * 创建新的流程定义
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 转换前端字段为后端字段
    const transformedBody = transformToBackend(body);
    
    const url = new URL(`${BACKEND_URL}/api/flow-engine/definitions`);

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
      const transformedData = transformToFrontend(data.data);
      return NextResponse.json({ 
        ...data, 
        data: transformedData 
      }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Create flow definition proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create flow definition' },
      { status: 500 }
    );
  }
}
