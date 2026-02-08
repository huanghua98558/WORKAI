'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  LogOut,
  ShieldAlert,
  Clock,
  MapPin,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface Session {
  id: string;
  deviceType: string;
  ipAddress: string;
  location: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrentSession: boolean;
}

interface SessionStats {
  totalSessions: number;
  maxAllowedSessions: number;
  canCreateMore: boolean;
  deviceTypeStats: Record<string, number>;
  expiringSoon: number;
  sessions: Session[];
}

export default function SessionsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeSessionId, setRevokeSessionId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      case 'desktop':
      case 'laptop':
        return <Laptop className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getDeviceName = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return '手机';
      case 'tablet':
        return '平板';
      case 'desktop':
        return '桌面电脑';
      case 'laptop':
        return '笔记本电脑';
      default:
        return '未知设备';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return '刚刚';
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} 分钟前`;
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)} 小时前`;
    } else {
      return `${Math.floor(seconds / 86400)} 天前`;
    }
  };

  const formatExpiry = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return '已过期';
    } else if (diffDays === 1) {
      return '今天过期';
    } else if (diffDays < 7) {
      return `${diffDays} 天后过期`;
    } else {
      return `${diffDays} 天后过期`;
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/auth/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.code === 0) {
        setStats(result.data);
      } else {
        setError(result.message || '加载失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('加载会话失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokeSessionId(sessionId);
    setRevokeDialogOpen(true);
  };

  const confirmRevoke = async () => {
    if (!revokeSessionId) return;

    setRevoking(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/auth/sessions/${revokeSessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.code === 0) {
        setRevokeDialogOpen(false);
        setRevokeSessionId(null);
        await loadSessions();
      } else {
        setError(result.message || '注销失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('注销会话失败:', err);
    } finally {
      setRevoking(false);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('确定要注销所有其他设备的会话吗？此操作不可撤销。')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/auth/sessions/others', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.code === 0) {
        await loadSessions();
      } else {
        setError(result.message || '注销失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('注销所有会话失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold">活跃会话管理</h1>
          <p className="text-muted-foreground mt-2">
            管理您的登录会话，确保账户安全
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 统计信息 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">活跃会话</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSessions}</div>
                <p className="text-xs text-muted-foreground">
                  最多 {stats.maxAllowedSessions} 个
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">即将过期</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.expiringSoon}</div>
                <p className="text-xs text-muted-foreground">24小时内</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">设备类型</CardTitle>
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.keys(stats.deviceTypeStats).length}
                </div>
                <p className="text-xs text-muted-foreground">种设备</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 操作按钮 */}
        {stats && stats.totalSessions > 1 && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleRevokeAll}
              disabled={loading}
            >
              <LogOut className="h-4 w-4 mr-2" />
              注销所有其他设备
            </Button>
          </div>
        )}

        {/* 会话列表 */}
        <Card>
          <CardHeader>
            <CardTitle>活跃会话</CardTitle>
            <CardDescription>
              您当前的所有登录会话
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
              </div>
            ) : stats && stats.sessions.length > 0 ? (
              <div className="space-y-4">
                {stats.sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      session.isCurrentSession
                        ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="text-muted-foreground">
                        {getDeviceIcon(session.deviceType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {getDeviceName(session.deviceType)}
                          </span>
                          {session.isCurrentSession && (
                            <Badge variant="secondary" className="text-xs">
                              当前会话
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-3 w-3" />
                            <span>IP: {session.ipAddress}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-3 w-3" />
                            <span>
                              最后活动: {formatTimeAgo(session.lastActivityAt)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RefreshCw className="h-3 w-3" />
                            <span className={session.expiresAt ? '' : 'text-red-500'}>
                              {formatExpiry(session.expiresAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {!session.isCurrentSession && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        注销
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无活跃会话
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 确认对话框 */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认注销会话</DialogTitle>
            <DialogDescription>
              确定要注销此设备的会话吗？该设备将需要重新登录。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeDialogOpen(false)}
              disabled={revoking}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRevoke}
              disabled={revoking}
            >
              {revoking ? '注销中...' : '确认注销'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
