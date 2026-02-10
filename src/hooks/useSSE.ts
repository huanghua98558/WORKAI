/**
 * SSE（Server-Sent Events）实时消息推送 Hook
 *
 * 功能：
 * - 连接到后端SSE API
 * - 接收实时消息推送
 * - 自动重连机制
 * - 心跳保活
 * - 错误处理
 *
 * 使用示例：
 * ```tsx
 * const { connected, messages, error, connect, disconnect } = useSSE({
 *   sessionId: 'xxx',
 *   onMessage: (message) => {
 *     console.log('收到新消息:', message);
 *   },
 *   onError: (error) => {
 *     console.error('SSE错误:', error);
 *   },
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SSEMessage {
  id?: string;
  sessionId?: string;
  content?: string;
  isFromBot?: boolean;
  isHuman?: boolean;
  intent?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface SSEEvent {
  type: 'connected' | 'message' | 'heartbeat' | 'error';
  message?: string;
  timestamp: string;
  data?: SSEMessage;
  error?: string;
}

export interface UseSSEOptions {
  sessionId?: string;
  robotId?: string;
  onMessage?: (message: SSEMessage) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  reconnectInterval?: number; // 重连间隔（毫秒）
  maxReconnectAttempts?: number; // 最大重连次数
}

export function useSSE(options: UseSSEOptions = {}) {
  const {
    sessionId,
    robotId,
    onMessage,
    onConnected,
    onDisconnected,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 清理资源
   */
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    setConnected(false);
  }, []);

  /**
   * 连接到SSE服务器
   */
  const connect = useCallback(() => {
    // 清理之前的连接
    cleanup();

    // 构建URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const params = new URLSearchParams();
    if (sessionId) params.append('sessionId', sessionId);
    if (robotId) params.append('robotId', robotId);
    const url = `${baseUrl}/api/sse/messages?${params.toString()}`;

    console.log('[useSSE] 正在连接到SSE服务器...', { url, sessionId, robotId });

    try {
      // 创建EventSource连接
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      // 连接成功
      eventSource.onopen = () => {
        console.log('[useSSE] SSE连接成功');
        setConnected(true);
        setError(null);
        setReconnectAttempts(0);
        onConnected?.();
      };

      // 接收消息
      eventSource.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);

          console.log('[useSSE] 收到SSE消息:', data);

          switch (data.type) {
            case 'connected':
              console.log('[useSSE] 服务器已确认连接');
              break;

            case 'message':
              console.log('[useSSE] 收到新消息:', data.data);
              if (data.data) {
                // 添加到消息列表
                setMessages((prev) => [...prev, data.data!]);
                // 触发回调
                onMessage?.(data.data!);
              }
              break;

            case 'heartbeat':
              console.log('[useSSE] 收到心跳包');
              // 重置心跳定时器
              if (heartbeatTimerRef.current) {
                clearTimeout(heartbeatTimerRef.current);
              }
              // 如果30秒内没有收到心跳，视为断开连接
              heartbeatTimerRef.current = setTimeout(() => {
                console.warn('[useSSE] 心跳超时，重新连接...');
                eventSource.close();
                attemptReconnect();
              }, 35000);
              break;

            case 'error':
              console.error('[useSSE] 服务器返回错误:', data.error);
              const err = new Error(data.error || '服务器错误');
              setError(err);
              onError?.(err);
              break;
          }
        } catch (err) {
          console.error('[useSSE] 解析消息失败:', err);
        }
      };

      // 错误处理
      eventSource.onerror = (err) => {
        console.error('[useSSE] SSE连接错误:', err);
        setConnected(false);
        eventSource.close();

        // 尝试重连
        attemptReconnect();
      };

    } catch (err) {
      console.error('[useSSE] 创建SSE连接失败:', err);
      const error = err as Error;
      setError(error);
      onError?.(error);
    }
  }, [sessionId, robotId, onMessage, onConnected, onError, reconnectInterval, maxReconnectAttempts, cleanup]);

  /**
   * 尝试重连
   */
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('[useSSE] 已达到最大重连次数，停止重连');
      setError(new Error('已达到最大重连次数'));
      onDisconnected?.();
      return;
    }

    const nextAttempt = reconnectAttempts + 1;
    setReconnectAttempts(nextAttempt);
    console.log(`[useSSE] 将在 ${reconnectInterval / 1000} 秒后进行第 ${nextAttempt} 次重连...`);

    reconnectTimerRef.current = setTimeout(() => {
      console.log(`[useSSE] 开始第 ${nextAttempt} 次重连...`);
      connect();
    }, reconnectInterval);
  }, [reconnectAttempts, maxReconnectAttempts, reconnectInterval, connect, onDisconnected]);

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    console.log('[useSSE] 断开SSE连接');
    cleanup();
    onDisconnected?.();
  }, [cleanup, onDisconnected]);

  /**
   * 清空消息列表
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 组件挂载时自动连接
  useEffect(() => {
    if (sessionId || robotId) {
      connect();
    }

    // 组件卸载时清理资源
    return () => {
      cleanup();
    };
  }, [sessionId, robotId, connect, cleanup]);

  return {
    connected,
    messages,
    error,
    reconnectAttempts,
    connect,
    disconnect,
    clearMessages,
  };
}
