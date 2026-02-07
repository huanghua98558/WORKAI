'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  MessageSquare,
  Activity,
  TrendingUp,
  BarChart3,
  Clock,
  CheckCircle,
  Bot,
  Zap,
  Target,
  RefreshCw,
  AlertTriangle,
  Tag,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Download
} from 'lucide-react';

// 业务角色分析数据接口
interface BusinessRoleAnalysis {
  businessRole: string | null;
  businessRoleName: string;
  businessRoleDescription: string;
  aiBehavior: string;
  staffEnabled: boolean;
  enableTaskCreation: boolean;
  stats: {
    totalDecisions: number;
    aiReplyCount: number;
    staffReplyCount: number;
    aiReplyRate: number;
    staffReplyRate: number;
    priorityDistribution: {
      high: number;
      medium: number;
      low: number;
    };
  };
}

// 关键词分析数据接口
interface KeywordAnalysis {
  keyword: string;
  businessRoleId: string | null;
  businessRoleCode: string;
  businessRoleName: string;
  aiBehavior: string;
  keywords: string[];
  stats: {
    triggerCount: number;
    aiReplyCount: number;
    staffReplyCount: number;
    bothReplyCount: number;
    noneReplyCount: number;
    staffReplyRate: number;
    lastTriggeredAt: string | null;
  };
}

// 任务分析数据接口
interface TaskAnalysis {
  businessRoleId: string | null;
  businessRoleCode: string;
  businessRoleName: string;
  enableTaskCreation: boolean;
  aiBehavior: string;
  stats: {
    totalTasks: number;
    pendingTasks: number;
    processingTasks: number;
    completedTasks: number;
    cancelledTasks: number;
    completionRate: number;
    priorityDistribution: {
      high: number;
      normal: number;
      low: number;
    };
  };
}

