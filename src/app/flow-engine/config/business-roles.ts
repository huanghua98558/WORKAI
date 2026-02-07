/**
 * 业务角色配置文件
 * 定义系统中所有业务角色的属性、AI行为模式、关键词列表和默认优先级
 */

export interface BusinessRole {
  /** 角色ID */
  id: string;
  /** 角色名称 */
  name: string;
  /** 角色描述 */
  description: string;
  /** AI行为模式 */
  aiBehavior: 'full_auto' | 'semi_auto' | 'record_only';
  /** 关键词列表 */
  keywords: string[];
  /** 默认优先级 */
  defaultPriority: 'high' | 'medium' | 'low';
  /** 是否支持任务创建 */
  enableTaskCreation: boolean;
  /** 负责人列表 */
  assignees: string[];
  /** 角色配置元数据 */
  metadata?: {
    color?: string;
    icon?: string;
    category?: string;
  };
}

/**
 * 业务角色配置列表
 */
export const businessRoles: BusinessRole[] = [
  {
    id: 'customer_service',
    name: '售后客服',
    description: '负责处理客户售后问题和技术支持',
    aiBehavior: 'semi_auto',
    keywords: ['售后', '客服', '支持', '问题', '投诉', '服务'],
    defaultPriority: 'medium',
    enableTaskCreation: true,
    assignees: ['support_team', 'support_lead'],
    metadata: {
      color: '#3B82F6',
      icon: '🎧',
      category: 'service',
    },
  },
  {
    id: 'marketing',
    name: '营销推广',
    description: '负责产品营销和推广活动',
    aiBehavior: 'full_auto',
    keywords: ['营销', '推广', '销售', '活动', '优惠', '促销'],
    defaultPriority: 'low',
    enableTaskCreation: true,
    assignees: ['marketing_team', 'marketing_lead'],
    metadata: {
      color: '#10B981',
      icon: '📢',
      category: 'business',
    },
  },
  {
    id: 'technical',
    name: '技术支持',
    description: '负责技术问题解决和系统维护',
    aiBehavior: 'semi_auto',
    keywords: ['技术', '开发', '研发', '系统', '功能', '接口'],
    defaultPriority: 'high',
    enableTaskCreation: true,
    assignees: ['dev_team', 'tech_lead'],
    metadata: {
      color: '#8B5CF6',
      icon: '🔧',
      category: 'technical',
    },
  },
  {
    id: 'operations',
    name: '运营管理',
    description: '负责日常运营和活动策划',
    aiBehavior: 'full_auto',
    keywords: ['运营', '活动', '策划', '推广', '数据分析'],
    defaultPriority: 'medium',
    enableTaskCreation: true,
    assignees: ['ops_team', 'ops_lead'],
    metadata: {
      color: '#F59E0B',
      icon: '📊',
      category: 'business',
    },
  },
  {
    id: 'finance',
    name: '财务核算',
    description: '负责财务核算和账单管理',
    aiBehavior: 'record_only',
    keywords: ['财务', '发票', '账单', '付款', '结算'],
    defaultPriority: 'high',
    enableTaskCreation: false,
    assignees: ['finance_team', 'finance_lead'],
    metadata: {
      color: '#EF4444',
      icon: '💰',
      category: 'business',
    },
  },
  {
    id: 'risk_management',
    name: '风险管理',
    description: '负责风险识别、评估和处理',
    aiBehavior: 'semi_auto',
    keywords: ['风险', '安全', '审计', '合规', '漏洞'],
    defaultPriority: 'high',
    enableTaskCreation: true,
    assignees: ['risk_team', 'risk_lead'],
    metadata: {
      color: '#DC2626',
      icon: '⚠️',
      category: 'risk',
    },
  },
  {
    id: 'vip_customer',
    name: 'VIP客户',
    description: '高价值客户，享受优先服务',
    aiBehavior: 'full_auto',
    keywords: ['VIP', '尊贵', '金牌', '白金', '高端'],
    defaultPriority: 'high',
    enableTaskCreation: true,
    assignees: ['vip_team', 'vip_manager'],
    metadata: {
      color: '#F59E0B',
      icon: '👑',
      category: 'customer',
    },
  },
  {
    id: 'new_customer',
    name: '新客户',
    description: '新注册客户，需要引导服务',
    aiBehavior: 'full_auto',
    keywords: ['新', '首次', '注册', '体验', '试用'],
    defaultPriority: 'medium',
    enableTaskCreation: true,
    assignees: ['onboarding_team', 'onboarding_lead'],
    metadata: {
      color: '#6366F1',
      icon: '✨',
      category: 'customer',
    },
  },
];

