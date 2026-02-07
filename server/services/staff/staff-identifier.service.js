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
      userIds: [], // 工作人员ID白名单 {userId: string, staffType: string}
      userRemarks: [], // 备注名关键词 [{keyword: string, staffType: string}]
      nicknames: [], // 昵称关键词 [{keyword: string, staffType: string}]
      enterpriseNames: [], // 企业名称 [{name: string, staffType: string}]
      specialPatterns: [], // 特殊标识 [{pattern: string, staffType: string}]
      defaultStaffType: 'management', // 默认工作人员类型
      staffTypeMapping: {
        'management': ['管理员', '管理', 'admin', 'Manager'],
        'community': ['社群', '运营', '运营专员', '客服'],
        'after_sales': ['售后', '客服', '技术支持', 'Technical'],
        'conversion': ['销售', '转化', '顾问', 'Sales']
      },
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
   * 识别工作人员（增强版）
   * @param {Object} context - 上下文对象
   * @param {string} context.sessionId - 会话ID
   * @param {Object} message - 消息对象
   * @param {Object} robot - 机器人配置
   * @returns {Promise<Object>} 识别结果
   */
  async identifyStaff(context, message, robot) {
    if (!this.config.enabled) {
      return {
        isStaff: false,
        confidence: 0,
        matchMethod: null,
        staffUserId: null,
        staffType: null,
        nickname: message.nickname || message.receivedName || null
      };
    }

    // 合并配置：robot配置优先
    const effectiveConfig = {
      ...this.config,
      ...(robot?.staffConfig || {})
    };

    const {
      userId,
      nickname,
      receivedName,
      userRemark,
      platform
    } = message;

    const displayName = nickname || receivedName;

    // 1. userId白名单匹配（最准确，优先级最高）
    if (effectiveConfig.userIds && effectiveConfig.userIds.length > 0) {
      const matchedUser = effectiveConfig.userIds.find(u => 
        typeof u === 'string' ? u === userId : u.userId === userId
      );
      if (matchedUser) {
        const staffType = typeof matchedUser === 'string' 
          ? this.config.defaultStaffType 
          : (matchedUser.staffType || this.config.defaultStaffType);
        return {
          isStaff: true,
          confidence: 1.0,
          matchMethod: 'userId',
          staffUserId: userId,
          staffType,
          nickname: displayName
        };
      }
    }

    // 2. 企业微信特征检测
    if (platform === 'enterprise') {
      if (effectiveConfig.enterpriseNames && effectiveConfig.enterpriseNames.length > 0) {
        for (const enterprise of effectiveConfig.enterpriseNames) {
          const name = typeof enterprise === 'string' ? enterprise : enterprise.name;
          const staffType = typeof enterprise === 'string' 
            ? this.config.defaultStaffType 
            : (enterprise.staffType || this.config.defaultStaffType);
          
          if (displayName && displayName.includes(name)) {
            return {
              isStaff: true,
              confidence: 0.85,
              matchMethod: 'enterpriseName',
              staffUserId: userId,
              staffType,
              nickname: displayName
            };
          }
        }
      }
    }

    // 3. 备注名匹配
    if (userRemark && effectiveConfig.userRemarks && effectiveConfig.userRemarks.length > 0) {
      for (const remark of effectiveConfig.userRemarks) {
        const keyword = typeof remark === 'string' ? remark : remark.keyword;
        const staffType = typeof remark === 'string' 
          ? this.inferStaffType(keyword)
          : (remark.staffType || this.inferStaffType(keyword));
          
        if (userRemark.includes(keyword)) {
          return {
            isStaff: true,
            confidence: 0.75,
            matchMethod: 'remark',
            staffUserId: userId,
            staffType,
            nickname: displayName
          };
        }
      }
    }

    // 4. 昵称匹配
    if (displayName && effectiveConfig.nicknames && effectiveConfig.nicknames.length > 0) {
      for (const nicknameKey of effectiveConfig.nicknames) {
        const keyword = typeof nicknameKey === 'string' ? nicknameKey : nicknameKey.keyword;
        const staffType = typeof nicknameKey === 'string' 
          ? this.inferStaffType(keyword)
          : (nicknameKey.staffType || this.inferStaffType(keyword));
          
        if (displayName.includes(keyword)) {
          return {
            isStaff: true,
            confidence: 0.7,
            matchMethod: 'nickname',
            staffUserId: userId,
            staffType,
            nickname: displayName
          };
        }
      }
    }

    // 5. 特殊标识匹配
    if (effectiveConfig.specialPatterns && effectiveConfig.specialPatterns.length > 0) {
      for (const pattern of effectiveConfig.specialPatterns) {
        const patternText = typeof pattern === 'string' ? pattern : pattern.pattern;
        const staffType = typeof pattern === 'string' 
          ? this.inferStaffType(patternText)
          : (pattern.staffType || this.inferStaffType(patternText));
          
        if ((displayName && displayName.includes(patternText)) ||
            (userRemark && userRemark.includes(patternText))) {
          return {
            isStaff: true,
            confidence: 0.65,
            matchMethod: 'specialPattern',
            staffUserId: userId,
            staffType,
            nickname: displayName
          };
        }
      }
    }

    // 未识别为工作人员
    return {
      isStaff: false,
      confidence: 0,
      matchMethod: null,
      staffUserId: null,
      staffType: null,
      nickname: displayName
    };
  }

  /**
   * 根据关键词推断工作人员类型
   * @param {string} keyword - 关键词
   * @returns {string} 工作人员类型
   */
  inferStaffType(keyword) {
    if (!keyword) return this.config.defaultStaffType;
    
    const lowerKeyword = keyword.toLowerCase();
    
    for (const [staffType, keywords] of Object.entries(this.config.staffTypeMapping)) {
      if (keywords.some(k => lowerKeyword.includes(k.toLowerCase()))) {
        return staffType;
      }
    }
    
    return this.config.defaultStaffType;
  }

  /**
   * 判断用户是否为工作人员（简化版，兼容旧代码）
   * @param {Object} message - 消息对象
   * @returns {boolean} 是否为工作人员
   */
  isStaffUser(message) {
    const result = this.identifyStaff({}, message, {});
    return result.isStaff;
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