export default function BusinessRoleAnalytics() {
  const [loading, setLoading] = useState(true);
  const [businessRoleData, setBusinessRoleData] = useState<BusinessRoleAnalysis[]>([]);
  const [keywordData, setKeywordData] = useState<KeywordAnalysis[]>([]);
  const [taskData, setTaskData] = useState<TaskAnalysis[]>([]);
  const [overallStats, setOverallStats] = useState<any>({});
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('business-role');

  // 加载数据
  useEffect(() => {
    loadData();
  }, [activeTab, timeRange, selectedRobot]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (timeRange !== 'all') {
        const now = new Date();
        const startTime = timeRange === '24h'
          ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
          : timeRange === '7d'
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        params.append('startTime', startTime.toISOString());
        params.append('endTime', now.toISOString());
      }
      if (selectedRobot) {
        params.append('robotId', selectedRobot);
      }

      const baseUrl = `/api/collaboration/analytics/${activeTab}?${params.toString()}`;
      const res = await fetch(baseUrl);

      if (!res.ok) {
        throw new Error('加载数据失败');
      }

      const data = await res.json();
      if (data.success) {
        if (activeTab === 'business-role') {
          setBusinessRoleData(data.data.businessRoleAnalysis || []);
          setOverallStats(data.data.overallStats || {});
        } else if (activeTab === 'keywords') {
          setKeywordData(data.data.keywordAnalysis || []);
          setOverallStats(data.data.overallStats || {});
        } else if (activeTab === 'tasks') {
          setTaskData(data.data.taskAnalysis || []);
          setOverallStats(data.data.overallStats || {});
        }
      }
    } catch (err) {
      console.error('[BusinessRoleAnalytics] 加载数据失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const formatNumber = (num: number | string): string => {
    return typeof num === 'number' ? num.toLocaleString() : num;
  };

  const formatPercentage = (num: number | string): string => {
    const val = typeof num === 'number' ? num : parseFloat(num);
    return val.toFixed(2) + '%';
  };

  const getAiBehaviorBadge = (behavior: string) => {
    const colors: Record<string, string> = {
      full_auto: 'bg-green-500',
      semi_auto: 'bg-yellow-500',
      record_only: 'bg-gray-500',
    };
    const labels: Record<string, string> = {
      full_auto: '全自动',
      semi_auto: '半自动',
      record_only: '仅记录',
    };
    return (
      <Badge className={colors[behavior] || colors.record_only}>
        {labels[behavior] || behavior}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* 头部导航 */}
      <div className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">业务角色分析</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">按业务角色维度分析协同效率</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="选择时间范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">最近24小时</SelectItem>
                  <SelectItem value="7d">最近7天</SelectItem>
                  <SelectItem value="30d">最近30天</SelectItem>
                  <SelectItem value="all">全部时间</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="container mx-auto px-6 py-8">
        {error && (
          <Card className="mb-6 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="business-role" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[450px]">
            <TabsTrigger value="business-role">业务角色</TabsTrigger>
            <TabsTrigger value="keywords">关键词</TabsTrigger>
            <TabsTrigger value="tasks">任务</TabsTrigger>
          </TabsList>

          {/* 业务角色标签页 */}
          <TabsContent value="business-role" className="space-y-6">
            {/* 总体统计 */}
            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总决策数</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatNumber(overallStats.totalDecisions || 0)}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI回复率</CardTitle>
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {overallStats.overallAiReplyRate || '0.00%'}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">工作人员回复率</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {overallStats.overallStaffReplyRate || '0.00%'}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">活跃业务角色</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {overallStats.activeBusinessRoles || 0}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 业务角色详细数据 */}
            <Card>
              <CardHeader>
                <CardTitle>业务角色详细分析</CardTitle>
                <CardDescription>各个业务角色的协同决策统计</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : businessRoleData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无数据
                  </div>
                ) : (
                  <div className="space-y-4">
                    {businessRoleData.map((role, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                {role.businessRoleName}
                              </h3>
                              {getAiBehaviorBadge(role.aiBehavior)}
                              {role.staffEnabled && (
                                <Badge variant="outline" className="text-blue-600 border-blue-600">
                                  <Users className="h-3 w-3 mr-1" />
                                  工作人员启用
                                </Badge>
                              )}
                              {role.enableTaskCreation && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  任务创建
                                </Badge>
                              )}
                            </div>
                            {role.businessRoleDescription && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {role.businessRoleDescription}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {formatNumber(role.stats.totalDecisions)}
                            </div>
                            <div className="text-sm text-gray-500">决策总数</div>
                          </div>
                        </div>

                        {/* 回复率统计 */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-1">
                                <Bot className="h-4 w-4 text-green-600" />
                                AI回复
                              </span>
                              <span className="font-semibold">{formatNumber(role.stats.aiReplyCount)}</span>
                            </div>
                            <Progress value={role.stats.aiReplyRate} className="h-2" />
                            <div className="text-xs text-gray-500 text-right">
                              {formatPercentage(role.stats.aiReplyRate)}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-blue-600" />
                                工作人员回复
                              </span>
                              <span className="font-semibold">{formatNumber(role.stats.staffReplyCount)}</span>
                            </div>
                            <Progress value={role.stats.staffReplyRate} className="h-2" />
                            <div className="text-xs text-gray-500 text-right">
                              {formatPercentage(role.stats.staffReplyRate)}
                            </div>
                          </div>
                        </div>

                        {/* 优先级分布 */}
                        <div className="flex items-center gap-4 pt-2 border-t">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            优先级分布：
                          </div>
                          <div className="flex gap-3">
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              高: {role.stats.priorityDistribution.high}
                            </Badge>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              中: {role.stats.priorityDistribution.medium}
                            </Badge>
                            <Badge variant="outline" className="text-gray-600 border-gray-600">
                              低: {role.stats.priorityDistribution.low}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 关键词标签页 */}
          <TabsContent value="keywords" className="space-y-6">
            {/* 总体统计 */}
            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总触发数</CardTitle>
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatNumber(overallStats.totalTriggers || 0)}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">关键词数</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatNumber(overallStats.uniqueKeywords || 0)}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI回复数</CardTitle>
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatNumber(overallStats.totalAiReplies || 0)}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">工作人员回复率</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {overallStats.overallStaffReplyRate || '0.00%'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 关键词详细数据 */}
            <Card>
              <CardHeader>
                <CardTitle>关键词触发统计</CardTitle>
                <CardDescription>各个关键词的触发情况和处理结果</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : keywordData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无关键词触发数据
                  </div>
                ) : (
                  <div className="space-y-4">
                    {keywordData.map((keyword, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                {keyword.keyword}
                              </h3>
                              {getAiBehaviorBadge(keyword.aiBehavior)}
                              <Badge variant="outline">
                                {keyword.businessRoleName}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {formatNumber(keyword.stats.triggerCount)}
                            </div>
                            <div className="text-sm text-gray-500">触发次数</div>
                          </div>
                        </div>

                        {/* 触发结果分布 */}
                        <div className="grid grid-cols-4 gap-2">
                          <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <div className="text-lg font-bold text-green-600">
                              {formatNumber(keyword.stats.aiReplyCount)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">AI回复</div>
                          </div>
                          <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                            <div className="text-lg font-bold text-blue-600">
                              {formatNumber(keyword.stats.staffReplyCount)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">工作人员回复</div>
                          </div>
                          <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded">
                            <div className="text-lg font-bold text-purple-600">
                              {formatNumber(keyword.stats.bothReplyCount)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">都回复</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 dark:bg-gray-950/20 rounded">
                            <div className="text-lg font-bold text-gray-600">
                              {formatNumber(keyword.stats.noneReplyCount)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">不回复</div>
                          </div>
                        </div>

                        {/* 工作人员回复率 */}
                        {keyword.stats.triggerCount > 0 && (
                          <div className="pt-2 border-t">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                工作人员回复率
                              </span>
                              <span className="text-sm font-semibold">
                                {formatPercentage(keyword.stats.staffReplyRate)}
                              </span>
                            </div>
                            <Progress value={keyword.stats.staffReplyRate} className="h-2" />
                          </div>
                        )}

                        {/* 最后触发时间 */}
                        {keyword.stats.lastTriggeredAt && (
                          <div className="pt-2 border-t text-xs text-gray-500">
                            最后触发: {new Date(keyword.stats.lastTriggeredAt).toLocaleString('zh-CN')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 任务标签页 */}
          <TabsContent value="tasks" className="space-y-6">
            {/* 总体统计 */}
            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总任务数</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatNumber(overallStats.totalTasks || 0)}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">已完成</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatNumber(overallStats.completedTasks || 0)}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">待处理</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatNumber(overallStats.pendingTasks || 0)}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">完成率</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {overallStats.overallCompletionRate || '0.00%'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 任务详细数据 */}
            <Card>
              <CardHeader>
                <CardTitle>任务分析</CardTitle>
                <CardDescription>各个业务角色的任务完成情况</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : taskData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无任务数据
                  </div>
                ) : (
                  <div className="space-y-4">
                    {taskData.map((task, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                {task.businessRoleName}
                              </h3>
                              {getAiBehaviorBadge(task.aiBehavior)}
                              {task.enableTaskCreation ? (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  任务创建启用
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-600 border-gray-600">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  任务创建禁用
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {formatNumber(task.stats.totalTasks)}
                            </div>
                            <div className="text-sm text-gray-500">任务总数</div>
                          </div>
                        </div>

                        {/* 任务状态分布 */}
                        <div className="grid grid-cols-4 gap-2">
                          <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                            <div className="text-lg font-bold text-yellow-600">
                              {formatNumber(task.stats.pendingTasks)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">待处理</div>
                          </div>
                          <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                            <div className="text-lg font-bold text-blue-600">
                              {formatNumber(task.stats.processingTasks)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">处理中</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                            <div className="text-lg font-bold text-green-600">
                              {formatNumber(task.stats.completedTasks)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">已完成</div>
                          </div>
                          <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded">
                            <div className="text-lg font-bold text-red-600">
                              {formatNumber(task.stats.cancelledTasks)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">已取消</div>
                          </div>
                        </div>

                        {/* 完成率 */}
                        {task.stats.totalTasks > 0 && (
                          <div className="pt-2 border-t">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                任务完成率
                              </span>
                              <span className="text-sm font-semibold">
                                {formatPercentage(task.stats.completionRate)}
                              </span>
                            </div>
                            <Progress value={task.stats.completionRate} className="h-2" />
                          </div>
                        )}

                        {/* 优先级分布 */}
                        <div className="flex items-center gap-4 pt-2 border-t">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            优先级分布：
                          </div>
                          <div className="flex gap-3">
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              高: {task.stats.priorityDistribution.high}
                            </Badge>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              中: {task.stats.priorityDistribution.normal}
                            </Badge>
                            <Badge variant="outline" className="text-gray-600 border-gray-600">
                              低: {task.stats.priorityDistribution.low}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
