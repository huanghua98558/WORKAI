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
  Download,
  Bot,
  Shield,
  Star,
  Zap,
  Target,
  RefreshCw,
  Book
} from 'lucide-react';

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
  risk: {
    total: number;
    resolved: number;
    resolutionRate: number;
  };
  sessions: {
    total: number;
    withStaff: number;
    collaborationRate: number;
    avgStaffMessages: number;
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

// 智能推荐接口
interface Recommendation {
  id: string;
  type: string;
  priority: string;
  title: string;
  description: string;
  action: string;
  actionUrl: string;
}

// 推荐统计接口
interface RecommendationStats {
  total: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  byType: {
    staff: number;
    session: number;
    ai: number;
    collaboration: number;
    knowledge: number;
  };
  byCategory: {
    activity: number;
    risk: number;
    efficiency: number;
    knowledge: number;
  };
}

// 机器人满意度接口
interface RobotSatisfaction {
  robotId: string;
  totalDecisions: number;
  aiReply: number;
  staffReply: number;
  bothReply: number;
  collaborationRate: number;
  avgResponseTime: number;
  satisfactionScore: number;
  lastActivity: string;
}

// 业务角色分析接口
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

// 关键词分析接口
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

// 任务分析接口
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

export default function CollabDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CollabStats | null>(null);
  const [staffActivities, setStaffActivities] = useState<StaffActivity[]>([]);
  const [decisionLogs, setDecisionLogs] = useState<DecisionLog[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationStats, setRecommendationStats] = useState<RecommendationStats | null>(null);
  const [robotSatisfaction, setRobotSatisfaction] = useState<RobotSatisfaction[]>([]);
  const [businessRoleData, setBusinessRoleData] = useState<BusinessRoleAnalysis[]>([]);
  const [keywordData, setKeywordData] = useState<KeywordAnalysis[]>([]);
  const [taskData, setTaskData] = useState<TaskAnalysis[]>([]);
  const [businessRoleOverallStats, setBusinessRoleOverallStats] = useState<any>({});
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // 加载协同统计数据
  useEffect(() => {
    loadStats();
  }, [timeRange]);

  // 加载智能推荐
  useEffect(() => {
    if (activeTab === 'recommendations') {
      loadRecommendations();
    }
  }, [activeTab, timeRange]);

  // 加载机器人满意度
  useEffect(() => {
    if (activeTab === 'robot-satisfaction') {
      loadRobotSatisfaction();
    }
  }, [activeTab, timeRange]);

  // 加载业务角色数据
  useEffect(() => {
    if (activeTab === 'business-role') {
      loadBusinessRoleData();
    }
  }, [activeTab, timeRange, selectedRobot]);

  // 自动刷新功能
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (activeTab === 'overview') {
        loadStats();
      } else if (activeTab === 'recommendations') {
        loadRecommendations();
      } else if (activeTab === 'robot-satisfaction') {
        loadRobotSatisfaction();
      } else if (activeTab === 'business-role') {
        loadBusinessRoleData();
      }
    }, 30000); // 每30秒刷新一次

    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, timeRange, selectedRobot]);

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

  const loadRecommendations = async () => {
    try {
      const [recsRes, statsRes] = await Promise.all([
        fetch(`/api/collab/recommendations`),
        fetch(`/api/collab/recommendations/stats`)
      ]);

      if (recsRes.ok) {
        const recsData = await recsRes.json();
        if (recsData.code === 0) setRecommendations(recsData.data.recommendations || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.code === 0) setRecommendationStats(statsData.data);
      }
    } catch (err) {
      console.error('[CollabDashboard] 加载推荐数据失败:', err);
    }
  };

  const loadRobotSatisfaction = async () => {
    try {
      const res = await fetch(`/api/collab/robot-satisfaction?timeRange=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        if (data.code === 0) setRobotSatisfaction(data.data || []);
      }
    } catch (err) {
      console.error('[CollabDashboard] 加载机器人满意度失败:', err);
    }
  };

  const loadBusinessRoleData = async (subTab: string = 'business-role') => {
    try {
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

      const baseUrl = `/api/collaboration/analytics/${subTab}?${params.toString()}`;
      const res = await fetch(baseUrl);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[CollabDashboard] API错误响应:', res.status, errorText);
        throw new Error(`API返回错误状态: ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        if (subTab === 'business-role') {
          setBusinessRoleData(data.data.businessRoleAnalysis || []);
          setBusinessRoleOverallStats(data.data.overallStats || {});
        } else if (subTab === 'keywords') {
          setKeywordData(data.data.keywordAnalysis || []);
          setBusinessRoleOverallStats(data.data.overallStats || {});
        } else if (subTab === 'tasks') {
          setTaskData(data.data.taskAnalysis || []);
          setBusinessRoleOverallStats(data.data.overallStats || {});
        }
      }
    } catch (err) {
      console.error('[CollabDashboard] 加载业务角色数据失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    loadStats();
    if (activeTab === 'recommendations') loadRecommendations();
    if (activeTab === 'robot-satisfaction') loadRobotSatisfaction();
    if (activeTab === 'business-role') loadBusinessRoleData();
  };

  // 导出CSV文件
  const handleExportCSV = async (exportType: 'csv' | 'staff-activity' | 'decision-logs') => {
    try {
      const url = `/api/collab/export/${exportType}?timeRange=${timeRange}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '导出失败');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `export-${exportType}-${Date.now()}.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

    } catch (err) {
      console.error('[CollabDashboard] 导出失败:', err);
      setError(err instanceof Error ? err.message : '导出失败');
    }
  };

  // 导出业务角色数据
  const handleBusinessRoleExport = async () => {
    try {
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

      const url = `/api/collaboration/analytics/business-role/export?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `business-role-analysis-${Date.now()}.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('[CollabDashboard] 业务角色导出失败:', err);
      setError(err instanceof Error ? err.message : '导出失败');
    }
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
      none: 'bg-gray-500',
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-gray-500'
    };
    return colors[priority] || colors.none;
  };

  // 获取优先级标签
  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      staff: '工作人员优先',
      ai: 'AI优先',
      both: '共同决策',
      none: '无优先',
      high: '高优先级',
      medium: '中优先级',
      low: '低优先级'
    };
    return labels[priority] || '无优先';
  };

  // 获取推荐类型图标
  const getRecommendationIcon = (type: string) => {
    const icons: Record<string, any> = {
      staff: Users,
      session: MessageSquare,
      ai: Bot,
      collaboration: Activity,
      knowledge: Book
    };
    const Icon = icons[type] || Target;
    return <Icon className="h-5 w-5" />;
  };

  // 获取推荐类型标签
  const getRecommendationTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      staff: '工作人员',
      session: '会话',
      ai: 'AI',
      collaboration: '协同',
      knowledge: '知识'
    };
    return labels[type] || type;
  };

  // 获取满意度等级
  const getSatisfactionLevel = (score: number): { label: string; color: string } => {
    if (score >= 80) return { label: '优秀', color: 'text-green-600' };
    if (score >= 60) return { label: '良好', color: 'text-blue-600' };
    if (score >= 40) return { label: '一般', color: 'text-yellow-600' };
    return { label: '较差', color: 'text-red-600' };
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
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                onClick={() => setAutoRefresh(!autoRefresh)}
                disabled={loading}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                {autoRefresh ? '自动开' : '自动关'}
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

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-[900px]">
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="staff">工作人员</TabsTrigger>
            <TabsTrigger value="decisions">决策日志</TabsTrigger>
            <TabsTrigger value="recommendations">智能推荐</TabsTrigger>
            <TabsTrigger value="robot-satisfaction">机器人满意度</TabsTrigger>
            <TabsTrigger value="business-role">业务角色</TabsTrigger>
          </TabsList>

          {/* 总览标签页 */}
          <TabsContent value="overview" className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
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

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">风险处理</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatNumber(stats?.risk.total || 0)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    处理率: {formatPercentage(stats?.risk.resolutionRate || 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 导出按钮 */}
            <div className="flex gap-4">
              <Button
                variant="default"
                onClick={() => handleExportCSV('csv')}
                disabled={loading}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                导出统计数据
              </Button>
            </div>
          </TabsContent>

          {/* 工作人员标签页 */}
          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>工作人员活跃度</CardTitle>
                  <CardDescription>工作人员的参与活跃度统计</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCSV('staff-activity')}
                  disabled={loading}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  导出数据
                </Button>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>协同决策日志</CardTitle>
                  <CardDescription>AI与工作人员的协同决策记录</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCSV('decision-logs')}
                  disabled={loading}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  导出数据
                </Button>
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
                        className="p-4 border rounded-lg space-y-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getPriorityBadge(log.priority)}>
                                {getPriorityLabel(log.priority)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(log.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {log.reason || '无原因'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">AI动作:</span>
                            <span className="font-medium">{log.aiAction || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">工作人员动作:</span>
                            <span className="font-medium">{log.staffAction || '-'}</span>
                          </div>
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
            {/* 推荐统计 */}
            {recommendationStats && (
              <div className="grid gap-6 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">总推荐数</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{recommendationStats.total}</div>
                    <p className="text-xs text-muted-foreground">高: {recommendationStats.byPriority.high} · 中: {recommendationStats.byPriority.medium} · 低: {recommendationStats.byPriority.low}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">工作人员优化</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{recommendationStats.byType.staff}</div>
                    <p className="text-xs text-muted-foreground">工作人员相关推荐</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">AI优化</CardTitle>
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{recommendationStats.byType.ai}</div>
                    <p className="text-xs text-muted-foreground">AI相关推荐</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">协同优化</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{recommendationStats.byType.collaboration}</div>
                    <p className="text-xs text-muted-foreground">协同相关推荐</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 推荐列表 */}
            <Card>
              <CardHeader>
                <CardTitle>智能推荐</CardTitle>
                <CardDescription>基于协同数据分析的优化建议</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <Skeleton className="h-6 w-[300px] mb-2" />
                        <Skeleton className="h-4 w-[500px]" />
                      </div>
                    ))}
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无智能推荐</p>
                    <p className="text-xs mt-2">系统将基于协同数据分析生成优化建议</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-4 border rounded-lg space-y-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getPriorityBadge(rec.priority)}`}>
                              {getRecommendationIcon(rec.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm">{rec.title}</h4>
                                <Badge className={getPriorityBadge(rec.priority)}>
                                  {getPriorityLabel(rec.priority)}
                                </Badge>
                                <Badge variant="outline">
                                  {getRecommendationTypeLabel(rec.type)}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {rec.description}
                              </p>
                            </div>
                          </div>
                          {rec.action && (
                            <Button variant="outline" size="sm" className="gap-2">
                              {rec.action}
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 机器人满意度标签页 */}
          <TabsContent value="robot-satisfaction" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>机器人满意度</CardTitle>
                <CardDescription>各机器人的协作满意度评分</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-4 border rounded-lg space-y-3">
                        <Skeleton className="h-6 w-[300px]" />
                        <Skeleton className="h-4 w-[500px]" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ))}
                  </div>
                ) : robotSatisfaction.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无机器人满意度数据</p>
                    <p className="text-xs mt-2">系统将基于协同决策数据计算满意度评分</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {robotSatisfaction.map((robot) => {
                      const satisfaction = getSatisfactionLevel(robot.satisfactionScore);
                      return (
                        <div
                          key={robot.robotId}
                          className={`p-4 border rounded-lg space-y-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
                            selectedRobot === robot.robotId ? 'ring-2 ring-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                                <Bot className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm">{robot.robotId}</h4>
                                <p className="text-xs text-muted-foreground">
                                  最后活动: {formatTime(robot.lastActivity)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold">{robot.satisfactionScore}</div>
                              <div className={`text-xs font-medium ${satisfaction.color}`}>
                                {satisfaction.label}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">满意度进度</span>
                                <span className="font-medium">{robot.satisfactionScore}/100</span>
                              </div>
                              <Progress value={robot.satisfactionScore} className="h-2" />
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4 text-center">
                              <div>
                                <div className="text-lg font-semibold">{robot.totalDecisions}</div>
                                <div className="text-xs text-muted-foreground">总决策数</div>
                              </div>
                              <div>
                                <div className="text-lg font-semibold text-green-600">{robot.aiReply}</div>
                                <div className="text-xs text-muted-foreground">AI回复</div>
                              </div>
                              <div>
                                <div className="text-lg font-semibold text-blue-600">{robot.staffReply}</div>
                                <div className="text-xs text-muted-foreground">工作人员回复</div>
                              </div>
                              <div>
                                <div className="text-lg font-semibold text-purple-600">{formatPercentage(robot.collaborationRate)}</div>
                                <div className="text-xs text-muted-foreground">协同率</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 业务角色标签页 */}
          <TabsContent value="business-role" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>业务角色分析</CardTitle>
                    <CardDescription>按业务角色维度分析协同效率</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBusinessRoleExport()}
                    disabled={loading || businessRoleData.length === 0}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    导出CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : businessRoleData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无业务角色数据</p>
                    <p className="text-xs mt-2">系统将基于业务角色配置统计协同数据</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {businessRoleData.map((role, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                {role.businessRoleName || '未设置'}
                              </h3>
                              {role.aiBehavior === 'full_auto' && (
                                <Badge className="bg-green-500">全自动</Badge>
                              )}
                              {role.aiBehavior === 'semi_auto' && (
                                <Badge className="bg-yellow-500">半自动</Badge>
                              )}
                              {role.aiBehavior === 'record_only' && (
                                <Badge className="bg-gray-500">仅记录</Badge>
                              )}
                              {role.staffEnabled && (
                                <Badge variant="outline" className="text-blue-600 border-blue-600">
                                  <Users className="h-3 w-3 mr-1" />
                                  工作人员启用
                                </Badge>
                              )}
                              {role.enableTaskCreation && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
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
        </Tabs>
      </div>
    </div>
  );
}
