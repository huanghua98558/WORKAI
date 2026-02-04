'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, MessageSquare, Bot, AlertCircle, CheckCircle, Clock, RefreshCw, ArrowLeft } from 'lucide-react';
import MonitoringAlertCompact from '@/components/monitoring/MonitoringAlertCompact';
import MonitoringAlertCard from '@/components/monitoring/MonitoringAlertCard';

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
  modelId?: string;
  status: string;
  errorMessage?: string | null;
  requestDuration?: number;
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
  alerts?: {
    total: number;
    pending: number;
    critical: number;
    warning: number;
    info: number;
  };
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
        // 获取告警统计
        try {
          const alertRes = await fetch('http://localhost:5001/api/alerts/stats');
          const alertData = await alertRes.json();
          if (alertData.success) {
            data.data.alerts = {
              total: parseInt(alertData.data.total) || 0,
              pending: parseInt(alertData.data.pending) || 0,
              critical: parseInt(alertData.data.critical) || 0,
              warning: parseInt(alertData.data.warning) || 0,
              info: parseInt(alertData.data.info) || 0
            };
          }
        } catch (alertError) {
          console.error('获取告警统计失败:', alertError);
          data.data.alerts = {
            total: 0,
            pending: 0,
            critical: 0,
            warning: 0,
            info: 0
          };
        }
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
    console.log('[监控] 开始获取AI日志');
    try {
      const res = await fetch('/api/monitoring/ai-logs?limit=50');
      const data = await res.json();
      console.log('[监控] AI日志响应:', {
        code: data.code,
        dataLength: data.data?.length,
        firstItem: data.data?.[0] ? {
          id: data.data[0].id,
          hasAiInput: !!data.data[0].aiInput,
          hasAiOutput: !!data.data[0].aiOutput,
          aiInputLength: data.data[0].aiInput?.length,
          aiOutputLength: data.data[0].aiOutput?.length
        } : null
      });
      if (data.code === 0) {
        setAiLogs(data.data);
      }
    } catch (error) {
      console.error('[监控] 获取AI日志失败:', error);
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
      }, 15000); // 优化：从5秒增加到15秒

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
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              try {
                const res = await fetch('/api/monitoring/create-test-message', {
                  method: 'POST'
                });
                const data = await res.json();
                if (data.success) {
                  alert('测试消息已创建！请刷新页面查看。');
                  fetchExecutions();
                } else {
                  alert('创建失败: ' + data.error);
                }
              } catch (error) {
                alert('创建失败: ' + error);
              }
            }}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            创建测试消息
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

          {/* 告警统计 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">待处理告警</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {health.alerts?.pending || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                紧急: {health.alerts?.critical || 0} | 警告: {health.alerts?.warning || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 告警监控 - 突出显示 */}
      {(health?.alerts && health.alerts.pending > 0) && (
        <div className="relative">
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                告警通知
                <Badge variant="destructive" className="ml-2 animate-pulse">
                  {health.alerts.critical > 0 ? `${health.alerts.critical} 紧急` : `${health.alerts.pending} 待处理`}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-3">
                <div className="text-sm">
                  <span className="text-red-600 font-medium">紧急:</span> {health.alerts.critical}
                </div>
                <div className="text-sm">
                  <span className="text-yellow-600 font-medium">警告:</span> {health.alerts.warning}
                </div>
                <div className="text-sm">
                  <span className="text-blue-600 font-medium">信息:</span> {health.alerts.info}
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => window.location.href = '/alerts/center'}
              >
                查看所有告警
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 告警监控 - 正常状态 */}
      {(!health?.alerts || health.alerts.pending === 0) && (
        <MonitoringAlertCompact maxItems={3} showViewAll={false} />
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
          <TabsTrigger value="alerts">
            <AlertCircle className="w-4 h-4 mr-2" />
            告警中心
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
                    aiLogs.map((log, index) => (
                      <div key={log.id || index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{log.operationType || '未知'}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {log.robotName || log.robotId}
                            </span>
                            {log.modelId && (
                              <Badge variant="secondary" className="text-xs">
                                {log.modelId}
                              </Badge>
                            )}
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
                            <div className="text-sm bg-muted p-2 rounded mt-1 whitespace-pre-wrap break-words">
                              {log.aiInput ? (
                                <>
                                  {log.aiInput.length > 500 ? (
                                    <>
                                      {log.aiInput.substring(0, 500)}
                                      <span className="text-muted-foreground">... (共 {log.aiInput.length} 字符)</span>
                                    </>
                                  ) : (
                                    log.aiInput
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground italic">无输入数据</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-green-600">输出:</div>
                            <div className="text-sm bg-muted p-2 rounded mt-1 whitespace-pre-wrap break-words">
                              {log.aiOutput ? (
                                <>
                                  {log.aiOutput.length > 500 ? (
                                    <>
                                      {log.aiOutput.substring(0, 500)}
                                      <span className="text-muted-foreground">... (共 {log.aiOutput.length} 字符)</span>
                                    </>
                                  ) : (
                                    log.aiOutput
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground italic">无输出数据</span>
                              )}
                            </div>
                          </div>
                          {log.requestDuration && (
                            <div className="text-xs text-muted-foreground">
                              请求耗时: {log.requestDuration}ms
                            </div>
                          )}
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

        {/* 告警中心 */}
        <TabsContent value="alerts" className="space-y-4">
          <MonitoringAlertCompact maxItems={20} showViewAll={true} />
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
