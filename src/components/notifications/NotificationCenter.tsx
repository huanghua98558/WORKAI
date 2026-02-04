'use client';

import { useState } from 'react';
import { Bell, BellRing, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useNotifications, Alert } from './NotificationProvider';

export function NotificationCenter() {
  const { alertHistory, unreadCount, markAsRead, clearCurrentAlert } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleAlertClick = (alert: Alert) => {
    if (!alert.read) {
      markAsRead(alert.id);
    }
  };

  const handleClearAll = () => {
    // 标记所有为已读
    alertHistory.forEach(alert => {
      if (!alert.read) {
        markAsRead(alert.id);
      }
    });
  };

  const getAlertBadgeColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAlertEmoji = (level: string) => {
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
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <>
              <BellRing className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            </>
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>通知中心</span>
            {alertHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-sm"
              >
                全部已读
              </Button>
            )}
          </SheetTitle>
          <SheetDescription>
            {unreadCount > 0 ? `${unreadCount} 条未读消息` : '暂无未读消息'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {alertHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>暂无通知</p>
            </div>
          ) : (
            alertHistory.map((alert) => (
              <div
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className={`
                  relative p-4 rounded-lg border cursor-pointer transition-colors
                  ${alert.read ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200 shadow-sm'}
                  hover:border-blue-300
                `}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getAlertEmoji(alert.level)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getAlertBadgeColor(alert.level)}>
                        {alert.level.toUpperCase()}
                      </Badge>
                      {!alert.read && (
                        <Badge variant="outline" className="text-xs">
                          未读
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-1">{alert.type}</h4>
                    <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(alert.triggerTime).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  {!alert.read && (
                    <div className="h-2 w-2 bg-blue-500 rounded-full mt-1" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
