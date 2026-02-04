'use client';

import React, { useState, useEffect } from 'react';
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

import { adaptExecutionsToUnifiedMessages, UnifiedMessage } from '@/lib/message-adapter';

interface MessageExecution {
  id: string;
  processing_id: string;
  robot_id: string;
  robot_name?: string;
  session_id: string;
  user_id: string;
  group_id: string;
  user_name?: string;
  group_name?: string;
  message_content: string;
  intent?: string;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  ai_response?: string;
  started_at: string;
  completed_at?: string;
  duration?: number;
  node_type?: string;
}

interface MessageStats {
  total: number;
  processing: number;
  completed: number;
  failed: number;
  success_rate: string;
}

interface BusinessMessageMonitorProps {
  /** 跳转到会话管理的回调函数 */
  onNavigateToSession?: (sessionId: string) => void;
}

export default function BusinessMessageMonitor({ onNavigateToSession }: BusinessMessageMonitorProps) {
  const [executions, setExecutions] = useState<UnifiedMessage[]>([]);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');
  const [expandedExecutionId, setExpandedExecutionId] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  const loadExecutions = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/monitoring/executions', window.location.origin);
      url.searchParams.append('limit', limit.toString());
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data.code === 0 && Array.isArray(data.data)) {
          const executionsData = data.data || [];
          
          // 使用适配器转换数据格式
          const unifiedMessages = adaptExecutionsToUnifiedMessages(executionsData);
          setExecutions(unifiedMessages);
          
          // 计算统计数据
          const total = unifiedMessages.length;
          const processing = unifiedMessages.filter((e: UnifiedMessage) => e.status === 'processing').length;
          const completed = unifiedMessages.filter((e: UnifiedMessage) => e.status === 'completed').length;
          const failed = unifiedMessages.filter((e: UnifiedMessage) => e.status === 'failed').length;
          const successRate = total > 0 ? ((completed / (completed + failed)) * 100).toFixed(1) : '0.0';
          
          setStats({
            total,
            processing,
            completed,
            failed,
            success_rate: successRate
          });
        }
      }
    } catch (error) {
      console.error('加载消息执行列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions();
    
    // 自动刷新
    if (autoRefresh) {
      const interval = setInterval(loadExecutions, 10000); // 每10秒刷新
      return () => clearInterval(interval);
    }
  }, [autoRefresh, limit]);

  // 过滤执行记录
  const filteredExecutions = executions.filter(exec => {
    const matchesSearch = !searchQuery || 
      exec.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exec.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exec.groupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exec.robotName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || exec.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-primary/10 border-primary/30' : ''}
          >
            {autoRefresh ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-pulse" />
                自动刷新
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                手动刷新
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadExecutions}
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
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* 消息方向 */}
                            <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                              <User className="h-4 w-4" />
                              <ArrowRight className="h-4 w-4" />
                              <Bot className="h-4 w-4" />
                            </div>
                            
                            {/* 用户/群组信息 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {execution.userName && (
                                  <Badge variant="outline" className="text-xs">
                                    {execution.userName}
                                  </Badge>
                                )}
                                {execution.groupName && (
                                  <Badge variant="outline" className="text-xs">
                                    {execution.groupName}
                                  </Badge>
                                )}
                                {onNavigateToSession && execution.sessionId && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs gap-1"
                                    onClick={() => onNavigateToSession(execution.sessionId)}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    查看会话
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* 机器人信息 */}
                            {execution.robotName && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                <Bot className="h-3 w-3 mr-1" />
                                {execution.robotName}
                              </Badge>
                            )}
                          </div>

                          {/* 状态和时间 */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {getStatusBadge(execution.status)}
                            <div className="text-right text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(execution.startedAt)}
                              </div>
                              {execution.duration && (
                                <div className="text-xs mt-0.5">
                                  耗时: {formatDuration(execution.duration)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 第二行：消息内容 */}
                        <div className="pl-8">
                          <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-sm font-medium mb-1">用户消息:</div>
                            <div className="text-sm text-foreground break-words">
                              {execution.content || '(空消息)'}
                            </div>
                          </div>
                        </div>

                        {/* 可展开的详细信息 */}
                        {(execution.aiResponse || execution.intent || execution.errorMessage || execution.nodeType) && (
                          <div className="pl-8">
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
                                  <div className="flex items-center gap-2">
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
