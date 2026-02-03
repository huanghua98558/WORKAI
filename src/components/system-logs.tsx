'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Server,
  Search,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Download,
  FileText,
  Code,
  Terminal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface SystemLog {
  id: string;
  level: string;
  module: string;
  message: string;
  details?: any;
  timestamp: string;
  userId?: string;
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [limit, setLimit] = useState(100);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [stats, setStats] = useState<any>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDays, setDeleteDays] = useState(30);
  const [showBackendLogDialog, setShowBackendLogDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // 使用 ref 持久化数据
  const logsRef = useRef<SystemLog[]>([]);
  const statsRef = useRef<any>({});

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (filterLevel !== 'all') {
        params.append('level', filterLevel);
      }
      if (filterModule !== 'all') {
        params.append('module', filterModule);
      }

      const res = await fetch(`/api/system-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const newLogs = data.data || [];
        const newStats = data.stats || {};
        setLogs(newLogs);
        setStats(newStats);
        logsRef.current = newLogs;
        statsRef.current = newStats;
      }
    } catch (error) {
      console.error('加载系统日志失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 组件挂载时恢复数据或加载新数据
  useEffect(() => {
    console.log('SystemLogs: 组件挂载');
    if (logsRef.current.length > 0) {
      console.log('SystemLogs: 恢复缓存数据');
      setLogs(logsRef.current);
      setStats(statsRef.current);
    } else {
      console.log('SystemLogs: 首次加载数据');
      loadLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteOldLogs = async () => {
    try {
      const res = await fetch(`/api/system-logs?days=${deleteDays}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        alert(`✅ 已清理 ${data.deletedCount} 条日志`);
        loadLogs();
      }
    } catch (error) {
      alert('❌ 清理失败');
    }
    setShowDeleteDialog(false);
  };

  const handleDownloadLogs = async () => {
    try {
      // 获取所有日志（不限制条数）
      const res = await fetch('/api/system-logs?limit=10000');
      if (res.ok) {
        const data = await res.json();
        const allLogs = data.data || [];

        if (allLogs.length === 0) {
          alert('❌ 没有日志可下载');
          return;
        }

        // 生成TXT格式的内容
        const lines = [
          '=====================================',
          '系统运行日志导出',
          '=====================================',
          `导出时间: ${new Date().toLocaleString('zh-CN')}`,
          `日志总数: ${allLogs.length} 条`,
          '=====================================',
          '',
        ];

        // 按时间排序（从旧到新）
        const sortedLogs = [...allLogs].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // 添加每条日志
        sortedLogs.forEach(log => {
          const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
          lines.push(`[${timestamp}] [${log.level.toUpperCase()}] [${log.module}]`);
          lines.push(log.message);
          if (log.details) {
            lines.push(`详情: ${JSON.stringify(log.details, null, 2)}`);
          }
          lines.push('---');
        });

        // 添加尾部信息
        lines.push('');
        lines.push('=====================================');
        lines.push('日志导出结束');
        lines.push('=====================================');

        const content = lines.join('\n');

        // 创建Blob对象
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = `系统日志_${new Date().toISOString().split('T')[0]}.txt`;
        link.download = filename;

        // 触发下载
        document.body.appendChild(link);
        link.click();

        // 清理
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert(`✅ 已下载 ${allLogs.length} 条日志`);
      } else {
        alert('❌ 下载失败，请重试');
      }
    } catch (error) {
      console.error('下载日志失败:', error);
      alert('❌ 下载失败，请检查网络连接');
    }
  };

  const handleDownloadBackendLog = async (logType: string, lines?: number) => {
    try {
      setIsDownloading(true);
      const params = new URLSearchParams();
      if (lines) {
        params.append('lines', lines.toString());
      }

      const url = `/api/admin/logs/${logType}?${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('下载失败');
      }

      // 获取内容并下载
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // 从响应头获取文件名或生成默认文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${logType.replace('.log', '')}_log.txt`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(downloadUrl);

      console.log('后台日志下载成功');
    } catch (error) {
      console.error('下载后台日志失败:', error);
      alert('下载后台日志失败，请稍后重试');
    } finally {
      setIsDownloading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'secondary';
      case 'info':
        return 'default';
      case 'debug':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'debug':
        return <Search className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.message.toLowerCase().includes(searchLower) ||
      log.module.toLowerCase().includes(searchLower) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6 text-purple-500" />
            系统运行日志
          </h2>
          <p className="text-muted-foreground">查看系统运行日志和错误信息</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadLogs}
          >
            <Download className="h-4 w-4 mr-2" />
            下载日志
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBackendLogDialog(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            完整日志
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            清理旧日志
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总日志数</CardTitle>
            <Server className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total || 0}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              近 7 天
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">错误日志</CardTitle>
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.error || 0}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              需要处理
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">警告日志</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.warn || 0}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              需要关注
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">信息日志</CardTitle>
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.info || 0}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              正常运行
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium">筛选:</span>
            </div>

            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="日志级别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部级别</SelectItem>
                <SelectItem value="error">错误</SelectItem>
                <SelectItem value="warn">警告</SelectItem>
                <SelectItem value="info">信息</SelectItem>
                <SelectItem value="debug">调试</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="模块" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模块</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="database">数据库</SelectItem>
                <SelectItem value="service">服务</SelectItem>
                <SelectItem value="system">系统</SelectItem>
              </SelectContent>
            </Select>

            <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="显示条数" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 条</SelectItem>
                <SelectItem value="100">100 条</SelectItem>
                <SelectItem value="200">200 条</SelectItem>
                <SelectItem value="500">500 条</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="搜索日志内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            日志列表 ({filteredLogs.length} 条)
          </CardTitle>
          <CardDescription>
            显示最近的系统日志记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无日志记录</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">级别</TableHead>
                  <TableHead className="w-[120px]">模块</TableHead>
                  <TableHead>消息</TableHead>
                  <TableHead className="w-[180px]">时间</TableHead>
                  <TableHead className="w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={getLevelColor(log.level)} className="gap-1">
                        {getLevelIcon(log.level)}
                        {log.level.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.module}</TableCell>
                    <TableCell>
                      <div className="max-w-md truncate text-sm">
                        {log.message}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleString('zh-CN')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLog(log);
                          setShowDetail(true);
                        }}
                      >
                        查看详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 日志详情弹窗 */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>日志详情</DialogTitle>
            <DialogDescription>
              查看完整的日志信息
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono">{selectedLog.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">级别:</span>
                  <Badge variant={getLevelColor(selectedLog.level)} className="gap-1">
                    {getLevelIcon(selectedLog.level)}
                    {selectedLog.level.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">模块:</span>
                  <span>{selectedLog.module}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">时间:</span>
                  <span>{new Date(selectedLog.timestamp).toLocaleString('zh-CN')}</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">消息内容</h4>
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-lg text-sm">
                  {selectedLog.message}
                </div>
              </div>
              {selectedLog.details && (
                <div>
                  <h4 className="font-medium mb-2">详细信息</h4>
                  <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-lg text-sm font-mono overflow-x-auto">
                    <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 清理日志确认弹窗 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>清理旧日志</DialogTitle>
            <DialogDescription>
              确定要清理 {deleteDays} 天前的日志吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>清理天数</Label>
              <Input
                type="number"
                value={deleteDays}
                onChange={(e) => setDeleteDays(parseInt(e.target.value))}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteOldLogs}>
              确认清理
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 完整日志（后台日志）下载对话框 */}
      <Dialog open={showBackendLogDialog} onOpenChange={setShowBackendLogDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>下载完整日志</DialogTitle>
            <DialogDescription>
              下载后台系统的完整运行日志，用于问题调试和分析
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>日志说明</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                  <li><strong>app.log</strong>：主流程日志，包含所有关键步骤和错误信息</li>
                  <li><strong>dev.log</strong>：开发调试日志，包含详细的调试信息</li>
                  <li><strong>console.log</strong>：浏览器控制台日志（前端）</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>日志类型</Label>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadBackendLog('app.log')}
                  disabled={isDownloading}
                  className="justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">app.log</div>
                    <div className="text-xs text-muted-foreground">主流程日志（包含关键错误）</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadBackendLog('dev.log')}
                  disabled={isDownloading}
                  className="justify-start"
                >
                  <Code className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">dev.log</div>
                    <div className="text-xs text-muted-foreground">开发调试日志</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadBackendLog('console.log')}
                  disabled={isDownloading}
                  className="justify-start"
                >
                  <Terminal className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">console.log</div>
                    <div className="text-xs text-muted-foreground">浏览器控制台日志</div>
                  </div>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>快速下载 app.log（推荐）</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownloadBackendLog('app.log', 100)}
                  disabled={isDownloading}
                >
                  最近 100 行
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownloadBackendLog('app.log', 500)}
                  disabled={isDownloading}
                >
                  最近 500 行
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownloadBackendLog('app.log', 1000)}
                  disabled={isDownloading}
                >
                  最近 1000 行
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownloadBackendLog('app.log')}
                  disabled={isDownloading}
                >
                  完整文件
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackendLogDialog(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
