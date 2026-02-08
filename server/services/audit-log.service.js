/**
 * 审计日志服务
 * 记录用户操作审计日志
 */

const { getDb } = require('coze-coding-dev-sdk');
const { userAuditLogs } = require('../database/schema');
const { getLogger } = require('./logger');
const { v4: uuidv4 } = require('uuid');

class AuditLogService {
  constructor() {
    this.logger = getLogger('AUDIT_LOG');
  }

  /**
   * 记录操作日志
   * @param {Object} data - 日志数据
   * @returns {Promise<Object>} 创建的日志记录
   */
  async logAction(data) {
    try {
      const db = await getDb();

      const logData = {
        id: data.id || uuidv4(),
        userId: data.userId || null,
        action: data.action || 'unknown',
        actionType: data.actionType || 'unknown',
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        resourceName: data.resourceName || null,
        details: data.details || {},
        status: data.status || 'success',
        errorMessage: data.errorMessage || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        sessionId: data.sessionId || null,
        createdAt: new Date()
      };

      const [created] = await db.insert(userAuditLogs).values(logData).returning();

      this.logger.info('记录审计日志', {
        id: created.id,
        action: created.action,
        actionType: created.actionType,
        userId: created.userId,
        status: created.status,
        resourceType: created.resourceType
      });

      return created;
    } catch (error) {
      this.logger.error('记录审计日志失败', { error: error.message });
      // 不抛出错误，避免影响主业务流程
      return null;
    }
  }

  /**
   * 获取用户操作日志
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 日志列表
   */
  async getUserLogs(userId, options = {}) {
    try {
      const db = await getDb();
      const { limit = 50, offset = 0, actionType, status } = options;

      let query = db.select().from(userAuditLogs).where(eq(userAuditLogs.userId, userId));

      // 可以添加更多过滤条件
      // if (actionType) {
      //   query = query.where(eq(userAuditLogs.actionType, actionType));
      // }
      // if (status) {
      //   query = query.where(eq(userAuditLogs.status, status));
      // }

      // TODO: 实现完整的过滤逻辑

      const logs = await query
        .orderBy(sql`${userAuditLogs.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      return logs;
    } catch (error) {
      this.logger.error('获取用户日志失败', { error: error.message, userId });
      return [];
    }
  }

  /**
   * 获取资源操作日志
   * @param {string} resourceType - 资源类型
   * @param {string} resourceId - 资源ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 日志列表
   */
  async getResourceLogs(resourceType, resourceId, options = {}) {
    try {
      const db = await getDb();
      const { limit = 50, offset = 0 } = options;

      const logs = await db
        .select()
        .from(userAuditLogs)
        .where(sql`${userAuditLogs.resourceType} = ${resourceType} AND ${userAuditLogs.resourceId} = ${resourceId}`)
        .orderBy(sql`${userAuditLogs.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      return logs;
    } catch (error) {
      this.logger.error('获取资源日志失败', { error: error.message, resourceType, resourceId });
      return [];
    }
  }

  /**
   * 获取系统日志
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 日志列表
   */
  async getSystemLogs(options = {}) {
    try {
      const db = await getDb();
      const { limit = 100, offset = 0, actionType, status, startTime, endTime } = options;

      let query = db.select().from(userAuditLogs);

      // TODO: 实现完整的过滤逻辑
      // if (actionType) {
      //   query = query.where(eq(userAuditLogs.actionType, actionType));
      // }
      // if (status) {
      //   query = query.where(eq(userAuditLogs.status, status));
      // }
      // if (startTime) {
      //   query = query.where(sql`${userAuditLogs.createdAt} >= ${startTime}`);
      // }
      // if (endTime) {
      //   query = query.where(sql`${userAuditLogs.createdAt} <= ${endTime}`);
      // }

      const logs = await query
        .orderBy(sql`${userAuditLogs.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      return logs;
    } catch (error) {
      this.logger.error('获取系统日志失败', { error: error.message });
      return [];
    }
  }
}

const auditLogService = new AuditLogService();

module.exports = auditLogService;
