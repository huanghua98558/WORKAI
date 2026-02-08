'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface MessageTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  templateContent: string;
  variables: any[];
  category?: string;
  isEnabled: boolean;
  priority: number;
}

export default function VideoChannelTemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 加载消息模板列表
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/video-channel/message-templates');
      const result = await response.json();

      if (result.success && result.data?.templates) {
        setTemplates(result.data.templates);
      } else {
        toast.error('加载消息模板失败: ' + result.error);
      }
    } catch (error: any) {
      console.error('加载消息模板失败:', error);
      toast.error('加载消息模板失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // 保存模板
  const handleSave = async () => {
    if (!editingTemplate) return;

    try {
      const response = await fetch('/api/video-channel/message-template/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingTemplate)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('保存成功');
        setIsDialogOpen(false);
        loadTemplates();
      } else {
        toast.error('保存失败: ' + result.error);
      }
    } catch (error: any) {
      console.error('保存模板失败:', error);
      toast.error('保存失败: ' + error.message);
    }
  };

  // 删除模板
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      const response = await fetch(`/api/video-channel/message-template/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('删除成功');
        loadTemplates();
      } else {
        toast.error('删除失败: ' + result.error);
      }
    } catch (error: any) {
      console.error('删除模板失败:', error);
      toast.error('删除失败: ' + error.message);
    }
  };

  // 打开编辑对话框
  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  // 创建新模板
  const handleCreate = () => {
    setEditingTemplate({
      id: '',
      code: '',
      name: '',
      description: '',
      templateContent: '',
      variables: [],
      category: '',
      isEnabled: true,
      priority: 10
    });
    setIsDialogOpen(true);
  };

  // 更新模板字段
  const updateTemplate = (field: keyof MessageTemplate, value: any) => {
    if (editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        [field]: value
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">消息模板</h2>
          <p className="text-muted-foreground mt-2">
            配置和管理视频号转化系统的消息模板
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadTemplates} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新建模板
          </Button>
        </div>
      </div>

      {/* 模板列表 */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">加载中...</p>
              </div>
            </CardContent>
          </Card>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">暂无消息模板</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="outline">{template.code}</Badge>
                      {template.category && (
                        <Badge variant="secondary">{template.category}</Badge>
                      )}
                      {template.isEnabled ? (
                        <Badge className="bg-green-500">已启用</Badge>
                      ) : (
                        <Badge variant="outline">已禁用</Badge>
                      )}
                    </div>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>模板内容</Label>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm">
                    {template.templateContent}
                  </div>
                  {template.variables && template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {template.variables.map((variable, index) => (
                        <Badge key={index} variant="secondary">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 编辑/新建对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? '编辑模板' : '新建模板'}
            </DialogTitle>
            <DialogDescription>
              配置消息模板的内容和变量
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-code">模板代码 *</Label>
                  <Input
                    id="template-code"
                    value={editingTemplate.code}
                    onChange={(e) => updateTemplate('code', e.target.value)}
                    placeholder="例如: login_success"
                    disabled={!!editingTemplate.id}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-name">模板名称 *</Label>
                  <Input
                    id="template-name"
                    value={editingTemplate.name}
                    onChange={(e) => updateTemplate('name', e.target.value)}
                    placeholder="例如: 登录成功提示"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">模板描述</Label>
                <Input
                  id="template-description"
                  value={editingTemplate.description || ''}
                  onChange={(e) => updateTemplate('description', e.target.value)}
                  placeholder="模板的详细描述"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-category">分类</Label>
                <Input
                  id="template-category"
                  value={editingTemplate.category || ''}
                  onChange={(e) => updateTemplate('category', e.target.value)}
                  placeholder="例如: login, permission, cookie"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-content">模板内容 *</Label>
                <Textarea
                  id="template-content"
                  value={editingTemplate.templateContent}
                  onChange={(e) => updateTemplate('templateContent', e.target.value)}
                  placeholder="你好{{userName}}，登录成功！"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  支持使用 &lbrace;变量名&rbrace; 格式的变量，如 &lbrace;userName&rbrace;
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-priority">优先级</Label>
                <Input
                  id="template-priority"
                  type="number"
                  value={editingTemplate.priority}
                  onChange={(e) => updateTemplate('priority', parseInt(e.target.value))}
                  placeholder="1-100，数字越大优先级越高"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="template-enabled">启用模板</Label>
                  <p className="text-xs text-muted-foreground">
                    启用后才能在流程中使用
                  </p>
                </div>
                <Switch
                  id="template-enabled"
                  checked={editingTemplate.isEnabled}
                  onCheckedChange={(checked) => updateTemplate('isEnabled', checked)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
