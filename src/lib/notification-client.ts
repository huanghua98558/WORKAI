/**
 * 通知服务客户端
 * 用于调用后端通知 API
 */

interface NotificationMethod {
  id: string;
  alertRuleId: string;
  methodType: 'sound' | 'desktop' | 'wechat' | 'robot';
  isEnabled: boolean;
  recipientConfig: Record<string, any>;
  messageTemplate?: string | null;
  priority: number;
}

interface AlertData {
  level: string;
  description: string;
  userName?: string;
  userId?: string;
  groupName?: string;
  groupId?: string;
  time?: string;
  [key: string]: any;
}

export class NotificationClient {
  private baseUrl = '/api/notifications';

  /**
   * 获取告警规则的通知方式列表
   */
  async getMethods(alertRuleId: string): Promise<NotificationMethod[]> {
    try {
      const response = await fetch(`${this.baseUrl}/methods/${alertRuleId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.code === 0) {
        return data.data || [];
      }
      return [];
    } catch (error) {
      console.error('[NotificationClient] 获取通知方式失败:', error);
      return [];
    }
  }

  /**
   * 创建通知方式
   */
  async createMethod(methodData: Partial<NotificationMethod>): Promise<NotificationMethod | null> {
    try {
      const response = await fetch(`${this.baseUrl}/methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(methodData),
      });

      const data = await response.json();
      if (data.code === 0) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('[NotificationClient] 创建通知方式失败:', error);
      return null;
    }
  }

  /**
   * 更新通知方式
   */
  async updateMethod(
    id: string,
    updates: Partial<NotificationMethod>
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/methods/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      return data.code === 0;
    } catch (error) {
      console.error('[NotificationClient] 更新通知方式失败:', error);
      return false;
    }
  }

  /**
   * 删除通知方式
   */
  async deleteMethod(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/methods/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data.code === 0;
    } catch (error) {
      console.error('[NotificationClient] 删除通知方式失败:', error);
      return false;
    }
  }

  /**
   * 切换通知方式启用状态
   */
  async toggleMethod(id: string, enabled: boolean): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/methods/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();
      return data.code === 0;
    } catch (error) {
      console.error('[NotificationClient] 切换通知方式状态失败:', error);
      return false;
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(alertId: string, alertRuleId: string, alertData: AlertData): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId,
          alertRuleId,
          alertData,
        }),
      });

      const data = await response.json();
      return data.data || null;
    } catch (error) {
      console.error('[NotificationClient] 发送通知失败:', error);
      return null;
    }
  }

  /**
   * 测试通知
   */
  async testNotification(methodType: string, config: Record<string, any>): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          methodType,
          config,
        }),
      });

      const data = await response.json();
      return data.data || null;
    } catch (error) {
      console.error('[NotificationClient] 测试通知失败:', error);
      return null;
    }
  }
}

// 导出单例
export const notificationClient = new NotificationClient();
