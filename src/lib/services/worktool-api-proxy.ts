/**
 * WorkTool 机器人 API 代理服务
 * 用于调用 WorkTool 机器人的各种 API 接口
 */

const WORKTOOL_API_BASE = 'https://api.worktool.ymdyes.cn';

export interface SendMessageParams {
  robotId: string;
  toName: string;  // 接收人名称（企业微信昵称）
  content: string;  // 消息内容
  messageType?: number;  // 消息类型：1=文本 2=图片 3=视频等
}

export interface RobotInfo {
  robotId: string;
  nickname: string;
  status: string;
  [key: string]: any;
}

export interface OnlineStatus {
  isOnline: boolean;
  lastLoginTime?: string;
}

/**
 * WorkTool API 服务类
 */
export class WorkToolApiProxy {
  /**
   * 发送文本消息
   */
  static async sendMessage(params: SendMessageParams): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const url = `${WORKTOOL_API_BASE}/robot/message/send`;

      console.log('Sending message to WorkTool:', {
        robotId: params.robotId,
        toName: params.toName,
        content: params.content?.substring(0, 50),
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          robotId: params.robotId,
          toName: params.toName,
          spoken: params.content,  // WorkTool API 使用 "spoken" 字段
          msgType: params.messageType || 1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WorkTool API request failed:', response.status, errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();

      // 检查 WorkTool 返回的 code
      if (data.code !== undefined && data.code !== 0) {
        console.error('WorkTool API error:', data);
        return {
          success: false,
          error: data.message || 'WorkTool API error',
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error: any) {
      console.error('Send message error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * 获取机器人信息
   */
  static async getRobotInfo(robotId: string): Promise<{ success: boolean; data?: RobotInfo; error?: string }> {
    try {
      const url = `${WORKTOOL_API_BASE}/robot/robotInfo/get?robotId=${encodeURIComponent(robotId)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();

      if (data.code !== undefined && data.code !== 0) {
        return {
          success: false,
          error: data.message || 'WorkTool API error',
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error: any) {
      console.error('Get robot info error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * 查询机器人在线状态
   */
  static async getOnlineStatus(robotId: string): Promise<{ success: boolean; data?: OnlineStatus; error?: string }> {
    try {
      const url = `${WORKTOOL_API_BASE}/robot/onlineStatus/get?robotId=${encodeURIComponent(robotId)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();

      if (data.code !== undefined && data.code !== 0) {
        return {
          success: false,
          error: data.message || 'WorkTool API error',
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error: any) {
      console.error('Get online status error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * 获取消息日志
   */
  static async getMessageLogs(
    robotId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const url = new URL(`${WORKTOOL_API_BASE}/robot/msgLog/get`);
      url.searchParams.set('robotId', robotId);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', String(pageSize));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();

      if (data.code !== undefined && data.code !== 0) {
        return {
          success: false,
          error: data.message || 'WorkTool API error',
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error: any) {
      console.error('Get message logs error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * 执行机器人指令
   */
  static async executeCommand(
    robotId: string,
    command: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const url = `${WORKTOOL_API_BASE}/robot/command/send`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          robotId,
          command,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();

      if (data.code !== undefined && data.code !== 0) {
        return {
          success: false,
          error: data.message || 'WorkTool API error',
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error: any) {
      console.error('Execute command error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * 获取指令结果
   */
  static async getCommandResults(
    robotId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const url = new URL(`${WORKTOOL_API_BASE}/robot/commandResult/get`);
      url.searchParams.set('robotId', robotId);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', String(pageSize));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();

      if (data.code !== undefined && data.code !== 0) {
        return {
          success: false,
          error: data.message || 'WorkTool API error',
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error: any) {
      console.error('Get command results error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}

// 导出单例
export const workToolApi = WorkToolApiProxy;
