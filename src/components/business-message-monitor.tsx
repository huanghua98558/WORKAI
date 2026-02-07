'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  AlertCircle,
  TrendingUp,
  User,
  Bot,
  ArrowRight,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

// 会话数据类型
interface Session {
  sessionId: string;
  userName: string;
  groupName: string;
  robotId: string;
  robotName: string;
  robotNickname?: string;
  lastMessage: string;
  isFromUser: boolean;
  isFromBot: boolean;
  isHuman: boolean;
  lastActiveTime: string;
  messageCount: number;
  userMessages: number;
  aiReplyCount: number;
  humanReplyCount: number;
  replyCount: number;
  lastIntent: string;
  status: 'auto' | 'human';
  startTime: string;
  company?: string;
}

// 统一消息格式（兼容原接口）
// 统一消息格式
interface UnifiedMessage {
  id: string;
  sessionId: string;
  content: string;
  userName?: string;
  groupName?: string;
  robotName?: string;
  // 状态定义：
  // - processing: 处理中（AI正在生成回复）
  // - ai_generated: AI已生成回复（但可能还未发送到机器人）
  // - sent: 已发送到机器人
  // - completed: 完成（用户消息或已知的成功消息）
  // - failed: 失败
  status: 'processing' | 'ai_generated' | 'sent' | 'completed' | 'failed';
  intent?: string;
  startedAt: string;
  createdAt: string;
  completedAt?: string;
  duration?: number;
  senderType: 'user' | 'bot' | 'human';
  aiResponse?: string;  // AI回复内容
  errorMessage?: string;  // 错误信息
  nodeType?: string;  // 节点类型
  extraData?: any;
  // 消息属性
  isFromUser?: boolean;
  isFromBot?: boolean;
  isHuman?: boolean;
}

// 统计数据类型
interface MessageStats {
  total: number;
  processing: number;
  completed: number;
  failed: number;
  success_rate: string;
}

// 组件Props
interface BusinessMessageMonitorProps {
  /** 会话列表数据 */
  sessions: Session[];
  /** 跳转到会话管理的回调函数 */
  onNavigateToSession?: (sessionId: string) => void;
}

