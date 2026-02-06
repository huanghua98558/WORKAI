'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
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
    record_count: number;
  };
  lastMonth: {
    total: number;
    record_count: number;
  };
}

export function TokenStatsCard() {
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    // 延长刷新间隔到60秒，减少页面刷新频率
    const interval = setInterval(loadTokenStats, 60000);
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
        <Button
          variant="ghost"
          size="sm"
          onClick={loadTokenStats}
          disabled={isLoading}
          className="h-7 w-7 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center space-y-4">
        {/* 今日累计 */}
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {stats ? formatNumber(stats.today.total) : '-'}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            今日累计 ({stats?.today.record_count || 0} 次调用)
          </div>
          {growthRate !== 0 && (
            <div className={`text-xs mt-2 flex items-center justify-center gap-1 ${growthRate > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {growthRate > 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(growthRate).toFixed(1)}% 较昨日
            </div>
          )}
        </div>

        {/* 输入输出分布 */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-muted-foreground mb-1">输入 Token</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {stats ? formatNumber(stats.today.input) : '-'}
            </div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-sm text-muted-foreground mb-1">输出 Token</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {stats ? formatNumber(stats.today.output) : '-'}
            </div>
          </div>
        </div>

        {/* 消耗统计 */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <span className="text-sm text-slate-600 dark:text-slate-400">今日消耗</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {stats ? formatNumber(stats.today.total) : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <span className="text-sm text-slate-600 dark:text-slate-400">昨日消耗</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {stats ? formatNumber(stats.yesterday.total) : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <span className="text-sm text-slate-600 dark:text-slate-400">本月消耗</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {stats ? formatNumber(stats.month.total) : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <span className="text-sm text-slate-600 dark:text-slate-400">上月消耗</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {stats ? formatNumber(stats.lastMonth.total) : '-'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
