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
  ArrowDownRight
} from 'lucide-react';

interface TokenStats {
  today_total: number;
  today_input: number;
  today_output: number;
  yesterday_total: number;
  record_count: number;
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
    if (!stats || stats.yesterday_total === 0) return 0;
    return ((stats.today_total - stats.yesterday_total) / stats.yesterday_total * 100);
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
    <Card>
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
      <CardContent>
        <div className="space-y-3">
          {/* 总Token数 */}
          <div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats ? formatNumber(stats.today_total) : '-'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              今日累计 ({stats?.record_count || 0} 次调用)
            </div>
          </div>

          {/* Token分布 */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div>
              <div className="text-xs text-muted-foreground mb-1">输入 Token</div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {stats ? formatNumber(stats.today_input) : '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">输出 Token</div>
              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                {stats ? formatNumber(stats.today_output) : '-'}
              </div>
            </div>
          </div>

          {/* 对比昨日 */}
          {stats && stats.yesterday_total > 0 && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                昨日总计: {formatNumber(stats.yesterday_total)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
