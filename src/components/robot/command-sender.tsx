'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// 导入API工具类
import { robotApi, ResponseHelper } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Bot,
  MessageSquare,
  Users,
  Send,
  Clock,
  Sparkles,
  History,
  Link2,
  Copy,
  Trash2
} from 'lucide-react';

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
  updatedAt?: string;
  executedAt?: string;
  completedAt?: string;
  retryCount?: number;
  maxRetries?: number;
  result?: any;
  errorMessage?: string;
  commandPayload?: any;
  commandData?: any;
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
  { value: 'send_group_message', label: '发送群消息', icon: MessageSquare },
  { value: 'send_private_message', label: '发送私聊消息', icon: MessageSquare },
  { value: 'batch_send_message', label: '批量发送消息', icon: Send },
  { value: 'forward_message', label: '转发消息', icon: Send },
  { value: 'create_room', label: '创建群聊', icon: Users },
  { value: 'invite_to_room', label: '邀请入群', icon: Users },
  { value: 'upload_file', label: '上传文件', icon: Link2 },
  { value: 'get_contacts', label: '获取联系人', icon: Users },
  { value: 'get_rooms', label: '获取群聊', icon: Users },
  { value: 'update_profile', label: '更新资料', icon: Bot }
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
  
  // 指令详情对话框状态
  const [selectedCommandDetail, setSelectedCommandDetail] = useState<Command | null>(null);
  const [showCommandDetail, setShowCommandDetail] = useState(false);
  
  // 表单字段状态
  const [formData, setFormData] = useState({
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

  // 加载机器人列表
  const fetchRobots = async () => {
    try {
      setLoading(true);
      console.log('[CommandSender] 开始加载机器人列表...');

      // 使用新的API工具类
      const response = await robotApi.getList();
      console.log('[CommandSender] API响应:', response);

      if (ResponseHelper.isSuccess(response)) {
        console.log('[CommandSender] 加载到的机器人数据:', response.data);
        console.log('[CommandSender] 机器人数量:', response.data?.length || 0);
        // 类型断言，因为api-robot的Robot类型和组件的Robot类型有差异
        setRobots((response.data || []) as Robot[]);
        console.log('[CommandSender] 设置robots状态完成');
      } else {
        console.error('[CommandSender] 加载机器人列表失败:', response.message, response);
        toast.error(response.message || '加载机器人列表失败');
        setRobots([]);
      }
    } catch (error) {
      console.error('[CommandSender] 加载机器人列表异常:', error);
      toast.error('加载机器人列表失败');
      setRobots([]);
    } finally {
      setLoading(false);
      console.log('[CommandSender] 加载机器人列表完成, loading状态:', false);
    }
  };

  // 加载指令列表
  const fetchCommands = async () => {
    try {
      const response = await fetch('/api/admin/robot-commands?limit=20');
      const result = await response.json();
      
      console.log('加载到的指令数据:', result);
      
      if (result.code === 0) {
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

  // 初始化加载数据
  useEffect(() => {
    console.log('[CommandSender] 初始化加载数据...');
    fetchRobots();
    fetchCommands();
    fetchMessageHistory(true);
  }, [fetchMessageHistory]);

  // 监听 robots 和 loading 状态变化
  useEffect(() => {
    console.log('[CommandSender] 状态变化 - robots数量:', robots.length, 'loading:', loading, 'selectedRobot:', selectedRobot);
  }, [robots, loading, selectedRobot]);

  // 定时刷新
  useEffect(() => {
    const commandsInterval = setInterval(fetchCommands, 3000);
    const historyInterval = setInterval(() => fetchMessageHistory(false), 3000);
    return () => {
      clearInterval(commandsInterval);
      clearInterval(historyInterval);
    };
  }, [fetchMessageHistory]);

  // 当筛选条件变化时，重新加载消息历史
  useEffect(() => {
    fetchMessageHistory(true);
  }, [historyFilter, fetchMessageHistory]);

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500 hover:bg-green-600">在线</Badge>;
      case 'offline':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600">离线</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 获取指令状态徽章
  const getCommandStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">待处理</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">处理中</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600">已完成</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // 获取优先级徽章
  const getPriorityBadge = (priority: number) => {
    const level = priority <= 3 ? 'high' : priority <= 6 ? 'medium' : 'low';
    const label = PRIORITIES.find(p => p.value === priority)?.label || '未知';
    const variant = level === 'high' ? 'destructive' : level === 'medium' ? 'default' : 'secondary';
    return <Badge variant={variant}>{label}</Badge>;
  };

  // 查看指令详情
  const handleViewDetail = async (commandId: string) => {
    try {
      const response = await fetch(`/api/admin/robot-commands/${commandId}`);
      const result = await response.json();
      
      console.log('加载指令详情响应:', result);
      
      if (result.code === 0) {
        setSelectedCommandDetail(result.data);
        setShowCommandDetail(true);
      } else {
        toast.error(result.message || '加载指令详情失败');
      }
    } catch (error) {
      console.error('加载指令详情失败:', error);
      toast.error('加载指令详情失败');
    }
  };

  // 重试指令
  const handleRetryCommand = async (commandId: string) => {
    try {
      const response = await fetch(`/api/admin/robot-commands/${commandId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      console.log('重试指令响应:', result);

      if (result.code === 0) {
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
            receivedContent: msg.content,
            atList: []
          }))
        };

      case 'forward_message':
        if (!formData.msgId) {
          throw new Error('请填写消息ID');
        }
        const forwardToList = formData.forwardToList
          ? formData.forwardToList.split(/[,，]/).map(s => s.trim()).filter(s => s)
          : [];
        return {
          socketType: 2,
          list: [
            {
              type: 207,
              msgId: formData.msgId,
              ...(forwardToList.length > 0 && { titleList: forwardToList })
            }
          ]
        };

      case 'create_room':
        if (!formData.roomName) {
          throw new Error('请填写群聊名称');
        }
        const members = formData.members
          ? formData.members.split(/[,，]/).map(s => s.trim()).filter(s => s)
          : [];
        return {
          socketType: 2,
          list: [
            {
              type: 208,
              roomName: formData.roomName,
              ...(members.length > 0 && { memberList: members })
            }
          ]
        };

      case 'invite_to_room':
        if (!formData.chatId) {
          throw new Error('请填写群聊ID');
        }
        const inviteMembers = formData.inviteMembers
          ? formData.inviteMembers.split(/[,，]/).map(s => s.trim()).filter(s => s)
          : [];
        return {
          socketType: 2,
          list: [
            {
              type: 209,
              chatId: formData.chatId,
              ...(inviteMembers.length > 0 && { memberList: inviteMembers })
            }
          ]
        };

      case 'upload_file':
        if (!formData.filePath || !formData.fileTo) {
          throw new Error('请填写文件路径和发送目标');
        }
        return {
          socketType: 2,
          list: [
            {
              type: 210,
              filePath: formData.filePath,
              titleList: [formData.fileTo]
            }
          ]
        };

      case 'get_contacts':
        return {
          socketType: 2,
          list: [
            {
              type: 211
            }
          ]
        };

      case 'get_rooms':
        return {
          socketType: 2,
          list: [
            {
              type: 212
            }
          ]
        };

      case 'update_profile':
        return {
          socketType: 2,
          list: [
            {
              type: 213,
              ...(formData.profileName && { name: formData.profileName }),
              ...(formData.profileAlias && { alias: formData.profileAlias }),
              ...(formData.profileMobile && { mobile: formData.profileMobile }),
              ...(formData.profileDepartment && { department: formData.profileDepartment })
            }
          ]
        };

      default:
        throw new Error('不支持的指令类型');
    }
  };

  // 构建预览 payload
  const buildPayloadPreview = () => {
    try {
      return buildPayload();
    } catch {
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
      const payload = buildPayload();

      const response = await fetch('/api/admin/robot-commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          robotId: selectedRobot,
          commandType,
          commandPayload: payload,
          commandData: payload,
          priority,
          maxRetries: 0
        })
      });

      const result = await response.json();

      console.log('发送指令响应:', result);

      if (result.code === 0) {
        toast.success('指令发送成功', {
          description: '指令已加入队列，等待执行'
        });
        resetForm();
        fetchCommands();
      } else {
        toast.error(result.message || '发送指令失败');
      }
    } catch (error) {
      console.error('发送指令失败:', error);
      toast.error(error instanceof Error ? error.message : '发送指令失败');
    } finally {
      setSending(false);
    }
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
        <TabsList className="grid w-full grid-cols-2 h-12 bg-white/90 backdrop-blur-md border-2 border-slate-200/80 shadow-lg shadow-slate-200/50 rounded-xl p-1.5">
          <TabsTrigger value="send" className="gap-2 h-10 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
            <Send className="h-4 w-4" />
            发送指令
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 h-10 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
            <History className="h-4 w-4" />
            发送历史
          </TabsTrigger>
        </TabsList>

        {/* 发送指令 */}
        <TabsContent value="send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>发送指令</CardTitle>
              <CardDescription>选择机器人并配置指令参数</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendCommand} className="space-y-6">
                {/* 机器人选择 */}
                <div className="space-y-2">
                  <Label htmlFor="robot" className="text-base font-semibold">机器人</Label>
                  {/* 调试信息 */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-muted-foreground">
                      调试: robots数量={robots.length}, loading={loading}, selectedRobot={selectedRobot}
                    </div>
                  )}
                  <Select value={selectedRobot} onValueChange={(value) => {
                    console.log('[CommandSender] 选择机器人:', value);
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
                      ) : robots.length === 0 ? (
                        <div className="flex items-center justify-center p-4">
                          <span className="text-sm text-muted-foreground">暂无机器人</span>
                        </div>
                      ) : (
                        robots.map((robot, idx) => (
                          <SelectItem 
                            key={`robot-select-${robot.id || robot.robotId || idx}`} 
                            value={robot.robotId} 
                            className="py-3"
                            disabled={!robot.isActive}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="font-semibold text-sm">
                                  {robot.name || robot.nickname || '未命名机器人'}
                                  {!robot.isActive && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      未激活
                                    </Badge>
                                  )}
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
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-blue-600" />
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

                {/* 指令类型和优先级 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="commandType" className="text-base font-semibold">指令类型</Label>
                    <Select value={commandType} onValueChange={setCommandType}>
                      <SelectTrigger id="commandType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMAND_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              {type.icon && <type.icon className="h-4 w-4" />}
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {commandType === 'send_group_message' && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                        💡 <strong>群发消息：</strong>向群聊发送消息，支持 @ 功能
                      </div>
                    )}
                    {commandType === 'send_private_message' && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                        💡 <strong>私聊消息：</strong>向个人发送消息
                      </div>
                    )}
                    {commandType === 'batch_send_message' && (
                      <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700">
                        💡 <strong>批量发送：</strong>一次性发送多条消息
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-base font-semibold">优先级</Label>
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
                    <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-xs text-muted-foreground">
                      ⚡ 数字越小优先级越高
                    </div>
                  </div>
                </div>

                {/* 动态表单字段 */}
                {(() => {
                  const currentType = COMMAND_TYPES.find(t => t.value === commandType);
                  if (!currentType) return null;

                  return (
                    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2">
                        {currentType.icon && <currentType.icon className="h-4 w-4 text-slate-600" />}
                        <h4 className="font-semibold text-sm">{currentType.label}参数</h4>
                      </div>

                      {commandType === 'send_group_message' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="groupName">群聊名称 <span className="text-red-500">*</span></Label>
                            <Input
                              id="groupName"
                              value={formData.groupName}
                              onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                              placeholder="例如：产品研发部"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="groupContent">消息内容 <span className="text-red-500">*</span></Label>
                            <Textarea
                              id="groupContent"
                              value={formData.groupContent}
                              onChange={(e) => setFormData({ ...formData, groupContent: e.target.value })}
                              placeholder="输入要发送的群消息内容"
                              rows={4}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="groupAtList">@成员（可选）</Label>
                            <Input
                              id="groupAtList"
                              value={formData.groupAtList}
                              onChange={(e) => setFormData({ ...formData, groupAtList: e.target.value })}
                              placeholder="使用逗号分隔，例如：张三,李四,王五"
                            />
                            <p className="text-xs text-muted-foreground mt-1">支持@群内成员，用逗号分隔多个昵称</p>
                          </div>
                        </>
                      )}

                      {commandType === 'send_private_message' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="userName">用户昵称 <span className="text-red-500">*</span></Label>
                            <Input
                              id="userName"
                              value={formData.userName}
                              onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                              placeholder="例如：张三"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="privateContent">消息内容 <span className="text-red-500">*</span></Label>
                            <Textarea
                              id="privateContent"
                              value={formData.privateContent}
                              onChange={(e) => setFormData({ ...formData, privateContent: e.target.value })}
                              placeholder="输入要发送的私聊消息内容"
                              rows={4}
                            />
                          </div>
                        </>
                      )}

                      {commandType === 'batch_send_message' && (
                        <>
                          {formData.batchMessages.map((msg, index) => (
                            <div key={`batch-msg-${index}-${msg.recipient || ''}`} className="space-y-3 p-3 bg-white rounded border">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">消息 {index + 1}</span>
                                {formData.batchMessages.length > 1 && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      const newMessages = formData.batchMessages.filter((_, i) => i !== index);
                                      setFormData({ ...formData, batchMessages: newMessages });
                                    }}
                                  >
                                    删除
                                  </Button>
                                )}
                              </div>
                              <div className="space-y-2">
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
                              <div className="space-y-2">
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
                        </>
                      )}

                      {commandType === 'forward_message' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="msgId">消息ID <span className="text-red-500">*</span></Label>
                            <Input
                              id="msgId"
                              value={formData.msgId}
                              onChange={(e) => setFormData({ ...formData, msgId: e.target.value })}
                              placeholder="要转发的消息ID"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="forwardToList">转发目标（可选）</Label>
                            <Input
                              id="forwardToList"
                              value={formData.forwardToList}
                              onChange={(e) => setFormData({ ...formData, forwardToList: e.target.value })}
                              placeholder="使用逗号分隔，例如：群聊1,张三"
                            />
                          </div>
                        </>
                      )}

                      {commandType === 'create_room' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="roomName">群聊名称 <span className="text-red-500">*</span></Label>
                            <Input
                              id="roomName"
                              value={formData.roomName}
                              onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                              placeholder="例如：项目讨论组"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="members">成员列表（可选）</Label>
                            <Textarea
                              id="members"
                              value={formData.members}
                              onChange={(e) => setFormData({ ...formData, members: e.target.value })}
                              placeholder="使用逗号分隔成员昵称，例如：张三,李四,王五"
                              rows={3}
                            />
                          </div>
                        </>
                      )}

                      {commandType === 'invite_to_room' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="chatId">群聊ID <span className="text-red-500">*</span></Label>
                            <Input
                              id="chatId"
                              value={formData.chatId}
                              onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                              placeholder="群聊的chatId"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="inviteMembers">成员列表（可选）</Label>
                            <Textarea
                              id="inviteMembers"
                              value={formData.inviteMembers}
                              onChange={(e) => setFormData({ ...formData, inviteMembers: e.target.value })}
                              placeholder="使用逗号分隔成员昵称"
                              rows={3}
                            />
                          </div>
                        </>
                      )}

                      {commandType === 'upload_file' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="filePath">文件路径 <span className="text-red-500">*</span></Label>
                            <Input
                              id="filePath"
                              value={formData.filePath}
                              onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                              placeholder="文件在服务器上的路径"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="fileTo">发送目标 <span className="text-red-500">*</span></Label>
                            <Input
                              id="fileTo"
                              value={formData.fileTo}
                              onChange={(e) => setFormData({ ...formData, fileTo: e.target.value })}
                              placeholder="群聊名称或用户昵称"
                            />
                          </div>
                        </>
                      )}

                      {commandType === 'update_profile' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="profileName">昵称（可选）</Label>
                            <Input
                              id="profileName"
                              value={formData.profileName}
                              onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                              placeholder="新的昵称"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="profileAlias">备注名（可选）</Label>
                            <Input
                              id="profileAlias"
                              value={formData.profileAlias}
                              onChange={(e) => setFormData({ ...formData, profileAlias: e.target.value })}
                              placeholder="新的备注名"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="profileMobile">手机号（可选）</Label>
                            <Input
                              id="profileMobile"
                              value={formData.profileMobile}
                              onChange={(e) => setFormData({ ...formData, profileMobile: e.target.value })}
                              placeholder="新的手机号"
                            />
                          </div>
                          <div className="space-y-2">
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
                    </div>
                  );
                })()}

                {/* 预览生成的 JSON */}
                <div className="space-y-2">
                  <Label htmlFor="payloadPreview">生成的指令内容（JSON）</Label>
                  <Textarea
                    id="payloadPreview"
                    value={JSON.stringify(buildPayloadPreview(), null, 2)}
                    readOnly
                    rows={8}
                    className="font-mono text-sm bg-slate-50"
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
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">类型</TableHead>
                    <TableHead className="font-semibold">机器人</TableHead>
                    <TableHead className="font-semibold">接收者</TableHead>
                    <TableHead className="font-semibold">消息内容</TableHead>
                    <TableHead className="font-semibold">优先级</TableHead>
                    <TableHead className="font-semibold">状态</TableHead>
                    <TableHead className="font-semibold">执行结果</TableHead>
                    <TableHead className="font-semibold">时间</TableHead>
                    <TableHead className="font-semibold">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commands.length === 0 ? (
                    <TableRow key="empty">
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                        <div className="space-y-2">
                          <Clock className="h-12 w-12 mx-auto opacity-30" />
                          <div className="text-base font-medium">暂无指令记录</div>
                          <div className="text-sm">发送指令后，这里将显示指令执行历史</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    commands.map((command, idx) => {
                      const robot = robots.find(r => r.robotId === command.robotId);
                      const cmdType = COMMAND_TYPES.find(c => c.value === command.commandType);

                      let recipient = '-';
                      let messageContent = '-';

                      if (command.commandData && command.commandData.list && command.commandData.list.length > 0) {
                        const msg = command.commandData.list[0];
                        recipient = msg.titleList && msg.titleList.length > 0 ? msg.titleList[0] : '-';
                        messageContent = msg.receivedContent || '-';

                        if (msg.atList && msg.atList.length > 0) {
                          recipient += ` ( @${msg.atList.join(', @')} )`;
                        }
                      }

                      let resultText = '';
                      switch (command.status) {
                        case 'pending':
                          resultText = '待处理';
                          break;
                        case 'processing':
                          resultText = '已提交到队列，等待执行中...';
                          break;
                        case 'completed':
                          if (command.result && command.result.message) {
                            resultText = `✓ ${command.result.message}`;
                          } else {
                            resultText = '✓ 执行成功';
                          }
                          break;
                        case 'failed':
                          resultText = `✗ ${command.errorMessage || '执行失败'}`;
                          break;
                        default:
                          resultText = '-';
                      }

                      return (
                        <TableRow key={command.commandId || idx} className="hover:bg-slate-50">
                          <TableCell className="max-w-xs truncate">
                            <div className="flex items-center gap-2">
                              {cmdType?.icon && <cmdType.icon className="h-4 w-4 text-slate-500" />}
                              {cmdType?.label || command.commandType}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {robot?.name || robot?.nickname || command.robotId}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {recipient}
                          </TableCell>
                          <TableCell className="max-w-sm truncate text-sm">
                            {messageContent}
                          </TableCell>
                          <TableCell>{getPriorityBadge(command.priority)}</TableCell>
                          <TableCell>{getCommandStatusBadge(command.status)}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {resultText}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(command.createdAt).toLocaleString('zh-CN')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetail(command.commandId)}
                              >
                                详情
                              </Button>
                              {command.status === 'failed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRetryCommand(command.commandId)}
                                >
                                  重试
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 发送历史 */}
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
                      {robots.filter(r => r.isActive).map((robot, idx) => (
                        <SelectItem key={`history-robot-${robot.id || robot.robotId || idx}`} value={robot.robotId}>
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
                      <SelectItem key="all" value="all">全部类型</SelectItem>
                      <SelectItem key="send_group_message" value="send_group_message">群发消息</SelectItem>
                      <SelectItem key="send_private_message" value="send_private_message">私聊消息</SelectItem>
                      <SelectItem key="batch_send_message" value="batch_send_message">批量发送</SelectItem>
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
                      <SelectItem key="all" value="all">全部状态</SelectItem>
                      <SelectItem key="pending" value="pending">待处理</SelectItem>
                      <SelectItem key="processing" value="processing">处理中</SelectItem>
                      <SelectItem key="completed" value="completed">已完成</SelectItem>
                      <SelectItem key="failed" value="failed">失败</SelectItem>
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
                      <SelectItem key="20" value="20">20条</SelectItem>
                      <SelectItem key="50" value="50">50条</SelectItem>
                      <SelectItem key="100" value="100">100条</SelectItem>
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
                      <div key={status} className="p-3 bg-slate-50 rounded-lg">
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
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">时间</TableHead>
                    <TableHead className="font-semibold">机器人</TableHead>
                    <TableHead className="font-semibold">类型</TableHead>
                    <TableHead className="font-semibold">接收者</TableHead>
                    <TableHead className="font-semibold">消息内容</TableHead>
                    <TableHead className="font-semibold">状态</TableHead>
                    <TableHead className="font-semibold">重试次数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow key="loading">
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : messageHistory.length === 0 ? (
                    <TableRow key="empty-history">
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        <div className="space-y-2">
                          <div className="text-base font-medium">暂无消息历史</div>
                          <div className="text-sm">发送消息后，这里将显示消息发送历史</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    messageHistory.map((msg, idx) => {
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
                        <TableRow key={msg.id || idx}>
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

      {/* 指令详情对话框 */}
      {showCommandDetail && selectedCommandDetail && (
        <Dialog open={showCommandDetail} onOpenChange={setShowCommandDetail}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>指令详情</DialogTitle>
              <DialogDescription>查看指令的详细信息和执行结果</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>指令ID</Label>
                  <div className="text-sm font-mono">{selectedCommandDetail.commandId}</div>
                </div>
                <div>
                  <Label>指令类型</Label>
                  <div className="text-sm">{selectedCommandDetail.commandType}</div>
                </div>
                <div>
                  <Label>机器人ID</Label>
                  <div className="text-sm">{selectedCommandDetail.robotId}</div>
                </div>
                <div>
                  <Label>优先级</Label>
                  <div>{getPriorityBadge(selectedCommandDetail.priority)}</div>
                </div>
                <div>
                  <Label>状态</Label>
                  <div>{getCommandStatusBadge(selectedCommandDetail.status)}</div>
                </div>
                <div>
                  <Label>重试次数</Label>
                  <div className="text-sm">{selectedCommandDetail.retryCount || 0}</div>
                </div>
                <div>
                  <Label>创建时间</Label>
                  <div className="text-sm">{new Date(selectedCommandDetail.createdAt).toLocaleString('zh-CN')}</div>
                </div>
                <div>
                  <Label>执行时间</Label>
                  <div className="text-sm">
                    {selectedCommandDetail.executedAt
                      ? new Date(selectedCommandDetail.executedAt).toLocaleString('zh-CN')
                      : '-'}
                  </div>
                </div>
                <div>
                  <Label>完成时间</Label>
                  <div className="text-sm">
                    {selectedCommandDetail.completedAt
                      ? new Date(selectedCommandDetail.completedAt).toLocaleString('zh-CN')
                      : '-'}
                  </div>
                </div>
              </div>

              <div>
                <Label>指令内容</Label>
                <Textarea
                  value={JSON.stringify(selectedCommandDetail.commandPayload || selectedCommandDetail.commandData, null, 2)}
                  readOnly
                  rows={6}
                  className="font-mono text-sm bg-slate-50"
                />
              </div>

              {selectedCommandDetail.result && (
                <div>
                  <Label>执行结果</Label>
                  <Textarea
                    value={JSON.stringify(selectedCommandDetail.result, null, 2)}
                    readOnly
                    rows={4}
                    className="font-mono text-sm bg-slate-50"
                  />
                </div>
              )}

              {selectedCommandDetail.errorMessage && (
                <div>
                  <Label>错误信息</Label>
                  <div className="text-sm text-red-600">{selectedCommandDetail.errorMessage}</div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowCommandDetail(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
