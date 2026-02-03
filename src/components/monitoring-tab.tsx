'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, MessageSquare, Bot, AlertCircle, CheckCircle, Clock, RefreshCw, User } from 'lucide-react';

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
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [newExecutionIds, setNewExecutionIds] = useState<Set<string>>(new Set());
  
  // 使用 ref 存储当前数据，避免循环依赖
  const executionsRef = useRef<Execution[]>([]);
  const aiLogsRef = useRef<AiLog[]>([]);
  
  // 同步 state 到 ref
  useEffect(() => {
    executionsRef.current = executions;
  }, [executions]);
  
  useEffect(() => {
    aiLogsRef.current = aiLogs;
  }, [aiLogs]);

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
  const fetchExecutions = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring/executions?limit=50');
      const data = await res.json();
      if (data.code === 0) {
        const newExecutions = data.data || [];
        
        // 使用 ref 获取当前数据，避免依赖项导致循环
        const currentExecutions = executionsRef.current;
        const currentIds = new Set(currentExecutions.map((e: Execution) => e.processing_id));
        const newIds = new Set(newExecutions.map((e: Execution) => e.processing_id));
        
        // 如果数据没有变化，不更新状态，避免重新渲染
        if (currentIds.size === newIds.size && 
            Array.from(currentIds).every((id: string) => newIds.has(id))) {
          return;
        }
        
        // 只标记新增的消息
        const addedIds = new Set(newExecutions.map((e: Execution) => e.processing_id).filter((id: string) => !currentIds.has(id)));
        
        // 只标记最新的 3 条消息为新消息，避免大量动画同时播放
        const newIdArray = Array.from(addedIds);
        const limitedNewIds: Set<string> = new Set(newIdArray.slice(0, 3) as string[]);
        
        setNewExecutionIds(limitedNewIds);
        setExecutions(newExecutions);
        
        // 3秒后移除新消息标记
        setTimeout(() => {
          setNewExecutionIds(new Set<string>());
        }, 3000);
      }
    } catch (error) {
      console.error('获取执行列表失败:', error);
    }
  }, []);

  // 获取AI日志
  const fetchAiLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring/ai-logs?limit=50');
      const data = await res.json();
      if (data.code === 0) {
        const newLogs = data.data || [];
        
        // 使用 ref 获取当前数据，避免依赖项导致循环
        const currentLogs = aiLogsRef.current;
        const currentIds = new Set(currentLogs.map((l: AiLog) => l.id));
        const newIds = new Set(newLogs.map((l: AiLog) => l.id));
        
        // 如果数据没有变化，不更新状态，避免重新渲染
        if (currentIds.size === newIds.size && 
            Array.from(currentIds).every(id => newIds.has(id))) {
          return;
        }
        
        setAiLogs(newLogs);
      }
    } catch (error) {
      console.error('获取AI日志失败:', error);
    }
  }, []);

  // 初始加载和自动刷新
  useEffect(() => {
    const loadAllData = async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
      }
      await Promise.all([
        fetchHealth(),
        fetchExecutions(),
        fetchAiLogs()
      ]);
      if (showLoading) {
        setLoading(false);
      }
      setLastUpdateTime(new Date().toLocaleTimeString('zh-CN'));
    };

    // 初始加载时显示加载状态
    loadAllData(true);

    if (autoRefresh) {
      const interval = setInterval(() => {
        // 自动刷新时不显示加载状态，避免页面闪烁
        loadAllData(false);
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
          <h2 className="text-2xl font-bold">实时消息</h2>
          <p className="text-muted-foreground mt-1">
            实时查看消息处理流程、AI对话和系统状态
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            最后更新: {lastUpdateTime || '--'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchHealth();
              fetchExecutions();
              fetchAiLogs();
              setLastUpdateTime(new Date().toLocaleTimeString('zh-CN'));
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
            <>
              {autoRefresh ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4" />}
              <span className="ml-2">{autoRefresh ? '自动刷新' : '手动刷新'}</span>
            </>
          </Button>
          <Badge variant={autoRefresh ? "secondary" : "outline"} className="gap-1">
            <>
              <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? '5秒刷新' : '已暂停'}
            </>
          </Badge>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <>消息处理列表
                    {autoRefresh && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        自动刷新
                      </Badge>
                    )}</>
                  </CardTitle>
                  <CardDescription>
                    实时显示消息处理的执行状态
                  </CardDescription>
                </div>
                <Badge variant="secondary">{executions.length} 条记录</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {executions.map((execution, index) => {
                    const isNew = newExecutionIds.has(execution.processing_id);
                    return (
                      <div
                        key={execution.processing_id}
                        className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer ${
                          isNew 
                            ? 'bg-blue-50 dark:bg-blue-950' 
                            : ''
                        }`}
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
                          {/* 消息内容预览 */}
                          <div className="mt-2 space-y-1">
                            {execution.steps && execution.steps.user_message && execution.steps.user_message.content && (
                              <div className="flex items-start gap-2">
                                <User className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-blue-600 dark:text-blue-400 truncate flex-1">
                                  {execution.steps.user_message.content}
                                </div>
                              </div>
                            )}
                            {execution.steps && execution.steps.ai_response && execution.steps.ai_response.response && (
                              <div className="flex items-start gap-2">
                                <Bot className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-green-600 dark:text-green-400 truncate flex-1">
                                  {execution.steps.ai_response.response}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatDuration(execution.processing_time || 0)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {execution.start_time ? formatTime(execution.start_time) : ''}
                          </div>
                          {execution.error_message && (
                            <div className="text-xs text-red-500 mt-1 truncate max-w-[150px]">
                              {execution.error_message.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                  
                  {/* 消息内容 */}
                  {selectedExecution.steps && (
                    <div>
                      <h4 className="font-semibold mb-2">消息内容</h4>
                      <div className="space-y-2">
                        {selectedExecution.steps.user_message && selectedExecution.steps.user_message.content && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">用户消息</div>
                            <div className="text-sm">{selectedExecution.steps.user_message.content}</div>
                          </div>
                        )}
                        {selectedExecution.steps.ai_response && selectedExecution.steps.ai_response.response && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">AI回复</div>
                            <div className="text-sm">{selectedExecution.steps.ai_response.response}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedExecution.steps && Object.keys(selectedExecution.steps).length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">执行步骤详情</h4>
                      <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto max-h-64">
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <>AI对话日志
                    {autoRefresh && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        自动刷新
                      </Badge>
                    )}</>
                  </CardTitle>
                  <CardDescription>
                    实时显示AI的输入输出记录
                  </CardDescription>
                </div>
                <Badge variant="secondary">{aiLogs.length} 条记录</Badge>
              </div>
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
