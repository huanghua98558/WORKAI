/**
 * SSE实时消息推送演示页面
 *
 * 展示如何使用SSE功能进行实时消息推送
 */

'use client';

import React, { useState } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { MessageStream } from '@/components/sse/MessageStream';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, Send, Settings } from 'lucide-react';

export default function SSEDemoPage() {
  const [sessionId, setSessionId] = useState('demo-session-1');
  const [robotId, setRobotId] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [testMessages, setTestMessages] = useState(0);

  const {
    connected,
    messages,
    error,
    reconnectAttempts,
    connect,
    disconnect,
  } = useSSE({
    sessionId,
    robotId,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    onMessage: (message) => {
      console.log('[Demo] 收到新消息:', message);
    },
  });

  const handleSendTestMessage = async () => {
    if (!messageInput.trim()) return;

    try {
      // 发送消息到后端（这里需要根据实际API调整）
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          content: messageInput,
          isHuman: true,
        }),
      });

      if (response.ok) {
        setMessageInput('');
        setTestMessages(testMessages + 1);
      } else {
        alert('发送消息失败');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      alert('发送消息失败');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto py-8 px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            SSE实时消息推送演示
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            基于PostgreSQL LISTEN/NOTIFY的实时消息推送系统
          </p>
        </div>

        {/* 连接状态卡片 */}
        <Card className="mb-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connected ? (
                <Wifi className="h-6 w-6 text-green-500" />
              ) : (
                <WifiOff className="h-6 w-6 text-red-500" />
              )}
              <div>
                <h2 className="text-lg font-semibold">连接状态</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {connected ? '已连接' : '已断开'}
                  {reconnectAttempts > 0 && ` · 重连中 (${reconnectAttempts}/10)`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {error && (
                <Badge variant="destructive">
                  {error.message}
                </Badge>
              )}

              <Badge variant="outline">
                消息数: {messages.length}
              </Badge>

              <Badge variant="outline">
                测试消息: {testMessages}
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={connected ? disconnect : connect}
              >
                {connected ? '断开' : '连接'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSessionId(`demo-session-${Date.now()}`);
                  setTestMessages(0);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                新会话
              </Button>
            </div>
          </div>
        </Card>

        {/* 主要内容区域 */}
        <Tabs defaultValue="stream" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stream">消息流</TabsTrigger>
            <TabsTrigger value="settings">设置</TabsTrigger>
          </TabsList>

          {/* 消息流标签页 */}
          <TabsContent value="stream" className="space-y-6">
            {/* 消息流组件 */}
            <div className="h-[600px]">
              <MessageStream
                sessionId={sessionId}
                robotId={robotId}
                onNewMessage={(message) => {
                  console.log('收到新消息:', message);
                }}
              />
            </div>

            {/* 发送测试消息 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">发送测试消息</h3>
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="输入测试消息..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendTestMessage();
                    }
                  }}
                />
                <Button onClick={handleSendTestMessage}>
                  <Send className="h-4 w-4 mr-2" />
                  发送
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* 设置标签页 */}
          <TabsContent value="settings">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">连接设置</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      会话ID
                    </label>
                    <Input
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      placeholder="输入会话ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      机器人ID（可选）
                    </label>
                    <Input
                      value={robotId}
                      onChange={(e) => setRobotId(e.target.value)}
                      placeholder="输入机器人ID"
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={connected ? disconnect : connect}
                      className="w-full"
                    >
                      {connected ? '断开连接' : '重新连接'}
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">技术说明</h3>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p>
                    <strong>技术方案：</strong> PostgreSQL LISTEN/NOTIFY
                  </p>
                  <p>
                    <strong>实时性：</strong> 毫秒级推送
                  </p>
                  <p>
                    <strong>自动重连：</strong> 最多10次，间隔3秒
                  </p>
                  <p>
                    <strong>心跳保活：</strong> 30秒心跳检测
                  </p>
                  <p>
                    <strong>连接管理：</strong> 支持按会话和机器人过滤
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">API端点</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code className="text-sm">
                      /api/sse/messages?sessionId={sessionId}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code className="text-sm">
                      /api/sse/stats
                    </code>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 使用说明 */}
        <Card className="mt-6 p-6">
          <h3 className="text-lg font-semibold mb-4">使用说明</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. 连接到SSE</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                页面加载时会自动连接到SSE服务器，或者点击"连接"按钮手动连接。
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">2. 接收实时消息</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                当有新消息插入到数据库时，会自动推送到前端，无需轮询。
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">3. 测试消息推送</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                在输入框中输入消息并点击"发送"，消息会插入到数据库并触发推送。
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">4. 查看连接状态</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                顶部卡片显示连接状态、消息数量和重连次数。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
