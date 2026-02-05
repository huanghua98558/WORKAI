/**
 * 工作人员识别服务
 * 用于识别群内的工作人员（支持企业微信和微信）
 *
 * 功能：
 * - 多维度识别：userId、备注名、昵称、企业名、特殊标识
 * - 配置化：支持动态配置识别规则
 * - 灵活扩展：可添加新的识别规则
 */

class StaffIdentifierService {
  constructor(config = {}) {
    this.config = {
      enabled: true,
      userIds: [], // 工作人员ID白名单
      userRemarks: ['客服', '运营', '技术', '管理员'], // 备注名关键词
      nicknames: ['客服', '运营', '技术', '管理员'], // 昵称关键词
      enterpriseNames: [], // 企业名称
      specialPatterns: ['@staff', 'STAFF', '管理员'], // 特殊标识
      ...config
    };

    console.log('[StaffIdentifier] 工作人员识别服务初始化完成', {
      enabled: this.config.enabled,
      userIds: this.config.userIds.length,
      userRemarks: this.config.userRemarks.length,
      nicknames: this.config.nicknames.length
    });
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新的配置
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };

    console.log('[StaffIdentifier] 配置已更新', {
      enabled: this.config.enabled,
      userIds: this.config.userIds.length,
      userRemarks: this.config.userRemarks.length
    });
  }

  /**
   * 判断用户是否为工作人员
   * @param {Object} message - 消息对象
   * @param {string} message.userId - 用户ID
   * @param {string} message.receivedName - 接收到的名称（昵称）
   * @param {string} message.groupName - 群组名称
   * @param {string} message.userRemark - 用户备注
   * @param {string} message.platform - 平台（enterprise/wechat）
   * @returns {boolean} 是否为工作人员
   */
  isStaffUser(message) {
    if (!this.config.enabled) {
      return false;
    }

    const {
      userId,
      receivedName,
      groupName,
      userRemark,
      platform
    } = message;

    // 1. userId白名单匹配（最准确，优先级最高）
    if (this.config.userIds && this.config.userIds.length > 0) {
      if (this.config.userIds.includes(userId)) {
        console.log('[StaffIdentifier] ✅ userId白名单匹配:', {
          userId,
          receivedName
        });
        return true;
      }
    }

    // 2. 企业微信特征检测
    if (platform === 'enterprise') {
      if (this.config.enterpriseNames && this.config.enterpriseNames.length > 0) {
        for (const enterpriseName of this.config.enterpriseNames) {
          if (receivedName && receivedName.includes(enterpriseName)) {
            console.log('[StaffIdentifier] ✅ 企业名匹配:', {
              receivedName,
              enterpriseName
            });
            return true;
          }
        }
      }
    }

    // 3. 备注名匹配
    if (userRemark && this.config.userRemarks && this.config.userRemarks.length > 0) {
      for (const remark of this.config.userRemarks) {
        if (userRemark.includes(remark)) {
          console.log('[StaffIdentifier] ✅ 备注名匹配:', {
            userRemark,
            keyword: remark
          });
          return true;
        }
      }
    }

    // 4. 昵称匹配
    if (receivedName && this.config.nicknames && this.config.nicknames.length > 0) {
      for (const nickname of this.config.nicknames) {
        if (receivedName.includes(nickname)) {
          console.log('[StaffIdentifier] ✅ 昵称匹配:', {
            receivedName,
            keyword: nickname
          });
          return true;
        }
      }
    }

    // 5. 特殊标识匹配
    if (this.config.specialPatterns && this.config.specialPatterns.length > 0) {
      for (const pattern of this.config.specialPatterns) {
        if ((receivedName && receivedName.includes(pattern)) ||
            (userRemark && userRemark.includes(pattern))) {
          console.log('[StaffIdentifier] ✅ 特殊标识匹配:', {
            receivedName,
            userRemark,
            pattern
          });
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 从消息中提取工作人员特征
   * @param {Object} message - 消息对象
   * @returns {Object} 工作人员特征
   */
  extractStaffFeatures(message) {
    return {
      userId: message.userId || message.fromName,
      receivedName: message.receivedName || message.fromName,
      groupName: message.groupName,
      userRemark: message.userRemark,
      platform: message.platform
    };
  }

  /**
   * 获取匹配到的识别规则
   * @param {Object} message - 消息对象
   * @returns {Object|null} 匹配到的规则，如果未匹配则返回null
   */
  getMatchedRule(message) {
    const { userId, receivedName, userRemark, platform } = message;

    // 检查userId
    if (this.config.userIds && this.config.userIds.includes(userId)) {
      return { type: 'userId', value: userId };
    }

    // 检查企业名
    if (platform === 'enterprise' && this.config.enterpriseNames) {
      for (const enterpriseName of this.config.enterpriseNames) {
        if (receivedName && receivedName.includes(enterpriseName)) {
          return { type: 'enterpriseName', value: enterpriseName };
        }
      }
    }

    // 检查备注名
    if (userRemark && this.config.userRemarks) {
      for (const remark of this.config.userRemarks) {
        if (userRemark.includes(remark)) {
          return { type: 'userRemark', value: remark };
        }
      }
    }

    // 检查昵称
    if (receivedName && this.config.nicknames) {
      for (const nickname of this.config.nicknames) {
        if (receivedName.includes(nickname)) {
          return { type: 'nickname', value: nickname };
        }
      }
    }

    // 检查特殊标识
    if (this.config.specialPatterns) {
      for (const pattern of this.config.specialPatterns) {
        if ((receivedName && receivedName.includes(pattern)) ||
            (userRemark && userRemark.includes(pattern))) {
          return { type: 'specialPattern', value: pattern };
        }
      }
    }

    return null;
  }

  /**
   * 批量识别工作人员
   * @param {Array<Object>} messages - 消息数组
   * @returns {Array<Object>} 包含isStaff标记的消息数组
   */
  batchIdentify(messages) {
    return messages.map(message => ({
      ...message,
      isStaff: this.isStaffUser(message),
      senderType: this.isStaffUser(message) ? 'staff' : 'user'
    }));
  }

  /**
   * 添加工作人员ID到白名单
   * @param {string} userId - 工作人员ID
   */
  addStaffUserId(userId) {
    if (!this.config.userIds.includes(userId)) {
      this.config.userIds.push(userId);
      console.log('[StaffIdentifier] 添加工作人员ID:', userId);
    }
  }

  /**
   * 移除工作人员ID从白名单
   * @param {string} userId - 工作人员ID
   */
  removeStaffUserId(userId) {
    const index = this.config.userIds.indexOf(userId);
    if (index > -1) {
      this.config.userIds.splice(index, 1);
      console.log('[StaffIdentifier] 移除工作人员ID:', userId);
    }
  }

  /**
   * 添加备注名关键词
   * @param {string} keyword - 关键词
   */
  addUserRemarkKeyword(keyword) {
    if (!this.config.userRemarks.includes(keyword)) {
      this.config.userRemarks.push(keyword);
      console.log('[StaffIdentifier] 添加备注名关键词:', keyword);
    }
  }

  /**
   * 添加昵称关键词
   * @param {string} keyword - 关键词
   */
  addNicknameKeyword(keyword) {
    if (!this.config.nicknames.includes(keyword)) {
      this.config.nicknames.push(keyword);
      console.log('[StaffIdentifier] 添加昵称关键词:', keyword);
    }
  }

  /**
   * 获取当前配置
   * @returns {Object} 当前配置
   */
  getConfig() {
    return { ...this.config };
  }
}

// 创建单例
const staffIdentifierService = new StaffIdentifierService();

module.exports = staffIdentifierService;
