/**
 * AI服务实时监控面板
 * 展示AI服务的实时调用情况、性能指标和成本统计
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Zap,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  PieChart,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

interface MonitoringStats {
  totalCalls: number;
  totalTokens: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
  totalCost: number;
  avgResponseTime: number;
  successRate: number;
  errorCount: number;
  successCount?: number;
}

interface ProtectionStats {
  rateLimit: Record<string, any>;
  circuitBreaker: Record<string, any>;
}

interface ModelRanking {
  modelId: string;
  modelName: string;
  providerName: string;
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
}

export default function AIMonitoringDashboard() {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [protection, setProtection] = useState<ProtectionStats | null>(null);
  const [ranking, setRanking] = useState<ModelRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMonitoringData();
    let interval: NodeJS.Timeout;

    if (autoRefresh) {
      interval = setInterval(loadMonitoringData, 5000); // 每5秒刷新
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadMonitoringData = async () => {
    try {
      const [statsRes, protectionRes, rankingRes] = await Promise.all([
        fetch('/api/proxy/ai/usage/stats'),
        fetch('/api/proxy/ai/protection/stats'),
        fetch('/api/proxy/ai/usage/ranking')
      ]);

      const [statsData, protectionData, rankingData] = await Promise.all([
        statsRes.json(),
        protectionRes.json(),
        rankingRes.json()
      ]);

      if (statsData.success) {
        setStats(statsData.data.stats);
      }

      if (protectionData.success) {
        setProtection(protectionData.data);
      }

      if (rankingData.success) {
        setRanking(rankingData.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('加载监控数据失败:', error);
      if (!autoRefresh) {
        toast.error('加载监控数据失败');
      }
      setLoading(false);
    }
  };

  const formatCost = (cost: number) => {
    return `¥${cost.toFixed(4)}`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            AI 服务监控
          </h2>
          <p className="text-muted-foreground mt-2">
            实时监控AI服务调用情况、性能指标和成本
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? '自动刷新' : '手动刷新'}
          </Button>
          <Button variant="outline" onClick={loadMonitoringData}>
            立即刷新
          </Button>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总调用次数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCalls || 0}</div>
            <p className="text-xs text-muted-foreground">
              成功率: {stats?.successRate ? stats.successRate.toFixed(1) : '0.0'}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总Token使用</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.totalTokens || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              平均响应: {formatTime(stats?.avgResponseTime || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总成本</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(stats?.totalCost || 0)}</div>
            <p className="text-xs text-muted-foreground">
              错误数: {stats?.errorCount || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">系统状态</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats?.successRate && stats.successRate > 95 ? '正常' : stats?.successRate && stats.successRate > 80 ? '警告' : '异常'}
            </div>
            <p className="text-xs text-muted-foreground">
              基于成功率判断
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 模型使用排名 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              模型使用排名
            </CardTitle>
            <CardDescription>按调用次数排序</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ranking.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  暂无使用记录
                </p>
              ) : (
                ranking.slice(0, 5).map((model, index) => (
                  <div key={model.modelId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{model.modelName}</div>
                        <div className="text-sm text-muted-foreground">{model.providerName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{model.totalCalls.toLocaleString()} 次</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCost(model.totalCost)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 保护机制状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              保护机制状态
            </CardTitle>
            <CardDescription>限流和熔断器状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 限流状态 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">限流器</span>
                  <span className={`text-xs ${protection?.rateLimit ? 'text-green-500' : 'text-gray-500'}`}>
                    {Object.keys(protection?.rateLimit || {}).length > 0 ? '活跃' : '无记录'}
                  </span>
                </div>
                {Object.entries(protection?.rateLimit || {}).map(([key, value]: [string, any]) => (
                  <div key={key} className="text-sm bg-muted/50 p-2 rounded mt-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{key}</span>
                      <span>{value.remaining}/{value.limit || 60} 次剩余</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 熔断器状态 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">熔断器</span>
                  <span className={`text-xs ${protection?.circuitBreaker ? 'text-orange-500' : 'text-gray-500'}`}>
                    {Object.values(protection?.circuitBreaker || {}).some((cb: any) => cb.isOpen)
                      ? '触发'
                      : '正常'}
                  </span>
                </div>
                {Object.entries(protection?.circuitBreaker || {}).map(([key, value]: [string, any]) => (
                  <div key={key} className="text-sm bg-muted/50 p-2 rounded mt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{key}</span>
                      <span className={value.isOpen ? 'text-red-500' : 'text-green-500'}>
                        {value.isOpen ? '已开启' : '正常'}
                      </span>
                    </div>
                    {value.isOpen && (
                      <div className="text-xs text-muted-foreground mt-1">
                        失败次数: {value.failureCount}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 性能指标详情 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            性能指标详情
          </CardTitle>
          <CardDescription>详细的性能和成本分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">输入Token</span>
                <span className="font-medium">{(stats?.totalInputTokens || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">输出Token</span>
                <span className="font-medium">{(stats?.totalOutputTokens || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">平均响应时间</span>
                <span className="font-medium">{formatTime(stats?.avgResponseTime || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">成功率</span>
                <span className={`font-medium ${stats?.successRate && stats.successRate > 95 ? 'text-green-500' : stats?.successRate && stats.successRate > 80 ? 'text-orange-500' : 'text-red-500'}`}>
                  {stats?.successRate ? stats.successRate.toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">成功调用</span>
                <span className="font-medium text-green-500">{stats?.successCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">失败调用</span>
                <span className="font-medium text-red-500">{stats?.errorCount || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 实时状态提示 */}
      {autoRefresh && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>数据每5秒自动刷新</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
