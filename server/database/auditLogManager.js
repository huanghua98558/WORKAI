/**
 * 审计日志管理器
 * 负责记录和管理系统的审计日志
 */

const { eq, and, desc, like, sql } = require("drizzle-orm");
const { getDb } = require("coze-coding-dev-sdk");
const { auditLogs, insertAuditLogSchema } = require("./schema");
const { getLogger } = require("../lib/logger");

class AuditLogManager {
  constructor() {
    this.logger = getLogger('AUDIT_LOG');
  }

  /**
   * 创建审计日志
   */
  async createLog(data) {
    const db = await getDb();
    try {
      const validated = insertAuditLogSchema.parse(data);
      const [log] = await db.insert(auditLogs).values(validated).returning();
      
      this.logger.debug('审计日志已创建', { 
        action: log.action, 
        resource: log.resource,
        username: log.username 
      });
      
      return log;
    } catch (error) {
      this.logger.error('创建审计日志失败', { error: error.message, data });
      throw error;
    }
  }

  /**
   * 获取日志列表
   */
  async getLogs(options = {}) {
    const { skip = 0, limit = 100, filters = {} } = options;
    const db = await getDb();

    try {
      const conditions = [];
      if (filters.userId) {
        conditions.push(eq(auditLogs.userId, filters.userId));
      }
      if (filters.username) {
        conditions.push(like(auditLogs.username, `%${filters.username}%`));
      }
      if (filters.action) {
        conditions.push(eq(auditLogs.action, filters.action));
      }
      if (filters.resource) {
        conditions.push(like(auditLogs.resource, `%${filters.resource}%`));
      }
      if (filters.resourceId) {
        conditions.push(eq(auditLogs.resourceId, filters.resourceId));
      }
      if (filters.status) {
        conditions.push(eq(auditLogs.status, filters.status));
      }
      if (filters.startDate) {
        conditions.push(sql`${auditLogs.createdAt} >= ${new Date(filters.startDate)}`);
      }
      if (filters.endDate) {
        conditions.push(sql`${auditLogs.createdAt} <= ${new Date(filters.endDate)}`);
      }

      let query = db.select().from(auditLogs);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const logs = await query
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(skip);

      return logs;
    } catch (error) {
      this.logger.error('获取审计日志失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 根据 ID 获取日志
   */
  async getLogById(id) {
    const db = await getDb();
    try {
      const [log] = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
      return log || null;
    } catch (error) {
      this.logger.error('获取审计日志失败', { id, error: error.message });
      throw error;
    }
  }

  /**
   * 获取日志总数
   */
  async getLogCount(filters = {}) {
    const db = await getDb();
    try {
      const conditions = [];
      if (filters.userId) {
        conditions.push(eq(auditLogs.userId, filters.userId));
      }
      if (filters.action) {
        conditions.push(eq(auditLogs.action, filters.action));
      }
      if (filters.resource) {
        conditions.push(like(auditLogs.resource, `%${filters.resource}%`));
      }
      if (filters.startDate) {
        conditions.push(sql`${auditLogs.createdAt} >= ${new Date(filters.startDate)}`);
      }
      if (filters.endDate) {
        conditions.push(sql`${auditLogs.createdAt} <= ${new Date(filters.endDate)}`);
      }

      let query = db.select({ count: sql`count(*)::int` }).from(auditLogs);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const [{ count }] = await query;
      return count;
    } catch (error) {
      this.logger.error('获取日志总数失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 记录用户登录
   */
  async recordLogin(userId, username, request, status = 'success', errorMessage = null) {
    return this.createLog({
      userId,
      username,
      action: 'login',
      resource: 'auth',
      ipAddress: this.extractIpAddress(request),
      userAgent: request.headers['user-agent'],
      status,
      errorMessage
    });
  }

  /**
   * 记录用户登出
   */
  async recordLogout(userId, username, request) {
    return this.createLog({
      userId,
      username,
      action: 'logout',
      resource: 'auth',
      ipAddress: this.extractIpAddress(request),
      userAgent: request.headers['user-agent']
    });
  }

  /**
   * 记录用户操作
   */
  async recordUserAction(userId, username, action, resource, resourceId = null, details = {}, request, status = 'success', errorMessage = null) {
    return this.createLog({
      userId,
      username,
      action,
      resource,
      resourceId,
      details,
      ipAddress: this.extractIpAddress(request),
      userAgent: request.headers['user-agent'],
      status,
      errorMessage
    });
  }

  /**
   * 记录系统错误
   */
  async recordError(action, errorMessage, details = {}) {
    return this.createLog({
      action,
      resource: 'system',
      status: 'failure',
      errorMessage,
      details
    });
  }

  /**
   * 提取 IP 地址
   */
  extractIpAddress(request) {
    // 优先从代理头获取
    return request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           request.headers['x-real-ip'] ||
           request.ip ||
           request.socket?.remoteAddress ||
           'unknown';
  }

  /**
   * 清理旧日志（保留最近 N 天）
   */
  async cleanupLogs(retentionDays = 90) {
    const db = await getDb();
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await db
        .delete(auditLogs)
        .where(sql`${auditLogs.createdAt} < ${cutoffDate}`);

      this.logger.info('审计日志清理完成', { 
        cutoffDate: cutoffDate.toISOString(),
        retentionDays 
      });

      return result;
    } catch (error) {
      this.logger.error('清理审计日志失败', { error: error.message });
      throw error;
    }
  }
}

module.exports = new AuditLogManager();
