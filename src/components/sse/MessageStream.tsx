/**
 * 实时消息流组件
 *
 * 使用示例：
 * ```tsx
 * <MessageStream
 *   sessionId="your-session-id"
 *   robotId="your-robot-id"
 *   onNewMessage={(message) => console.log('新消息:', message)}
 * />
 * ```
 */

'use client';

import React, { useState } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Bot, User, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface MessageStreamProps {
  sessionId?: string;
  robotId?: string;
  onNewMessage?: (message: any) => void;
  className?: string;
}

export function MessageStream({
  sessionId,
  robotId,
  onNewMessage,
  className,
}: MessageStreamProps) {
  const [autoScroll, setAutoScroll] = useState(true);

  const {
    connected,
    messages,
    error,
    reconnectAttempts,
    connect,
    disconnect,
    clearMessages,
  } = useSSE({
    sessionId,
    robotId,
    onMessage: (message) => {
      onNewMessage?.(message);
      if (autoScroll) {
        scrollToBottom();
      }
    },
    onConnected: () => {
      console.log('✅ SSE已连接');
    },
    onDisconnected: () => {
      console.log('❌ SSE已断开');
    },
    onError: (err) => {
      console.error('❌ SSE错误:', err);
    },
  });

  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      {/* 头部状态栏 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          {connected ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          <div>
            <h3 className="font-semibold">实时消息流</h3>
            <p className="text-sm text-muted-foreground">
              {connected ? '已连接' : '已断开'} · {messages.length} 条消息
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <Badge variant="destructive">
              {error.message}
            </Badge>
          )}

          {!connected && reconnectAttempts > 0 && (
            <Badge variant="secondary">
              重连中 ({reconnectAttempts}/10)
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={connected ? disconnect : connect}
          >
            {connected ? '断开' : '连接'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearMessages();
            }}
          >
            清空
          </Button>
        </div>
      </div>

      {/* 消息列表 */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
              <p>暂无消息</p>
              <p className="text-sm">等待新消息推送...</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageItem key={index} message={message} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* 底部控制栏 */}
      <div className="flex items-center justify-between p-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto-scroll"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="auto-scroll" className="text-sm text-muted-foreground">
            自动滚动
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToBottom}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            滚动到底部
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface MessageItemProps {
  message: any;
}

function MessageItem({ message }: MessageItemProps) {
  const isBot = message.isFromBot;
  const isHuman = message.isHuman;

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg ${
        isBot
          ? 'bg-blue-50 dark:bg-blue-950/20'
          : isHuman
          ? 'bg-green-50 dark:bg-green-950/20'
          : 'bg-gray-50 dark:bg-gray-900/20'
      }`}
    >
      {/* 头像 */}
      <div className="flex-shrink-0">
        {isBot ? (
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
            <Bot className="h-4 w-4" />
          </div>
        ) : isHuman ? (
          <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white">
            <User className="h-4 w-4" />
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center text-white">
            <MessageSquare className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {isBot ? '机器人' : isHuman ? '用户' : '系统'}
          </span>

          {message.intent && (
            <Badge variant="outline" className="text-xs">
              {message.intent}
            </Badge>
          )}

          <span className="text-xs text-muted-foreground ml-auto">
            {message.createdAt
              ? new Date(message.createdAt).toLocaleTimeString()
              : '刚刚'}
          </span>
        </div>

        <p className="text-sm break-words">{message.content}</p>

        {message.sessionId && (
          <p className="text-xs text-muted-foreground mt-1">
            会话ID: {message.sessionId}
          </p>
        )}
      </div>
    </div>
  );
}
