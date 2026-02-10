'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Heart, 
  AlertTriangle, 
  Lightbulb,
  ArrowUpRight,
  ArrowDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// AI 分析结果类型
interface AIAnalysis {
  intent?: string;
  intentConfidence?: number;
  sentiment?: string;
  sentimentScore?: number;
  shouldTriggerAlert?: boolean;
  suggestedActions?: string[];
  reasoning?: string;
}

interface AIAnalysisBadgeProps {
  analysis?: AIAnalysis | null;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

// 意图配置
const intentConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  inquiry: { label: '咨询', color: 'bg-blue-500', icon: <Brain className="h-3 w-3" /> },
  complaint: { label: '投诉', color: 'bg-orange-500', icon: <AlertTriangle className="h-3 w-3" /> },
  technical: { label: '技术', color: 'bg-purple-500', icon: <Brain className="h-3 w-3" /> },
  administrative: { label: '行政', color: 'bg-slate-500', icon: <Brain className="h-3 w-3" /> },
  appointment: { label: '预约', color: 'bg-green-500', icon: <Lightbulb className="h-3 w-3" /> },
  casual: { label: '闲聊', color: 'bg-pink-500', icon: <Heart className="h-3 w-3" /> },
  unknown: { label: '未知', color: 'bg-gray-500', icon: <Minus className="h-3 w-3" /> },
};

// 情感配置
const sentimentConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  positive: { label: '积极', color: 'bg-green-500', icon: <ArrowUpRight className="h-3 w-3" /> },
  neutral: { label: '中性', color: 'bg-gray-500', icon: <Minus className="h-3 w-3" /> },
  negative: { label: '消极', color: 'bg-orange-500', icon: <ArrowDown className="h-3 w-3" /> },
  angry: { label: '愤怒', color: 'bg-red-500', icon: <AlertTriangle className="h-3 w-3" /> },
};

// 尺寸配置
const sizeConfig = {
  sm: { textSize: 'text-xs', iconSize: 'h-3 w-3', padding: 'px-2 py-0.5' },
  md: { textSize: 'text-sm', iconSize: 'h-4 w-4', padding: 'px-2.5 py-1' },
  lg: { textSize: 'text-base', iconSize: 'h-5 w-5', padding: 'px-3 py-1.5' },
};

export function AIAnalysisBadge({ 
  analysis, 
  size = 'sm', 
  showDetails = false,
  className 
}: AIAnalysisBadgeProps) {
  const sizeStyle = sizeConfig[size];

  if (!analysis) {
    return (
      <Badge variant="outline" className={cn('text-slate-400', sizeStyle.padding, className)}>
        <Brain className={cn(sizeStyle.iconSize, 'mr-1')} />
        无分析
      </Badge>
    );
  }

  const intentInfo = intentConfig[analysis.intent || 'unknown'] || intentConfig.unknown;
  const sentimentInfo = sentimentConfig[analysis.sentiment || 'neutral'] || sentimentConfig.neutral;

  if (showDetails) {
    // 详细展示模式
    return (
      <div className={cn('flex flex-col gap-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg', className)}>
        {/* 意图和情感 */}
        <div className="flex items-center gap-2">
          <Badge className={cn(intentInfo.color, 'text-white', sizeStyle.padding)}>
            <Brain className={cn(sizeStyle.iconSize, 'mr-1')} />
            {intentInfo.label}
          </Badge>
          {analysis.intentConfidence !== undefined && (
            <span className={cn('text-xs text-slate-600 dark:text-slate-400')}>
              {Math.round(analysis.intentConfidence * 100)}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge className={cn(sentimentInfo.color, 'text-white', sizeStyle.padding)}>
            <Heart className={cn(sizeStyle.iconSize, 'mr-1')} />
            {sentimentInfo.label}
          </Badge>
          {analysis.sentimentScore !== undefined && (
            <span className={cn('text-xs text-slate-600 dark:text-slate-400')}>
              {Math.round(analysis.sentimentScore * 100)}%
            </span>
          )}
        </div>

        {/* 告警提示 */}
        {analysis.shouldTriggerAlert && (
          <Badge variant="destructive" className={sizeStyle.padding}>
            <AlertTriangle className={cn(sizeStyle.iconSize, 'mr-1')} />
            需要告警
          </Badge>
        )}

        {/* 建议操作 */}
        {analysis.suggestedActions && analysis.suggestedActions.length > 0 && (
          <div className="mt-1">
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
              <Lightbulb className="inline h-3 w-3 mr-1" />
              建议操作:
            </div>
            {analysis.suggestedActions.map((action, idx) => (
              <div key={idx} className={cn('text-xs text-slate-700 dark:text-slate-300', 'pl-4')}>
                • {action}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 简洁展示模式
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {/* 意图 */}
      <Badge 
        className={cn(
          intentInfo.color, 
          'text-white', 
          sizeStyle.padding
        )}
        title={`意图: ${intentInfo.label} (${Math.round((analysis.intentConfidence || 0) * 100)}%)`}
      >
        {intentInfo.icon}
        <span className={cn('ml-1', sizeStyle.textSize)}>{intentInfo.label}</span>
      </Badge>

      {/* 情感 */}
      <Badge 
        className={cn(
          sentimentInfo.color, 
          'text-white', 
          sizeStyle.padding
        )}
        title={`情感: ${sentimentInfo.label} (${Math.round((analysis.sentimentScore || 0) * 100)}%)`}
      >
        {sentimentInfo.icon}
        <span className={cn('ml-1', sizeStyle.textSize)}>{sentimentInfo.label}</span>
      </Badge>

      {/* 告警标识 */}
      {analysis.shouldTriggerAlert && (
        <Badge 
          variant="destructive" 
          className={sizeStyle.padding}
          title="需要触发告警"
        >
          <AlertTriangle className={sizeStyle.iconSize} />
        </Badge>
      )}
    </div>
  );
}

// 单独的意图组件
export function IntentBadge({ 
  intent, 
  confidence, 
  size = 'sm',
  className 
}: { 
  intent?: string; 
  confidence?: number; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeStyle = sizeConfig[size];
  const intentInfo = intentConfig[intent || 'unknown'] || intentConfig.unknown;

  return (
    <Badge 
      className={cn(
        intentInfo.color, 
        'text-white', 
        sizeStyle.padding,
        className
      )}
    >
      {intentInfo.icon}
      <span className={cn('ml-1', sizeStyle.textSize)}>{intentInfo.label}</span>
      {confidence !== undefined && (
        <span className={cn('ml-1 opacity-80', sizeStyle.textSize)}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </Badge>
  );
}

// 单独的情感组件
export function SentimentBadge({ 
  sentiment, 
  score, 
  size = 'sm',
  className 
}: { 
  sentiment?: string; 
  score?: number; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeStyle = sizeConfig[size];
  const sentimentInfo = sentimentConfig[sentiment || 'neutral'] || sentimentConfig.neutral;

  return (
    <Badge 
      className={cn(
        sentimentInfo.color, 
        'text-white', 
        sizeStyle.padding,
        className
      )}
    >
      {sentimentInfo.icon}
      <span className={cn('ml-1', sizeStyle.textSize)}>{sentimentInfo.label}</span>
      {score !== undefined && (
        <span className={cn('ml-1 opacity-80', sizeStyle.textSize)}>
          {Math.round(score * 100)}%
        </span>
      )}
    </Badge>
  );
}
