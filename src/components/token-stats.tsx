'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  BarChart3
} from 'lucide-react';

interface TokenStats {
  today: {
    total: number;
    input: number;
    output: number;
    record_count: number;
  };
  yesterday: {
    total: number;
  };
  month: {
    total: number;
    input: number;
    output: number;
    record_count: number;
  };
  robot_stats: Array<{
    robotId: string;
    robotName: string;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    count: number;
  }>;
}

export function TokenStatsCard() {
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  const loadTokenStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/monitoring/token-stats?timestamp=' + Date.now(), {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 0) {
          setStats(data.data);
          setLastUpdateTime(new Date());
        }
      }
    } catch (error) {
      console.error('加载Token统计失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTokenStats();
    const interval = setInterval(loadTokenStats, 30000); // 每30秒刷新
    return () => clearInterval(interval);
  }, []);

  // 计算增长率
  const getGrowthRate = () => {
    if (!stats || stats.yesterday.total === 0) return 0;
    return ((stats.today.total - stats.yesterday.total) / stats.yesterday.total * 100);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const growthRate = getGrowthRate();

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col h-[420px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Token 消耗
        </CardTitle>
        <div className="flex items-center gap-2">
          {stats && growthRate !== 0 && (
            <Badge
              variant="outline"
              className={`gap-1 ${growthRate > 0 ? 'text-red-600 border-red-600' : 'text-green-600 border-green-600'}`}
            >
              {growthRate > 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(growthRate).toFixed(1)}%
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={loadTokenStats}
            disabled={isLoading}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {/* 今日Token总数 */}
        <div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats ? formatNumber(stats.today.total) : '-'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            今日累计 ({stats?.today.record_count || 0} 次调用)
          </div>
        </div>

        {/* 今日输入输出分布 */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div>
            <div className="text-xs text-muted-foreground mb-1">输入 Token</div>
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {stats ? formatNumber(stats.today.input) : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">输出 Token</div>
            <div className="text-sm font-semibold text-green-600 dark:text-green-400">
              {stats ? formatNumber(stats.today.output) : '-'}
            </div>
          </div>
        </div>

        {/* 本月统计 */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-3 w-3 text-indigo-500" />
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">本月统计</div>
          </div>
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {stats ? formatNumber(stats.month.total) : '-'}
          </div>
          <div className="text-xs text-muted-foreground">
            {stats?.month.record_count || 0} 次调用
          </div>
        </div>

        {/* 机器人消耗排名 */}
        <div className="pt-2 border-t flex-1 overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-3 w-3 text-orange-500" />
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Top 机器人</div>
          </div>
          <div className="space-y-1.5 overflow-y-auto max-h-[100px]">
            {stats?.robot_stats && stats.robot_stats.length > 0 ? (
              stats.robot_stats.slice(0, 5).map((robot, index) => (
                <div
                  key={robot.robotId}
                  className="flex items-center justify-between text-xs p-1.5 bg-slate-50 dark:bg-slate-800 rounded"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-bold w-4 text-center">{index + 1}</span>
                    <span className="truncate text-slate-700 dark:text-slate-300">
                      {robot.robotName}
                    </span>
                  </div>
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {formatNumber(robot.totalTokens)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-2">
                暂无数据
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
