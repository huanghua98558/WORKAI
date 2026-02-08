'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Edit2, Trash2, Shield, User as UserIcon } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'operator',
    email: ''
  });

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.role) {
      alert('请填写完整的用户信息');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (res.ok) {
        alert('✅ 用户添加成功');
        setShowAddDialog(false);
        setNewUser({ username: '', password: '', role: 'operator', email: '' });
        loadUsers();
      } else {
        const data = await res.json();
        alert(`❌ 添加失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      alert('❌ 添加失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setShowEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setIsLoading(true);

      // 准备更新数据，过滤掉空密码
      const updateData: any = {
        username: editingUser.username,
        role: editingUser.role,
        email: editingUser.email,
        isActive: editingUser.isActive
      };

      // 只有在密码非空时才添加密码字段
      if (editingUser.password && editingUser.password.trim()) {
        updateData.password = editingUser.password;
      }

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        alert('✅ 用户更新成功');
        setShowEditDialog(false);
        setEditingUser(null);
        loadUsers();
      } else {
        const data = await res.json();
        alert(`❌ 更新失败: ${data.error || data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('更新用户失败:', error);
      alert('❌ 更新失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('确定要删除该用户吗？')) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('✅ 用户删除成功');
        loadUsers();
      } else {
        const data = await res.json();
        alert(`❌ 删除失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      alert('❌ 删除失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <UserIcon className="h-6 w-6 text-blue-500" />
            用户管理
          </h3>
          <p className="text-muted-foreground mt-1">管理系统用户和权限</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          添加用户
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>
            共 {users.length} 个用户
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium">{user.username}</div>
                    <div className="text-sm text-muted-foreground">{user.email || '无邮箱'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    <Shield className="h-3 w-3 mr-1" />
                    {user.role === 'admin' ? '管理员' : '操作员'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditUser(user)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                暂无用户，点击"添加用户"创建
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 添加用户对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加用户</DialogTitle>
            <DialogDescription>
              创建新的系统用户账号
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="请输入密码"
              />
            </div>
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="请输入邮箱（可选）"
              />
            </div>
            <div>
              <Label htmlFor="role">角色</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="operator">操作员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddUser} disabled={isLoading}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>
              修改用户信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-username">用户名</Label>
              <Input
                id="edit-username"
                value={editingUser?.username || ''}
                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <Label htmlFor="edit-password">密码（留空不修改）</Label>
              <Input
                id="edit-password"
                type="password"
                value={editingUser?.password || ''}
                onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                placeholder="留空不修改"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">邮箱</Label>
              <Input
                id="edit-email"
                type="email"
                value={editingUser?.email || ''}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                placeholder="请输入邮箱"
              />
            </div>
            <div>
              <Label htmlFor="edit-role">角色</Label>
              <Select
                value={editingUser?.role || 'operator'}
                onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="operator">操作员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateUser} disabled={isLoading}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
