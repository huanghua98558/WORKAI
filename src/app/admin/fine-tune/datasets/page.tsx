'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Trash2, Edit, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Dataset {
  id: number;
  name: string;
  description: string | null;
  datasetType: string;
  dataFilePath: string | null;
  dataCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function FineTuneDatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    datasetType: 'sft',
    dataFilePath: '',
    dataCount: 0
  });

  // 获取数据集列表
  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/fine-tune/datasets?page=${page}&pageSize=${pageSize}`);
      const result = await response.json();

      if (result.success) {
        setDatasets(result.data.list);
        setTotal(result.data.total);
      }
    } catch (error) {
      console.error('获取数据集失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [page]);

  // 创建数据集
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/fine-tune/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        setIsCreateModalOpen(false);
        setFormData({
          name: '',
          description: '',
          datasetType: 'sft',
          dataFilePath: '',
          dataCount: 0
        });
        fetchDatasets();
      }
    } catch (error) {
      console.error('创建数据集失败:', error);
    }
  };

  // 更新数据集
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDataset) return;

    try {
      const response = await fetch(`/api/admin/fine-tune/datasets/${selectedDataset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        setIsEditModalOpen(false);
        setSelectedDataset(null);
        setFormData({
          name: '',
          description: '',
          datasetType: 'sft',
          dataFilePath: '',
          dataCount: 0
        });
        fetchDatasets();
      }
    } catch (error) {
      console.error('更新数据集失败:', error);
    }
  };

  // 删除数据集
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个数据集吗？')) return;

    try {
      const response = await fetch(`/api/admin/fine-tune/datasets/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        fetchDatasets();
      }
    } catch (error) {
      console.error('删除数据集失败:', error);
    }
  };

  // 打开编辑对话框
  const openEditModal = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setFormData({
      name: dataset.name,
      description: dataset.description || '',
      datasetType: dataset.datasetType,
      dataFilePath: dataset.dataFilePath || '',
      dataCount: dataset.dataCount
    });
    setIsEditModalOpen(true);
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-gray-500', label: '草稿' },
      ready: { color: 'bg-blue-500', label: '准备就绪' },
      uploaded: { color: 'bg-green-500', label: '已上传' },
      error: { color: 'bg-red-500', label: '错误' }
    };
    const config = statusMap[status] || { color: 'bg-gray-500', label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  // 获取数据集类型标签
  const getDatasetTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      sft: '监督微调 (SFT)',
      dpo: '直接偏好优化 (DPO)',
      grpo: '群组相对策略优化 (GRPO)'
    };
    return typeMap[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">训练数据集管理</h1>
          <p className="text-muted-foreground mt-2">管理用于微调大模型的训练数据集</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建数据集
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>创建训练数据集</DialogTitle>
                <DialogDescription>
                  创建一个新的训练数据集，用于微调大模型
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">数据集名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入数据集名称"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="输入数据集描述"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="datasetType">数据集类型 *</Label>
                  <Select
                    value={formData.datasetType}
                    onValueChange={(value) => setFormData({ ...formData, datasetType: value })}
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
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">使用指南</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>创建数据集后，需要在阿里云 PAI 控制台上传训练数据</li>
                  <li>获取数据文件的存储路径后，更新数据集信息</li>
                  <li>SFT 数据格式：JSON 数组，每条包含 instruction、input、output 字段</li>
                  <li>详细文档请参考阿里云 PAI 官方文档</li>
                </ul>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>数据量</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : datasets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">暂无数据集</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                datasets.map((dataset) => (
                  <TableRow key={dataset.id}>
                    <TableCell>{dataset.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{dataset.name}</div>
                      {dataset.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {dataset.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getDatasetTypeLabel(dataset.datasetType)}</TableCell>
                    <TableCell>{dataset.dataCount || '-'}</TableCell>
                    <TableCell>{getStatusBadge(dataset.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(dataset.createdAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(dataset)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(dataset.id)}
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

      {/* 编辑对话框 */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>编辑数据集</DialogTitle>
              <DialogDescription>
                更新训练数据集信息
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">数据集名称 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入数据集名称"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">描述</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入数据集描述"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-datasetType">数据集类型</Label>
                <Select
                  value={formData.datasetType}
                  onValueChange={(value) => setFormData({ ...formData, datasetType: value })}
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
              <div className="space-y-2">
                <Label htmlFor="edit-dataFilePath">数据文件路径</Label>
                <Input
                  id="edit-dataFilePath"
                  value={formData.dataFilePath}
                  onChange={(e) => setFormData({ ...formData, dataFilePath: e.target.value })}
                  placeholder="OSS://bucket/path/to/data.json"
                />
                <p className="text-xs text-muted-foreground">
                  在阿里云 PAI 控制台上传数据后填入此处
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dataCount">数据量</Label>
                <Input
                  id="edit-dataCount"
                  type="number"
                  value={formData.dataCount}
                  onChange={(e) => setFormData({ ...formData, dataCount: parseInt(e.target.value) || 0 })}
                  placeholder="数据条数"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">状态</Label>
                <Select
                  value={selectedDataset?.status || 'draft'}
                  onValueChange={(value) => {
                    if (selectedDataset) {
                      setSelectedDataset({ ...selectedDataset, status: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="ready">准备就绪</SelectItem>
                    <SelectItem value="uploaded">已上传</SelectItem>
                    <SelectItem value="error">错误</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                取消
              </Button>
              <Button type="submit">更新</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
