/**
 * 工作人员识别工具函数
 * 基于特征识别群内工作人员（企业名称、备注名、昵称、特殊标识）
 */

export interface StaffConfig {
  enabled: boolean;
  userIds: string[];
  enterpriseNames: string[];
  userRemarks: string[];
  nicknames: string[];
  specialPatterns: string[];
}

export interface Message {
  userId: string;
  receivedName: string;
  userRemark: string;
  platform: string;
  content?: string;
  sessionId?: string;
  messageId?: string;
}

export interface StaffMatchResult {
  isStaff: boolean;
  matchedRule?: {
    type: string;
    value: string;
    reason: string;
  };
}

/**
 * 判断用户是否为工作人员
 */
export function isStaffUser(message: Message, config: StaffConfig): StaffMatchResult {
  if (!config.enabled) {
    return { isStaff: false };
  }

  const { userId, receivedName, userRemark, platform } = message;
  const userIds = config.userIds || [];
  const userRemarks = config.userRemarks || [];
  const nicknames = config.nicknames || [];
  const enterpriseNames = config.enterpriseNames || [];
  const specialPatterns = config.specialPatterns || [];

  // 1. 企业名匹配（企业微信）- 最高优先级
  if (platform === 'enterprise' && enterpriseNames.length > 0) {
    for (const enterpriseName of enterpriseNames) {
      if (receivedName && receivedName.includes(enterpriseName)) {
        return {
          isStaff: true,
          matchedRule: {
            type: 'enterpriseName',
            value: enterpriseName,
            reason: '企业名称匹配'
          }
        };
      }
    }
  }

  // 2. 备注名匹配 - 高优先级
  if (userRemark && userRemarks.length > 0) {
    for (const remark of userRemarks) {
      if (userRemark.includes(remark)) {
        return {
          isStaff: true,
          matchedRule: {
            type: 'userRemark',
            value: remark,
            reason: '备注名关键词匹配'
          }
        };
      }
    }
  }

  // 3. 昵称匹配 - 中等优先级
  if (receivedName && nicknames.length > 0) {
    for (const nickname of nicknames) {
      if (receivedName.includes(nickname)) {
        return {
          isStaff: true,
          matchedRule: {
            type: 'nickname',
            value: nickname,
            reason: '昵称关键词匹配'
          }
        };
      }
    }
  }

  // 4. 特殊标识匹配 - 兜底方案
  if (specialPatterns.length > 0) {
    for (const pattern of specialPatterns) {
      if ((receivedName && receivedName.includes(pattern)) ||
          (userRemark && userRemark.includes(pattern))) {
        return {
          isStaff: true,
          matchedRule: {
            type: 'specialPattern',
            value: pattern,
            reason: '特殊标识匹配'
          }
        };
      }
    }
  }

  // 5. 用户ID匹配 - 辅助方案（最低优先级）
  if (userIds.length > 0 && userIds.includes(userId)) {
    return {
      isStaff: true,
      matchedRule: {
        type: 'userId',
        value: userId,
        reason: '直接指定的用户ID'
      }
    };
  }

  return { isStaff: false };
}

/**
 * 分析消息的风险等级
 */
export function analyzeRiskLevel(content: string): string {
  if (!content) return 'low';

  const riskKeywords = {
    critical: ['投诉', '威胁', '起诉', '举报', '曝光'],
    high: ['差评', '愤怒', '不满意', '要求退款', '赔偿'],
    medium: ['问题', '疑问', '咨询', '故障', '异常'],
    low: ['谢谢', '满意', '好的', '了解']
  };

  for (const keyword of riskKeywords.critical) {
    if (content.includes(keyword)) return 'critical';
  }

  for (const keyword of riskKeywords.high) {
    if (content.includes(keyword)) return 'high';
  }

  for (const keyword of riskKeywords.medium) {
    if (content.includes(keyword)) return 'medium';
  }

  return 'low';
}

/**
 * 分析消息的情感倾向
 */
export function analyzeSentiment(content: string): string {
  if (!content) return 'neutral';

  const positiveKeywords = ['满意', '谢谢', '好的', '棒', '优秀', '专业', '帮助'];
  const negativeKeywords = ['不满', '差', '糟糕', '慢', '不行', '差评', '愤怒'];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const keyword of positiveKeywords) {
    if (content.includes(keyword)) positiveCount++;
  }

  for (const keyword of negativeKeywords) {
    if (content.includes(keyword)) negativeCount++;
  }

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * 分析消息的满意度
 */
export function analyzeSatisfaction(content: string): string {
  if (!content) return 'unknown';

  const satisfactionKeywords = {
    high: ['非常满意', '很满意', '满意', '优秀', '专业', '谢谢'],
    medium: ['还行', '可以', '接受', '了解'],
    low: ['不满意', '差评', '糟糕', '慢', '不行']
  };

  for (const keyword of satisfactionKeywords.high) {
    if (content.includes(keyword)) return 'high';
  }

  for (const keyword of satisfactionKeywords.medium) {
    if (content.includes(keyword)) return 'medium';
  }

  for (const keyword of satisfactionKeywords.low) {
    if (content.includes(keyword)) return 'low';
  }

  return 'unknown';
}

/**
 * 分析消息的紧急程度
 */
export function analyzeUrgency(content: string): string {
  if (!content) return 'low';

  const urgencyKeywords = {
    critical: ['紧急', '马上', '立刻', '急', '急需'],
    high: ['尽快', '尽快处理', '麻烦', '急需'],
    medium: ['方便', '有空', '麻烦'],
    low: ['有空', '不急', '明天']
  };

  for (const keyword of urgencyKeywords.critical) {
    if (content.includes(keyword)) return 'critical';
  }

  for (const keyword of urgencyKeywords.high) {
    if (content.includes(keyword)) return 'high';
  }

  for (const keyword of urgencyKeywords.medium) {
    if (content.includes(keyword)) return 'medium';
  }

  return 'low';
}

/**
 * 获取工作人员识别配置
 */
export async function getStaffConfig(): Promise<StaffConfig> {
  try {
    const response = await fetch('/api/settings/staff-config');
    if (response.ok) {
      const data = await response.json();
      return data.config || {
        enabled: true,
        userIds: [],
        enterpriseNames: [],
        userRemarks: [],
        nicknames: [],
        specialPatterns: []
      };
    }
  } catch (error) {
    console.error('获取工作人员配置失败:', error);
  }

  return {
    enabled: true,
    userIds: [],
    enterpriseNames: [],
    userRemarks: [],
    nicknames: [],
    specialPatterns: []
  };
}
