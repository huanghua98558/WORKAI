/**
 * WorkTool AI 中枢系统 - 主应用入口
 * 企业微信群智能服务型 AI 中枢系统
 */

require('dotenv').config();

// 强制使用数据库模式（PostgreSQL）
// 本系统必须使用数据库，不支持内存模式
console.log('📊 运行模式: 数据库模式 (PostgreSQL) - 强制启用');

// 记录服务器启动时间
const SERVER_START_TIME = Date.now();

const Fastify = require('fastify');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');
const multipart = require('@fastify/multipart');
const websocket = require('@fastify/websocket');

const worktoolCallbackRoutes = require('./routes/worktool.callback');
const worktoolSendOssImageApiRoutes = require('./routes/worktool-send-oss-image.api');
const worktoolConversionRobotApiRoutes = require('./routes/worktool-conversion-robot.api');
const worktoolRobotApiRoutes = require('./routes/worktool-robot.api');
const adminApiRoutes = require('./routes/admin.api');
const qaApiRoutes = require('./routes/qa.api');
// robot.api.js 已删除，使用 robot-protected.api.js 替代（更安全，带权限控制）
const robotCommandApiRoutes = require('./routes/robot-command.api');
const debugApiRoutes = require('./routes/debug.api');
const executionTrackerApiRoutes = require('./routes/execution-tracker.api');
const aiIoApiRoutes = require('./routes/ai-io.api');
const systemLogsApiRoutes = require('./routes/system-logs.api');
const operationLogsApiRoutes = require('./routes/operation-logs.api');
const alertConfigApiRoutes = require('./routes/alert-config.api');
const alertEnhancedApiRoutes = require('./routes/alert-enhanced.api');
const monitoringApiRoutes = require('./routes/monitoring.api');
const promptApiRoutes = require('./routes/prompt.api');
const promptInitApiRoutes = require('./routes/prompt-init.api');
const robotRolesApiRoutes = require('./routes/robot-roles.api');
const robotGroupsApiRoutes = require('./routes/robot-groups.api');
const documentApiRoutes = require('./routes/document.api');
const notificationApiRoutes = require('./routes/notification.api');
const intentConfigApiRoutes = require('./routes/intent-config.api');
const flowEngineApiRoutes = require('./routes/flow-engine.api');
const riskApiRoutes = require('./routes/risk.api');
const collabApiRoutes = require('./routes/collab.api');
// auth.api.js 已删除，使用 auth-complete.api.js 替代（功能更完整，包含审计日志和会话管理）
console.log('[app.js] Attempting to load auth-complete.api...');
const authCompleteApiRoutes = require('./routes/auth-complete.api');
console.log('[app.js] auth-complete.api loaded successfully');
const avatarApiRoutes = require('./routes/avatar.api');
console.log('[app.js] avatar.api loaded successfully');
const permissionApiRoutes = require('./routes/permission.api');
console.log('[app.js] permission.api loaded successfully');
console.log('[app.js] Attempting to load apikey.api...');
const apiKeyApiRoutes = require('./routes/apikey.api');
console.log('[app.js] apikey.api loaded successfully');
console.log('[app.js] Attempting to load ai-module.api...');
const aiModuleApiRoutes = require('./routes/ai-module.api');
console.log('[app.js] ai-module.api loaded successfully');
console.log('[app.js] Attempting to load robot-monitoring.api...');
const robotMonitoringApiRoutes = require('./routes/robot-monitoring.api');
console.log('[app.js] robot-monitoring.api loaded successfully');
console.log('[app.js] Attempting to load sse.api...');
const sseApiRoutes = require('./routes/sse.api');
console.log('[app.js] sse.api loaded successfully');
console.log('[app.js] Attempting to load sse-test.api...');
const sseTestApiRoutes = require('./routes/sse-test.api');
console.log('[app.js] sse-test.api loaded successfully');

const redisClient = require('./lib/redis');
const { getLogger, fastifyRequestLogger } = require('./lib/logger');
const { corsConfig } = require('./lib/cors');
const { getCspConfig } = require('./lib/csp');
const prometheusService = require('./lib/prometheus');
const cacheService = require('./lib/cache');
const cacheWarmupService = require('./services/cache-warmup.service');
const { getRateLimitConfig } = require('./lib/rate-limit-config');

// 获取主模块日志
const logger = getLogger('APP');

const robotService = require('./services/robot.service');
const robotCommandService = require('./services/robot-command.service');

// 初始化缓存服务（同步等待，确保在服务启动前完成）
let cacheInitialized = false;
cacheService.init().then(() => {
  cacheInitialized = true;
  logger.info('缓存服务初始化成功');
}).catch((error) => {
  logger.warn('缓存服务初始化失败', { error: error.message });
});

// 初始化 Fastify 实例
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

// Redis 可选配置 - 如果 Redis 不可用，使用内存模式
let redisAvailable = false;
redisClient.connect().then(() => {
  redisAvailable = true;
  logger.info('Redis 客户端已连接', { mode: 'redis' });
}).catch((error) => {
  logger.warn('Redis 连接失败，切换到内存模式', { error: error.message, mode: 'memory' });
});

