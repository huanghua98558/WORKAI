'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications, Alert } from './NotificationProvider';
import { soundPlayer } from '@/lib/sound-player';

export function ToastNotification() {
  const { alertHistory, markAsRead, preferences } = useNotifications();

  // 显示最新的未读告警
  const latestUnreadAlert = alertHistory.find(alert => !alert.read);

  useEffect(() => {
    if (latestUnreadAlert && preferences.toastEnabled) {
      // 自动标记为已读
      const timer = setTimeout(() => {
        markAsRead(latestUnreadAlert.id);
      }, preferences.toastAutoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [latestUnreadAlert]);

  if (!latestUnreadAlert || !preferences.toastEnabled) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className={`
        max-w-md rounded-lg shadow-lg p-4 border-l-4
        ${getAlertColorClass(latestUnreadAlert.level)}
      `}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{getAlertEmoji(latestUnreadAlert.level)}</span>
              <h3 className="font-semibold">{latestUnreadAlert.type}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">{latestUnreadAlert.description}</p>
            {latestUnreadAlert.robotName && (
              <p className="text-xs text-gray-500">机器人: {latestUnreadAlert.robotName}</p>
            )}
            <p className="text-xs text-gray-400">
              {new Date(latestUnreadAlert.triggerTime).toLocaleString('zh-CN')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => markAsRead(latestUnreadAlert.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function getAlertColorClass(level: string): string {
  switch (level) {
    case 'critical':
      return 'bg-red-50 border-red-500';
    case 'warning':
      return 'bg-yellow-50 border-yellow-500';
    case 'info':
      return 'bg-blue-50 border-blue-500';
    default:
      return 'bg-gray-50 border-gray-500';
  }
}

function getAlertEmoji(level: string): string {
  switch (level) {
    case 'critical':
      return '🚨';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '🔔';
  }
}
