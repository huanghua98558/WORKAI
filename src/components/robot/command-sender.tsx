'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Robot {
  id: string;
  robotId: string;
  name: string;
  isActive: boolean;
  status: string;
  description?: string;
  company?: string;
  nickname?: string;
}

interface Command {
  commandId: string;
  robotId: string;
  commandType: string;
  status: string;
  priority: number;
  createdAt: string;
  result?: any;
  errorMessage?: string;
}

interface MessageHistory {
  id: string;
  commandId: string;
  robotId: string;
  robotName: string;
  robotCompany?: string;
  commandType: string;
  recipient: string | null;
  messageContent: any;
  atList: any;
  status: string;
  priority: number;
  createdAt: string;
  executedAt?: string;
  completedAt?: string;
  retryCount: number;
  errorMessage?: string;
  result?: any;
}

const COMMAND_TYPES = [
  { value: 'send_group_message', label: '发送群消息' },
  { value: 'send_private_message', label: '发送私聊消息' },
  { value: 'batch_send_message', label: '批量发送消息' },
  { value: 'forward_message', label: '转发消息' },
  { value: 'create_room', label: '创建群聊' },
  { value: 'invite_to_room', label: '邀请入群' },
  { value: 'upload_file', label: '上传文件' },
  { value: 'get_contacts', label: '获取联系人' },
  { value: 'get_rooms', label: '获取群聊' },
  { value: 'update_profile', label: '更新资料' }
];

const PRIORITIES = [
  { value: 1, label: '最高' },
  { value: 3, label: '高' },
  { value: 5, label: '中' },
  { value: 7, label: '低' },
  { value: 10, label: '最低' }
];