export default function BusinessMessageMonitor({
  sessions,
  onNavigateToSession
}: BusinessMessageMonitorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');
  const [expandedExecutionId, setExpandedExecutionId] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);

  // 将 sessions 的最新消息转换为 UnifiedMessage 格式
  const unifiedMessages = useMemo(() => {
    return sessions
      .filter(session => session.lastMessage) // 只包含有最新消息的会话
      .map(session => {
        // 根据消息类型确定状态
        let status: 'processing' | 'completed' | 'failed' = 'completed';
        if (session.isFromUser) {
          status = 'completed';
        } else if (session.isFromBot) {
          status = 'completed';
        } else if (session.isHuman) {
          status = 'completed';
        }

        // 确定发送者类型
        let senderType: 'user' | 'bot' | 'human' = 'user';
        if (session.isFromBot) {
          senderType = 'bot';
        } else if (session.isHuman) {
          senderType = 'human';
        }

        return {
          id: `${session.sessionId}-last`, // 使用 sessionId 生成唯一ID
          sessionId: session.sessionId,
          content: session.lastMessage || '',
          userName: session.userName,
          groupName: session.groupName,
          robotName: session.robotName || session.robotNickname,
          status,
          intent: session.lastIntent,
          startedAt: session.lastActiveTime,
          createdAt: session.lastActiveTime,
          completedAt: session.lastActiveTime,
          duration: 0,
          senderType,
          aiResponse: undefined,
          errorMessage: undefined,
          nodeType: undefined,
          extraData: {
            messageCount: session.messageCount,
            aiReplyCount: session.aiReplyCount,
            humanReplyCount: session.humanReplyCount,
            status: session.status,
          }
        };
      });
  }, [sessions]);

  // 计算统计数据
  const stats = useMemo(() => {
    const total = unifiedMessages.length;
    const processing = unifiedMessages.filter(e => e.status === 'processing').length;
    const completed = unifiedMessages.filter(e => e.status === 'completed').length;
    const failed = unifiedMessages.filter(e => e.status === 'failed').length;
    const successRate = total > 0 ? ((completed / (completed + failed)) * 100).toFixed(1) : '0.0';

    return {
      total,
      processing,
      completed,
      failed,
      success_rate: successRate
    };
  }, [unifiedMessages]);

  // 过滤消息记录
  const filteredMessages = useMemo(() => {
    return unifiedMessages.filter(msg => {
      const matchesSearch = !searchQuery ||
        msg.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.groupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.robotName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || msg.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [unifiedMessages, searchQuery, statusFilter]);

  // 应用分页限制
  const filteredExecutions = useMemo(() => {
    return filteredMessages.slice(0, limit);
  }, [filteredMessages, limit]);

  // 处理刷新
  const handleRefresh = () => {
    // 由于使用 props 数据，刷新需要由父组件处理
    // 这里只是触发一个通知
    console.log('[BusinessMessageMonitor] 刷新请求（需要父组件更新数据）');
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  };

  // 获取状态图标和颜色
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <Badge variant="outline" className="gap-1 border-blue-500 text-blue-500">
            <Activity className="h-3 w-3 animate-pulse" />
            处理中
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-500">
            <CheckCircle className="h-3 w-3" />
            成功
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            失败
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 格式化持续时间
  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // 获取决策类型显示
  const getDecisionDisplay = (execution: UnifiedMessage) => {
    const action = execution.extraData?.decision?.action;
    if (action === 'auto_reply') {
      return (
        <Badge variant="outline" className="gap-1 border-green-500 text-green-500 text-xs">
          <Bot className="h-3 w-3" />
          自动回复
        </Badge>
      );
    } else if (action === 'human_handover') {
      return (
        <Badge variant="outline" className="gap-1 border-blue-500 text-blue-500 text-xs">
          <User className="h-3 w-3" />
          人工接管
        </Badge>
      );
    } else if (action === 'human_reply') {
      return (
        <Badge variant="outline" className="gap-1 border-purple-500 text-purple-500 text-xs">
          <User className="h-3 w-3" />
          人工回复
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-500" />
            业务消息监控
          </h3>
          <p className="text-muted-foreground mt-1">
            实时监控业务消息处理状态、AI响应和执行流程
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-primary/20 hover:border-primary/40 transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">总消息数</CardDescription>
              <CardTitle className="text-3xl font-bold">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                实时统计
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-yellow-500/20 hover:border-yellow-500/40 transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">处理中</CardDescription>
              <CardTitle className="text-3xl font-bold text-yellow-500">{stats.processing}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />
                进行中
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 hover:border-green-500/40 transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">成功</CardDescription>
              <CardTitle className="text-3xl font-bold text-green-500">{stats.completed}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                成功率: {stats.success_rate}%
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20 hover:border-red-500/40 transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">失败</CardDescription>
              <CardTitle className="text-3xl font-bold text-red-500">{stats.failed}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="h-4 w-4 text-red-500" />
                需要关注
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 搜索和过滤 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索消息内容、用户名、群组名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">全部状态</option>
                <option value="processing">处理中</option>
                <option value="completed">成功</option>
                <option value="failed">失败</option>
              </select>
              <select
                value={limit.toString()}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="20">20条</option>
                <option value="50">50条</option>
                <option value="100">100条</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 消息列表 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>消息执行列表</CardTitle>
              <CardDescription>
                显示最近的 {limit} 条消息处理记录
              </CardDescription>
            </div>
            <Badge variant="outline">
              共 {filteredExecutions.length} 条
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {filteredExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {isLoading ? '加载中...' : '暂无消息记录'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExecutions.map((execution) => (
                  <Card
                    key={execution.id}
                    className="hover:border-primary/40 transition-all"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* 第一行：基本信息 */}
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            {/* 用户/群组/机器人信息 */}
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              {execution.userName && (
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  <User className="h-3 w-3 mr-1" />
                                  {execution.userName}
                                </Badge>
                              )}
                              {execution.groupName && (
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  {execution.groupName}
                                </Badge>
                              )}
                              {execution.robotName && (
                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                  <Bot className="h-3 w-3 mr-1" />
                                  {execution.robotName}
                                </Badge>
                              )}
                            </div>

                            {/* 用户消息内容 */}
                            <div className="text-sm text-foreground line-clamp-2 mb-2">
                              {execution.content || '(空消息)'}
                            </div>

                            {/* 决策、状态和时间 */}
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              {getDecisionDisplay(execution)}
                              {getStatusBadge(execution.status)}
                              <span className="text-muted-foreground">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {formatTime(execution.startedAt)}
                              </span>
                              {execution.duration && (
                                <span className="text-muted-foreground">
                                  耗时: {formatDuration(execution.duration)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 右侧操作按钮 */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {onNavigateToSession && execution.sessionId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => onNavigateToSession(execution.sessionId)}
                              >
                                <ExternalLink className="h-3 w-3" />
                                查看会话
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* 可展开的详细信息 */}
                        {(execution.aiResponse || execution.intent || execution.errorMessage || execution.nodeType) && (
                          <div className="border-t pt-3">
                            <button
                              onClick={() => setExpandedExecutionId(
                                expandedExecutionId === execution.id ? null : execution.id
                              )}
                              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                            >
                              {expandedExecutionId === execution.id ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              查看详情
                            </button>

                            {expandedExecutionId === execution.id && (
                              <div className="mt-3 space-y-2">
                                {/* AI响应 */}
                                {execution.aiResponse && (
                                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                    <div className="text-sm font-medium mb-1 text-blue-700 dark:text-blue-300">
                                      <Bot className="h-3 w-3 inline mr-1" />
                                      AI回复:
                                    </div>
                                    <div className="text-sm break-words">
                                      {execution.aiResponse}
                                    </div>
                                  </div>
                                )}

                                {/* 意图识别 */}
                                {execution.intent && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-xs">
                                      意图: {execution.intent}
                                    </Badge>
                                    {execution.nodeType && (
                                      <Badge variant="secondary" className="text-xs">
                                        节点: {execution.nodeType}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* 错误信息 */}
                                {execution.errorMessage && (
                                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                                    <div className="text-sm font-medium mb-1 text-red-700 dark:text-red-300">
                                      <AlertCircle className="h-3 w-3 inline mr-1" />
                                      错误信息:
                                    </div>
                                    <div className="text-sm break-words text-red-600 dark:text-red-400">
                                      {execution.errorMessage}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
