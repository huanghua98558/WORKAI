/**
 * 会话管理页面
 * 
 * 功能：
 * 1. 最近活跃会话 - 实时更新
 * 2. 全部会话列表 - 实时更新
 * 3. 业务消息监控 - 实时推送
 * 
 * 集成SSE实时消息推送
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Activity,
  MessageSquare,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Wifi,
  WifiOff,
  Bot,
  User,
  TrendingUp,
  Eye,
  MoreHorizontal,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import { useSSE } from '@/hooks/useSSE';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  sessionId: string;
  content: string;
  senderType: string;
  senderId: string;
  senderName: string;
  messageType: string;
  createdAt: string;
}

interface Session {
  sessionId: string;
  userId?: string;
  groupId?: string;
  userName?: string;
  groupName?: string;
  status: 'active' | 'inactive';
  lastActiveTime: string;
  messageCount: number;
  lastMessage?: string;
  createdAt: string;
}

interface BusinessMessage {
  id: string;
  sessionId: string;
  content: string;
  senderType: string;
  senderName: string;
  messageType: string;
  intent?: string;
  emotion?: string;
  createdAt: string;
  processed: boolean;
}

export default function SessionManagementPage() {
  // 使用SSE监听全局消息
  const { connected: sseConnected, messages: realtimeMessages } = useSSE({
    reconnectInterval: 5000,
    maxReconnectAttempts: 20,
    onMessage: (message) => {
      console.log('[SessionMgmt] 收到实时消息:', message);
    },
  });

  // 会话数据
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [businessMessages, setBusinessMessages] = useState<BusinessMessage[]>([]);

  // UI状态
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // 加载最近活跃会话
  const loadActiveSessions = async () => {
    try {
      const response = await fetch('/api/proxy/admin/sessions/active?limit=20');
      const data = await response.json();
      if (data.code === 0) {
        setActiveSessions(data.data || []);
      }
    } catch (error) {
      console.error('加载活跃会话失败:', error);
    }
  };

  // 加载全部会话
  const loadAllSessions = async () => {
    try {
      const response = await fetch('/api/messages?limit=100');
      const data = await response.json();
      if (data.success) {
        // 从消息中提取会话信息
        const sessionMap = new Map<string, Session>();
        
        data.data.messages.forEach((msg: Message) => {
          if (!sessionMap.has(msg.sessionId)) {
            sessionMap.set(msg.sessionId, {
              sessionId: msg.sessionId,
              userId: msg.senderId,
              userName: msg.senderName,
              status: 'active',
              lastActiveTime: msg.createdAt,
              messageCount: 1,
              lastMessage: msg.content,
              createdAt: msg.createdAt,
            });
          } else {
            const session = sessionMap.get(msg.sessionId)!;
            session.messageCount += 1;
            session.lastActiveTime = msg.createdAt;
            session.lastMessage = msg.content;
          }
        });

        setAllSessions(Array.from(sessionMap.values()));
      }
    } catch (error) {
      console.error('加载全部会话失败:', error);
    }
  };

  // 加载业务消息
  const loadBusinessMessages = async () => {
    try {
      const response = await fetch('/api/messages?limit=50');
      const data = await response.json();
      if (data.success) {
        setBusinessMessages(
          data.data.messages.map((msg: Message) => ({
            id: msg.id,
            sessionId: msg.sessionId,
            content: msg.content,
            senderType: msg.senderType,
            senderName: msg.senderName,
            messageType: msg.messageType,
            createdAt: msg.createdAt,
            processed: true,
          }))
        );
      }
    } catch (error) {
      console.error('加载业务消息失败:', error);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadData();
  }, []);

  // 实时消息处理
  useEffect(() => {
    if (realtimeMessages.length > 0) {
      const latestMessage = realtimeMessages[realtimeMessages.length - 1];
      
      console.log('[SessionMgmt] 处理实时消息:', latestMessage);

      // 更新活跃会话
      setActiveSessions(prev => {
        const existing = prev.find(s => s.sessionId === latestMessage.sessionId);
        if (existing) {
          return prev.map(s => 
            s.sessionId === latestMessage.sessionId
              ? { ...s, lastMessage: latestMessage.content, lastActiveTime: latestMessage.createdAt, messageCount: s.messageCount + 1 }
              : s
          ).sort((a, b) => new Date(b.lastActiveTime).getTime() - new Date(a.lastActiveTime).getTime());
        } else {
          const newSession: Session = {
            sessionId: latestMessage.sessionId,
            userId: latestMessage.senderId,
            userName: latestMessage.senderName,
            status: 'active',
            lastActiveTime: latestMessage.createdAt,
            messageCount: 1,
            lastMessage: latestMessage.content,
            createdAt: latestMessage.createdAt,
          };
          return [newSession, ...prev].slice(0, 20);
        }
      });

      // 更新全部会话
      setAllSessions(prev => {
        const existing = prev.find(s => s.sessionId === latestMessage.sessionId);
        if (existing) {
          return prev.map(s => 
            s.sessionId === latestMessage.sessionId
              ? { ...s, lastMessage: latestMessage.content, lastActiveTime: latestMessage.createdAt, messageCount: s.messageCount + 1 }
              : s
          );
        } else {
          const newSession: Session = {
            sessionId: latestMessage.sessionId,
            userId: latestMessage.senderId,
            userName: latestMessage.senderName,
            status: 'active',
            lastActiveTime: latestMessage.createdAt,
            messageCount: 1,
            lastMessage: latestMessage.content,
            createdAt: latestMessage.createdAt,
          };
          return [newSession, ...prev].slice(0, 100);
        }
      });

      // 更新业务消息
      setBusinessMessages(prev => {
        const newMsg: BusinessMessage = {
          id: latestMessage.id,
          sessionId: latestMessage.sessionId,
          content: latestMessage.content,
          senderType: latestMessage.senderType,
          senderName: latestMessage.senderName,
          messageType: latestMessage.messageType,
          createdAt: latestMessage.createdAt,
          processed: true,
        };
        return [newMsg, ...prev].slice(0, 50);
      });
    }
  }, [realtimeMessages]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadActiveSessions(),
      loadAllSessions(),
      loadBusinessMessages()
    ]);
    setLoading(false);
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  // 过滤会话
  const filteredSessions = allSessions.filter(session => {
    const matchesSearch = session.sessionId.includes(searchQuery) ||
                          session.userName?.includes(searchQuery) ||
                          session.lastMessage?.includes(searchQuery);
    const matchesFilter = filterStatus === 'all' || session.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* 顶部导航栏 */}
      <div className="border-b bg-white dark:bg-slate-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold">会话管理</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                管理和监控所有会话
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              {sseConnected ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Wifi className="h-3 w-3 mr-1" />
                  实时连接
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <WifiOff className="h-3 w-3 mr-1" />
                  未连接
                </Badge>
              )}
              <Badge variant="secondary">
                {activeSessions.length} 活跃会话
              </Badge>
              <Badge variant="secondary">
                {businessMessages.length} 业务消息
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="mb-6">
              <TabsTrigger value="active">
                <Activity className="h-4 w-4 mr-2" />
                最近活跃会话
              </TabsTrigger>
              <TabsTrigger value="all">
                <MessageSquare className="h-4 w-4 mr-2" />
                全部会话
              </TabsTrigger>
              <TabsTrigger value="business">
                <TrendingUp className="h-4 w-4 mr-2" />
                业务消息监控
              </TabsTrigger>
            </TabsList>

            {/* 最近活跃会话 */}
            <TabsContent value="active" className="flex-1 overflow-hidden">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>最近活跃会话</CardTitle>
                  <CardDescription>
                    实时显示最近的活跃会话列表
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="space-y-3">
                      {activeSessions.length > 0 ? (
                        activeSessions.map((session, index) => (
                          <div
                            key={session.sessionId}
                            className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            <Avatar>
                              <AvatarFallback className="bg-blue-500 text-white">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {session.userName || '未知用户'}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  #{session.sessionId.slice(-8)}
                                </Badge>
                                {index === 0 && (
                                  <Badge variant="default" className="text-xs bg-green-500">
                                    最新
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 truncate">
                                {session.lastMessage || '暂无消息'}
                              </div>
                            </div>

                            <div className="text-right flex items-center gap-4">
                              <div className="text-sm">
                                <div className="text-slate-600 dark:text-slate-400">
                                  {session.messageCount} 条消息
                                </div>
                                <div className="text-slate-500 dark:text-slate-500">
                                  {formatTimeAgo(session.lastActiveTime)}
                                </div>
                              </div>
                              
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <div>暂无活跃会话</div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 全部会话 */}
            <TabsContent value="all" className="flex-1 overflow-hidden">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>全部会话</CardTitle>
                      <CardDescription>
                        查看和管理所有会话
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="搜索会话..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Filter className="h-4 w-4 mr-2" />
                            筛选
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                            全部
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFilterStatus('active')}>
                            活跃
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFilterStatus('inactive')}>
                            非活跃
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="space-y-2">
                      {filteredSessions.length > 0 ? (
                        filteredSessions.map((session) => (
                          <div
                            key={session.sessionId}
                            className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Avatar>
                              <AvatarFallback className="bg-purple-500 text-white">
                                <MessageSquare className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  会话 #{session.sessionId.slice(-8)}
                                </span>
                                {session.userName && (
                                  <span className="text-sm text-slate-600 dark:text-slate-400">
                                    - {session.userName}
                                  </span>
                                )}
                                <Badge
                                  variant={session.status === 'active' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {session.status === 'active' ? '活跃' : '非活跃'}
                                </Badge>
                              </div>
                              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 truncate">
                                {session.lastMessage || '暂无消息'}
                              </div>
                            </div>

                            <div className="text-right flex items-center gap-4">
                              <div className="text-sm">
                                <div className="text-slate-600 dark:text-slate-400">
                                  {session.messageCount} 条消息
                                </div>
                                <div className="text-slate-500 dark:text-slate-500">
                                  {formatTime(session.lastActiveTime)}
                                </div>
                              </div>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    查看详情
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    删除会话
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <div>没有找到会话</div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 业务消息监控 */}
            <TabsContent value="business" className="flex-1 overflow-hidden">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>业务消息监控</CardTitle>
                  <CardDescription>
                    实时监控业务消息流
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="space-y-3">
                      {businessMessages.length > 0 ? (
                        businessMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                          >
                            <Avatar>
                              <AvatarFallback className={
                                msg.senderType === 'ai' 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-slate-500 text-white'
                              }>
                                {msg.senderType === 'ai' ? (
                                  <Bot className="h-4 w-4" />
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {msg.senderName || '未知'}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  会话 #{msg.sessionId.slice(-8)}
                                </Badge>
                                <Badge
                                  variant={msg.senderType === 'ai' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {msg.senderType === 'ai' ? 'AI回复' : '用户消息'}
                                </Badge>
                              </div>
                              <div className="text-sm text-slate-900 dark:text-slate-100 mt-2">
                                {msg.content}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                {formatTime(msg.createdAt)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <div>暂无业务消息</div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
