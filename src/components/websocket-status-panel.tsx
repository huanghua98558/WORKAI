'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Wifi,
  WifiOff,
  Send,
  RefreshCw,
  Users,
  MessageSquare,
  Activity,
  Copy,
  Check,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { wsService, WSEvent, WSCommand, RobotStatus } from '@/lib/websocket-service';

interface WebSocketStatusPanelProps {
  /** 默认机器人 ID */
  defaultRobotId?: string;
  /** 默认 API Key */
  defaultApiKey?: string;
  /** 是否显示消息发送功能 */
  showMessageSender?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'command' | 'warning';
  message: string;
  data?: any;
}

/**
 * WebSocket 状态面板组件
 * 显示连接状态、在线机器人和消息日志
 */
export default function WebSocketStatusPanel({
  defaultRobotId = '',
  defaultApiKey = '',
  showMessageSender = true,
  className = '',
}: WebSocketStatusPanelProps) {
  // 状态
  const [isConnected, setIsConnected] = useState(false);
  const [robotId, setRobotId] = useState(defaultRobotId);
  const [inputRobotId, setInputRobotId] = useState(defaultRobotId);
  const [apiKey, setApiKey] = useState(defaultApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [authFailed, setAuthFailed] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [onlineRobots, setOnlineRobots] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // 消息发送
  const [roomName, setRoomName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);

  // 添加日志
  const addLog = useCallback((type: LogEntry['type'], message: string, data?: any) => {
    setLogs((prev) => [
      ...prev.slice(-99), // 保留最近100条
      {
        id: Date.now().toString(),
        timestamp: new Date(),
        type,
        message,
        data,
      },
    ]);
  }, []);

  // 获取在线状态
  const fetchOnlineRobots = useCallback(async () => {
    try {
      const response = await fetch('/api/ws/status');
      const data = await response.json();
      if (data.connectedClients) {
        setOnlineRobots(data.connectedClients);
      }
    } catch (error) {
      console.error('获取在线状态失败:', error);
    }
  }, []);

  // 连接 WebSocket
  const handleConnect = useCallback(async () => {
    if (!inputRobotId.trim()) {
      addLog('error', '请输入机器人 ID');
      return;
    }

    if (!apiKey.trim()) {
      addLog('error', '请输入 API Key');
      setAuthFailed('API Key 不能为空');
      return;
    }

    setConnecting(true);
    setAuthFailed(null);
    addLog('info', `正在连接 WebSocket...`);
    addLog('info', `机器人 ID: ${inputRobotId}`);

    try {
      // 使用带认证的连接
      await wsService.connectWithAuth(inputRobotId, apiKey);
      setRobotId(inputRobotId);
      setIsConnected(true);
      addLog('success', `WebSocket 连接成功，机器人 ID: ${inputRobotId}`);
    } catch (error: any) {
      addLog('error', `连接失败: ${error.message}`);
      setAuthFailed(error.message);
    } finally {
      setConnecting(false);
    }
  }, [inputRobotId, apiKey, addLog]);

  // 断开连接
  const handleDisconnect = useCallback(() => {
    wsService.disconnect();
    setIsConnected(false);
    setRobotId('');
    setAuthFailed(null);
    addLog('info', '已断开 WebSocket 连接');
  }, [addLog]);

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!roomName.trim() || !messageContent.trim()) {
      addLog('error', '请输入群名称和消息内容');
      return;
    }

    setSending(true);
    try {
      // 通过 API 发送
      const response = await fetch(`/api/ws/${robotId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          content: messageContent,
        }),
      });

      const data = await response.json();
      if (data.success) {
        addLog('success', `消息已发送到群: ${roomName}`, { content: messageContent });
        setMessageContent('');
      } else {
        addLog('error', `发送失败: ${data.message || data.error}`);
      }
    } catch (error: any) {
      addLog('error', `发送失败: ${error.message}`);
    } finally {
      setSending(false);
    }
  }, [robotId, roomName, messageContent, addLog]);

  // 复制 WebSocket URL
  const handleCopyUrl = useCallback(() => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5002'}${process.env.NEXT_PUBLIC_WS_PATH || '/ws'}`;
    navigator.clipboard.writeText(wsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // 初始化事件监听
  useEffect(() => {
    // 连接确认
    wsService.on(WSEvent.CONNECTED, (data: any) => {
      addLog('success', `机器人注册成功: ${data.robotId}`);
    });

    // 机器人信息
    wsService.on(WSEvent.ROBOT_INFO, (data: any) => {
      addLog('info', `机器人状态更新`, data);
    });

    // 收到命令
    wsService.on(WSEvent.COMMAND, (data: WSCommand) => {
      addLog('command', `收到命令: ${data.type}`, data.data);
    });

    // 执行命令
    wsService.on(WSEvent.EXECUTE_COMMAND, (data: WSCommand) => {
      addLog('command', `执行命令: ${data.type}`, data.data);
    });

    // 机器人上线
    wsService.on(WSEvent.ROBOT_ONLINE, (data: RobotStatus) => {
      addLog('info', `机器人上线: ${data.robotId}`);
      setOnlineRobots((prev) => [...prev, data.robotId]);
    });

    // 机器人下线
    wsService.on(WSEvent.ROBOT_OFFLINE, (data: RobotStatus) => {
      addLog('info', `机器人下线: ${data.robotId}`);
      setOnlineRobots((prev) => prev.filter((id) => id !== data.robotId));
    });

    // 断开连接
    wsService.on(WSEvent.DISCONNECT, (reason: string) => {
      addLog('error', `连接断开: ${reason}`);
      setIsConnected(false);
    });

    // 错误
    wsService.on(WSEvent.ERROR, (error: any) => {
      addLog('error', `错误: ${JSON.stringify(error)}`);
    });

    // 定时刷新在线状态
    fetchOnlineRobots();
    const interval = setInterval(fetchOnlineRobots, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [addLog, fetchOnlineRobots]);

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 获取日志类型颜色
  const getLogTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'command':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 连接状态卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              WebSocket 状态
            </CardTitle>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  已连接
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  未连接
                </>
              )}
            </Badge>
          </div>
          <CardDescription>
            WebSocket URL: {process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5002'}
            {process.env.NEXT_PUBLIC_WS_PATH || '/ws'}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 px-2"
              onClick={handleCopyUrl}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 认证失败提示 */}
          {authFailed && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>认证失败</AlertTitle>
              <AlertDescription>{authFailed}</AlertDescription>
            </Alert>
          )}

          {/* 连接控制 */}
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="robotId">机器人 ID</Label>
                <Input
                  id="robotId"
                  value={inputRobotId}
                  onChange={(e) => setInputRobotId(e.target.value)}
                  placeholder="输入机器人 ID"
                  disabled={isConnected}
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="apiKey">
                  <Key className="h-3 w-3 inline mr-1" />
                  API Key
                </Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="rk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    disabled={isConnected}
                    className="pr-10 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                    disabled={isConnected}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {isConnected ? (
                <Button variant="destructive" onClick={handleDisconnect}>
                  断开连接
                </Button>
              ) : (
                <Button onClick={handleConnect} disabled={connecting}>
                  {connecting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      连接中...
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      连接
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* 当前连接信息 */}
          {isConnected && robotId && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm">
                <span className="text-muted-foreground">当前机器人:</span>{' '}
                <span className="font-mono">{robotId}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 消息发送 */}
      {showMessageSender && isConnected && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5" />
              发送消息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="roomName">群名称</Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="输入目标群名称"
              />
            </div>
            <div>
              <Label htmlFor="messageContent">消息内容</Label>
              <Input
                id="messageContent"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="输入消息内容"
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
            </div>
            <Button onClick={handleSendMessage} disabled={sending} className="w-full">
              {sending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  发送消息
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 在线机器人列表 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              在线机器人
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchOnlineRobots}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {onlineRobots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {onlineRobots.map((id) => (
                <Badge key={id} variant="outline" className="bg-green-50">
                  {id}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无在线机器人</p>
          )}
        </CardContent>
      </Card>

      {/* 消息日志 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            消息日志
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {logs.length > 0 ? (
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded ${getLogTypeColor(log.type)} bg-muted/30`}
                  >
                    <span className="text-muted-foreground">[{formatTime(log.timestamp)}]</span>{' '}
                    {log.message}
                    {log.data && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="link" size="sm" className="h-auto p-0 ml-2">
                            查看数据
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>消息数据</DialogTitle>
                            <DialogDescription>详细的消息内容</DialogDescription>
                          </DialogHeader>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[400px]">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无日志</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
