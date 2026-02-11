/**
 * 协同分析服务
 * 提供工作人员活跃度分析、用户满意度分析等功能
 */

import { db } from '@/lib/db';
import { messages, sessions } from '@/storage/database/shared/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';

// ==================== 工作人员活跃度分析 ====================

export interface StaffActivityData {
  staffId: string;
  staffName: string;
  staffType: string;

  // 基础统计
  totalMessages: number;
  activeDays: number;
  avgDailyMessages: number;

  // 时段分析
  workHoursDistribution: {
    '09-12': number;
    '12-14': number;
    '14-18': number;
    '18-21': number;
    '21-23': number;
  };

  // 响应时间
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  responseTimePercentiles: {
    p50: number;
    p90: number;
    p99: number;
  };

  // 处理效率
  avgResolutionTime: number;
  resolutionRate: number;

  // 协作统计
  collaborationWithAi: number;
  handoverToAi: number;
  handoverFromAi: number;

  // 用户反馈
  userSatisfactionAvg: number;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;

  // 时段统计（按天）
  dailyStats: Array<{
    date: string;
    messageCount: number;
    avgResponseTime: number;
    satisfactionAvg: number;
  }>;
}

export class StaffActivityService {
  /**
   * 分析工作人员活跃度
   */
  static async analyzeStaffActivity(
    staffId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<StaffActivityData> {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 默认7天
    const end = endDate || new Date();

    // 1. 获取工作人员消息
    const staffMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.senderId, staffId),
          eq(messages.senderType, 'staff'),
          gte(messages.createdAt, start.toISOString()),
          lte(messages.createdAt, end.toISOString())
        )
      )
      .orderBy(desc(messages.createdAt));

    const totalMessages = staffMessages.length;

    // 2. 统计活跃天数
    const activeDays = new Set(
      staffMessages.map(m => new Date(m.createdAt as string).toDateString())
    ).size;

    // 3. 时段分布
    const workHoursDistribution = this.calculateWorkHoursDistribution(staffMessages);

    // 4. 响应时间统计
    const responseTimeStats = await this.calculateResponseTimeStats(staffId, start, end);

    // 5. 处理效率
    const efficiencyStats = await this.calculateEfficiencyStats(staffId, start, end);

    // 6. 协作统计
    const collaborationStats = await this.calculateCollaborationStats(staffId, start, end);

    // 7. 用户反馈
    const userFeedbackStats = await this.calculateUserFeedbackStats(staffId, start, end);

    // 8. 每日统计
    const dailyStats = await this.calculateDailyStats(staffId, start, end);

    return {
      staffId,
      staffName: staffMessages[0]?.senderName || 'Unknown',
      staffType: 'unknown', // TODO: 从工作人员表获取
      totalMessages,
      activeDays,
      avgDailyMessages: Math.round(totalMessages / activeDays),
      workHoursDistribution,
      avgResponseTime: responseTimeStats.avg,
      maxResponseTime: responseTimeStats.max,
      minResponseTime: responseTimeStats.min,
      responseTimePercentiles: responseTimeStats.percentiles,
      avgResolutionTime: efficiencyStats.avgResolutionTime,
      resolutionRate: efficiencyStats.resolutionRate,
      collaborationWithAi: collaborationStats.withAi,
      handoverToAi: collaborationStats.toAi,
      handoverFromAi: collaborationStats.fromAi,
      userSatisfactionAvg: userFeedbackStats.avg,
      positiveFeedbackCount: userFeedbackStats.positive,
      negativeFeedbackCount: userFeedbackStats.negative,
      dailyStats,
    };
  }

  private static calculateWorkHoursDistribution(messageList: any[]): StaffActivityData['workHoursDistribution'] {
    const distribution = {
      '09-12': 0,
      '12-14': 0,
      '14-18': 0,
      '18-21': 0,
      '21-23': 0,
    };

    messageList.forEach(msg => {
      const hour = new Date(msg.createdAt).getHours();
      if (hour >= 9 && hour < 12) distribution['09-12']++;
      else if (hour >= 12 && hour < 14) distribution['12-14']++;
      else if (hour >= 14 && hour < 18) distribution['14-18']++;
      else if (hour >= 18 && hour < 21) distribution['18-21']++;
      else if (hour >= 21 && hour < 23) distribution['21-23']++;
    });

    return distribution;
  }

  private static async calculateResponseTimeStats(
    staffId: string,
    start: Date,
    end: Date
  ): Promise<{
    avg: number;
    max: number;
    min: number;
    percentiles: { p50: number; p90: number; p99: number };
  }> {
    // TODO: 实现实际的响应时间计算
    // 需要计算从用户消息到工作人员回复的时间差
    return {
      avg: 120,
      max: 600,
      min: 30,
      percentiles: { p50: 100, p90: 300, p99: 450 },
    };
  }

  private static async calculateEfficiencyStats(
    staffId: string,
    start: Date,
    end: Date
  ): Promise<{ avgResolutionTime: number; resolutionRate: number }> {
    // TODO: 实现实际的效率统计
    return {
      avgResolutionTime: 300,
      resolutionRate: 0.85,
    };
  }

  private static async calculateCollaborationStats(
    staffId: string,
    start: Date,
    end: Date
  ): Promise<{ withAi: number; toAi: number; fromAi: number }> {
    // TODO: 实现实际的协作统计
    return {
      withAi: 10,
      toAi: 3,
      fromAi: 5,
    };
  }

  private static async calculateUserFeedbackStats(
    staffId: string,
    start: Date,
    end: Date
  ): Promise<{ avg: number; positive: number; negative: number }> {
    // TODO: 实现实际的用户反馈统计
    return {
      avg: 4.2,
      positive: 15,
      negative: 2,
    };
  }

  private static async calculateDailyStats(
    staffId: string,
    start: Date,
    end: Date
  ): Promise<StaffActivityData['dailyStats']> {
    // TODO: 实现实际的每日统计
    const stats: StaffActivityData['dailyStats'] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toDateString();
      // TODO: 查询当天的统计数据
      stats.push({
        date: dateStr,
        messageCount: 0,
        avgResponseTime: 0,
        satisfactionAvg: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return stats;
  }
}

// ==================== 用户满意度分析 ====================

export interface UserSatisfactionData {
  userId: string;
  userName: string;

  // 满意度评分
  overallScore: number;

  // 情绪分析
  emotionDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };

  // 趋势分析
  emotionTrend: 'improving' | 'declining' | 'stable';
  scoreTrend: Array<{
    date: string;
    score: number;
  }>;

  // 问题类型
  problemCategories: {
    technical: number;
    operational: number;
    service: number;
    other: number;
  };

  // 解决情况
  resolutionRate: number;
  avgResolutionTime: number;

  // 重复问题
  repeatedQuestions: Array<{
    question: string;
    count: number;
    lastAskedAt: string;
  }>;

  // 活跃度
  messageCount: number;
  activeDays: number;
  avgDailyMessages: number;

  // 重要标记
  isHighValue: boolean;
  needsAttention: boolean;
  lastSatisfactionUpdate: string;
}

