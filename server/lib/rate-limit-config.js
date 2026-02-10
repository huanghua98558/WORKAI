/**
 * 限流配置
 * 为不同的API端点提供差异化的限流策略
 */

/**
 * 全局限流配置（默认）
 */
const globalRateLimit = {
  max: 1000,           // 每分钟最多 1000 次请求
  timeWindow: '1 minute',
  skipOnError: false
};

/**
 * 认证相关端点限流（严格）
 * 防止暴力破解和频繁登录尝试
 */
const authRateLimit = {
  max: 5,              // 每分钟最多 5 次请求
  timeWindow: '1 minute',
  skipOnError: false,
  errorResponseBuilder: (req, context) => {
    return {
      code: 429,
      message: '登录请求过于频繁，请稍后再试',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: context.ttl
    };
  }
};

/**
 * 发送消息限流（中等）
 * 防止消息发送过快
 */
const sendMessageRateLimit = {
  max: 100,            // 每分钟最多 100 次请求
  timeWindow: '1 minute',
  skipOnError: false,
  errorResponseBuilder: (req, context) => {
    return {
      code: 429,
      message: '消息发送过于频繁，请稍后再试',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: context.ttl
    };
  }
};

/**
 * AI 接口限流（中等）
 * 防止 AI 调用过快
 */
const aiRateLimit = {
  max: 50,             // 每分钟最多 50 次请求
  timeWindow: '1 minute',
  skipOnError: false,
  errorResponseBuilder: (req, context) => {
    return {
      code: 429,
      message: 'AI 接口调用过于频繁，请稍后再试',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: context.ttl
    };
  }
};

/**
 * WorkTool 回调限流（宽松）
 * 外部回调，需要允许大量并发
 */
const callbackRateLimit = {
  max: 500,            // 每分钟最多 500 次请求
  timeWindow: '1 minute',
  skipOnError: true,    // 出错时不计数
  continueExceeding: true // 超限时继续处理，不拒绝
};

/**
 * 管理端点限流（严格）
 * 防止管理操作过于频繁
 */
const adminRateLimit = {
  max: 30,             // 每分钟最多 30 次请求
  timeWindow: '1 minute',
  skipOnError: false,
  errorResponseBuilder: (req, context) => {
    return {
      code: 429,
      message: '管理操作过于频繁，请稍后再试',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: context.ttl
    };
  }
};

/**
 * 文件上传限流（严格）
 * 防止大量文件上传消耗服务器资源
 */
const uploadRateLimit = {
  max: 10,             // 每分钟最多 10 次上传
  timeWindow: '1 minute',
  skipOnError: false,
  errorResponseBuilder: (req, context) => {
    return {
      code: 429,
      message: '文件上传过于频繁，请稍后再试',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: context.ttl
    };
  }
};

/**
 * 监控和日志限流（宽松）
 * 监控数据需要实时获取
 */
const monitoringRateLimit = {
  max: 200,            // 每分钟最多 200 次请求
  timeWindow: '1 minute',
  skipOnError: true
};

/**
 * 根据路由路径获取限流配置
 * @param {string} routePath - 路由路径
 * @returns {object} 限流配置
 */
function getRateLimitConfig(routePath) {
  // 认证相关
  if (routePath.startsWith('/api/auth')) {
    return authRateLimit;
  }

  // 发送消息
  if (routePath.includes('/send') || routePath.includes('/sendRawMessage')) {
    return sendMessageRateLimit;
  }

  // AI 接口
  if (routePath.startsWith('/api/ai') || routePath.includes('/ai-io')) {
    return aiRateLimit;
  }

  // WorkTool 回调
  if (routePath.startsWith('/api/worktool/callback')) {
    return callbackRateLimit;
  }

  // 管理端点
  if (routePath.startsWith('/api/admin')) {
    return adminRateLimit;
  }

  // 文件上传
  if (routePath.includes('/upload') || routePath.includes('/avatar')) {
    return uploadRateLimit;
  }

  // 监控和日志
  if (routePath.startsWith('/api/monitoring') || routePath.includes('/logs')) {
    return monitoringRateLimit;
  }

  // 默认配置
  return globalRateLimit;
}

/**
 * 限流配置映射（路由前缀 -> 限流配置）
 */
const rateLimitConfigMap = {
  '/api/auth': authRateLimit,
  '/api/worktool/callback': callbackRateLimit,
  '/api/admin': adminRateLimit,
  '/api/monitoring': monitoringRateLimit,
  '/api/ai': aiRateLimit,
  '/api/avatar': uploadRateLimit
};

module.exports = {
  globalRateLimit,
  authRateLimit,
  sendMessageRateLimit,
  aiRateLimit,
  callbackRateLimit,
  adminRateLimit,
  uploadRateLimit,
  monitoringRateLimit,
  getRateLimitConfig,
  rateLimitConfigMap
};
