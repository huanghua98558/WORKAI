'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

interface CallbackStatsData {
  timeRange: string;
  total: {
    totalCount: number;
    totalSuccess: number;
    totalError: number;
    errorRate: string;
    avgResponseTime: string;
  };
  stats: Array<{
    type: string;
    typeName: string;
    count: number;
    successCount: number;
    errorCount: number;
    errorRate: string;
    avgResponseTime: string;
  }>;
  trend: Array<{
    date: string;
    hour: number;
    count: number;
    errorCount: number;
  }>;
}

interface CallbackMonitorPanelProps {
  robotId: string;
}

export function CallbackMonitorPanel({ robotId }: CallbackMonitorPanelProps) {
  const [stats, setStats] = useState<CallbackStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');

  // 获取后端 URL
  const getBackendUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin.replace(':5000', ':5001');
    }
    return 'http://localhost:5001';
  };

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${getBackendUrl()}/api/robots/${robotId}/callback-stats?timeRange=${timeRange}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('获取统计数据失败');
      }

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(data.message || '获取统计数据失败');
      }

      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      console.error('获取回调统计数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [robotId, timeRange]);

  // 获取时间范围文本
  const getTimeRangeText = () => {
    const map = {
      '1h': '最近1小时',
      '24h': '最近24小时',
      '7d': '最近7天',
      '30d': '最近30天'
    };
    return map[timeRange as keyof typeof map] || timeRange;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>回调监控</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>回调监控</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-destructive">{error}</div>
            <Button onClick={fetchStats}>重试</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>回调监控</CardTitle>
              <CardDescription>实时监控 WorkTool 回调数据</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">最近1小时</SelectItem>
                  <SelectItem value="24h">最近24小时</SelectItem>
                  <SelectItem value="7d">最近7天</SelectItem>
                  <SelectItem value="30d">最近30天</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchStats} variant="outline" size="icon">
                <Activity className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            统计时间: {getTimeRangeText()}
          </div>

          {/* 总体统计 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">总回调数</p>
                    <p className="text-2xl font-bold">{stats.total.totalCount}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">成功数</p>
                    <p className="text-2xl font-bold text-green-600">{stats.total.totalSuccess}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">失败数</p>
                    <p className="text-2xl font-bold text-red-600">{stats.total.totalError}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">平均响应时间</p>
                    <p className="text-2xl font-bold">{stats.total.avgResponseTime}ms</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 错误率 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">整体错误率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold">
                  {stats.total.errorRate}%
                </div>
                <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      parseFloat(stats.total.errorRate) > 5
                        ? 'bg-red-500'
                        : parseFloat(stats.total.errorRate) > 1
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${stats.total.errorRate}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 分类统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">分类统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.stats.map((stat) => (
                  <div key={stat.type} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stat.typeName}</span>
                      <span className="text-muted-foreground">
                        {stat.count} 次 ({stat.successCount} 成功 / {stat.errorCount} 失败)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${stat.count > 0 ? (stat.successCount / stat.count) * 100 : 0}%`
                          }}
                        />
                      </div>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{
                            width: `${stat.count > 0 ? (stat.errorCount / stat.count) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>成功率: {stat.count > 0 ? ((stat.successCount / stat.count) * 100).toFixed(2) : 0}%</span>
                      <span>错误率: {stat.errorRate}%</span>
                      <span>平均响应: {stat.avgResponseTime}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 趋势数据 */}
          {stats.trend.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">回调趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.trend.slice(-10).map((item, index) => (
                    <div key={`${item.date}-${item.hour}`} className="flex items-center gap-4 text-sm">
                      <div className="w-32 text-muted-foreground">
                        {item.date} {String(item.hour).padStart(2, '0')}:00
                      </div>
                      <div className="flex-1 h-6 bg-gray-200 rounded overflow-hidden flex">
                        <div
                          className="bg-blue-500 h-full flex items-center justify-end pr-2"
                          style={{
                            width: `${Math.max((item.count / Math.max(...stats.trend.map(t => t.count))) * 100, 5)}%`
                          }}
                        >
                          <span className="text-xs text-white font-medium">
                            {item.count}
                          </span>
                        </div>
                        {item.errorCount > 0 && (
                          <div
                            className="bg-red-500 h-full flex items-center justify-end pr-2"
                            style={{
                              width: `${Math.max((item.errorCount / Math.max(...stats.trend.map(t => t.count))) * 100, 2)}%`
                            }}
                          >
                            <span className="text-xs text-white font-medium">
                              {item.errorCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
