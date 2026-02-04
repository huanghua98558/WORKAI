'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCircle2, XCircle, Eye, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

interface AlertHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  intentType: string;
  alertLevel: 'info' | 'warning' | 'critical';
  message: string;
  details?: any;
  status: 'pending' | 'acknowledged' | 'closed';
  isAcknowledged: boolean;
  isClosed: boolean;
  acknowledgedAt?: string;
  closedAt?: string;
  createdAt: string;
}

export default function AlertCenterPage() {
  const [alerts, setAlerts] = useState<AlertHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    level: 'all',
    status: 'all'
  });
  const [selectedAlert, setSelectedAlert] = useState<AlertHistory | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // 加载告警历史
  const loadAlerts = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/alerts/history?limit=100');
      const data = await response.json();
      if (data.success) {
        setAlerts(data.data || []);
      }
    } catch (error) {
      console.error('加载告警历史失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    // 每30秒刷新一次
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  // 确认告警
  const handleAcknowledge = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:5001/api/alerts/${id}/acknowledge`, {
        method: 'POST'
      });

      if (response.ok) {
        loadAlerts();
        setIsDetailDialogOpen(false);
      }
    } catch (error) {
      console.error('确认失败:', error);
      alert('操作失败');
    }
  };

  // 关闭告警
  const handleClose = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:5001/api/alerts/${id}/close`, {
        method: 'POST'
      });

      if (response.ok) {
        loadAlerts();
        setIsDetailDialogOpen(false);
      }
    } catch (error) {
      console.error('关闭失败:', error);
      alert('操作失败');
    }
  };

  // 查看详情
  const handleViewDetail = (alert: AlertHistory) => {
    setSelectedAlert(alert);
    setIsDetailDialogOpen(true);
  };

  // 过滤告警
  const filteredAlerts = alerts.filter(alert => {
    if (filter.level !== 'all' && alert.alertLevel !== filter.level) return false;
    if (filter.status !== 'all' && alert.status !== filter.status) return false;
    return true;
  });

  // 获取告警级别样式
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertOctagon className="h-3 w-3" /> Critical
        </Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 text-white flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Warning
        </Badge>;
      case 'info':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Info className="h-3 w-3" /> Info
        </Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  // 获取状态样式
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">待处理</Badge>;
      case 'acknowledged':
        return <Badge className="bg-blue-500 text-white">已确认</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500 text-white">已关闭</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 统计数据
  const stats = {
    total: alerts.length,
    pending: alerts.filter(a => a.status === 'pending').length,
    critical: alerts.filter(a => a.alertLevel === 'critical' && a.status === 'pending').length,
    warning: alerts.filter(a => a.alertLevel === 'warning' && a.status === 'pending').length,
    info: alerts.filter(a => a.alertLevel === 'info' && a.status === 'pending').length
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">告警中心</h1>
        <p className="text-gray-600">查看和管理所有告警</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>总告警数</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>待处理</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>紧急告警</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.critical}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>警告</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.warning}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 过滤器 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">告警级别</label>
              <Select value={filter.level} onValueChange={value => setFilter({ ...filter, level: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">告警状态</label>
              <Select value={filter.status} onValueChange={value => setFilter({ ...filter, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="acknowledged">已确认</SelectItem>
                  <SelectItem value="closed">已关闭</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={loadAlerts}>
                <Bell className="mr-2 h-4 w-4" />
                刷新
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 告警列表 */}
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">列表视图</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">暂无告警</p>
                  <p className="text-sm text-gray-400">当前筛选条件下没有告警记录</p>
                </CardContent>
              </Card>
            ) : (
              filteredAlerts.map(alert => (
                <Card key={alert.id} className={alert.status === 'pending' ? 'border-l-4 border-l-red-500' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          {alert.ruleName}
                          {getLevelBadge(alert.alertLevel)}
                          {getStatusBadge(alert.status)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {new Date(alert.createdAt).toLocaleString('zh-CN')}
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetail(alert)}>
                        <Eye className="h-4 w-4 mr-2" />
                        查看详情
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{alert.message}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedAlert && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedAlert.ruleName}
                  {getLevelBadge(selectedAlert.alertLevel)}
                </DialogTitle>
                <DialogDescription>
                  触发时间：{new Date(selectedAlert.createdAt).toLocaleString('zh-CN')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* 基本信息 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">基本信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">规则 ID</span>
                      <span className="text-sm font-mono">{selectedAlert.ruleId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">监控类型</span>
                      <span className="text-sm">{selectedAlert.intentType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">告警级别</span>
                      {getLevelBadge(selectedAlert.alertLevel)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">状态</span>
                      {getStatusBadge(selectedAlert.status)}
                    </div>
                  </CardContent>
                </Card>

                {/* 告警消息 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">告警消息</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedAlert.message}</p>
                  </CardContent>
                </Card>

                {/* 详细信息 */}
                {selectedAlert.details && Object.keys(selectedAlert.details).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">详细信息</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                        {JSON.stringify(selectedAlert.details, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* 时间线 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">处理时间线</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">创建于 {new Date(selectedAlert.createdAt).toLocaleString('zh-CN')}</span>
                      </div>
                      {selectedAlert.acknowledgedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">确认于 {new Date(selectedAlert.acknowledgedAt).toLocaleString('zh-CN')}</span>
                        </div>
                      )}
                      {selectedAlert.closedAt && (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">关闭于 {new Date(selectedAlert.closedAt).toLocaleString('zh-CN')}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                {selectedAlert.status !== 'closed' && (
                  <>
                    {selectedAlert.status === 'pending' && (
                      <Button
                        variant="outline"
                        onClick={() => handleAcknowledge(selectedAlert.id)}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        确认告警
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      onClick={() => handleClose(selectedAlert.id)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      关闭告警
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
