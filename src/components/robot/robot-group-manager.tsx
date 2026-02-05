'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface RobotGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  priority: number;
  routing_strategy: string;
  load_balancing_config: any;
  created_at: string;
  updated_at: string;
  robot_count?: number;
}

export default function RobotGroupManager() {
  const [groups, setGroups] = useState<RobotGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RobotGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: '',
    priority: 10
  });

  const COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];

  const ICONS = ['🤖', '🎯', '⚡', '🚀', '💡', '🔧', '📊', '🔍', '💬', '🎨'];

  // 加载分组列表
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/robot-groups');
      const result = await response.json();
      
      if (result.success) {
        setGroups(result.data);
      } else {
        toast.error(result.message || '加载分组列表失败');
      }
    } catch (error) {
      console.error('加载分组列表失败:', error);
      toast.error('加载分组列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingGroup 
        ? `/api/admin/robot-groups/${editingGroup.id}`
        : '/api/admin/robot-groups';
      
      const method = editingGroup ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingGroup ? '更新分组成功' : '创建分组成功');
        setIsDialogOpen(false);
        resetForm();
        fetchGroups();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  // 删除分组
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个分组吗？')) return;

    try {
      const response = await fetch(`/api/admin/robot-groups/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('删除分组成功');
        fetchGroups();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  // 编辑分组
  const handleEdit = (group: RobotGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color || '#3b82f6',
      icon: group.icon || '',
      priority: group.priority
    });
    setIsDialogOpen(true);
  };

  // 重置表单
  const resetForm = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
      color: '#3b82f6',
      icon: '',
      priority: 10
    });
  };

  // 打开创建对话框
  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">机器人分组管理</h2>
          <p className="text-sm text-muted-foreground">管理机器人分组，实现精细化运营</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              创建分组
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGroup ? '编辑分组' : '创建分组'}</DialogTitle>
              <DialogDescription>
                {editingGroup ? '编辑机器人分组信息' : '创建新的机器人分组'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">分组名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：客服机器人组"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="分组用途和描述"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>图标</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-all ${
                          formData.icon === icon ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>颜色</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === color ? 'border-primary scale-110' : 'border-border hover:border-primary'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit">
                  {editingGroup ? '更新' : '创建'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>分组列表</CardTitle>
          <CardDescription>
            {groups.length} 个分组
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>图标</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>路由策略</TableHead>
                <TableHead>机器人数量</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    暂无分组
                  </TableCell>
                </TableRow>
              ) : (
                groups.map(group => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <span className="text-2xl">{group.icon || '🤖'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge 
                          style={{ 
                            backgroundColor: group.color || '#3b82f6',
                            color: 'white'
                          }}
                        >
                          {group.name}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {group.description || '-'}
                    </TableCell>
                    <TableCell>{group.priority}</TableCell>
                    <TableCell>{group.robot_count || 0}</TableCell>
                    <TableCell>
                      {new Date(group.created_at).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(group)}>
                          编辑
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(group.id)}>
                          删除
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
    </div>
  );
}
