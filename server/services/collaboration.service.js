/**
 * 协同分析服务
 * 处理工作人员识别、消息记录、活动跟踪等功能
 */

const { getDb } = require('coze-coding-dev-sdk');
const { eq, and, desc } = require('coze-coding-dev-sdk').operators;
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
