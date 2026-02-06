'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bot, Plus, Edit2, Trash2, RefreshCw, CheckCircle, XCircle, Activity, AlertTriangle, Settings, ChevronDown, ChevronRight, Globe, ExternalLink, PlayCircle, History, Terminal } from 'lucide-react';

interface Robot {
  id: string;
  robot_id: string;
  name: string;
  api_base_url: string;
  description?: string;
  is_active: boolean;
  status: 'online' | 'offline' | 'maintenance';
  last_heartbeat?: string;
  priority: number;
  group_id?: string;
  group_name?: string;
  group_color?: string;
  group_icon?: string;
  role_id?: string;
  role_name?: string;
  capabilities?: string[];
  max_concurrent_sessions: number;
  load_balancing_weight: number;
  created_at: string;
  updated_at: string;
  // 负载均衡数据
  health_score: number;
  success_rate: number;
  current_sessions: number;
  is_available: boolean;
  avg_response_time: number;
  // 回调地址（5个）
  callback_message_url?: string;
  callback_group_qrcode_url?: string;
  callback_command_result_url?: string;
  callback_robot_online_url?: string;
  callback_robot_offline_url?: string;
  // 通讯地址（8个）
  endpoint_send_message_url?: string;
  endpoint_get_friends_url?: string;
  endpoint_get_groups_url?: string;
  endpoint_upload_file_url?: string;
  endpoint_get_qrcode_url?: string;
  endpoint_join_group_url?: string;
  endpoint_invite_member_url?: string;
  endpoint_group_members_url?: string;
}

interface RobotGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  priority: number;
}

interface RobotRole {
  id: string;
  name: string;
  priority: number;
}

