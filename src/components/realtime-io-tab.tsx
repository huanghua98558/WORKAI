'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Bot, User as UserIcon, MessageCircle, Filter } from 'lucide-react';

export default function RealtimeIOTab() {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageLimit, setMessageLimit] = useState(50);
  const [filterType, setFilterType] = useState<'all' | 'user' | 'robot'>('all');
  const [selectedRobot, setSelectedRobot] = useState<string>('all');
  const [robots, setRobots] = useState<any[]>([]);

  const lastFetchTime = useRef(0);

  const loadMessages = async () => {
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
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    loadMessages();
    loadRobots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageLimit, filterType, selectedRobot]);

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
        <Button onClick={loadMessages} disabled={isLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

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
          <CardTitle>消息列表</CardTitle>
          <CardDescription>
            共 {messages.length} 条记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${
                    msg.direction === 'in' ? 'bg-blue-50 dark:bg-blue-950' : 'bg-green-50 dark:bg-green-950'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
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
              ))}
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
