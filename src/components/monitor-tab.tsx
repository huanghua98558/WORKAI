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
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/30">
              <Activity className="h-6 w-6 text-red-500" />
            </div>
            监控与告警
          </h3>
          <p className="text-muted-foreground mt-1">实时监控系统状态和告警信息</p>
        </div>
        <Button onClick={loadAlertData} disabled={isLoading} variant="outline" className="border-primary/30 hover:border-primary/50">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 科幻风格熔断器状态 */}
      <Card className={`sci-fi-card border-primary/30 hover:border-primary/50 transition-all duration-300 ${circuitBreakerStatus ? 'border-red-500/50' : ''}`}>
        <CardHeader className={`bg-gradient-to-r ${circuitBreakerStatus ? 'from-red-500/10 to-orange-500/10' : 'from-green-500/10 to-emerald-500/10'} border-b border-primary/20`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 ${circuitBreakerStatus ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'} rounded-lg border`}>
              <AlertOctagon className={`h-4 w-4 ${circuitBreakerStatus ? 'text-red-500' : 'text-green-500'}`} />
            </div>
            <CardTitle className="text-base">熔断器状态</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mt-2">
            <span className="flex items-center gap-2">
              {circuitBreakerStatus ? (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-500 font-medium">熔断器已开启，AI 服务已暂停</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-500 font-medium">熔断器正常，AI 服务运行中</span>
                </>
              )}
            </span>
            {circuitBreakerStatus && (
              <Button size="sm" variant="outline" onClick={resetCircuitBreaker} className="border-primary/30 hover:border-primary/50">
                重置熔断器
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 科幻风格告警统计 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="sci-fi-card border-primary/30 hover:border-primary/50 transition-all duration-300">
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-b border-primary/20">
            <CardDescription>总告警数</CardDescription>
            <CardTitle className="text-3xl text-blue-500 font-mono">{alertHistory.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              近期告警总数
            </div>
          </CardContent>
        </Card>

        <Card className="sci-fi-card border-primary/30 hover:border-primary/50 transition-all duration-300">
          <CardHeader className="pb-2 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-primary/20">
            <CardDescription>严重告警</CardDescription>
            <CardTitle className="text-3xl text-red-500 font-mono">
              {alertHistory.filter(a => a.level === 'critical').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              需要立即处理
            </div>
          </CardContent>
        </Card>

        <Card className="sci-fi-card border-primary/30 hover:border-primary/50 transition-all duration-300">
          <CardHeader className="pb-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-primary/20">
            <CardDescription>告警趋势</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="font-mono">{alertHistory.length > 0 ? '上升' : '平稳'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              基于近期数据
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 科幻风格告警历史 */}
      <Card className="sci-fi-card border-primary/30 hover:border-primary/50 transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-500/10 rounded-lg border border-orange-500/30">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <CardTitle>告警历史</CardTitle>
          </div>
          <CardDescription>
            最近的告警记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alertHistory.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 border rounded-lg hover:shadow-glow transition-all duration-300 bg-tech-gradient dark:bg-tech-gradient ${
                  alert.level === 'critical' ? 'border-red-500/30 hover:border-red-500/50' :
                  alert.level === 'warning' ? 'border-yellow-500/30 hover:border-yellow-500/50' :
                  'border-blue-500/30 hover:border-blue-500/50'
                }`}
              >
                <div className={`p-2 rounded-lg border ${
                  alert.level === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                  alert.level === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                  'bg-blue-500/10 border-blue-500/30 text-blue-500'
                }`}>
                  <AlertTriangle className="h-4 w-4 text-current" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium">{alert.title || alert.type || '告警'}</span>
                    <Badge variant="outline" className={`${
                      alert.level === 'critical' ? 'border-red-500/50 text-red-500' :
                      alert.level === 'warning' ? 'border-yellow-500/50 text-yellow-500' :
                      'border-blue-500/50 text-blue-500'
                    }`}>
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
