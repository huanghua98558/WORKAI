'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Zap,
  RefreshCw,
  Activity,
  Database,
  Settings,
  Bell,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Lock,
  Unlock,
  Gauge,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  AlertCircle
} from 'lucide-react';

// 限制类型
type LimitType = 'api_rate_limit' | 'concurrent_sessions' | 'daily_message_quota' | 'ai_requests_per_day' | 'storage_quota' | 'database_connections';

// 限制严重程度
type Severity = 'critical' | 'warning' | 'normal';

// 限制配置接口
interface LimitConfig {
  id: string;
  name: string;
  type: LimitType;
  description: string;
  maxValue: number;
  currentValue: number;
  unit: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 限制统计接口
interface LimitStats {
  totalLimits: number;
  enabledLimits: number;
  criticalLimits: number;
  warningLimits: number;
  normalLimits: number;
  avgUtilization: number;
  maxUtilization: number;
}

// 限制预警接口
interface LimitAlert {
  id: string;
  limitId: string;
  limitName: string;
  severity: Severity;
  message: string;
  currentValue: number;
  maxValue: number;
  threshold: number;
  triggeredAt: string;
  acknowledged: boolean;
}

// 限制历史数据
interface LimitHistory {
  limitId: string;
  limitName: string;
  data: Array<{
    timestamp: string;
    value: number;
  }>;
}

export default function ConstraintAnalytics() {
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<LimitConfig[]>([]);
  const [stats, setStats] = useState<LimitStats | null>(null);
  const [alerts, setAlerts] = useState<LimitAlert[]>([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/constraint-analytics?timeRange=${timeRange}`);
      const result = await response.json();
      if (result.success) {
        setConfigs(result.data.configs || []);
        setStats(result.data.stats || null);
        setAlerts(result.data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to load constraint data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, 30000); // 30秒刷新
      return () => clearInterval(interval);
    }
  }, [autoRefresh, timeRange]);

  // 计算使用率
  const calculateUtilization = (current: number, max: number): number => {
    return max > 0 ? Math.round((current / max) * 100) : 0;
  };

  // 获取严重程度颜色
  const getSeverityColor = (utilization: number): string => {
    if (utilization >= 90) return 'text-red-500';
    if (utilization >= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getSeverityBg = (utilization: number): string => {
    if (utilization >= 90) return 'bg-red-500';
    if (utilization >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getSeverityBadge = (utilization: number): Severity => {
    if (utilization >= 90) return 'critical';
    if (utilization >= 75) return 'warning';
    return 'normal';
  };

  // 获取限制类型图标
  const getLimitTypeIcon = (type: LimitType) => {
    switch (type) {
      case 'api_rate_limit':
        return <Zap className="h-4 w-4" />;
      case 'concurrent_sessions':
        return <Activity className="h-4 w-4" />;
      case 'daily_message_quota':
        return <FileText className="h-4 w-4" />;
      case 'ai_requests_per_day':
        return <Target className="h-4 w-4" />;
      case 'storage_quota':
        return <Database className="h-4 w-4" />;
      case 'database_connections':
        return <Lock className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (loading && !configs.length) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-500" />
            限制分析
          </h1>
          <p className="text-muted-foreground mt-2">
            统一限制配置、使用率监控、预警和统计分析
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择时间范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">最近 1 小时</SelectItem>
              <SelectItem value="24h">最近 24 小时</SelectItem>
              <SelectItem value="7d">最近 7 天</SelectItem>
              <SelectItem value="30d">最近 30 天</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-primary/10 border-primary/30' : ''}
          >
            {autoRefresh ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-pulse" />
                自动刷新
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                手动刷新
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总限制数</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalLimits || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              已启用: {stats?.enabledLimits || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">严重限制</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats?.criticalLimits || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              使用率 &ge; 90%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">警告限制</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {stats?.warningLimits || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              使用率 &ge; 75%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均使用率</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.avgUtilization || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              最高: {(stats?.maxUtilization || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 详细分析 */}
      <Tabs defaultValue="limits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="limits">
            <Settings className="h-4 w-4 mr-2" />
            限制配置
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            <Activity className="h-4 w-4 mr-2" />
            使用率监控
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="h-4 w-4 mr-2" />
            预警中心
          </TabsTrigger>
        </TabsList>

        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>限制配置列表</CardTitle>
              <CardDescription>
                所有系统限制的配置和当前状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {configs.map((config) => {
                  const utilization = calculateUtilization(config.currentValue, config.maxValue);
                  const severity = getSeverityBadge(utilization);

                  return (
                    <div key={config.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${utilization >= 90 ? 'bg-red-100' : utilization >= 75 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                            {getLimitTypeIcon(config.type)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{config.name}</h4>
                              <Badge variant={config.enabled ? 'default' : 'secondary'}>
                                {config.enabled ? '已启用' : '已禁用'}
                              </Badge>
                              <Badge
                                variant={
                                  severity === 'critical'
                                    ? 'destructive'
                                    : severity === 'warning'
                                    ? 'secondary'
                                    : 'default'
                                }
                              >
                                {severity === 'critical' ? '严重' : severity === 'warning' ? '警告' : '正常'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {config.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {config.currentValue}
                            <span className="text-sm text-muted-foreground">/{config.maxValue}</span>
                            <span className="text-sm text-muted-foreground ml-1">{config.unit}</span>
                          </p>
                          <p className={`text-sm font-medium ${getSeverityColor(utilization)}`}>
                            {utilization}% 使用率
                          </p>
                        </div>
                      </div>

                      <Progress value={utilization} className="h-2" />

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>创建时间: {new Date(config.createdAt).toLocaleString()}</span>
                        <span>更新时间: {new Date(config.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle>使用率监控</CardTitle>
              <CardDescription>
                实时监控所有限制的使用情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {configs.map((config) => {
                  const utilization = calculateUtilization(config.currentValue, config.maxValue);

                  return (
                    <div key={config.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {getLimitTypeIcon(config.type)}
                          <span className="font-medium">{config.name}</span>
                          <Badge
                            variant={
                              utilization >= 90
                                ? 'destructive'
                                : utilization >= 75
                                ? 'secondary'
                                : 'default'
                            }
                          >
                            {utilization}%
                          </Badge>
                        </div>
                        <span className="text-muted-foreground">
                          {config.currentValue} / {config.maxValue} {config.unit}
                        </span>
                      </div>
                      <Progress value={utilization} className="h-3" />
                      {utilization >= 75 && (
                        <Alert variant={utilization >= 90 ? 'destructive' : 'default'}>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle className="text-sm">
                            {utilization >= 90 ? '严重警告' : '警告'}
                          </AlertTitle>
                          <AlertDescription className="text-sm">
                            {config.name} 使用率已达到 {utilization}%，建议检查并优化
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>预警中心</CardTitle>
              <CardDescription>
                限制触发的预警通知和历史记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <Alert
                      key={alert.id}
                      variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                      className={alert.acknowledged ? 'opacity-60' : ''}
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="flex items-center gap-2">
                        {alert.limitName}
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {alert.severity === 'critical' ? '严重' : '警告'}
                        </Badge>
                        {alert.acknowledged && (
                          <Badge variant="outline">已确认</Badge>
                        )}
                      </AlertTitle>
                      <AlertDescription className="mt-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm">{alert.message}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>当前值: {alert.currentValue}</span>
                              <span>最大值: {alert.maxValue}</span>
                              <span>阈值: {alert.threshold}%</span>
                              <span>触发时间: {new Date(alert.triggeredAt).toLocaleString()}</span>
                            </div>
                          </div>
                          {!alert.acknowledged && (
                            <Button size="sm" variant="outline">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              确认
                            </Button>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>暂无预警信息</p>
                  <p className="text-sm mt-1">所有限制均在正常范围内</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
