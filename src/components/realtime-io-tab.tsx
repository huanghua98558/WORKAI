'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Bot, User as UserIcon, MessageCircle, Filter, Activity, Pause, Play, Send } from 'lucide-react';

export default function RealtimeIOTab() {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageLimit, setMessageLimit] = useState(50);
  const [filterType, setFilterType] = useState<'all' | 'user' | 'robot'>('all');
  const [selectedRobot, setSelectedRobot] = useState<string>('all');
  const [robots, setRobots] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [pendingNewMessages, setPendingNewMessages] = useState<any[]>([]); // 待显示的新消息队列
  const [isSendingTestMessage, setIsSendingTestMessage] = useState(false);
  
  const lastFetchTime = useRef(0);
  const messagesRef = useRef<any[]>([]);
  const isProcessingQueue = useRef(false); // 是否正在处理消息队列

  const loadMessages = useCallback(async () => {
    // 防抖：避免频繁请求
    const now = Date.now();
    if (now - lastFetchTime.current < 1000) {
      return;
    }

    lastFetchTime.current = now;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', messageLimit.toString());
      if (filterType !== 'all') {
        params.append('filter', filterType);
      }
      if (selectedRobot !== 'all') {
        params.append('robot', selectedRobot);
      }

      const res = await fetch(`/api/ai-io?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const newMessages = data.data || [];
        
        // 使用 ref 获取当前数据，避免依赖项导致循环
        const currentMessages = messagesRef.current;
        const currentIds = new Set(currentMessages.map((m: any) => m.id));
        
        // 找出新增的消息（在当前列表中不存在的新消息）
        const addedMessages = newMessages.filter((msg: any) => !currentIds.has(msg.id));
        
        // 更新当前消息列表
        setMessages(newMessages);
        setLastUpdateTime(new Date().toLocaleTimeString('zh-CN'));
        
        // 如果有新消息，添加到待显示队列
        if (addedMessages.length > 0) {
          // 按时间顺序添加到队列（最新的在前面）
          const sortedNewMessages = addedMessages.sort((a: any, b: any) => 
            new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime()
          );
          setPendingNewMessages(prev => [...prev, ...sortedNewMessages]);
        }
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messageLimit, filterType, selectedRobot]);

  // 处理待显示的消息队列（一条一条显示）
  useEffect(() => {
    if (isProcessingQueue.current || pendingNewMessages.length === 0) {
      return;
    }

    isProcessingQueue.current = true;

    const processNextMessage = () => {
      if (pendingNewMessages.length === 0) {
        isProcessingQueue.current = false;
        return;
      }

      // 取出队列中的第一条消息
      const nextMessage = pendingNewMessages[0];
      
      // 标记为新消息
      setNewMessageIds(prev => new Set([...prev, nextMessage.id]));
      
      // 从队列中移除
      setPendingNewMessages(prev => prev.slice(1));
      
      // 3秒后移除新消息标记
      setTimeout(() => {
        setNewMessageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(nextMessage.id);
          return newSet;
        });
      }, 3000);
    };

    // 立即处理第一条
    processNextMessage();

    // 每隔800ms处理下一条
    const interval = setInterval(() => {
      if (pendingNewMessages.length > 0) {
        processNextMessage();
      } else {
        clearInterval(interval);
        isProcessingQueue.current = false;
      }
    }, 800);

    return () => clearInterval(interval);
  }, [pendingNewMessages]);

  const loadRobots = async () => {
    try {
      const res = await fetch('/api/proxy/admin/robots');
      if (res.ok) {
        const data = await res.json();
        if (data.code === 0) {
          setRobots(data.data || []);
        }
      }
    } catch (error) {
      console.error('加载机器人列表失败:', error);
    }
  };

  // 发送测试消息
  const sendTestMessages = async () => {
    setIsSendingTestMessage(true);
    try {
      const res = await fetch('/api/ai-io/create-test-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: 5 }), // 每次发送5条测试消息
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ 测试消息发送成功:', data);
        // 手动触发一次刷新
        setTimeout(() => loadMessages(), 500);
      }
    } catch (error) {
      console.error('发送测试消息失败:', error);
    } finally {
      setIsSendingTestMessage(false);
    }
  };

  // 同步 messages 到 ref
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 初始加载和自动刷新
  useEffect(() => {
    loadRobots();
    loadMessages();

    // 设置自动刷新
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadMessages();
      }, 3000); // 每3秒刷新一次
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, loadMessages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-purple-500" />
            实时IO查看
          </h3>
          <p className="text-muted-foreground mt-1">查看 AI 输入输出实时记录</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={sendTestMessages}
            disabled={isSendingTestMessage}
          >
            <Send className={`h-4 w-4 mr-2 ${isSendingTestMessage ? 'animate-pulse' : ''}`} />
            {isSendingTestMessage ? '发送中...' : '测试消息'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                暂停刷新
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                开始刷新
              </>
            )}
          </Button>
          <Button onClick={loadMessages} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          {lastUpdateTime && (
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              {lastUpdateTime}
            </Badge>
          )}
        </div>
      </div>

      {/* 自动刷新状态提示 */}
      {autoRefresh && (
        <Alert variant="default" className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
          <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            自动刷新已开启（每3秒），新消息将自动显示在列表顶部
          </AlertDescription>
        </Alert>
      )}

      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>设置消息过滤条件</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">类型:</span>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="user">用户消息</SelectItem>
                  <SelectItem value="robot">机器人回复</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">机器人:</span>
              <Select value={selectedRobot} onValueChange={setSelectedRobot}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部机器人</SelectItem>
                  {robots.map((robot) => (
                    <SelectItem key={robot.robotId} value={robot.robotId}>
                      {robot.name || robot.robotId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">数量:</span>
              <Select value={messageLimit.toString()} onValueChange={(v) => setMessageLimit(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 消息列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>消息列表</CardTitle>
              <CardDescription>
                共 {messages.length} 条记录
              </CardDescription>
            </div>
            {autoRefresh && (
              <Badge variant="outline" className="gap-1 text-xs">
                <RefreshCw className="h-3 w-3 animate-spin" />
                自动刷新中
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {messages.map((msg, index) => {
                const isNew = newMessageIds.has(msg.id);
                return (
                  <div
                    key={msg.id}
                    className={`p-4 border rounded-lg transition-all duration-500 ease-out ${
                      msg.direction === 'in' 
                        ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900' 
                        : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900'
                    } ${
                      isNew 
                        ? 'scale-105 shadow-lg bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-800 animate-slide-down' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {msg.direction === 'in' ? (
                        <UserIcon className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Bot className="h-4 w-4 text-green-600" />
                      )}
                      <span className="font-medium text-sm">
                        {msg.direction === 'in' ? '用户输入' : 'AI回复'}
                      </span>
                      {msg.robotName && (
                        <Badge variant="outline" className="text-xs">
                          {msg.robotName}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(msg.timestamp || msg.createdAt).toLocaleString('zh-CN')}
                      </span>
                      {isNew && (
                        <Badge variant="secondary" className="text-xs gap-1 bg-blue-500 text-white">
                          <Activity className="h-3 w-3" />
                          新消息
                        </Badge>
                      )}
                    </div>
                    {msg.input && (
                      <div className="text-sm mb-2">
                        <span className="font-medium">输入:</span> {msg.input}
                      </div>
                    )}
                    {msg.output && (
                      <div className="text-sm">
                        <span className="font-medium">输出:</span> {msg.output}
                      </div>
                    )}
                    {msg.model && (
                      <div className="text-xs text-muted-foreground mt-2">
                        模型: {msg.model}
                      </div>
                    )}
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  暂无消息记录
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
