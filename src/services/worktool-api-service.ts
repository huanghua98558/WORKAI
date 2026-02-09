/**
 * WorkTool API 服务
 * 用于调用 WorkTool 机器人管理 API
 */

import { ResponseHelper } from '@/lib/api';

// 获取认证 Token
function getToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || '';
  }
  return '';
}

export interface SendMessageRequest {
  robotId: string;
  toName: string;
  content: string;
  messageType?: number; // 1=文本 2=图片 3=视频等
}

export interface SendMessageResponse {
  messageId: string;
  success: boolean;
}

export interface RobotInfo {
  robotId: string;
  name: string;
  status: string;
  config: any;
}

export interface OnlineStatus {
  isOnline: boolean;
}

export interface LoginLog {
  id: string;
  loginTime: string;
  ip: string;
  status: string;
}

export interface LoginLogsResponse {
  list: LoginLog[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CommandMessage {
  messageId: string;
  command: string;
  createTime: string;
}

export interface CommandMessagesResponse {
  list: CommandMessage[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CommandResult {
  messageId: string;
  command: string;
  status: string;
  result: any;
  createTime: string;
}

export interface CommandResultsResponse {
  list: CommandResult[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MessageLog {
  messageId: string;
  spoken: string;
  receivedName: string;
  groupName: string;
  createTime: string;
}

export interface MessageLogsResponse {
  list: MessageLog[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpdateRobotInfoRequest {
  robotId: string;
  robotInfo: any;
}

export class WorkToolApiService {
  private baseUrl = '/api/worktool/robot';

  /**
   * 1. 发送消息给企业微信用户
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await fetch(`${this.baseUrl}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify(request),
    });

    return ResponseHelper.handle(response);
  }

  /**
   * 2. 获取机器人信息
   */
  async getRobotInfo(robotId: string): Promise<RobotInfo> {
    const response = await fetch(`${this.baseUrl}/info?robotId=${encodeURIComponent(robotId)}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    return ResponseHelper.handle(response);
  }

  /**
   * 3. 查询机器人在线状态
   */
  async getOnlineStatus(robotId: string): Promise<OnlineStatus> {
    const response = await fetch(`${this.baseUrl}/online-status?robotId=${encodeURIComponent(robotId)}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    return ResponseHelper.handle(response);
  }

  /**
   * 4. 查询登录日志
   */
  async getLoginLogs(
    robotId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<LoginLogsResponse> {
    const params = new URLSearchParams({
      robotId,
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    const response = await fetch(`${this.baseUrl}/login-logs?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    return ResponseHelper.handle(response);
  }

  /**
   * 5. 查询指令消息
   */
  async getCommandMessages(
    robotId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<CommandMessagesResponse> {
    const params = new URLSearchParams({
      robotId,
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    const response = await fetch(`${this.baseUrl}/command-messages?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    return ResponseHelper.handle(response);
  }

  /**
   * 6. 查询指令执行结果
   */
  async getCommandResults(
    robotId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<CommandResultsResponse> {
    const params = new URLSearchParams({
      robotId,
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    const response = await fetch(`${this.baseUrl}/command-results?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    return ResponseHelper.handle(response);
  }

  /**
   * 7. 查询消息回调日志
   */
  async getMessageLogs(
    robotId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<MessageLogsResponse> {
    const params = new URLSearchParams({
      robotId,
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    const response = await fetch(`${this.baseUrl}/message-logs?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    return ResponseHelper.handle(response);
  }

  /**
   * 8. 更新机器人信息
   */
  async updateRobotInfo(request: UpdateRobotInfoRequest): Promise<void> {
    const response = await fetch(`${this.baseUrl}/update-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify(request),
    });

    return ResponseHelper.handle(response);
  }
}

// 导出单例
export const workToolApi = new WorkToolApiService();
