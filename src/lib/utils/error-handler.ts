/**
 * 错误处理和日志工具
 */

import { NextRequest, NextResponse } from 'next/server';

// 错误类型
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

// 错误类
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 预定义错误
export const Errors = {
  // 验证错误
  invalidInput: (message: string, details?: any) => 
    new AppError(ErrorType.VALIDATION_ERROR, message, 400, details),
  
  // 未找到
  notFound: (resource: string, id?: string) => 
    new AppError(ErrorType.NOT_FOUND, `${resource}${id ? ` (${id})` : ''} 不存在`, 404),
  
  // 未授权
  unauthorized: (message: string = '未授权') => 
    new AppError(ErrorType.UNAUTHORIZED, message, 401),
  
  // 禁止访问
  forbidden: (message: string = '权限不足') => 
    new AppError(ErrorType.FORBIDDEN, message, 403),
  
  // 冲突
  conflict: (message: string) => 
    new AppError(ErrorType.CONFLICT, message, 409),
  
  // 数据库错误
  databaseError: (message: string, details?: any) => 
    new AppError(ErrorType.DATABASE_ERROR, message, 500, details),
  
  // 外部 API 错误
  externalApiError: (service: string, message: string) => 
    new AppError(ErrorType.EXTERNAL_API_ERROR, `${service}: ${message}`, 502),
  
  // 内部错误
  internalError: (message: string, details?: any) => 
    new AppError(ErrorType.INTERNAL_ERROR, message, 500, details),
  
  // 速率限制
  rateLimitExceeded: () => 
    new AppError(ErrorType.RATE_LIMIT_EXCEEDED, '请求过于频繁，请稍后再试', 429),
};

/**
 * 错误处理中间件
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // 如果是 AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: error.type,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  // 如果是标准 Error
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.INTERNAL_ERROR,
          message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误',
        },
      },
      { status: 500 }
    );
  }

  // 未知错误
  return NextResponse.json(
    {
      success: false,
      error: {
        type: ErrorType.INTERNAL_ERROR,
        message: '未知错误',
      },
    },
    { status: 500 }
  );
}

/**
 * 异步错误处理包装器
 */
export function asyncHandler(
  fn: (...args: any[]) => Promise<NextResponse>
) {
  return async (...args: any[]): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * 验证请求体
 */
export function validateBody<T>(body: any, requiredFields: string[]): T {
  const missingFields = requiredFields.filter(field => !body[field]);
  
  if (missingFields.length > 0) {
    throw Errors.invalidInput(
      `缺少必填字段: ${missingFields.join(', ')}`,
      { missingFields }
    );
  }

  return body as T;
}

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * 日志记录器
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${metaStr}`;
  }

  /**
   * 输出日志到控制台
   */
  private log(level: LogLevel, message: string, meta?: any) {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  debug(message: string, meta?: any) {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: any) {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: any) {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, error?: Error | any, meta?: any) {
    const errorMeta = {
      ...meta,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      } : error,
    };
    this.log(LogLevel.ERROR, message, errorMeta);
  }

  /**
   * 记录 API 请求
   */
  logApiRequest(request: NextRequest, meta?: any) {
    this.info('API Request', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      ...meta,
    });
  }

  /**
   * 记录 API 响应
   */
  logApiResponse(response: NextResponse, meta?: any) {
    this.info('API Response', {
      status: response.status,
      ...meta,
    });
  }

  /**
   * 记录数据库查询
   */
  logDbQuery(query: string, params?: any, duration?: number) {
    this.debug('Database Query', {
      query,
      params,
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  /**
   * 记录外部 API 调用
   */
  logExternalApiCall(url: string, method: string, meta?: any) {
    this.info('External API Call', {
      url,
      method,
      ...meta,
    });
  }
}

/**
 * 创建日志记录器
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// 全局日志记录器
export const logger = new Logger('App');

/**
 * 统一的 API 响应格式
 */
export class ApiResponse {
  static success<T>(data: T, message?: string, status: number = 200): NextResponse {
    return NextResponse.json(
      {
        success: true,
        data,
        message,
      },
      { status }
    );
  }

  static error(error: AppError): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: error.type,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  static created<T>(data: T, message?: string): NextResponse {
    return this.success(data, message || '创建成功', 201);
  }

  static noContent(message?: string): NextResponse {
    return NextResponse.json(
      {
        success: true,
        message: message || '操作成功',
      },
      { status: 204 }
    );
  }
}
