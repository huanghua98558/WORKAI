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
  robot_id: string;
  name: string;
  is_active: boolean;
  status: string;
  group_name?: string;
  role_name?: string;
}

interface Command {
  command_id: string;
  robot_id: string;
  command_type: string;
  status: string;
  priority: number;
  created_at: string;
  result?: any;
  error_message?: string;
}

const COMMAND_TYPES = [
  { value: 'send_message', label: '发送消息' },
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
  const [commandType, setCommandType] = useState<string>('send_message');
  const [priority, setPriority] = useState<number>(5);
  const [commandPayload, setCommandPayload] = useState<string>('{}');

  // 加载机器人列表
  const fetchRobots = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/robots?isActive=true&status=online');
      const result = await response.json();
      
      if (result.success) {
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
      const response = await fetch('/api/admin/robot-commands?limit=10');
      const result = await response.json();
      
      if (result.success) {
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

  // 发送指令
  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRobot) {
      toast.error('请选择机器人');
      return;
    }

    try {
      setSending(true);
      
      // 验证 JSON
      let payload;
      try {
        payload = JSON.parse(commandPayload);
      } catch {
        toast.error('指令内容必须是有效的 JSON');
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
        toast.success('指令发送成功');
        setCommandPayload('{}');
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

  // 获取状态标签
  const getStatusBadge = (status: string) => {
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

  // 根据命令类型生成默认 payload
  const getDefaultPayload = (type: string) => {
    switch (type) {
      case 'send_message':
        return JSON.stringify({ to: '', content: '', msgType: 'text' }, null, 2);
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
                <Select value={selectedRobot} onValueChange={setSelectedRobot} disabled={loading}>
                  <SelectTrigger id="robot">
                    <SelectValue placeholder="选择机器人" />
                  </SelectTrigger>
                  <SelectContent>
                    {robots.map(robot => (
                      <SelectItem key={robot.robot_id} value={robot.robot_id}>
                        {robot.name} ({robot.group_name || '无分组'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      暂无指令
                    </TableCell>
                  </TableRow>
                ) : (
                  commands.map(command => {
                    const robot = robots.find(r => r.robot_id === command.robot_id);
                    const cmdType = COMMAND_TYPES.find(c => c.value === command.command_type);
                    return (
                      <TableRow key={command.command_id}>
                        <TableCell className="max-w-xs truncate">
                          {cmdType?.label || command.command_type}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {robot?.name || command.robot_id}
                        </TableCell>
                        <TableCell>{getPriorityBadge(command.priority)}</TableCell>
                        <TableCell>{getStatusBadge(command.status)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(command.created_at).toLocaleString('zh-CN')}
                        </TableCell>
                        <TableCell>
                          {command.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetryCommand(command.command_id)}
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
