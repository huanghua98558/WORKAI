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
  MessageSquare,
  Calendar,
  UserPlus,
  Zap,
  ChevronLeft,
  ChevronRight,
  Headphones
} from 'lucide-react';

// 售后任务类型（简化版本，匹配新的API）
export interface AfterSalesTask {
  taskId: string;
  sessionId: string;
  robotId: string;
  userId: string;
  userName: string;
  issueType: string;
  issueDescription: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedStaffUserId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  resolution?: string;
}

// API 服务（使用新的 API 端点）
const taskApiService = {
  getTasks: async (params: any) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const res = await fetch(`/api/collab/after-sales-tasks?${queryParams.toString()}`);
    const data = await res.json();
    return data;
  },

  createTask: async (task: Partial<AfterSalesTask>) => {
    const res = await fetch('/api/collab/after-sales-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return res.json();
  },

  updateTask: async (taskId: string, updates: Partial<AfterSalesTask>) => {
    const res = await fetch(`/api/collab/after-sales-tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  completeTask: async (taskId: string, resolution: string) => {
    const res = await fetch(`/api/collab/after-sales-tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        resolution,
        completedAt: new Date().toISOString()
      }),
    });
    return res.json();
  },

  cancelTask: async (taskId: string) => {
    const res = await fetch(`/api/collab/after-sales-tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    return res.json();
  },
};

export default function AfterSalesTaskOptimized() {
  const [tasks, setTasks] = useState<AfterSalesTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AfterSalesTask | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<AfterSalesTask>>({});
  const [resolution, setResolution] = useState('');

  // 过滤条件
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [limit, setLimit] = useState(50);

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
      if (result.code === 0) {
        setTasks(result.data || []);
      } else {
        console.error('加载售后任务失败:', result.message);
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

  // 创建任务
  const handleCreateTask = async (taskData: Partial<AfterSalesTask>) => {
    const result = await taskApiService.createTask(taskData);
    if (result.code === 0) {
      loadTasks();
      return true;
    }
    alert('创建任务失败: ' + result.message);
    return false;
  };

  // 更新任务
  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    const result = await taskApiService.updateTask(selectedTask.taskId, editedTask);
    if (result.code === 0) {
      loadTasks();
      setEditDialogOpen(false);
      setSelectedTask(null);
      setEditedTask({});
    } else {
      alert('更新任务失败: ' + result.message);
    }
  };

  // 完成任务
  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    const result = await taskApiService.completeTask(selectedTask.taskId, resolution);
    if (result.code === 0) {
      loadTasks();
      setCompleteDialogOpen(false);
      setResolution('');
      setSelectedTask(null);
    } else {
      alert('完成任务失败: ' + result.message);
    }
  };

  // 取消任务
  const handleCancelTask = async (task: AfterSalesTask) => {
    if (confirm(`确定要取消任务 ${task.taskId} 吗？`)) {
      const result = await taskApiService.cancelTask(task.taskId);
      if (result.code === 0) {
        loadTasks();
      } else {
        alert('取消任务失败: ' + result.message);
      }
    }
  };

  // 过滤任务
  const filteredTasks = tasks.filter(task => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        task.taskId.toLowerCase().includes(query) ||
        task.userName.toLowerCase().includes(query) ||
        task.issueDescription.toLowerCase().includes(query) ||
        task.issueType.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // 获取优先级标签
  const getPriorityBadge = (priority: string) => {
    const config = {
      low: { label: '低', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
      normal: { label: '中', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      high: { label: '高', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
      urgent: { label: '紧急', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    };
    const cfg = config[priority as keyof typeof config] || config.normal;
    return <Badge className={cfg.color}>{cfg.label}</Badge>;
  };

  // 获取状态标签
  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Clock },
      in_progress: { label: '处理中', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Zap },
      completed: { label: '已完成', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle2 },
      cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: XCircle },
    };
    const cfg = config[status as keyof typeof config] || config.pending;
    const Icon = cfg.icon;
    return (
      <Badge className={cfg.color}>
        <Icon className="w-3 h-3 mr-1" />
        {cfg.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-orange-500" />
              售后任务管理
            </CardTitle>
            <CardDescription>
              管理和跟踪所有售后任务
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadTasks}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => {
                setSelectedTask(null);
                setEditedTask({
                  priority: 'normal',
                  status: 'pending',
                  issueType: '其他',
                });
                setEditDialogOpen(true);
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              创建任务
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 过滤栏 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索任务ID、用户、问题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待处理</SelectItem>
              <SelectItem value="in_progress">处理中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="优先级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部优先级</SelectItem>
              <SelectItem value="low">低</SelectItem>
              <SelectItem value="normal">中</SelectItem>
              <SelectItem value="high">高</SelectItem>
              <SelectItem value="urgent">紧急</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 任务列表 */}
        <ScrollArea className="h-[600px]">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              加载中...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              暂无任务数据
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务ID</TableHead>
                  <TableHead>问题类型</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.taskId}>
                    <TableCell className="font-mono text-xs">
                      {task.taskId}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{task.issueType}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {task.issueDescription}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {task.userName}
                      </div>
                      {task.assignedStaffUserId && (
                        <div className="text-xs text-muted-foreground">
                          分配给: {task.assignedStaffUserId}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(task.createdAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTask(task);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        {task.status !== 'completed' && task.status !== 'cancelled' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedTask(task);
                                setEditedTask(task);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {task.status === 'pending' || task.status === 'in_progress' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setCompleteDialogOpen(true);
                                }}
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancelTask(task)}
                            >
                              <XCircle className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
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

      {/* 编辑/创建任务对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTask ? '编辑任务' : '创建任务'}
            </DialogTitle>
            <DialogDescription>
              {selectedTask ? '更新任务信息' : '创建新的售后任务'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="issueType">问题类型</Label>
                <Input
                  id="issueType"
                  value={editedTask.issueType || ''}
                  onChange={(e) => setEditedTask({ ...editedTask, issueType: e.target.value })}
                  placeholder="产品问题、服务问题..."
                />
              </div>
              <div>
                <Label htmlFor="priority">优先级</Label>
                <Select
                  value={editedTask.priority}
                  onValueChange={(value) => setEditedTask({ ...editedTask, priority: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="normal">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="issueDescription">问题描述</Label>
              <Textarea
                id="issueDescription"
                value={editedTask.issueDescription || ''}
                onChange={(e) => setEditedTask({ ...editedTask, issueDescription: e.target.value })}
                placeholder="详细描述用户反馈的问题..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="assignedStaffUserId">分配给工作人员ID</Label>
              <Input
                id="assignedStaffUserId"
                value={editedTask.assignedStaffUserId || ''}
                onChange={(e) => setEditedTask({ ...editedTask, assignedStaffUserId: e.target.value })}
                placeholder="输入工作人员ID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={selectedTask ? handleUpdateTask : () => handleCreateTask(editedTask)}>
              {selectedTask ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 完成任务对话框 */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>完成任务</DialogTitle>
            <DialogDescription>
              请提供任务解决说明
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="resolution">解决说明</Label>
            <Textarea
              id="resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="描述如何解决了这个问题..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCompleteTask} disabled={!resolution.trim()}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 任务详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>任务详情</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">任务ID</Label>
                  <div className="font-mono text-sm">{selectedTask.taskId}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">会话ID</Label>
                  <div className="font-mono text-sm">{selectedTask.sessionId}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">用户</Label>
                  <div>{selectedTask.userName}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">问题类型</Label>
                  <div>{selectedTask.issueType}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">优先级</Label>
                  <div>{getPriorityBadge(selectedTask.priority)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <div>{getStatusBadge(selectedTask.status)}</div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">问题描述</Label>
                <div className="p-3 bg-muted rounded-lg mt-1">
                  {selectedTask.issueDescription}
                </div>
              </div>
              {selectedTask.resolution && (
                <div>
                  <Label className="text-muted-foreground">解决说明</Label>
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg mt-1">
                    {selectedTask.resolution}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <Label>创建时间</Label>
                  <div>{new Date(selectedTask.createdAt).toLocaleString('zh-CN')}</div>
                </div>
                {selectedTask.completedAt && (
                  <div>
                    <Label>完成时间</Label>
                    <div>{new Date(selectedTask.completedAt).toLocaleString('zh-CN')}</div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
