/**
 * 工作人员识别服务
 * 用于识别群内的工作人员（支持企业微信和微信）
 */

class StaffIdentifier {
  constructor(config = {}) {
    this.config = {
      userIds: [], // 直接指定的用户ID列表
      userRemarks: [], // 备注名关键词列表
      nicknames: [], // 昵称关键词列表
      enterpriseNames: [], // 企业名称列表
      specialPatterns: [], // 特殊标识列表
      enabled: true,
      ...config
    };
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
  }

  /**
   * 判断用户是否为工作人员
   * @param {Object} message - 消息对象
   * @returns {boolean}
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

    // 1. userId匹配（最准确）
    if (this.config.userIds && this.config.userIds.length > 0) {
      if (this.config.userIds.includes(userId)) {
        return true;
      }
    }

    // 2. 企业微信特征检测
    if (platform === 'enterprise') {
      // 企业名匹配
      if (this.config.enterpriseNames && this.config.enterpriseNames.length > 0) {
        for (const enterpriseName of this.config.enterpriseNames) {
          if (receivedName && receivedName.includes(enterpriseName)) {
            return true;
          }
        }
      }
    }

    // 3. 备注名匹配
    if (userRemark && this.config.userRemarks && this.config.userRemarks.length > 0) {
      for (const remark of this.config.userRemarks) {
        if (userRemark.includes(remark)) {
          return true;
        }
      }
    }

    // 4. 昵称匹配
    if (receivedName && this.config.nicknames && this.config.nicknames.length > 0) {
      for (const nickname of this.config.nicknames) {
        if (receivedName.includes(nickname)) {
          return true;
        }
      }
    }

    // 5. 特殊标识匹配
    if (this.config.specialPatterns && this.config.specialPatterns.length > 0) {
      for (const pattern of this.config.specialPatterns) {
        if ((receivedName && receivedName.includes(pattern)) ||
            (userRemark && userRemark.includes(pattern))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 获取匹配到的识别规则
   * @param {Object} message - 消息对象
   * @returns {Object|null} - 返回匹配的规则信息，如果不匹配返回null
   */
  getMatchedRule(message) {
    if (!this.config.enabled) {
      return null;
    }

    const {
      userId,
      receivedName,
      userRemark,
      platform
    } = message;

    // 1. userId匹配
    if (this.config.userIds && this.config.userIds.length > 0) {
      if (this.config.userIds.includes(userId)) {
        return {
          type: 'userId',
          value: userId,
          reason: '直接指定的用户ID'
        };
      }
    }

    // 2. 企业名匹配
    if (platform === 'enterprise' && this.config.enterpriseNames && this.config.enterpriseNames.length > 0) {
      for (const enterpriseName of this.config.enterpriseNames) {
        if (receivedName && receivedName.includes(enterpriseName)) {
          return {
            type: 'enterpriseName',
            value: enterpriseName,
            reason: '企业微信企业名匹配'
          };
        }
      }
    }

    // 3. 备注名匹配
    if (userRemark && this.config.userRemarks && this.config.userRemarks.length > 0) {
      for (const remark of this.config.userRemarks) {
        if (userRemark.includes(remark)) {
          return {
            type: 'userRemark',
            value: remark,
            reason: '备注名关键词匹配'
          };
        }
      }
    }

    // 4. 昵称匹配
    if (receivedName && this.config.nicknames && this.config.nicknames.length > 0) {
      for (const nickname of this.config.nicknames) {
        if (receivedName.includes(nickname)) {
          return {
            type: 'nickname',
            value: nickname,
            reason: '昵称关键词匹配'
          };
        }
      }
    }

    // 5. 特殊标识匹配
    if (this.config.specialPatterns && this.config.specialPatterns.length > 0) {
      for (const pattern of this.config.specialPatterns) {
        if (receivedName && receivedName.includes(pattern)) {
          return {
            type: 'specialPattern',
            value: pattern,
            reason: '特殊标识匹配'
          };
        }
        if (userRemark && userRemark.includes(pattern)) {
          return {
            type: 'specialPattern',
            value: pattern,
            reason: '特殊标识匹配'
          };
        }
      }
    }

    return null;
  }

  /**
   * 批量识别工作人员
   * @param {Array} messages - 消息数组
   * @returns {Map} - 返回Map，key为userId，value为是否为工作人员
   */
  batchIdentify(messages) {
    const result = new Map();

    for (const message of messages) {
      const isStaff = this.isStaffUser(message);
      result.set(message.userId, isStaff);
    }

    return result;
  }

  /**
   * 验证配置有效性
   * @returns {Object} - 返回验证结果 { valid: boolean, errors: string[] }
   */
  validateConfig() {
    const errors = [];

    if (!this.config.enabled) {
      return { valid: true, errors: [] };
    }

    const hasRules =
      (this.config.userIds && this.config.userIds.length > 0) ||
      (this.config.userRemarks && this.config.userRemarks.length > 0) ||
      (this.config.nicknames && this.config.nicknames.length > 0) ||
      (this.config.enterpriseNames && this.config.enterpriseNames.length > 0) ||
      (this.config.specialPatterns && this.config.specialPatterns.length > 0);

    if (!hasRules) {
      errors.push('没有配置任何识别规则');
    }

    // 验证userId格式
    if (this.config.userIds && this.config.userIds.length > 0) {
      this.config.userIds.forEach(userId => {
        if (!userId || typeof userId !== 'string') {
          errors.push(`无效的用户ID: ${userId}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// 导出单例实例
const staffIdentifier = new StaffIdentifier();

// 导出类和实例
module.exports = {
  StaffIdentifier,
  staffIdentifier
};
