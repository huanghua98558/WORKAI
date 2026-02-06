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
  Calendar
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
    const interval = setInterval(loadTokenStats, 60000);
    return () => clearInterval(interval);
  }, []);

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
    <Card className="shadow-md hover:shadow-lg transition-all duration-300 h-[420px] border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2.5 px-4">
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
      <CardContent className="px-4 pb-4 flex-1 flex flex-col gap-2.5">
        {/* 今日累计 + 增长率（紧凑） */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg p-2.5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-purple-100 font-medium">今日累计</span>
            {growthRate !== 0 && (
              <div className={`flex items-center gap-0.5 text-[11px] ${growthRate > 0 ? 'text-white' : 'text-purple-100'}`}>
                {growthRate > 0 ? (
                  <ArrowUpRight className="h-2.5 w-2.5" />
                ) : (
                  <ArrowDownRight className="h-2.5 w-2.5" />
                )}
                <span>{Math.abs(growthRate).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="text-2xl font-bold leading-tight mt-0.5">
            <AnimatedNumber value={stats?.today.total ?? null} formatFn={formatNumber} />
          </div>
        </div>

        {/* 输入输出（横向紧凑） */}
        <div className="flex gap-2">
          <div className="flex-1 bg-blue-50 dark:bg-blue-950/20 rounded-lg p-2 border border-blue-100 dark:border-blue-900/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">输入</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400 leading-tight">
                <AnimatedNumber value={stats?.today.input ?? null} formatFn={formatNumber} />
              </span>
            </div>
          </div>
          <div className="flex-1 bg-green-50 dark:bg-green-950/20 rounded-lg p-2 border border-green-100 dark:border-green-900/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">输出</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400 leading-tight">
                <AnimatedNumber value={stats?.today.output ?? null} formatFn={formatNumber} />
              </span>
            </div>
          </div>
        </div>

        {/* 消耗统计 - 2x2卡片 */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700 flex flex-col">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">今日</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              <AnimatedNumber value={stats?.today.total ?? null} formatFn={formatNumber} />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {stats?.today.record_count || 0} 次调用
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700 flex flex-col">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">昨日</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              <AnimatedNumber value={stats?.yesterday.total ?? null} formatFn={formatNumber} />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ---
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700 flex flex-col">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">本月</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              <AnimatedNumber value={stats?.month.total ?? null} formatFn={formatNumber} />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {stats?.month.record_count || 0} 次调用
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700 flex flex-col">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">上月</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              <AnimatedNumber value={stats?.lastMonth.total ?? null} formatFn={formatNumber} />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {stats?.lastMonth.record_count || 0} 次调用
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
