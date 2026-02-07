/**
 * Prometheus 监控服务
 * 用于采集和导出应用指标
 */

const promClient = require('prom-client');
const { getLogger } = require('./logger');

class PrometheusService {
  constructor() {
    this.logger = getLogger('PROMETHEUS');
    
    // 默认标签
    this.defaultLabels = {
      service: 'worktool-ai',
      environment: process.env.NODE_ENV || 'development'
    };

    // 设置默认标签
    promClient.register.setDefaultLabels(this.defaultLabels);

    // 创建指标
    this.createMetrics();
  }

  /**
   * 创建 Prometheus 指标
   */
  createMetrics() {
    // HTTP 请求指标
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    // HTTP 请求总数
    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    // L1 缓存命中数
    this.l1CacheHits = new promClient.Counter({
      name: 'cache_l1_hits_total',
      help: 'Total number of L1 cache hits'
    });

    // L1 缓存未命中数
    this.l1CacheMisses = new promClient.Counter({
      name: 'cache_l1_misses_total',
      help: 'Total number of L1 cache misses'
    });

    // L1 缓存设置数
    this.l1CacheSets = new promClient.Counter({
      name: 'cache_l1_sets_total',
      help: 'Total number of L1 cache sets'
    });

    // L1 缓存删除数
    this.l1CacheDeletes = new promClient.Counter({
      name: 'cache_l1_deletes_total',
      help: 'Total number of L1 cache deletes'
    });

    // L1 缓存大小
    this.l1CacheSize = new promClient.Gauge({
      name: 'cache_l1_size',
      help: 'Current size of L1 cache'
    });

    // L1 缓存命中率
    this.l1CacheHitRate = new promClient.Gauge({
      name: 'cache_l1_hit_rate',
      help: 'L1 cache hit rate (0-1)'
    });

    // L2 Redis 命令总数
    this.l2RedisCommands = new promClient.Gauge({
      name: 'cache_l2_redis_commands_total',
      help: 'Total number of Redis commands'
    });

    // L2 Redis 键数
    this.l2RedisKeys = new promClient.Gauge({
      name: 'cache_l2_redis_keys',
      help: 'Total number of Redis keys'
    });

    // 数据库查询持续时间
    this.dbQueryDuration = new promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['table', 'operation'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    // 数据库查询总数
    this.dbQueryTotal = new promClient.Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['table', 'operation']
    });

    // 活跃会话数
    this.activeSessions = new promClient.Gauge({
      name: 'active_sessions_total',
      help: 'Total number of active sessions'
    });

    // 消息处理总数
    this.messagesProcessedTotal = new promClient.Counter({
      name: 'messages_processed_total',
      help: 'Total number of messages processed',
      labelNames: ['type'] // user, bot, human
    });

    // 机器人在线数
    this.onlineRobots = new promClient.Gauge({
      name: 'online_robots_total',
      help: 'Total number of online robots'
    });

    // 机器人离线数
    this.offlineRobots = new promClient.Gauge({
      name: 'offline_robots_total',
      help: 'Total number of offline robots'
    });

    this.logger.info('[Prometheus] 指标创建完成');
  }

  /**
   * 记录 HTTP 请求
   */
  recordHttpRequest(method, route, statusCode, duration) {
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    this.httpRequestTotal.inc({ method, route, status_code: statusCode });
  }

  /**
   * 更新 L1 缓存指标
   */
  updateL1CacheMetrics(stats) {
    if (!stats) return;

    // 只记录增量
    this.l1CacheHits.inc(stats.hits || 0);
    this.l1CacheMisses.inc(stats.misses || 0);
    this.l1CacheSets.inc(stats.sets || 0);
    this.l1CacheDeletes.inc(stats.deletes || 0);
    this.l1CacheSize.set(stats.size || 0);
    this.l1CacheHitRate.set(stats.hitRate || 0);
  }

  /**
   * 更新 L2 Redis 指标
   */
  updateL2RedisMetrics(stats) {
    if (!stats) return;

    this.l2RedisCommands.set(stats.totalCommands || 0);
    this.l2RedisKeys.set(stats.totalKeys || 0);
  }

  /**
   * 记录数据库查询
   */
  recordDbQuery(table, operation, duration) {
    this.dbQueryDuration.observe({ table, operation }, duration);
    this.dbQueryTotal.inc({ table, operation });
  }

  /**
   * 更新活跃会话数
   */
  updateActiveSessions(count) {
    this.activeSessions.set(count);
  }

  /**
   * 记录消息处理
   */
  recordMessageProcessed(type) {
    this.messagesProcessedTotal.inc({ type });
  }

  /**
   * 更新机器人状态
   */
  updateRobotStatus(online, offline) {
    this.onlineRobots.set(online || 0);
    this.offlineRobots.set(offline || 0);
  }

  /**
   * 获取 Prometheus 指标
   */
  async getMetrics() {
    return await promClient.register.metrics();
  }

  /**
   * 获取 Prometheus 指标内容的类型
   */
  getContentType() {
    return promClient.register.contentType;
  }

  /**
   * 重置所有指标
   */
  async reset() {
    await promClient.register.resetMetrics();
    this.logger.info('[Prometheus] 指标已重置');
  }

  /**
   * 定期更新缓存指标
   */
  startCacheMetricsUpdater(cacheService, interval = 30000) {
    setInterval(async () => {
      try {
        const stats = await cacheService.getStats();
        if (stats) {
          this.updateL1CacheMetrics(stats.l1);
          this.updateL2RedisMetrics(stats.l2);
          this.logger.debug('[Prometheus] 缓存指标已更新');
        }
      } catch (error) {
        this.logger.error('[Prometheus] 更新缓存指标失败', { error: error.message });
      }
    }, interval);
  }
}

// 导出单例
const prometheusService = new PrometheusService();

module.exports = prometheusService;
