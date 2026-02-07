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

// 统一消息格式
interface UnifiedMessage {
  id: string;
  sessionId: string;
  content: string;
  userName?: string;
  groupName?: string;
  robotName?: string;
  status: 'processing' | 'ai_generated' | 'sent' | 'completed' | 'failed';
  intent?: string;
  startedAt: string;
  createdAt: string;
  completedAt?: string;
  duration?: number;
  senderType: 'user' | 'bot' | 'human';
  aiResponse?: string;
  errorMessage?: string;
  nodeType?: string;
  extraData?: any;
  isFromUser?: boolean;
  isFromBot?: boolean;
  isHuman?: boolean;
}

// 统计数据类型
interface MessageStats {
  total: number;
  processing: number;
  ai_generated: number;
  sent: number;
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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [allMessages, setAllMessages] = useState<any[]>([]);  // 所有会话的消息
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'ai_generated' | 'sent' | 'completed' | 'failed'>('all');
  const [expandedExecutionId, setExpandedExecutionId] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);

  // 加载最近50个会话的消息
  useEffect(() => {
    const loadAllMessages = async () => {
      if (sessions.length === 0) {
        return;
      }
      
      setIsLoadingMessages(true);
      const messages: any[] = [];
      
      // 只加载最近50个会话
      const sessionsToLoad = sessions.slice(0, 50);
      
      console.log(`[BusinessMessageMonitor] 开始加载 ${sessionsToLoad.length} 个会话的消息`);
      
      // 限制并发加载的会话数（最多10个同时）
      const batchSize = 10;
      for (let i = 0; i < sessionsToLoad.length; i += batchSize) {
        const batch = sessionsToLoad.slice(i, i + batchSize);
        const promises = batch.map(session => 
          fetch(`/api/admin/sessions/${session.sessionId}/messages`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.data) {
                // 为每条消息添加会话信息
                return (data.data as any[]).map(msg => ({
                  ...msg,
                  sessionId: session.sessionId,
                  userName: session.userName,
                  groupName: session.groupName,
                  robotName: session.robotName || session.robotNickname,
                }));
              }
              return [];
            })
            .catch(() => [])
        );
        
        const batchMessages = await Promise.all(promises);
        batchMessages.forEach(msgs => messages.push(...msgs));
      }
      
      console.log(`[BusinessMessageMonitor] 加载完成，共加载 ${messages.length} 条消息`);
      setAllMessages(messages);
      setIsLoadingMessages(false);
    };
    
    loadAllMessages();
  }, [sessions]);

  // 判断消息状态
  const determineStatus = (msg: any): 'processing' | 'ai_generated' | 'sent' | 'completed' | 'failed' => {
    // 用户消息：始终是 completed
    if (msg.isFromUser) {
      return 'completed';
    }
    
    // AI回复消息
    if (msg.isFromBot) {
      // 如果有错误，标记为失败
      if (msg.extraData?.error || msg.status === 'failed') {
        return 'failed';
      }
      
      // 如果有 extraData.ai_generated 标记，说明AI已生成
      if (msg.extraData?.ai_generated) {
        // 如果有 sent_at 或 status === 'sent'，说明已发送
        if (msg.extraData?.sent_at || msg.status === 'sent') {
          return 'sent';
        }
        return 'ai_generated';
      }
      
      // 默认为已完成（向后兼容）
      return 'completed';
    }
    
    // 人工消息
    if (msg.isHuman) {
      return 'completed';
    }
    
    return 'completed';
  };

  // 将所有消息转换为 UnifiedMessage 格式
  const unifiedMessages = useMemo(() => {
    return allMessages.map(msg => {
      const status = determineStatus(msg);
      
      // 确定发送者类型
      let senderType: 'user' | 'bot' | 'human' = 'user';
      if (msg.isFromBot) {
        senderType = 'bot';
      } else if (msg.isHuman) {
        senderType = 'human';
      }

      return {
        id: msg.id || `${msg.sessionId}-${msg.timestamp}-${Math.random()}`,
        sessionId: msg.sessionId,
        content: msg.content,
        userName: msg.userName,
        groupName: msg.groupName,
        robotName: msg.robotName,
        status,
        intent: msg.intent,
        startedAt: msg.timestamp,
        createdAt: msg.timestamp,
        completedAt: msg.completedAt || msg.timestamp,
        duration: msg.duration || 0,
        senderType,
        aiResponse: msg.isFromBot ? msg.content : undefined,
        errorMessage: msg.extraData?.error,
        nodeType: msg.extraData?.nodeType,
        extraData: msg.extraData,
        isFromUser: msg.isFromUser,
        isFromBot: msg.isFromBot,
        isHuman: msg.isHuman,
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // 按时间倒序
  }, [allMessages]);

  // 计算统计数据
  const stats = useMemo(() => {
    const total = unifiedMessages.length;
    const processing = unifiedMessages.filter(e => e.status === 'processing').length;
    const aiGenerated = unifiedMessages.filter(e => e.status === 'ai_generated').length;
    const sent = unifiedMessages.filter(e => e.status === 'sent').length;
    const completed = unifiedMessages.filter(e => e.status === 'completed').length;
    const failed = unifiedMessages.filter(e => e.status === 'failed').length;
    const successRate = total > 0 ? ((sent + completed) / (total - failed) * 100).toFixed(1) : '0.0';

    return {
      total,
      processing,
      ai_generated: aiGenerated,
      sent,
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
    // 重新加载所有会话的消息
    const loadAllMessages = async () => {
      setIsLoadingMessages(true);
      const messages: any[] = [];
      
      const sessionsToLoad = sessions.slice(0, 50);
      const batchSize = 10;
      for (let i = 0; i < sessionsToLoad.length; i += batchSize) {
        const batch = sessionsToLoad.slice(i, i + batchSize);
        const promises = batch.map(session => 
          fetch(`/api/admin/sessions/${session.sessionId}/messages`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.data) {
                return (data.data as any[]).map(msg => ({
                  ...msg,
                  sessionId: session.sessionId,
                  userName: session.userName,
                  groupName: session.groupName,
                  robotName: session.robotName || session.robotNickname,
                }));
              }
              return [];
            })
            .catch(() => [])
        );
        
        const batchMessages = await Promise.all(promises);
        batchMessages.forEach(msgs => messages.push(...msgs));
      }
      
      setAllMessages(messages);
      setIsLoadingMessages(false);
    };
    
    loadAllMessages();
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <Badge variant="outline" className="gap-1 border-blue-500 text-blue-500">
            <Activity className="h-3 w-3 animate-pulse" />
            处理中
          </Badge>
        );
      case 'ai_generated':
        return (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-500">
            <CheckCircle className="h-3 w-3" />
            AI已生成
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="outline" className="gap-1 border-emerald-600 text-emerald-600">
            <CheckCircle className="h-3 w-3" />
            已发送
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="gap-1 border-gray-500 text-gray-500">
            <CheckCircle className="h-3 w-3" />
            完成
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

  // 获取发送者徽章
  const getSenderDisplay = (senderType: 'user' | 'bot' | 'human') => {
    switch (senderType) {
      case 'user':
        return (
          <Badge variant="outline" className="gap-1 border-blue-500 text-blue-500 text-xs">
            <User className="h-3 w-3" />
            用户
          </Badge>
        );
      case 'bot':
        return (
          <Badge variant="outline" className="gap-1 border-purple-500 text-purple-500 text-xs">
            <Bot className="h-3 w-3" />
            AI回复
          </Badge>
        );
      case 'human':
        return (
          <Badge variant="outline" className="gap-1 border-orange-500 text-orange-500 text-xs">
            <User className="h-3 w-3" />
            人工回复
          </Badge>
        );
    }
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
            监控最近50个会话的所有消息（包括用户消息、AI回复、人工回复）
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingMessages}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingMessages ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 - 显示6个统计项 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-6">
          <Card className="border-primary/20 hover:border-primary/40 transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">总消息数</CardDescription>
              <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                实时统计
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-yellow-500/20 hover:border-yellow-500/40 transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">处理中</CardDescription>
              <CardTitle className="text-2xl font-bold text-yellow-500">{stats.processing}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3 w-3 text-yellow-500 animate-pulse" />
                AI生成中
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 hover:border-green-500/40 transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">AI已生成</CardDescription>
              <CardTitle className="text-2xl font-bold text-green-500">{stats.ai_generated}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3 text-green-500" />
                待发送
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-600/20 hover:border-emerald-600/40 transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">已发送</CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-600">{stats.sent}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3 text-emerald-600" />
                发送成功
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-500/20 hover:border-gray-500/40 transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">完成</CardDescription>
              <CardTitle className="text-2xl font-bold text-gray-500">{stats.completed}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3 text-gray-500" />
                用户消息
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20 hover:border-red-500/40 transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">失败</CardDescription>
              <CardTitle className="text-2xl font-bold text-red-500">{stats.failed}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <XCircle className="h-3 w-3 text-red-500" />
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
                <option value="ai_generated">AI已生成</option>
                <option value="sent">已发送</option>
                <option value="completed">完成</option>
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
              <CardTitle>消息列表</CardTitle>
              <CardDescription>
                显示最近的 {limit} 条消息（共 {filteredMessages.length} 条匹配）
              </CardDescription>
            </div>
            <Badge variant="outline">
              加载了 {sessions.length > 50 ? 50 : sessions.length} 个会话的消息
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {isLoadingMessages ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <RefreshCw className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                <p className="text-muted-foreground">加载消息中...</p>
              </div>
            ) : filteredExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无消息记录</p>
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
                              {getSenderDisplay(execution.senderType)}
                              {getStatusBadge(execution.status)}
                            </div>

                            {/* 消息内容 */}
                            <div className={`text-sm line-clamp-2 mb-2 ${
                              execution.senderType === 'bot' ? 'text-purple-700 dark:text-purple-300' : 
                              execution.senderType === 'human' ? 'text-orange-700 dark:text-orange-300' : 
                              'text-foreground'
                            }`}>
                              {execution.senderType === 'bot' && (
                                <span className="font-medium mr-2">AI回复：</span>
                              )}
                              {execution.senderType === 'human' && (
                                <span className="font-medium mr-2">人工回复：</span>
                              )}
                              {execution.content || '(空消息)'}
                            </div>

                            {/* 意图和时间 */}
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              {execution.intent && (
                                <Badge variant="outline" className="text-xs">
                                  意图: {execution.intent}
                                </Badge>
                              )}
                              <span className="text-muted-foreground">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {formatTime(execution.startedAt)}
                              </span>
                              {execution.duration && execution.duration > 0 && (
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

                        {/* 可展开的详细信息（AI回复的完整内容、错误信息等） */}
                        {(execution.senderType === 'bot' || execution.errorMessage || execution.extraData) && (
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
                                {/* AI回复的完整内容 */}
                                {execution.senderType === 'bot' && execution.content && (
                                  <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                                    <div className="text-sm font-medium mb-1 text-purple-700 dark:text-purple-300">
                                      <Bot className="h-3 w-3 inline mr-1" />
                                      AI回复内容:
                                    </div>
                                    <div className="text-sm break-words whitespace-pre-wrap">
                                      {execution.content}
                                    </div>
                                  </div>
                                )}

                                {/* 额外信息 */}
                                {execution.extraData && Object.keys(execution.extraData).length > 0 && (
                                  <div className="bg-gray-50 dark:bg-gray-950/20 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                                    <div className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                      额外信息:
                                    </div>
                                    <div className="text-xs break-words">
                                      {JSON.stringify(execution.extraData, null, 2)}
                                    </div>
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
