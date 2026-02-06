/**
 * 告警管理联动服务
 * 实现工作人员处理后自动关闭告警
 */

export interface AlertMonitorConfig {
  alertId: string;
  sessionId: string;
  monitoringDuration: number; // 监听时长（秒）
  enabled: boolean;
}

export interface AlertResult {
  alertId: string;
  status: 'resolved' | 'escalated' | 'timeout';
  handledBy?: string;
  handledAt?: Date;
  responseTime?: number; // 响应时间（秒）
  reason: string;
}

/**
 * 监听工作人员处理告警
 * 返回Promise，当工作人员回复或超时时解析
 */
export async function monitorAlertHandling(
  config: AlertMonitorConfig
): Promise<AlertResult> {
  const { alertId, sessionId, monitoringDuration, enabled } = config;

  if (!enabled) {
    return {
      alertId,
      status: 'timeout',
      reason: '告警监听未启用'
    };
  }

  const startTime = Date.now();
  const pollInterval = 2000; // 每2秒检查一次
  const maxPolls = monitoringDuration / pollInterval;

  for (let poll = 0; poll < maxPolls; poll++) {
    // 检查是否有工作人员回复
    const staffReply = await checkStaffReply(sessionId);

    if (staffReply.hasReply && staffReply.staffUserId) {
      const responseTime = (Date.now() - startTime) / 1000;

      // 工作人员已回复，关闭告警
      const result = await closeAlertAfterStaffHandling({
        alertId,
        staffUserId: staffReply.staffUserId,
        responseTime,
        reason: `工作人员在 ${responseTime.toFixed(1)} 秒内回复`
      });

      return result;
    }

    // 等待下一次检查
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // 超时未处理
  return {
    alertId,
    status: 'timeout',
    reason: `监听超时（${monitoringDuration}秒），工作人员未回复`
  };
}

/**
 * 检查会话中是否有工作人员回复
 */
async function checkStaffReply(sessionId: string): Promise<{
  hasReply: boolean;
  staffUserId?: string;
  messageId?: string;
}> {
  try {
    const response = await fetch(`/api/staff/recent-reply?sessionId=${sessionId}`);

    if (!response.ok) {
      return { hasReply: false };
    }

    const data = await response.json();
    return data.data || { hasReply: false };
  } catch (error) {
    console.error('检查工作人员回复失败:', error);
    return { hasReply: false };
  }
}

/**
 * 工作人员处理后关闭告警
 */
async function closeAlertAfterStaffHandling(params: {
  alertId: string;
  staffUserId: string;
  responseTime: number;
  reason: string;
}): Promise<AlertResult> {
  try {
    const response = await fetch('/api/alerts/close-after-staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error('关闭告警失败');
    }

    const data = await response.json();

    return {
      alertId: params.alertId,
      status: 'resolved',
      handledBy: params.staffUserId,
      handledAt: new Date(),
      responseTime: params.responseTime,
      reason: params.reason
    };
  } catch (error) {
    console.error('关闭告警失败:', error);
    return {
      alertId: params.alertId,
      status: 'timeout',
      reason: '关闭告警失败'
    };
  }
}

/**
 * 批量处理告警（工作人员联动）
 */
export async function batchHandleAlerts(sessionId: string, staffUserId: string) {
  try {
    const response = await fetch('/api/alerts/batch-handle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        staffUserId,
        action: 'resolve'
      })
    });

    if (!response.ok) {
      throw new Error('批量处理告警失败');
    }

    const data = await response.json();
    return data.data || { count: 0, alerts: [] };
  } catch (error) {
    console.error('批量处理告警失败:', error);
    return { count: 0, alerts: [] };
  }
}

/**
 * 获取告警响应时间统计
 */
export async function getAlertResponseStats(timeRange: string = '24h') {
  try {
    const response = await fetch(`/api/alerts/response-stats?timeRange=${timeRange}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('获取告警响应统计失败:', error);
    return null;
  }
}
