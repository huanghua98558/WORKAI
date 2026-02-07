'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Copy, CheckCircle, XCircle, AlertCircle, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Cookie {
  id: string;
  userId: string;
  cookieData: any[];
  cookieCount: number;
  shopAccessible: boolean;
  assistantAccessible: boolean;
  shopStatusCode: number;
  assistantStatusCode: number;
  permissionStatus: string;
  extractedAt: string;
  expiresAt: string;
  status: string;
  auditStatus: string;
  auditNotes?: string;
  auditedBy?: string;
  auditedAt?: string;
}

interface CookieListResponse {
  success: boolean;
  data?: {
    cookies: Cookie[];
  };
  error?: string;
}

export default function VideoChannelCookiesPage() {
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCookies, setFilteredCookies] = useState<Cookie[]>([]);

  // 加载Cookie列表
  const loadCookies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/video-channel/cookies');
      const result: CookieListResponse = await response.json();

      if (result.success && result.data?.cookies) {
        setCookies(result.data.cookies);
        setFilteredCookies(result.data.cookies);
      } else {
        toast.error('加载Cookie列表失败: ' + result.error);
      }
    } catch (error: any) {
      console.error('加载Cookie列表失败:', error);
      toast.error('加载Cookie列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCookies();
  }, []);

  // 搜索过滤
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCookies(cookies);
    } else {
      const filtered = cookies.filter(cookie =>
        cookie.userId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCookies(filtered);
    }
  }, [searchTerm, cookies]);

  // 下载Cookie文件
  const handleDownload = async (userId: string) => {
    try {
      const response = await fetch(`/api/video-channel/cookies/${userId}/download`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cookie_${userId}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Cookie文件下载成功');
      } else {
        toast.error('下载失败');
      }
    } catch (error: any) {
      console.error('下载Cookie失败:', error);
      toast.error('下载失败: ' + error.message);
    }
  };

  // 复制Cookie文本
  const handleCopy = async (cookieData: any[]) => {
    try {
      const cookieText = JSON.stringify(cookieData, null, 2);
      await navigator.clipboard.writeText(cookieText);
      toast.success('Cookie已复制到剪贴板');
    } catch (error: any) {
      console.error('复制Cookie失败:', error);
      toast.error('复制失败: ' + error.message);
    }
  };

  // 人工审核
  const handleAudit = (userId: string) => {
    // 跳转到人工审核页面
    window.open(`/video-channel/audit?userId=${userId}`, '_blank');
  };

  // 获取权限状态徽章
  const getPermissionBadge = (permissionStatus: string, shopAccessible: boolean, assistantAccessible: boolean) => {
    if (permissionStatus === 'full') {
      return <Badge className="bg-green-500">完整权限</Badge>;
    } else if (permissionStatus === 'partial') {
      return <Badge className="bg-yellow-500">部分权限</Badge>;
    } else if (permissionStatus === 'invalid') {
      return <Badge className="bg-red-500">无效</Badge>;
    } else {
      return <Badge variant="outline">未知</Badge>;
    }
  };

  // 获取审核状态徽章
  const getAuditBadge = (auditStatus: string) => {
    switch (auditStatus) {
      case 'approved':
        return <Badge className="bg-green-500">已通过</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">已拒绝</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline">待审核</Badge>;
    }
  };

  // 格式化时间
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cookie管理</h1>
          <p className="text-muted-foreground mt-2">
            管理所有视频号Cookie，支持下载、复制和人工审核
          </p>
        </div>
        <Button onClick={loadCookies} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 搜索框 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cookie列表 */}
      <Card>
        <CardHeader>
          <CardTitle>Cookie列表</CardTitle>
          <CardDescription>
            共 {filteredCookies.length} 条Cookie记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">加载中...</p>
            </div>
          ) : filteredCookies.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">暂无Cookie记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户ID</TableHead>
                    <TableHead>Cookie数量</TableHead>
                    <TableHead>小店可访问</TableHead>
                    <TableHead>助手可访问</TableHead>
                    <TableHead>权限状态</TableHead>
                    <TableHead>审核状态</TableHead>
                    <TableHead>提取时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCookies.map((cookie) => (
                    <TableRow key={cookie.id}>
                      <TableCell className="font-medium">{cookie.userId}</TableCell>
                      <TableCell>{cookie.cookieCount}</TableCell>
                      <TableCell>
                        {cookie.shopAccessible ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {cookie.assistantAccessible ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {getPermissionBadge(cookie.permissionStatus, cookie.shopAccessible, cookie.assistantAccessible)}
                      </TableCell>
                      <TableCell>
                        {getAuditBadge(cookie.auditStatus)}
                      </TableCell>
                      <TableCell>{formatDate(cookie.extractedAt)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(cookie.userId)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(cookie.cookieData)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAudit(cookie.userId)}
                          >
                            审核
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
