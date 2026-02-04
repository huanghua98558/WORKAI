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
const adminApiRoutes = require('./routes/admin.api');
const qaApiRoutes = require('./routes/qa.api');
const robotApiRoutes = require('./routes/robot.api');
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
const authApiRoutes = require('./routes/auth.api');

const redisClient = require('./lib/redis');
const { getLogger, fastifyRequestLogger } = require('./lib/logger');

const robotService = require('./services/robot.service');
const robotCommandService = require('./services/robot-command.service');

// 获取主模块日志
const logger = getLogger('APP');

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
fastify.register(cors, {
  origin: true, // 生产环境建议配置具体域名
  credentials: true
});

fastify.register(helmet, {
  contentSecurityPolicy: false // 开发环境关闭 CSP
});

fastify.register(rateLimit, {
  max: 1000,
  timeWindow: '1 minute',
  redis: process.env.REDIS_URL ? {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || 6379),
    db: parseInt(process.env.REDIS_DB || 0)
  } : undefined
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
fastify.register(authApiRoutes, { prefix: '/api/auth' });
fastify.register(worktoolCallbackRoutes, { prefix: '/api/worktool/callback' });
fastify.register(adminApiRoutes, { prefix: '/api/admin' });
fastify.register(qaApiRoutes, { prefix: '/api/admin' });
fastify.register(robotApiRoutes, { prefix: '/api/admin' });
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
fastify.register(intentConfigApiRoutes, { prefix: '/api/ai/intents' });

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

// 健康检查
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    startTime: SERVER_START_TIME,
    uptime: Date.now() - SERVER_START_TIME,
    version: process.env.npm_package_version || '1.0.0'
  };
});

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
    logger.info('启动指令队列处理器', { interval: '3s' });
    robotCommandService.startQueueProcessor('main-worker', 3000); // 每3秒处理一次（优化后）

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