export default function RobotManagement() {
  const router = useRouter();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [groups, setGroups] = useState<RobotGroup[]>([]);
  const [roles, setRoles] = useState<RobotRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRobot, setEditingRobot] = useState<Robot | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'group'>('group'); // list 或 group
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiEndpointsOpen, setApiEndpointsOpen] = useState(false);
  const [callbackEndpointsOpen, setCallbackEndpointsOpen] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; timestamp: string }>>({});
  const [logsOpen, setLogsOpen] = useState(false);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    robotId: '',
    name: '',
    apiBaseUrl: process.env.NEXT_PUBLIC_WORKTOOL_API_BASE_URL || 'https://api.worktool.ymdyes.cn/wework/',
    description: '',
    groupId: '',
    roleId: '',
    priority: 10,
    maxConcurrentSessions: 100,
    loadBalancingWeight: 1,
    capabilities: [] as string[],
    isActive: true
  });

  // 加载机器人列表
  const loadRobots = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/robots');
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

  // 加载分组列表
  const loadGroups = async () => {
    try {
      const response = await fetch('/api/admin/robot-groups');
      const result = await response.json();
      
      if (result.success) {
        setGroups(result.data);
      }
    } catch (error) {
      console.error('加载分组列表失败:', error);
    }
  };

  // 加载角色列表
  const loadRoles = async () => {
    try {
      const response = await fetch('/api/admin/robot-roles');
      const result = await response.json();
      
      if (result.success) {
        setRoles(result.data);
      }
    } catch (error) {
      console.error('加载角色列表失败:', error);
    }
  };

  useEffect(() => {
    loadRobots();
    loadGroups();
    loadRoles();
  }, []);

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingRobot 
        ? `/api/admin/robots/${editingRobot.robot_id}`
        : '/api/admin/robots';
      
      const method = editingRobot ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingRobot ? '更新机器人成功' : '创建机器人成功');
        setIsDialogOpen(false);
        resetForm();
        loadRobots();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  // 删除机器人
  const handleDelete = async (robotId: string) => {
    if (!confirm('确定要删除这个机器人吗？')) return;

    try {
      const response = await fetch(`/api/admin/robots/${robotId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('删除机器人成功');
        loadRobots();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  // 切换机器人状态
  const handleToggleStatus = async (robotId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/robots/${robotId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isActive ? 'activate' : 'deactivate' })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(isActive ? '启用机器人成功' : '停用机器人成功');
        loadRobots();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  // 编辑机器人
  const handleEdit = (robot: Robot) => {
    setEditingRobot(robot);
    setFormData({
      robotId: robot.robot_id,
      name: robot.name,
      apiBaseUrl: robot.api_base_url,
      description: robot.description || '',
      groupId: robot.group_id || '',
      roleId: robot.role_id || '',
      priority: robot.priority,
      maxConcurrentSessions: robot.max_concurrent_sessions,
      loadBalancingWeight: robot.load_balancing_weight,
      capabilities: robot.capabilities || [],
      isActive: robot.is_active
    });
    setIsDialogOpen(true);
  };

  // 重置表单
  const resetForm = () => {
    setEditingRobot(null);
    setFormData({
      robotId: '',
      name: '',
      apiBaseUrl: process.env.NEXT_PUBLIC_WORKTOOL_API_BASE_URL || 'https://api.worktool.ymdyes.cn/wework/',
      description: '',
      groupId: '',
      roleId: '',
      priority: 10,
      maxConcurrentSessions: 100,
      loadBalancingWeight: 1,
      capabilities: [],
      isActive: true
    });
    // 重置折叠面板和测试状态
    setApiEndpointsOpen(false);
    setCallbackEndpointsOpen(false);
    setLogsOpen(false);
    setTestResults({});
    setApiLogs([]);
  };

  // 测试单个接口
  const handleTestEndpoint = async (endpointType: string) => {
    if (!editingRobot) return;
    
    setTestingEndpoint(endpointType);
    try {
      const response = await fetch(`/api/admin/robots/${editingRobot.id}/api-endpoints/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpointType })
      });
      
      const result = await response.json();
      
      if (result.code === 0) {
        setTestResults({
          ...testResults,
          [endpointType]: {
            success: result.data.success,
            message: result.data.message,
            timestamp: new Date().toISOString()
          }
        });
        toast.success(result.data.message);
      } else {
        setTestResults({
          ...testResults,
          [endpointType]: {
            success: false,
            message: result.message || '测试失败',
            timestamp: new Date().toISOString()
          }
        });
        toast.error(result.message || '测试失败');
      }
    } catch (error) {
      console.error('测试接口失败:', error);
      setTestResults({
        ...testResults,
        [endpointType]: {
          success: false,
          message: '测试请求失败',
          timestamp: new Date().toISOString()
        }
      });
      toast.error('测试请求失败');
    } finally {
      setTestingEndpoint(null);
    }
  };

  // 批量测试所有通讯地址
  const handleTestAllEndpoints = async () => {
    if (!editingRobot) return;
    
    setTestingEndpoint('all');
    try {
      const response = await fetch(`/api/admin/robots/${editingRobot.id}/api-endpoints/test-all`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.code === 0) {
        const newResults: Record<string, { success: boolean; message: string; timestamp: string }> = {};
        result.data.forEach((item: any) => {
          newResults[item.endpointType] = {
            success: item.success,
            message: item.message,
            timestamp: new Date().toISOString()
          };
        });
        setTestResults(newResults);
        toast.success(`批量测试完成，成功 ${result.data.filter((r: any) => r.success).length} 个`);
      } else {
        toast.error(result.message || '批量测试失败');
      }
    } catch (error) {
      console.error('批量测试失败:', error);
      toast.error('批量测试请求失败');
    } finally {
      setTestingEndpoint(null);
    }
  };

  // 获取接口调用日志
  const handleLoadLogs = async () => {
    if (!editingRobot) return;
    
    setLogsLoading(true);
    try {
      const response = await fetch(`/api/admin/robots/${editingRobot.id}/api-endpoints/logs?page=1&pageSize=20`);
      const result = await response.json();
      
      if (result.code === 0) {
        setApiLogs(result.data.list || []);
      } else {
        toast.error(result.message || '获取日志失败');
      }
    } catch (error) {
      console.error('获取日志失败:', error);
      toast.error('获取日志失败');
    } finally {
      setLogsLoading(false);
    }
  };

  // 打开日志面板时自动加载
  useEffect(() => {
    if (logsOpen && editingRobot) {
      handleLoadLogs();
    }
  }, [logsOpen, editingRobot]);

  // 过滤机器人
  const filteredRobots = robots.filter(robot => {
    const matchesSearch = robot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         robot.robot_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroupId === 'all' || robot.group_id === selectedGroupId;
    return matchesSearch && matchesGroup;
  });

  // 按分组分组机器人
  const robotsByGroup = groups.map(group => ({
    ...group,
    robots: filteredRobots.filter(r => r.group_id === group.id)
  }));

  // 未分组的机器人
  const ungroupedRobots = filteredRobots.filter(r => !r.group_id);

  // 获取状态标签
  const getStatusBadge = (isActive: boolean, status: string) => {
    if (!isActive) {
      return <Badge variant="secondary">停用</Badge>;
    }
    
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500">在线</Badge>;
      case 'offline':
        return <Badge variant="outline">离线</Badge>;
      case 'maintenance':
        return <Badge variant="outline">维护</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // 获取健康状态颜色
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* 顶部控制栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">机器人管理</h2>
          <p className="text-sm text-muted-foreground">
            管理机器人实例，支持分组和角色配置 • 共 {robots.length} 个机器人
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="搜索机器人..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有分组</SelectItem>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>
                  {group.icon} {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-l-lg ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
            >
              列表视图
            </button>
            <button
              onClick={() => setViewMode('group')}
              className={`px-4 py-2 rounded-r-lg ${viewMode === 'group' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
            >
              分组视图
            </button>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            创建机器人
          </Button>
        </div>
      </div>

      {/* 机器人列表 - 列表视图 */}
      {viewMode === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>机器人列表</CardTitle>
            <CardDescription>
              {filteredRobots.length} 个机器人
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>分组</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>健康度</TableHead>
                  <TableHead>会话</TableHead>
                  <TableHead>成功率</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredRobots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      暂无机器人
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRobots.map(robot => (
                    <TableRow key={robot.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Bot className="w-5 h-5" />
                          <div>
                            <div>{robot.name}</div>
                            <div className="text-xs text-muted-foreground">{robot.robot_id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {robot.group_name && (
                          <Badge 
                            style={{ 
                              backgroundColor: robot.group_color || '#3b82f6',
                              color: 'white'
                            }}
                          >
                            {robot.group_icon || '🤖'} {robot.group_name}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {robot.role_name && <Badge variant="outline">{robot.role_name}</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(robot.is_active, robot.status)}
                          <Switch
                            checked={robot.is_active}
                            onCheckedChange={(checked) => handleToggleStatus(robot.robot_id, checked)}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getHealthColor(robot.health_score)}`} />
                          <span>{robot.health_score.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {robot.current_sessions}/{robot.max_concurrent_sessions}
                          <Progress 
                            value={(robot.current_sessions / robot.max_concurrent_sessions) * 100} 
                            className="w-20 mt-1"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={robot.success_rate < 80 ? 'text-red-500' : ''}>
                          {robot.success_rate.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>{robot.priority}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(robot)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(robot.robot_id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 机器人列表 - 分组视图 */}
      {viewMode === 'group' && (
        <div className="space-y-4">
          {robotsByGroup.map(group => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{group.icon}</span>
                    <div>
                      <CardTitle>{group.name}</CardTitle>
                      <CardDescription>{group.robots.length} 个机器人 • 优先级 {group.priority}</CardDescription>
                    </div>
                  </div>
                  <Badge 
                    style={{ 
                      backgroundColor: group.color,
                      color: 'white'
                    }}
                  >
                    {group.robots.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {group.robots.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    该分组暂无机器人
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {group.robots.map(robot => (
                      <div key={robot.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50">
                        <div className="flex items-center gap-4">
                          <Bot className="w-8 h-8 text-muted-foreground" />
                          <div>
                            <div className="font-semibold">{robot.name}</div>
                            <div className="text-sm text-muted-foreground">{robot.robot_id}</div>
                          </div>
                          <Badge variant="outline">{robot.role_name || '无角色'}</Badge>
                          {getStatusBadge(robot.is_active, robot.status)}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm">
                              <span className="text-muted-foreground">健康度: </span>
                              <span className={robot.health_score < 80 ? 'text-red-500 font-semibold' : ''}>
                                {robot.health_score.toFixed(0)}%
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">会话: </span>
                              {robot.current_sessions}/{robot.max_concurrent_sessions}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(robot)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(robot.robot_id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* 未分组的机器人 */}
          {ungroupedRobots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>未分组</CardTitle>
                <CardDescription>{ungroupedRobots.length} 个机器人</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {ungroupedRobots.map(robot => (
                    <div key={robot.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50">
                      <div className="flex items-center gap-4">
                        <Bot className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <div className="font-semibold">{robot.name}</div>
                          <div className="text-sm text-muted-foreground">{robot.robot_id}</div>
                        </div>
                        {getStatusBadge(robot.is_active, robot.status)}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm">
                            <span className="text-muted-foreground">健康度: </span>
                            {robot.health_score.toFixed(0)}%
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(robot)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(robot.robot_id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 创建/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRobot ? '编辑机器人' : '创建机器人'}</DialogTitle>
            <DialogDescription>
              {editingRobot ? '编辑机器人配置信息' : '创建新的机器人实例'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="robotId">机器人ID *</Label>
              <Input
                id="robotId"
                value={formData.robotId}
                onChange={(e) => setFormData({ ...formData, robotId: e.target.value })}
                placeholder="例如：robot-001"
                disabled={!!editingRobot}
                required
              />
            </div>

            <div>
              <Label htmlFor="name">名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="机器人显示名称"
                required
              />
            </div>

            <div>
              <Label htmlFor="apiBaseUrl">API Base URL</Label>
              <Input
                id="apiBaseUrl"
                value={formData.apiBaseUrl}
                onChange={(e) => setFormData({ ...formData, apiBaseUrl: e.target.value })}
                placeholder="https://api.worktool.ymdyes.cn/wework/"
              />
            </div>

            <div>
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="机器人的用途和说明"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="groupId">分组</Label>
                <Select value={formData.groupId || 'none'} onValueChange={(value) => setFormData({ ...formData, groupId: value === 'none' ? '' : value })}>
                  <SelectTrigger id="groupId">
                    <SelectValue placeholder="选择分组" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无分组</SelectItem>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.icon} {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="roleId">角色</Label>
                <Select value={formData.roleId || 'none'} onValueChange={(value) => setFormData({ ...formData, roleId: value === 'none' ? '' : value })}>
                  <SelectTrigger id="roleId">
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无角色</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} (优先级 {role.priority})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="priority">优先级</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>

              <div>
                <Label htmlFor="maxConcurrentSessions">最大并发会话</Label>
                <Input
                  id="maxConcurrentSessions"
                  type="number"
                  value={formData.maxConcurrentSessions}
                  onChange={(e) => setFormData({ ...formData, maxConcurrentSessions: parseInt(e.target.value) })}
                  min={1}
                />
              </div>

              <div>
                <Label htmlFor="loadBalancingWeight">负载均衡权重</Label>
                <Input
                  id="loadBalancingWeight"
                  type="number"
                  value={formData.loadBalancingWeight}
                  onChange={(e) => setFormData({ ...formData, loadBalancingWeight: parseInt(e.target.value) })}
                  min={1}
                  max={10}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>启用机器人</Label>
            </div>

            {/* API 地址配置折叠面板（仅在编辑时显示） */}
            {editingRobot && (
              <div className="space-y-4 border-t pt-4 mt-4">
                <Collapsible open={apiEndpointsOpen} onOpenChange={setApiEndpointsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span>通讯地址（8个）</span>
                      </div>
                      {apiEndpointsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    <div className="flex justify-end mb-2">
                      <Button size="sm" onClick={handleTestAllEndpoints} disabled={testingEndpoint === 'all'}>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        批量测试
                      </Button>
                    </div>
                    {[
                      { key: 'endpoint_send_message_url', label: '发送消息', type: 'sendMessage' },
                      { key: 'endpoint_get_friends_url', label: '获取好友列表', type: 'getFriends' },
                      { key: 'endpoint_get_groups_url', label: '获取群组列表', type: 'getGroups' },
                      { key: 'endpoint_upload_file_url', label: '上传文件', type: 'uploadFile' },
                      { key: 'endpoint_get_qrcode_url', label: '获取二维码', type: 'getQrcode' },
                      { key: 'endpoint_join_group_url', label: '加入群组', type: 'joinGroup' },
                      { key: 'endpoint_invite_member_url', label: '邀请成员', type: 'inviteMember' },
                      { key: 'endpoint_group_members_url', label: '群组成员', type: 'groupMembers' }
                    ].map(endpoint => (
                      <div key={endpoint.key} className="flex items-center gap-2 p-2 border rounded-lg bg-secondary/30">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{endpoint.label}</div>
                          <div className="text-xs text-muted-foreground break-all">
                            {editingRobot[endpoint.key as keyof Robot] as string || '未配置'}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestEndpoint(endpoint.type)}
                          disabled={testingEndpoint === endpoint.type}
                        >
                          {testingEndpoint === endpoint.type ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <PlayCircle className="w-4 h-4" />
                          )}
                        </Button>
                        {testResults[endpoint.type] && (
                          <Badge variant={testResults[endpoint.type].success ? "default" : "destructive"}>
                            {testResults[endpoint.type].success ? '成功' : '失败'}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={callbackEndpointsOpen} onOpenChange={setCallbackEndpointsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        <span>回调地址（5个）</span>
                      </div>
                      {callbackEndpointsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {[
                      { key: 'callback_message_url', label: '消息回调' },
                      { key: 'callback_group_qrcode_url', label: '群二维码回调' },
                      { key: 'callback_command_result_url', label: '指令结果回调' },
                      { key: 'callback_robot_online_url', label: '上线回调' },
                      { key: 'callback_robot_offline_url', label: '下线回调' }
                    ].map(endpoint => (
                      <div key={endpoint.key} className="p-2 border rounded-lg bg-secondary/30">
                        <div className="text-sm font-medium">{endpoint.label}</div>
                        <div className="text-xs text-muted-foreground break-all">
                          {editingRobot[endpoint.key as keyof Robot] as string || '未配置'}
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        <span>接口调用日志</span>
                      </div>
                      {logsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="max-h-60 overflow-y-auto border rounded-lg p-2">
                      {logsLoading ? (
                        <div className="text-center text-muted-foreground py-4">加载中...</div>
                      ) : apiLogs.length === 0 ? (
                        <div className="text-center text-muted-foreground py-4">暂无日志</div>
                      ) : (
                        <div className="space-y-2">
                          {apiLogs.map((log: any, index: number) => (
                            <div key={index} className="text-xs p-2 border rounded">
                              <div className="flex justify-between items-start">
                                <span className="font-medium">{log.endpoint_type}</span>
                                <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                                  {log.status}
                                </Badge>
                              </div>
                              <div className="text-muted-foreground mt-1">
                                {new Date(log.created_at).toLocaleString()}
                              </div>
                              {log.error_message && (
                                <div className="text-red-500 mt-1">{log.error_message}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit">
                {editingRobot ? '更新' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
