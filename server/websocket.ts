/**
 * WebSocket 服务器模块
 * 基于 Socket.IO 实现，支持 worktool 连接和消息收发
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

// WebSocket 服务器实例
let io: SocketIOServer | null = null;

// 连接的客户端映射（robotId -> socket）
const connectedClients = new Map<string, Socket>();

// WebSocket 配置
export interface WebSocketConfig {
  path?: string;
  cors?: {
    origin: string | string[];
    methods?: string[];
    credentials?: boolean;
  };
}

/**
 * 初始化 WebSocket 服务器
 */
export function initWebSocketServer(
  httpServer: HttpServer,
  config: WebSocketConfig = {}
): SocketIOServer {
  if (io) {
    console.log('[WS] WebSocket 服务器已存在，复用现有实例');
    return io;
  }

  const defaultConfig: WebSocketConfig = {
    path: '/ws',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: false,
    },
  };

  const finalConfig = { ...defaultConfig, ...config };

  console.log('[WS] 初始化 WebSocket 服务器...', {
    path: finalConfig.path,
    cors: finalConfig.cors,
  });

  io = new SocketIOServer(httpServer, {
    path: finalConfig.path,
    cors: finalConfig.cors,
    transports: ['websocket', 'polling'],
  });

  // 设置连接事件
  io.on('connection', (socket: Socket) => {
    console.log('[WS] 新的 WebSocket 连接', {
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // 当前连接的 robotId
    let currentRobotId: string | null = null;

    // worktool 注册
    socket.on('register', (data: { robotId: string }) => {
      const { robotId } = data;
      currentRobotId = robotId;

      console.log('[WS] worktool 注册', {
        socketId: socket.id,
        robotId,
      });

      // 保存连接映射
      connectedClients.set(robotId, socket);

      // 加入 robotId 房间
      socket.join(`robot:${robotId}`);

      // 发送连接成功消息
      socket.emit('connected', {
        success: true,
        robotId,
        message: 'WebSocket 连接成功',
        serverTime: new Date().toISOString(),
      });

      // 发送机器人信息
      socket.emit('robotInfo', {
        success: true,
        data: {
          robotId,
          status: 'online',
          serverTime: new Date().toISOString(),
        },
      });

      // 广播上线状态
      io?.emit('robot_online', { robotId });
    });

    // 接收 worktool 消息
    socket.on('message', async (data: WebSocketMessage) => {
      console.log('[WS] 收到 worktool 消息', {
        robotId: data.robotId,
        roomName: data.roomName,
        senderName: data.senderName,
        content: data.content?.substring(0, 50) + '...',
        timestamp: new Date().toISOString(),
      });

      try {
        // 处理消息
        const response = await processMessage(data);

        // 发送回复指令给 worktool
        socket.emit('command', {
          type: 'REPLY_MESSAGE',
          data: response,
        });

        console.log('[WS] 已发送回复给 worktool', {
          action: 'REPLY_MESSAGE',
          replyContent: response.receivedContent?.substring(0, 50) + '...',
        });
      } catch (error) {
        console.error('[WS] 处理消息失败', {
          error: error instanceof Error ? error.message : '未知错误',
          stack: error instanceof Error ? error.stack : '',
        });

        // 发送错误消息
        socket.emit('command', {
          type: 'ERROR',
          error: error instanceof Error ? error.message : '处理失败',
        });
      }
    });

    // 发送消息（从服务端下发到 worktool）
    socket.on('send_message', (data: SendMessageRequest) => {
      console.log('[WS] 服务端发送消息给 worktool', {
        robotId: data.robotId,
        roomName: data.roomName,
        content: data.content,
      });

      // 转发为 worktool 指令格式
      socket.emit('execute_command', {
        type: 'SEND_MESSAGE',
        data: {
          titleList: [data.roomName],
          receivedContent: data.content,
        },
      });
    });

    // 心跳
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // 断开连接
    socket.on('disconnect', (reason) => {
      console.log('[WS] worktool 断开连接', {
        socketId: socket.id,
        robotId: currentRobotId,
        reason,
        timestamp: new Date().toISOString(),
      });

      // 移除连接映射
      if (currentRobotId) {
        connectedClients.delete(currentRobotId);
        // 广播下线状态
        io?.emit('robot_offline', { robotId: currentRobotId });
      }
    });

    // 错误处理
    socket.on('error', (error) => {
      console.error('[WS] Socket 错误', {
        socketId: socket.id,
        error: error,
      });
    });
  });

  console.log('[WS] WebSocket 服务器初始化完成');
  return io;
}

/**
 * 获取 WebSocket 服务器实例
 */
export function getWebSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * 获取已连接的客户端列表
 */
export function getConnectedClients(): Map<string, Socket> {
  return connectedClients;
}

/**
 * 向指定 robot 发送消息
 */
export function sendToRobot(robotId: string, event: string, data: any): boolean {
  const socket = connectedClients.get(robotId);
  if (socket) {
    socket.emit(event, data);
    return true;
  }
  return false;
}

/**
 * 向所有连接的客户端广播消息
 */
export function broadcast(event: string, data: any): void {
  if (io) {
    io.emit(event, data);
  }
}

/**
 * 获取 WebSocket 服务器状态
 */
export function getWebSocketStatus() {
  return {
    isRunning: io !== null,
    connectedClients: Array.from(connectedClients.keys()),
    clientCount: connectedClients.size,
    timestamp: new Date().toISOString(),
  };
}

// 消息类型定义
interface WebSocketMessage {
  robotId: string;
  roomName: string;
  senderName: string;
  content: string;
  messageType?: number;
  roomType?: number;
  [key: string]: any;
}

interface SendMessageRequest {
  robotId: string;
  roomName: string;
  content: string;
}

/**
 * 处理消息（调用现有的 /api/message 接口）
 */
async function processMessage(message: WebSocketMessage): Promise<any> {
  const { robotId, roomName, senderName, content, messageType, roomType } = message;

  try {
    // 获取 API 基础 URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // HTTP 调用本地的消息处理接口
    const response = await fetch(`${apiUrl}/api/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-robot-id': robotId,
      },
      body: JSON.stringify({
        spoken: content,
        rawSpoken: content,
        receivedName: senderName,
        groupName: roomName,
        roomType: roomType,
        textType: messageType || 1,
        robotId: robotId,
      }),
    });

    const data = await response.json();

    console.log('[WS] 消息处理完成', {
      success: data.success,
      replyContent: data.replyContent?.substring(0, 50) + '...',
    });

    // 返回 worktool 格式的回复
    return {
      titleList: [roomName],
      receivedName: senderName,
      originalContent: content,
      textType: messageType || 1,
      receivedContent:
        data.replyContent || '您好！我是智能客服小黄鱼，有什么可以帮您的吗？🐟',
    };
  } catch (error) {
    console.error('[WS] 处理消息失败', {
      error: error instanceof Error ? error.message : '未知错误',
    });

    // 返回固定回复（如果 HTTP 调用失败）
    return {
      titleList: [roomName],
      receivedName: senderName,
      originalContent: content,
      textType: messageType || 1,
      receivedContent: '抱歉，我暂时无法回答这个问题，请稍后再试。',
    };
  }
}

export default {
  initWebSocketServer,
  getWebSocketServer,
  getConnectedClients,
  sendToRobot,
  broadcast,
  getWebSocketStatus,
};
