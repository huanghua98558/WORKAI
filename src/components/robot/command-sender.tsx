'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  id: string;
  robotId: string;
  commandType: string;
  status: string;
  priority: number;
  createdAt: string;
  result?: any;
  errorMessage?: string;
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
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<string>('');
  const [selectedRobotDisplay, setSelectedRobotDisplay] = useState<string>('');
  const [commandType, setCommandType] = useState<string>('send_group_message');
  const [priority, setPriority] = useState<number>(5);
  
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
    batchMessages: [{ recipient: '', content: '' }]
  });

  // 加载机器人列表
  const fetchRobots = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/admin/robots');
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
      const response = await fetch('/api/proxy/admin/robot-commands?limit=20');
      const result = await response.json();
      
      if (result.code === 0) {
        setCommands(result.data);
      }
    } catch (error) {
      console.error('加载指令列表失败:', error);
    }
  };

  useEffect(() => {
    fetchRobots();
    fetchCommands();
    
    // 每5秒刷新一次指令列表
    const interval = setInterval(fetchCommands, 5000);
    return () => clearInterval(interval);
  }, []);

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

      default:
        throw new Error('不支持的指令类型');
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

      const response = await fetch('/api/proxy/admin/robot-commands', {
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

      if (result.code === 0) {
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
      const response = await fetch(`/api/proxy/admin/robot-commands/${commandId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

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

  // 获取指令状态标签

  // 获取优先级标签
  const getPriorityBadge = (priority: number) => {
    const level = priority <= 3 ? 'high' : priority <= 6 ? 'medium' : 'low';
    const label = PRIORITIES.find(p => p.value === priority)?.label || '未知';
    const variant = level === 'high' ? 'destructive' : level === 'medium' ? 'default' : 'secondary';
    return <Badge variant={variant}>{label}</Badge>;
  };

  // 根据命令类型生成默认 payload
  const getDefaultPayload = (type: string) => {
    switch (type) {
      case 'send_group_message':
        return JSON.stringify({
          socketType: 2,
          list: [
            {
              type: 203,
              titleList: ["群聊名称"],
              receivedContent: "要发送的群消息内容",
              atList: [] // @的人，如: ["张三", "李四"]
            }
          ]
        }, null, 2);
      case 'send_private_message':
        return JSON.stringify({
          socketType: 2,
          list: [
            {
              type: 203,
              titleList: ["用户昵称"],
              receivedContent: "要发送的私聊消息内容",
              atList: [] // 私聊消息不需要 @
            }
          ]
        }, null, 2);
      case 'batch_send_message':
        return JSON.stringify({
          socketType: 2,
          list: [
            {
              type: 203,
              titleList: ["接收者1（群聊或个人）"],
              receivedContent: "消息内容1"
            },
            {
              type: 203,
              titleList: ["接收者2（群聊或个人）"],
              receivedContent: "消息内容2"
            }
          ]
        }, null, 2);
      case 'forward_message':
        return JSON.stringify({ msgId: '', to: [] }, null, 2);
      case 'create_room':
        return JSON.stringify({ name: '', members: [] }, null, 2);
      case 'invite_to_room':
        return JSON.stringify({ chatId: '', members: [] }, null, 2);
      case 'upload_file':
        return JSON.stringify({ filePath: '', to: '' }, null, 2);
      case 'get_contacts':
        return JSON.stringify({}, null, 2);
      case 'get_rooms':
        return JSON.stringify({}, null, 2);
      case 'update_profile':
        return JSON.stringify({ name: '', alias: '', mobile: '', department: '' }, null, 2);
      default:
        return '{}';
    }
  };

  // 命令类型改变时更新默认 payload
  useEffect(() => {
    setCommandPayload(getDefaultPayload(commandType));
  }, [commandType]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">指令发送</h2>
        <p className="text-sm text-muted-foreground">向在线机器人发送指令并查看执行状态</p>
      </div>

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

              <div>
                <Label htmlFor="payload">指令内容 (JSON)</Label>
                <Textarea
                  id="payload"
                  value={commandPayload}
                  onChange={(e) => setCommandPayload(e.target.value)}
                  placeholder="输入 JSON 格式的指令参数"
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <Button type="submit" disabled={sending || !selectedRobot} className="w-full" variant="outline">
                {sending ? '发送中...' : '发送指令 (开发中)'}
              </Button>
              <div className="text-xs text-center text-muted-foreground mt-2">
                当前仅支持机器人选择和状态查看，指令发送功能敬请期待
              </div>
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
    </div>
  );
}