export default function CommandSender() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyStats, setHistoryStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<string>('');
  const [selectedRobotDisplay, setSelectedRobotDisplay] = useState<string>('');
  const [commandType, setCommandType] = useState<string>('send_group_message');
  const [priority, setPriority] = useState<number>(5);
  const [commandPayload, setCommandPayload] = useState<any>(null);
  
  // 消息历史筛选条件
  const [historyFilter, setHistoryFilter] = useState({
    robotId: 'all',
    commandType: 'all',
    status: 'all',
    limit: 50
  });
  
  // 使用 ref 保存最新的筛选条件，避免闭包陷阱
  const historyFilterRef = useRef(historyFilter);
  historyFilterRef.current = historyFilter;
  
  // 表单字段状态
  const [formData, setFormData] = useState({
    // 群发消息
    groupName: '',
    groupContent: '',
    groupAtList: '',
    
    // 私聊消息
    userName: '',
    privateContent: '',
    
    // 批量消息
    batchMessages: [{ recipient: '', content: '' }],

    // 转发消息
    msgId: '',
    forwardToList: '',

    // 创建群聊
    roomName: '',
    members: '',

    // 邀请入群
    chatId: '',
    inviteMembers: '',

    // 上传文件
    filePath: '',
    fileTo: '',

    // 更新资料
    profileName: '',
    profileAlias: '',
    profileMobile: '',
    profileDepartment: ''
  });

  // 加载机器人列表
  const fetchRobots = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/robots');
      const result = await response.json();
      
      if (result.code === 0) {
        console.log('加载到的机器人数据:', result.data);
        setRobots(result.data);
      } else {
        toast.error(result.message || '加载机器人列表失败');
      }
    } catch (error) {
      console.error('加载机器人列表失败:', error);
      toast.error('加载机器人列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载指令列表
  const fetchCommands = async () => {
    try {
      const response = await fetch('/api/admin/robot-commands?limit=20');
      const result = await response.json();
      
      if (result.success) {
        setCommands(result.data);
      }
    } catch (error) {
      console.error('加载指令列表失败:', error);
    }
  };

  // 加载消息历史
  const fetchMessageHistory = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setHistoryLoading(true);
      }
      const params = new URLSearchParams();
      const filter = historyFilterRef.current;
      if (filter.robotId && filter.robotId !== 'all') params.append('robotId', filter.robotId);
      if (filter.commandType && filter.commandType !== 'all') params.append('commandType', filter.commandType);
      if (filter.status && filter.status !== 'all') params.append('status', filter.status);
      params.append('limit', String(filter.limit));
      
      const response = await fetch(`/api/admin/message-history?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setMessageHistory(result.data);
        setHistoryTotal(result.total);
        setHistoryStats(result.stats || []);
      } else {
        toast.error(result.message || '加载消息历史失败');
      }
    } catch (error) {
      console.error('加载消息历史失败:', error);
      toast.error('加载消息历史失败');
    } finally {
      if (showLoading) {
        setHistoryLoading(false);
      }
    }
  }, []);

  // 初始化加载数据（只执行一次）
  useEffect(() => {
    fetchRobots();
    fetchCommands();
    fetchMessageHistory(true); // 初始化时显示加载状态
  }, [fetchMessageHistory]);

  // 定时刷新（只执行一次，持续运行）- 不显示加载状态，避免闪烁
  useEffect(() => {
    const commandsInterval = setInterval(fetchCommands, 10000); // 优化：从5秒增加到10秒
    const historyInterval = setInterval(() => fetchMessageHistory(false), 10000); // 优化：从5秒增加到10秒
    return () => {
      clearInterval(commandsInterval);
      clearInterval(historyInterval);
    };
  }, [fetchMessageHistory]);

  // 当筛选条件变化时，重新加载消息历史 - 显示加载状态
  useEffect(() => {
    fetchMessageHistory(true);
  }, [historyFilter, fetchMessageHistory]);

  // 构建指令 payload
  const buildPayload = () => {
    switch (commandType) {
      case 'send_group_message':
        if (!formData.groupName || !formData.groupContent) {
          throw new Error('请填写群名称和消息内容');
        }
        const atList = formData.groupAtList
          ? formData.groupAtList.split(/[,，]/).map(s => s.trim()).filter(s => s)
          : [];
        return {
          socketType: 2,
          list: [
            {
              type: 203,
              titleList: [formData.groupName],
              receivedContent: formData.groupContent,
              ...(atList.length > 0 && { atList })
            }
          ]
        };

      case 'send_private_message':
        if (!formData.userName || !formData.privateContent) {
          throw new Error('请填写用户昵称和消息内容');
        }
        return {
          socketType: 2,
          list: [
            {
              type: 203,
              titleList: [formData.userName],
              receivedContent: formData.privateContent,
              atList: []
            }
          ]
        };

      case 'batch_send_message':
        const validMessages = formData.batchMessages.filter(
          msg => msg.recipient && msg.content
        );
        if (validMessages.length === 0) {
          throw new Error('请至少添加一条有效的消息');
        }
        return {
          socketType: 2,
          list: validMessages.map(msg => ({
            type: 203,
            titleList: [msg.recipient],
            receivedContent: msg.content
          }))
        };

      case 'forward_message':
        if (!formData.msgId) {
          throw new Error('请填写消息ID');
        }
        const toList = formData.forwardToList
          ? formData.forwardToList.split(/[,，]/).map(s => s.trim()).filter(s => s)
          : [];
        return {
          msgId: formData.msgId,
          to: toList
        };

      case 'create_room':
        if (!formData.roomName) {
          throw new Error('请填写群聊名称');
        }
        const memberList = formData.members
          ? formData.members.split(/[,，]/).map(s => s.trim()).filter(s => s)
          : [];
        return {
          name: formData.roomName,
          members: memberList
        };

      case 'invite_to_room':
        if (!formData.chatId) {
          throw new Error('请填写群聊ID');
        }
        const inviteList = formData.inviteMembers
          ? formData.inviteMembers.split(/[,，]/).map(s => s.trim()).filter(s => s)
          : [];
        return {
          chatId: formData.chatId,
          members: inviteList
        };

      case 'upload_file':
        if (!formData.filePath || !formData.fileTo) {
          throw new Error('请填写文件路径和发送目标');
        }
        return {
          filePath: formData.filePath,
          to: formData.fileTo
        };

      case 'get_contacts':
      case 'get_rooms':
        return {};

      case 'update_profile':
        return {
          ...(formData.profileName && { name: formData.profileName }),
          ...(formData.profileAlias && { alias: formData.profileAlias }),
          ...(formData.profileMobile && { mobile: formData.profileMobile }),
          ...(formData.profileDepartment && { department: formData.profileDepartment })
        };

      default:
        throw new Error('不支持的指令类型');
    }
  };

  // 构建预览 payload（用于显示）
  const buildPayloadPreview = () => {
    try {
      return buildPayload();
    } catch (error) {
      return {};
    }
  };

  // 发送指令
  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRobot) {
      toast.error('请选择机器人');
      return;
    }

    try {
      setSending(true);
      
      // 构建指令 payload
      let payload;
      try {
        payload = buildPayload();
      } catch (error: any) {
        toast.error(error.message || '构建指令失败');
        setSending(false);
        return;
      }

      const response = await fetch('/api/admin/robot-commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robotId: selectedRobot,
          commandType,
          commandPayload: payload,
          priority
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('指令发送成功', {
          description: '指令已加入队列，等待执行'
        });
        // 重置表单
        resetForm();
        fetchCommands();
      } else {
        toast.error(result.message || '发送指令失败');
      }
    } catch (error) {
      console.error('发送指令失败:', error);
      toast.error('发送指令失败');
    } finally {
      setSending(false);
    }
  };

  // 重试指令
  const handleRetryCommand = async (commandId: string) => {
    try {
      const response = await fetch(`/api/admin/robot-commands/${commandId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('指令重试成功');
        fetchCommands();
      } else {
        toast.error(result.message || '重试失败');
      }
    } catch (error) {
      console.error('重试失败:', error);
      toast.error('重试失败');
    }
  };

  // 获取机器人状态标签
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      online: { label: '在线', className: 'bg-green-500 hover:bg-green-600' },
      offline: { label: '离线', className: 'bg-gray-100 text-gray-600' },
      unknown: { label: '未知', className: 'bg-gray-100 text-gray-600' },
      error: { label: '错误', className: 'bg-red-500' }
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // 获取指令状态标签
  const getCommandStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: '待处理', variant: 'default' },
      processing: { label: '处理中', variant: 'secondary' },
      completed: { label: '已完成', variant: 'default' },
      failed: { label: '失败', variant: 'destructive' },
      cancelled: { label: '已取消', variant: 'outline' }
    };

    const config = statusConfig[status] || { label: status, variant: 'default' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 获取优先级标签
  const getPriorityBadge = (priority: number) => {
    const level = priority <= 3 ? 'high' : priority <= 6 ? 'medium' : 'low';
    const label = PRIORITIES.find(p => p.value === priority)?.label || '未知';
    const variant = level === 'high' ? 'destructive' : level === 'medium' ? 'default' : 'secondary';
    return <Badge variant={variant}>{label}</Badge>;
  };

  // 重置表单
  const resetForm = () => {
    setCommandType('send_group_message');
    setPriority(5);
    setFormData({
      groupName: '',
      groupContent: '',
      groupAtList: '',
      userName: '',
      privateContent: '',
      batchMessages: [{ recipient: '', content: '' }],
      msgId: '',
      forwardToList: '',
      roomName: '',
      members: '',
      chatId: '',
      inviteMembers: '',
      filePath: '',
      fileTo: '',
      profileName: '',
      profileAlias: '',
      profileMobile: '',
      profileDepartment: ''
    });
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">指令发送</h2>
        <p className="text-sm text-muted-foreground">向在线机器人发送指令并查看执行状态</p>
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">发送指令</TabsTrigger>
          <TabsTrigger value="history">发送历史</TabsTrigger>
        </TabsList>

        {/* 标签页：发送指令 */}
        <TabsContent value="send" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* 发送指令表单 */}
            <Card>
          <CardHeader>
            <CardTitle>发送指令</CardTitle>
            <CardDescription>选择机器人并配置指令参数</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendCommand} className="space-y-4">
              <div>
                <Label htmlFor="robot">机器人</Label>
                <Select value={selectedRobot} onValueChange={(value) => {
                  setSelectedRobot(value);
                  const robot = robots.find(r => r.robotId === value);
                  setSelectedRobotDisplay(robot?.name || robot?.nickname || '');
                }} disabled={loading}>
                  <SelectTrigger id="robot">
                    <SelectValue placeholder="选择机器人" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <div className="flex items-center justify-center p-4">
                        <span className="text-sm text-muted-foreground">加载中...</span>
                      </div>
                    ) : robots.filter(r => r.isActive).length === 0 ? (
                      <div className="flex items-center justify-center p-4">
                        <span className="text-sm text-muted-foreground">暂无可用的机器人</span>
                      </div>
                    ) : (
                      robots.filter(r => r.isActive).map(robot => (
                        <SelectItem key={robot.robotId} value={robot.robotId} className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="font-semibold text-base">
                                {robot.name || robot.nickname || '未命名机器人'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {robot.company && robot.nickname 
                                  ? `${robot.company} - ${robot.nickname}` 
                                  : robot.company || robot.nickname || ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(robot.status)}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedRobot && selectedRobotDisplay && (
                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">已选择:</span>
                      <span>{selectedRobotDisplay}</span>
                      {(() => {
                        const robot = robots.find(r => r.robotId === selectedRobot);
                        return robot ? (
                          <>
                            {getStatusBadge(robot.status)}
                            <span className="text-muted-foreground">
                              | {robot.company && robot.nickname 
                                ? `${robot.company} - ${robot.nickname}`
                                : robot.company || robot.nickname || ''}
                            </span>
                          </>
                        ) : null;
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commandType">指令类型</Label>
                  <Select value={commandType} onValueChange={setCommandType}>
                    <SelectTrigger id="commandType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMAND_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {commandType === 'send_group_message' && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                      💡 <strong>群发消息：</strong>向群聊发送消息，支持 @ 功能。titleList填写群名，atList填写需要@的人名。
                    </div>
                  )}
                  {commandType === 'send_private_message' && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                      💡 <strong>私聊消息：</strong>向个人发送消息，不支持 @ 功能。titleList填写用户昵称。
                    </div>
                  )}
                  {commandType === 'batch_send_message' && (
                    <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700">
                      💡 <strong>批量发送：</strong>一次性发送多条消息到不同的群聊或个人。list数组中配置多个消息对象。
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="priority">优先级</Label>
                  <Select value={String(priority)} onValueChange={(v) => setPriority(parseInt(v))}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p.value} value={String(p.value)}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 动态表单字段 */}
              {commandType === 'send_group_message' && (
                <div className="space-y-4 p-4 bg-muted rounded-lg border">
                  <h4 className="font-semibold text-sm">群发消息参数</h4>
                  <div>
                    <Label htmlFor="groupName">群聊名称 <span className="text-red-500">*</span></Label>
                    <Input
                      id="groupName"
                      value={formData.groupName}
                      onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                      placeholder="例如：产品研发部"
                    />
                  </div>
                  <div>
                    <Label htmlFor="groupContent">消息内容 <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="groupContent"
                      value={formData.groupContent}
                      onChange={(e) => setFormData({ ...formData, groupContent: e.target.value })}
                      placeholder="输入要发送的群消息内容"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="groupAtList">@成员（可选）</Label>
                    <Input
                      id="groupAtList"
                      value={formData.groupAtList}
                      onChange={(e) => setFormData({ ...formData, groupAtList: e.target.value })}
                      placeholder="使用逗号分隔，例如：张三,李四,王五"
                    />
                    <p className="text-xs text-muted-foreground mt-1">支持@群内成员，用逗号分隔多个昵称</p>
                  </div>
                </div>
              )}

              {commandType === 'send_private_message' && (
                <div className="space-y-4 p-4 bg-muted rounded-lg border">
                  <h4 className="font-semibold text-sm">私聊消息参数</h4>
                  <div>
                    <Label htmlFor="userName">用户昵称 <span className="text-red-500">*</span></Label>
                    <Input
                      id="userName"
                      value={formData.userName}
                      onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                      placeholder="例如：张三"
                    />
                  </div>
                  <div>
                    <Label htmlFor="privateContent">消息内容 <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="privateContent"
                      value={formData.privateContent}
                      onChange={(e) => setFormData({ ...formData, privateContent: e.target.value })}
                      placeholder="输入要发送的私聊消息内容"
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {commandType === 'batch_send_message' && (
                <div className="space-y-4 p-4 bg-muted rounded-lg border">
                  <h4 className="font-semibold text-sm">批量发送参数</h4>
                  {formData.batchMessages.map((msg, index) => (
                    <div key={index} className="space-y-3 p-3 bg-background rounded border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">消息 {index + 1}</span>
                        {formData.batchMessages.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const newMessages = formData.batchMessages.filter((_, i) => i !== index);
                              setFormData({ ...formData, batchMessages: newMessages });
                            }}
                          >
                            删除
                          </Button>
                        )}
                      </div>
                      <div>
                        <Label htmlFor={`recipient-${index}`}>接收者（群聊或个人） <span className="text-red-500">*</span></Label>
                        <Input
                          id={`recipient-${index}`}
                          value={msg.recipient}
                          onChange={(e) => {
                            const newMessages = [...formData.batchMessages];
                            newMessages[index].recipient = e.target.value;
                            setFormData({ ...formData, batchMessages: newMessages });
                          }}
                          placeholder="群聊名称或用户昵称"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`content-${index}`}>消息内容 <span className="text-red-500">*</span></Label>
                        <Textarea
                          id={`content-${index}`}
                          value={msg.content}
                          onChange={(e) => {
                            const newMessages = [...formData.batchMessages];
                            newMessages[index].content = e.target.value;
                            setFormData({ ...formData, batchMessages: newMessages });
                          }}
                          placeholder="输入消息内容"
                          rows={3}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setFormData({
                      ...formData,
                      batchMessages: [...formData.batchMessages, { recipient: '', content: '' }]
                    })}
                  >
                    + 添加消息
                  </Button>
                </div>
              )}

              {commandType === 'forward_message' && (
                <div className="space-y-4 p-4 bg-muted rounded-lg border">
                  <h4 className="font-semibold text-sm">转发消息参数</h4>
                  <div>
                    <Label htmlFor="msgId">消息ID <span className="text-red-500">*</span></Label>
                    <Input
                      id="msgId"
                      value={formData.msgId}
                      onChange={(e) => setFormData({ ...formData, msgId: e.target.value })}
                      placeholder="要转发的消息ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="forwardToList">转发目标（可选）</Label>
                    <Input
                      id="forwardToList"
                      value={formData.forwardToList}
                      onChange={(e) => setFormData({ ...formData, forwardToList: e.target.value })}
                      placeholder="使用逗号分隔，例如：群聊1,张三"
                    />
                  </div>
                </div>
              )}

              {commandType === 'create_room' && (
                <div className="space-y-4 p-4 bg-muted rounded-lg border">
                  <h4 className="font-semibold text-sm">创建群聊参数</h4>
                  <div>
                    <Label htmlFor="roomName">群聊名称 <span className="text-red-500">*</span></Label>
                    <Input
                      id="roomName"
                      value={formData.roomName}
                      onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                      placeholder="例如：项目讨论组"
                    />
                  </div>
                  <div>
                    <Label htmlFor="members">成员列表（可选）</Label>
                    <Textarea
                      id="members"
                      value={formData.members}
                      onChange={(e) => setFormData({ ...formData, members: e.target.value })}
                      placeholder="使用逗号分隔成员昵称，例如：张三,李四,王五"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {commandType === 'invite_to_room' && (
                <div className="space-y-4 p-4 bg-muted rounded-lg border">
                  <h4 className="font-semibold text-sm">邀请入群参数</h4>
                  <div>
                    <Label htmlFor="chatId">群聊ID <span className="text-red-500">*</span></Label>
                    <Input
                      id="chatId"
                      value={formData.chatId}
                      onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                      placeholder="群聊的chatId"
                    />
                  </div>
                  <div>
                    <Label htmlFor="inviteMembers">成员列表（可选）</Label>
                    <Textarea
                      id="inviteMembers"
                      value={formData.inviteMembers}
                      onChange={(e) => setFormData({ ...formData, inviteMembers: e.target.value })}
                      placeholder="使用逗号分隔成员昵称"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {commandType === 'upload_file' && (
                <div className="space-y-4 p-4 bg-muted rounded-lg border">
                  <h4 className="font-semibold text-sm">上传文件参数</h4>
                  <div>
                    <Label htmlFor="filePath">文件路径 <span className="text-red-500">*</span></Label>
                    <Input
                      id="filePath"
                      value={formData.filePath}
                      onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                      placeholder="文件在服务器上的路径"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fileTo">发送目标 <span className="text-red-500">*</span></Label>
                    <Input
                      id="fileTo"
                      value={formData.fileTo}
                      onChange={(e) => setFormData({ ...formData, fileTo: e.target.value })}
                      placeholder="群聊名称或用户昵称"
                    />
                  </div>
                </div>
              )}

              {commandType === 'update_profile' && (
                <div className="space-y-4 p-4 bg-muted rounded-lg border">
                  <h4 className="font-semibold text-sm">更新资料参数</h4>
                  <div>
                    <Label htmlFor="profileName">昵称（可选）</Label>
                    <Input
                      id="profileName"
                      value={formData.profileName}
                      onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                      placeholder="新的昵称"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profileAlias">备注名（可选）</Label>
                    <Input
                      id="profileAlias"
                      value={formData.profileAlias}
                      onChange={(e) => setFormData({ ...formData, profileAlias: e.target.value })}
                      placeholder="新的备注名"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profileMobile">手机号（可选）</Label>
                    <Input
                      id="profileMobile"
                      value={formData.profileMobile}
                      onChange={(e) => setFormData({ ...formData, profileMobile: e.target.value })}
                      placeholder="新的手机号"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profileDepartment">部门（可选）</Label>
                    <Input
                      id="profileDepartment"
                      value={formData.profileDepartment}
                      onChange={(e) => setFormData({ ...formData, profileDepartment: e.target.value })}
                      placeholder="新的部门"
                    />
                  </div>
                </div>
              )}

              {/* 预览生成的 JSON（只读） */}
              <div>
                <Label htmlFor="payloadPreview">生成的指令内容（JSON）</Label>
                <Textarea
                  id="payloadPreview"
                  value={JSON.stringify(buildPayloadPreview(), null, 2)}
                  readOnly
                  rows={8}
                  className="font-mono text-sm bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">这是根据表单内容自动生成的JSON，只读</p>
              </div>

              <Button type="submit" disabled={sending || !selectedRobot} className="w-full">
                {sending ? '发送中...' : '发送指令'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 最近指令 */}
        <Card>
          <CardHeader>
            <CardTitle>最近指令</CardTitle>
            <CardDescription>查看最近的指令执行状态</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>机器人</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      <div className="space-y-2">
                        <div className="text-base font-medium">暂无指令记录</div>
                        <div className="text-sm">发送指令后，这里将显示指令执行历史</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  commands.map(command => {
                    const robot = robots.find(r => r.robotId === command.robotId);
                    const cmdType = COMMAND_TYPES.find(c => c.value === command.commandType);
                    return (
                      <TableRow key={command.commandId}>
                        <TableCell className="max-w-xs truncate">
                          {cmdType?.label || command.commandType}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {robot?.name || robot?.nickname || command.robotId}
                        </TableCell>
                        <TableCell>{getPriorityBadge(command.priority)}</TableCell>
                        <TableCell>{getCommandStatusBadge(command.status)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(command.createdAt).toLocaleString('zh-CN')}
                        </TableCell>
                        <TableCell>
                          {command.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetryCommand(command.commandId)}
                            >
                              重试
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        {/* 标签页：发送历史 */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>消息发送历史</CardTitle>
              <CardDescription>查看所有消息发送记录</CardDescription>
            </CardHeader>
            <CardContent>
              {/* 筛选条件 */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <Label htmlFor="filterRobot">机器人</Label>
                  <Select value={historyFilter.robotId} onValueChange={(value) => setHistoryFilter({ ...historyFilter, robotId: value })}>
                    <SelectTrigger id="filterRobot">
                      <SelectValue placeholder="全部机器人" />
                    </SelectTrigger>
                    <SelectContent>
                      {robots.filter(r => r.isActive).map(robot => (
                        <SelectItem key={robot.robotId} value={robot.robotId}>
                          {robot.name || robot.nickname || robot.robotId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filterType">消息类型</Label>
                  <Select value={historyFilter.commandType} onValueChange={(value) => setHistoryFilter({ ...historyFilter, commandType: value })}>
                    <SelectTrigger id="filterType">
                      <SelectValue placeholder="全部类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类型</SelectItem>
                      <SelectItem value="send_group_message">群发消息</SelectItem>
                      <SelectItem value="send_private_message">私聊消息</SelectItem>
                      <SelectItem value="batch_send_message">批量发送</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filterStatus">状态</Label>
                  <Select value={historyFilter.status} onValueChange={(value) => setHistoryFilter({ ...historyFilter, status: value })}>
                    <SelectTrigger id="filterStatus">
                      <SelectValue placeholder="全部状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="pending">待处理</SelectItem>
                      <SelectItem value="processing">处理中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="failed">失败</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filterLimit">显示数量</Label>
                  <Select value={String(historyFilter.limit)} onValueChange={(value) => setHistoryFilter({ ...historyFilter, limit: parseInt(value) })}>
                    <SelectTrigger id="filterLimit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20条</SelectItem>
                      <SelectItem value="50">50条</SelectItem>
                      <SelectItem value="100">100条</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 统计信息 */}
              {historyStats.length > 0 && (
                <div className="grid grid-cols-4 gap-4 mb-4">
                  {['pending', 'processing', 'completed', 'failed'].map(status => {
                    const stat = historyStats.find(s => s.status === status);
                    return (
                      <div key={status} className="p-3 bg-muted rounded-lg">
                        <div className="text-sm text-muted-foreground">
                          {status === 'pending' && '待处理'}
                          {status === 'processing' && '处理中'}
                          {status === 'completed' && '已完成'}
                          {status === 'failed' && '失败'}
                        </div>
                        <div className="text-2xl font-bold">{stat?.count || 0}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 历史记录表格 */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>机器人</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>接收者</TableHead>
                    <TableHead>消息内容</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>重试次数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : messageHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        <div className="space-y-2">
                          <div className="text-base font-medium">暂无消息历史</div>
                          <div className="text-sm">发送消息后，这里将显示消息发送历史</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    messageHistory.map((msg) => {
                      const cmdType = COMMAND_TYPES.find(c => c.value === msg.commandType);
                      let content = '';
                      if (msg.messageContent) {
                        if (typeof msg.messageContent === 'string') {
                          content = msg.messageContent;
                        } else if (Array.isArray(msg.messageContent) && msg.messageContent.length > 0) {
                          if (typeof msg.messageContent[0] === 'string') {
                            content = msg.messageContent[0];
                          }
                        }
                      }
                      return (
                        <TableRow key={msg.id}>
                          <TableCell className="text-sm">
                            {new Date(msg.createdAt).toLocaleString('zh-CN')}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="space-y-1">
                              <div className="font-medium">{msg.robotName}</div>
                              {msg.robotCompany && (
                                <div className="text-xs text-muted-foreground">{msg.robotCompany}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {cmdType?.label || msg.commandType}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {msg.recipient || '-'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {content || '-'}
                          </TableCell>
                          <TableCell>
                            {getCommandStatusBadge(msg.status)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{msg.retryCount}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* 分页信息 */}
              {historyTotal > 0 && (
                <div className="mt-4 text-sm text-muted-foreground text-center">
                  共 {historyTotal} 条记录
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
