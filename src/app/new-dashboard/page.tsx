'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Activity,
  Bot,
  Clock,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Users,
  MessageSquare,
  Zap,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Eye,
  MoreHorizontal,
  Bell,
  Server,
  Database,
  Cpu,
  HardDrive,
  Network,
  BarChart3,
  BarChart,
  LineChart,
  PieChart,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  Wifi,
  WifiOff,
  Flame,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSSE } from '@/hooks/useSSE';

// 类型定义
interface MonitorSummary {
  date: string;
  executions: {
    total: number;
    success: number;
    error: number;
    processing: number;
    successRate: string;
  };
  ai: {
    total: number;
    success: number;
    error: number;
    successRate: string;
  };
  sessions: {
    active: number;
    total: number;
  };
  aiErrors: number;
  totalCallbacks: number;
  aiSuccessRate: string;
  systemMetrics: {
    callbackReceived: number;
    callbackProcessed: number;
    callbackError: number;
    aiRequests: number;
    aiErrors: number;
  };
}

interface AlertOverview {
  total: number;
  pending: number;
  handled: number;
  ignored: number;
  sent: number;
  critical: number;
  warning: number;
  info: number;
  escalated: number;
  avgEscalationCount: number;
  maxEscalationCount: number;
  affectedGroups: number;
  affectedUsers: number;
  affectedChats: number;
  avgResponseTimeSeconds: number;
  levelDistribution: Array<{
    level: string;
    count: number;
    percentage: string;
  }>;
}

interface RobotStatus {
  id: string;
  robotId: string;
  name: string;
  nickname: string;
  status: string;
  isActive: boolean;
  messagesProcessed: number;
  errors: number;
  successRate: number;
  healthStatus: string;
  lastCheckTime: string;
}

interface ActiveGroup {
  rank: number;
  groupId: string;
  totalMessages: number;
  activityLevel: string;
}

interface ActiveUser {
  rank: number;
  userId: string;
  totalMessages: number;
  groupCount: number;
  groups: string[];
  avgMessagesPerGroup: number;
  activityLevel: string;
}

interface Session {
  sessionId: string;
  userId?: string;
  groupId?: string;
  userName?: string;
  groupName?: string;
  status: 'auto' | 'human';
  lastActiveTime: string;
  messageCount: number;
  lastMessage?: string;
}

