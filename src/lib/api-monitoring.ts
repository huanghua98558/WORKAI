/**
 * 监控相关API封装
 * 统一所有监控相关的API调用
 */

import { apiClient } from './api-client';
import type { ApiResponse } from './api-response';
import type { Robot, RobotStats } from './api-robot';

// 类型定义
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  startTime?: string;
  database?: {
    status: string;
    latency?: number;
  };
  redis?: {
    status: string;
    latency?: number;
  };
  cache?: {
    status: string;
    stats?: {
      hits: number;
      misses: number;
      hitRate: number;
    };
  };
}

export interface MonitorSummary {
  date: string;
  executions: {
    total: number;
    success: number;
    error: number;
    processing: number;
    successRate: string;
  };
  ai: {
    total: number;
    success: number;
    error: number;
    successRate: string;
  };
  sessions: {
    active: number;
    total: number;
  };
  aiErrors: number;
  totalCallbacks: number;
  aiSuccessRate: string;
  systemMetrics: {
    callbackReceived: number;
    callbackProcessed: number;
    callbackError: number;
    aiRequests: number;
    aiErrors: number;
  };
}

export interface AILogs {
  logs: Array<{
    id: string;
    timestamp: string;
    type: 'intent' | 'reply' | 'error';
    content: string;
    userId?: string;
    groupId?: string;
    robotId?: string;
    tokens?: number;
    cost?: number;
    duration?: number;
  }>;
  total: number;
}

export interface TokenStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  averageTokensPerRequest: number;
  requests: number;
  modelStats: {
    [model: string]: {
      tokens: number;
      cost: number;
      requests: number;
    };
  };
}

export interface ActiveSession {
  sessionId: string;
  userId?: string;
  groupId?: string;
  userName: string;
  groupName: string;
  robotId: string;
  robotName: string;
  robotNickname?: string;
  status: 'auto' | 'human';
  lastActiveTime: string;
  messageCount: number;
  lastMessage?: string;
}

/**
 * 监控API
 */
export const monitoringApi = {
  /**
   * 获取系统健康状态
   */
  getHealth: () => 
    apiClient.get<SystemHealth>('/api/monitoring/health'),

  /**
   * 获取监控摘要
   */
  getSummary: (params?: {
    startDate?: string;
    endDate?: string;
  }) => apiClient.get<MonitorSummary>('/api/monitoring/summary', { params }),

  /**
   * 获取机器人状态统计
   */
  getRobotsStatus: () => 
    apiClient.get<RobotStats>('/api/monitoring/robots-status'),

  /**
   * 获取活跃会话
   */
  getActiveSessions: (params?: {
    limit?: number;
    robotId?: string;
  }) => apiClient.get<ActiveSession[]>('/api/monitoring/active-sessions', { params }),

  /**
   * 获取活跃群组
   */
  getActiveGroups: (params?: {
    limit?: number;
    startTime?: string;
    endTime?: string;
  }) => apiClient.get<Array<{
    groupId: string;
    groupName: string;
    messageCount: number;
    lastActiveTime: string;
  }>>('/api/monitoring/active-groups', { params }),

  /**
   * 获取活跃用户
   */
  getActiveUsers: (params?: {
    limit?: number;
    startTime?: string;
    endTime?: string;
  }) => apiClient.get<Array<{
    userId: string;
    userName: string;
    messageCount: number;
    lastActiveTime: string;
  }>>('/api/monitoring/active-users', { params }),

  /**
   * 获取AI日志
   */
  getAILogs: (params?: {
    limit?: number;
    offset?: number;
    type?: string;
    startTime?: string;
    endTime?: string;
  }) => apiClient.get<AILogs>('/api/monitoring/ai-logs', { params }),

  /**
   * 获取执行记录
   */
  getExecutions: (params?: {
    limit?: number;
    offset?: number;
    status?: string;
    startTime?: string;
    endTime?: string;
  }) => apiClient.get<Array<{
    id: string;
    processingId: string;
    sessionId: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    input: any;
    output?: any;
    error?: string;
    duration?: number;
    createdAt: string;
    completedAt?: string;
  }>>('/api/monitoring/executions', { params }),

  /**
   * 获取Token统计
   */
  getTokenStats: () => 
    apiClient.get<TokenStats>('/api/monitoring/token-stats'),

  /**
   * 创建测试消息
   */
  createTestMessage: (data: {
    robotId: string;
    content: string;
    senderId?: string;
    senderName?: string;
  }) => apiClient.post<{ sessionId: string; messageId: string }>('/api/monitoring/create-test-message'),

  /**
   * 获取执行详情
   */
  getExecutionDetail: (processingId: string) => 
    apiClient.get<any>(`/api/monitoring/executions/${processingId}`),

  /**
   * 检查系统健康（快速版本）
   */
  quickHealthCheck: () => 
    apiClient.get<{ status: string; timestamp: string }>('/api/monitoring/health'),
};