/**
 * AI行为模式配置
 */
export const aiBehaviorModes = {
  full_auto: {
    name: '全自动模式',
    description: 'AI自动处理所有请求，无需人工干预',
    enableAutoReply: true,
    requireApproval: false,
    autoConfidenceThreshold: 0.8,
    characteristics: ['快速响应', '自动化处理', '适合标准场景'],
  },
  semi_auto: {
    name: '半自动模式',
    description: 'AI初步处理，关键操作需人工审批',
    enableAutoReply: true,
    requireApproval: true,
    autoConfidenceThreshold: 0.6,
    characteristics: ['平衡效率与安全', '需人工监督', '适合复杂场景'],
  },
  record_only: {
    name: '仅记录模式',
    description: '仅记录信息，不执行任何操作',
    enableAutoReply: false,
    requireApproval: false,
    autoConfidenceThreshold: 0,
    characteristics: ['信息采集', '不执行操作', '适合审计场景'],
  },
};

/**
 * 优先级配置
 */
export const priorityConfig = {
  high: {
    name: '高优先级',
    value: 3,
    color: '#EF4444',
    description: '紧急处理，立即响应',
    maxResponseTime: 300, // 5分钟
    autoEscalate: true,
    escalateAfter: 600, // 10分钟
  },
  medium: {
    name: '中优先级',
    value: 2,
    color: '#F59E0B',
    description: '正常处理，尽快响应',
    maxResponseTime: 1800, // 30分钟
    autoEscalate: false,
  },
  low: {
    name: '低优先级',
    value: 1,
    color: '#10B981',
    description: '非紧急，可稍后处理',
    maxResponseTime: 86400, // 24小时
    autoEscalate: false,
  },
};

/**
 * 任务创建配置
 */
export const taskCreationConfig = {
  enabled: true,
  defaultTemplates: {
    support: 'customer_support_task',
    risk: 'risk_handling_task',
    inquiry: 'product_inquiry_task',
  },
  autoAssign: true,
  defaultDeadline: 3600, // 1小时
  escalationEnabled: true,
  escalationRules: {
    high_priority: {
      escalateAfter: 1800, // 30分钟
      escalateTo: 'manager',
    },
    medium_priority: {
      escalateAfter: 3600, // 1小时
      escalateTo: 'lead',
    },
  },
};

/**
 * 根据关键词匹配业务角色
 */
export function matchRoleByKeywords(keywords: string[]): BusinessRole | null {
  for (const role of businessRoles) {
    for (const keyword of keywords) {
      if (role.keywords.some(roleKeyword => keyword.includes(roleKeyword))) {
        return role;
      }
    }
  }
  return null;
}

/**
 * 根据ID获取业务角色
 */
export function getRoleById(id: string): BusinessRole | null {
  return businessRoles.find(role => role.id === id) || null;
}

/**
 * 根据名称获取业务角色
 */
export function getRoleByName(name: string): BusinessRole | null {
  return businessRoles.find(role => role.name === name) || null;
}

/**
 * 获取指定AI行为模式的角色
 */
export function getRolesByAIBehavior(behavior: BusinessRole['aiBehavior']): BusinessRole[] {
  return businessRoles.filter(role => role.aiBehavior === behavior);
}

/**
 * 获取支持任务创建的角色
 */
export function getRolesWithTaskCreation(): BusinessRole[] {
  return businessRoles.filter(role => role.enableTaskCreation);
}
