'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Activity, AlertTriangle, RefreshCw, AlertCircle, CheckCircle, TrendingUp, Clock, AlertOctagon } from 'lucide-react';

export default function MonitorTab() {
  const [alertHistory, setAlertHistory] = useState<any[]>([]);
  const [circuitBreakerStatus, setCircuitBreakerStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadAlertData = async () => {
    setIsLoading(true);
    try {
      const [alertsRes, circuitRes] = await Promise.all([
        fetch('/api/admin/alerts/history?limit=20'),
        fetch('/api/admin/circuit-breaker/status')
      ]);

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlertHistory(data.data || []);
      }

      if (circuitRes.ok) {
        const data = await circuitRes.json();
        setCircuitBreakerStatus(data.data.isOpen);
      }
    } catch (error) {
      console.error('加载告警数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlertData();
  }, []);

  const resetCircuitBreaker = async () => {
    if (confirm('确定要重置熔断器吗？这将重新启用 AI 服务。')) {
      try {
        const res = await fetch('/api/admin/circuit-breaker/reset', { method: 'POST' });
        if (res.ok) {
          alert('✅ 熔断器已重置');
          loadAlertData();
        }
      } catch (error) {
        alert('❌ 重置失败');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-red-500" />
            监控与告警
          </h3>
          <p className="text-muted-foreground mt-1">实时监控系统状态和告警信息</p>
        </div>
        <Button onClick={loadAlertData} disabled={isLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 熔断器状态 */}
      <Alert variant={circuitBreakerStatus ? 'destructive' : 'default'}>
        <AlertOctagon className="h-4 w-4" />
        <AlertTitle>熔断器状态</AlertTitle>
        <AlertDescription>
          <div className="flex items-center justify-between mt-2">
            <span className="flex items-center gap-2">
              {circuitBreakerStatus ? (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <span>熔断器已开启，AI 服务已暂停</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>熔断器正常，AI 服务运行中</span>
                </>
              )}
            </span>
            {circuitBreakerStatus && (
              <Button size="sm" variant="outline" onClick={resetCircuitBreaker}>
                重置熔断器
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* 告警统计 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>总告警数</CardDescription>
            <CardTitle className="text-3xl">{alertHistory.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              近期告警总数
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>严重告警</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {alertHistory.filter(a => a.level === 'critical').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              需要立即处理
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>告警趋势</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span>{alertHistory.length > 0 ? '上升' : '平稳'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              基于近期数据
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 告警历史 */}
      <Card>
        <CardHeader>
          <CardTitle>告警历史</CardTitle>
          <CardDescription>
            最近的告警记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alertHistory.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                <div className={`p-2 rounded-lg ${
                  alert.level === 'critical' ? 'bg-red-100 dark:bg-red-900' :
                  alert.level === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900' :
                  'bg-blue-100 dark:bg-blue-900'
                }`}>
                  <AlertTriangle className="h-4 w-4 text-current" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{alert.title || alert.type || '告警'}</span>
                    <Badge variant={
                      alert.level === 'critical' ? 'destructive' :
                      alert.level === 'warning' ? 'secondary' : 'outline'
                    }>
                      {alert.level}
                    </Badge>
                  </div>
                  {alert.message && (
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  )}
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {alert.createdAt || new Date().toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>
            ))}
            {alertHistory.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                暂无告警记录
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
