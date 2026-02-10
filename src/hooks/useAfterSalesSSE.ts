/**
 * 售后管理SSE实时更新Hook
 *
 * 监听售后相关的实时通知：
 * - 任务创建
 * - 任务更新
 * - 满意度变化
 * - 工作人员活动
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AfterSalesSSEMessage {
  type: 'task_created' | 'task_updated' | 'satisfaction_updated' | 'staff_activity';
  data: any;
  timestamp: string;
}

export interface UseAfterSalesSSEOptions {
  onTaskCreated?: (data: any) => void;
  onTaskUpdated?: (data: any) => void;
  onSatisfactionUpdated?: (data: any) => void;
  onStaffActivity?: (data: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useAfterSalesSSE(options: UseAfterSalesSSEOptions = {}) {
  const {
    onTaskCreated,
    onTaskUpdated,
    onSatisfactionUpdated,
    onStaffActivity,
    onConnected,
    onDisconnected,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<AfterSalesSSEMessage[]>([]);
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
    onDisconnected?.();
  }, [onDisconnected]);

  /**
   * 处理SSE消息
   */
  const handleMessage = useCallback((message: AfterSalesSSEMessage) => {
    // 添加到通知列表（保留最近50条）
    setNotifications((prev) => [message, ...prev].slice(0, 50));

    // 根据消息类型触发回调
    switch (message.type) {
      case 'task_created':
        onTaskCreated?.(message.data);
        break;
      case 'task_updated':
        onTaskUpdated?.(message.data);
        break;
      case 'satisfaction_updated':
        onSatisfactionUpdated?.(message.data);
        break;
      case 'staff_activity':
        onStaffActivity?.(message.data);
        break;
    }
  }, [onTaskCreated, onTaskUpdated, onSatisfactionUpdated, onStaffActivity]);

  /**
   * 尝试重连
   */
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('[售后SSE] 达到最大重连次数，停止重连');
      onError?.(new Error('达到最大重连次数'));
      return;
    }

    const nextAttempt = reconnectAttempts + 1;
    setReconnectAttempts(nextAttempt);

    console.log(`[售后SSE] ${reconnectInterval}ms后尝试第${nextAttempt}次重连...`);

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, reconnectInterval);
  }, [reconnectAttempts, reconnectInterval, maxReconnectAttempts, onError]);

  /**
   * 连接到SSE服务器
   */
  const connect = useCallback(() => {
    // 清理之前的连接
    cleanup();

    // 构建URL - 监听售后通知通道
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const url = `/api/sse/after-sales`;

    // 如果有配置 NEXT_PUBLIC_API_URL，使用完整 URL
    const finalUrl = baseUrl ? `${baseUrl}${url}` : url;

    console.log('[售后SSE] 正在连接到SSE服务器...', { finalUrl });

    try {
      // 创建EventSource连接
      const eventSource = new EventSource(finalUrl);
      eventSourceRef.current = eventSource;

      // 连接成功
      eventSource.onopen = () => {
        console.log('[售后SSE] SSE连接成功');
        setConnected(true);
        setError(null);
        setReconnectAttempts(0);
        onConnected?.();
      };

      // 接收消息
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (err) {
          console.error('[售后SSE] 解析消息失败:', err);
        }
      };

      // 错误处理
      eventSource.onerror = (err) => {
        console.error('[售后SSE] SSE连接错误:', err);
        setConnected(false);
        setError(new Error('SSE连接错误'));
        eventSource.close();

        // 尝试重连
        attemptReconnect();
      };

    } catch (err) {
      console.error('[售后SSE] 创建SSE连接失败:', err);
      const error = err as Error;
      setError(error);
      onError?.(error);
    }
  }, [cleanup, handleMessage, attemptReconnect, onConnected, onError]);

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    console.log('[售后SSE] 主动断开连接');
    cleanup();
  }, [cleanup]);

  /**
   * 清空通知
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 组件挂载时自动连接
  useEffect(() => {
    connect();

    // 组件卸载时清理
    return () => {
      cleanup();
    };
  }, []); // 只在组件挂载时连接一次

  return {
    connected,
    notifications,
    error,
    connect,
    disconnect,
    clearNotifications,
    reconnectAttempts,
  };
}
