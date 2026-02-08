/**
 * 机器人相关API封装
 * 统一所有机器人相关的API调用
 */

import { apiClient } from './api-client';
import type { ApiResponse } from './api-response';

// 类型定义
export interface Robot {
  id: string;
  name: string;
  robotId: string;
  nickname?: string;
  status: 'online' | 'offline' | 'unknown';
  isActive: boolean;
  apiBaseUrl?: string;
  apiToken?: string;
  description?: string;
  lastCheckAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
  // WorkTool 详细信息
  company?: string;
  ipAddress?: string;
  isValid?: boolean;
  activatedAt?: string;
  expiresAt?: string;
  messageCallbackEnabled?: boolean;
  extraData?: any;
  // 统计信息
  messagesProcessed?: number;
  successRate?: number;
  healthStatus?: 'healthy' | 'warning' | 'critical';
}

export interface RobotStats {
  robots: Robot[];
  total: number;
  online: number;
  offline: number;
}

export interface CallbackConfig {
  message?: string;
  actionResult?: string;
  groupQrcode?: string;
  robotStatus?: string;
  robotOnline?: string;
  robotOffline?: string;
}

export interface CallbackHistory {
  id: string;
  robotId: string;
  callbackType: string;
  url: string;
  requestData?: any;
  responseData?: any;
  status: 'success' | 'error';
  statusCode?: number;
  errorMessage?: string;
  duration?: number;
  createdAt: string;
}

export interface CallbackStats {
  total: number;
  success: number;
  error: number;
  successRate: number;
  avgDuration: number;
  byType: {
    [key: string]: {
      total: number;
      success: number;
      error: number;
    };
  };
}

/**
 * 机器人API
 */
export const robotApi = {
  /**
   * 获取机器人列表
   */
  getList: (params?: {
    isActive?: boolean;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => apiClient.get<Robot[]>('/api/robots', { params }),

  /**
   * 获取机器人详情
   */
  getById: (id: string) => 
    apiClient.get<Robot>(`/api/robots/${id}`),

  /**
   * 创建机器人
   */
  create: (data: Partial<Robot>) => 
    apiClient.post<Robot>('/api/robots', data),

  /**
   * 更新机器人
   */
  update: (id: string, data: Partial<Robot>) => 
    apiClient.put<Robot>(`/api/robots/${id}`, data),

  /**
   * 删除机器人
   */
  delete: (id: string) => 
    apiClient.delete(`/api/robots/${id}`),

  /**
   * 验证机器人配置
   */
  validate: (data: { robotId: string; apiBaseUrl?: string; apiToken?: string }) => 
    apiClient.post<{ valid: boolean; message?: string }>('/api/robots/validate', data),

  /**
   * 测试机器人连接
   */
  test: (id: string) => 
    apiClient.post<{ status: 'success' | 'error'; message?: string }>(`/api/robots/${id}/test`),

  /**
   * 检查单个机器人状态
   */
  checkStatus: (robotId: string) => 
    apiClient.post<Robot>(`/api/robots/check-status/${robotId}`),

  /**
   * 检查所有机器人状态
   */
  checkStatusAll: () => 
    apiClient.post<Robot[]>('/api/robots/check-status-all'),

  /**
   * 获取机器人回调URL
   */
  getCallbackUrl: (id: string) => 
    apiClient.get<CallbackConfig>(`/api/robots/${id}/callback-url`),

  /**
   * 配置机器人回调
   */
  configCallback: (id: string, data: { callbackType: string; url: string }) => 
    apiClient.post<{ success: boolean; message?: string }>(`/api/robots/${id}/config-callback`, data),

  /**
   * 获取机器人回调配置
   */
  getCallbackConfig: (id: string) => 
    apiClient.get<CallbackConfig>(`/api/robots/${id}/callback-config`),

  /**
   * 获取机器人回调历史
   */
  getCallbackHistory: (id: string, params?: {
    startTime?: string;
    endTime?: string;
    callbackType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) => apiClient.get<CallbackHistory[]>(`/api/robots/${id}/callback-history`, { params }),

  /**
   * 获取机器人回调统计
   */
  getCallbackStats: (id: string, params?: {
    startTime?: string;
    endTime?: string;
  }) => apiClient.get<CallbackStats>(`/api/robots/${id}/callback-stats`, { params }),

  /**
   * 重新生成URL
   */
  regenerateUrls: (id: string) => 
    apiClient.post<{ callbackUrl: string }>(`/api/robots/${id}/regenerate-urls`),
};

/**
 * 机器人管理API (Admin路径，兼容旧代码)
 */
export const adminRobotApi = {
  /**
   * 获取机器人列表（Admin版本）
   */
  getList: (params?: {
    isActive?: boolean;
    status?: string;
    search?: string;
  }) => apiClient.get<Robot[]>('/api/admin/robots', { params }),

  /**
   * 创建机器人（Admin版本）
   */
  create: (data: Partial<Robot>) => 
    apiClient.post<Robot>('/api/admin/robots', data),

  /**
   * 更新机器人（Admin版本）
   */
  update: (id: string, data: Partial<Robot>) => 
    apiClient.put<Robot>(`/api/admin/robots/${id}`, data),

  /**
   * 删除机器人（Admin版本）
   */
  delete: (id: string) => 
    apiClient.delete(`/api/admin/robots/${id}`),

  /**
   * 获取机器人详情（Admin版本）
   */
  getById: (id: string) => 
    apiClient.get<Robot>(`/api/admin/robots/${id}`),
};
