// 流程引擎API服务函数

export interface FlowNode {
  id: string;
  type: string;
  name: string;
  config?: Record<string, any>;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: 'active' | 'inactive' | 'draft';
  trigger_type?: 'webhook' | 'manual' | 'scheduled';
  trigger_config?: Record<string, any>;
  nodes?: FlowNode[];
  edges?: Array<{ source: string; target: string; condition?: string }>;
  variables?: Record<string, any>;
  timeout?: number;
  retryConfig?: { maxRetries: number; retryInterval: number };
  created_at: string;
  updated_at: string;
  created_by?: string;
  execution_count?: number;
  success_rate?: number;
}

export interface FlowInstance {
  id: string;
  definition_id: string;
  definition_name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  trigger_type?: string;
  current_node?: string;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  metadata?: Record<string, any>;
}

// 获取流程定义列表
export async function getFlowDefinitions(params?: {
  isActive?: boolean;
  triggerType?: string;
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; data: FlowDefinition[]; total: number; error?: string }> {
  try {
    const queryString = new URLSearchParams();
    if (params?.isActive !== undefined) queryString.append('isActive', String(params.isActive));
    if (params?.triggerType) queryString.append('triggerType', params.triggerType);
    if (params?.limit) queryString.append('limit', String(params.limit));
    if (params?.offset) queryString.append('offset', String(params.offset));

    const response = await fetch(`/api/flow-engine/definitions${queryString.toString() ? `?${queryString.toString()}` : ''}`);
    const data = await response.json();
    
    return {
      success: data.success !== false,
      data: data.data || [],
      total: data.total || 0,
      error: data.error,
    };
  } catch (error) {
    console.error('获取流程定义失败:', error);
    return { success: false, data: [], total: 0, error: '获取流程定义失败' };
  }
}

// 获取流程定义详情
export async function getFlowDefinition(id: string): Promise<{ success: boolean; data?: FlowDefinition; error?: string }> {
  try {
    const response = await fetch(`/api/flow-engine/definitions/${id}`);
    const data = await response.json();
    
    return {
      success: data.success !== false,
      data: data.data,
      error: data.error,
    };
  } catch (error) {
    console.error('获取流程定义详情失败:', error);
    return { success: false, error: '获取流程定义详情失败' };
  }
}

// 创建流程定义
export async function createFlowDefinition(
  flow: Partial<FlowDefinition>
): Promise<{ success: boolean; data?: FlowDefinition; error?: string }> {
  try {
    const response = await fetch('/api/flow-engine/definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flow),
    });
    const data = await response.json();
    
    return {
      success: data.success !== false,
      data: data.data,
      error: data.error,
    };
  } catch (error) {
    console.error('创建流程定义失败:', error);
    return { success: false, error: '创建流程定义失败' };
  }
}

// 更新流程定义
export async function updateFlowDefinition(
  id: string,
  flow: Partial<FlowDefinition>
): Promise<{ success: boolean; data?: FlowDefinition; error?: string }> {
  try {
    const response = await fetch(`/api/flow-engine/definitions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flow),
    });
    const data = await response.json();
    
    return {
      success: data.success !== false,
      data: data.data,
      error: data.error,
    };
  } catch (error) {
    console.error('更新流程定义失败:', error);
    return { success: false, error: '更新流程定义失败' };
  }
}

// 删除流程定义
export async function deleteFlowDefinition(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/flow-engine/definitions/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    
    return {
      success: data.success !== false,
      error: data.error,
    };
  } catch (error) {
    console.error('删除流程定义失败:', error);
    return { success: false, error: '删除流程定义失败' };
  }
}

// 获取流程实例列表
export async function getFlowInstances(params?: {
  definition_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; data: FlowInstance[]; total: number; error?: string }> {
  try {
    const queryString = new URLSearchParams();
    if (params?.definition_id) queryString.append('flowDefinitionId', params.definition_id);
    if (params?.status) queryString.append('status', params.status);
    if (params?.limit) queryString.append('limit', String(params.limit));
    if (params?.offset) queryString.append('offset', String(params.offset));

    const response = await fetch(`/api/flow-engine/instances${queryString.toString() ? `?${queryString.toString()}` : ''}`);
    const data = await response.json();
    
    return {
      success: data.success !== false,
      data: data.data || [],
      total: data.total || 0,
      error: data.error,
    };
  } catch (error) {
    console.error('获取流程实例失败:', error);
    return { success: false, data: [], total: 0, error: '获取流程实例失败' };
  }
}

// 获取流程实例详情
export async function getFlowInstance(id: string): Promise<{ success: boolean; data?: FlowInstance; error?: string }> {
  try {
    const response = await fetch(`/api/flow-engine/instances/${id}`);
    const data = await response.json();
    
    return {
      success: data.success !== false,
      data: data.data,
      error: data.error,
    };
  } catch (error) {
    console.error('获取流程实例详情失败:', error);
    return { success: false, error: '获取流程实例详情失败' };
  }
}

// 创建流程实例
export async function createFlowInstance(
  instance: Partial<FlowInstance>
): Promise<{ success: boolean; data?: FlowInstance; error?: string }> {
  try {
    const response = await fetch('/api/flow-engine/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(instance),
    });
    const data = await response.json();
    
    return {
      success: data.success !== false,
      data: data.data,
      error: data.error,
    };
  } catch (error) {
    console.error('创建流程实例失败:', error);
    return { success: false, error: '创建流程实例失败' };
  }
}

// 执行流程实例
export async function executeFlowInstance(
  id: string
): Promise<{ success: boolean; data?: FlowInstance; error?: string }> {
  try {
    const response = await fetch(`/api/flow-engine/instances/${id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    
    return {
      success: data.success !== false,
      data: data.data,
      error: data.error,
    };
  } catch (error) {
    console.error('执行流程实例失败:', error);
    return { success: false, error: '执行流程实例失败' };
  }
}
