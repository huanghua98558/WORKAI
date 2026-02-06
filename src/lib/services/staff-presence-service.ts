/**
 * 工作人员存在检测服务
 * 用于机器人管理联动：检测工作人员存在并调整AI回复策略
 */

export interface StaffPresenceResult {
  sessionId: string;
  hasStaff: boolean;
  lastStaffActivity?: Date;
  staffUserIds: string[];
  detectionWindow: number; // 检测窗口（分钟）
}

export interface AdaptiveReplyDecision {
  shouldReply: boolean;
  replyMode: 'normal' | 'low_priority' | 'delay' | 'skip';
  reason: string;
  delaySeconds?: number;
  priority: number;
}

/**
 * 检查会话中是否有工作人员存在
 */
export async function checkStaffPresence(
  sessionId: string,
  windowMinutes: number = 5
): Promise<StaffPresenceResult> {
  try {
    const response = await fetch(
      `/api/staff/presence/${sessionId}?window=${windowMinutes}`
    );

    if (!response.ok) {
      console.error('检查工作人员存在失败:', response.statusText);
      return {
        sessionId,
        hasStaff: false,
        staffUserIds: [],
        detectionWindow: windowMinutes
      };
    }

    const data = await response.json();
    return data.data || {
      sessionId,
      hasStaff: false,
      staffUserIds: [],
      detectionWindow: windowMinutes
    };
  } catch (error) {
    console.error('检查工作人员存在异常:', error);
    return {
      sessionId,
      hasStaff: false,
      staffUserIds: [],
      detectionWindow: windowMinutes
    };
  }
}

/**
 * 根据工作人员存在情况决定AI回复策略
 */
export async function getAdaptiveReplyDecision(
  sessionId: string,
  config: {
    adaptiveReply?: boolean;
    staffPresenceDetection?: boolean;
    replyModeWhenStaffOnline?: 'normal' | 'low_priority' | 'delay' | 'skip';
    staffDetectionWindow?: number;
  }
): Promise<AdaptiveReplyDecision> {
  // 未启用自适应回复，正常回复
  if (!config.adaptiveReply || !config.staffPresenceDetection) {
    return {
      shouldReply: true,
      replyMode: 'normal',
      reason: '未启用自适应回复',
      priority: 10
    };
  }

  // 检测工作人员存在
  const presence = await checkStaffPresence(
    sessionId,
    config.staffDetectionWindow || 5
  );

  // 工作人员不在，正常回复
  if (!presence.hasStaff) {
    return {
      shouldReply: true,
      replyMode: 'normal',
      reason: '工作人员不在线，AI正常回复',
      priority: 10
    };
  }

  // 工作人员在线，根据配置决定回复模式
  const replyMode = config.replyModeWhenStaffOnline || 'low_priority';

  const decisions: Record<string, AdaptiveReplyDecision> = {
    normal: {
      shouldReply: true,
      replyMode: 'normal',
      reason: '工作人员在线，但配置为正常回复',
      priority: 5 // 降低优先级
    },
    low_priority: {
      shouldReply: true,
      replyMode: 'low_priority',
      reason: '工作人员在线，降低回复优先级',
      priority: 2 // 较低优先级
    },
    delay: {
      shouldReply: true,
      replyMode: 'delay',
      reason: '工作人员在线，延迟回复',
      priority: 3,
      delaySeconds: 5 // 延迟5秒
    },
    skip: {
      shouldReply: false,
      replyMode: 'skip',
      reason: '工作人员在线，跳过AI回复',
      priority: 0
    }
  };

  const decision = decisions[replyMode];

  // 记录机器人负载变化
  await recordRobotLoadChange({
    sessionId,
    hasStaff: presence.hasStaff,
    staffUserIds: presence.staffUserIds,
    replyMode: decision.replyMode,
    priority: decision.priority,
    reason: decision.reason
  });

  return decision;
}

/**
 * 记录机器人负载变化（用于统计）
 */
async function recordRobotLoadChange(loadData: {
  sessionId: string;
  hasStaff: boolean;
  staffUserIds: string[];
  replyMode: string;
  priority: number;
  reason: string;
}) {
  try {
    await fetch('/api/staff/robot-load', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loadData)
    });
  } catch (error) {
    console.error('记录机器人负载变化失败:', error);
  }
}

/**
 * 获取机器人负载统计
 */
export async function getRobotLoadStats(robotId?: string) {
  try {
    const params = new URLSearchParams();
    if (robotId) params.append('robotId', robotId);

    const response = await fetch(`/api/staff/robot-load-stats?${params}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('获取机器人负载统计失败:', error);
    return null;
  }
}
