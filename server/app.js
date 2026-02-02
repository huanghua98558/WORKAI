/**
 * WorkTool AI 中枢系统 - 主应用入口
 * 企业微信群智能服务型 AI 中枢系统
 */

require('dotenv').config();

// 强制使用内存模式
process.env.USE_MEMORY_MODE = 'true';

const Fastify = require('fastify');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');

const worktoolCallbackRoutes = require('./routes/worktool.callback');
const adminApiRoutes = require('./routes/admin.api');

const redisClient = require('./lib/redis');

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

// 注册路由
fastify.register(worktoolCallbackRoutes, { prefix: '/api/worktool/callback' });
fastify.register(adminApiRoutes, { prefix: '/api/admin' });

// 健康检查
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  };
});

// 启动服务器
const start = async () => {
  try {
    const PORT = process.env.PORT || 5001;
    const HOST = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port: PORT, host: HOST });
    
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
