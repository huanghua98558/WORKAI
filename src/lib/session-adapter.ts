/**
 * 会话数据适配器
 * 将执行记录数据转换为会话格式
 * 确保与消息监控使用相同的数据源和转换逻辑
 */

import { adaptExecutionToUnifiedMessage } from './message-adapter';

/**
 * 会话数据接口
 */
export interface Session {
  /** 会话ID */
  sessionId: string;
  /** 用户ID */
  userId?: string;
  /** 群组ID */
  groupId?: string;
  /** 用户名称 */
  userName?: string;
  /** 群组名称 */
  groupName?: string;
  /** 机器人ID */
  robotId?: string;
  /** 机器人名称 */
  robotName?: string;
  /** 机器人昵称 */
  robotNickname?: string;
  /** 企业名称 */
  company?: string;
  /** 用户信息 */
  userInfo?: {
    userName?: string;
    groupName?: string;
  };
  /** 最后一条消息 */
  lastMessage?: string;
  /** 最后一条消息是否来自用户 */
  isFromUser?: boolean;
  /** 最后一条消息是否来自机器人 */
  isFromBot?: boolean;
  /** 是否为人工会话 */
  isHuman?: boolean;
  /** 最后活跃时间 */
  lastActiveTime: string;
  /** 开始时间 */
  startTime?: string;
  /** 消息数量 */
  messageCount?: number;
  /** 用户消息数 */
  userMessages?: number;
  /** AI回复数 */
  aiReplyCount?: number;
  /** 人工回复数 */
  humanReplyCount?: number;
  /** 回复总数 */
  replyCount?: number;
  /** 最后意图 */
  lastIntent?: string;
  /** 会话状态 */
  status: 'auto' | 'human';
}

/**
 * 执行记录接口（与monitoring API返回格式一致）
 */
export interface ExecutionRecord {
  id: string;
  processingId: string;
  robotId: string;
  robotName?: string;
  messageId?: string;
  sessionId: string;
  userId?: string;
  groupId?: string;
  status: string;
  steps?: {
    user_message?: {
      userId?: string;
      content?: string;
      groupId?: string;
      messageId?: string;
      timestamp?: string;
    };
    ai_response?: {
      model?: string;
      response?: string;
      timestamp?: string;
    };
    intent_recognition?: {
      result?: string;
      confidence?: number;
    };
  };
  errorMessage?: string;
  errorStack?: string;
  startTime?: string;
  endTime?: string;
  processingTime?: number;
  decision?: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * 将单条执行记录转换为会话格式
 */
export function adaptExecutionToSession(execution: ExecutionRecord): Session {
  const userMessage = execution.steps?.user_message;

  return {
    sessionId: execution.sessionId,
    userId: userMessage?.userId || execution.userId,
    groupId: userMessage?.groupId || execution.groupId,
    userName: userMessage?.userId || execution.userId || '未知用户',
    groupName: userMessage?.groupId || execution.groupId || '未知群组',
    robotId: execution.robotId,
    robotName: execution.robotName || '未知机器人',
    robotNickname: execution.robotName || null,
    lastMessage: userMessage?.content || '暂无消息',
    isFromUser: true,
    isFromBot: false,
    isHuman: false,
    lastActiveTime: execution.createdAt,
    startTime: execution.createdAt,
    messageCount: 1,
    userMessages: 1,
    aiReplyCount: execution.steps?.ai_response ? 1 : 0,
    humanReplyCount: 0,
    replyCount: execution.steps?.ai_response ? 1 : 0,
    lastIntent: execution.steps?.intent_recognition?.result || null,
    status: execution.status === 'success' || execution.status === 'completed' ? 'auto' : 'human',
  };
}

/**
 * 将执行记录列表转换为会话列表
 * 按sessionId去重，保留最新的记录
 */
export function adaptExecutionsToSessions(executions: ExecutionRecord[]): Session[] {
  const sessionMap = new Map<string, ExecutionRecord>();

  // 按sessionId分组，保留最新的记录（按createdAt降序）
  executions.forEach(execution => {
    const sessionId = execution.sessionId;
    if (!sessionMap.has(sessionId) || execution.createdAt > sessionMap.get(sessionId)!.createdAt) {
      sessionMap.set(sessionId, execution);
    }
  });

  // 转换为会话列表
  const sessions = Array.from(sessionMap.values()).map(adaptExecutionToSession);

  // 按lastActiveTime降序排列
  sessions.sort((a, b) =>
    new Date(b.lastActiveTime).getTime() - new Date(a.lastActiveTime).getTime()
  );

  return sessions;
}

/**
 * 搜索会话
 * 根据用户名、群组名、消息内容过滤会话
 */
export function filterSessions(
  sessions: Session[],
  query: string,
  statusFilter?: 'all' | 'auto' | 'human'
): Session[] {
  const queryLower = query.toLowerCase();

  return sessions.filter(session => {
    // 状态过滤
    if (statusFilter && statusFilter !== 'all' && session.status !== statusFilter) {
      return false;
    }

    // 搜索过滤
    if (query && query.trim()) {
      const userName = (session.userName || '').toLowerCase();
      const groupName = (session.groupName || '').toLowerCase();
      const lastMessage = (session.lastMessage || '').toLowerCase();
      const robotName = (session.robotName || '').toLowerCase();

      return (
        userName.includes(queryLower) ||
        groupName.includes(queryLower) ||
        lastMessage.includes(queryLower) ||
        robotName.includes(queryLower)
      );
    }

    return true;
  });
}

/**
 * 获取会话统计信息
 */
export function getSessionStats(sessions: Session[]) {
  const total = sessions.length;
  const auto = sessions.filter(s => s.status === 'auto').length;
  const human = sessions.filter(s => s.status === 'human').length;
  const totalMessages = sessions.reduce((sum, s) => sum + (s.messageCount || 0), 0);
  const totalUserMessages = sessions.reduce((sum, s) => sum + (s.userMessages || 0), 0);

  return {
    total,
    auto,
    human,
    totalMessages,
    totalUserMessages,
    autoRate: total > 0 ? ((auto / total) * 100).toFixed(1) : '0.0',
  };
}
