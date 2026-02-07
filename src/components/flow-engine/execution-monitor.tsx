'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

interface FlowInstance {
  id: string;
  flowName: string;
  flowDefinitionVersion: string;
  status: string;
  currentNodeId: string | null;
  startedAt: string;
  completedAt: string | null;
  processingTime: number;
  totalNodes: number;
  successCount: number;
  failedCount: number;
  errorMessage: string | null;
}

interface Stats {
  statusStats: Array<{ status: string; count: number }>;
  trendStats: Array<{ date: string; count: number; completed: number; failed: number }>;
  flowStats: Array<{ flow_name: string; total_count: number; completed_count: number; failed_count: number }>;
}

export default function ExecutionMonitor() {
  const [instances, setInstances] = useState<FlowInstance[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('running');
  const [loading, setLoading] = useState(false);

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/flow-engine/monitor?status=${selectedStatus}&limit=50`);
      const result = await response.json();
      if (result.success) {
        setInstances(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/flow-engine/monitor/stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchInstances();
    fetchStats();

    // 自动刷新（每5秒）
    const interval = setInterval(() => {
      fetchInstances();
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedStatus]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      running: { color: 'bg-blue-500', icon: <Clock className="w-4 h-4" /> },
      completed: { color: 'bg-green-500', icon: <CheckCircle className="w-4 h-4" /> },
      failed: { color: 'bg-red-500', icon: <AlertCircle className="w-4 h-4" /> },
      cancelled: { color: 'bg-gray-500', icon: <AlertCircle className="w-4 h-4" /> },
    };

    const config = statusConfig[status] || { color: 'bg-gray-500', icon: null };
    return (
      <Badge variant="outline" className="gap-1">
        <span className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.icon}
        {status}
      </Badge>
    );
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">运行中</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.statusStats.find((s) => s.status === 'running')?.count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已完成</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.statusStats.find((s) => s.status === 'completed')?.count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">失败</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.statusStats.find((s) => s.status === 'failed')?.count || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 流程实例列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>流程实例</CardTitle>
              <CardDescription>实时监控流程执行状态</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="running">运行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                  <SelectItem value="all">全部</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchInstances}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {instances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无流程实例
              </div>
            ) : (
              instances.map((instance) => (
                <div
                  key={instance.id}
                  className="border rounded-lg p-4 space-y-2 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{instance.flowName}</h3>
                      <Badge variant="secondary">v{instance.flowDefinitionVersion}</Badge>
                      {getStatusBadge(instance.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(instance.startedAt)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">节点进度：</span>
                      <span className="font-medium">
                        {instance.successCount}/{instance.totalNodes}
                      </span>
                      {instance.failedCount > 0 && (
                        <span className="text-red-500 ml-1">({instance.failedCount} 失败)</span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">耗时：</span>
                      <span className="font-medium">
                        {instance.processingTime}ms
                      </span>
                    </div>
                    {instance.currentNodeId && (
                      <div>
                        <span className="text-muted-foreground">当前节点：</span>
                        <span className="font-medium">{instance.currentNodeId}</span>
                      </div>
                    )}
                  </div>
                  {instance.errorMessage && (
                    <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                      {instance.errorMessage}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
