'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  Key,
  Power,
  RefreshCw,
  Check,
  X,
  Mail,
  Calendar,
  Save
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string | null;
  password: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'operator',
    isActive: true
  });

  // 加载用户列表
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('加载用户失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 打开创建用户对话框
  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      email: '',
      role: 'operator',
      isActive: true
    });
    setIsDialogOpen(true);
  };

  // 打开编辑用户对话框
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      role: user.role,
      isActive: user.isActive
    });
    setIsDialogOpen(true);
  };

  // 删除用户
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除这个用户吗？')) return;
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        alert('删除成功');
        loadUsers();
      } else {
        alert(`删除失败: ${data.error}`);
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      alert('删除失败');
    }
  };

  // 保存用户
  const handleSaveUser = async () => {
    try {
      if (!formData.username) {
        alert('用户名不能为空');
        return;
      }
      
      if (!editingUser && !formData.password) {
        alert('新用户必须设置密码');
        return;
      }

      const payload: any = {
        username: formData.username,
        role: formData.role,
        isActive: formData.isActive,
        email: formData.email || null
      };
      
      if (formData.password) {
        payload.password = formData.password;
      }

      let res;
      if (editingUser) {
        res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.success) {
        alert(editingUser ? '更新成功' : '创建成功');
        setIsDialogOpen(false);
        loadUsers();
      } else {
        alert(`操作失败: ${data.error}`);
      }
    } catch (error) {
      console.error('保存用户失败:', error);
      alert('操作失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            用户管理
          </h2>
          <p className="text-muted-foreground mt-1">
            管理系统用户、权限和账号状态
          </p>
        </div>
        <Button onClick={handleCreateUser}>
          <UserPlus className="h-4 w-4 mr-2" />
          新建用户
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>用户列表</CardTitle>
              <CardDescription>系统中的所有用户</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadUsers}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无用户
              </div>
            ) : (
              users.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{user.username}</span>
                        {user.isActive ? (
                          <Badge variant="default" className="gap-1">
                            <Check className="h-3 w-3" />
                            已启用
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <X className="h-3 w-3" />
                            已禁用
                          </Badge>
                        )}
                        <Badge variant="outline" className="gap-1">
                          <Shield className="h-3 w-3" />
                          {user.role === 'admin' ? '管理员' : '操作员'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                        {user.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          创建于 {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={user.username === 'admin'}
                    >
                      <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                      删除
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? '编辑用户' : '新建用户'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? '修改用户信息和权限' : '创建新的系统用户'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">用户名 *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={editingUser !== null}
                placeholder="输入用户名"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">
                {editingUser ? '新密码（留空则不修改）' : '密码 *'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? '输入新密码' : '输入密码'}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="输入邮箱（可选）"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">角色</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="admin">管理员</option>
                <option value="operator">操作员</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Power className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="isActive">启用账号</Label>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveUser}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
