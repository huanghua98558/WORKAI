'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { soundPlayer, SoundPlayerProps } from '@/lib/sound-player';
import { alertWebSocket } from '@/lib/alert-websocket';

export interface Alert {
  id: string;
  type: string;
  level: 'info' | 'warning' | 'critical';
  robotName?: string;
  description: string;
  triggerTime: string;
  recipientCount?: number;
}

export interface NotificationPreferences {
  webNotificationEnabled: boolean;
  toastEnabled: boolean;
  toastAutoClose: boolean;
  toastAutoCloseDuration: number;
  modalEnabled: boolean;
  systemNotificationEnabled: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  levelFilters: {
    info: { enabled: boolean; sound: boolean };
    warning: { enabled: boolean; sound: boolean };
    critical: { enabled: boolean; sound: boolean };
  };
}

interface NotificationContextType {
  // 当前告警
  currentAlert: Alert | null;
  // 告警历史
  alertHistory: Alert[];
  // 未读告警数
  unreadCount: number;
  // 通知偏好
  preferences: NotificationPreferences;
  // WebSocket 连接状态
  isConnected: boolean;
  // 添加告警到历史
  addAlertToHistory: (alert: Alert) => void;
  // 清除当前告警
  clearCurrentAlert: () => void;
  // 标记已读
  markAsRead: (alertId: string) => void;
  // 更新偏好设置
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  // 测试告警
  testAlert: (level: 'info' | 'warning' | 'critical') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [alertHistory, setAlertHistory] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    webNotificationEnabled: true,
    toastEnabled: true,
    toastAutoClose: true,
    toastAutoCloseDuration: 5000,
    modalEnabled: true,
    systemNotificationEnabled: true,
    soundEnabled: true,
    soundVolume: 0.8,
    levelFilters: {
      info: { enabled: false, sound: false },
      warning: { enabled: true, sound: true },
      critical: { enabled: true, sound: true }
    }
  });
  const [isConnected, setIsConnected] = useState(false);

  // 初始化
  useEffect(() => {
    // 加载保存的偏好设置
    const savedPreferences = localStorage.getItem('notificationPreferences');
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error('[NotificationProvider] 加载偏好设置失败:', error);
      }
    }

    // 同步到声音播放器
    soundPlayer.updateConfig({
      enabled: preferences.soundEnabled,
      volume: preferences.soundVolume,
      levelFilters: preferences.levelFilters
    });
  }, []);

  // 监听偏好设置变化
  useEffect(() => {
    soundPlayer.updateConfig({
      enabled: preferences.soundEnabled,
      volume: preferences.soundVolume,
      levelFilters: preferences.levelFilters
    });

    localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
  }, [preferences]);

  // WebSocket 连接
  useEffect(() => {
    // 注册消息处理器
    alertWebSocket.on('alert', handleAlertMessage);
    alertWebSocket.on('alert_acknowledged', handleAlertAcknowledged);
    alertWebSocket.on('alert_closed', handleAlertClosed);

    // 监听连接状态
    const checkConnection = () => {
      setIsConnected(alertWebSocket.isConnected());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    return () => {
      alertWebSocket.off('alert');
      alertWebSocket.off('alert_acknowledged');
      alertWebSocket.off('alert_closed');
      clearInterval(interval);
    };
  }, [preferences]);

  // 处理告警消息
  const handleAlertMessage = (data: any) => {
    console.log('[NotificationProvider] 收到告警:', data);

    const alert: Alert = {
      id: data.alertId,
      type: data.type,
      level: data.level,
      robotName: data.robotName,
      description: data.description,
      triggerTime: data.triggerTime,
      recipientCount: data.recipientCount
    };

    // 检查是否启用通知
    if (!preferences.webNotificationEnabled) {
      return;
    }

    // 检查级别过滤
    const levelConfig = preferences.levelFilters[alert.level];
    if (!levelConfig.enabled) {
      return;
    }

    // 播放声音
    if (preferences.soundEnabled && levelConfig.sound) {
      soundPlayer.play(alert.level);
    }

    // 显示 Toast 通知
    if (preferences.toastEnabled) {
      // Toast 通知会通过 ToastNotification 组件自动处理
    }

    // 显示 Modal（仅 Critical 级别）
    if (preferences.modalEnabled && alert.level === 'critical') {
      setCurrentAlert(alert);
    }

    // 添加到历史记录
    setAlertHistory(prev => [alert, ...prev]);
    setUnreadCount(prev => prev + 1);

    // 发送系统通知
    if (preferences.systemNotificationEnabled && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        sendSystemNotification(alert);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            sendSystemNotification(alert);
          }
        });
      }
    }
  };

  // 处理告警确认
  const handleAlertAcknowledged = (data: any) => {
    console.log('[NotificationProvider] 告警已确认:', data);
    // 可以在这里更新告警状态
  };

  // 处理告警关闭
  const handleAlertClosed = (data: any) => {
    console.log('[NotificationProvider] 告警已关闭:', data);
    setCurrentAlert(null);
  };

  // 发送系统通知
  const sendSystemNotification = (alert: Alert) => {
    const levelEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨'
    };

    new Notification(`${levelEmoji[alert.level]} ${alert.type}`, {
      body: alert.description,
      icon: '/alert-icon.png',
      tag: alert.id,
      timestamp: new Date(alert.triggerTime).getTime()
    });
  };

  // 添加告警到历史
  const addAlertToHistory = (alert: Alert) => {
    setAlertHistory(prev => [alert, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  // 清除当前告警
  const clearCurrentAlert = () => {
    setCurrentAlert(null);
  };

  // 标记已读
  const markAsRead = (alertId: string) => {
    setAlertHistory(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // 更新偏好设置
  const updatePreferences = (newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  };

  // 测试告警
  const testAlert = (level: 'info' | 'warning' | 'critical') => {
    const testAlertData: Alert = {
      id: `test-${Date.now()}`,
      type: '测试告警',
      level,
      robotName: '测试机器人',
      description: `这是一个 ${level} 级别的测试告警`,
      triggerTime: new Date().toISOString(),
      recipientCount: 1
    };

    handleAlertMessage(testAlertData);
  };

  const value: NotificationContextType = {
    currentAlert,
    alertHistory,
    unreadCount,
    preferences,
    isConnected,
    addAlertToHistory,
    clearCurrentAlert,
    markAsRead,
    updatePreferences,
    testAlert
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
