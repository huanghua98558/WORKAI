/**
 * WebSocket实时通知Hook
 * 用于接收风险消息的实时通知
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface RiskNotificationData {
  notificationType: string;
  riskId: string;
  sessionId: string;
  userId: string;
  userName: string;
  groupName: string;
  message: string;
  aiReply: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  reason?: string;
}

export function useWebSocketNotification(
  url: string,
  onNotification: (notification: RiskNotificationData) => void,
  enabled: boolean = true
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] 连接已建立');
        setIsConnected(true);
        setLastError(null);

        // 发送ping保持连接
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);

        // 清理定时器
        ws.onclose = () => {
          clearInterval(pingInterval);
        };
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // 处理pong
          if (data.type === 'pong') {
            return;
          }

          // 处理通知
          if (data.type === 'notification' && data.data?.notificationType === 'risk_message') {
            console.log('[WebSocket] 收到风险通知:', data.data);
            onNotification(data.data);

            // 显示浏览器通知
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('风险消息预警', {
                body: `${data.data.userName}发送了风险消息`,
                icon: '/alert-icon.png',
              });
            }
          }
        } catch (error) {
          console.error('[WebSocket] 消息解析失败:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] 连接错误:', error);
        setLastError('连接错误');
      };

      ws.onclose = () => {
        console.log('[WebSocket] 连接已关闭');
        setIsConnected(false);

        // 自动重连（5秒后）
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WebSocket] 尝试重连...');
            connect();
          }, 5000);
        }
      };
    } catch (error) {
      console.error('[WebSocket] 连接失败:', error);
      setLastError('连接失败');
    }
  }, [url, onNotification, enabled]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] 连接未建立，无法发送消息');
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();

      // 请求浏览器通知权限
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled]);

  return {
    isConnected,
    lastError,
    send,
    disconnect,
    reconnect: connect,
  };
}

export default useWebSocketNotification;
