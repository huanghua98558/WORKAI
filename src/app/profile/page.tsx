'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
  lastActivityAt?: string;
}

interface Session {
  id: string;
  deviceType: string;
  ipAddress: string;
  location?: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.code === 0) {
        setUser(result.data.user);
        setSessions(result.data.sessions || []);
        setFormData({
          fullName: result.data.user.fullName || '',
          email: result.data.user.email || '',
        });
      } else {
        // Token 失效，跳转登录
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        router.push('/auth/login');
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
      router.push('/auth/login');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess('');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.code === 0) {
        setSuccess('个人资料更新成功');
        setUser({
          ...user!,
          ...formData,
        });
      } else {
        setError(result.message || '更新失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('更新个人资料错误:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (sessionId?: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const url = sessionId
        ? `/api/auth/logout?sessionId=${sessionId}`
        : '/api/auth/logout';

      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!sessionId) {
        // 登出当前会话
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        router.push('/auth/login');
      } else {
        // 退出其他会话，刷新列表
        checkAuth();
      }
    } catch (err) {
      console.error('登出错误:', err);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('确定要退出所有其他设备吗？')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/auth/logout-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        checkAuth();
      }
    } catch (err) {
      console.error('批量登出错误:', err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">个人中心</h1>
          <Button
            variant="outline"
            onClick={() => handleLogout()}
          >
            退出登录
          </Button>
        </div>

        {/* 用户信息卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>查看和更新您的个人资料</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    value={user.username}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">角色</Label>
                  <div className="flex items-center h-10">
                    <Badge variant={user.role === 'superadmin' ? 'default' : 'secondary'}>
                      {user.role === 'superadmin' ? '超级管理员' : user.role === 'admin' ? '管理员' : '普通用户'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">姓名</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="请输入姓名"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="your@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="createdAt">注册时间</Label>
                <Input
                  id="createdAt"
                  value={new Date(user.createdAt).toLocaleString('zh-CN')}
                  disabled
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? '保存中...' : '保存更改'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 会话管理卡片 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>活跃会话</CardTitle>
                <CardDescription>管理您的登录设备</CardDescription>
              </div>
              {sessions.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogoutAll}
                >
                  退出其他设备
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>设备类型</TableHead>
                  <TableHead>IP 地址</TableHead>
                  <TableHead>最后活动</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      {session.deviceType === 'desktop' && '🖥️ 桌面端'}
                      {session.deviceType === 'mobile' && '📱 移动端'}
                      {session.deviceType === 'tablet' && '📱 平板'}
                      {session.deviceType === 'unknown' && '🔌 未知设备'}
                    </TableCell>
                    <TableCell>{session.ipAddress}</TableCell>
                    <TableCell>
                      {new Date(session.lastActivityAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      {session.isCurrent ? (
                        <Badge>当前设备</Badge>
                      ) : (
                        <Badge variant="secondary">其他设备</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!session.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLogout(session.id)}
                        >
                          退出
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
