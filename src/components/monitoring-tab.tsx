'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, MessageSquare, Bot, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

interface Execution {
  processing_id: string;
  robot_id: string;
  robot_name?: string;
  session_id: string;
  user_id: string;
  group_id: string;
  status: string;
  start_time: string;
  end_time: string;
  processing_time: number;
  error_message?: string;
  steps: any;
  decision: any;
  created_at?: string;
}

interface AiLog {
  id: number;
  session_id: string;
  message_id: string;
  robot_id: string;
  robot_name?: string;
  operation_type: string;
  ai_input: string;
  ai_output: string;
  model_id: string;
  status: string;
  error_message?: string;
  created_at: string;
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

export default function MonitoringTab() {
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

  // 初始加载和自动刷新
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchHealth(),
        fetchExecutions(),
        fetchAiLogs()
      ]);
      setLoading(false);
    };

    loadAllData();

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadAllData();
      }, 5000); // 每5秒刷新一次

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">实时监控中心</h2>
          <p className="text-muted-foreground mt-1">
            实时查看消息处理流程、AI对话和系统状态
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            最后更新: {health ? formatTime(health.timestamp) : '--'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchHealth();
              fetchExecutions();
              fetchAiLogs();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4" />}
            <span className="ml-2">{autoRefresh ? '自动刷新' : '手动刷新'}</span>
          </Button>
        </div>
      </div>

      {/* 健康状态卡片 */}
      {health && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>执行总数</CardDescription>
              <CardTitle className="text-3xl">{health.executions.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <span className="text-green-600">成功: {health.executions.success}</span>
                <span className="mx-2">•</span>
                <span className="text-red-600">失败: {health.executions.error}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                成功率: {health.executions.successRate}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>AI调用</CardDescription>
              <CardTitle className="text-3xl">{health.ai.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <span className="text-green-600">成功: {health.ai.success}</span>
                <span className="mx-2">•</span>
                <span className="text-red-600">失败: {health.ai.error}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                成功率: {health.ai.successRate}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>活跃会话</CardDescription>
              <CardTitle className="text-3xl">{health.sessions.active}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mt-2">
                当前活跃的会话数量
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>处理中</CardDescription>
              <CardTitle className="text-3xl">{health.executions.processing}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mt-2">
                正在处理的消息
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 监控内容 */}
      <Tabs defaultValue="executions" className="w-full">
        <TabsList>
          <TabsTrigger value="executions">
            <MessageSquare className="h-4 w-4 mr-2" />
            消息处理
          </TabsTrigger>
          <TabsTrigger value="ai-logs">
            <Bot className="h-4 w-4 mr-2" />
            AI对话
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>消息处理列表</CardTitle>
              <CardDescription>
                实时显示消息处理的执行状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {executions.map((execution) => (
                    <div
                      key={execution.processing_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedExecution(execution)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={
                            execution.status === 'success' ? 'default' :
                            execution.status === 'error' ? 'destructive' :
                            execution.status === 'processing' ? 'secondary' : 'outline'
                          }>
                            {execution.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTime(execution.created_at || execution.start_time)}
                          </span>
                        </div>
                        <div className="text-sm font-medium">
                          会话: {execution.session_id}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          用户: {execution.user_id} • 群组: {execution.group_id}
                        </div>
                        {execution.robot_name && (
                          <div className="text-xs text-muted-foreground">
                            机器人: {execution.robot_name}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatDuration(execution.processing_time || 0)}
                        </div>
                        {execution.error_message && (
                          <div className="text-xs text-red-500 mt-1">
                            {execution.error_message.substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {executions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      暂无执行记录
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {selectedExecution && (
            <Card>
              <CardHeader>
                <CardTitle>执行详情</CardTitle>
                <CardDescription>
                  消息ID: {selectedExecution.processing_id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">基本信息</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">会话ID:</span>
                        <span className="ml-2">{selectedExecution.session_id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">用户ID:</span>
                        <span className="ml-2">{selectedExecution.user_id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">群组ID:</span>
                        <span className="ml-2">{selectedExecution.group_id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">状态:</span>
                        <span className="ml-2">{selectedExecution.status}</span>
                      </div>
                    </div>
                  </div>
                  {selectedExecution.error_message && (
                    <div>
                      <h4 className="font-semibold mb-2 text-red-500">错误信息</h4>
                      <pre className="text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded-lg overflow-x-auto">
                        {selectedExecution.error_message}
                      </pre>
                    </div>
                  )}
                  {selectedExecution.steps && Object.keys(selectedExecution.steps).length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">执行步骤</h4>
                      <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(selectedExecution.steps, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => setSelectedExecution(null)}
                >
                  关闭
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI对话日志</CardTitle>
              <CardDescription>
                实时显示AI的输入输出记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {aiLogs.map((log) => (
                    <div key={log.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            log.status === 'success' ? 'default' : 'destructive'
                          }>
                            {log.operation_type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTime(log.created_at)}
                          </span>
                        </div>
                        {log.robot_name && (
                          <span className="text-sm text-muted-foreground">
                            {log.robot_name}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">输入:</div>
                        <div className="text-sm bg-muted p-3 rounded">
                          {log.ai_input}
                        </div>
                      </div>
                      {log.ai_output && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">输出:</div>
                          <div className="text-sm bg-muted p-3 rounded">
                            {log.ai_output}
                          </div>
                        </div>
                      )}
                      {log.error_message && (
                        <div>
                          <div className="text-xs text-red-500 mb-1">错误:</div>
                          <div className="text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded text-red-600">
                            {log.error_message}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        模型: {log.model_id}
                      </div>
                    </div>
                  ))}
                  {aiLogs.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      暂无AI对话记录
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
