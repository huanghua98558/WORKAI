/**
 * 统一的API入口
 * 所有API调用都从这里导入
 */

// 导出API客户端
export { apiClient } from './api-client';
export type { ApiClientFetchOptions } from './api-client';

// 导出响应工具
export { ResponseHelper, ErrorCode, ErrorMessages } from './api-response';
export type { ApiResponse, PaginatedResponse } from './api-response';

// 导出机器人API
export { robotApi, adminRobotApi } from './api-robot';
export type { Robot, RobotStats, CallbackConfig, CallbackHistory, CallbackStats } from './api-robot';

// 导出监控API
export { monitoringApi } from './api-monitoring';
export type {
  SystemHealth,
  MonitorSummary,
  AILogs,
  TokenStats,
  ActiveSession
} from './api-monitoring';
