'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Bell, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface AlertStats {
  total: number;
  pending: number;
  critical: number;
  warning: number;
  info: number;
  trends?: Array<{ date: string; count: number }>;
}

export default function AlertStatsPage() {
  const [stats, setStats] = useState<AlertStats>({
    total: 0,
    pending: 0,
    critical: 0,
    warning: 0,
    info: 0,
    trends: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // 加载统计数据
  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/alerts/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">告警统计</h1>
        <p className="text-gray-600">查看告警趋势和统计分析</p>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>总告警数</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-500">所有告警</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>待处理</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.pending}</CardTitle>
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
            <CardTitle className="text-3xl text-red-600">{stats.critical}</CardTitle>
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
            <CardTitle className="text-3xl text-yellow-600">{stats.warning}</CardTitle>
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
            <CardTitle className="text-3xl text-gray-600">{stats.info}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-gray-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              一般提示
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图表 */}
      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">告警趋势</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                告警趋势（最近7天）
              </CardTitle>
              <CardDescription>每日告警数量变化</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.trends && stats.trends.length > 0 ? (
                <div className="h-64 flex items-end gap-2">
                  {stats.trends.map((trend, index) => {
                    const maxCount = Math.max(...stats.trends!.map(t => t.count));
                    const height = maxCount > 0 ? (trend.count / maxCount) * 100 : 0;

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="text-xs mb-1">{trend.count}</div>
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                        <div className="text-xs mt-2 text-gray-500">
                          {trend.date.split('-').slice(1).join('/')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  暂无趋势数据
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 告警级别分布 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>告警级别分布</CardTitle>
          <CardDescription>不同级别告警的数量占比</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>紧急</span>
                <span>{stats.critical} ({stats.total > 0 ? ((stats.critical / stats.total) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: stats.total > 0 ? `${(stats.critical / stats.total) * 100}%` : '0%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>警告</span>
                <span>{stats.warning} ({stats.total > 0 ? ((stats.warning / stats.total) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: stats.total > 0 ? `${(stats.warning / stats.total) * 100}%` : '0%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>信息</span>
                <span>{stats.info} ({stats.total > 0 ? ((stats.info / stats.total) * 100).toFixed(1) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gray-500 h-2 rounded-full"
                  style={{ width: stats.total > 0 ? `${(stats.info / stats.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
