'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { workToolApi } from '@/services/worktool-api-service';
import {
  Send,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  List,
  Activity,
  Settings,
  RefreshCw,
} from 'luide-react';

interface WorkToolRobotPanelProps {
  robotId: string;
  robotName: string;
}

/**
 * WorkTool 机器人功能面板
 * 提供消息发送、在线状态查询、日志查看等功能
 */
export default function WorkToolRobotPanel({ robotId, robotName }: WorkToolRobotPanelProps) {
  // 在线状态
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // 发送消息表单
  const [sendToName, setSendToName] = useState('');
  const [sendContent, setSendContent] = useState('');
  const [messageType, setMessageType] = useState('1');
  const [sending, setSending] = useState(false);

  // 登录日志
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [loadingLoginLogs, setLoadingLoginLogs] = useState(false);
  const [loginLogsPage, setLoginLogsPage] = useState(1);

  // 消息日志
  const [messageLogs, setMessageLogs] = useState<any[]>([]);
  const [loadingMessageLogs, setLoadingMessageLogs] = useState(false);
  const [messageLogsPage, setMessageLogsPage] = useState(1);

  // 查询在线状态
  const fetchOnlineStatus = async () => {
    setLoadingStatus(true);
    try {
      const response = await workToolApi.getOnlineStatus(robotId);
      setIsOnline(response.isOnline);
    } catch (error: any) {
      console.error('查询在线状态失败:', error);
      toast.error('查询在线状态失败: ' + error.message);
    } finally {
      setLoadingStatus(false);
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!sendToName.trim()) {
      toast.error('请输入接收者姓名');
      return;
    }

    if (!sendContent.trim()) {
      toast.error('请输入消息内容');
      return;
    }

    setSending(true);
    try {
      const response = await workToolApi.sendMessage({
        robotId,
        toName: sendToName,
        content: sendContent,
        messageType: parseInt(messageType),
      });

      toast.success('消息发送成功');
      setSendToName('');
      setSendContent('');
    } catch (error: any) {
      console.error('发送消息失败:', error);
      toast.error('发送消息失败: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  // 查询登录日志
  const fetchLoginLogs = async (page: number = 1) => {
    setLoadingLoginLogs(true);
    try {
      const response = await workToolApi.getLoginLogs(robotId, page, 10);
      setLoginLogs(response.list);
      setLoginLogsPage(page);
    } catch (error: any) {
      console.error('查询登录日志失败:', error);
      toast.error('查询登录日志失败: ' + error.message);
    } finally {
      setLoadingLoginLogs(false);
    }
  };

  // 查询消息日志
  const fetchMessageLogs = async (page: number = 1) => {
    setLoadingMessageLogs(true);
    try {
      const response = await workToolApi.getMessageLogs(robotId, page, 10);
      setMessageLogs(response.list);
      setMessageLogsPage(page);
    } catch (error: any) {
      console.error('查询消息日志失败:', error);
      toast.error('查询消息日志失败: ' + error.message);
    } finally {
      setLoadingMessageLogs(false);
    }
  };

  // 初始化
  useEffect(() => {
    fetchOnlineStatus();
  }, [robotId]);

  // 定时刷新在线状态
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOnlineStatus();
    }, 30000); // 每30秒刷新一次

    return () => clearInterval(interval);
  }, [robotId]);

  return (
    <div className="space-y-6">
      {/* 机器人状态卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>机器人状态</CardTitle>
              <CardDescription>WorkTool 机器人 {robotName}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchOnlineStatus}
              disabled={loadingStatus}
            >
              <RefreshCw className={`h-4 w-4 ${loadingStatus ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {loadingStatus ? (
              <Badge variant="secondary">加载中...</Badge>
            ) : isOnline ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                在线
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="w-3 h-3 mr-1" />
                离线
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 功能选项卡 */}
      <Tabs defaultValue="send-message">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="send-message">
            <Send className="w-4 h-4 mr-2" />
            发送消息
          </TabsTrigger>
          <TabsTrigger value="login-logs">
            <Clock className="w-4 h-4 mr-2" />
            登录日志
          </TabsTrigger>
          <TabsTrigger value="message-logs">
            <MessageSquare className="w-4 h-4 mr-2" />
            消息日志
          </TabsTrigger>
        </TabsList>

        {/* 发送消息 */}
        <TabsContent value="send-message">
          <Card>
            <CardHeader>
              <CardTitle>发送消息</CardTitle>
              <CardDescription>主动向企业微信用户发送消息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">接收者姓名</label>
                <Input
                  placeholder="请输入接收者姓名"
                  value={sendToName}
                  onChange={(e) => setSendToName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">消息类型</label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">文本</SelectItem>
                    <SelectItem value="2">图片</SelectItem>
                    <SelectItem value="3">视频</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">消息内容</label>
                <Textarea
                  placeholder="请输入消息内容"
                  value={sendContent}
                  onChange={(e) => setSendContent(e.target.value)}
                  rows={4}
                />
              </div>

              <Button onClick={handleSendMessage} disabled={sending} className="w-full">
                {sending ? '发送中...' : '发送消息'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 登录日志 */}
        <TabsContent value="login-logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>登录日志</CardTitle>
                  <CardDescription>机器人登录历史记录</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchLoginLogs(loginLogsPage)}
                  disabled={loadingLoginLogs}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingLoginLogs ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>登录时间</TableHead>
                    <TableHead>IP 地址</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLoginLogs ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : loginLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    loginLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.loginTime}</TableCell>
                        <TableCell>{log.ip}</TableCell>
                        <TableCell>
                          <Badge>{log.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 消息日志 */}
        <TabsContent value="message-logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>消息日志</CardTitle>
                  <CardDescription>机器人接收的消息历史</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchMessageLogs(messageLogsPage)}
                  disabled={loadingMessageLogs}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingMessageLogs ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>发送者</TableHead>
                    <TableHead>群组</TableHead>
                    <TableHead>消息内容</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMessageLogs ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : messageLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    messageLogs.map((log) => (
                      <TableRow key={log.messageId}>
                        <TableCell>{log.createTime}</TableCell>
                        <TableCell>{log.receivedName}</TableCell>
                        <TableCell>{log.groupName}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.spoken}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
