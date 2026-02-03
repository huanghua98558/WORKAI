/**
 * WorkTool AI 中枢系统 - 主应用入口
 * 企业微信群智能服务型 AI 中枢系统
 */

require('dotenv').config();

// 根据环境变量选择模式（默认使用数据库模式）
// 如果需要内存模式，可以设置 USE_MEMORY_MODE=true
if (process.env.USE_MEMORY_MODE !== 'true') {
  console.log('📊 运行模式: 数据库模式 (PostgreSQL)');
} else {
  console.log('📊 运行模式: 内存模式 (仅用于测试)');
}

// 记录服务器启动时间
const SERVER_START_TIME = Date.now();

const Fastify = require('fastify');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');
const multipart = require('@fastify/multipart');

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
const robotRolesApiRoutes = require('./routes/robot-roles.api');
const robotGroupsApiRoutes = require('./routes/robot-groups.api');
const documentApiRoutes = require('./routes/document.api');

const redisClient = require('./lib/redis');

const robotService = require('./services/robot.service');
const robotCommandService = require('./services/robot-command.service');

// 初始化 Fastify 实例
// 禁用日志输出，避免频繁的请求日志刷屏
const fastify = Fastify({
  logger: false // 禁用 Fastify 内置的请求日志
});

// Redis 可选配置 - 如果 Redis 不可用，使用内存模式
let redisAvailable = false;
redisClient.connect().then(() => {
  redisAvailable = true;
  console.log('📊 Redis 状态: 已连接');
}).catch((error) => {
  console.warn('⚠️  Redis 不可用，系统将以内存模式运行');
  console.log('📊 Redis 状态: 内存模式');
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

// 注册路由
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
fastify.register(robotRolesApiRoutes, { prefix: '/api' });
fastify.register(robotGroupsApiRoutes, { prefix: '/api' });
fastify.register(documentApiRoutes, { prefix: '/api/admin' });

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
    
    // 启动机器人状态定时检查任务（每5分钟检查一次）
    console.log('🤖 启动机器人状态定时检查任务...');
    const CHECK_INTERVAL = 5 * 60 * 1000; // 5分钟
    
    const checkRobotsTask = async () => {
      try {
        console.log(`[${new Date().toLocaleString('zh-CN')}] 开始检查所有机器人状态...`);
        const results = await robotService.checkAllActiveRobots();
        const onlineCount = results.filter(r => r.status === 'online').length;
        const offlineCount = results.filter(r => r.status === 'offline').length;
        const errorCount = results.filter(r => r.status === 'error').length;
        console.log(`✅ 机器人状态检查完成: 在线 ${onlineCount}, 离线 ${offlineCount}, 错误 ${errorCount}`);
      } catch (error) {
        console.error('❌ 机器人状态检查失败:', error.message);
      }
    };
    
    // 立即执行一次
    checkRobotsTask();
    
    // 设置定时任务
    const checkIntervalId = setInterval(checkRobotsTask, CHECK_INTERVAL);
    
    console.log(`⏰ 机器人状态检查已配置为每5分钟自动执行`);

    // 启动指令队列处理器
    console.log('📦 启动指令队列处理器...');
    robotCommandService.startQueueProcessor('main-worker', 3000); // 每3秒处理一次（优化后）

    console.log(`⏰ 指令队列处理器已启动`);

    // 启动日志自动清理任务
    if (process.env.LOG_AUTO_CLEANUP === 'true') {
      console.log('🧹 启动日志自动清理任务...');
      const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '30');
      console.log(`⏰ 日志保留天数: ${retentionDays} 天`);

      const logCleanupTask = async () => {
        try {
          const now = new Date();
          const hour = now.getHours();
          const minutes = now.getMinutes();

          // 每天凌晨3点执行清理（时间窗口：3:00-3:05）
          if (hour === 3 && minutes < 5) {
            const systemLogger = require('./services/system-logger.service');
            console.log(`[${new Date().toLocaleString('zh-CN')}] 开始清理 ${retentionDays} 天前的系统日志...`);
            const deletedCount = await systemLogger.cleanup(retentionDays);
            console.log(`✅ 系统日志清理完成: 删除 ${deletedCount} 条记录`);
          }
        } catch (error) {
          console.error('❌ 日志自动清理失败:', error.message);
        }
      };

      // 每小时检查一次
      const cleanupCheckInterval = setInterval(logCleanupTask, 60 * 60 * 1000);
      console.log(`⏰ 日志自动清理已配置为每天凌晨3点执行`);
    } else {
      console.log('🧹 日志自动清理未启用（LOG_AUTO_CLEANUP=false）');
    }
    
    console.log(`
╔═══════════════════════════════════════════════════════╗
║   WorkTool AI 中枢系统已启动                         ║
╠═══════════════════════════════════════════════════════╣
║   🚀 服务地址: http://${HOST}:${PORT}                ║
║   📊 管理后台: http://${HOST}:${PORT}/admin           ║
║   🎯 健康检查: http://${HOST}:${PORT}/health         ║
╠═══════════════════════════════════════════════════════╣
║   🔐 回调签名校验: ${process.env.ENABLE_SIGNATURE_CHECK ? '✅ 已启用' : '⚠️  已禁用'}
║   🔄 回调幂等处理: ✅ 已启用
║   🧯 全局熔断开关: ${process.env.GLOBAL_CIRCUIT_BREAKER === 'true' ? '❌ 已熔断' : '✅ 正常'}
║   🧹 日志自动清理: ${process.env.LOG_AUTO_CLEANUP === 'true' ? '✅ 已启用（保留 ' + (process.env.LOG_RETENTION_DAYS || '30') + ' 天）' : '⚠️  已禁用'}
╚═══════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// 优雅关闭
process.on('SIGTERM', async () => {
  await fastify.close();
  console.log('服务器已优雅关闭');
});

module.exports = fastify;
