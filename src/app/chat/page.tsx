/**
 * 聊天/消息页面
 * 
 * 集成SSE实时消息推送功能
 * 实现完整的消息收发、历史加载和状态管理
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Wifi, 
  WifiOff, 
  MoreVertical,
  Trash2,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  sessionId: string;
  content: string;
  senderType: string;
  senderId: string;
  senderName: string;
  messageType: string;
  createdAt: string;
  isHuman?: boolean;
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState(() => {
    // 从localStorage获取会话ID，如果没有则创建新的
    const saved = localStorage.getItem('chat_session_id');
    if (saved) return saved;
    const newId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chat_session_id', newId);
    return newId;
  });
  
  const [messageInput, setMessageInput] = useState('');
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 使用SSE实时接收消息
  const {
    connected,
    messages: sseMessages,
    error,
    reconnectAttempts,
    connect,
    disconnect,
  } = useSSE({
    sessionId,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    onMessage: (message) => {
      console.log('[Chat] 收到新消息:', message);
    },
  });

  // 合并历史消息和SSE实时消息
  const allMessages = [...historyMessages, ...sseMessages];

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages.length]);

  // 加载消息历史
  useEffect(() => {
    loadHistory();
  }, [sessionId]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/messages?sessionId=${sessionId}&limit=50`);
      const data = await response.json();

      if (data.success) {
        setHistoryMessages(data.data.messages || []);
      } else {
        console.error('加载消息历史失败:', data.message);
      }
    } catch (error) {
      console.error('加载消息历史失败:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content || sending) return;

    setSending(true);
    setMessageInput('');

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          content,
          senderType: 'user',
          senderName: '用户',
          senderId: 'user-1',
          robotId: 'default-robot',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '发送失败');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      alert('发送消息失败，请重试');
      setMessageInput(content); // 恢复消息内容
    } finally {
      setSending(false);
      // 聚焦回输入框
      inputRef.current?.focus();
    }
  };

  const handleNewSession = () => {
    const newId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chat_session_id', newId);
    setSessionId(newId);
    setHistoryMessages([]);
    setMessageInput('');
  };

  const handleClearHistory = async () => {
    if (!confirm('确定要清空聊天记录吗？')) return;

    try {
      // 这里可以添加删除消息的API
      setHistoryMessages([]);
      // 重新加载空历史
      await loadHistory();
    } catch (error) {
      console.error('清空历史失败:', error);
    }
  };

  const handleCopySessionId = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isUserMessage = (message: Message) => {
    return message.senderType === 'user';
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* 顶部栏 */}
      <div className="border-b bg-white dark:bg-slate-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-blue-500" />
              <h1 className="text-lg font-semibold">AI 对话</h1>
            </div>

            {/* 连接状态 */}
            <div className="flex items-center gap-2">
              {connected ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Wifi className="h-3 w-3 mr-1" />
                  在线
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <WifiOff className="h-3 w-3 mr-1" />
                  离线
                  {reconnectAttempts > 0 && ` (${reconnectAttempts}/10)`}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 会话ID */}
            <Badge variant="secondary" className="text-xs">
              会话: {sessionId.slice(0, 8)}...
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopySessionId}
            >
              {copySuccess ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={loadHistory}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新历史
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleNewSession}>
                  <User className="h-4 w-4 mr-2" />
                  新建会话
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleClearHistory}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  清空记录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto">
          <ScrollArea className="h-full">
            <div ref={scrollRef} className="p-4 space-y-4">
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <div className="text-sm text-slate-500">
                    加载历史消息中...
                  </div>
                </div>
              ) : allMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Bot className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
                  <div className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
                    开始对话
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-500">
                    发送消息开始与AI助手对话
                  </div>
                </div>
              ) : (
                allMessages.map((message, index) => (
                  <div
                    key={`${message.id}-${index}`}
                    className={`flex gap-3 ${
                      isUserMessage(message) ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isUserMessage(message) && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="bg-blue-500 text-white">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 ${
                        isUserMessage(message)
                          ? 'bg-blue-500 text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          isUserMessage(message)
                            ? 'text-blue-100'
                            : 'text-slate-500'
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </div>
                    </div>

                    {isUserMessage(message) && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="bg-slate-500 text-white">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))
              )}

              {error && (
                <div className="flex justify-center py-4">
                  <Badge variant="destructive">
                    连接错误: {error.message}
                  </Badge>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="border-t bg-white dark:bg-slate-800 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                connected 
                  ? '输入消息，按 Enter 发送...' 
                  : '正在连接...'
              }
              disabled={!connected || sending}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!connected || sending || !messageInput.trim()}
            >
              {sending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
