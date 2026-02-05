/**
 * 协同分析主页面
 * 展示AI与工作人员的协同效果分析
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

import { 
  Users,
  Bot,
  TrendingUp,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  FileText,
  Lightbulb,
  ArrowRight,
  MessageSquare,
  UserCheck
} from 'lucide-react';

// 类型定义
interface CollabStats {
  timeRange: string;
  timestamp: string;
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

interface Recommendation {
  id: string;
  type: string;
  priority: string;
  title: string;
  description: string;
  action: string;
  actionUrl: string;
}

export default function CollabAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('24h');
  const [stats, setStats] = useState<CollabStats | null>(null);
  const [staffActivity, setStaffActivity] = useState<StaffActivity[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取协同统计数据
  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/collab/stats?timeRange=${timeRange}`);
      const data = await res.json();
      if (data.code === 0) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('获取协同统计数据失败:', error);
    }
  };

  // 获取工作人员活跃度
  const fetchStaffActivity = async () => {
    try {
      const res = await fetch(`/api/collab/staff-activity?timeRange=${timeRange}&limit=10`);
      const data = await res.json();
      if (data.code === 0) {
        setStaffActivity(data.data.staff);
      }
    } catch (error) {
      console.error('获取工作人员活跃度失败:', error);
    }
  };

  // 获取智能推荐
  const fetchRecommendations = async () => {
    try {
      const res = await fetch('/api/collab/recommendations');
      const data = await res.json();
      if (data.code === 0) {
        setRecommendations(data.data.recommendations);
      }
    } catch (error) {
      console.error('获取智能推荐失败:', error);
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    setLoading(true);
    Promise.all([fetchStats(), fetchStaffActivity(), fetchRecommendations()])
      .finally(() => setLoading(false));
  };

  // 初始加载
  useEffect(() => {
    handleRefresh();
  }, [timeRange]);

  // 图表颜色
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  // 决策分布数据
  const decisionData = stats ? [
    { name: 'AI优先', value: stats.decisions.aiPriority },
    { name: '工作人员优先', value: stats.decisions.staffPriority },
    { name: '共同协作', value: stats.decisions.bothPriority }
  ] : [];

  // 工作人员活跃度数据
  const activityData = staffActivity.map(staff => ({
    name: staff.staffName || staff.staffUserId,
    消息: staff.messages,
    指令: staff.commands,
    处理: staff.handling
  }));

  // 获取优先级徽章
  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    const labels = {
      high: '高',
      medium: '中',
      low: '低'
    };
    return (
      <Badge variant="outline" className={colors[priority as keyof typeof colors]}>
        {labels[priority as keyof typeof labels]}
      </Badge>
    );
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    const icons = {
      staff: <UserCheck className="w-5 h-5" />,
      session: <MessageSquare className="w-5 h-5" />,
      ai: <Bot className="w-5 h-5" />
    };
    return icons[type as keyof typeof icons] || <Activity className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">协同分析</h1>
          <p className="text-slate-600 mt-1">AI与工作人员协同效果分析与智能推荐</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1小时</SelectItem>
              <SelectItem value="24h">24小时</SelectItem>
              <SelectItem value="7d">7天</SelectItem>
              <SelectItem value="30d">30天</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
            size="icon"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 概览统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              总决策数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.decisions.total || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              协同率: {stats?.decisions.collaborationRate || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              工作人员参与
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.sessions.withStaff || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              占比: {stats?.sessions.collaborationRate || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI回复数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.decisions.aiReplies || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              占比: {stats?.decisions.total ? ((stats.decisions.aiReplies / stats.decisions.total) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              风险处理
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.risk.resolved || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              解决率: {stats?.risk.resolutionRate || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <Tabs defaultValue="efficiency" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="efficiency">效率分析</TabsTrigger>
          <TabsTrigger value="staff">工作人员统计</TabsTrigger>
          <TabsTrigger value="recommendations">智能推荐</TabsTrigger>
          <TabsTrigger value="logs">协同日志</TabsTrigger>
        </TabsList>

        {/* 效率分析 */}
        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 决策分布饼图 */}
            <Card>
              <CardHeader>
                <CardTitle>决策分布</CardTitle>
                <CardDescription>AI与工作人员的决策分布情况</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={decisionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {decisionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 协同趋势图 */}
            <Card>
              <CardHeader>
                <CardTitle>协同效率趋势</CardTitle>
                <CardDescription>协同参与度变化趋势</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="collaboration" stroke="#3b82f6" name="协同率" />
                    <Line type="monotone" dataKey="aiReply" stroke="#10b981" name="AI回复率" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 工作人员统计 */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>工作人员活跃度</CardTitle>
              <CardDescription>工作人员的活动统计和活跃度排名</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="消息" fill="#3b82f6" />
                  <Bar dataKey="指令" fill="#10b981" />
                  <Bar dataKey="处理" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 智能推荐 */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4">
            {recommendations.map((rec) => (
              <Alert key={rec.id}>
                <AlertTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(rec.type)}
                    <span>{rec.title}</span>
                    {getPriorityBadge(rec.priority)}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={rec.actionUrl}>
                      {rec.action}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </AlertTitle>
                <AlertDescription>{rec.description}</AlertDescription>
              </Alert>
            ))}

            {recommendations.length === 0 && (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>暂无推荐</AlertTitle>
                <AlertDescription>
                  当前系统运行良好，暂无需要优化的建议。我们会持续监控系统状态，并在需要时提供智能推荐。
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        {/* 协同日志 */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>协同决策日志</CardTitle>
              <CardDescription>完整的AI-工作人员协同决策记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>协同决策日志功能开发中...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
