/**
 * API响应格式统一工具类
 * 统一所有API的返回格式
 */

export interface ApiResponse<T = any> {
  code: number;           // 0=成功, 非0=失败
  message: string;        // 提示信息
  data?: T;              // 业务数据
  error?: string;        // 错误详情（可选）
  timestamp?: string;    // 服务器时间（可选）
}

export interface PaginatedResponse<T> {
  code: number;
  message: string;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  timestamp?: string;
}

export class ResponseHelper {
  /**
   * 成功响应
   */
  static success<T>(data: T, message = '操作成功'): ApiResponse<T> {
    return {
      code: 0,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 错误响应
   */
  static error(code: number, message: string, error?: string): ApiResponse<null> {
    const response: ApiResponse<null> = {
      code,
      message,
      error,
      timestamp: new Date().toISOString()
    };

    // 开发环境添加堆栈信息
    if (process.env.NODE_ENV === 'development' && error) {
      (response as any).stack = new Error().stack;
    }

    return response;
  }

  /**
   * 分页响应
   */
  static paginated<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number
  ): PaginatedResponse<T> {
    return {
      code: 0,
      message: 'success',
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 检查响应是否成功
   */
  static isSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { code: 0 } {
    return response.code === 0;
  }
}

/**
 * 常用错误码
 */
export enum ErrorCode {
  SUCCESS = 0,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  VALIDATION_ERROR = 400,
  INTERNAL_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

/**
 * 常用错误信息
 */
export const ErrorMessages = {
  [ErrorCode.UNAUTHORIZED]: '未授权，请先登录',
  [ErrorCode.FORBIDDEN]: '没有权限访问',
  [ErrorCode.NOT_FOUND]: '请求的资源不存在',
  [ErrorCode.VALIDATION_ERROR]: '请求参数错误',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用'
};
