/**
 * 告警详情展示组件
 * 用于在告警中心展示告警触发原因和相关数据
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Heart,
  ShieldAlert,
  Zap,
  Clock,
  MessageSquare,
  Users,
  Activity,
  TrendingUp,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertDetail {
  id: string;
  alertType: 'emotional' | 'risk' | 'service' | 'system'; // 告警类型
  alertLevel: 'critical' | 'warning' | 'info';
  intentType: string;
  message: string;
  triggerReason: string;
  triggerData?: {
    sentiment?: string;
    sentimentScore?: number;
    sentimentIntensity?: string;
    riskKeywords?: string[];
    responseTime?: number;
    serviceThreshold?: number;
    consecutiveFailures?: number;
    systemError?: string;
    errorCode?: string;
  };
  groupId?: string;
  groupName?: string;
  userId?: string;
  userName?: string;
  messageContent?: string;
  suggestedActions?: string[];
  status: 'pending' | 'handled' | 'ignored' | 'sent';
  createdAt: string;
  handledAt?: string;
  handledBy?: string;
  handledNote?: string;
}

interface AlertDetailCardProps {
  alert?: Partial<AlertDetail>;
  className?: string;
}

const DEFAULT_ALERT: AlertDetail = {
  id: '',
  alertType: 'info',
  alertLevel: 'info',
  intentType: '',
  message: '暂无告警数据',
  triggerReason: '暂无触发原因',
  triggerData: undefined,
  groupId: undefined,
  groupName: undefined,
  userId: undefined,
  userName: undefined,
  messageContent: undefined,
  suggestedActions: [],
  status: 'pending',
  createdAt: new Date().toISOString(),
  handledAt: undefined,
  handledBy: undefined,
  handledNote: undefined,
};

export function AlertDetailCard({ alert = DEFAULT_ALERT, className }: AlertDetailCardProps) {
  // 获取告警类型配置
  const getAlertTypeConfig = () => {
    switch (alert.alertType) {
      case 'emotional':
        return {
          icon: Heart,
          label: '情感告警',
          description: '检测到负面情绪',
          color: 'text-pink-600',
          bgColor: 'bg-pink-50',
          borderColor: 'border-pink-300'
        };
      case 'risk':
        return {
          icon: ShieldAlert,
          label: '风险内容',
          description: '检测到风险内容',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-300'
        };
      case 'service':
        return {
          icon: Activity,
          label: '服务质量',
          description: '服务质量告警',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-300'
        };
      case 'system':
        return {
          icon: AlertCircle,
          label: '系统异常',
          description: '系统异常告警',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-300'
        };
    }
  };

  // 获取告警级别配置
  const getAlertLevelConfig = () => {
    switch (alert.alertLevel) {
      case 'critical':
        return {
          icon: AlertTriangle,
          label: '紧急',
          color: 'text-red-600',
          bgColor: 'bg-red-100 border-red-300'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          label: '警告',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100 border-yellow-300'
        };
      case 'info':
        return {
          icon: Info,
          label: '信息',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 border-blue-300'
        };
    }
  };

  const typeConfig = getAlertTypeConfig();
  const levelConfig = getAlertLevelConfig();
  const TypeIcon = typeConfig.icon;
  const LevelIcon = levelConfig.icon;

  // 格式化时间
  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${typeConfig.bgColor} ${typeConfig.color} ${typeConfig.borderColor}`}>
                <TypeIcon className="h-3 w-3 mr-1" />
                {typeConfig.label}
              </Badge>
              <Badge variant="outline" className={`${levelConfig.bgColor} ${levelConfig.color} border`}>
                <LevelIcon className="h-3 w-3 mr-1" />
                {levelConfig.label}
              </Badge>
            </div>
            <CardTitle className="text-lg mt-2">{alert.message}</CardTitle>
            <CardDescription>{typeConfig.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {alert.status === 'handled' ? (
              <Badge className="bg-blue-500 text-white border-0">
                <CheckCircle className="h-3 w-3 mr-1" />
                已处理
              </Badge>
            ) : alert.status === 'pending' ? (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                待处理
              </Badge>
            ) : alert.status === 'ignored' ? (
              <Badge variant="secondary">
                已忽略
              </Badge>
            ) : (
              <Badge className="bg-green-500 text-white border-0">
                已发送
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 触发原因 */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            {alert.triggerReason}
          </AlertDescription>
        </Alert>

        {/* 触发数据 */}
        {alert.triggerData && (
          <div className="space-y-3 p-4 rounded-lg bg-gray-50 border">
            <div className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              触发数据
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 情感数据 */}
              {alert.triggerData.sentiment && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">情感倾向</div>
                  <div className="flex items-center gap-2">
                    {alert.triggerData.sentiment === 'positive' && (
                      <Badge className="bg-green-100 text-green-700 border-green-300">正面</Badge>
                    )}
                    {alert.triggerData.sentiment === 'neutral' && (
                      <Badge variant="outline">中性</Badge>
                    )}
                    {alert.triggerData.sentiment === 'negative' && (
                      <Badge className="bg-red-100 text-red-700 border-red-300">负面</Badge>
                    )}
                    {alert.triggerData.sentimentScore && (
                      <span className="text-sm text-muted-foreground">
                        {alert.triggerData.sentimentScore}%
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 情感强度 */}
              {alert.triggerData.sentimentIntensity && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">情感强度</div>
                  <Badge variant="outline">{alert.triggerData.sentimentIntensity}</Badge>
                </div>
              )}

              {/* 响应时间 */}
              {alert.triggerData.responseTime && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">响应时间</div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span className="font-medium">{alert.triggerData.responseTime}ms</span>
                  </div>
                </div>
              )}

              {/* 连续失败 */}
              {alert.triggerData.consecutiveFailures && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">连续失败</div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span className="font-medium">{alert.triggerData.consecutiveFailures}次</span>
                  </div>
                </div>
              )}

              {/* 系统错误 */}
              {alert.triggerData.systemError && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">系统错误</div>
                  <div className="text-sm font-mono bg-red-50 p-2 rounded text-red-600">
                    {alert.triggerData.systemError}
                  </div>
                </div>
              )}

              {/* 风险关键词 */}
              {alert.triggerData.riskKeywords && alert.triggerData.riskKeywords.length > 0 && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">风险关键词</div>
                  <div className="flex flex-wrap gap-1">
                    {alert.triggerData.riskKeywords.map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-red-600 border-red-300">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 相关信息 */}
        <div className="space-y-2">
          {alert.groupName && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">群组:</span>
              <span className="font-medium">{alert.groupName}</span>
            </div>
          )}
          {alert.userName && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">用户:</span>
              <span className="font-medium">{alert.userName}</span>
            </div>
          )}
          {alert.intentType && (
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              <span className="text-muted-foreground">意图:</span>
              <Badge variant="outline">{alert.intentType}</Badge>
            </div>
          )}
        </div>

        {/* 消息内容 */}
        {alert.messageContent && (
          <div className="space-y-2 pt-3 border-t">
            <div className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              触发消息
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              {alert.messageContent}
            </div>
          </div>
        )}

        {/* 建议操作 */}
        {alert.suggestedActions && alert.suggestedActions.length > 0 && (
          <div className="space-y-2 pt-3 border-t">
            <div className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              建议操作
            </div>
            <div className="space-y-1">
              {alert.suggestedActions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">{idx + 1}.</span>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 处理信息 */}
        {alert.status === 'handled' && (
          <div className="space-y-2 pt-3 border-t bg-blue-50 p-3 rounded-lg">
            <div className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              处理信息
            </div>
            {alert.handledBy && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-3 w-3" />
                <span className="text-muted-foreground">处理人:</span>
                <span className="font-medium">{alert.handledBy}</span>
              </div>
            )}
            {alert.handledAt && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3 w-3" />
                <span className="text-muted-foreground">处理时间:</span>
                <span className="font-medium">{formatTime(alert.handledAt)}</span>
              </div>
            )}
            {alert.handledNote && (
              <div className="pt-2">
                <div className="text-xs text-muted-foreground mb-1">处理备注</div>
                <div className="text-sm">{alert.handledNote}</div>
              </div>
            )}
          </div>
        )}

        {/* 时间信息 */}
        <div className="flex items-center justify-between pt-3 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>创建时间: {formatTime(alert.createdAt)}</span>
          </div>
          <div className="text-xs">
            ID: {alert.id.slice(0, 8)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 告警类型徽章组件
 */
interface AlertTypeBadgeProps {
  type: 'emotional' | 'risk' | 'service' | 'system';
  className?: string;
}

export function AlertTypeBadge({ type, className }: AlertTypeBadgeProps) {
  const config = {
    emotional: { label: '情感', icon: Heart, color: 'text-pink-600', bg: 'bg-pink-100 border-pink-300' },
    risk: { label: '风险', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-100 border-red-300' },
    service: { label: '服务', icon: Activity, color: 'text-yellow-600', bg: 'bg-yellow-100 border-yellow-300' },
    system: { label: '系统', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100 border-orange-300' }
  };

  const { label, icon: Icon, color, bg } = config[type];

  return (
    <Badge variant="outline" className={`${bg} ${color} border ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