export default function NewDashboard() {
  // 数据状态
  const [monitorSummary, setMonitorSummary] = useState<MonitorSummary | null>(null);
  const [alertOverview, setAlertOverview] = useState<AlertOverview | null>(null);
  const [robotsStatus, setRobotsStatus] = useState<RobotStatus[]>([]);
  const [activeGroups, setActiveGroups] = useState<ActiveGroup[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);

  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // 使用SSE监听全局消息（不指定sessionId，监听所有会话的消息）
  const { connected: sseConnected, messages: realtimeMessages } = useSSE({
    // 不指定sessionId，监听全局消息
    reconnectInterval: 5000,
    maxReconnectAttempts: 20,
    onMessage: (message) => {
      console.log('[Dashboard] 收到实时消息:', message);
    },
  });

  // 处理实时消息
  useEffect(() => {
    if (realtimeMessages.length > 0) {
      // 获取最新的消息
      const latestMessage = realtimeMessages[realtimeMessages.length - 1];
      
      console.log('[Dashboard] 处理实时消息:', latestMessage);
      
      // 更新最近活跃会话列表
      setRecentSessions(prevSessions => {
        const existingSession = prevSessions.find(s => s.sessionId === latestMessage.sessionId);
        
        if (existingSession) {
          // 更新现有会话
          return prevSessions.map(s => 
            s.sessionId === latestMessage.sessionId
              ? {
                  ...s,
                  lastMessage: latestMessage.content,
                  lastActiveTime: latestMessage.createdAt,
                  messageCount: s.messageCount + 1
                }
              : s
          );
        } else {
          // 添加新会话到列表顶部
          const newSession: Session = {
            sessionId: latestMessage.sessionId,
            userId: latestMessage.senderId,
            userName: latestMessage.senderName,
            status: latestMessage.senderType === 'ai' ? 'auto' : 'human',
            lastActiveTime: latestMessage.createdAt,
            messageCount: 1,
            lastMessage: latestMessage.content
          };
          
          // 最多保留10个会话
          return [newSession, ...prevSessions].slice(0, 10);
        }
      });

      // 更新活跃用户统计（如果发送者是用户）
      if (latestMessage.senderType === 'user') {
        setActiveUsers(prevUsers => {
          const existingUser = prevUsers.find(u => u.userId === latestMessage.senderId);
          
          if (existingUser) {
            return prevUsers.map(u => 
              u.userId === latestMessage.senderId
                ? { ...u, totalMessages: u.totalMessages + 1 }
                : u
            );
          } else {
            const newUser: ActiveUser = {
              rank: prevUsers.length + 1,
              userId: latestMessage.senderId!,
              totalMessages: 1,
              groupCount: 1,
              groups: [latestMessage.sessionId],
              avgMessagesPerGroup: 1,
              activityLevel: 'medium'
            };
            return [newUser, ...prevUsers].slice(0, 5);
          }
        });
      }
    }
  }, [realtimeMessages]);

  // 加载监控数据
  const loadMonitorData = async () => {
    try {
      const [summaryRes, robotsRes, groupsRes, usersRes] = await Promise.all([
        fetch('/api/monitoring/summary'),
        fetch('/api/monitoring/robots-status'),
        fetch('/api/monitoring/active-groups?limit=5'),
        fetch('/api/monitoring/active-users?limit=5')
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        if (data.code === 0) {
          setMonitorSummary(data.data);
        }
      }

      if (robotsRes.ok) {
        const data = await robotsRes.json();
        if (data.code === 0) {
          setRobotsStatus(data.data.robots || []);
        }
      }

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        if (data.code === 0) {
          setActiveGroups(data.data.groups || []);
        }
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        if (data.code === 0) {
          setActiveUsers(data.data.users || []);
        }
      }
    } catch (error) {
      console.error('加载监控数据失败:', error);
    }
  };

  // 加载告警数据
  const loadAlertData = async () => {
    try {
      const [overviewRes, sessionsRes] = await Promise.all([
        fetch('/api/alerts/analytics/overview'),
        fetch('/api/proxy/admin/sessions/active?limit=5')
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        if (data.code === 0) {
          setAlertOverview(data.data);
        }
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        if (data.code === 0) {
          setRecentSessions(data.data || []);
        }
      }
    } catch (error) {
      console.error('加载告警数据失败:', error);
    }
  };

  // 加载所有数据
  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadMonitorData(), loadAlertData()]);
    setIsLoading(false);
    setLastUpdateTime(new Date());
  };

  // 初始化加载
  useEffect(() => {
    loadData();
  }, []);

  // 自动刷新
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 60000); // 每60秒刷新一次
    return () => clearInterval(interval);
  }, []);

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 获取健康状态颜色
  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // 获取健康状态图标
  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  // 获取活动等级徽章
  const getActivityBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge variant="default" className="bg-red-500">高活跃</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-500 text-yellow-950">中活跃</Badge>;
      case 'low':
        return <Badge variant="outline">低活跃</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  // 获取机器人状态图标
  const getRobotStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Wifi className="h-4 w-4 text-green-500" />;
      case 'offline': return <WifiOff className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* 页面头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-500" />
              WorkTool AI 智能监控仪表盘
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              实时监控系统运行状态、告警数据和活跃指标
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">最后更新</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {lastUpdateTime.toLocaleTimeString('zh-CN')}
              </p>
            </div>
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>
      </div>

      {/* 顶部状态栏 */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {/* 系统状态 */}
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-none text-white shadow-lg shadow-green-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <CardTitle className="text-base">系统状态</CardTitle>
              </div>
              <Badge className="bg-white/20 text-white border-white/30">正常</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">运行中</div>
            <p className="text-sm text-white/80 mt-1">所有服务运行正常</p>
          </CardContent>
        </Card>

        {/* 在线机器人 */}
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-none text-white shadow-lg shadow-blue-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <CardTitle className="text-base">在线机器人</CardTitle>
              </div>
              <Badge className="bg-white/20 text-white border-white/30">
                {robotsStatus.filter(r => r.status === 'online').length}/{robotsStatus.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {robotsStatus.filter(r => r.status === 'online').length}
            </div>
            <p className="text-sm text-white/80 mt-1">
              共 {robotsStatus.length} 个机器人
            </p>
          </CardContent>
        </Card>

        {/* 今日回调 */}
        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-none text-white shadow-lg shadow-purple-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <CardTitle className="text-base">今日回调</CardTitle>
              </div>
              {monitorSummary?.executions.successRate && (
                <Badge className="bg-white/20 text-white border-white/30">
                  {monitorSummary.executions.successRate}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {monitorSummary?.executions.total || 0}
            </div>
            <p className="text-sm text-white/80 mt-1">
              成功 {monitorSummary?.executions.success || 0} / 失败 {monitorSummary?.executions.error || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* 左侧列 - 监控数据 */}
        <div className="space-y-6">
          {/* 今日监控摘要 */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                今日监控摘要
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 执行统计 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">回调处理</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {monitorSummary?.executions.success || 0}/{monitorSummary?.executions.total || 0}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                    style={{
                      width: `${monitorSummary?.executions.total
                        ? (monitorSummary.executions.success / monitorSummary.executions.total) * 100
                        : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* AI统计 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">AI响应</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {monitorSummary?.ai.successRate || '0.00%'}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                    style={{
                      width: `${parseFloat(monitorSummary?.ai.successRate || '0')}%`
                    }}
                  />
                </div>
              </div>

              {/* 会话统计 */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">活跃会话</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {monitorSummary?.sessions.active || 0}
                  </span>
                </div>
              </div>

              {/* 系统指标 */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-xs text-slate-600 dark:text-slate-400">AI错误</div>
                  <div className="text-lg font-bold text-red-500">
                    {monitorSummary?.aiErrors || 0}
                  </div>
                </div>
                <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-xs text-slate-600 dark:text-slate-400">回调错误</div>
                  <div className="text-lg font-bold text-orange-500">
                    {monitorSummary?.systemMetrics?.callbackError || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 机器人状态 */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-500" />
                机器人状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {robotsStatus.slice(0, 4).map((robot) => (
                  <div
                    key={robot.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getRobotStatusIcon(robot.status)}
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {robot.nickname || robot.name}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {robot.messagesProcessed} 条消息
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${getHealthStatusColor(robot.healthStatus)}`}>
                        {getHealthStatusIcon(robot.healthStatus)}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {robot.successRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 中间列 - 告警分析 */}
        <div className="space-y-6">
          {/* 告警概览 */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-5 w-5 text-red-500" />
                  告警概览
                </CardTitle>
                {(alertOverview?.critical || 0) > 0 && (
                  <Badge variant="destructive">
                    {alertOverview?.critical || 0} 紧急
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {/* 待处理 */}
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {alertOverview?.pending || 0}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">待处理</div>
                </div>

                {/* 已处理 */}
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {alertOverview?.handled || 0}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">已处理</div>
                </div>

                {/* 已升级 */}
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {alertOverview?.escalated || 0}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">已升级</div>
                </div>
              </div>

              {/* 告警级别分布 */}
              <div className="space-y-2 pt-2">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">级别分布</div>
                {alertOverview?.levelDistribution.map((item) => (
                  <div key={item.level} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 capitalize">{item.level}</span>
                      <span className="text-slate-900 dark:text-slate-100 font-medium">
                        {item.count} ({item.percentage})
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          item.level === 'critical' && 'bg-red-500',
                          item.level === 'warning' && 'bg-yellow-500',
                          item.level === 'info' && 'bg-blue-500'
                        )}
                        style={{ width: item.percentage }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 影响范围 */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-xs text-slate-600 dark:text-slate-400">受影响群</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {alertOverview?.affectedGroups || 0}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-600 dark:text-slate-400">受影响用户</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {alertOverview?.affectedUsers || 0}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-600 dark:text-slate-400">受影响会话</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {alertOverview?.affectedChats || 0}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 关键指标 */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                关键指标
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">平均响应时间</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {(alertOverview?.avgResponseTimeSeconds || 0).toFixed(2)}秒
                  </span>
                </div>
                <div className="flex items-center justify-between p-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">平均升级次数</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {(alertOverview?.avgEscalationCount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">最大升级次数</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {alertOverview?.maxEscalationCount || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧列 - 活跃排行 */}
        <div className="space-y-6">
          {/* Top活跃群组 */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Top活跃群组
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activeGroups.length > 0 ? (
                  activeGroups.slice(0, 5).map((group, index) => (
                    <div
                      key={group.groupId}
                      className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-sm font-bold w-5 h-5 rounded-full flex items-center justify-center',
                          index === 0 && 'bg-yellow-500 text-white',
                          index === 1 && 'bg-slate-400 text-white',
                          index === 2 && 'bg-amber-700 text-white',
                          index > 2 && 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        )}>
                          {index + 1}
                        </span>
                        <span className="text-sm text-slate-900 dark:text-slate-100">
                          群组 #{group.groupId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getActivityBadge(group.activityLevel)}
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {group.totalMessages}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
                    暂无活跃群组数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top活跃用户 */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-500" />
                Top活跃用户
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activeUsers.length > 0 ? (
                  activeUsers.slice(0, 5).map((user, index) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-sm font-bold w-5 h-5 rounded-full flex items-center justify-center',
                          index === 0 && 'bg-yellow-500 text-white',
                          index === 1 && 'bg-slate-400 text-white',
                          index === 2 && 'bg-amber-700 text-white',
                          index > 2 && 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        )}>
                          {index + 1}
                        </span>
                        <span className="text-sm text-slate-900 dark:text-slate-100">
                          用户 #{user.userId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getActivityBadge(user.activityLevel)}
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {user.totalMessages}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
                    暂无活跃用户数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 底部区域 - 实时会话 */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              实时会话
              {sseConnected && (
                <Badge variant="outline" className="ml-2 text-green-600 border-green-600 text-xs">
                  <Wifi className="h-3 w-3 mr-1" />
                  实时
                </Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => {}}>
              查看全部
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentSessions.length > 0 ? (
              recentSessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={session.status === 'auto' ? 'default' : 'secondary'}
                        className={session.status === 'auto' ? 'bg-green-500' : 'bg-blue-500'}
                      >
                        {session.status === 'auto' ? '自动' : '人工'}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {session.userName || '未知用户'} - {session.groupName || '未知群组'}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {session.lastMessage || '暂无消息'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {session.messageCount} 条消息
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        {formatTime(session.lastActiveTime)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                暂无活跃会话
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
