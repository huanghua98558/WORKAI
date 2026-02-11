'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2, Shield } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Permission {
  id: string;
  userId: string;
  username?: string;
  fullName?: string;
  permissions: string[];
  assignedBy: string;
  assignedByName?: string;
  assignedAt: string;
  expiresAt?: string;
}

interface Robot {
  id: string;
  name: string;
  robotId: string;
  ownerId: string;
  isSystem: boolean;
}

interface User {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
}

const PERMISSION_OPTIONS = [
  { key: 'read', label: '查看' },
  { key: 'view_sessions', label: '查看会话' },
  { key: 'view_messages', label: '查看消息' },
  { key: 'write', label: '编辑' },
  { key: 'delete', label: '删除' },
];

export default function PermissionManagementPage() {
  const router = useRouter();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 对话框状态
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<Date>();

  // 权限类型
  const [permissionTypes, setPermissionTypes] = useState<Record<string, { label: string; description: string }>>({});

  useEffect(() => {
    loadRobots();
    loadUsers();
    loadPermissionTypes();
  }, []);

  useEffect(() => {
    if (selectedRobot) {
      loadRobotPermissions(selectedRobot.id);
    }
  }, [selectedRobot]);

  const loadRobots = async () => {
    try {
      const result = await apiClient.robots.list();
      setRobots(result || []);
    } catch (err) {
      console.error('加载机器人列表失败:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
      const result = await response.json();
      if (result.code === 0) {
        setUsers(result.data || []);
      }
    } catch (err) {
      console.error('加载用户列表失败:', err);
    }
  };

  const loadRobotPermissions = async (robotId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/permissions/robots/${robotId}/permissions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
      const result = await response.json();
      if (result.code === 0) {
        setPermissions(result.data || []);
      }
    } catch (err) {
      console.error('加载权限失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissionTypes = async () => {
    try {
      const response = await fetch('/api/permissions/types', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
      const result = await response.json();
      if (result.code === 0) {
        setPermissionTypes(result.data);
      }
    } catch (err) {
      console.error('加载权限类型失败:', err);
    }
  };

  const handleAssignPermission = async () => {
    if (!selectedUser || selectedPermissions.length === 0 || !selectedRobot) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/permissions/robots/${selectedRobot.id}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          userId: selectedUser,
          permissions: selectedPermissions,
          expiresAt: expiresAt?.toISOString(),
        }),
      });

      const result = await response.json();

      if (result.code === 0) {
        setShowAssignDialog(false);
        setSelectedUser('');
        setSelectedPermissions([]);
        setExpiresAt(undefined);
        loadRobotPermissions(selectedRobot.id);
      } else {
        setError(result.message || '分配失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('分配权限失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokePermission = async (permissionId: string) => {
    if (!selectedRobot) return;

    if (!confirm('确定要撤销此权限吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/permissions/robots/${selectedRobot.id}/permissions/${permissionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });

      if (response.ok) {
        loadRobotPermissions(selectedRobot.id);
      }
    } catch (err) {
      console.error('撤销权限失败:', err);
    }
  };

  const getPermissionLabel = (perm: string) => {
    return permissionTypes[perm]?.label || perm;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              权限管理
            </h1>
            <p className="text-muted-foreground mt-1">管理机器人访问权限</p>
          </div>
        </div>

        {/* 机器人选择 */}
        <Card>
          <CardHeader>
            <CardTitle>选择机器人</CardTitle>
            <CardDescription>选择要管理权限的机器人</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedRobot?.id || ''} onValueChange={(id) => {
              const robot = robots.find(r => r.id === id);
              setSelectedRobot(robot || null);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="请选择机器人" />
              </SelectTrigger>
              <SelectContent>
                {robots.map(robot => (
                  <SelectItem key={robot.id} value={robot.id}>
                    {robot.name} ({robot.robotId})
                    {robot.isSystem && <Badge variant="secondary" className="ml-2">系统</Badge>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 权限列表 */}
        {selectedRobot && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>权限列表</CardTitle>
                  <CardDescription>机器人 {selectedRobot.name} 的访问权限</CardDescription>
                </div>
                <Button onClick={() => setShowAssignDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  分配权限
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">加载中...</div>
              ) : permissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无权限记录
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>权限</TableHead>
                      <TableHead>分配人</TableHead>
                      <TableHead>分配时间</TableHead>
                      <TableHead>过期时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map(permission => (
                      <TableRow key={permission.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{permission.fullName || permission.username}</div>
                            <div className="text-sm text-muted-foreground">@{permission.username}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {permission.permissions.map(perm => (
                              <Badge key={perm} variant="outline">
                                {getPermissionLabel(perm)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>@{permission.assignedByName || '未知'}</TableCell>
                        <TableCell>{new Date(permission.assignedAt).toLocaleDateString('zh-CN')}</TableCell>
                        <TableCell>
                          {permission.expiresAt
                            ? new Date(permission.expiresAt).toLocaleDateString('zh-CN')
                            : '永久'
                          }
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokePermission(permission.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 分配权限对话框 */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>分配权限</DialogTitle>
            <DialogDescription>为用户分配机器人访问权限</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>选择用户</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择用户" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName || user.username} (@{user.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>选择权限</Label>
              <div className="space-y-2">
                {PERMISSION_OPTIONS.map(option => (
                  <div key={option.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${option.key}`}
                      checked={selectedPermissions.includes(option.key)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPermissions([...selectedPermissions, option.key]);
                        } else {
                          setSelectedPermissions(selectedPermissions.filter(p => p !== option.key));
                        }
                      }}
                    />
                    <Label htmlFor={`perm-${option.key}`}>{option.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>过期时间（可选）</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiresAt ? format(expiresAt, 'PPP', { locale: zhCN }) : '选择过期时间'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiresAt}
                    onSelect={setExpiresAt}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAssignPermission} disabled={loading || !selectedUser || selectedPermissions.length === 0}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
