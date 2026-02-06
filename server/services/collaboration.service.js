/**
 * 协同分析服务
 * 处理工作人员识别、消息记录、活动跟踪等功能
 */

const { getDb } = require('coze-coding-dev-sdk');
const { eq, and, desc, gte, sql, count, avg, sum } = require('drizzle-orm');
const {
  staffMessages,
  staffActivities,
  sessionStaffStatus,
  infoDetectionHistory,
  collaborationDecisionLogs
} = require('../database/schema');

/**
 * 工作人员特征配置
 * 基于企业名称、备注名、昵称、特殊标识等特征识别工作人员
 */
const STAFF_FEATURES = {
  // 企业名称特征（企业微信公司名称）
  companyNames: ['WorkTool', '扣子', 'Coze', '测试公司', '演示公司'],

  // 备注名特征
  remarkNames: ['管理员', '运维', '技术支持', '客服主管', '运营专员', '产品经理'],

  // 昵称特征
  nicknames: ['张三', '李四', '王五', '测试员', '管理员', 'Admin', 'Manager'],

  // 特殊标识（用户ID前缀、后缀等）
  specialIds: ['staff', 'admin', 'manager', 'support', 'operator']
};

/**
 * 工作人员识别服务
 * 基于特征识别工作人员
 */
class StaffIdentifier {
  /**
   * 识别是否为工作人员
   * @param {Object} userInfo - 用户信息
   * @param {string} userInfo.userName - 用户名称
   * @param {string} userInfo.groupName - 群组名称
   * @param {string} userInfo.remarkName - 备注名称
   * @param {string} userInfo.company - 公司名称
   * @param {string} userInfo.userId - 用户ID
   * @returns {Object} { isStaff: boolean, staffInfo: Object }
   */
  static identify(userInfo) {
    const {
      userName = '',
      groupName = '',
      remarkName = '',
      company = '',
      userId = ''
    } = userInfo;

    const reasons = [];
    let isStaff = false;
    let staffInfo = {
      staffUserId: userId,
      staffName: userName || remarkName || '未知工作人员'
    };

    // 1. 检查企业名称特征
    if (company && STAFF_FEATURES.companyNames.some(feature => company.includes(feature))) {
      isStaff = true;
      reasons.push(`企业名称匹配: ${company}`);
    }

    // 2. 检查备注名特征
    if (remarkName && STAFF_FEATURES.remarkNames.some(feature => remarkName.includes(feature))) {
      isStaff = true;
      reasons.push(`备注名匹配: ${remarkName}`);
    }

    // 3. 检查昵称特征
    if (userName && STAFF_FEATURES.nicknames.some(feature => userName.includes(feature))) {
      isStaff = true;
      reasons.push(`昵称匹配: ${userName}`);
    }

    // 4. 检查特殊标识（用户ID）
    if (userId && STAFF_FEATURES.specialIds.some(feature => userId.toLowerCase().includes(feature))) {
      isStaff = true;
      reasons.push(`用户ID匹配: ${userId}`);
    }

    // 5. 特殊规则：群名称包含"内部群"、"管理群"等
    if (groupName && ['内部群', '管理群', '测试群', '运营群'].some(feature => groupName.includes(feature))) {
      isStaff = true;
      reasons.push(`群组匹配: ${groupName}`);
    }

    return {
      isStaff,
      staffInfo,
      reasons: reasons.length > 0 ? reasons : ['未匹配到特征'],
      confidence: reasons.length > 0 ? 1.0 : 0.0
    };
  }

  /**
   * 获取工作人员ID
   * 如果是工作人员，返回工作人员ID；否则返回 null
   */
  static getStaffUserId(userInfo) {
    const { isStaff, staffInfo } = this.identify(userInfo);
    return isStaff ? staffInfo.staffUserId : null;
  }
}

/**
 * 协同分析服务主类
 */
class CollaborationService {
  constructor() {
    this.db = null;
    // 缓存配置
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5分钟过期
  }

