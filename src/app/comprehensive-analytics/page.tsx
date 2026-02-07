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
import { TrendChart, MiniBarChart } from '@/components/ui/chart';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Zap,
  Bot,
  Users,
  MessageSquare,
  Clock,
  RefreshCw,
  Shield,
  Database,
  Server,
  Cpu,
  MemoryStick,
  Wifi,
  Bell,
  FileText,
  Settings,
  Lightbulb,
  AlertCircle,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// 综合分析数据接口
interface ComprehensiveData {
  systemHealth: {
    overall: number; // 0-100
    components: {
      ai: number;
      collaboration: number;
      monitoring: number;
      alerts: number;
      database: number;
      api: number;
    };
    updatedAt: string;
  };
  performance: {
    bottlenecks: Array<{
      module: string;
      issue: string;
      severity: 'high' | 'medium' | 'low';
      impact: number;
      recommendation: string;
    }>;
    metrics: {
      avgResponseTime: number;
      throughput: number;
      errorRate: number;
      successRate: number;
    };
    trends: {
      requests: Array<{ time: string; value: number }>;
      responseTime: Array<{ time: string; value: number }>;
      errorRate: Array<{ time: string; value: number }>;
    };
  };
  alerts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    recent: Array<{
      id: string;
      level: string;
      message: string;
      time: string;
      status: string;
    }>;
  };
  ai: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    modelUsage: Array<{ model: string; count: number }>;
  };
  collaboration: {
    totalDecisions: number;
    aiReplyRate: number;
    staffReplyRate: number;
    collaborationRate: number;
    avgStaffResponseTime: number;
  };
}

