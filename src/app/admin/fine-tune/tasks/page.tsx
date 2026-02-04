'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Settings,
  Info
} from 'lucide-react';

interface Task {
  id: number;
  taskName: string;
  baseModel: string;
  datasetId: number;
  datasetName: string;
  fineTuneType: string;
  trainingMethod: string;
  hyperParameters: Record<string, any>;
  paiTaskId: string | null;
  status: string;
  startTime: string | null;
  endTime: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Dataset {
  id: number;
  name: string;
}

export default function FineTuneTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 表单状态
  const [formData, setFormData] = useState({
    taskName: '',
    baseModel: 'qwen-plus',
    datasetId: 0,
    fineTuneType: 'lora',
    trainingMethod: 'sft',
    hyperParameters: {
      learning_rate: '2e-4',
      batch_size: '16',
      num_train_epochs: '3',
      max_length: '2048'
    }
  });

  // 获取训练任务列表
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const status = selectedTab === 'all' ? '' : selectedTab;
      const response = await fetch(`/api/admin/fine-tune/tasks?status=${status}&page=${page}&pageSize=${pageSize}`);
      const result = await response.json();

      if (result.success) {
        setTasks(result.data.list);
        setTotal(result.data.total);
      }
    } catch (error) {
      console.error('获取训练任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取数据集列表
  const fetchDatasets = async () => {
    try {
      const response = await fetch('/api/admin/fine-tune/datasets?status=ready,uploaded&pageSize=100');
      const result = await response.json();

      if (result.success) {
        setDatasets(result.data.list);
      }
    } catch (error) {
      console.error('获取数据集失败:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, selectedTab]);

  useEffect(() => {
    fetchDatasets();
  }, []);

  // 创建训练任务
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/fine-tune/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        setIsCreateModalOpen(false);
        setFormData({
          taskName: '',
          baseModel: 'qwen-plus',
          datasetId: 0,
          fineTuneType: 'lora',
          trainingMethod: 'sft',
          hyperParameters: {
            learning_rate: '2e-4',
            batch_size: '16',
            num_train_epochs: '3',
            max_length: '2048'
          }
        });
        fetchTasks();
      }
    } catch (error) {
      console.error('创建训练任务失败:', error);
    }
  };

  // 更新任务状态
  const updateTaskStatus = async (taskId: number, action: string) => {
    try {
      const response = await fetch(`/api/admin/fine-tune/tasks/${taskId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error(`更新任务状态失败 (${action}):`, error);
    }
  };

  // 更新 PAI 任务 ID
  const updatePaiTaskId = async (taskId: number, paiTaskId: string) => {
    try {
      const response = await fetch(`/api/admin/fine-tune/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paiTaskId })
      });

      const result = await response.json();

      if (result.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('更新 PAI 任务 ID 失败:', error);
    }
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; icon: any; label: string }> = {
      pending: { color: 'bg-yellow-500', icon: Clock, label: '待开始' },
      running: { color: 'bg-blue-500', icon: Play, label: '训练中' },
      completed: { color: 'bg-green-500', icon: CheckCircle2, label: '已完成' },
      failed: { color: 'bg-red-500', icon: XCircle, label: '失败' },
      cancelled: { color: 'bg-gray-500', icon: XCircle, label: '已取消' }
    };
    const config = statusMap[status] || { color: 'bg-gray-500', icon: Info, label: status };
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // 获取微调类型标签
  const getFineTuneTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      lora: 'LoRA',
      qlora: 'QLoRA',
      full: '全参数微调'
    };
    return typeMap[type] || type;
  };

  // 获取训练方法标签
  const getTrainingMethodLabel = (method: string) => {
    const methodMap: Record<string, string> = {
      sft: '监督微调 (SFT)',
      dpo: '直接偏好优化 (DPO)',
      grpo: '群组相对策略优化 (GRPO)'
    };
    return methodMap[method] || method;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">训练任务监控</h1>
          <p className="text-muted-foreground mt-2">监控和管理微调训练任务</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建训练任务
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>创建训练任务</DialogTitle>
                <DialogDescription>
                  创建一个新的微调训练任务，在阿里云 PAI 控制台提交
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[500px] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="taskName">任务名称 *</Label>
                  <Input
                    id="taskName"
                    value={formData.taskName}
                    onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                    placeholder="输入任务名称"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseModel">基础模型 *</Label>
                  <Select
                    value={formData.baseModel}
                    onValueChange={(value) => setFormData({ ...formData, baseModel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qwen-plus">通义千问 Plus</SelectItem>
                      <SelectItem value="qwen-max">通义千问 Max</SelectItem>
                      <SelectItem value="qwen-turbo">通义千问 Turbo</SelectItem>
                      <SelectItem value="qwen2.5-7b">Qwen2.5-7B</SelectItem>
                      <SelectItem value="qwen2.5-14b">Qwen2.5-14B</SelectItem>
                      <SelectItem value="qwen2.5-32b">Qwen2.5-32B</SelectItem>
                      <SelectItem value="qwen3-8b">Qwen3-8B</SelectItem>
                      <SelectItem value="qwen3-32b">Qwen3-32B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="datasetId">数据集 *</Label>
                  <Select
                    value={formData.datasetId.toString()}
                    onValueChange={(value) => setFormData({ ...formData, datasetId: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择数据集" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id.toString()}>
                          {dataset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fineTuneType">微调类型</Label>
                    <Select
                      value={formData.fineTuneType}
                      onValueChange={(value) => setFormData({ ...formData, fineTuneType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lora">LoRA（推荐）</SelectItem>
                        <SelectItem value="qlora">QLoRA（节省显存）</SelectItem>
                        <SelectItem value="full">全参数微调</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trainingMethod">训练方法</Label>
                    <Select
                      value={formData.trainingMethod}
                      onValueChange={(value) => setFormData({ ...formData, trainingMethod: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sft">监督微调 (SFT)</SelectItem>
                        <SelectItem value="dpo">直接偏好优化 (DPO)</SelectItem>
                        <SelectItem value="grpo">群组相对策略优化 (GRPO)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>训练超参数</Label>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-xs">学习率</Label>
                      <Input
                        type="text"
                        value={formData.hyperParameters.learning_rate}
                        onChange={(e) => setFormData({
                          ...formData,
                          hyperParameters: { ...formData.hyperParameters, learning_rate: e.target.value }
                        })}
                        placeholder="2e-4"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">批次大小</Label>
                      <Input
                        type="text"
                        value={formData.hyperParameters.batch_size}
                        onChange={(e) => setFormData({
                          ...formData,
                          hyperParameters: { ...formData.hyperParameters, batch_size: e.target.value }
                        })}
                        placeholder="16"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">训练轮数</Label>
                      <Input
                        type="text"
                        value={formData.hyperParameters.num_train_epochs}
                        onChange={(e) => setFormData({
                          ...formData,
                          hyperParameters: { ...formData.hyperParameters, num_train_epochs: e.target.value }
                        })}
                        placeholder="3"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">最大长度</Label>
                      <Input
                        type="text"
                        value={formData.hyperParameters.max_length}
                        onChange={(e) => setFormData({
                          ...formData,
                          hyperParameters: { ...formData.hyperParameters, max_length: e.target.value }
                        })}
                        placeholder="2048"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  取消
                </Button>
                <Button type="submit">创建</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">操作流程</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>创建训练任务后，前往阿里云 PAI 控制台</li>
                  <li>选择对应的模型和数据集，配置超参数</li>
                  <li>提交训练任务，获取 PAI 任务 ID</li>
                  <li>在下方任务列表中填写 PAI 任务 ID 并点击"开始训练"</li>
                  <li>训练完成后，点击"完成"并注册微调模型</li>
                </ol>
              </div>
            </div>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="pending">待开始</TabsTrigger>
              <TabsTrigger value="running">训练中</TabsTrigger>
              <TabsTrigger value="completed">已完成</TabsTrigger>
              <TabsTrigger value="failed">失败</TabsTrigger>
            </TabsList>
          </Tabs>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>任务名称</TableHead>
                <TableHead>基础模型</TableHead>
                <TableHead>数据集</TableHead>
                <TableHead>微调类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <Settings className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">暂无训练任务</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{task.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{task.taskName}</div>
                      {task.paiTaskId && (
                        <div className="text-xs text-muted-foreground mt-1">
                          PAI ID: {task.paiTaskId}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{task.baseModel}</TableCell>
                    <TableCell>{task.datasetName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getFineTuneTypeLabel(task.fineTuneType)}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {task.startTime ? new Date(task.startTime).toLocaleString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {task.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const paiTaskId = prompt('请输入阿里云 PAI 任务 ID:');
                              if (paiTaskId) {
                                updatePaiTaskId(task.id, paiTaskId);
                                updateTaskStatus(task.id, 'start');
                              }
                            }}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            开始
                          </Button>
                        )}
                        {task.status === 'running' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateTaskStatus(task.id, 'complete')}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            完成
                          </Button>
                        )}
                        {task.status === 'running' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const errorMsg = prompt('请输入错误信息（如果需要标记为失败）:');
                              if (errorMsg !== null) {
                                fetch(`/api/admin/fine-tune/tasks/${task.id}/fail`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ errorMessage: errorMsg })
                                }).then(() => fetchTasks());
                              }
                            }}
                          >
                            <XCircle className="h-3 w-3 mr-1 text-red-500" />
                            失败
                          </Button>
                        )}
                        {task.paiTaskId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href="https://pai.console.aliyun.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              共 {total} 条记录
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <span className="flex items-center px-3 text-sm">
                第 {page} 页
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total}
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