export class UserSatisfactionService {
  /**
   * 分析用户满意度
   */
  static async analyzeUserSatisfaction(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserSatisfactionData> {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // 1. 获取用户消息
    const userMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.senderId, userId),
          eq(messages.senderType, 'user'),
          gte(messages.createdAt, start.toISOString()),
          lte(messages.createdAt, end.toISOString())
        )
      )
      .orderBy(desc(messages.createdAt));

    const messageCount = userMessages.length;

    // 2. 情绪分布
    const emotionDistribution = this.calculateEmotionDistribution(userMessages);

    // 3. 趋势分析
    const emotionTrend = this.analyzeEmotionTrend(userMessages);
    const scoreTrend = await this.calculateScoreTrend(userId, start, end);

    // 4. 问题类型
    const problemCategories = this.categorizeProblems(userMessages);

    // 5. 解决情况
    const resolutionStats = await this.calculateResolutionStats(userId, start, end);

    // 6. 重复问题
    const repeatedQuestions = this.findRepeatedQuestions(userMessages);

    // 7. 活跃度
    const activeDays = new Set(
      userMessages.map(m => new Date(m.createdAt as string).toDateString())
    ).size;

    // 8. 重要标记
    const isHighValue = await this.isHighValueUser(userId);
    const needsAttention = this.checkNeedsAttention(userMessages);

    // 9. 综合评分
    const overallScore = this.calculateOverallScore(
      emotionDistribution,
      resolutionStats.resolutionRate,
      needsAttention
    );

    return {
      userId,
      userName: userMessages[0]?.senderName || 'Unknown',
      overallScore,
      emotionDistribution,
      emotionTrend,
      scoreTrend,
      problemCategories,
      resolutionRate: resolutionStats.resolutionRate,
      avgResolutionTime: resolutionStats.avgResolutionTime,
      repeatedQuestions,
      messageCount,
      activeDays,
      avgDailyMessages: Math.round(messageCount / activeDays),
      isHighValue,
      needsAttention,
      lastSatisfactionUpdate: new Date().toISOString(),
    };
  }

  private static calculateEmotionDistribution(messageList: any[]): UserSatisfactionData['emotionDistribution'] {
    const distribution = { positive: 0, neutral: 0, negative: 0 };

    messageList.forEach(msg => {
      const emotion = msg.emotion || 'neutral';
      if (emotion in distribution) {
        distribution[emotion as keyof typeof distribution]++;
      } else {
        distribution.neutral++;
      }
    });

    return distribution;
  }

  private static analyzeEmotionTrend(messageList: any[]): 'improving' | 'declining' | 'stable' {
    // TODO: 实现实际的趋势分析
    // 比较前半部分和后半部分的负面情绪比例
    return 'stable';
  }

  private static async calculateScoreTrend(
    userId: string,
    start: Date,
    end: Date
  ): Promise<UserSatisfactionData['scoreTrend']> {
    // TODO: 实现实际的分数趋势计算
    const trend: UserSatisfactionData['scoreTrend'] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      trend.push({
        date: currentDate.toDateString(),
        score: 3.5, // TODO: 计算当天的满意度分数
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trend;
  }

  private static categorizeProblems(messageList: any[]): UserSatisfactionData['problemCategories'] {
    const categories = {
      technical: 0,
      operational: 0,
      service: 0,
      other: 0,
    };

    messageList.forEach(msg => {
      const content = msg.content || '';
      if (content.includes('认证') || content.includes('绑定') || content.includes('系统')) {
        categories.technical++;
      } else if (content.includes('运营') || content.includes('上架') || content.includes('商品')) {
        categories.operational++;
      } else if (content.includes('回复') || content.includes('人工') || content.includes('服务')) {
        categories.service++;
      } else {
        categories.other++;
      }
    });

    return categories;
  }

  private static async calculateResolutionStats(
    userId: string,
    start: Date,
    end: Date
  ): Promise<{ resolutionRate: number; avgResolutionTime: number }> {
    // TODO: 实现实际的解决情况统计
    return {
      resolutionRate: 0.85,
      avgResolutionTime: 300,
    };
  }

  private static findRepeatedQuestions(messageList: any[]): UserSatisfactionData['repeatedQuestions'] {
    const questionCount = new Map<string, { count: number; lastAskedAt: string }>();

    messageList.forEach(msg => {
      const content = msg.content || '';
      if (content.includes('?') || content.includes('？') || content.includes('怎么')) {
        const key = content.substring(0, 20);
        if (questionCount.has(key)) {
          const existing = questionCount.get(key)!;
          existing.count++;
          existing.lastAskedAt = msg.createdAt as string;
        } else {
          questionCount.set(key, {
            count: 1,
            lastAskedAt: msg.createdAt as string,
          });
        }
      }
    });

    const repeated: UserSatisfactionData['repeatedQuestions'] = [];
    questionCount.forEach((value, key) => {
      if (value.count > 1) {
        repeated.push({
          question: key,
          count: value.count,
          lastAskedAt: value.lastAskedAt,
        });
      }
    });

    return repeated.sort((a, b) => b.count - a.count).slice(0, 10);
  }

  private static async isHighValueUser(userId: string): Promise<boolean> {
    // TODO: 实现实际的高价值用户判断
    return false;
  }

  private static checkNeedsAttention(messageList: any[]): boolean {
    // 检查是否需要关注
    const recentMessages = messageList.slice(0, 10);
    const negativeCount = recentMessages.filter(m => m.emotion === 'negative').length;

    // 最近10条消息中有3条以上负面情绪
    return negativeCount >= 3;
  }

  private static calculateOverallScore(
    emotionDistribution: UserSatisfactionData['emotionDistribution'],
    resolutionRate: number,
    needsAttention: boolean
  ): number {
    const total = emotionDistribution.positive + emotionDistribution.neutral + emotionDistribution.negative;

    if (total === 0) return 3;

    const positiveRatio = emotionDistribution.positive / total;
    const negativeRatio = emotionDistribution.negative / total;

    // 基础分数
    let score = 3;

    // 正面情绪加分
    score += positiveRatio * 1.5;

    // 负面情绪减分
    score -= negativeRatio * 1.5;

    // 解决率加分
    score += resolutionRate * 0.5;

    // 需要关注减分
    if (needsAttention) {
      score -= 0.5;
    }

    // 限制在 1-5 分范围内
    return Math.max(1, Math.min(5, score));
  }
}

// ==================== 协同效率分析 ====================

export interface CollaborationEfficiencyData {
  totalSessions: number;
  aiHandledSessions: number;
  humanHandledSessions: number;
  collaborativeSessions: number;

  aiToHumanRate: number;
  humanToAiRate: number;
  avgHandoverTime: number;

  maxConcurrentSessions: number;
  avgConcurrentSessions: number;

  aiCostPerSession: number;
  humanCostPerSession: number;
  totalCostSavings: number;

  aiSatisfactionAvg: number;
  humanSatisfactionAvg: number;
  aiResolutionRate: number;
  humanResolutionRate: number;

  aiAvgResponseTime: number;
  humanAvgResponseTime: number;

  hourlyEfficiency: Array<{
    hour: number;
    aiSessions: number;
    humanSessions: number;
    avgResponseTime: number;
  }>;
}

export class CollaborationEfficiencyService {
  /**
   * 分析协同效率
   */
  static async analyzeCollaborationEfficiency(
    startDate?: Date,
    endDate?: Date
  ): Promise<CollaborationEfficiencyData> {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // TODO: 实现实际的协同效率分析
    return {
      totalSessions: 100,
      aiHandledSessions: 60,
      humanHandledSessions: 20,
      collaborativeSessions: 20,
      aiToHumanRate: 0.15,
      humanToAiRate: 0.3,
      avgHandoverTime: 120,
      maxConcurrentSessions: 10,
      avgConcurrentSessions: 5,
      aiCostPerSession: 0.01,
      humanCostPerSession: 0.5,
      totalCostSavings: 29.4,
      aiSatisfactionAvg: 4.0,
      humanSatisfactionAvg: 4.5,
      aiResolutionRate: 0.8,
      humanResolutionRate: 0.95,
      aiAvgResponseTime: 60,
      humanAvgResponseTime: 180,
      hourlyEfficiency: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        aiSessions: Math.floor(Math.random() * 10),
        humanSessions: Math.floor(Math.random() * 5),
        avgResponseTime: Math.floor(Math.random() * 300),
      })),
    };
  }
}

