/**
 * 情感分析展示组件
 * 用于在仪表盘展示情感分析统计和趋势
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Smile,
  Meh,
  Frown,
  TrendingUp,
  TrendingDown,
  Flame,
  Heart
} from 'lucide-react';

interface SentimentStats {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  highIntensity: number;
  lowIntensity: number;
  mediumIntensity: number;
}

interface SentimentAnalysisCardProps {
  stats?: Partial<SentimentStats>;
  className?: string;
}

const DEFAULT_STATS: SentimentStats = {
  positive: 0,
  neutral: 0,
  negative: 0,
  total: 0,
  highIntensity: 0,
  lowIntensity: 0,
  mediumIntensity: 0,
};

export function SentimentAnalysisCard({ stats = DEFAULT_STATS, className }: SentimentAnalysisCardProps) {
  const total = stats.total || 0;
  const positive = stats.positive || 0;
  const neutral = stats.neutral || 0;
  const negative = stats.negative || 0;
  const highIntensity = stats.highIntensity || 0;
  const lowIntensity = stats.lowIntensity || 0;
  const mediumIntensity = stats.mediumIntensity || 0;

  const positivePercentage = total > 0 ? ((positive / total) * 100).toFixed(1) : '0';
  const neutralPercentage = total > 0 ? ((neutral / total) * 100).toFixed(1) : '0';
  const negativePercentage = total > 0 ? ((negative / total) * 100).toFixed(1) : '0';

  const highIntensityPercentage = total > 0 ? ((highIntensity / total) * 100).toFixed(1) : '0';
  const mediumIntensityPercentage = total > 0 ? ((mediumIntensity / total) * 100).toFixed(1) : '0';
  const lowIntensityPercentage = total > 0 ? ((lowIntensity / total) * 100).toFixed(1) : '0';

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-5 w-5 text-pink-500" />
          情感分析
        </CardTitle>
        <CardDescription>最近消息的情感倾向统计</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 情感倾向分布 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Smile className="h-4 w-4 text-green-500" />
              正面情感
            </span>
            <Badge variant="outline" className="text-green-600 border-green-300">
              {positive} ({positivePercentage}%)
            </Badge>
          </div>
          <Progress value={parseFloat(positivePercentage)} className="h-2" />

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Meh className="h-4 w-4 text-gray-500" />
              中性情感
            </span>
            <Badge variant="outline" className="text-gray-600 border-gray-300">
              {neutral} ({neutralPercentage}%)
            </Badge>
          </div>
          <Progress value={parseFloat(neutralPercentage)} className="h-2" />

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Frown className="h-4 w-4 text-red-500" />
              负面情感
            </span>
            <Badge variant="outline" className="text-red-600 border-red-300">
              {negative} ({negativePercentage}%)
            </Badge>
          </div>
          <Progress value={parseFloat(negativePercentage)} className="h-2" />
        </div>

        {/* 情感强度分布 */}
        <div className="space-y-3 pt-3 border-t">
          <div className="text-sm font-medium flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            情感强度分布
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="text-2xl font-bold text-red-600">{highIntensity}</div>
              <div className="text-xs text-muted-foreground mt-1">强烈</div>
              <div className="text-xs text-red-500">{highIntensityPercentage}%</div>
            </div>

            <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{mediumIntensity}</div>
              <div className="text-xs text-muted-foreground mt-1">中等</div>
              <div className="text-xs text-yellow-500">{mediumIntensityPercentage}%</div>
            </div>

            <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="text-2xl font-bold text-green-600">{lowIntensity}</div>
              <div className="text-xs text-muted-foreground mt-1">轻微</div>
              <div className="text-xs text-green-500">{lowIntensityPercentage}%</div>
            </div>
          </div>
        </div>

        {/* 情感趋势 */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">总计消息</span>
            <span className="font-medium">{total}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 情感分析徽章组件
 */
interface SentimentBadgeProps {
  sentiment: 'positive' | 'neutral' | 'negative';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export function SentimentBadge({ sentiment, intensity, className }: SentimentBadgeProps) {
  const getSentimentConfig = () => {
    switch (sentiment) {
      case 'positive':
        return {
          icon: Smile,
          label: '正面',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-300'
        };
      case 'negative':
        return {
          icon: Frown,
          label: '负面',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-300'
        };
      case 'neutral':
      default:
        return {
          icon: Meh,
          label: '中性',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-300'
        };
    }
  };

  const config = getSentimentConfig();
  const Icon = config.icon;

  const getIntensityBadge = () => {
    if (!intensity) return null;
    
    const intensityConfig = {
      low: { label: '轻微', color: 'bg-blue-100 text-blue-700' },
      medium: { label: '中等', color: 'bg-yellow-100 text-yellow-700' },
      high: { label: '强烈', color: 'bg-red-100 text-red-700' }
    };

    return (
      <Badge variant="outline" className={`ml-2 ${intensityConfig[intensity].color} border-0`}>
        {intensityConfig[intensity].label}
      </Badge>
    );
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge variant="outline" className={`${config.bgColor} ${config.color} ${config.borderColor}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
      {getIntensityBadge()}
    </div>
  );
}

import { cn } from '@/lib/utils';
