'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Smile,
  Meh,
  Frown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  PieChart,
  Users,
  Bot
} from 'lucide-react';

// 用户满意度分析接口
interface SatisfactionData {
  timeRange: string;
  robotId?: string;
  staffUserId?: string;
  summary: {
    totalSessions: number;
    avgSatisfactionScore: number;
    collaborationRate: number;
    staffInterventionRate: number;
    aiIndependentRate: number;
    satisfactionDistribution: {
      high: number;
      medium: number;
      low: number;
    };
    needsAttention: boolean;
  };
  trends: Array<{
    hour: string;
    totalSessions: number;
    collaborationRate: number;
    staffIntervention: string;
  }>;
  topIssues: Array<{
    reason: string;
    count: number;
  }>;
  insights: {
    status: string;
    recommendations: string[];
  };
}

export default function SatisfactionAnalysisCard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SatisfactionData | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [error, setError] = useState<string | null>(null);

  // 加载满意度数据
  const loadSatisfactionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/collab/satisfaction/analyze?timeRange=${timeRange}`
      );
      const result = await res.json();
      if (result.code === 0) {
        setData(result.data);
      } else {
        setError(result.message || '加载满意度数据失败');
      }
    } catch (err) {
      console.error('加载满意度数据失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSatisfactionData();
  }, [timeRange]);

  // 获取满意度等级
  const getSatisfactionLevel = (score: number) => {
    if (score >= 80) return { label: '优秀', color: 'bg-green-500', icon: Smile };
    if (score >= 60) return { label: '良好', color: 'bg-blue-500', icon: Meh };
    if (score >= 40) return { label: '一般', color: 'bg-yellow-500', icon: Meh };
    return { label: '较差', color: 'bg-red-500', icon: Frown };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smile className="w-5 h-5" />
              用户满意度分析
            </CardTitle>
            <CardDescription>
              基于协同决策、工作人员介入率等指标综合评估用户满意度
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">最近1小时</SelectItem>
                <SelectItem value="24h">最近24小时</SelectItem>
                <SelectItem value="7d">最近7天</SelectItem>
                <SelectItem value="30d">最近30天</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={loadSatisfactionData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-red-500" />
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadSatisfactionData}
                className="mt-4"
              >
                重试
              </Button>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* 满意度分数 */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg dark:from-blue-950 dark:to-purple-950">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  平均满意度分数
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">
                    {data.summary.avgSatisfactionScore}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {(() => {
                  const level = getSatisfactionLevel(data.summary.avgSatisfactionScore);
                  const Icon = level.icon;
                  return (
                    <>
                      <Badge className={`${level.color} text-white`}>
                        <Icon className="w-4 h-4 mr-1" />
                        {level.label}
                      </Badge>
                      {data.summary.needsAttention && (
                        <Badge variant="destructive">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          需要关注
                        </Badge>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 关键指标 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">协同率</span>
                  <span className="font-semibold">{data.summary.collaborationRate}%</span>
                </div>
                <Progress value={data.summary.collaborationRate} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">工作人员介入率</span>
                  <span className="font-semibold">{data.summary.staffInterventionRate}%</span>
                </div>
                <Progress value={data.summary.staffInterventionRate} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">AI独立处理率</span>
                  <span className="font-semibold">{data.summary.aiIndependentRate}%</span>
                </div>
                <Progress value={data.summary.aiIndependentRate} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">总会话数</span>
                  <span className="font-semibold">{data.summary.totalSessions}</span>
                </div>
              </div>
            </div>

            {/* 满意度分布 */}
            <div>
              <h4 className="text-sm font-medium mb-3">满意度分布</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Smile className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-muted-foreground">高满意度</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {data.summary.satisfactionDistribution.high}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Meh className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-muted-foreground">中等满意度</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {data.summary.satisfactionDistribution.medium}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Frown className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-muted-foreground">低满意度</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {data.summary.satisfactionDistribution.low}
                  </div>
                </div>
              </div>
            </div>

            {/* 主要问题 */}
            {data.topIssues && data.topIssues.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">主要问题</h4>
                <div className="space-y-2">
                  {data.topIssues.map((issue, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="text-sm">{issue.reason}</span>
                      <Badge variant="outline">{issue.count} 次</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 改进建议 */}
            {data.insights && data.insights.recommendations && data.insights.recommendations.length > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  改进建议
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {data.insights.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
