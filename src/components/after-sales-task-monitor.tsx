'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  TrendingUp,
  User,
  Bot,
  ArrowUpRight,
  Edit,
  Trash2,
  RefreshCw,
  Filter,
  Search,
  MoreHorizontal,
  MessageSquare,
  Calendar,
  UserPlus,
  Zap,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// 售后任务类型
export interface AfterSalesTask {
  id: string;
  sessionId: string;
  staffUserId: string;
  staffName: string;
  userId: string;
  userName: string;
  taskType: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'waiting_response' | 'completed' | 'cancelled';
  title: string;
  description: string;
  messageId: string;
  keyword: string;
  escalatedFrom: string;
  escalationReason: string;
  expectedResponseTime: string;
  timeoutReminderLevel: number;
  lastReminderSentAt: string;
  assignedTo: string;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
  completedBy: string;
  completionNote: string;
  metadata: any;
}

// API 服务
const taskApiService = {
  getTasks: async (params: any) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const res = await fetch(`/api/after-sales/tasks?${queryParams.toString()}`);
    const data = await res.json();
    return data;
  },

  createTask: async (task: Partial<AfterSalesTask>) => {
    const res = await fetch('/api/after-sales/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return res.json();
  },

  getTaskById: async (id: string) => {
    const res = await fetch(`/api/after-sales/tasks/${id}`);
    const data = await res.json();
    return data;
  },

  updateTask: async (id: string, updates: Partial<AfterSalesTask>) => {
    const res = await fetch(`/api/after-sales/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  assignTask: async (id: string, assignedTo: string) => {
    const res = await fetch(`/api/after-sales/tasks/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo }),
    });
    return res.json();
  },

  completeTask: async (id: string, completedBy: string, completionNote?: string) => {
    const res = await fetch(`/api/after-sales/tasks/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedBy, completionNote }),
    });
    return res.json();
  },

  cancelTask: async (id: string, cancelReason: string) => {
    const res = await fetch(`/api/after-sales/tasks/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelReason }),
    });
    return res.json();
  },

  escalateTask: async (id: string, priority: string, escalationReason?: string) => {
    const res = await fetch(`/api/after-sales/tasks/${id}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority, escalationReason }),
    });
    return res.json();
  },

  deleteTask: async (id: string) => {
    const res = await fetch(`/api/after-sales/tasks/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};

// 主组件
export default function AfterSalesTaskMonitor() {
  const [tasks, setTasks] = useState<AfterSalesTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AfterSalesTask | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<AfterSalesTask>>({});

  // 过滤条件
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [limit, setLimit] = useState(20);

  // 加载数据
  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = {
        limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      };
      const result = await taskApiService.getTasks(params);
      if (result.success) {
        setTasks(result.data || []);
      } else {
        console.error('加载售后任务失败:', result.error);
      }
    } catch (error) {
      console.error('加载售后任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [limit, statusFilter, priorityFilter]);

  // 过滤任务
  const filteredTasks = tasks.filter(task => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        task.userName.toLowerCase().includes(query) ||
        task.staffName.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'border-yellow-500 text-yellow-500', icon: Clock, label: '待处理' },
      in_progress: { color: 'border-blue-500 text-blue-500', icon: RefreshCw, label: '处理中' },
      waiting_response: { color: 'border-purple-500 text-purple-500', icon: MessageSquare, label: '等待回复' },
      completed: { color: 'border-green-500 text-green-500', icon: CheckCircle2, label: '已完成' },
      cancelled: { color: 'border-gray-500 text-gray-500', icon: XCircle, label: '已取消' },
    };
    const cfg = config[status as keyof typeof config] || config.pending;
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={`gap-1 ${cfg.color}`}>
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  };

  // 获取优先级徽章
  const getPriorityBadge = (priority: string) => {
    const config = {
      low: { color: 'border-gray-400 text-gray-400', label: '低' },
      normal: { color: 'border-blue-400 text-blue-400', label: '普通' },
      high: { color: 'border-orange-500 text-orange-500', label: '高' },
      urgent: { color: 'border-red-500 text-red-500', label: '紧急' },
    };
    const cfg = config[priority as keyof typeof config] || config.normal;
    return (
      <Badge variant="outline" className={cfg.color}>
        {cfg.label}
      </Badge>
    );
  };

  // 统计数据
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    waitingResponse: tasks.filter(t => t.status === 'waiting_response').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    urgent: tasks.filter(t => t.priority === 'urgent').length,
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 处理任务操作
  const handleCompleteTask = async (task: AfterSalesTask) => {
    if (confirm('确认完成此任务？')) {
      const result = await taskApiService.completeTask(task.id, 'current_user');
      if (result.success) {
        loadTasks();
      } else {
        alert('操作失败: ' + result.error);
      }
    }
  };

  const handleCancelTask = async (task: AfterSalesTask) => {
    const reason = prompt('请输入取消原因：');
    if (reason) {
      const result = await taskApiService.cancelTask(task.id, reason);
      if (result.success) {
        loadTasks();
      } else {
        alert('操作失败: ' + result.error);
      }
    }
  };

  const handleEscalateTask = async (task: AfterSalesTask) => {
    const reason = prompt('请输入升级原因：');
    if (reason) {
      const result = await taskApiService.escalateTask(task.id, 'urgent', reason);
      if (result.success) {
        loadTasks();
      } else {
        alert('操作失败: ' + result.error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-orange-500" />
            售后任务监控
          </h3>
          <p className="text-muted-foreground mt-1">
            管理和监控所有售后任务
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTasks}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="border-primary/20 hover:border-primary/40 transition-all">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">总任务数</CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3 text-blue-500" />
              实时统计
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 hover:border-yellow-500/40 transition-all">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">待处理</CardDescription>
            <CardTitle className="text-2xl font-bold text-yellow-500">{stats.pending}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 text-yellow-500" />
              需要关注
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 hover:border-blue-500/40 transition-all">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">处理中</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-500">{stats.inProgress}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 text-blue-500" />
              进行中
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 hover:border-purple-500/40 transition-all">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">等待回复</CardDescription>
            <CardTitle className="text-2xl font-bold text-purple-500">{stats.waitingResponse}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3 text-purple-500" />
              待用户
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 hover:border-green-500/40 transition-all">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">已完成</CardDescription>
            <CardTitle className="text-2xl font-bold text-green-500">{stats.completed}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              成功
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 hover:border-red-500/40 transition-all">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">紧急</CardDescription>
            <CardTitle className="text-2xl font-bold text-red-500">{stats.urgent}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              需要立即处理
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和过滤 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="搜索任务标题、用户名、工作人员名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="in_progress">处理中</SelectItem>
                <SelectItem value="waiting_response">等待回复</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部优先级</SelectItem>
                <SelectItem value="low">低</SelectItem>
                <SelectItem value="normal">普通</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="urgent">紧急</SelectItem>
              </SelectContent>
            </Select>
            <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10条</SelectItem>
                <SelectItem value="20">20条</SelectItem>
                <SelectItem value="50">50条</SelectItem>
                <SelectItem value="100">100条</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle>任务列表</CardTitle>
          <CardDescription>
            显示最近的任务（共 {filteredTasks.length} 条）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <RefreshCw className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                <p className="text-muted-foreground">加载任务中...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无售后任务</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">任务信息</TableHead>
                    <TableHead className="w-[150px]">用户信息</TableHead>
                    <TableHead className="w-[150px]">工作人员</TableHead>
                    <TableHead className="w-[100px]">状态</TableHead>
                    <TableHead className="w-[100px]">优先级</TableHead>
                    <TableHead className="w-[150px]">创建时间</TableHead>
                    <TableHead className="w-[200px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium truncate">{task.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {task.keyword && <Badge variant="outline" className="text-xs mr-1">{task.keyword}</Badge>}
                            {task.messageId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span className="text-sm">{task.userName}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{task.userId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-3 w-3" />
                            <span className="text-sm">{task.staffName}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{task.staffUserId}</div>
                          {task.assignedTo && (
                            <div className="text-xs text-blue-500">已分配</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(task.status)}
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(task.priority)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatTime(task.createdAt)}
                        </div>
                        {task.timeoutReminderLevel > 0 && (
                          <div className="text-xs text-red-500">
                            已提醒 {task.timeoutReminderLevel} 次
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {task.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCompleteTask(task)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEscalateTask(task)}
                              >
                                <Zap className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(task.status === 'pending' || task.status === 'in_progress') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelTask(task)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
