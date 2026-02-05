/**
 * 风险消息通知卡片
 * 显示风险消息详情和操作按钮
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User, MessageSquare, Clock, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RiskNotificationData {
  riskId: string;
  sessionId: string;
  userId: string;
  userName: string;
  groupName: string;
  message: string;
  aiReply: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  status?: 'processing' | 'resolved' | 'escalated';
}

interface RiskNotificationCardProps {
  notification: RiskNotificationData;
  onIntervene?: (riskId: string, sessionId: string) => void;
  onIgnore?: (riskId: string) => void;
  onResolve?: (riskId: string, resolvedBy: string) => void;
  onViewDetails?: (riskId: string) => void;
  className?: string;
}

export default function RiskNotificationCard({
  notification,
  onIntervene,
  onIgnore,
  onResolve,
  onViewDetails,
  className,
}: RiskNotificationCardProps) {
  const { priority } = notification;

  const priorityColors = {
    low: 'bg-green-100 text-green-800 border-green-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-red-100 text-red-800 border-red-300',
  };

  const priorityLabels = {
    low: '低',
    medium: '中',
    high: '高',
  };

  return (
    <Card
      className={cn(
        'border-2 transition-all hover:shadow-md',
        priority === 'high' && 'border-red-300 bg-red-50',
        priority === 'medium' && 'border-yellow-300 bg-yellow-50',
        priority === 'low' && 'border-green-300 bg-green-50',
        className
      )}
    >
      <div className="p-4 space-y-3">
        {/* 标题栏 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                'h-5 w-5',
                priority === 'high' && 'text-red-600',
                priority === 'medium' && 'text-yellow-600',
                priority === 'low' && 'text-green-600'
              )}
            />
            <span className="font-semibold text-sm">风险消息预警</span>
            <Badge variant="outline" className={cn('text-xs', priorityColors[priority])}>
              {priorityLabels[priority]}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(notification.timestamp).toLocaleString('zh-CN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        {/* 用户信息 */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">用户：</span>
            <span className="font-medium">{notification.userName}</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">群聊：</span>
            <span className="font-medium">{notification.groupName}</span>
          </div>
        </div>

        {/* 用户消息 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-1">用户消息：</p>
          <p className="text-sm text-gray-700 line-clamp-3">{notification.message}</p>
        </div>

        {/* AI回复 */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-1">AI回复：</p>
          <p className="text-sm text-blue-700 line-clamp-3">{notification.aiReply}</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="default"
            onClick={() => onIntervene?.(notification.riskId, notification.sessionId)}
            className="flex-1 min-w-[120px]"
          >
            <ArrowRight className="h-4 w-4 mr-1" />
            介入处理
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onResolve?.(notification.riskId, 'agent')}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            已处理
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onIgnore?.(notification.riskId)}
          >
            <XCircle className="h-4 w-4 mr-1" />
            忽略
          </Button>

          <Button
            size="sm"
            variant="link"
            onClick={() => onViewDetails?.(notification.riskId)}
          >
            查看详情
          </Button>
        </div>
      </div>
    </Card>
  );
}