// 注册插件
// 使用安全的CORS配置（白名单模式）
fastify.register(cors, corsConfig);

// 使用CSP配置（根据环境自动选择）
fastify.register(helmet, getCspConfig());

// rate-limit 使用内存模式（避免 Upstash Redis 连接限制）
// 根据不同的路由使用不同的限流策略
fastify.register(rateLimit, {
  max: 1000,
  timeWindow: '1 minute',
  // 使用 addHeaders 配置，在响应头中添加限流信息
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
    'retry-after': true
  },
  // 错误响应自定义
  errorResponseBuilder: (req, context) => {
    const routePath = req.url;
    const limitConfig = getRateLimitConfig(routePath);

    logger.warn('[限流] 请求被限流', {
      ip: req.ip,
      url: routePath,
      limit: context.limit,
      remaining: context.remaining,
      reset: context.reset
    });

    return {
      code: 429,
      message: limitConfig.errorResponseBuilder?.(req, context)?.message || '请求过于频繁，请稍后再试',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(context.ttl / 1000)
    };
  },
  // keyGenerator 自定义限流键（使用 IP + 路径前缀）
  keyGenerator: (req) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const path = req.url;
    // 提取主要路径前缀（如 /api/auth, /api/admin 等）
    const pathPrefix = path.split('/').slice(0, 3).join('/');
    return `${ip}:${pathPrefix}`;
  }
  // 不使用 redis 存储，使用内存存储
});

// 注册文件上传插件
fastify.register(multipart, {
  attachFieldsToBody: true,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  }
});

// 注册 WebSocket 插件
fastify.register(websocket);

// WebSocket 连接管理
const wsClients = new Set();

// WebSocket 心跳定时器
const heartbeatInterval = setInterval(() => {
  wsClients.forEach(ws => {
    if (ws.isAlive === false) {
      ws.close();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // 每30秒心跳一次

// 注册请求日志中间件
fastifyRequestLogger(fastify);

// 注册路由
fastify.register(worktoolCallbackRoutes, { prefix: '/api/worktool/callback' });
fastify.register(worktoolSendOssImageApiRoutes, { prefix: '/api/worktool' });
fastify.register(worktoolConversionRobotApiRoutes, { prefix: '/api/worktool' });
fastify.register(worktoolRobotApiRoutes, { prefix: '/api/worktool/robot' });
fastify.register(adminApiRoutes, { prefix: '/api/admin' });
fastify.register(qaApiRoutes, { prefix: '/api/admin' });
// robot.api.js 已删除，使用 robot-protected.api.js 替代
fastify.register(robotCommandApiRoutes, { prefix: '/api/admin' });
fastify.register(debugApiRoutes, { prefix: '/api/admin' });
fastify.register(executionTrackerApiRoutes, { prefix: '/api/admin/execution' });
fastify.register(aiIoApiRoutes, { prefix: '/api' });
fastify.register(systemLogsApiRoutes, { prefix: '/api' });
fastify.register(operationLogsApiRoutes, { prefix: '/api' });
fastify.register(alertConfigApiRoutes, { prefix: '/api' });
fastify.register(alertEnhancedApiRoutes, { prefix: '/api' });
fastify.register(monitoringApiRoutes, { prefix: '/api' });
fastify.register(promptApiRoutes, { prefix: '/api' });
fastify.register(promptInitApiRoutes, { prefix: '/api' });
fastify.register(robotRolesApiRoutes, { prefix: '/api' });
fastify.register(robotGroupsApiRoutes, { prefix: '/api' });
fastify.register(documentApiRoutes, { prefix: '/api/admin' });
fastify.register(notificationApiRoutes, { prefix: '/api' });
// 消息管理API（用于发送和查询消息）
console.log('[app.js] Attempting to load messages.api...');
const messagesApiRoutes = require('./routes/messages.api');
console.log('[app.js] messages.api loaded successfully');
fastify.register(messagesApiRoutes, { prefix: '/api' });
fastify.register(intentConfigApiRoutes, { prefix: '/api/ai/intents' });
fastify.register(flowEngineApiRoutes, { prefix: '/api/flow-engine' });
// 注册跟踪任务 API
const trackTasksApiRoutes = require('./routes/track-tasks.api');
fastify.register(trackTasksApiRoutes, { prefix: '/api/flow-engine' });
fastify.register(riskApiRoutes, { prefix: '/api' });
// AI 模块 API（使用 /proxy 前缀以匹配前端调用）
fastify.register(aiModuleApiRoutes, { prefix: '/api/proxy/ai' });
fastify.register(collabApiRoutes, { prefix: '/api/collab' });
// 机器人监控 API
fastify.register(robotMonitoringApiRoutes, { prefix: '/api/monitoring' });
// 使用完整的认证API（替换原有的 auth.api）
fastify.register(authCompleteApiRoutes, { prefix: '/api/auth' });
// 注册头像上传API
fastify.register(avatarApiRoutes, { prefix: '/api/avatar' });
// 注册权限管理API
fastify.register(permissionApiRoutes, { prefix: '/api/permissions' });
fastify.register(apiKeyApiRoutes, { prefix: '/api/apikeys' });
// 注册SSE实时消息推送API
fastify.register(sseApiRoutes, { prefix: '/api' });
// 注册SSE测试路由
fastify.register(sseTestApiRoutes, { prefix: '/api' });
// 注册统一分析API
const unifiedAnalysisApiRoutes = require('./routes/unified-analysis.api');
console.log('[app.js] unified-analysis.api loaded successfully');
fastify.register(unifiedAnalysisApiRoutes, { prefix: '/api/analysis' });

// Prometheus 监控端点
fastify.get('/metrics', async (request, reply) => {
  reply.type(prometheusService.getContentType());
  return await prometheusService.getMetrics();
});

// 健康检查端点（包含缓存统计）
fastify.get('/health', async (request, reply) => {
  const cacheStats = await cacheService.getStats();
  return {
    status: 'healthy',
    uptime: process.uptime(),
    cache: cacheStats
  };
});

// WebSocket 路由
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    logger.info('WebSocket 客户端已连接', { ip: req.ip });
    wsClients.add(connection);
    connection.isAlive = true;

    // 发送欢迎消息
    connection.socket.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
      message: 'WebSocket 连接已建立'
    }));

    // 处理消息
    connection.socket.on('message', message => {
      try {
        const data = JSON.parse(message.toString());
        logger.info('收到 WebSocket 消息', { type: data.type });

        // 处理 ping
        if (data.type === 'ping') {
          connection.socket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        logger.error('WebSocket 消息处理失败', { error: error.message });
      }
    });

    // 处理 pong
    connection.socket.on('pong', () => {
      connection.isAlive = true;
    });

    // 连接关闭
    connection.socket.on('close', () => {
      logger.info('WebSocket 客户端已断开');
      wsClients.delete(connection);
    });

    // 错误处理
    connection.socket.on('error', (error) => {
      logger.error('WebSocket 连接错误', { error: error.message });
      wsClients.delete(connection);
    });
  });
});

