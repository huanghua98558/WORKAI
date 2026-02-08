/**
 * API 客户端 - 自动处理认证和令牌刷新
 */

import type { ApiError } from '@/types/auth';

class ApiClient {
  private baseURL = '/api';

  // 创建 axios-like 的请求方法
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // 获取 token
    const token = localStorage.getItem('access_token');

    // 添加认证头
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    const result = await response.json();

    // 处理 401 错误
    if (response.status === 401) {
      // 清除 token 并跳转到登录页
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }

      throw new Error('未授权，请重新登录');
    }

    // 处理其他错误
    if (result.code !== 0) {
      const error: ApiError = {
        code: result.code || -1,
        message: result.message || '请求失败',
        error: result.error,
      };
      throw error;
    }

    return result.data;
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();

// 便捷的 API 方法
export const api = {
  // 认证相关
  auth: {
    login: (username: string, password: string) =>
      apiClient.post('/auth/login', { username, password }),
    register: (data: any) =>
      apiClient.post('/auth/register', data),
    logout: () =>
      apiClient.post('/auth/logout', {}),
    verify: (token: string) =>
      apiClient.post('/auth/verify', { token }),
    refresh: (refreshToken: string) =>
      apiClient.post('/auth/refresh', { refreshToken }),
    me: () =>
      apiClient.get('/auth/me'),
  },

  // 机器人相关
  robots: {
    list: (params?: any) =>
      apiClient.get('/robots', params),
    get: (id: string) =>
      apiClient.get(`/robots/${id}`),
    getByRobotId: (robotId: string) =>
      apiClient.get(`/robots/by-robot-id/${robotId}`),
    create: (data: any) =>
      apiClient.post('/robots', data),
    update: (id: string, data: any) =>
      apiClient.put(`/robots/${id}`, data),
    delete: (id: string) =>
      apiClient.delete(`/robots/${id}`),
    validate: (data: any) =>
      apiClient.post('/robots/validate', data),
    test: (data: any) =>
      apiClient.post('/robots/test', data),
    testAndSave: (id: string) =>
      apiClient.post(`/robots/${id}/test-and-save`, {}),
    configCallback: (id: string, data: any) =>
      apiClient.post(`/robots/${id}/config-callback`, data),
  },
};

export default apiClient;
