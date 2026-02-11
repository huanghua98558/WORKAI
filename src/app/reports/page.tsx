'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Calendar,
  TrendingUp,
  Users,
  BarChart3,
  Download,
  RefreshCw,
  Bot,
  Activity,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Clock,
  Star,
  Zap,
  Target,
  Filter,
  ChevronRight,
  Calendar as CalendarIcon,
  BarChart,
  LineChart,
  PieChart
} from 'lucide-react';

// 报告类型接口
interface Report {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  title: string;
  description: string;
  date: string;
  period: {
    start: string;
    end: string;
  };
  stats: {
    totalSessions: number;
    totalMessages: number;
    aiReplies: number;
    staffReplies: number;
    satisfactionRate: number;
    avgResponseTime: number;
  };
  charts: any[];
  createdAt: string;
}

// 用户个人报告接口
interface UserReport {
  userId: string;
  userName: string;
  sessions: number;
  messages: number;
  satisfaction: number;
  avgResponseTime: number;
  lastActive: string;
}

// 工作人员绩效报告接口
interface StaffReport {
  staffId: string;
  staffName: string;
  sessions: number;
  messages: number;
  satisfaction: number;
  avgResponseTime: number;
  efficiency: number;
  activeHours: number;
}

// 机器人效率报告接口
interface RobotReport {
  robotId: string;
  robotName: string;
  totalDecisions: number;
  aiReplyCount: number;
  successRate: number;
  avgResponseTime: number;
  collaborationRate: number;
  uptime: number;
}

