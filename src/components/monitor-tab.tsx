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
  const [healthError, setHealthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [isAlertRulesDialogOpen, setIsAlertRulesDialogOpen] = useState(false);

  // 加载健康状态和告警数据
  const loadHealthData = async () => {
    setIsLoading(true);
    setHealthError(null);
    try {
      // 获取健康状态
      const healthRes = await fetch('/api/monitoring/health');
      if (healthRes.ok) {
        const data = await healthRes.json();
        // 兼容两种返回格式：{ code: 0, data: {...} } 或 { success: true, data: {...} }
        if (data.code === 0 || data.success === true) {
          const healthData = data.data || data;
          
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
              // 兼容两种返回格式
              if (alertData.success === true || alertData.code === 0) {
                const alertStats = alertData.data || alertData;
                healthData.alerts = {
                  total: parseInt(alertStats.total) || 0,
                  pending: parseInt(alertStats.pending) || 0,
                  critical: parseInt(alertStats.critical) || 0,
                  warning: parseInt(alertStats.warning) || 0,
                  info: parseInt(alertStats.info) || 0
                };
              }
            }
          } catch (alertError) {
            console.warn('获取告警统计失败，使用默认值:', alertError);
            // 不影响健康状态的显示
          }
          setHealth(healthData);
          console.log('[MonitorTab] 健康数据加载成功:', healthData);
        } else {
          console.error('[MonitorTab] 健康状态API返回错误:', data);
          setHealthError(data.message || '加载健康状态失败');
          // 即使API返回错误，也设置一个默认的健康状态，避免一直显示加载中
          setHealth({
            executions: { total: 0, success: 0, error: 0, processing: 0, successRate: '0%' },
            ai: { total: 0, success: 0, error: 0, successRate: '0%' },
            sessions: { active: 0 },
            timestamp: new Date().toISOString()
          });
        }
      } else {
        console.error('[MonitorTab] 健康状态API请求失败:', healthRes.status);
        setHealthError(`请求失败 (${healthRes.status})`);
        // 设置默认健康状态
        setHealth({
          executions: { total: 0, success: 0, error: 0, processing: 0, successRate: '0%' },
          ai: { total: 0, success: 0, error: 0, successRate: '0%' },
          sessions: { active: 0 },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('加载健康状态失败:', error);
      setHealthError('网络请求失败');
      // 设置默认健康状态，避免一直显示加载中
      setHealth({
        executions: { total: 0, success: 0, error: 0, processing: 0, successRate: '0%' },
        ai: { total: 0, success: 0, error: 0, successRate: '0%' },
        sessions: { active: 0 },
        timestamp: new Date().toISOString()
      });
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
            onClick={() => loadHealthData()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? '刷新中...' : '刷新'}
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {healthError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>监控数据加载失败</AlertTitle>
          <AlertDescription>
            {healthError}。请检查后端服务是否正常运行，或稍后重试。
          </AlertDescription>
        </Alert>
      )}

      {/* 子标签页 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14 bg-white/90 backdrop-blur-md border-2 border-slate-200/80 shadow-lg shadow-slate-200/50 rounded-2xl p-1.5 mb-6">
          <TabsTrigger
            value="overview"
            className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300"
            onClick={() => setActiveSubTab('overview')}
          >
            <BarChart3 className="h-5 w-5" />
            概览
          </TabsTrigger>
          <TabsTrigger
            value="alerts"
            className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300"
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
            className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300"
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
        <TabsContent value="stats" className="space-y-6 mt-6">
          <div className="mb-2">
            <h4 className="text-lg font-semibold">统计分析</h4>
            <p className="text-sm text-muted-foreground">
              查看告警趋势和统计数据
            </p>
          </div>

          {/* 统计概览 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>总告警数</CardDescription>
                <CardTitle className="text-3xl">{health?.alerts?.total || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-gray-500">所有告警</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>待处理</CardDescription>
                <CardTitle className="text-3xl text-blue-600">{health?.alerts?.pending || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  需要处理
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>紧急告警</CardDescription>
                <CardTitle className="text-3xl text-red-600">{health?.alerts?.critical || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-gray-500">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  需要立即处理
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>警告</CardDescription>
                <CardTitle className="text-3xl text-yellow-600">{health?.alerts?.warning || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-gray-500">
                  <Bell className="h-3 w-3 mr-1" />
                  需要关注
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>信息</CardDescription>
                <CardTitle className="text-3xl text-gray-600">{health?.alerts?.info || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-gray-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  一般提示
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 告警级别分布 */}
          <Card>
            <CardHeader>
              <CardTitle>告警级别分布</CardTitle>
              <CardDescription>不同级别告警的数量占比</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>紧急</span>
                    <span>{health?.alerts?.critical || 0} ({health?.alerts?.total && health.alerts.total > 0 ? ((health.alerts.critical / health.alerts.total) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{ width: health?.alerts?.total && health.alerts.total > 0 ? `${(health.alerts.critical / health.alerts.total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>警告</span>
                    <span>{health?.alerts?.warning || 0} ({health?.alerts?.total && health.alerts.total > 0 ? ((health.alerts.warning / health.alerts.total) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all"
                      style={{ width: health?.alerts?.total && health.alerts.total > 0 ? `${(health.alerts.warning / health.alerts.total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>信息</span>
                    <span>{health?.alerts?.info || 0} ({health?.alerts?.total && health.alerts.total > 0 ? ((health.alerts.info / health.alerts.total) * 100).toFixed(1) : 0}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-500 h-2 rounded-full transition-all"
                      style={{ width: health?.alerts?.total && health.alerts.total > 0 ? `${(health.alerts.info / health.alerts.total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>
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
