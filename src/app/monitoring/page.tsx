'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, MessageSquare, Bot, AlertCircle, CheckCircle, Clock, RefreshCw, ArrowLeft } from 'lucide-react';

interface Execution {
  id: string;
  processingId: string;
  robotId: string;
  robotName?: string | null;
  messageId?: string | null;
  sessionId: string;
  userId?: string | null;
  groupId?: string | null;
  status: string;
  startTime: string;
  endTime?: string | null;
  processingTime?: number | null;
  errorMessage?: string | null;
  errorStack?: string | null;
  steps: any;
  decision: any;
  createdAt: string;
  // 提取的消息内容（从steps.user_message中）
  messageContent?: string;
}

interface AiLog {
  id: number;
  sessionId: string;
  messageId: string;
  robotId: string;
  robotName?: string;
  operationType: string;
  aiInput: string;
  aiOutput: string;
  modelId: string;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
}

interface HealthStatus {
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
  };
  timestamp: string;
}

export default function MonitoringPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 获取系统健康状态
  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/monitoring/health');
      const data = await res.json();
      if (data.code === 0) {
        setHealth(data.data);
      }
    } catch (error) {
      console.error('获取健康状态失败:', error);
    }
  };

  // 获取执行列表
  const fetchExecutions = async () => {
    try {
      const res = await fetch('/api/monitoring/executions?limit=50');
      const data = await res.json();
      if (data.code === 0) {
        setExecutions(data.data);
      }
    } catch (error) {
      console.error('获取执行列表失败:', error);
    }
  };

  // 获取AI日志
  const fetchAiLogs = async () => {
    try {
      const res = await fetch('/api/monitoring/ai-logs?limit=50');
      const data = await res.json();
      if (data.code === 0) {
        setAiLogs(data.data);
      }
    } catch (error) {
      console.error('获取AI日志失败:', error);
    }
  };

  // 获取执行详情
  const fetchExecutionDetail = async (processingId: string) => {
    try {
      const res = await fetch(`/api/monitoring/executions/${processingId}`);
      const data = await res.json();
      if (data.code === 0) {
        setSelectedExecution(data.data);
      }
    } catch (error) {
      console.error('获取执行详情失败:', error);
    }
  };

  // 手动刷新
  const handleRefresh = () => {
    setLoading(true);
    Promise.all([fetchHealth(), fetchExecutions(), fetchAiLogs()]).finally(() => {
      setLoading(false);
    });
  };

  // 初始加载和自动刷新
  useEffect(() => {
    handleRefresh();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchHealth();
        fetchExecutions();
        fetchAiLogs();
      }, 5000); // 每5秒刷新一次

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">成功</Badge>;
      case 'error':
        return <Badge variant="destructive">失败</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-yellow-500">处理中</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/'}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold">实时监控中心</h1>
            <p className="text-muted-foreground mt-1">
              实时查看消息处理流程、AI对话和系统状态
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="w-4 h-4 mr-2" />
            {autoRefresh ? '停止刷新' : '开始刷新'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 系统健康状态 */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">总执行数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.executions.total}</div>
              <div className="text-xs text-muted-foreground mt-1">
                成功: {health.executions.success} | 失败: {health.executions.error}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">成功率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.executions.successRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                处理中: {health.executions.processing}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">AI 调用</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.ai.total}</div>
              <div className="text-xs text-muted-foreground mt-1">
                成功率: {health.ai.successRate}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">活跃会话</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.sessions.active}</div>
              <div className="text-xs text-muted-foreground mt-1">
                最近1小时
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 主内容区域 */}
      <Tabs defaultValue="executions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="executions">
            <Activity className="w-4 h-4 mr-2" />
            执行列表
          </TabsTrigger>
          <TabsTrigger value="ai-logs">
            <Bot className="w-4 h-4 mr-2" />
            AI 对话
          </TabsTrigger>
          <TabsTrigger value="detail">
            <MessageSquare className="w-4 h-4 mr-2" />
            执行详情
          </TabsTrigger>
        </TabsList>

        {/* 执行列表 */}
        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>消息处理执行列表</CardTitle>
              <CardDescription>显示最新的消息处理记录</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {executions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无执行记录
                    </div>
                  ) : (
                    executions.map((execution) => {
                      // 从steps中提取消息内容
                      const messageContent = execution.steps?.user_message?.content || '';
                      const isLong = messageContent.length > 50;
                      const displayMessage = isLong ? messageContent.substring(0, 50) + '...' : messageContent;

                      return (
                        <div
                          key={execution.processingId}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => fetchExecutionDetail(execution.processingId)}
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(execution.status)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-medium">{execution.userId || execution.groupId}</div>
                                {messageContent && (
                                  <span className="text-sm text-muted-foreground">发送消息：</span>
                                )}
                              </div>
                              {messageContent && (
                                <div className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded inline-block max-w-md">
                                  {displayMessage}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                机器人: {execution.robotName} | 会话: {execution.sessionId?.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(execution.status)}
                            {execution.processingTime && (
                              <div className="text-sm text-muted-foreground">
                                {execution.processingTime}ms
                              </div>
                            )}
                            <div className="text-sm text-muted-foreground">
                              {execution.createdAt ? new Date(execution.createdAt).toLocaleTimeString() : new Date(execution.startTime).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI 对话 */}
        <TabsContent value="ai-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI 对话日志</CardTitle>
              <CardDescription>显示 AI 的输入和输出记录</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {aiLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无 AI 对话记录
                    </div>
                  ) : (
                    aiLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{log.operationType}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {log.robotName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {log.status === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <div className="text-sm font-medium text-blue-600">输入:</div>
                            <div className="text-sm bg-muted p-2 rounded mt-1 whitespace-pre-wrap">
                              {log.aiInput?.substring(0, 500)}
                              {log.aiInput?.length > 500 && '...'}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-green-600">输出:</div>
                            <div className="text-sm bg-muted p-2 rounded mt-1 whitespace-pre-wrap">
                              {log.aiOutput?.substring(0, 500)}
                              {log.aiOutput?.length > 500 && '...'}
                            </div>
                          </div>
                        </div>

                        {log.errorMessage && (
                          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            错误: {log.errorMessage}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 执行详情 */}
        <TabsContent value="detail" className="space-y-4">
          {selectedExecution ? (
            <Card>
              <CardHeader>
                <CardTitle>执行详情</CardTitle>
                <CardDescription>
                  处理ID: {selectedExecution.processingId}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">状态</div>
                    <div className="font-medium mt-1">
                      {getStatusBadge(selectedExecution.status)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">处理时间</div>
                    <div className="font-medium mt-1">
                      {selectedExecution.processingTime}ms
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">机器人</div>
                    <div className="font-medium mt-1">{selectedExecution.robotName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">会话ID</div>
                    <div className="font-medium mt-1">
                      {selectedExecution.sessionId?.slice(0, 12)}...
                    </div>
                  </div>
                </div>

                {selectedExecution.errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="font-medium text-red-600">错误信息</div>
                    <div className="text-sm text-red-700 mt-1">
                      {selectedExecution.errorMessage}
                    </div>
                  </div>
                )}

                {selectedExecution.steps && Object.keys(selectedExecution.steps).length > 0 && (
                  <div>
                    <div className="font-medium mb-2">执行步骤</div>
                    <div className="space-y-2">
                      {Object.entries(selectedExecution.steps).map(([stepName, stepData]: [string, any]) => (
                        <div key={stepName} className="flex items-center gap-2 border rounded-lg p-3">
                          {stepData.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : stepData.status === 'failed' ? (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-500" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{stepName}</div>
                            {stepData.startTime && (
                              <div className="text-xs text-muted-foreground">
                                {new Date(stepData.startTime).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>请在"执行列表"中点击一条记录查看详情</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