export default function ReportsDashboard() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [staffReports, setStaffReports] = useState<StaffReport[]>([]);
  const [robotReports, setRobotReports] = useState<RobotReport[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // 加载报告数据
  useEffect(() => {
    loadReports();
  }, [selectedPeriod, selectedDate]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // 并行加载所有报告数据
      const [reportsRes, userRes, staffRes, robotRes] = await Promise.all([
        fetch(`/api/reports?period=${selectedPeriod}&date=${selectedDate}`),
        fetch(`/api/reports/users?period=${selectedPeriod}`),
        fetch(`/api/reports/staff?period=${selectedPeriod}`),
        fetch(`/api/reports/robots?period=${selectedPeriod}`)
      ]);

      if (!reportsRes.ok || !userRes.ok || !staffRes.ok || !robotRes.ok) {
        throw new Error('加载报告数据失败');
      }

      const reportsData = await reportsRes.json();
      const userData = await userRes.json();
      const staffData = await staffRes.json();
      const robotData = await robotRes.json();

      if (reportsData.code === 0) setReports(reportsData.data.reports || []);
      if (userData.code === 0) setUserReports(userData.data.users || []);
      if (staffData.code === 0) setStaffReports(staffData.data.staff || []);
      if (robotData.code === 0) setRobotReports(robotData.data.robots || []);

    } catch (err) {
      console.error('[ReportsDashboard] 加载报告数据失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadReports();
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/download`);
      if (!res.ok) throw new Error('下载失败');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ReportsDashboard] 下载报告失败:', err);
      alert('下载报告失败，请稍后重试');
    }
  };

  const handleExportCSV = async (type: 'users' | 'staff' | 'robots') => {
    try {
      const res = await fetch(`/api/reports/export/${type}?period=${selectedPeriod}`);
      if (!res.ok) throw new Error('导出失败');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report-${selectedPeriod}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ReportsDashboard] 导出CSV失败:', err);
      alert('导出失败，请稍后重试');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + '万';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return (num * 100).toFixed(1) + '%';
  };

  const formatTime = (seconds: number) => {
    if (seconds >= 3600) return (seconds / 3600).toFixed(1) + 'h';
    if (seconds >= 60) return (seconds / 60).toFixed(1) + 'm';
    return Math.round(seconds) + 's';
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            数据报告中心
          </h1>
          <p className="text-muted-foreground mt-1">
            每日/每周/每月报告 · 用户个人报告 · 工作人员绩效 · 机器人效率
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">每日报告</SelectItem>
              <SelectItem value="weekly">每周报告</SelectItem>
              <SelectItem value="monthly">每月报告</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            title="刷新数据"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 主内容标签页 */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">总览报告</TabsTrigger>
          <TabsTrigger value="users">用户报告</TabsTrigger>
          <TabsTrigger value="staff">工作人员报告</TabsTrigger>
          <TabsTrigger value="robots">机器人报告</TabsTrigger>
          <TabsTrigger value="charts">数据可视化</TabsTrigger>
        </TabsList>

        {/* 总览报告 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总报告数</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">
                    {reports.length}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {selectedPeriod === 'daily' ? '每日' : selectedPeriod === 'weekly' ? '每周' : '每月'}报告
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
                    {formatNumber(reports.reduce((sum, r) => sum + r.stats.totalSessions, 0))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  平均满意度: {reports.length > 0 ? formatPercentage(reports.reduce((sum, r) => sum + r.stats.satisfactionRate, 0) / reports.length) : '0%'}
                </p>
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
                    {formatNumber(reports.reduce((sum, r) => sum + r.stats.aiReplies, 0))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  工作人员: {formatNumber(reports.reduce((sum, r) => sum + r.stats.staffReplies, 0))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">
                    {reports.length > 0 ? formatTime(reports.reduce((sum, r) => sum + r.stats.avgResponseTime, 0) / reports.length) : '0s'}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  平均响应时间
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 报告列表 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>报告列表</CardTitle>
                <CardDescription>按时间顺序排列的所有报告</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-3">
                      <Skeleton className="h-6 w-[300px]" />
                      <Skeleton className="h-4 w-[500px]" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-[80px]" />
                        <Skeleton className="h-6 w-[80px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无报告数据</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{report.title}</h4>
                            <Badge variant="outline">
                              {selectedPeriod === 'daily' ? '每日' : selectedPeriod === 'weekly' ? '每周' : '每月'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(report.date)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {report.description}
                          </p>
                          <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              <span>会话: {formatNumber(report.stats.totalSessions)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-muted-foreground" />
                              <span>消息: {formatNumber(report.stats.totalMessages)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Bot className="w-3 h-3 text-muted-foreground" />
                              <span>AI: {formatNumber(report.stats.aiReplies)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-muted-foreground" />
                              <span>满意度: {formatPercentage(report.stats.satisfactionRate)}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReport(report.id)}
                          className="gap-2"
                        >
                          <Download className="w-4 h-4" />
                          下载
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 用户报告 */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>用户个人报告</CardTitle>
                <CardDescription>用户使用情况统计</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCSV('users')}
                disabled={loading}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                导出CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[150px]" />
                      </div>
                      <Skeleton className="h-8 w-[100px]" />
                    </div>
                  ))}
                </div>
              ) : userReports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无用户报告数据</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userReports.map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg">
                        {user.userName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{user.userName}</h4>
                        <p className="text-xs text-muted-foreground">
                          会话: {user.sessions} · 消息: {user.messages}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <div className="font-semibold text-yellow-600">
                            <Star className="w-3 h-3 inline mr-1" />
                            {user.satisfaction.toFixed(1)}
                          </div>
                          <div className="text-muted-foreground">满意度</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-blue-600">{formatTime(user.avgResponseTime)}</div>
                          <div className="text-muted-foreground">响应时间</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 工作人员报告 */}
        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>工作人员绩效报告</CardTitle>
                <CardDescription>工作人员工作绩效统计</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCSV('staff')}
                disabled={loading}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                导出CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[150px]" />
                      </div>
                      <Skeleton className="h-8 w-[100px]" />
                    </div>
                  ))}
                </div>
              ) : staffReports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无工作人员报告数据</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {staffReports.map((staff) => (
                    <div
                      key={staff.staffId}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold text-lg">
                        {staff.staffName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{staff.staffName}</h4>
                        <p className="text-xs text-muted-foreground">
                          会话: {staff.sessions} · 消息: {staff.messages} · 工时: {staff.activeHours.toFixed(1)}h
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <div className="font-semibold text-yellow-600">
                            <Star className="w-3 h-3 inline mr-1" />
                            {staff.satisfaction.toFixed(1)}
                          </div>
                          <div className="text-muted-foreground">满意度</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-purple-600">
                            <Zap className="w-3 h-3 inline mr-1" />
                            {staff.efficiency.toFixed(1)}%
                          </div>
                          <div className="text-muted-foreground">效率</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-blue-600">{formatTime(staff.avgResponseTime)}</div>
                          <div className="text-muted-foreground">响应时间</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 机器人报告 */}
        <TabsContent value="robots" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>机器人效率报告</CardTitle>
                <CardDescription>机器人运行效率统计</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCSV('robots')}
                disabled={loading}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                导出CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[150px]" />
                      </div>
                      <Skeleton className="h-8 w-[100px]" />
                    </div>
                  ))}
                </div>
              ) : robotReports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无机器人报告数据</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {robotReports.map((robot) => (
                    <div
                      key={robot.robotId}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-white font-bold text-lg">
                        <Bot className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{robot.robotName}</h4>
                        <p className="text-xs text-muted-foreground">
                          决策: {robot.totalDecisions} · AI回复: {robot.aiReplyCount} · 运行时间: {formatTime(robot.uptime)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <div className="font-semibold text-green-600">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            {formatPercentage(robot.successRate)}
                          </div>
                          <div className="text-muted-foreground">成功率</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-blue-600">
                            <Activity className="w-3 h-3 inline mr-1" />
                            {formatPercentage(robot.collaborationRate)}
                          </div>
                          <div className="text-muted-foreground">协同率</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-orange-600">{formatTime(robot.avgResponseTime)}</div>
                          <div className="text-muted-foreground">响应时间</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 数据可视化 */}
        <TabsContent value="charts" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="w-5 h-5" />
                  会话趋势
                </CardTitle>
                <CardDescription>会话数量随时间变化</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>图表开发中</p>
                    <p className="text-xs mt-2">将集成 Chart.js 或 Recharts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  消息类型分布
                </CardTitle>
                <CardDescription>不同类型消息的比例</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>图表开发中</p>
                    <p className="text-xs mt-2">将集成 Chart.js 或 Recharts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  满意度趋势
                </CardTitle>
                <CardDescription>用户满意度变化趋势</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <LineChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>图表开发中</p>
                    <p className="text-xs mt-2">将集成 Chart.js 或 Recharts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  响应时间分析
                </CardTitle>
                <CardDescription>响应时间统计分布</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>图表开发中</p>
                    <p className="text-xs mt-2">将集成 Chart.js 或 Recharts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
