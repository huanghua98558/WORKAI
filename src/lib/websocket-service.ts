/**
 * WebSocket 服务（前端）
 * 用于管理 WebSocket 连接和消息收发
 */

import { io, Socket } from 'socket.io-client';

// WebSocket 配置
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5002';
const WS_PATH = process.env.NEXT_PUBLIC_WS_PATH || '/ws';

// WebSocket 事件类型
export enum WSEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECTED = 'connected',
  ROBOT_INFO = 'robotInfo',
  MESSAGE = 'message',
  COMMAND = 'command',
  EXECUTE_COMMAND = 'execute_command',
  ROBOT_ONLINE = 'robot_online',
  ROBOT_OFFLINE = 'robot_offline',
  ERROR = 'error',
  PONG = 'pong',
}

// 消息类型
export interface WSMessage {
  robotId: string;
  roomName: string;
  senderName: string;
  content: string;
  messageType?: number;
  roomType?: number;
}

// 命令类型
export interface WSCommand {
  type: string;
  data: any;
}

// 机器人状态
export interface RobotStatus {
  robotId: string;
  status: 'online' | 'offline';
  serverTime?: string;
}

// WebSocket 服务类
class WebSocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private robotId: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * 连接 WebSocket 服务器
   */
  connect(robotId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.connected) {
        if (this.robotId === robotId) {
          resolve(true);
          return;
        }
        // 断开旧连接
        this.disconnect();
      }

      this.robotId = robotId;

      // 创建连接
      this.socket = io(WS_URL, {
        path: WS_PATH,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // 连接成功
      this.socket.on(WSEvent.CONNECT, () => {
        console.log('[WS] 连接成功', this.socket?.id);

        // 注册机器人
        this.socket?.emit('register', { robotId });
      });

      // 收到连接确认
      this.socket.on(WSEvent.CONNECTED, (data) => {
        console.log('[WS] 收到连接确认', data);
        this.connected = true;
        this.emit(WSEvent.CONNECTED, data);
        resolve(true);
      });

      // 收到机器人信息
      this.socket.on(WSEvent.ROBOT_INFO, (data) => {
        console.log('[WS] 收到机器人信息', data);
        this.emit(WSEvent.ROBOT_INFO, data);
      });

      // 收到命令
      this.socket.on(WSEvent.COMMAND, (data: WSCommand) => {
        console.log('[WS] 收到命令', data);
        this.emit(WSEvent.COMMAND, data);
      });

      // 收到执行命令
      this.socket.on(WSEvent.EXECUTE_COMMAND, (data: WSCommand) => {
        console.log('[WS] 收到执行命令', data);
        this.emit(WSEvent.EXECUTE_COMMAND, data);
      });

      // 其他机器人上线
      this.socket.on(WSEvent.ROBOT_ONLINE, (data: RobotStatus) => {
        console.log('[WS] 机器人上线', data);
        this.emit(WSEvent.ROBOT_ONLINE, data);
      });

      // 其他机器人下线
      this.socket.on(WSEvent.ROBOT_OFFLINE, (data: RobotStatus) => {
        console.log('[WS] 机器人下线', data);
        this.emit(WSEvent.ROBOT_OFFLINE, data);
      });

      // 错误处理
      this.socket.on(WSEvent.ERROR, (error) => {
        console.error('[WS] 错误', error);
        this.emit(WSEvent.ERROR, error);
        reject(error);
      });

      // 断开连接
      this.socket.on(WSEvent.DISCONNECT, (reason) => {
        console.log('[WS] 断开连接', reason);
        this.connected = false;
        this.emit(WSEvent.DISCONNECT, reason);
      });

      // 心跳响应
      this.socket.on(WSEvent.PONG, (data) => {
        this.emit(WSEvent.PONG, data);
      });

      // 连接超时
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('连接超时'));
        }
      }, 10000);
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.robotId = null;
    }
  }

  /**
   * 发送消息
   */
  sendMessage(message: WSMessage): void {
    if (!this.socket || !this.connected) {
      throw new Error('WebSocket 未连接');
    }
    this.socket.emit(WSEvent.MESSAGE, message);
  }

  /**
   * 发送消息到指定群
   */
  sendToRoom(roomName: string, content: string): void {
    if (!this.socket || !this.connected) {
      throw new Error('WebSocket 未连接');
    }
    this.socket.emit('send_message', {
      robotId: this.robotId,
      roomName,
      content,
    });
  }

  /**
   * 发送心跳
   */
  ping(): void {
    if (this.socket && this.connected) {
      this.socket.emit('ping');
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 获取当前机器人 ID
   */
  getRobotId(): string | null {
    return this.robotId;
  }

  /**
   * 添加事件监听器
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WS] 事件处理器错误: ${event}`, error);
        }
      });
    }
  }
}

// 导出单例
export const wsService = new WebSocketService();

// 导出类型
export type { WebSocketService };
