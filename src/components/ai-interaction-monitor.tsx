'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  AlertTriangle,
  TrendingUp,
  Brain,
  MessageSquare,
  Zap,
  Cpu,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles,
  User
} from 'lucide-react';

import { adaptBackendAILogsToFrontend, AILog } from '@/lib/ai-log-adapter';

interface AIStats {
  total: number;
  processing: number;
  completed: number;
  failed: number;
  success_rate: string;
  total_tokens?: number;
  avg_duration?: number;
}

export default function AIInteractionMonitor() {
  const [aiLogs, setAiLogs] = useState<AILog[]>([]);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  const loadAILogs = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/monitoring/ai-logs', window.location.origin);
      url.searchParams.append('limit', limit.toString());

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data.code === 0 && Array.isArray(data.data)) {
          const backendLogs = data.data || [];
          // 使用适配器转换数据格式
          const logsData = adaptBackendAILogsToFrontend(backendLogs);
          setAiLogs(logsData);

          // 计算统计数据
          const total = logsData.length;
          const processing = logsData.filter((log: AILog) => log.status === 'processing').length;
          const completed = logsData.filter((log: AILog) => log.status === 'completed').length;
          const failed = logsData.filter((log: AILog) => log.status === 'failed').length;
          const successRate = total > 0 ? ((completed / (completed + failed)) * 100).toFixed(1) : '0.0';

          // 计算总token数
          const totalTokens = logsData.reduce((sum: number, log: AILog) => {
            return sum + (log.tokens?.total_tokens || 0);
          }, 0);

          // 计算平均耗时
          const completedWithDuration = logsData.filter((log: AILog) =>
            log.status === 'completed' && log.duration
          );
          const avgDuration = completedWithDuration.length > 0
            ? completedWithDuration.reduce((sum: number, log: AILog) => sum + (log.duration || 0), 0) / completedWithDuration.length
            : 0;

          setStats({
            total,
            processing,
            completed,
            failed,
            success_rate: successRate,
            total_tokens: totalTokens,
            avg_duration: avgDuration
          });
        }
      }
    } catch (error) {
      console.error('加载AI交互日志失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAILogs();
    
    // 自动刷新
    if (autoRefresh) {
      const interval = setInterval(loadAILogs, 10000); // 每10秒刷新
      return () => clearInterval(interval);
    }
  }, [autoRefresh, limit]);

  // 获取所有唯一的意图
  const allIntents = Array.from(new Set(aiLogs.map(log => log.intent).filter(Boolean)));
  
  // 过滤日志
  const filteredLogs = aiLogs.filter(log => {
    const matchesSearch = !searchQuery || 
      log.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.response?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.group_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.model?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesIntent = intentFilter === 'all' || log.intent === intentFilter;
    
    return matchesSearch && matchesStatus && matchesIntent;
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

  // 格式化Token数
  const formatTokens = (tokens?: number) => {
    if (!tokens) return '-';
    if (tokens < 1000) return tokens.toString();
    return `${(tokens / 1000).toFixed(1)}k`;
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            AI 交互监控
          </h3>
          <p className="text-muted-foreground mt-1">
            实时监控AI对话、模型调用和响应质量
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
            onClick={loadAILogs}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-primary/20 hover:border-primary/40 transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">总交互数</CardDescription>
              <CardTitle className="text-3xl font-bold">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-purple-500" />
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

          <Card className="border-blue-500/20 hover:border-blue-500/40 transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">总Token</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-500">
                {formatTokens(stats.total_tokens)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Cpu className="h-4 w-4 text-blue-500" />
                模型调用
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 hover:border-purple-500/40 transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">平均耗时</CardDescription>
              <CardTitle className="text-3xl font-bold text-purple-500">
                {formatDuration(stats.avg_duration)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-purple-500" />
                响应速度
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
                placeholder="搜索提示词、响应、用户名、模型..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
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
                value={intentFilter}
                onChange={(e) => setIntentFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">全部意图</option>
                {allIntents.map(intent => (
                  <option key={intent} value={intent}>{intent}</option>
                ))}
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

      {/* AI交互列表 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>AI 交互记录</CardTitle>
              <CardDescription>
                显示最近的 {limit} 条AI对话记录
              </CardDescription>
            </div>
            <Badge variant="outline">
              共 {filteredLogs.length} 条
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {isLoading ? '加载中...' : '暂无AI交互记录'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <Card
                    key={log.id}
                    className="hover:border-purple-400 transition-all"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* 第一行：基本信息 */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* AI图标 */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Brain className="h-5 w-5 text-purple-500" />
                              <Sparkles className="h-4 w-4 text-purple-400" />
                            </div>
                            
                            {/* 用户和模型信息 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {log.user_name && (
                                  <Badge variant="outline" className="text-xs">
                                    <User className="h-3 w-3 mr-1" />
                                    {log.user_name}
                                  </Badge>
                                )}
                                {log.group_name && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.group_name}
                                  </Badge>
                                )}
                                {log.intent && (
                                  <Badge variant="secondary" className="text-xs">
                                    意图: {log.intent}
                                  </Badge>
                                )}
                                {log.model && (
                                  <Badge variant="outline" className="text-xs text-purple-500 border-purple-500">
                                    <Bot className="h-3 w-3 mr-1" />
                                    {log.model}
                                  </Badge>
                                )}
                                {log.role && (
                                  <Badge variant="secondary" className="text-xs">
                                    角色: {log.role}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 状态和时间 */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {getStatusBadge(log.status)}
                            <div className="text-right text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(log.started_at)}
                              </div>
                              {log.duration && (
                                <div className="text-xs mt-0.5">
                                  耗时: {formatDuration(log.duration)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 第二行：提示词和响应 */}
                        <div className="pl-10 space-y-2">
                          {/* 用户提示词 */}
                          <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-sm font-medium mb-1 flex items-center gap-2">
                              <MessageSquare className="h-3 w-3 text-blue-500" />
                              提示词:
                            </div>
                            <div className="text-sm text-foreground break-words">
                              {log.prompt || '(空提示词)'}
                            </div>
                          </div>

                          {/* AI响应 */}
                          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                            <div className="text-sm font-medium mb-1 flex items-center gap-2 text-purple-700 dark:text-purple-300">
                              <Sparkles className="h-3 w-3" />
                              AI响应:
                            </div>
                            <div className="text-sm break-words">
                              {log.response || '(无响应)'}
                            </div>
                          </div>
                        </div>

                        {/* 可展开的详细信息 */}
                        {(log.tokens?.total_tokens || log.error_message || log.provider) && (
                          <div className="pl-10">
                            <button
                              onClick={() => setExpandedLogId(
                                expandedLogId === log.id ? null : log.id
                              )}
                              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                            >
                              {expandedLogId === log.id ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              查看详情
                            </button>

                            {expandedLogId === log.id && (
                              <div className="mt-3 space-y-2">
                                {/* Token统计 */}
                                {log.tokens && (
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-2 text-center">
                                      <div className="text-xs text-muted-foreground">输入Token</div>
                                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                        {log.tokens.input_tokens || 0}
                                      </div>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-2 text-center">
                                      <div className="text-xs text-muted-foreground">输出Token</div>
                                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                        {log.tokens.output_tokens || 0}
                                      </div>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-2 text-center">
                                      <div className="text-xs text-muted-foreground">总Token</div>
                                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                        {log.tokens.total_tokens || 0}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* 提供商 */}
                                {log.provider && (
                                  <Badge variant="outline" className="text-xs">
                                    提供商: {log.provider}
                                  </Badge>
                                )}

                                {/* 错误信息 */}
                                {log.error_message && (
                                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                                    <div className="text-sm font-medium mb-1 text-red-700 dark:text-red-300">
                                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                                      错误信息:
                                    </div>
                                    <div className="text-sm break-words text-red-600 dark:text-red-400">
                                      {log.error_message}
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
