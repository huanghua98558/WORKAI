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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface RobotRole {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  permissions: string[];
  allowed_operations: string[];
  rate_limits: any;
  created_at: string;
  updated_at: string;
  robot_count?: number;
}

const AVAILABLE_PERMISSIONS = [
  'message:send', 'message:receive', 'message:forward',
  'contact:read', 'contact:write',
  'room:manage', 'room:read',
  'file:upload', 'file:download',
  'config:read', 'config:write',
  'session:manage', 'session:read',
  'callback:manage', 'callback:read',
  'metrics:read', 'metrics:write'
];

const AVAILABLE_OPERATIONS = [
  'send_text', 'send_image', 'send_file',
  'create_room', 'invite_to_room',
  'forward_message', 'reply_message',
  'upload_file', 'download_file',
  'get_contacts', 'get_rooms',
  'update_profile', 'set_status'
];

export default function RobotRoleManager() {
  const [roles, setRoles] = useState<RobotRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RobotRole | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 10,
    permissions: [] as string[],
    allowed_operations: [] as string[],
    rate_limits: JSON.stringify({ per_minute: 60, per_hour: 1000 }, null, 2)
  });

  // 加载角色列表
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/robot-roles');
      const result = await response.json();
      
      if (result.success) {
        setRoles(result.data);
      } else {
        toast.error(result.message || '加载角色列表失败');
      }
    } catch (error) {
      console.error('加载角色列表失败:', error);
      toast.error('加载角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingRole 
        ? `/api/admin/robot-roles/${editingRole.id}`
        : '/api/admin/robot-roles';
      
      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingRole ? '更新角色成功' : '创建角色成功');
        setIsDialogOpen(false);
        resetForm();
        fetchRoles();
      } else {
        toast.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  // 删除角色
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个角色吗？')) return;

    try {
      const response = await fetch(`/api/admin/robot-roles/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('删除角色成功');
        fetchRoles();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  // 编辑角色
  const handleEdit = (role: RobotRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name || '',
      description: role.description || '',
      priority: role.priority || 10,
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
      allowed_operations: Array.isArray(role.allowed_operations) ? role.allowed_operations : [],
      rate_limits: role.rate_limits ? JSON.stringify(role.rate_limits, null, 2) : JSON.stringify({ per_minute: 60, per_hour: 1000 }, null, 2)
    });
    setIsDialogOpen(true);
  };

  // 重置表单
  const resetForm = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      priority: 10,
      permissions: [],
      allowed_operations: [],
      rate_limits: JSON.stringify({ per_minute: 60, per_hour: 1000 }, null, 2)
    });
  };

  // 打开创建对话框
  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // 切换权限
  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: Array.isArray(prev.permissions) && prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...(Array.isArray(prev.permissions) ? prev.permissions : []), permission]
    }));
  };

  // 切换操作
  const toggleOperation = (operation: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_operations: Array.isArray(prev.allowed_operations) && prev.allowed_operations.includes(operation)
        ? prev.allowed_operations.filter(o => o !== operation)
        : [...(Array.isArray(prev.allowed_operations) ? prev.allowed_operations : []), operation]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">机器人角色管理</h2>
          <p className="text-sm text-muted-foreground">管理机器人角色，控制权限和操作范围</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              创建角色
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? '编辑角色' : '创建角色'}</DialogTitle>
              <DialogDescription>
                {editingRole ? '编辑机器人角色信息' : '创建新的机器人角色'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">角色名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：客服机器人"
                    required
                  />
                </div>
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

              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="角色职责和描述"
                  rows={3}
                />
              </div>

              <div>
                <Label>权限配置 ({formData.permissions?.length || 0} 项)</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
                  {AVAILABLE_PERMISSIONS.map(permission => (
                    <label key={permission} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={Array.isArray(formData.permissions) && formData.permissions.includes(permission)}
                        onCheckedChange={() => togglePermission(permission)}
                      />
                      <span className="text-sm">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>允许的操作 ({formData.allowed_operations?.length || 0} 项)</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
                  {AVAILABLE_OPERATIONS.map(operation => (
                    <label key={operation} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={Array.isArray(formData.allowed_operations) && formData.allowed_operations.includes(operation)}
                        onCheckedChange={() => toggleOperation(operation)}
                      />
                      <span className="text-sm">{operation}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="rate_limits">速率限制 (JSON)</Label>
                <Textarea
                  id="rate_limits"
                  value={formData.rate_limits}
                  onChange={(e) => setFormData({ ...formData, rate_limits: e.target.value })}
                  placeholder='{"per_minute": 60, "per_hour": 1000}'
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit">
                  {editingRole ? '更新' : '创建'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>角色列表</CardTitle>
          <CardDescription>
            {roles.length} 个角色
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>权限数</TableHead>
                <TableHead>操作数</TableHead>
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
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    暂无角色
                  </TableCell>
                </TableRow>
              ) : (
                roles.map(role => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {role.description || '-'}
                    </TableCell>
                    <TableCell>{role.priority}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{role.permissions?.length || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{role.allowed_operations?.length || 0}</Badge>
                    </TableCell>
                    <TableCell>{role.robot_count || 0}</TableCell>
                    <TableCell>
                      {new Date(role.created_at).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(role)}>
                          编辑
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(role.id)}>
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
