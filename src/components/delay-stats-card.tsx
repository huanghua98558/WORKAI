/**
 * 延迟统计展示组件
 * 用于在监控页面展示响应时间和延迟统计
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DelayStats {
  averageResponseTime: number; // 平均响应时间（毫秒）
  minResponseTime: number; // 最小响应时间
  maxResponseTime: number; // 最大响应时间
  p50ResponseTime: number; // P50 响应时间
  p90ResponseTime: number; // P90 响应时间
  p95ResponseTime: number; // P95 响应时间
  p99ResponseTime: number; // P99 响应时间
  delayDistribution: {
    fast: number; // < 1秒
    normal: number; // 1-3秒
    slow: number; // 3-10秒
    verySlow: number; // > 10秒
  };
  priorityDelayStats: {
    P0: number; // 紧急平均延迟
    P1: number; // 高优先级平均延迟
    P2: number; // 中优先级平均延迟
    P3: number; // 低优先级平均延迟
  };
  totalRequests: number;
}

interface DelayStatsCardProps {
  stats?: Partial<DelayStats>;
  className?: string;
}

const DEFAULT_STATS: DelayStats = {
  averageResponseTime: 0,
  minResponseTime: 0,
  maxResponseTime: 0,
  p50ResponseTime: 0,
  p90ResponseTime: 0,
  p95ResponseTime: 0,
  p99ResponseTime: 0,
  delayDistribution: {
    fast: 0,
    normal: 0,
    slow: 0,
    verySlow: 0,
  },
  priorityDelayStats: {
    P0: 0,
    P1: 0,
    P2: 0,
    P3: 0,
  },
  totalRequests: 0,
};

export function DelayStatsCard({ stats = DEFAULT_STATS, className }: DelayStatsCardProps) {
  // 计算百分比
  const fastPercentage = stats.totalRequests > 0 ? ((stats.delayDistribution.fast / stats.totalRequests) * 100).toFixed(1) : '0';
  const normalPercentage = stats.totalRequests > 0 ? ((stats.delayDistribution.normal / stats.totalRequests) * 100).toFixed(1) : '0';
  const slowPercentage = stats.totalRequests > 0 ? ((stats.delayDistribution.slow / stats.totalRequests) * 100).toFixed(1) : '0';
  const verySlowPercentage = stats.totalRequests > 0 ? ((stats.delayDistribution.verySlow / stats.totalRequests) * 100).toFixed(1) : '0';

  // 延迟评级
  const getDelayRating = (time: number) => {
    if (time < 1000) return { label: '优秀', color: 'text-green-600', bg: 'bg-green-50' };
    if (time < 3000) return { label: '良好', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (time < 5000) return { label: '一般', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { label: '较慢', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const avgRating = getDelayRating(stats.averageResponseTime);
  const p90Rating = getDelayRating(stats.p90ResponseTime);
  const p99Rating = getDelayRating(stats.p99ResponseTime);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-5 w-5 text-blue-500" />
          响应延迟统计
        </CardTitle>
        <CardDescription>消息响应时间分布和统计</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 核心指标 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">平均响应时间</span>
              <Badge className={`${avgRating.bg} ${avgRating.color} border-0`}>
                {avgRating.label}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {stats.averageResponseTime}ms
            </div>
          </div>

          <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">P90 响应时间</span>
              <Badge className={`${p90Rating.bg} ${p90Rating.color} border-0`}>
                {p90Rating.label}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-purple-700">
              {stats.p90ResponseTime}ms
            </div>
          </div>
        </div>

        {/* 百分位统计 */}
        <div className="space-y-3 pt-3 border-t">
          <div className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            百分位统计
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">P50（中位数）</span>
              <span className="font-medium">{stats.p50ResponseTime}ms</span>
            </div>
            <Progress value={Math.min((stats.p50ResponseTime / 10000) * 100, 100)} className="h-1.5" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">P90（90%请求）</span>
              <span className="font-medium">{stats.p90ResponseTime}ms</span>
            </div>
            <Progress value={Math.min((stats.p90ResponseTime / 10000) * 100, 100)} className="h-1.5" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">P95（95%请求）</span>
              <span className="font-medium">{stats.p95ResponseTime}ms</span>
            </div>
            <Progress value={Math.min((stats.p95ResponseTime / 10000) * 100, 100)} className="h-1.5" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">P99（99%请求）</span>
              <span className="font-medium">{stats.p99ResponseTime}ms</span>
            </div>
            <Progress value={Math.min((stats.p99ResponseTime / 10000) * 100, 100)} className="h-1.5" />
          </div>
        </div>

        {/* 延迟分布 */}
        <div className="space-y-3 pt-3 border-t">
          <div className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            延迟分布
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                快速 (&lt;1s)
              </span>
              <Badge variant="outline" className="text-green-600 border-green-300">
                {stats.delayDistribution.fast} ({fastPercentage}%)
              </Badge>
            </div>
            <Progress value={parseFloat(fastPercentage)} className="h-2" />

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                正常 (1-3s)
              </span>
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                {stats.delayDistribution.normal} ({normalPercentage}%)
              </Badge>
            </div>
            <Progress value={parseFloat(normalPercentage)} className="h-2" />

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                较慢 (3-10s)
              </span>
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                {stats.delayDistribution.slow} ({slowPercentage}%)
              </Badge>
            </div>
            <Progress value={parseFloat(slowPercentage)} className="h-2" />

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-500" />
                很慢 (&gt;10s)
              </span>
              <Badge variant="outline" className="text-red-600 border-red-300">
                {stats.delayDistribution.verySlow} ({verySlowPercentage}%)
              </Badge>
            </div>
            <Progress value={parseFloat(verySlowPercentage)} className="h-2" />
          </div>
        </div>

        {/* 按优先级统计 */}
        <div className="space-y-3 pt-3 border-t">
          <div className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            按优先级平均延迟
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 rounded bg-red-50">
              <span className="text-sm font-medium text-red-700">P0（紧急）</span>
              <span className="text-sm font-bold text-red-600">{stats.priorityDelayStats.P0}ms</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-orange-50">
              <span className="text-sm font-medium text-orange-700">P1（高）</span>
              <span className="text-sm font-bold text-orange-600">{stats.priorityDelayStats.P1}ms</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-yellow-50">
              <span className="text-sm font-medium text-yellow-700">P2（中）</span>
              <span className="text-sm font-bold text-yellow-600">{stats.priorityDelayStats.P2}ms</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-gray-50">
              <span className="text-sm font-medium text-gray-700">P3（低）</span>
              <span className="text-sm font-bold text-gray-600">{stats.priorityDelayStats.P3}ms</span>
            </div>
          </div>
        </div>

        {/* 范围统计 */}
        <div className="flex items-center justify-between pt-3 border-t text-sm">
          <span className="text-muted-foreground">最小 / 最大</span>
          <span className="font-medium">
            {stats.minResponseTime}ms / {stats.maxResponseTime}ms
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 延迟徽章组件
 */
interface DelayBadgeProps {
  delay: number; // 延迟时间（毫秒）
  className?: string;
}

export function DelayBadge({ delay, className }: DelayBadgeProps) {
  const getDelayConfig = () => {
    if (delay < 1000) {
      return {
        icon: CheckCircle,
        label: '快速',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300'
      };
    } else if (delay < 3000) {
      return {
        icon: Clock,
        label: '正常',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300'
      };
    } else if (delay < 5000) {
      return {
        icon: AlertTriangle,
        label: '较慢',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300'
      };
    } else {
      return {
        icon: Zap,
        label: '很慢',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300'
      };
    }
  };

  const config = getDelayConfig();
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge variant="outline" className={`${config.bgColor} ${config.color} ${config.borderColor}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
      <span className="text-sm text-muted-foreground">{delay}ms</span>
    </div>
  );
}