// ==================== 问题解决率分析 ====================

export interface ProblemResolutionData {
  totalProblems: number;
  resolvedProblems: number;
  unresolvedProblems: number;
  overallResolutionRate: number;

  byCategory: {
    [category: string]: {
      total: number;
      resolved: number;
      resolutionRate: number;
      avgResolutionTime: number;
    };
  };

  byResolver: {
    ai: { total: number; resolved: number; resolutionRate: number };
    human: { total: number; resolved: number; resolutionRate: number };
    collaborative: { total: number; resolved: number; resolutionRate: number };
  };

  timeToResolution: {
    '< 1min': number;
    '1-5min': number;
    '5-15min': number;
    '15-30min': number;
    '> 30min': number;
  };

  dailyResolutionRate: Array<{
    date: string;
    total: number;
    resolved: number;
    resolutionRate: number;
  }>;
}

export class ProblemResolutionService {
  /**
   * 分析问题解决率
   */
  static async analyzeProblemResolution(
    startDate?: Date,
    endDate?: Date
  ): Promise<ProblemResolutionData> {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // TODO: 实现实际的问题解决率分析
    return {
      totalProblems: 200,
      resolvedProblems: 170,
      unresolvedProblems: 30,
      overallResolutionRate: 0.85,
      byCategory: {
        authentication: { total: 50, resolved: 45, resolutionRate: 0.9, avgResolutionTime: 300 },
        bind_phone: { total: 30, resolved: 28, resolutionRate: 0.93, avgResolutionTime: 180 },
        product: { total: 20, resolved: 15, resolutionRate: 0.75, avgResolutionTime: 600 },
        appeal: { total: 10, resolved: 8, resolutionRate: 0.8, avgResolutionTime: 900 },
        other: { total: 90, resolved: 74, resolutionRate: 0.82, avgResolutionTime: 450 },
      },
      byResolver: {
        ai: { total: 120, resolved: 96, resolutionRate: 0.8 },
        human: { total: 50, resolved: 48, resolutionRate: 0.96 },
        collaborative: { total: 30, resolved: 26, resolutionRate: 0.87 },
      },
      timeToResolution: {
        '< 1min': 20,
        '1-5min': 50,
        '5-15min': 60,
        '15-30min': 30,
        '> 30min': 10,
      },
      dailyResolutionRate: Array.from({ length: 7 }, (_, i) => {
        const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
        const total = 20 + Math.floor(Math.random() * 30);
        const resolved = Math.floor(total * (0.8 + Math.random() * 0.15));
        return {
          date: date.toDateString(),
          total,
          resolved,
          resolutionRate: resolved / total,
        };
      }),
    };
  }
}
