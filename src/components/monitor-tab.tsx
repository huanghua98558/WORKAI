'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  AlertOctagon,
  Bell,
  Settings,
  BarChart3,
  Eye,
  ArrowRight
} from 'lucide-react';
import MonitoringAlertCompact from '@/components/monitoring/MonitoringAlertCompact';
import AlertRulesDialog from '@/components/monitoring/AlertRulesDialog';

interface HealthStatus {
  executions: {
    total: number;
    success: number;
    error: number;
    processing: number;
    successRate: string;
  };
  ai: {
    total: number;
    success: number;
    error: number;
    successRate: string;
  };
  sessions: {
    active: number;
  };
  timestamp: string;
  alerts?: {
    total: number;
    pending: number;
    critical: number;
    warning: number;
    info: number;
  };
}

export default function MonitorTab() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [isAlertRulesDialogOpen, setIsAlertRulesDialogOpen] = useState(false);

  // 加载健康状态和告警数据
  const loadHealthData = async () => {
    setIsLoading(true);
    try {
      // 获取健康状态
      const healthRes = await fetch('/api/monitoring/health');
      if (healthRes.ok) {
        const data = await healthRes.json();
        if (data.code === 0) {
          // 获取告警统计
          try {
            const alertRes = await fetch('/api/alerts/stats', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            if (alertRes.ok) {
              const alertData = await alertRes.json();
              if (alertData.success) {
                data.data.alerts = {
                  total: parseInt(alertData.data.total) || 0,
                  pending: parseInt(alertData.data.pending) || 0,
                  critical: parseInt(alertData.data.critical) || 0,
                  warning: parseInt(alertData.data.warning) || 0,
                  info: parseInt(alertData.data.info) || 0
                };
              }
            }
          } catch (alertError) {
            console.warn('获取告警统计失败，使用默认值:', alertError);
            // 不影响健康状态的显示
          }
          setHealth(data.data);
        }
      }
    } catch (error) {
      console.error('加载健康状态失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHealthData();
    // 每30秒刷新一次
    const interval = setInterval(loadHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-500" />
            监控告警中心
          </h3>
          <p className="text-muted-foreground mt-1">实时监控消息处理流程、AI对话和系统状态</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsAlertRulesDialogOpen(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            告警规则设置
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadHealthData} 
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 子标签页 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14 bg-white/90 backdrop-blur-md border-2 border-slate-200/80 shadow-lg shadow-slate-200/50 rounded-2xl p-1.5 mb-6">
          <TabsTrigger
            value="overview"
            className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all duration-300"
            onClick={() => setActiveSubTab('overview')}
          >
            <BarChart3 className="h-5 w-5" />
            概览
          </TabsTrigger>
          <TabsTrigger
            value="alerts"
            className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all duration-300"
            onClick={() => setActiveSubTab('alerts')}
          >
            <Bell className="h-5 w-5" />
            告警列表
            {health?.alerts && health.alerts.pending > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {health.alerts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all duration-300"
            onClick={() => setActiveSubTab('stats')}
          >
            <Eye className="h-5 w-5" />
            统计分析
          </TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {health && (
            <>
              {/* 系统健康状态 */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      总执行数
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{health.executions.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      成功: {health.executions.success} | 失败: {health.executions.error}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">成功率</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{health.executions.successRate}%</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      处理中: {health.executions.processing}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">AI 调用</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{health.ai.total}</div>
                    <div className="text-xs text-muted-foreground">
                      成功率: {health.ai.successRate}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">活跃会话</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{health.sessions.active}</div>
                    <div className="text-xs text-muted-foreground">
                      最近1小时
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 告警通知 - 突出显示 */}
              {(health.alerts && health.alerts.pending > 0) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>告警通知</span>
                    <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                      {health.alerts.critical > 0 ? `${health.alerts.critical} 紧急` : `${health.alerts.pending} 待处理`}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    <div className="flex flex-wrap gap-4 mb-3">
                      <span className="text-sm">
                        <strong>紧急:</strong> {health.alerts.critical}
                      </span>
                      <span className="text-sm">
                        <strong>警告:</strong> {health.alerts.warning}
                      </span>
                      <span className="text-sm">
                        <strong>信息:</strong> {health.alerts.info}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setActiveSubTab('alerts')}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        查看告警详情
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => setIsAlertRulesDialogOpen(true)}
                        className="gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        配置告警规则
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* 告警统计 */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                      onClick={() => setActiveSubTab('alerts')}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">待处理告警</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {health.alerts?.pending || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      需要处理
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-red-500"
                      onClick={() => setActiveSubTab('alerts')}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">紧急告警</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {health.alerts?.critical || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      需要立即处理
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-yellow-500"
                      onClick={() => setActiveSubTab('alerts')}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">警告告警</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {health.alerts?.warning || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      需要关注
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-400"
                      onClick={() => setActiveSubTab('alerts')}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">信息告警</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-400">
                      {health.alerts?.info || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      仅供参考
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {!health && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>正在加载监控数据...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 告警列表标签页 */}
        <TabsContent value="alerts" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-semibold">告警列表</h4>
              <p className="text-sm text-muted-foreground">
                查看和管理所有告警信息
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/alerts/center'}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              告警中心详情
            </Button>
          </div>
          <MonitoringAlertCompact maxItems={20} showViewAll={true} />
        </TabsContent>

        {/* 统计分析标签页 */}
        <TabsContent value="stats" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-semibold">统计分析</h4>
              <p className="text-sm text-muted-foreground">
                查看告警趋势和统计数据
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/alerts/stats'}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              查看详细统计
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>请访问告警统计页面查看详细的图表分析</p>
              <Button 
                variant="outline" 
                className="mt-4 gap-2"
                onClick={() => window.location.href = '/alerts/stats'}
              >
                前往统计页面
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 告警规则设置对话框 */}
      <AlertRulesDialog 
        open={isAlertRulesDialogOpen}
        onOpenChange={setIsAlertRulesDialogOpen}
      />
    </div>
  );
}
