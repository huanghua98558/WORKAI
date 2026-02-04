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
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Bot,
  TrendingUp,
  Info
} from 'lucide-react';

interface Model {
  id: number;
  modelName: string;
  taskId: number;
  taskName: string;
  modelId: string;
  endpointUrl: string | null;
  baseModel: string;
  fineTuneType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  performanceMetrics: Record<string, any>;
}

export default function FineTuneModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 表单状态
  const [formData, setFormData] = useState({
    modelName: '',
    taskId: 0,
    modelId: '',
    endpointUrl: '',
    baseModel: '',
    performanceMetrics: {
      accuracy: 0,
      loss: 0
    }
  });

  // 获取微调模型列表
  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/fine-tune/models?page=${page}&pageSize=${pageSize}`);
      const result = await response.json();

      if (result.success) {
        setModels(result.data.list);
        setTotal(result.data.total);
      }
    } catch (error) {
      console.error('获取微调模型失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [page]);

  // 创建微调模型
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/fine-tune/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        setIsCreateModalOpen(false);
        setFormData({
          modelName: '',
          taskId: 0,
          modelId: '',
          endpointUrl: '',
          baseModel: '',
          performanceMetrics: {
            accuracy: 0,
            loss: 0
          }
        });
        fetchModels();
      }
    } catch (error) {
      console.error('创建微调模型失败:', error);
    }
  };

  // 删除模型
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个微调模型吗？')) return;

    try {
      const response = await fetch(`/api/fine-tune/models/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        fetchModels();
      }
    } catch (error) {
      console.error('删除微调模型失败:', error);
    }
  };

  // 复制模型 ID
  const copyModelId = (modelId: string) => {
    navigator.clipboard.writeText(modelId);
    alert('模型 ID 已复制到剪贴板');
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; icon: any; label: string }> = {
      active: { color: 'bg-green-500', icon: CheckCircle2, label: '激活' },
      inactive: { color: 'bg-gray-500', icon: XCircle, label: '未激活' },
      deleted: { color: 'bg-red-500', icon: XCircle, label: '已删除' }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">微调模型管理</h1>
          <p className="text-muted-foreground mt-2">管理和使用微调后的 AI 模型</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              注册微调模型
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>注册微调模型</DialogTitle>
                <DialogDescription>
                  训练完成后，在阿里云百炼部署模型并注册到系统
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="modelName">模型名称 *</Label>
                  <Input
                    id="modelName"
                    value={formData.modelName}
                    onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                    placeholder="例如：客服助手-v1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taskId">训练任务 ID *</Label>
                  <Input
                    id="taskId"
                    type="number"
                    value={formData.taskId || ''}
                    onChange={(e) => setFormData({ ...formData, taskId: parseInt(e.target.value) || 0 })}
                    placeholder="训练任务 ID"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    在训练任务监控页面查看任务 ID
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelId">阿里云百炼模型 ID *</Label>
                  <Input
                    id="modelId"
                    value={formData.modelId}
                    onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                    placeholder="例如：qwen-plus-finetuned-v1"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    在阿里云百炼控制台获取模型 ID
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endpointUrl">部署端点 URL</Label>
                  <Input
                    id="endpointUrl"
                    value={formData.endpointUrl}
                    onChange={(e) => setFormData({ ...formData, endpointUrl: e.target.value })}
                    placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                  />
                  <p className="text-xs text-muted-foreground">
                    可选：如果模型部署在独立端点
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accuracy">准确率 (%)</Label>
                    <Input
                      id="accuracy"
                      type="number"
                      step="0.1"
                      value={formData.performanceMetrics.accuracy || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        performanceMetrics: {
                          ...formData.performanceMetrics,
                          accuracy: parseFloat(e.target.value) || 0
                        }
                      })}
                      placeholder="95.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loss">损失值</Label>
                    <Input
                      id="loss"
                      type="number"
                      step="0.01"
                      value={formData.performanceMetrics.loss || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        performanceMetrics: {
                          ...formData.performanceMetrics,
                          loss: parseFloat(e.target.value) || 0
                        }
                      })}
                      placeholder="0.15"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  取消
                </Button>
                <Button type="submit">注册</Button>
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
                <p className="font-semibold mb-1">使用指南</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>训练任务完成后，在阿里云百炼控制台部署模型</li>
                  <li>获取部署后的模型 ID 和端点 URL</li>
                  <li>在此页面注册微调模型</li>
                  <li>在 AI 服务设置中选择使用微调模型</li>
                </ol>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>模型名称</TableHead>
                <TableHead>训练任务</TableHead>
                <TableHead>基础模型</TableHead>
                <TableHead>微调类型</TableHead>
                <TableHead>准确率</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : models.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <Bot className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">暂无微调模型</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>{model.id}</TableCell>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        <Bot className="h-4 w-4 text-blue-600" />
                        {model.modelName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        {model.modelId}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => copyModelId(model.modelId)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{model.taskName}</div>
                      <div className="text-xs text-muted-foreground">ID: {model.taskId}</div>
                    </TableCell>
                    <TableCell>{model.baseModel}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getFineTuneTypeLabel(model.fineTuneType)}</Badge>
                    </TableCell>
                    <TableCell>
                      {model.performanceMetrics?.accuracy ? (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          <span className="font-medium">{model.performanceMetrics.accuracy}%</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(model.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(model.createdAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(model.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
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
