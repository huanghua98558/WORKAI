/**
 * 新仪表盘组件
 * 用于替换原首页中的仪表盘部分
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Bot,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Users,
  MessageSquare,
  RefreshCw,
  Bell,
  Wifi,
  WifiOff,
  Flame,
  Minus,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { TokenStatsCard } from '@/components/token-stats';

// 类型定义（需要与主页面保持一致）
interface MonitorData {
  date: string;
  system: {
    callback_received: number;
    callback_processed: number;
    callback_error: number;
    ai_requests: number;
    ai_errors: number;
  };
  ai: {
    intentRecognition: { successRate: string };
    serviceReply: { successRate: string };
    chat: { successRate: string };
  };
  summary: {
    totalCallbacks: number;
    successRate: string;
    aiSuccessRate: string;
  };
}

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

interface Robot {
  id: string;
  name: string;
  robotId: string;
  nickname?: string;
  status: string;
  isActive: boolean;
  messagesProcessed?: number;
  successRate?: number;
  healthStatus?: string;
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

interface NewDashboardTabProps {
  monitorData: MonitorData | null;
  alertData: AlertData | null;
  alertStats: AlertData | null;
  robots: Robot[];
  sessions: Session[];
  lastUpdateTime: Date;
  loadData: () => void;
  isLoading: boolean;
  setActiveTab: (tab: string) => void;
}

interface AlertData {
  total: number;
  byLevel: {
    critical: number;
    warning: number;
    info: number;
  };
  recent: any[];
}

export default function NewDashboardTab({
  monitorData,
  alertStats,
  robots,
  sessions,
  lastUpdateTime,
  loadData,
  isLoading,
  setActiveTab
}: NewDashboardTabProps) {
  // 调试日志：输出加载状态
  console.log('[NewDashboardTab] isLoading:', isLoading, 'monitorData:', !!monitorData, 'sessions length:', sessions?.length);

  // 兼容新旧接口数据结构，转换为 MonitorSummary
  const monitorSummary: MonitorSummary | null = (() => {
    if (!monitorData) return null;

    // 检查是否为新接口数据结构（MonitorSummary）
    if ('executions' in monitorData) {
      return monitorData as unknown as MonitorSummary;
    }

    // 老接口数据结构（MonitorData），需要转换
    const oldData = monitorData as any;
    if (!oldData.summary) return null;

    return {
      date: oldData.date,
      executions: {
        total: oldData.summary.totalCallbacks,
        success: oldData.system?.callback_processed || 0,
        error: oldData.system?.callback_error || 0,
        processing: 0,
        successRate: oldData.summary.successRate
      },
      ai: {
        total: 0,
        success: 0,
        error: oldData.system?.ai_errors || 0,
        successRate: oldData.summary.aiSuccessRate
      },
      sessions: {
        active: sessions.length,
        total: sessions.length
      },
      aiErrors: oldData.system?.ai_errors || 0,
      totalCallbacks: oldData.summary.totalCallbacks,
      aiSuccessRate: oldData.summary.aiSuccessRate,
      systemMetrics: {
        callbackReceived: oldData.system?.callback_received || 0,
        callbackProcessed: oldData.system?.callback_processed || 0,
        callbackError: oldData.system?.callback_error || 0,
        aiRequests: oldData.system?.ai_requests || 0,
        aiErrors: oldData.system?.ai_errors || 0
      }
    };
  })();
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
      case 'critical': return <AlertCircle className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
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

  // 兼容新旧接口数据结构，转换告警数据
  const alertOverview: AlertOverview | null = (() => {
    if (!alertStats) return null;

    // 检查是否为新接口数据结构（AlertOverview）
    if ('critical' in alertStats && !('byLevel' in alertStats)) {
      return alertStats as AlertOverview;
    }

    // 老接口数据结构（AlertData），需要转换
    const oldData = alertStats as any;
    if (!oldData.byLevel) return null;

    const total = oldData.total || 0;
    const byLevel = oldData.byLevel || { critical: 0, warning: 0, info: 0 };

    return {
      total: total,
      pending: total - byLevel.critical - byLevel.warning - byLevel.info,
      handled: 0,
      ignored: 0,
      sent: 0,
      critical: byLevel.critical,
      warning: byLevel.warning,
      info: byLevel.info,
      escalated: 0,
      avgEscalationCount: 0,
      maxEscalationCount: 0,
      affectedGroups: 0,
      affectedUsers: 0,
      affectedChats: 0,
      avgResponseTimeSeconds: 0,
      levelDistribution: [
        { level: 'critical', count: byLevel.critical, percentage: total > 0 ? `${(byLevel.critical / total * 100).toFixed(1)}%` : '0%' },
        { level: 'warning', count: byLevel.warning, percentage: total > 0 ? `${(byLevel.warning / total * 100).toFixed(1)}%` : '0%' },
        { level: 'info', count: byLevel.info, percentage: total > 0 ? `${(byLevel.info / total * 100).toFixed(1)}%` : '0%' }
      ]
    };
  })();

  // 使用 sessions 和 robots 创建模拟的活跃数据
  const onlineRobots = robots.filter(r => r.status === 'online' && r.isActive);
  const activeGroups = sessions.slice(0, 5).map((s, i) => ({
    rank: i + 1,
    groupId: s.groupId || `group-${i}`,
    totalMessages: s.messageCount,
    activityLevel: s.messageCount > 10 ? 'high' : s.messageCount > 5 ? 'medium' : 'low'
  }));
  const activeUsers = sessions.slice(0, 5).map((s, i) => ({
    rank: i + 1,
    userId: s.userId || `user-${i}`,
    totalMessages: s.messageCount,
    groupCount: 1,
    groups: [s.groupName || '未知群组'],
    avgMessagesPerGroup: s.messageCount,
    activityLevel: s.messageCount > 10 ? 'high' : s.messageCount > 5 ? 'medium' : 'low'
  }));

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

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-muted-foreground">加载仪表盘数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部状态栏 */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* 系统状态 */}
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-none text-white shadow-lg shadow-green-500/20 flex flex-col min-h-32">
          <CardHeader className="pb-2 flex-shrink-0 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <CardTitle className="text-base font-semibold">系统状态</CardTitle>
              </div>
              <Badge className="bg-white/20 text-white border-white/30">正常</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center px-5 py-3">
            <div className="text-3xl font-bold leading-tight">运行中</div>
            <p className="text-sm text-white/80 mt-1.5">所有服务运行正常</p>
          </CardContent>
        </Card>

        {/* 在线机器人 */}
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-none text-white shadow-lg shadow-blue-500/20 flex flex-col min-h-32">
          <CardHeader className="pb-2 flex-shrink-0 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <CardTitle className="text-base font-semibold">在线机器人</CardTitle>
              </div>
              <Badge className="bg-white/20 text-white border-white/30">
                {onlineRobots.length}/{robots.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center px-5 py-3">
            <div className="text-3xl font-bold leading-tight">{onlineRobots.length}</div>
            <p className="text-sm text-white/80 mt-1.5">共 {robots.length} 个机器人</p>
          </CardContent>
        </Card>

        {/* 今日回调 */}
        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-none text-white shadow-lg shadow-purple-500/20 flex flex-col min-h-32">
          <CardHeader className="pb-2 flex-shrink-0 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <CardTitle className="text-base font-semibold">今日回调</CardTitle>
              </div>
              {monitorSummary?.executions?.successRate && (
                <Badge className="bg-white/20 text-white border-white/30">
                  {monitorSummary.executions.successRate}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center px-5 py-3">
            <div className="text-3xl font-bold leading-tight">{monitorSummary?.executions?.total || 0}</div>
            <p className="text-sm text-white/80 mt-1.5 leading-tight">
              成功 {monitorSummary?.executions?.success || 0} / 失败 {monitorSummary?.executions?.error || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* 左侧列 - 监控数据 */}
        <div className="space-y-6">
          {/* Token消耗 */}
          <TokenStatsCard />

          {/* 今日监控摘要 */}
          <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col h-[420px]">
            <CardHeader className="flex-shrink-0 py-3 px-6">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                今日监控摘要
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 px-6 pb-6">
              {/* 执行统计 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">回调处理</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {monitorSummary?.executions?.success || 0}/{monitorSummary?.executions?.total || 0}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                    style={{
                      width: `${monitorSummary?.executions?.total
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
                    {monitorSummary?.ai?.successRate || '0.00%'}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                    style={{
                      width: `${parseFloat(monitorSummary?.ai?.successRate || '0')}%`
                    }}
                  />
                </div>
              </div>

              {/* 会话统计 */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">活跃会话</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {monitorSummary?.sessions?.active || sessions.length}
                  </span>
                </div>
              </div>

              {/* 系统指标 */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400">AI错误</div>
                  <div className="text-xl font-bold text-red-500">
                    {monitorSummary?.aiErrors || 0}
                  </div>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400">回调错误</div>
                  <div className="text-xl font-bold text-orange-500">
                    {monitorSummary?.systemMetrics?.callbackError || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 中间列 - 告警分析 */}
        <div className="space-y-6">
          {/* 机器人状态 */}
          <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col h-[420px]">
            <CardHeader className="flex-shrink-0 py-3 px-6">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-500" />
                机器人状态
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 px-6 pb-6">
              <div className="space-y-3">
                {onlineRobots.slice(0, 4).map((robot) => (
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
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {robot.messagesProcessed || 0} 条消息
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${getHealthStatusColor(robot.healthStatus || 'healthy')}`}>
                        {getHealthStatusIcon(robot.healthStatus || 'healthy')}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {robot.successRate || 100}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 告警概览 */}
          <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col h-[420px]">
            <CardHeader className="flex-shrink-0 py-3 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
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
            <CardContent className="flex-1 space-y-4 px-6 pb-6">
              <div className="grid grid-cols-3 gap-3">
                {/* 待处理 */}
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {alertOverview?.pending || 0}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">待处理</div>
                </div>

                {/* 已处理 */}
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {alertOverview?.handled || 0}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">已处理</div>
                </div>

                {/* 已升级 */}
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {alertOverview?.escalated || 0}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">已升级</div>
                </div>
              </div>

              {/* 告警级别分布 */}
              <div className="space-y-2 pt-2">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">级别分布</div>
                {alertOverview?.levelDistribution.map((item) => (
                  <div key={item.level} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
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
                    <div className="text-sm text-slate-600 dark:text-slate-400">受影响群</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {alertOverview?.affectedGroups || 0}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-600 dark:text-slate-400">受影响用户</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {alertOverview?.affectedUsers || 0}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-600 dark:text-slate-400">受影响会话</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {alertOverview?.affectedChats || 0}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧列 - 活跃排行 */}
        <div className="space-y-6">
          {/* Top活跃群组 */}
          <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col h-[420px]">
            <CardHeader className="flex-shrink-0 py-3 px-6">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Top活跃群组
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 px-6 pb-6">
              <div className="space-y-2">
                {activeGroups.length > 0 ? (
                  activeGroups.map((group, index) => (
                    <div
                      key={`${group.groupId}-${index}`}
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
          <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col h-[420px]">
            <CardHeader className="flex-shrink-0 py-3 px-6">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-500" />
                Top活跃用户
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 px-6 pb-6">
              <div className="space-y-2">
                {activeUsers.length > 0 ? (
                  activeUsers.map((user, index) => (
                    <div
                      key={`${user.userId}-${index}`}
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
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('sessions')}>
              查看全部
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sessions.length > 0 ? (
              sessions.slice(0, 5).map((session) => (
                <div
                  key={session.sessionId}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  onClick={() => setActiveTab('sessions')}
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
