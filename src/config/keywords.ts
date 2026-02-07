/**
 * 关键词配置
 * 按场景定义关键词，用于工作人员识别、售后任务创建等
 */

export type KeywordScenario = 'community' | 'conversion' | 'after_sales' | 'sales' | 'notification';

export interface KeywordConfig {
  scenario: KeywordScenario;
  name: string;
  keywords: string[];
  description: string;
}

/**
 * 关键词配置映射
 */
export const KEYWORD_CONFIGS: Record<KeywordScenario, KeywordConfig> = {
  community: {
    scenario: 'community',
    name: '社群运营',
    keywords: [
      '需要你',
      '配合',
      '扫脸',
      '帮忙',
      '协助',
      '对接',
      '处理',
      '跟进',
      '确认',
      '请',
      '@',
    ],
    description: '社群运营机器人识别关键词',
  },
  conversion: {
    scenario: 'conversion',
    name: '转化客服',
    keywords: [
      '购买',
      '订单',
      '支付',
      '价格',
      '优惠',
      '折扣',
      '活动',
      '套餐',
      '方案',
      '咨询',
    ],
    description: '转化客服机器人识别关键词',
  },
  after_sales: {
    scenario: 'after_sales',
    name: '售后客服',
    keywords: [
      '需要你',
      '配合',
      '扫脸',
      '售后',
      '退款',
      '投诉',
      '问题',
      '故障',
      '无法',
      '失败',
      '错误',
      '异常',
    ],
    description: '售后客服机器人识别关键词',
  },
  sales: {
    scenario: 'sales',
    name: '销售客服',
    keywords: [
      '销售',
      '销售方案',
      '价格咨询',
      '合作',
      '签约',
      '合同',
      '商务',
      '洽谈',
      '报价',
      '方案',
    ],
    description: '销售客服机器人识别关键词',
  },
  notification: {
    scenario: 'notification',
    name: '通知机器人',
    keywords: [
      '提醒',
      '通知',
      '警报',
      '告警',
      '注意',
      '紧急',
      '重要',
      '待处理',
      '超时',
      '即将',
    ],
    description: '通知机器人识别关键词',
  },
};

/**
 * 获取指定场景的关键词
 */
export function getKeywordsByScenario(scenario: KeywordScenario): string[] {
  const config = KEYWORD_CONFIGS[scenario];
  return config ? config.keywords : [];
}

/**
 * 检查文本是否包含指定场景的关键词
 */
export function hasKeywords(text: string, scenario: KeywordScenario): boolean {
  const keywords = getKeywordsByScenario(scenario);
  if (keywords.length === 0) {
    return false;
  }

  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * 匹配文本中的关键词
 */
export function matchKeywords(text: string, scenario: KeywordScenario): string[] {
  const keywords = getKeywordsByScenario(scenario);
  if (keywords.length === 0) {
    return [];
  }

  const lowerText = text.toLowerCase();
  return keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * 获取所有场景的关键词配置
 */
export function getAllKeywordConfigs(): KeywordConfig[] {
  return Object.values(KEYWORD_CONFIGS);
}

/**
 * 根据文本猜测场景
 * 返回匹配度最高的场景
 */
export function guessScenarioFromText(text: string): {
  scenario: KeywordScenario | null;
  confidence: number;
  matchedKeywords: string[];
} {
  let bestScenario: KeywordScenario | null = null;
  let maxConfidence = 0;
  let bestMatchedKeywords: string[] = [];

  for (const [scenario, config] of Object.entries(KEYWORD_CONFIGS)) {
    const matchedKeywords = matchKeywords(text, scenario as KeywordScenario);
    const confidence = matchedKeywords.length / config.keywords.length;

    if (confidence > maxConfidence) {
      maxConfidence = confidence;
      bestScenario = scenario as KeywordScenario;
      bestMatchedKeywords = matchedKeywords;
    }
  }

  return {
    scenario: bestScenario,
    confidence: maxConfidence,
    matchedKeywords: bestMatchedKeywords,
  };
}

/**
 * 验证场景是否有效
 */
export function isValidScenario(scenario: string): scenario is KeywordScenario {
  return scenario in KEYWORD_CONFIGS;
}
