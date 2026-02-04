'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, AlertOctagon, Info, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface AlertData {
  id: string;
  ruleName?: string;
  intentType: string;
  alertLevel: 'info' | 'warning' | 'critical';
  alertMessage: string;
  status: 'pending' | 'handled' | 'ignored';
  createdAt: string;
}

interface MonitoringAlertCompactProps {
  maxItems?: number;
  showViewAll?: boolean;
}

export default function MonitoringAlertCompact({ maxItems = 3, showViewAll = true }: MonitoringAlertCompactProps) {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载最近的告警
  const loadAlerts = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/alerts/history?limit=20');
      const data = await response.json();
      if (data.success) {
        const pendingAlerts = (data.data || [])
          .filter((a: AlertData) => a.status === 'pending')
          .slice(0, maxItems);
        setAlerts(pendingAlerts);
      }
    } catch (error) {
      console.error('加载告警失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    // 每15秒刷新一次
    const interval = setInterval(loadAlerts, 15000);
    return () => clearInterval(interval);
  }, [maxItems]);

  // 处理告警
  const handleAlert = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:5001/api/alerts/history/${id}/handle`, {
        method: 'PUT'
      });

      if (response.ok) {
        // 重新加载告警列表
        loadAlerts();
      } else {
        console.error('处理告警失败');
      }
    } catch (error) {
      console.error('处理告警失败:', error);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertOctagon className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive" className="text-xs">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 text-white text-xs">Warning</Badge>;
      case 'info':
        return <Badge variant="secondary" className="text-xs">Info</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{level}</Badge>;
    }
  };

  const getLevelBorderClass = (level: string) => {
    switch (level) {
      case 'critical':
        return 'border-l-red-500 bg-red-50/30';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50/30';
      case 'info':
        return 'border-l-blue-500 bg-blue-50/30';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            待处理告警
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAlerts}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-6 text-gray-500 text-sm">加载中...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
            <p className="text-sm">暂无待处理告警</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`border-l-4 rounded-lg p-3 ${getLevelBorderClass(alert.alertLevel)}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {getLevelIcon(alert.alertLevel)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {alert.ruleName || alert.intentType}
                      </span>
                      {getLevelBadge(alert.alertLevel)}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {alert.alertMessage}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        {new Date(alert.createdAt).toLocaleString('zh-CN')}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => window.location.href = '/alerts/center'}
                        >
                          详情
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleAlert(alert.id)}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          处理
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showViewAll && alerts.length > 0 && (
          <Button
            variant="outline"
            className="w-full mt-3"
            size="sm"
            onClick={() => window.location.href = '/alerts/center'}
          >
            查看全部告警
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