  /**
   * 初始化数据库连接
   */
  async init() {
    if (!this.db) {
      this.db = await getDb();
    }
    return this.db;
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {any} 缓存值，如果不存在或已过期返回null
   */
  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} data - 缓存数据
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 清除缓存
   * @param {string} key - 缓存键，如果不传则清除所有缓存
   */
  clearCache(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 清理过期缓存
   */
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 记录工作人员消息
   * @param {Object} messageData - 消息数据
   * @returns {Promise<void>}
   */
  async recordStaffMessage(messageData) {
    const {
      sessionId,
      robotId,
      staffUserId,
      staffName,
      messageContent,
      messageType = 'text',
      isReply = false,
      extraData = {}
    } = messageData;

    try {
      await this.init();

      // 插入工作人员消息记录
      await this.db.insert(staffMessages).values({
        id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        robotId,
        staffUserId,
        staffName,
        messageContent,
        messageType,
        isReply,
        createdAt: new Date(),
        updatedAt: new Date(),
        extraData: JSON.stringify(extraData)
      });

      console.log('[协同分析] 工作人员消息记录成功', {
        sessionId,
        staffUserId,
        staffName,
        messageLength: messageContent?.length || 0
      });
    } catch (error) {
      console.error('[协同分析] 记录工作人员消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取会话协同统计数据（用于导出）
   * @param {string} timeRange - 时间范围
   * @returns {Promise<Object>} 统计数据
   */
  async getSessionCollabStatsForExport(timeRange = '24h') {
    try {
      await this.init();

      // 计算时间范围
      const now = new Date();
      let startTime;
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // 获取协同决策日志
      const decisionLogs = await this.db
        .select()
        .from(collaborationDecisionLogs)
        .where(gte(collaborationDecisionLogs.createdAt, startTime));

      // 获取工作人员消息
      const staffMessageData = await this.db
        .select()
        .from(staffMessages)
        .where(gte(staffMessages.createdAt, startTime));

      // 获取工作人员活动
      const staffActivityData = await this.db
        .select()
        .from(staffActivities)
        .where(gte(staffActivities.createdAt, startTime));

      // 获取会话状态
      const sessionStatuses = await this.db
        .select()
        .from(sessionStaffStatus)
        .where(gte(sessionStaffStatus.updatedAt, startTime));

      // 计算统计数据
      const decisionCount = decisionLogs.length;
      const aiReplyCount = decisionLogs.filter(log => log.aiAction === 'reply').length;
      const staffReplyCount = decisionLogs.filter(log => log.staffAction === 'continue').length;
      const collaborationRate = decisionCount > 0 ? ((aiReplyCount / decisionCount) * 100).toFixed(2) : '0';
      const staffMessageCount = staffMessageData.length;
      const staffActivityCount = staffActivityData.length;
      const totalSessions = sessionStatuses.length;
      const sessionsWithStaff = sessionStatuses.filter(s => s.isHandling).length;

      return {
        decisionCount,
        aiReplyCount,
        staffReplyCount,
        collaborationRate,
        staffMessageCount,
        staffActivityCount,
        totalSessions,
        sessionsWithStaff
      };
    } catch (error) {
      console.error('[协同分析] 获取会话协同统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取工作人员活动数据（用于导出）
   * @param {string} timeRange - 时间范围
   * @param {number} limit - 数量限制
   * @returns {Promise<Array>} 活动列表
   */
  async getStaffActivitiesForExport(timeRange = '24h', limit = 1000) {
    try {
      await this.init();

      // 计算时间范围
      const now = new Date();
      let startTime;
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const activities = await this.db
        .select()
        .from(staffActivities)
        .where(gte(staffActivities.createdAt, startTime))
        .orderBy(desc(staffActivities.createdAt))
        .limit(limit);

      return activities.map(activity => ({
        id: activity.id,
        sessionId: activity.sessionId,
        robotId: activity.robotId,
        staffUserId: activity.staffUserId,
        staffName: activity.staffName,
        activityType: activity.activityType,
        createdAt: activity.createdAt
      }));
    } catch (error) {
      console.error('[协同分析] 获取工作人员活动数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取决策日志数据（用于导出）
   * @param {string} timeRange - 时间范围
   * @param {number} limit - 数量限制
   * @returns {Promise<Array>} 日志列表
   */
  async getDecisionLogsForExport(timeRange = '24h', limit = 1000) {
    try {
      await this.init();

      // 计算时间范围
      const now = new Date();
      let startTime;
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const logs = await this.db
        .select()
        .from(collaborationDecisionLogs)
        .where(gte(collaborationDecisionLogs.createdAt, startTime))
        .orderBy(desc(collaborationDecisionLogs.createdAt))
        .limit(limit);

      return logs.map(log => ({
        id: log.id,
        sessionId: log.sessionId,
        robotId: log.robotId,
        shouldAiReply: log.shouldAiReply,
        aiAction: log.aiAction,
        staffAction: log.staffAction,
        priority: log.priority,
        reason: log.reason,
        createdAt: log.createdAt
      }));
    } catch (error) {
      console.error('[协同分析] 获取决策日志数据失败:', error);
      throw error;
    }
  }

  /**
   * 记录工作人员活动
   * @param {Object} activityData - 活动数据
   * @returns {Promise<void>}
   */
  async recordStaffActivity(activityData) {
    const {
      sessionId,
      robotId,
      staffUserId,
      staffName,
      activityType,
      activityData: actData = {},
      extraData = {}
    } = activityData;

    try {
      await this.init();

      // 插入工作人员活动记录
      await this.db.insert(staffActivities).values({
        id: `sa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        robotId,
        staffUserId,
        staffName,
        activityType,
        activityData: JSON.stringify(actData),
        createdAt: new Date(),
        extraData: JSON.stringify(extraData)
      });

      console.log('[协同分析] 工作人员活动记录成功', {
        sessionId,
        staffUserId,
        activityType
      });
    } catch (error) {
      console.error('[协同分析] 记录工作人员活动失败:', error);
      throw error;
    }
  }

  /**
   * 更新会话工作人员状态
   * @param {Object} statusData - 状态数据
   * @returns {Promise<void>}
   */
  async updateSessionStaffStatus(statusData) {
    const {
      sessionId,
      robotId,
      staffUserId,
      staffName,
      status,
      isHandling = false,
      lastActivityAt = new Date(),
      extraData = {}
    } = statusData;

    try {
      await this.init();

      // 检查是否已存在该会话的工作人员状态记录
      const existing = await this.db
        .select()
        .from(sessionStaffStatus)
        .where(eq(sessionStaffStatus.sessionId, sessionId))
        .limit(1);

      if (existing.length > 0) {
        // 更新现有记录
        await this.db
          .update(sessionStaffStatus)
          .set({
            staffUserId,
            staffName,
            status,
            isHandling,
            lastActivityAt,
            updatedAt: new Date(),
            extraData: JSON.stringify(extraData)
          })
          .where(eq(sessionStaffStatus.sessionId, sessionId));

        console.log('[协同分析] 会话工作人员状态更新成功', {
          sessionId,
          staffUserId,
          status
        });
      } else {
        // 创建新记录
        await this.db.insert(sessionStaffStatus).values({
          id: `sss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId,
          robotId,
          staffUserId,
          staffName,
          status,
          isHandling,
          joinedAt: new Date(),
          lastActivityAt,
          createdAt: new Date(),
          updatedAt: new Date(),
          extraData: JSON.stringify(extraData)
        });

        console.log('[协同分析] 会话工作人员状态创建成功', {
          sessionId,
          staffUserId,
          status
        });
      }

      // 清除缓存
      this.clearCache(`session_staff_status:${sessionId}`);

    } catch (error) {
      console.error('[协同分析] 更新会话工作人员状态失败:', error);
      throw error;
    }
  }

  /**
   * 记录协同决策日志
   * @param {Object} decisionData - 决策数据
   * @returns {Promise<void>}
   */
  async recordDecisionLog(decisionData) {
    const {
      sessionId,
      robotId,
      shouldAiReply,
      aiAction = 'wait',
      staffAction = 'none',
      priority = 'none',
      reason = '',
      extraData = {}
    } = decisionData;

    try {
      await this.init();

      // 插入协同决策日志
      await this.db.insert(collaborationDecisionLogs).values({
        id: `cdl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        robotId,
        shouldAiReply,
        aiAction,
        staffAction,
        priority,
        reason,
        createdAt: new Date(),
        extraData: JSON.stringify(extraData)
      });

      console.log('[协同分析] 协同决策日志记录成功', {
        sessionId,
        priority,
        shouldAiReply
      });
    } catch (error) {
      console.error('[协同分析] 记录协同决策日志失败:', error);
      throw error;
    }
  }

  /**
   * 检测并记录信息
   * @param {Object} detectionData - 检测数据
   * @returns {Promise<void>}
   */
  async detectAndRecordInfo(detectionData) {
    const {
      sessionId,
      robotId,
      infoType,
      infoContent,
      detectionResult = {},
      confidence = 0.0,
      extraData = {}
    } = detectionData;

    try {
      await this.init();

      // 插入信息检测历史
      await this.db.insert(infoDetectionHistory).values({
        id: `idh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        robotId,
        infoType,
        infoContent,
        detectionResult: JSON.stringify(detectionResult),
        confidence,
        createdAt: new Date(),
        extraData: JSON.stringify(extraData)
      });

      console.log('[协同分析] 信息检测记录成功', {
        sessionId,
        infoType,
        confidence
      });
    } catch (error) {
      console.error('[协同分析] 记录信息检测失败:', error);
      throw error;
    }
  }

  /**
   * 检测群组信息
   * @param {Object} groupInfo - 群组信息
   * @returns {Promise<Object>} 检测结果
   */
  async detectGroupInfo(groupInfo) {
    const {
      groupId,
      groupName,
      groupRemark,
      robotId,
      sessionId
    } = groupInfo;

    try {
      await this.init();

      // 定义群组特征
      const groupFeatures = {
        isInternal: groupName.includes('内部') || groupRemark?.includes('内部'),
        isTest: groupName.includes('测试') || groupRemark?.includes('测试'),
        isManagement: groupName.includes('管理') || groupRemark?.includes('管理'),
        isOperation: groupName.includes('运营') || groupRemark?.includes('运营'),
        isCustomer: groupName.includes('客户') || groupRemark?.includes('客户'),
        memberCount: 0,
        keywords: []
      };

      // 提取关键词
      const keywords = [];
      if (groupFeatures.isInternal) keywords.push('内部群');
      if (groupFeatures.isTest) keywords.push('测试群');
      if (groupFeatures.isManagement) keywords.push('管理群');
      if (groupFeatures.isOperation) keywords.push('运营群');
      if (groupFeatures.isCustomer) keywords.push('客户群');
      groupFeatures.keywords = keywords;

      const confidence = keywords.length > 0 ? 1.0 : 0.0;

      // 记录检测结果
      await this.detectAndRecordInfo({
        sessionId,
        robotId,
        infoType: 'group',
        infoContent: JSON.stringify({ groupId, groupName, groupRemark }),
        detectionResult: groupFeatures,
        confidence,
        extraData: { groupId, groupName, groupRemark }
      });

      console.log('[协同分析] 群组信息检测完成', {
        groupId,
        groupName,
        features: groupFeatures,
        confidence
      });

      return {
        groupId,
        groupName,
        features: groupFeatures,
        confidence
      };
    } catch (error) {
      console.error('[协同分析] 检测群组信息失败:', error);
      throw error;
    }
  }

  /**
   * 检测工作人员信息
   * @param {Object} staffInfo - 工作人员信息
   * @returns {Promise<Object>} 检测结果
   */
  async detectStaffInfo(staffInfo) {
    const {
      userId,
      userName,
      remarkName,
      company,
      robotId,
      sessionId
    } = staffInfo;

    try {
      await this.init();

      // 使用 StaffIdentifier 进行识别
      const { isStaff, staffInfo: identifiedInfo, reasons, confidence } = StaffIdentifier.identify({
        userName,
        remarkName,
        company,
        userId
      });

      const detectionResult = {
        isStaff,
        staffId: identifiedInfo.staffUserId,
        staffName: identifiedInfo.staffName,
        reasons,
        roles: []
      };

      // 提取角色信息
      if (remarkName?.includes('管理员')) detectionResult.roles.push('admin');
      if (remarkName?.includes('运维')) detectionResult.roles.push('operations');
      if (remarkName?.includes('客服')) detectionResult.roles.push('customer_service');
      if (remarkName?.includes('运营')) detectionResult.roles.push('operation');
      if (remarkName?.includes('产品')) detectionResult.roles.push('product');

      // 记录检测结果
      await this.detectAndRecordInfo({
        sessionId,
        robotId,
        infoType: 'staff',
        infoContent: JSON.stringify({ userId, userName, remarkName, company }),
        detectionResult,
        confidence,
        extraData: { userId, userName, remarkName, company }
      });

      console.log('[协同分析] 工作人员信息检测完成', {
        userId,
        userName,
        isStaff,
        roles: detectionResult.roles,
        confidence
      });

      return {
        userId,
        userName,
        isStaff,
        staffId: identifiedInfo.staffUserId,
        staffName: identifiedInfo.staffName,
        roles: detectionResult.roles,
        confidence
      };
    } catch (error) {
      console.error('[协同分析] 检测工作人员信息失败:', error);
      throw error;
    }
  }

  /**
   * 查询会话工作人员状态
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object|null>} 工作人员状态对象，如果不存在则返回null
   */
  async getSessionStaffStatus(sessionId) {
    try {
      // 检查缓存
      const cacheKey = `session_staff_status:${sessionId}`;
      const cached = this.getCache(cacheKey);
      if (cached) {
        return cached;
      }

      await this.init();

      const result = await this.db
        .select()
        .from(sessionStaffStatus)
        .where(eq(sessionStaffStatus.sessionId, sessionId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const status = result[0];

      // 计算工作人员活跃时间（分钟）
      const now = new Date();
      const lastActivityAt = new Date(status.lastActivityAt);
      const minutesSinceLastActivity = Math.floor((now - lastActivityAt) / 1000 / 60);

      const resultData = {
        sessionId: status.sessionId,
        robotId: status.robotId,
        staffUserId: status.staffUserId,
        staffName: status.staffName,
        status: status.status,
        isHandling: status.isHandling,
        joinedAt: status.joinedAt,
        lastActivityAt: status.lastActivityAt,
        minutesSinceLastActivity,
        isInactive: minutesSinceLastActivity > 10, // 超过10分钟未活动视为离线
        extraData: JSON.parse(status.extraData || '{}')
      };

      // 设置缓存
      this.setCache(cacheKey, resultData);

      return resultData;
    } catch (error) {
      console.error('[协同分析] 查询会话工作人员状态失败:', error);
      return null;
    }
  }

  /**
   * 判断是否应该由AI回复
   * 基于工作人员状态和协同策略
   * @param {string} sessionId - 会话ID
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} { shouldReply: boolean, reason: string, strategy: string }
   */
  async shouldAIReply(sessionId, context = {}) {
    try {
      // 获取会话工作人员状态
      const staffStatus = await this.getSessionStaffStatus(sessionId);

      if (!staffStatus) {
        // 没有工作人员，AI应该回复
        return {
          shouldReply: true,
          reason: 'no_staff_in_session',
          strategy: 'ai_only',
          staffContext: null
        };
      }

      // 如果工作人员离线（超过10分钟未活动）
      if (staffStatus.isInactive) {
        console.log('[协同分析] 工作人员已离线，AI接管回复', {
          sessionId,
          staffUserId: staffStatus.staffUserId,
          minutesSinceLastActivity: staffStatus.minutesSinceLastActivity
        });

        // 更新工作人员状态为离线
        await this.updateSessionStaffStatus({
          sessionId,
          robotId: staffStatus.robotId,
          staffUserId: staffStatus.staffUserId,
          staffName: staffStatus.staffName,
          status: 'offline',
          isHandling: false,
          lastActivityAt: staffStatus.lastActivityAt
        });

        return {
          shouldReply: true,
          reason: 'staff_offline',
          strategy: 'ai_resume',
          staffContext: staffStatus
        };
      }

      // 如果工作人员正在处理，AI不回复
      if (staffStatus.isHandling) {
        console.log('[协同分析] 工作人员正在处理，AI暂停回复', {
          sessionId,
          staffUserId: staffStatus.staffUserId,
          status: staffStatus.status
        });

        // 记录协同决策
        await this.recordDecisionLog({
          sessionId,
          robotId: staffStatus.robotId,
          shouldAiReply: false,
          aiAction: 'wait',
          staffAction: 'continue',
          priority: 'staff',
          reason: 'staff_is_handling',
          extraData: {
            staffUserId: staffStatus.staffUserId,
            staffName: staffStatus.staffName,
            staffStatus: staffStatus.status
          }
        });

        return {
          shouldReply: false,
          reason: 'staff_is_handling',
          strategy: 'staff_priority',
          staffContext: staffStatus
        };
      }

      // 默认情况下，AI可以回复（工作人员在线但未在处理）
      return {
        shouldReply: true,
        reason: 'staff_online_not_handling',
        strategy: 'collaborative',
        staffContext: staffStatus
      };
    } catch (error) {
      console.error('[协同分析] 判断是否应该AI回复失败:', error);
      // 出错时默认AI可以回复，避免影响用户体验
      return {
        shouldReply: true,
        reason: 'error_fallback',
        strategy: 'ai_only',
        staffContext: null
      };
    }
  }

  /**
   * 工作人员活动监测
   * 监测工作人员回复行为，调整监测频率
   * @param {string} sessionId - 会话ID
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 监测结果
   */
  async monitorStaffActivity(sessionId, context = {}) {
    try {
      await this.init();

      // 获取会话工作人员状态
      const staffStatus = await this.getSessionStaffStatus(sessionId);

      if (!staffStatus) {
        return {
          hasStaff: false,
          monitoring: false,
          frequency: 'normal',
          lastActivity: null
        };
      }

      // 计算监测频率
      let monitoringFrequency = 'normal'; // normal, reduced, increased
      let frequencyReason = '';

      // 检查最近是否有工作人员回复
      const recentActivities = await this.db
        .select()
        .from(staffActivities)
        .where(
          and(
            eq(staffActivities.sessionId, sessionId),
            eq(staffActivities.activityType, 'message')
          )
        )
        .orderBy(desc(staffActivities.createdAt))
        .limit(5);

      if (recentActivities.length > 0) {
        const lastActivity = recentActivities[0];
        const minutesSinceLastActivity = Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / 1000 / 60);

        if (minutesSinceLastActivity <= 5) {
          // 最近5分钟有回复，降低监测频率
          monitoringFrequency = 'reduced';
          frequencyReason = 'staff_recently_replied';
        } else if (minutesSinceLastActivity > 30) {
          // 超过30分钟无回复，增加监测频率
          monitoringFrequency = 'increased';
          frequencyReason = 'staff_inactive_long_time';
        }
      }

      // 记录监测结果
      const monitoringResult = {
        hasStaff: true,
        staffUserId: staffStatus.staffUserId,
        staffName: staffStatus.staffName,
        monitoring: true,
        frequency: monitoringFrequency,
        frequencyReason,
        lastActivity: staffStatus.lastActivityAt,
        minutesSinceLastActivity: staffStatus.minutesSinceLastActivity,
        isHandling: staffStatus.isHandling,
        status: staffStatus.status
      };

      console.log('[协同分析] 工作人员活动监测', {
        sessionId,
        ...monitoringResult
      });

      return monitoringResult;
    } catch (error) {
      console.error('[协同分析] 工作人员活动监测失败:', error);
      return {
        hasStaff: false,
        monitoring: false,
        frequency: 'normal',
        error: error.message
      };
    }
  }

  /**
   * 记录工作人员不回复行为
   * @param {Object} reportData - 不回复行为数据
   * @returns {Promise<void>}
   */
  async recordStaffNonResponse(reportData) {
    const {
      sessionId,
      robotId,
      staffUserId,
      staffName,
      userMessageContent,
      timestamp = new Date(),
      reason = 'no_response'
    } = reportData;

    try {
      await this.init();

      // 记录为工作人员活动（类型为 non_response）
      await this.db.insert(staffActivities).values({
        id: `sa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        robotId,
        staffUserId,
        staffName,
        activityType: 'non_response',
        activityData: JSON.stringify({
          userMessageContent,
          reason,
          timestamp
        }),
        createdAt: timestamp
      });

      // 更新会话工作人员状态
      await this.updateSessionStaffStatus({
        sessionId,
        robotId,
        staffUserId,
        staffName,
        status: 'inactive',
        isHandling: false,
        lastActivityAt: timestamp,
        extraData: {
          nonResponseCount: (parseInt(JSON.parse(await this.getSessionStaffStatus(sessionId)?.extraData || '{}').nonResponseCount || '0') + 1).toString(),
          lastNonResponseAt: timestamp
        }
      });

      console.log('[协同分析] 工作人员不回复行为已记录', {
        sessionId,
        staffUserId,
        staffName,
        reason
      });
    } catch (error) {
      console.error('[协同分析] 记录工作人员不回复行为失败:', error);
      throw error;
    }
  }

  /**
   * 获取工作人员监测频率
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 监测频率配置
   */
  async getMonitoringFrequency(sessionId) {
    try {
      const monitoringResult = await this.monitorStaffActivity(sessionId);

      // 返回监测频率配置（单位：毫秒）
      const frequencyConfig = {
        normal: 60000, // 正常：1分钟
        reduced: 300000, // 降低：5分钟
        increased: 30000 // 增加：30秒
      };

      return {
        ...monitoringResult,
        interval: frequencyConfig[monitoringResult.frequency] || frequencyConfig.normal
      };
    } catch (error) {
      console.error('[协同分析] 获取监测频率失败:', error);
      // 出错时返回默认配置
      return {
        interval: 60000,
        frequency: 'normal',
        error: error.message
      };
    }
  }

  /**
   * 用户不满意时提升告警级别
   * @param {Object} dissatisfactionData - 不满意数据
   * @returns {Promise<Object>} 告警调整结果
   */
  async handleUserDissatisfaction(dissatisfactionData) {
    const {
      sessionId,
      robotId,
      userId,
      userName,
      satisfactionLevel, // low, medium, high
      satisfactionScore,
      reason,
      userMessage
    } = dissatisfactionData;

    try {
      await this.init();

      // 获取当前会话工作人员状态
      const staffStatus = await this.getSessionStaffStatus(sessionId);

      // 计算告警级别提升
      let alertLevel = 'info'; // info, warning, critical
      let escalationReason = '';

      if (satisfactionLevel === 'low' || satisfactionScore < 40) {
        // 用户严重不满意，提升到最高级别
        alertLevel = 'critical';
        escalationReason = 'user_severely_dissatisfied';
      } else if (satisfactionLevel === 'medium' || satisfactionScore < 60) {
        // 用户不满意，提升到警告级别
        alertLevel = 'warning';
        escalationReason = 'user_dissatisfied';
      }

      // 如果有工作人员正在处理，通知工作人员
      if (staffStatus && staffStatus.isHandling) {
        console.log('[协同分析] 用户不满意，通知工作人员介入', {
          sessionId,
          staffUserId: staffStatus.staffUserId,
          alertLevel,
          satisfactionScore
        });

        // 记录工作人员活动（告警通知）
        await this.recordStaffActivity({
          sessionId,
          robotId,
          staffUserId: staffStatus.staffUserId,
          staffName: staffStatus.staffName,
          activityType: 'alert_notification',
          activityData: {
            alertLevel,
            escalationReason,
            satisfactionScore,
            userMessage,
            timestamp: new Date()
          }
        });
      } else {
        // 没有工作人员，发送告警通知
        console.log('[协同分析] 用户不满意，发送告警通知', {
          sessionId,
          alertLevel,
          satisfactionScore
        });

        // 调用告警服务发送告警
        try {
          const alertService = require('./alert.service');
          await alertService.createAlert({
            type: 'user_dissatisfaction',
            level: alertLevel,
            sessionId,
            robotId,
            userId,
            userName,
            message: `用户满意度低（${satisfactionScore}），原因：${reason || '未提供'}`,
            data: {
              satisfactionScore,
              satisfactionLevel,
              reason,
              userMessage,
              escalationReason
            }
          });
        } catch (alertError) {
          console.error('[协同分析] 发送告警失败:', alertError);
        }
      }

      // 记录协同决策日志
      await this.recordDecisionLog({
        sessionId,
        robotId,
        shouldAiReply: false,
        aiAction: 'wait',
        staffAction: alertLevel === 'critical' ? 'urgent' : 'review',
        priority: alertLevel === 'critical' ? 'staff' : 'ai',
        reason: `user_dissatisfaction_${escalationReason}`,
        extraData: {
          satisfactionScore,
          satisfactionLevel,
          alertLevel,
          hasStaff: !!staffStatus,
          staffUserId: staffStatus?.staffUserId
        }
      });

      const result = {
        sessionId,
        alertLevel,
        escalationReason,
        hasStaff: !!staffStatus,
        staffUserId: staffStatus?.staffUserId,
        action: staffStatus && staffStatus.isHandling ? 'notify_staff' : 'send_alert'
      };

      console.log('[协同分析] 用户不满意处理完成', result);

      return result;
    } catch (error) {
      console.error('[协同分析] 处理用户不满意失败:', error);
      throw error;
    }
  }

  /**
   * 工作人员介入时调整告警策略
   * @param {Object} interventionData - 介入数据
   * @returns {Promise<Object>} 调整结果
   */
  async adjustAlertStrategyForStaffIntervention(interventionData) {
    const {
      sessionId,
      robotId,
      staffUserId,
      staffName,
      interventionType, // join, message, command
      interventionDetails
    } = interventionData;

    try {
      await this.init();

      // 记录工作人员介入活动
      await this.recordStaffActivity({
        sessionId,
        robotId,
        staffUserId,
        staffName,
        activityType: 'intervention',
        activityData: {
          interventionType,
          interventionDetails,
          timestamp: new Date()
        }
      });

      // 更新会话工作人员状态
      await this.updateSessionStaffStatus({
        sessionId,
        robotId,
        staffUserId,
        staffName,
        status: 'active',
        isHandling: true,
        lastActivityAt: new Date(),
        extraData: {
          lastInterventionAt: new Date(),
          lastInterventionType: interventionType
        }
      });

      // 降低告警级别（工作人员已介入）
      try {
        const alertService = require('./alert.service');

        // 查询该会话的活跃告警
        const alerts = await alertService.getActiveAlertsBySession(sessionId);

        for (const alert of alerts) {
          // 如果告警级别是 critical，降级为 warning
          if (alert.level === 'critical') {
            await alertService.updateAlertLevel(alert.id, 'warning', 'staff_intervened');
          }

          // 如果告警级别是 warning，关闭告警
          if (alert.level === 'warning') {
            await alertService.resolveAlert(alert.id, 'staff_intervened');
          }
        }

        console.log('[协同分析] 告警策略已调整', {
          sessionId,
          staffUserId,
          totalAlerts: alerts.length,
          escalated: alerts.filter(a => a.level === 'critical').length,
          resolved: alerts.filter(a => a.level === 'warning').length
        });
      } catch (alertError) {
        console.error('[协同分析] 调整告警策略失败:', alertError);
        // 不影响主流程
      }

      // 记录协同决策日志
      await this.recordDecisionLog({
        sessionId,
        robotId,
        shouldAiReply: false,
        aiAction: 'wait',
        staffAction: interventionType,
        priority: 'staff',
        reason: 'staff_intervened',
        extraData: {
          staffUserId,
          staffName,
          interventionType
        }
      });

      return {
        sessionId,
        staffUserId,
        staffName,
        interventionType,
        alertStrategy: 'lowered',
        message: '工作人员已介入，告警级别已降低'
      };
    } catch (error) {
      console.error('[协同分析] 调整告警策略失败:', error);
      throw error;
    }
  }

  /**
   * 获取会话协同统计数据
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 协同统计数据
   */
  async getSessionCollabStats(sessionId) {
    try {
      await this.init();

      // 获取工作人员状态
      const staffStatus = await this.getSessionStaffStatus(sessionId);

      // 获取工作人员消息数量
      const staffMessagesResult = await this.db
        .select()
        .from(staffMessages)
        .where(eq(staffMessages.sessionId, sessionId));

      // 获取工作人员活动数量
      const staffActivitiesResult = await this.db
        .select()
        .from(staffActivities)
        .where(eq(staffActivities.sessionId, sessionId));

      // 获取协同决策数量
      const decisionLogsResult = await this.db
        .select()
        .from(collaborationDecisionLogs)
        .where(eq(collaborationDecisionLogs.sessionId, sessionId));

      // 统计活动类型
      const activityTypeStats = {};
      staffActivitiesResult.forEach(activity => {
        const type = activity.activityType;
        activityTypeStats[type] = (activityTypeStats[type] || 0) + 1;
      });

      // 统计决策优先级
      const priorityStats = {};
      decisionLogsResult.forEach(log => {
        const priority = log.priority;
        priorityStats[priority] = (priorityStats[priority] || 0) + 1;
      });

      return {
        sessionId,
        hasStaff: !!staffStatus,
        staffStatus: staffStatus ? {
          staffUserId: staffStatus.staffUserId,
          staffName: staffStatus.staffName,
          status: staffStatus.status,
          isHandling: staffStatus.isHandling,
          joinedAt: staffStatus.joinedAt,
          lastActivityAt: staffStatus.lastActivityAt,
          minutesSinceLastActivity: staffStatus.minutesSinceLastActivity
        } : null,
        stats: {
          staffMessagesCount: staffMessagesResult.length,
          staffActivitiesCount: staffActivitiesResult.length,
          decisionLogsCount: decisionLogsResult.length,
          activityTypeStats,
          priorityStats,
          collaborationRate: staffMessagesResult.length > 0 ? '100%' : '0%'
        },
        recentActivities: staffActivitiesResult
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
          .map(activity => ({
            id: activity.id,
            activityType: activity.activityType,
            activityData: JSON.parse(activity.activityData || '{}'),
            createdAt: activity.createdAt
          }))
      };
    } catch (error) {
      console.error('[协同分析] 获取会话协同统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取会话工作人员操作历史
   * @param {string} sessionId - 会话ID
   * @param {number} limit - 返回数量限制
   * @returns {Promise<Array>} 工作人员操作历史
   */
  async getSessionStaffOperationHistory(sessionId, limit = 20) {
    try {
      await this.init();

      // 获取工作人员活动（按时间倒序）
      const activities = await this.db
        .select()
        .from(staffActivities)
        .where(eq(staffActivities.sessionId, sessionId))
        .orderBy(desc(staffActivities.createdAt))
        .limit(limit);

      // 获取工作人员消息（按时间倒序）
      const messages = await this.db
        .select()
        .from(staffMessages)
        .where(eq(staffMessages.sessionId, sessionId))
        .orderBy(desc(staffMessages.createdAt))
        .limit(limit);

      // 合并并排序
      const operations = [];

      activities.forEach(activity => {
        operations.push({
          type: 'activity',
          id: activity.id,
          timestamp: activity.createdAt,
          staffUserId: activity.staffUserId,
          staffName: activity.staffName,
          activityType: activity.activityType,
          data: JSON.parse(activity.activityData || '{}'),
          extraData: JSON.parse(activity.extraData || '{}')
        });
      });

      messages.forEach(message => {
        operations.push({
          type: 'message',
          id: message.id,
          timestamp: message.createdAt,
          staffUserId: message.staffUserId,
          staffName: message.staffName,
          messageContent: message.messageContent,
          messageType: message.messageType,
          isReply: message.isReply,
          extraData: JSON.parse(message.extraData || '{}')
        });
      });

      // 按时间倒序排序
      operations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // 限制返回数量
      return operations.slice(0, limit);
    } catch (error) {
      console.error('[协同分析] 获取会话工作人员操作历史失败:', error);
      throw error;
    }
  }

  /**
   * 扩展会话统计数据，包含协同数据
   * @param {Object} sessionData - 会话数据
   * @returns {Promise<Object>} 扩展后的会话数据
   */
  async enrichSessionWithCollabData(sessionData) {
    try {
      const sessionId = sessionData.sessionId;

      // 获取协同统计
      const collabStats = await this.getSessionCollabStats(sessionId);

      // 扩展会话数据
      return {
        ...sessionData,
        collab: {
          hasStaff: collabStats.hasStaff,
          staffUserId: collabStats.staffStatus?.staffUserId,
          staffName: collabStats.staffStatus?.staffName,
          staffStatus: collabStats.staffStatus?.status,
          staffMessagesCount: collabStats.stats.staffMessagesCount,
          staffActivitiesCount: collabStats.stats.staffActivitiesCount,
          decisionLogsCount: collabStats.stats.decisionLogsCount,
          collaborationRate: collabStats.stats.collaborationRate,
          isStaffHandling: collabStats.staffStatus?.isHandling
        }
      };
    } catch (error) {
      console.error('[协同分析] 扩展会话数据失败:', error);
      // 出错时返回原始数据，不包含协同数据
      return {
        ...sessionData,
        collab: null
      };
    }
  }

  /**
   * 生成智能推荐
   * 基于协同数据分析生成优化建议
   * @returns {Promise<Array>} 推荐列表
   */
  async generateRecommendations() {
    try {
      // 检查缓存
      const cacheKey = `recommendations:basic`;
      const cached = this.getCache(cacheKey);
      if (cached) {
        return cached;
      }

      await this.init();

      const recommendations = [];

      // 1. 分析工作人员活跃度
      const staffActivityQuery = await this.db
        .select()
        .from(staffActivities)
        .orderBy(desc(staffActivities.createdAt))
        .limit(100);

      const staffActivityMap = new Map();
      staffActivityQuery.forEach(activity => {
        const staffId = activity.staffUserId;
        if (!staffActivityMap.has(staffId)) {
          staffActivityMap.set(staffId, {
            staffUserId: staffId,
            staffName: activity.staffName,
            totalActivities: 0,
            messages: 0,
            interventions: 0,
            lastActivity: null
          });
        }
        const staff = staffActivityMap.get(staffId);
        staff.totalActivities++;
        if (activity.activityType === 'message') staff.messages++;
        if (activity.activityType === 'intervention') staff.interventions++;
        if (!staff.lastActivity || new Date(activity.createdAt) > new Date(staff.lastActivity)) {
          staff.lastActivity = activity.createdAt;
        }
      });

      // 检测活跃度低的工作人员
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      staffActivityMap.forEach((staff, staffId) => {
        if (staff.totalActivities < 5 || new Date(staff.lastActivity) < oneDayAgo) {
          recommendations.push({
            id: `rec_staff_low_activity_${staffId}`,
            type: 'staff',
            priority: 'medium',
            title: `${staff.staffName}活跃度偏低`,
            description: `${staff.staffName}在过去24小时内仅处理了${staff.messages}条消息，建议检查工作状态或分配更多会话。`,
            action: '查看详情',
            actionUrl: `/collab/staff/${staffId}`,
            data: {
              staffUserId: staffId,
              staffName: staff.staffName,
              totalActivities: staff.totalActivities,
              messages: staff.messages,
              lastActivity: staff.lastActivity
            },
            createdAt: new Date()
          });
        }
      });

      // 2. 分析会话协同率
      const sessionsWithStaff = await this.db
        .select()
        .from(sessionStaffStatus)
        .where(eq(sessionStaffStatus.isHandling, true));

      // 检测长时间未处理的风险会话
      const riskSessions = [];
      for (const session of sessionsWithStaff) {
        const minutesSinceLastActivity = Math.floor((Date.now() - new Date(session.lastActivityAt).getTime()) / 1000 / 60);
        if (minutesSinceLastActivity > 30) {
          riskSessions.push({
            sessionId: session.sessionId,
            staffUserId: session.staffUserId,
            staffName: session.staffName,
            minutesSinceLastActivity
          });
        }
      }

      if (riskSessions.length > 0) {
        recommendations.push({
          id: 'rec_risk_sessions',
          type: 'session',
          priority: 'high',
          title: `${riskSessions.length}个会话长时间未处理`,
          description: `有${riskSessions.length}个会话超过30分钟未收到工作人员回复，建议及时处理。`,
          action: '查看会话',
          actionUrl: '/sessions?filter=risk',
          data: {
            sessionCount: riskSessions.length,
            sessions: riskSessions.slice(0, 3)
          },
          createdAt: new Date()
        });
      }

      // 3. 分析决策分布
      const decisionLogsQuery = await this.db
        .select()
        .from(collaborationDecisionLogs)
        .orderBy(desc(collaborationDecisionLogs.createdAt))
        .limit(100);

      const priorityCount = { staff: 0, ai: 0, both: 0 };
      decisionLogsQuery.forEach(log => {
        if (priorityCount.hasOwnProperty(log.priority)) {
          priorityCount[log.priority]++;
        }
      });

      // 如果工作人员优先比例过高，建议优化AI配置
      const totalDecisions = Object.values(priorityCount).reduce((a, b) => a + b, 0);
      if (totalDecisions > 0 && priorityCount.staff / totalDecisions > 0.8) {
        recommendations.push({
          id: 'rec_ai_optimization',
          type: 'ai',
          priority: 'medium',
          title: 'AI回复率较低，建议优化AI配置',
          description: `最近100次决策中，工作人员优先占比${(priorityCount.staff / totalDecisions * 100).toFixed(1)}%，建议优化AI回复策略或更新知识库。`,
          action: '查看AI配置',
          actionUrl: '/ai-module',
          data: {
            totalDecisions,
            staffPriority: priorityCount.staff,
            aiPriority: priorityCount.ai,
            bothPriority: priorityCount.both
          },
          createdAt: new Date()
        });
      }

      // 4. 按优先级排序推荐
      recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // 5. 设置缓存（P2优化）
      const result = recommendations.slice(0, 10); // 最多返回10条推荐
      cacheManager.set(cacheKey, result, RECOMMENDATION_CACHE_TTL);

      return result;
    } catch (error) {
      console.error('[协同分析] 生成智能推荐失败:', error);
      return [];
    }
  }

  /**
   * 生成增强版智能推荐（更多推荐类型）
   * 基于协同数据分析生成优化建议
   * @returns {Promise<Array>} 推荐列表
   */
  async generateEnhancedRecommendations() {
    try {
      await this.init();

      const recommendations = [];
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // ============================================
      // 1. 工作人员活跃度分析（已有）
      // ============================================
      const staffActivityQuery = await this.db
        .select()
        .from(staffActivities)
        .orderBy(desc(staffActivities.createdAt))
        .limit(200);

      const staffActivityMap = new Map();
      const staffReplyRateMap = new Map();

      staffActivityQuery.forEach(activity => {
        const staffId = activity.staffUserId;
        if (!staffActivityMap.has(staffId)) {
          staffActivityMap.set(staffId, {
            staffUserId: staffId,
            staffName: activity.staffName,
            totalActivities: 0,
            messages: 0,
            interventions: 0,
            lastActivity: null,
            recentActivity24h: 0,
            recentActivity7d: 0
          });
        }
        const staff = staffActivityMap.get(staffId);
        staff.totalActivities++;
        if (activity.activityType === 'message') staff.messages++;
        if (activity.activityType === 'intervention') staff.interventions++;
        if (!staff.lastActivity || new Date(activity.createdAt) > new Date(staff.lastActivity)) {
          staff.lastActivity = activity.createdAt;
        }
        if (new Date(activity.createdAt) >= oneDayAgo) {
          staff.recentActivity24h++;
        }
        if (new Date(activity.createdAt) >= oneWeekAgo) {
          staff.recentActivity7d++;
        }
      });

      // 检测活跃度低的工作人员
      staffActivityMap.forEach((staff, staffId) => {
        if (staff.recentActivity24h < 5 && staff.recentActivity7d < 20) {
          const priority = staff.recentActivity24h < 2 ? 'high' : 'medium';
          recommendations.push({
            id: `rec_staff_low_activity_${staffId}_${Date.now()}`,
            type: 'staff',
            category: 'activity',
            priority,
            title: `${staff.staffName}活跃度偏低`,
            description: `${staff.staffName}在过去24小时内仅处理了${staff.recentActivity24h}条消息，7天内处理了${staff.recentActivity7d}条，建议检查工作状态或分配更多会话。`,
            action: '查看详情',
            actionUrl: `/collab/staff/${staffId}`,
            data: {
              staffUserId: staffId,
              staffName: staff.staffName,
              totalActivities: staff.totalActivities,
              messages: staff.messages,
              interventions: staff.interventions,
              recentActivity24h: staff.recentActivity24h,
              recentActivity7d: staff.recentActivity7d,
              lastActivity: staff.lastActivity
            },
            weight: priority === 'high' ? 0.9 : 0.7,
            createdAt: now
          });
        }
      });

      // ============================================
      // 2. 会话协同率分析（新增）
      // ============================================
      const sessionStats = await this.db
        .select({
          sessionId: sessionStaffStatus.sessionId,
          staffUserId: sessionStaffStatus.staffUserId,
          staffName: sessionStaffStatus.staffName,
          joinedAt: sessionStaffStatus.joinedAt,
          lastActivityAt: sessionStaffStatus.lastActivityAt,
          isHandling: sessionStaffStatus.isHandling,
          staffMessageCount: this.db.select()
            .from(staffMessages)
            .where(eq(staffMessages.sessionId, sessionStaffStatus.sessionId))
        })
        .from(sessionStaffStatus);

      // 检测长时间未处理的风险会话
      const riskSessions = [];
      for (const session of sessionStats) {
        const minutesSinceLastActivity = Math.floor((now - new Date(session.lastActivityAt).getTime()) / 1000 / 60);
        if (minutesSinceLastActivity > 30 && session.isHandling) {
          riskSessions.push({
            sessionId: session.sessionId,
            staffUserId: session.staffUserId,
            staffName: session.staffName,
            minutesSinceLastActivity
          });
        }
      }

      if (riskSessions.length > 0) {
        const priority = riskSessions.length > 5 ? 'high' : 'medium';
        recommendations.push({
          id: `rec_risk_sessions_${Date.now()}`,
          type: 'session',
          category: 'risk',
          priority,
          title: `${riskSessions.length}个会话长时间未处理`,
          description: `有${riskSessions.length}个会话超过30分钟未收到工作人员回复，建议及时处理以免影响用户体验。`,
          action: '查看会话',
          actionUrl: '/sessions?filter=risk',
          data: {
            sessionCount: riskSessions.length,
            sessions: riskSessions.slice(0, 5)
          },
          weight: priority === 'high' ? 0.95 : 0.8,
          createdAt: now
        });
      }

      // ============================================
      // 3. 决策分布分析（已有，增强）
      // ============================================
      const decisionLogsQuery = await this.db
        .select()
        .from(collaborationDecisionLogs)
        .where(gte(collaborationDecisionLogs.createdAt, oneWeekAgo))
        .orderBy(desc(collaborationDecisionLogs.createdAt))
        .limit(500);

      const priorityCount = { staff: 0, ai: 0, both: 0 };
      const aiActionCount = { reply: 0, wait: 0 };
      const staffActionCount = { continue: 0, urgent: 0, review: 0 };

      decisionLogsQuery.forEach(log => {
        if (priorityCount.hasOwnProperty(log.priority)) {
          priorityCount[log.priority]++;
        }
        if (aiActionCount.hasOwnProperty(log.aiAction)) {
          aiActionCount[log.aiAction]++;
        }
        if (staffActionCount.hasOwnProperty(log.staffAction)) {
          staffActionCount[log.staffAction]++;
        }
      });

      const totalDecisions = Object.values(priorityCount).reduce((a, b) => a + b, 0);

      // AI回复率过低
      if (totalDecisions > 0 && priorityCount.staff / totalDecisions > 0.8) {
        const aiReplyRate = ((priorityCount.ai + priorityCount.both) / totalDecisions * 100).toFixed(1);
        recommendations.push({
          id: `rec_ai_low_reply_${Date.now()}`,
          type: 'ai',
          category: 'efficiency',
          priority: 'medium',
          title: `AI回复率较低（${aiReplyRate}%）`,
          description: `最近一周${totalDecisions}次决策中，工作人员优先占比${(priorityCount.staff / totalDecisions * 100).toFixed(1)}%，建议优化AI回复策略或更新知识库。`,
          action: '查看AI配置',
          actionUrl: '/ai-module',
          data: {
            totalDecisions,
            staffPriority: priorityCount.staff,
            aiPriority: priorityCount.ai,
            bothPriority: priorityCount.both,
            aiReplyRate
          },
          weight: 0.75,
          createdAt: now
        });
      }

      // 工作人员介入过频
      if (totalDecisions > 0 && priorityCount.staff / totalDecisions > 0.6 && staffActionCount.urgent > 10) {
        recommendations.push({
          id: `rec_staff_frequent_intervention_${Date.now()}`,
          type: 'staff',
          category: 'intervention',
          priority: 'medium',
          title: `工作人员紧急介入过频（${staffActionCount.urgent}次）`,
          description: `最近一周工作人员紧急介入${staffActionCount.urgent}次，可能说明AI处理能力不足，建议优化AI配置或增加知识库内容。`,
          action: '查看介入记录',
          actionUrl: '/collab/interventions',
          data: {
            urgentInterventions: staffActionCount.urgent,
            totalDecisions
          },
          weight: 0.7,
          createdAt: now
        });
      }

      // ============================================
      // 4. 工作人员负载分析（新增）
      // ============================================
      const staffLoadMap = new Map();
      const activeSessions = await this.db
        .select()
        .from(sessionStaffStatus)
        .where(eq(sessionStaffStatus.isHandling, true));

      activeSessions.forEach(session => {
        const staffId = session.staffUserId;
        if (!staffLoadMap.has(staffId)) {
          staffLoadMap.set(staffId, {
            staffUserId: staffId,
            staffName: session.staffName,
            activeSessions: 0,
            totalSessions: 0
          });
        }
        const load = staffLoadMap.get(staffId);
        load.activeSessions++;
        load.totalSessions++;
      });

      // 检测负载不均
      if (staffLoadMap.size > 1) {
        const maxLoad = Math.max(...Array.from(staffLoadMap.values()).map(s => s.activeSessions));
        const minLoad = Math.min(...Array.from(staffLoadMap.values()).map(s => s.activeSessions));

        if (maxLoad > minLoad * 3) {
          const overloadedStaff = Array.from(staffLoadMap.values()).find(s => s.activeSessions === maxLoad);
          recommendations.push({
            id: `rec_staff_load_imbalance_${Date.now()}`,
            type: 'staff',
            category: 'load',
            priority: 'medium',
            title: `${overloadedStaff.staffName}负载过重（${maxLoad}个会话）`,
            description: `${overloadedStaff.staffName}当前正在处理${maxLoad}个会话，负载过重。建议分配部分会话给其他工作人员。`,
            action: '查看负载',
            actionUrl: '/collab/staff/load',
            data: {
              overloadedStaff: overloadedStaff,
              maxLoad,
              minLoad,
              loadRatio: (maxLoad / minLoad).toFixed(1)
            },
            weight: 0.65,
            createdAt: now
          });
        }
      }

      // ============================================
      // 5. 协同效率分析（新增）
      // ============================================
      const efficiencyStats = await this.db
        .select({
          sessionId: staffMessages.sessionId,
          staffMessageCount: this.db.select()
            .from(staffMessages)
            .where(eq(staffMessages.sessionId, staffMessages.sessionId))
        })
        .from(staffMessages)
        .where(gte(staffMessages.createdAt, oneDayAgo))
        .limit(100);

      // 计算平均响应时间（假设）
      const avgStaffMessages = efficiencyStats.length > 0 
        ? efficiencyStats.reduce((sum, s) => sum + (s.staffMessageCount?.length || 0), 0) / efficiencyStats.length
        : 0;

      if (avgStaffMessages > 10) {
        recommendations.push({
          id: `rec_efficiency_low_${Date.now()}`,
          type: 'collaboration',
          category: 'efficiency',
          priority: 'low',
          title: `协同效率有待提升`,
          description: `工作人员平均每个会话处理${avgStaffMessages.toFixed(1)}条消息，建议优化协作流程，减少不必要的沟通。`,
          action: '查看效率分析',
          actionUrl: '/collab/efficiency',
          data: {
            avgStaffMessages: avgStaffMessages.toFixed(1),
            totalSessions: efficiencyStats.length
          },
          weight: 0.5,
          createdAt: now
        });
      }

      // ============================================
      // 6. 知识库更新建议（新增）
      // ============================================
      const frequentInterventions = decisionLogsQuery.filter(log => 
        log.staffAction === 'urgent' && 
        log.reason === 'staff_intervened'
      ).slice(0, 10);

      if (frequentInterventions.length > 5) {
        recommendations.push({
          id: `rec_kb_update_${Date.now()}`,
          type: 'knowledge',
          category: 'knowledge',
          priority: 'medium',
          title: `建议更新知识库`,
          description: `最近一周有${frequentInterventions.length}次紧急工作人员介入，建议将这些场景添加到知识库，提高AI处理能力。`,
          action: '查看知识库',
          actionUrl: '/knowledge',
          data: {
            interventionCount: frequentInterventions.length,
            topInterventions: frequentInterventions.slice(0, 3)
          },
          weight: 0.6,
          createdAt: now
        });
      }

      // ============================================
      // 按权重和优先级排序推荐
      // ============================================
      recommendations.sort((a, b) => {
        // 首先按优先级排序
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // 相同优先级按权重排序
        const weightDiff = (b.weight || 0) - (a.weight || 0);
        if (weightDiff !== 0) return weightDiff;

        // 相同权重按时间排序
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      return recommendations.slice(0, 15); // 最多返回15条推荐
    } catch (error) {
      console.error('[协同分析] 生成增强智能推荐失败:', error);
      return [];
    }
  }

  /**
   * 获取推荐分类统计
   * @returns {Promise<Object>} 分类统计
   */
  async getRecommendationStats() {
    try {
      const recommendations = await this.generateEnhancedRecommendations();

      const stats = {
        total: recommendations.length,
        byPriority: {
          high: 0,
          medium: 0,
          low: 0
        },
        byType: {
          staff: 0,
          session: 0,
          ai: 0,
          collaboration: 0,
          knowledge: 0
        },
        byCategory: {
          activity: 0,
          risk: 0,
          efficiency: 0,
          intervention: 0,
          load: 0,
          knowledge: 0
        }
      };

      recommendations.forEach(rec => {
        // 按优先级统计
        if (stats.byPriority.hasOwnProperty(rec.priority)) {
          stats.byPriority[rec.priority]++;
        }

        // 按类型统计
        if (stats.byType.hasOwnProperty(rec.type)) {
          stats.byType[rec.type]++;
        }

        // 按分类统计
        if (stats.byCategory.hasOwnProperty(rec.category)) {
          stats.byCategory[rec.category]++;
        }
      });

      return {
        ...stats,
        recommendations
      };
    } catch (error) {
      console.error('[协同分析] 获取推荐统计失败:', error);
      return {
        total: 0,
        byPriority: { high: 0, medium: 0, low: 0 },
        byType: { staff: 0, session: 0, ai: 0, collaboration: 0, knowledge: 0 },
        byCategory: { activity: 0, risk: 0, efficiency: 0, intervention: 0, load: 0, knowledge: 0 },
        recommendations: []
      };
    }
  }

  /**
   * 获取机器人满意度列表
   * @param {string} timeRange - 时间范围
   * @param {number} limit - 返回数量限制
   * @returns {Promise<Array>} 机器人满意度列表
   */
  async getRobotSatisfactionList(timeRange = '24h', limit = 20) {
    try {
      await this.init();

      // 计算时间范围
      const now = new Date();
      let startTime;
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // 获取协同决策日志，按robotId分组
      const decisionLogs = await this.db
        .select()
        .from(collaborationDecisionLogs)
        .where(gte(collaborationDecisionLogs.createdAt, startTime));

      // 按robotId分组统计
      const robotStats = new Map();

      decisionLogs.forEach(log => {
        const robotId = log.robotId;
        if (!robotStats.has(robotId)) {
          robotStats.set(robotId, {
            robotId,
            totalDecisions: 0,
            aiReply: 0,
            staffReply: 0,
            bothReply: 0,
            collaborationRate: 0,
            avgResponseTime: 0,
            satisfactionScore: 75, // 默认满意度
            lastActivity: log.createdAt
          });
        }

        const stats = robotStats.get(robotId);
        stats.totalDecisions++;

        if (log.aiAction === 'reply') stats.aiReply++;
        if (log.staffAction === 'continue') stats.staffReply++;
        if (log.priority === 'both') stats.bothReply++;

        // 更新最新活动时间
        if (new Date(log.createdAt) > new Date(stats.lastActivity)) {
          stats.lastActivity = log.createdAt;
        }
      });

      // 计算每个机器人的统计指标
      const robotList = [];
      robotStats.forEach((stats, robotId) => {
        // 计算协同率（AI回复的比例）
        const collaborationRate = stats.totalDecisions > 0
          ? ((stats.aiReply + stats.bothReply) / stats.totalDecisions * 100).toFixed(2)
          : '0.00';

        // 根据协同率计算满意度（简化算法）
        let satisfactionScore = 75; // 基础分
        if (collaborationRate > 80) satisfactionScore += 15;
        else if (collaborationRate > 60) satisfactionScore += 10;
        else if (collaborationRate < 40) satisfactionScore -= 15;

        // 根据工作人员介入调整满意度
        if (stats.staffReply > stats.totalDecisions * 0.3) {
          satisfactionScore -= 10; // 工作人员介入过多，说明AI处理能力不足
        }

        satisfactionScore = Math.max(0, Math.min(100, satisfactionScore));

        robotList.push({
          ...stats,
          collaborationRate: parseFloat(collaborationRate),
          satisfactionScore
        });
      });

      // 按满意度降序排序
      robotList.sort((a, b) => b.satisfactionScore - a.satisfactionScore);

      return robotList.slice(0, limit);
    } catch (error) {
      console.error('[协同分析] 获取机器人满意度列表失败:', error);
      return [];
    }
  }

  /**
   * 获取机器人满意度详情
   * @param {string} robotId - 机器人ID
   * @param {string} timeRange - 时间范围
   * @returns {Promise<Object>} 机器人满意度详情
   */
  async getRobotSatisfactionDetail(robotId, timeRange = '24h') {
    try {
      await this.init();

      // 计算时间范围
      const now = new Date();
      let startTime;
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // 获取该机器人的决策日志
      const decisionLogs = await this.db
        .select()
        .from(collaborationDecisionLogs)
        .where(
          and(
            eq(collaborationDecisionLogs.robotId, robotId),
            gte(collaborationDecisionLogs.createdAt, startTime)
          )
        )
        .orderBy(desc(collaborationDecisionLogs.createdAt))
        .limit(100);

      if (decisionLogs.length === 0) {
        return {
          robotId,
          error: '未找到该机器人的决策日志'
        };
      }

      // 统计决策数据
      const stats = {
        totalDecisions: decisionLogs.length,
        aiReply: 0,
        staffReply: 0,
        bothReply: 0,
        priority: { staff: 0, ai: 0, both: 0, none: 0 },
        aiAction: { reply: 0, wait: 0 },
        staffAction: { continue: 0, urgent: 0, review: 0, none: 0 },
        reasons: {}
      };

      decisionLogs.forEach(log => {
        if (log.aiAction === 'reply') stats.aiReply++;
        if (log.staffAction === 'continue') stats.staffReply++;
        if (log.priority === 'both') stats.bothReply++;

        if (stats.priority.hasOwnProperty(log.priority)) {
          stats.priority[log.priority]++;
        }

        if (stats.aiAction.hasOwnProperty(log.aiAction)) {
          stats.aiAction[log.aiAction]++;
        }

        if (stats.staffAction.hasOwnProperty(log.staffAction)) {
          stats.staffAction[log.staffAction]++;
        }

        // 统计决策原因
        if (log.reason) {
          stats.reasons[log.reason] = (stats.reasons[log.reason] || 0) + 1;
        }
      });

      // 计算协同率和满意度
      const collaborationRate = stats.totalDecisions > 0
        ? ((stats.aiReply + stats.bothReply) / stats.totalDecisions * 100).toFixed(2)
        : '0.00';

      let satisfactionScore = 75;
      if (parseFloat(collaborationRate) > 80) satisfactionScore += 15;
      else if (parseFloat(collaborationRate) > 60) satisfactionScore += 10;
      else if (parseFloat(collaborationRate) < 40) satisfactionScore -= 15;

      if (stats.staffReply > stats.totalDecisions * 0.3) {
        satisfactionScore -= 10;
      }

      satisfactionScore = Math.max(0, Math.min(100, satisfactionScore));

      // 获取最近的活动日志
      const recentActivities = decisionLogs.slice(0, 10).map(log => ({
        id: log.id,
        sessionId: log.sessionId,
        priority: log.priority,
        aiAction: log.aiAction,
        staffAction: log.staffAction,
        reason: log.reason,
        createdAt: log.createdAt
      }));

      return {
        robotId,
        timeRange,
        stats: {
          ...stats,
          collaborationRate: parseFloat(collaborationRate),
          satisfactionScore
        },
        recentActivities,
        summary: {
          satisfactionLevel: satisfactionScore >= 80 ? 'excellent' :
                           satisfactionScore >= 60 ? 'good' :
                           satisfactionScore >= 40 ? 'fair' : 'poor',
          needsAttention: satisfactionScore < 60,
          suggestion: satisfactionScore < 60 
            ? '建议优化AI配置或增加知识库内容' 
            : 'AI运行良好，继续保持'
        }
      };
    } catch (error) {
      console.error('[协同分析] 获取机器人满意度详情失败:', error);
      throw error;
    }
  }

  /**
   * 处理工作人员消息
   * 综合识别、记录、活动跟踪
   * @param {Object} messageData - 消息数据
   * @returns {Promise<Object>} { isStaff, staffInfo, recordResults }
   */
  async handleStaffMessage(messageData) {
    const {
      sessionId,
      robotId,
      messageId,
      fromName,
      groupName,
      remarkName,
      company,
      userId,
      messageContent,
      messageType = 'text',
      isReply = false
    } = messageData;

    try {
      // 1. 识别是否为工作人员
      const userInfo = {
        userName: fromName,
        groupName,
        remarkName,
        company,
        userId
      };

      const { isStaff, staffInfo, reasons } = StaffIdentifier.identify(userInfo);

      if (!isStaff) {
        console.log('[协同分析] 非工作人员消息，跳过处理', {
          userName: fromName,
          groupId: groupName
        });
        return {
          isStaff: false,
          staffInfo: null,
          recordResults: null
        };
      }

      console.log('[协同分析] 检测到工作人员消息', {
        sessionId,
        staffUserId: staffInfo.staffUserId,
        staffName: staffInfo.staffName,
        reasons
      });

      // 2. 记录工作人员消息
      await this.recordStaffMessage({
        sessionId,
        robotId,
        staffUserId: staffInfo.staffUserId,
        staffName: staffInfo.staffName,
        messageContent,
        messageType,
        isReply,
        extraData: { messageId }
      });

      // 3. 记录工作人员活动
      await this.recordStaffActivity({
        sessionId,
        robotId,
        staffUserId: staffInfo.staffUserId,
        staffName: staffInfo.staffName,
        activityType: 'message',
        activityData: {
          messageId,
          messageType,
          isReply
        },
        extraData: reasons
      });

      // 4. 更新会话工作人员状态
      await this.updateSessionStaffStatus({
        sessionId,
        robotId,
        staffUserId: staffInfo.staffUserId,
        staffName: staffInfo.staffName,
        status: 'active',
        isHandling: true,
        lastActivityAt: new Date(),
        extraData: { lastMessageId: messageId }
      });

      return {
        isStaff: true,
        staffInfo,
        recordResults: {
          messageRecorded: true,
          activityRecorded: true,
          statusUpdated: true
        }
      };
    } catch (error) {
      console.error('[协同分析] 处理工作人员消息失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
const collaborationService = new CollaborationService();

module.exports = {
  collaborationService,
  StaffIdentifier
};
