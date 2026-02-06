'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnimatedNumber } from '@/components/ui/animated-number';
import {
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp
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
    <Card className="shadow-md hover:shadow-lg transition-all duration-300 flex flex-col h-[420px] border-slate-200 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Token 消耗
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadTokenStats}
          disabled={isLoading}
          className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4 px-5 pb-5">
        {/* 今日总计卡片 */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-purple-100">今日累计</span>
            {growthRate !== 0 && (
              <div className={`flex items-center gap-1 text-xs ${growthRate > 0 ? 'text-white' : 'text-purple-100'}`}>
                {growthRate > 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span>{Math.abs(growthRate).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="text-4xl font-bold mb-1">
            <AnimatedNumber value={stats?.today.total ?? null} formatFn={formatNumber} />
          </div>
          <div className="text-xs text-purple-100">
            {stats?.today.record_count || 0} 次调用
          </div>
        </div>

        {/* 输入输出分布 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">输入 Token</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              <AnimatedNumber value={stats?.today.input ?? null} formatFn={formatNumber} />
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-100 dark:border-green-900/30">
            <div className="text-xs text-green-600 dark:text-green-400 mb-2">输出 Token</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              <AnimatedNumber value={stats?.today.output ?? null} formatFn={formatNumber} />
            </div>
          </div>
        </div>

        {/* 消耗统计 - 紧凑布局 */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-orange-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">今日</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                <AnimatedNumber value={stats?.today.total ?? null} formatFn={formatNumber} />
              </span>
            </div>
            <div className="flex flex-col p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-slate-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">昨日</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                <AnimatedNumber value={stats?.yesterday.total ?? null} formatFn={formatNumber} />
              </span>
            </div>
            <div className="flex flex-col p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-indigo-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">本月</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                <AnimatedNumber value={stats?.month.total ?? null} formatFn={formatNumber} />
              </span>
            </div>
            <div className="flex flex-col p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-slate-600 dark:text-slate-400">上月</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                <AnimatedNumber value={stats?.lastMonth.total ?? null} formatFn={formatNumber} />
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
