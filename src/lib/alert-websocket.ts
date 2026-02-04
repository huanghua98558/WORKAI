/**
 * 告警 WebSocket 客户端
 * 用于接收实时告警推送
 */

class AlertWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private maxReconnectDelay: number = 30000;
  private isManualClose: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.connect();
  }

  /**
   * 连接 WebSocket
   */
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log('[AlertWebSocket] WebSocket 已连接或正在连接');
      return;
    }

    try {
      const wsUrl = `ws://localhost:5001/ws/alerts`;
      console.log(`[AlertWebSocket] 正在连接: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[AlertWebSocket] WebSocket 连接成功');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[AlertWebSocket] 收到消息:', message);
          this.handleMessage(message);
        } catch (error) {
          console.error('[AlertWebSocket] 解析消息失败:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[AlertWebSocket] WebSocket 错误:', error);
      };

      this.ws.onclose = () => {
        console.log('[AlertWebSocket] WebSocket 连接关闭');
        this.stopHeartbeat();

        if (!this.isManualClose) {
          this.reconnect();
        }
      };
    } catch (error) {
      console.error('[AlertWebSocket] 创建 WebSocket 连接失败:', error);
      if (!this.isManualClose) {
        this.reconnect();
      }
    }
  }

  /**
   * 重连
   */
  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[AlertWebSocket] 重连次数超过限制');
      return;
    }

    this.reconnectAttempts++;

    // 指数退避
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`[AlertWebSocket] 将在 ${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 启动心跳
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // 每30秒发送一次心跳
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 发送消息
   */
  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('[AlertWebSocket] 发送消息失败:', error);
      }
    } else {
      console.warn('[AlertWebSocket] WebSocket 未连接，无法发送消息');
    }
  }

  /**
   * 处理消息
   */
  private handleMessage(message: any) {
    const { type, data } = message;

    // 处理 ping/pong
    if (type === 'ping') {
      this.send({ type: 'pong' });
      return;
    }

    // 调用注册的消息处理器
    const handler = this.messageHandlers.get(type);
    if (handler) {
      try {
        handler(data);
      } catch (error) {
        console.error(`[AlertWebSocket] 处理消息失败 (type=${type}):`, error);
      }
    } else {
      console.warn(`[AlertWebSocket] 未注册的消息处理器: ${type}`);
    }
  }

  /**
   * 注册消息处理器
   */
  on(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * 取消注册消息处理器
   */
  off(type: string) {
    this.messageHandlers.delete(type);
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.isManualClose = true;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 获取连接状态
   */
  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// 导出单例
export const alertWebSocket = new AlertWebSocket();
