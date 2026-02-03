/**
 * 报告服务
 * 负责数据记录、日终汇总、报告生成
 */

const monitorService = require('./monitor.service');
const sessionService = require('./session.service');
const aiService = require('./ai.service');
const redisClient = require('../lib/redis');
const { formatDate } = require('../lib/utils');

class ReportService {
  constructor() {
    this.redisPromise = redisClient.getClient(); // 保存 Promise
    this.redis = null; // 实际使用时再获取
  }

  async getRedis() {
    if (!this.redis) {
      this.redis = await this.redisPromise;
    }
    return this.redis;
  }

  /**
   * 记录单条数据
   */
  async recordRecord(data) {
    const redis = await this.getRedis();

    const record = {
      id: this.generateId(),
      date: formatDate(),
      timestamp: new Date().toISOString(),
      ...data
    };

    const key = `records:${record.date}`;
    await redis.lpush(key, JSON.stringify(record));
    await redis.expire(key, 90 * 24 * 3600); // 保留90天

    return record;
  }

  /**
   * 批量记录数据
   */
  async recordRecords(records) {
    const redis = await this.getRedis();
    const date = formatDate();
    const key = `records:${date}`;

    const pipeline = redis.pipeline();
    for (const record of records) {
      const fullRecord = {
        id: this.generateId(),
        date,
        timestamp: new Date().toISOString(),
        ...record
      };
      pipeline.lpush(key, JSON.stringify(fullRecord));
    }
    pipeline.expire(key, 90 * 24 * 3600);
    
    await pipeline.exec();
    
    return records.length;
  }

  /**
   * 生成日终报告
   */
  async generateDailyReport(date = formatDate()) {
    // 获取当天的所有记录
    const records = await this.getRecordsByDate(date);

    // 统计数据
    const stats = {
      date,
      totalRecords: records.length,
      byGroup: {},
      byIntent: {},
      byStatus: {
        auto: 0,
        human: 0,
        none: 0
      },
      timeDistribution: this.calculateTimeDistribution(records),
      topUsers: this.calculateTopUsers(records),
      topGroups: this.calculateTopGroups(records)
    };

    records.forEach(record => {
      // 按群统计
      if (!stats.byGroup[record.groupName]) {
        stats.byGroup[record.groupName] = {
          count: 0,
          messages: []
        };
      }
      stats.byGroup[record.groupName].count++;
      stats.byGroup[record.groupName].messages.push(record);

      // 按意图统计
      if (record.intent) {
        if (!stats.byIntent[record.intent]) {
          stats.byIntent[record.intent] = 0;
        }
        stats.byIntent[record.intent]++;
      }

      // 按状态统计
      if (record.action) {
        stats.byStatus[record.action]++;
      }
    });

    // 生成 AI 总结
    try {
      const aiSummary = await aiService.generateDailyReport({
        stats,
        sampleRecords: records.slice(0, 20)
      });
      stats.aiSummary = aiSummary;
    } catch (error) {
      console.error('生成 AI 总结失败:', error.message);
      stats.aiSummary = 'AI 总结生成失败';
    }

    // 保存报告
    const reportKey = `report:${date}`;
    const redis = await this.getRedis();
    await redis.setex(reportKey, 180 * 24 * 3600, JSON.stringify(stats)); // 保存180天

    return stats;
  }

  /**
   * 获取指定日期的记录
   */
  async getRecordsByDate(date, filters = {}) {
    const key = `records:${date}`;
    const redis = await this.getRedis();
    const records = await redis.lrange(key, 0, -1);
    
    const parsed = records.map(r => JSON.parse(r));

    // 应用过滤条件
    if (filters.groupName) {
      return parsed.filter(r => r.groupName === filters.groupName);
    }
    
    if (filters.userId) {
      return parsed.filter(r => r.userId === filters.userId);
    }

    if (filters.intent) {
      return parsed.filter(r => r.intent === filters.intent);
    }

    return parsed;
  }

  /**
   * 获取指定日期范围的记录
   */
  async getRecordsByDateRange(startDate, endDate, filters = {}) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const allRecords = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = formatDate(d);
      const records = await this.getRecordsByDate(date, filters);
      allRecords.push(...records);
    }

    return allRecords;
  }

  /**
   * 计算时间分布
   */
  calculateTimeDistribution(records) {
    const distribution = {
      morning: 0,    // 6-12
      afternoon: 0,  // 12-18
      evening: 0,    // 18-24
      night: 0       // 0-6
    };

    records.forEach(record => {
      const hour = new Date(record.timestamp).getHours();
      
      if (hour >= 6 && hour < 12) {
        distribution.morning++;
      } else if (hour >= 12 && hour < 18) {
        distribution.afternoon++;
      } else if (hour >= 18 && hour < 24) {
        distribution.evening++;
      } else {
        distribution.night++;
      }
    });

    return distribution;
  }

  /**
   * 计算活跃用户排行
   */
  calculateTopUsers(records, limit = 10) {
    const userCounts = {};
    
    records.forEach(record => {
      const key = `${record.userName}(${record.userId})`;
      if (!userCounts[key]) {
        userCounts[key] = {
          userName: record.userName,
          userId: record.userId,
          count: 0
        };
      }
      userCounts[key].count++;
    });

    return Object.values(userCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 计算活跃群排行
   */
  calculateTopGroups(records, limit = 10) {
    const groupCounts = {};
    
    records.forEach(record => {
      if (!groupCounts[record.groupName]) {
        groupCounts[record.groupName] = {
          groupName: record.groupName,
          groupId: record.groupId,
          count: 0
        };
      }
      groupCounts[record.groupName].count++;
    });

    return Object.values(groupCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 获取报告
   */
  async getReport(date = formatDate()) {
    const key = `report:${date}`;
    const redis = await this.getRedis();
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * 导出为 CSV
   */
  async exportToCSV(date, filters = {}) {
    const records = await this.getRecordsByDate(date, filters);
    
    if (records.length === 0) {
      return '';
    }

    const headers = Object.keys(records[0]).join(',');
    const rows = records.map(record => {
      return Object.values(record).map(value => {
        // 处理包含逗号的值
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * 生成 ID
   */
  generateId() {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理过期记录
   */
  async cleanupOldRecords(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoff = formatDate(cutoffDate);

    const pattern = 'records:*';
    const redis = await this.getRedis();
    const keys = await redis.keys(pattern);

    let deletedCount = 0;

    for (const key of keys) {
      const keyDate = key.split(':')[1];

      if (keyDate < cutoff) {
        await redis.del(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

module.exports = new ReportService();
