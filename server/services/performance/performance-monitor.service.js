/**
 * 性能监控服务
 * 监控系统性能指标：响应时间、错误率、吞吐量等
 */

class PerformanceMonitorService {
  constructor() {
    this.metrics = {
      responseTime: [],
      errorRate: 0,
      throughput: 0,
      lastUpdate: null
    };
    this.thresholds = {
      responseTime: 1000, // 1秒
      errorRate: 5, // 5%
      throughput: 100 // 100请求/分钟
    };
    console.log('[PerformanceMonitor] 性能监控服务初始化完成');
  }

  /**
   * 记录请求指标
   * @param {Object} data - 请求数据
   * @param {number} data.responseTime - 响应时间（毫秒）
   * @param {boolean} data.success - 是否成功
   * @param {string} data.endpoint - 端点路径
   */
  recordRequest(data) {
    const { responseTime, success, endpoint } = data;

    // 记录响应时间
    this.metrics.responseTime.push({
      time: Date.now(),
      value: responseTime,
      endpoint,
      success
    });

    // 只保留最近1000条记录
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
    }

    // 更新错误率
    this.updateErrorRate();

    // 更新吞吐量
    this.updateThroughput();

    this.metrics.lastUpdate = new Date();

    // 检查是否超过阈值
    this.checkThresholds();
  }

  /**
   * 更新错误率
   */
  updateErrorRate() {
    const recentRequests = this.metrics.responseTime.slice(-100);
    if (recentRequests.length === 0) {
      this.metrics.errorRate = 0;
      return;
    }

    const errorCount = recentRequests.filter(r => !r.success).length;
    this.metrics.errorRate = (errorCount / recentRequests.length) * 100;
  }

  /**
   * 更新吞吐量
   */
  updateThroughput() {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    const recentRequests = this.metrics.responseTime.filter(
      r => r.time > oneMinuteAgo
    );

    this.metrics.throughput = recentRequests.length;
  }

  /**
   * 检查阈值
   */
  checkThresholds() {
    const warnings = [];

    // 检查平均响应时间
    const avgResponseTime = this.getAverageResponseTime();
    if (avgResponseTime > this.thresholds.responseTime) {
      warnings.push({
        type: 'response_time',
        message: `平均响应时间超过阈值: ${avgResponseTime}ms > ${this.thresholds.responseTime}ms`,
        severity: 'warning'
      });
    }

    // 检查错误率
    if (this.metrics.errorRate > this.thresholds.errorRate) {
      warnings.push({
        type: 'error_rate',
        message: `错误率超过阈值: ${this.metrics.errorRate.toFixed(2)}% > ${this.thresholds.errorRate}%`,
        severity: 'critical'
      });
    }

    // 检查吞吐量
    if (this.metrics.throughput > this.thresholds.throughput) {
      warnings.push({
        type: 'throughput',
        message: `吞吐量较高: ${this.metrics.throughput}请求/分钟`,
        severity: 'info'
      });
    }

    if (warnings.length > 0) {
      console.warn('[PerformanceMonitor] 性能警告:', warnings);
    }

    return warnings;
  }

  /**
   * 获取平均响应时间
   * @param {number} timeRange - 时间范围（毫秒）
   * @returns {number} 平均响应时间
   */
  getAverageResponseTime(timeRange = 60000) {
    const now = Date.now();
    const startTime = now - timeRange;

    const recentRequests = this.metrics.responseTime.filter(
      r => r.time > startTime
    );

    if (recentRequests.length === 0) {
      return 0;
    }

    const sum = recentRequests.reduce((acc, r) => acc + r.value, 0);
    return Math.round(sum / recentRequests.length);
  }

  /**
   * 获取P50、P95、P99响应时间
   * @param {number} timeRange - 时间范围（毫秒）
   * @returns {Object} 百分位数响应时间
   */
  getPercentiles(timeRange = 60000) {
    const now = Date.now();
    const startTime = now - timeRange;

    const recentRequests = this.metrics.responseTime
      .filter(r => r.time > startTime)
      .map(r => r.value)
      .sort((a, b) => a - b);

    if (recentRequests.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const getPercentile = (p) => {
      const index = Math.floor(recentRequests.length * p);
      return recentRequests[index];
    };

    return {
      p50: getPercentile(0.5),
      p95: getPercentile(0.95),
      p99: getPercentile(0.99)
    };
  }

  /**
   * 获取性能报告
   * @param {number} timeRange - 时间范围（毫秒）
   * @returns {Object} 性能报告
   */
  getReport(timeRange = 60000) {
    const now = Date.now();
    const startTime = now - timeRange;

    const recentRequests = this.metrics.responseTime.filter(
      r => r.time > startTime
    );

    const successCount = recentRequests.filter(r => r.success).length;
    const totalCount = recentRequests.length;

    return {
      timestamp: now,
      timeRange,
      responseTime: {
        avg: this.getAverageResponseTime(timeRange),
        p50: this.getPercentiles(timeRange).p50,
        p95: this.getPercentiles(timeRange).p95,
        p99: this.getPercentiles(timeRange).p99
      },
      errorRate: this.metrics.errorRate,
      throughput: this.metrics.throughput,
      totalRequests: totalCount,
      successRequests: successCount,
      errorRequests: totalCount - successCount,
      warnings: this.checkThresholds()
    };
  }

  /**
   * 重置指标
   */
  reset() {
    this.metrics = {
      responseTime: [],
      errorRate: 0,
      throughput: 0,
      lastUpdate: null
    };
    console.log('[PerformanceMonitor] 指标已重置');
  }
}

// 创建单例
const performanceMonitorService = new PerformanceMonitorService();

module.exports = performanceMonitorService;