// 导出 WebSocket 客户端管理器（供其他服务使用）
global.wsClients = wsClients;

// 启动 Prometheus 缓存指标更新器（每 30 秒更新一次）
prometheusService.startCacheMetricsUpdater(cacheService, 30000);

logger.info('[Prometheus] 缓存指标更新器已启动');

// 执行缓存预热（等待缓存服务初始化完成后执行）
(async () => {
  try {
    // 等待缓存服务初始化完成（最多等待 30 秒）
    const maxWaitTime = 30000;
    const startTime = Date.now();

    while (!cacheInitialized && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!cacheInitialized) {
      logger.error('[启动] 缓存服务初始化超时，跳过缓存预热');
      return;
    }

    // 执行缓存预热
    await cacheWarmupService.warmup();
  } catch (error) {
    logger.error('[启动] 缓存预热失败', { error: error.message });
  }
})();

// 启动服务器
const start = async () => {
  try {
    const PORT = process.env.PORT || 5001;
    const HOST = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port: PORT, host: HOST });

    logger.info('WorkTool AI 中枢系统启动成功', {
      port: PORT,
      host: HOST,
      url: `http://${HOST}:${PORT}`,
      adminUrl: `http://${HOST}:${PORT}/admin`,
      healthUrl: `http://${HOST}:${PORT}/health`
    });

    // 启动机器人状态定时检查任务（每5分钟检查一次）
    logger.info('启动机器人状态定时检查任务', { interval: '5min' });
    const CHECK_INTERVAL = 5 * 60 * 1000; // 5分钟

    const checkRobotsTask = async () => {
      try {
        logger.info('开始检查所有机器人状态');
        const results = await robotService.checkAllActiveRobots();
        const onlineCount = results.filter(r => r.status === 'online').length;
        const offlineCount = results.filter(r => r.status === 'offline').length;
        const errorCount = results.filter(r => r.status === 'error').length;
        logger.info('机器人状态检查完成', {
          online: onlineCount,
          offline: offlineCount,
          error: errorCount,
          total: results.length
        });
      } catch (error) {
        logger.error('机器人状态检查失败', { error: error.message });
      }
    };
    
    // 立即执行一次
    checkRobotsTask();

    // 设置定时任务
    const checkIntervalId = setInterval(checkRobotsTask, CHECK_INTERVAL);

    logger.info('机器人状态检查已配置', { interval: '5min' });

    // 启动指令队列处理器
    robotCommandService.startQueueProcessor('main-worker', 3000); // 每3秒处理一次
    logger.info('指令队列处理器已启动');

  } catch (err) {
    logger.fatal('服务器启动失败', { error: err.message, stack: err.stack });
    process.exit(1);
  }
};

start();

// 全局错误处理 - 防止未捕获的异常导致服务崩溃
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
    errorName: error.name,
    errorCode: error.code
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise)
  });
});

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('收到 SIGTERM 信号，开始优雅关闭...');
  await fastify.close();
  logger.info('服务器已优雅关闭');
});

process.on('SIGINT', async () => {
  logger.info('收到 SIGINT 信号，开始优雅关闭...');
  await fastify.close();
  logger.info('服务器已优雅关闭');
});

module.exports = fastify;
