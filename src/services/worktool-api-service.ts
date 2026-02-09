/**
 * WorkTool API 服务
 * 用于调用 WorkTool 机器人管理 API
 */

import { ResponseHelper, ApiResponse } from '@/lib/api';

// 获取认证 Token
function getToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || '';
  }
  return '';
}

/**
 * 处理 fetch Response 对象
 * 将 Response 转换为 ApiResponse 格式
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  const data = await response.json();

  // 兼容后端返回的格式: { code, message, data }
  if (data.code !== undefined) {
    if (data.code !== 0) {
      throw new Error(data.message || '操作失败');
    }
    return data.data as T;
  }

  // 兼容其他格式
  return data as T;
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

    return handleResponse<SendMessageResponse>(response);
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

    return handleResponse<RobotInfo>(response);
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

    return handleResponse<OnlineStatus>(response);
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

    return handleResponse<LoginLogsResponse>(response);
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

    return handleResponse<CommandMessagesResponse>(response);
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

    return handleResponse<CommandResultsResponse>(response);
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

    return handleResponse<MessageLogsResponse>(response);
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

    return handleResponse<void>(response);
  }
}

// 导出单例
export const workToolApi = new WorkToolApiService();
