'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, MessageSquare, Activity, TrendingUp, BarChart3, Clock, CheckCircle } from 'lucide-react';

// 协同统计数据接口
interface CollabStats {
  timeRange: string;
  decisions: {
    total: number;
    aiReplies: number;
    staffPriority: number;
    aiPriority: number;
    bothPriority: number;
    collaborationRate: number;
  };
  staff: {
    totalMessages: number;
    uniqueSessions: number;
    uniqueStaff: number;
  };
  sessions: {
    total: number;
    withStaff: number;
    collaborationRate: number;
  };
}

// 工作人员活跃度数据接口
interface StaffActivity {
  staffUserId: string;
  staffName: string;
  totalActivities: number;
  messages: number;
  joins: number;
  commands: number;
  handling: number;
  totalMessages: number;
}

// 决策日志接口
interface DecisionLog {
  id: string;
  sessionId: string;
  robotId: string;
  shouldAiReply: boolean;
  aiAction: string;
  staffAction: string;
  priority: string;
  reason: string;
  createdAt: string;
}

export default function CollabDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CollabStats | null>(null);
  const [staffActivities, setStaffActivities] = useState<StaffActivity[]>([]);
  const [decisionLogs, setDecisionLogs] = useState<DecisionLog[]>([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [error, setError] = useState<string | null>(null);

  // 加载协同统计数据
  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // 并行加载所有数据
      const [statsRes, activitiesRes, logsRes] = await Promise.all([
        fetch(`/api/collab/stats?timeRange=${timeRange}`),
        fetch(`/api/collab/staff-activity?timeRange=${timeRange}&limit=10`),
        fetch(`/api/collab/decision-logs?limit=10`)
      ]);

      if (!statsRes.ok || !activitiesRes.ok || !logsRes.ok) {
        throw new Error('加载数据失败');
      }

      const statsData = await statsRes.json();
      const activitiesData = await activitiesRes.json();
      const logsData = await logsRes.json();

      if (statsData.code === 0) setStats(statsData.data);
      if (activitiesData.code === 0) setStaffActivities(activitiesData.data.staff || []);
      if (logsData.code === 0) setDecisionLogs(logsData.data.logs || []);

    } catch (err) {
      console.error('[CollabDashboard] 加载数据失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    loadStats();
  };

  // 格式化数字
  const formatNumber = (num: number | string): string => {
    return typeof num === 'number' ? num.toLocaleString() : num;
  };

  // 格式化百分比
  const formatPercentage = (num: number | string): string => {
    const val = typeof num === 'number' ? num : parseFloat(num);
    return val.toFixed(2) + '%';
  };

  // 格式化时间
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取优先级颜色
  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      staff: 'bg-blue-500',
      ai: 'bg-green-500',
      both: 'bg-purple-500',
      none: 'bg-gray-500'
    };
    return colors[priority] || colors.none;
  };

  // 获取优先级标签
  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      staff: '工作人员优先',
      ai: 'AI优先',
      both: '共同决策',
      none: '无优先'
    };
    return labels[priority] || '无优先';
  };

  // 获取动作标签
  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      reply: '回复',
      wait: '等待',
      continue: '继续',
      skip: '跳过',
      stop: '停止'
    };
    return labels[action] || action;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* 头部导航 */}
      <div className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">协同分析</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI与工作人员协作效率分析</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="选择时间范围" />
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
                onClick={handleRefresh}
                disabled={loading}
                className="gap-2"
              >
                <Activity className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="staff">工作人员</TabsTrigger>
            <TabsTrigger value="decisions">决策日志</TabsTrigger>
            <TabsTrigger value="recommendations">智能推荐</TabsTrigger>
          </TabsList>

          {/* 总览标签页 */}
          <TabsContent value="overview" className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">协同决策数</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {stats?.decisions.total || 0}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    协同率: {formatPercentage(stats?.decisions.collaborationRate || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">工作人员消息</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatNumber(stats?.staff.totalMessages || 0)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    独立会话: {stats?.staff.uniqueSessions || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总会话数</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatNumber(stats?.sessions.total || 0)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    有工作人员: {formatNumber(stats?.sessions.withStaff || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">会话协同率</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatPercentage(stats?.sessions.collaborationRate || 0)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    工作人员: {stats?.staff.uniqueStaff || 0} 人
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 决策分布 */}
            <Card>
              <CardHeader>
                <CardTitle>决策分布</CardTitle>
                <CardDescription>AI与工作人员的决策优先级分布</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-500 text-white border-0">
                          工作人员优先
                        </Badge>
                      </span>
                      <span className="font-medium">{formatNumber(stats?.decisions.staffPriority || 0)}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{
                          width: stats
                            ? `${(stats.decisions.staffPriority / stats.decisions.total) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-500 text-white border-0">
                          AI优先
                        </Badge>
                      </span>
                      <span className="font-medium">{formatNumber(stats?.decisions.aiPriority || 0)}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{
                          width: stats
                            ? `${(stats.decisions.aiPriority / stats.decisions.total) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-purple-500 text-white border-0">
                          共同决策
                        </Badge>
                      </span>
                      <span className="font-medium">{formatNumber(stats?.decisions.bothPriority || 0)}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all duration-500"
                        style={{
                          width: stats
                            ? `${(stats.decisions.bothPriority / stats.decisions.total) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 工作人员标签页 */}
          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>工作人员活跃度</CardTitle>
                <CardDescription>工作人员的参与活跃度统计</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-3 w-[150px]" />
                        </div>
                        <Skeleton className="h-8 w-[100px]" />
                      </div>
                    ))}
                  </div>
                ) : staffActivities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无工作人员活跃度数据</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staffActivities.map((staff, index) => (
                      <div
                        key={staff.staffUserId}
                        className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg">
                          {staff.staffName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{staff.staffName}</h4>
                          <p className="text-xs text-muted-foreground">
                            活跃度: {formatNumber(staff.totalActivities)} · 消息: {formatNumber(staff.totalMessages)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="text-center">
                            <div className="font-semibold text-green-600">{formatNumber(staff.joins)}</div>
                            <div className="text-muted-foreground">接入</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-blue-600">{formatNumber(staff.handling)}</div>
                            <div className="text-muted-foreground">处理</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-purple-600">{formatNumber(staff.commands)}</div>
                            <div className="text-muted-foreground">指令</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 决策日志标签页 */}
          <TabsContent value="decisions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>协同决策日志</CardTitle>
                <CardDescription>AI与工作人员的协同决策记录</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="p-4 border rounded-lg space-y-3">
                        <Skeleton className="h-4 w-[300px]" />
                        <Skeleton className="h-3 w-[200px]" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-[80px]" />
                          <Skeleton className="h-6 w-[80px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : decisionLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无决策日志数据</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {decisionLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1">
                              会话ID: {log.sessionId.slice(-8)}
                            </h4>
                            <p className="text-xs text-muted-foreground mb-2">
                              {formatTime(log.createdAt)}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                              {log.reason}
                            </p>
                          </div>
                          <Badge className={getPriorityBadge(log.priority)}>
                            {getPriorityLabel(log.priority)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">AI动作:</span>
                            <span className="font-medium text-green-600">
                              {getActionLabel(log.aiAction)}
                            </span>
                          </div>
                          <span className="text-muted-foreground">·</span>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">工作人员动作:</span>
                            <span className="font-medium text-blue-600">
                              {getActionLabel(log.staffAction)}
                            </span>
                          </div>
                          <span className="text-muted-foreground">·</span>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">应该AI回复:</span>
                            <span className="font-medium">
                              {log.shouldAiReply ? '是' : '否'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 智能推荐标签页 */}
          <TabsContent value="recommendations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>智能推荐</CardTitle>
                <CardDescription>基于协同数据分析的优化建议</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>智能推荐功能开发中...</p>
                  <p className="text-xs mt-2">即将上线基于协同数据分析的优化建议</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
