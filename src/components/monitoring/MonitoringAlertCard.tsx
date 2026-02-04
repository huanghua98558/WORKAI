'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, AlertOctagon, Info, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AlertData {
  id: string;
  ruleName?: string;
  intentType: string;
  alertLevel: 'info' | 'warning' | 'critical';
  alertMessage: string;
  status: 'pending' | 'handled' | 'ignored';
  createdAt: string;
}

interface MonitoringAlertCardProps {
  maxItems?: number;
  showViewAll?: boolean;
}

export default function MonitoringAlertCard({ maxItems = 5, showViewAll = true }: MonitoringAlertCardProps) {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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
    // 每10秒刷新一次
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, [maxItems]);

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
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 text-white">Warning</Badge>;
      case 'info':
        return <Badge variant="secondary">Info</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            待处理告警
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAlerts}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>暂无待处理告警</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => router.push(`/alerts/center`)}
              >
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
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {alert.alertMessage}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(alert.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {showViewAll && alerts.length > 0 && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => router.push('/alerts/center')}
          >
            查看全部告警
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
