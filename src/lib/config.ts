/**
 * 统一的 API 配置工具
 *
 * 用于管理所有后端 API 地址配置，避免硬编码
 */

/**
 * 获取后端 API 基础 URL
 *
 * 优先级：
 * 1. BACKEND_URL 环境变量（生产环境）
 * 2. http://localhost:5001（开发环境默认值）
 *
 * @returns 后端 API 基础 URL
 */
export function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5001';
}

/**
 * 获取后端 API 完整 URL
 *
 * @param path - API 路径（如 '/api/robots'）
 * @returns 完整的后端 API URL
 */
export function getBackendApiUrl(path: string): string {
  const baseUrl = getBackendUrl();
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * 获取 WebSocket URL
 *
 * 根据当前协议自动选择 ws:// 或 wss://
 *
 * @param path - WebSocket 路径（如 '/ws/alerts'）
 * @returns 完整的 WebSocket URL
 */
export function getWebSocketUrl(path: string): string {
  const backendUrl = getBackendUrl();
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // 根据 backendUrl 的协议选择 ws 或 wss
  const protocol = backendUrl.startsWith('https://') ? 'wss:' : 'ws:';
  const host = backendUrl.replace(/^https?:\/\//, '');

  return `${protocol}//${host}${normalizedPath}`;
}

/**
 * 判断是否为开发环境
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 判断是否为生产环境
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

// 导出配置对象（方便批量使用）
export const config = {
  backendUrl: getBackendUrl(),
  isDevelopment: isDevelopment(),
  isProduction: isProduction(),
};