export default function ComprehensiveAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ComprehensiveData | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/comprehensive-analytics?timeRange=${timeRange}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to load comprehensive data:', error);
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

  // 获取健康度颜色
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading && !data) {
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
            <BarChart3 className="h-8 w-8 text-blue-500" />
            综合分析
          </h1>
          <p className="text-muted-foreground mt-2">
            全系统健康度、性能瓶颈、数据趋势分析
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

      {/* 系统健康度 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            系统健康度
          </CardTitle>
          <CardDescription>
            整体评分: {data?.systemHealth.overall || 0}/100
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 总体健康度 */}
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-slate-200"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${data?.systemHealth.overall || 0}, 100`}
                    className={getHealthColor(data?.systemHealth.overall || 0)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-3xl font-bold ${getHealthColor(data?.systemHealth.overall || 0)}`}>
                    {data?.systemHealth.overall || 0}
                  </span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                {data?.systemHealth.components && Object.entries(data.systemHealth.components).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {key}
                      </span>
                      <span className={`font-semibold ${getHealthColor(value)}`}>
                        {value}/100
                      </span>
                    </div>
                    <Progress value={value} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 性能指标 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.performance.metrics.avgResponseTime || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              目标: &lt;500ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">吞吐量</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.performance.metrics.throughput || 0}/s
            </div>
            <p className="text-xs text-muted-foreground">
              请求/秒
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功率</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data?.performance.metrics.successRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              目标: &gt;99%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">错误率</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data?.performance.metrics.errorRate || 0).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              目标: &lt;1%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图表 */}
      <div className="grid gap-4 md:grid-cols-3">
        {data?.performance.trends.requests && (
          <TrendChart
            title="请求量趋势"
            data={data.performance.trends.requests}
            unit="次"
            color="#3b82f6"
            height={180}
          />
        )}
        {data?.performance.trends.responseTime && (
          <TrendChart
            title="响应时间趋势"
            data={data.performance.trends.responseTime}
            unit="ms"
            color="#10b981"
            height={180}
          />
        )}
        {data?.performance.trends.errorRate && (
          <TrendChart
            title="错误率趋势"
            data={data.performance.trends.errorRate}
            unit="%"
            color="#ef4444"
            height={180}
          />
        )}
      </div>

      {/* 详细分析 */}
      <Tabs defaultValue="bottlenecks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bottlenecks">
            <AlertTriangle className="h-4 w-4 mr-2" />
            性能瓶颈
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Zap className="h-4 w-4 mr-2" />
            AI 模块
          </TabsTrigger>
          <TabsTrigger value="collaboration">
            <Users className="h-4 w-4 mr-2" />
            协同分析
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="h-4 w-4 mr-2" />
            告警统计
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bottlenecks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>性能瓶颈分析</CardTitle>
              <CardDescription>
                识别系统中的性能问题和优化建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.performance.bottlenecks && data.performance.bottlenecks.length > 0 ? (
                <div className="space-y-3">
                  {data.performance.bottlenecks.map((bottleneck, index) => (
                    <Alert
                      key={index}
                      variant={
                        bottleneck.severity === 'high'
                          ? 'destructive'
                          : bottleneck.severity === 'medium'
                          ? 'default'
                          : 'default'
                      }
                    >
                      <AlertTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {bottleneck.module} - {bottleneck.issue}
                        <Badge
                          variant={
                            bottleneck.severity === 'high'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {bottleneck.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription className="mt-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium">影响程度: {bottleneck.impact}%</p>
                            <p className="text-sm mt-1">{bottleneck.recommendation}</p>
                          </div>
                          <Button size="sm" variant="outline">
                            <Lightbulb className="h-4 w-4 mr-1" />
                            查看详情
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>未发现明显的性能瓶颈</p>
                  <p className="text-sm mt-1">系统运行良好</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI 模块统计</CardTitle>
              <CardDescription>
                AI 调用统计和模型使用情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">总请求数</p>
                    <p className="text-2xl font-bold">
                      {data?.ai.totalRequests || 0}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">成功率</p>
                    <p className="text-2xl font-bold">
                      {((data?.ai.successRate || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">平均响应时间</p>
                    <p className="text-2xl font-bold">
                      {data?.ai.avgResponseTime || 0}ms
                    </p>
                  </div>
                </div>

                {data?.ai.modelUsage && data.ai.modelUsage.length > 0 && (
                  <MiniBarChart
                    title="模型使用分布"
                    data={data.ai.modelUsage.map(usage => ({
                      label: usage.model,
                      value: usage.count,
                    }))}
                    maxValue={data.ai.totalRequests}
                    color="#8b5cf6"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collaboration">
          <Card>
            <CardHeader>
              <CardTitle>协同分析统计</CardTitle>
              <CardDescription>
                AI 与工作人员的协同情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">总决策数</p>
                    <p className="text-2xl font-bold">
                      {data?.collaboration.totalDecisions || 0}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">AI 回复率</p>
                    <p className="text-2xl font-bold">
                      {((data?.collaboration.aiReplyRate || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">协同率</p>
                    <p className="text-2xl font-bold">
                      {((data?.collaboration.collaborationRate || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">工作人员回复率</span>
                      <span className="font-semibold">
                        {((data?.collaboration.staffReplyRate || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={(data?.collaboration.staffReplyRate || 0) * 100} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">平均响应时间</p>
                    <p className="text-2xl font-bold">
                      {data?.collaboration.avgStaffResponseTime || 0}s
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>告警统计</CardTitle>
              <CardDescription>
                告警数量和级别分布
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">总数</p>
                    <p className="text-2xl font-bold">
                      {data?.alerts.total || 0}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">严重</p>
                    <p className="text-2xl font-bold text-red-500">
                      {data?.alerts.critical || 0}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">警告</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {data?.alerts.warning || 0}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">信息</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {data?.alerts.info || 0}
                    </p>
                  </div>
                </div>

                {data?.alerts.recent && data.alerts.recent.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">最近告警</h4>
                    <div className="space-y-2">
                      {data.alerts.recent.slice(0, 5).map((alert) => (
                        <Alert key={alert.id} variant={alert.level === 'critical' ? 'destructive' : 'default'}>
                          <AlertTitle className="flex items-center gap-2 text-sm">
                            <Badge variant={alert.level === 'critical' ? 'destructive' : 'secondary'}>
                              {alert.level}
                            </Badge>
                            {alert.message}
                          </AlertTitle>
                          <AlertDescription className="text-xs mt-1">
                            {alert.time}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
