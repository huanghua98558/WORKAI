/**
 * 统一的API客户端
 * 封装所有API请求，提供统一的接口
 */

import { ApiResponse, ErrorCode, ErrorMessages, ResponseHelper } from './api-response';

export interface ApiClientFetchOptions extends RequestInit {
  params?: Record<string, any>;
  timeout?: number;
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * 添加认证头
   */
  private addAuthHeader(headers: HeadersInit = {}): HeadersInit {
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('access_token') || localStorage.getItem('token')
      : null;
      
    if (token) {
      return {
        ...headers,
        'Authorization': `Bearer ${token}`
      };
    }
    return headers;
  }

  /**
   * 统一fetch方法
   */
  private async request<T>(
    endpoint: string,
    options: ApiClientFetchOptions = {}
  ): Promise<ApiResponse<T>> {
    const { params, timeout = 10000, ...fetchOptions } = options;

    // 构建URL
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    // 超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: this.addAuthHeader({
          ...this.defaultHeaders,
          ...fetchOptions.headers
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 处理HTTP错误
      if (!response.ok) {
        const statusCode = response.status as ErrorCode;
        let errorMessage = '请求失败';
        if (statusCode in ErrorMessages) {
          errorMessage = (ErrorMessages as any)[statusCode];
        }
        
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // 解析失败，使用默认错误信息
        }

        throw new Error(`${response.status}: ${errorMessage}`);
      }

      // 解析响应
      const data = await response.json();

      // 兼容不同的响应格式
      if (data.code !== undefined) {
        // 标准格式: { code, message, data }
        return data;
      } else if (data.success !== undefined) {
        // 兼容格式: { success, data }
        return {
          code: data.success ? 0 : -1,
          message: data.message || (data.success ? 'success' : '操作失败'),
          data: data.data,
          timestamp: new Date().toISOString()
        };
      } else {
        // 兼容格式: { data }
        return ResponseHelper.success(data);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`[API] 请求超时: ${url}`);
          return ResponseHelper.error(ErrorCode.SERVICE_UNAVAILABLE, '请求超时', error.message) as ApiResponse<T>;
        }
        console.error(`[API] 请求失败: ${url}`, error);
        return ResponseHelper.error(ErrorCode.INTERNAL_ERROR, '请求失败', error.message) as ApiResponse<T>;
      }

      return ResponseHelper.error(ErrorCode.INTERNAL_ERROR, '未知错误', String(error)) as ApiResponse<T>;
    }
  }

  /**
   * GET请求
   */
  async get<T>(endpoint: string, options?: ApiClientFetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST请求
   */
  async post<T>(endpoint: string, body?: any, options?: ApiClientFetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * PUT请求
   */
  async put<T>(endpoint: string, body?: any, options?: ApiClientFetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  /**
   * DELETE请求
   */
  async delete<T>(endpoint: string, options?: ApiClientFetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH请求
   */
  async patch<T>(endpoint: string, body?: any, options?: ApiClientFetchOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }
}

// 创建单例
export const apiClient = new ApiClient();
