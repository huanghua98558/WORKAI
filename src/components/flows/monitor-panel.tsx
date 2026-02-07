'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface FlowInstance {
  id: string;
  flowName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  processingTime: number;
  successCount: number;
  totalNodes: number;
  failedCount: number;
  errorMessage: string | null;
}

interface MonitorPanelProps {
  flowId: string | null;
}

export default function MonitorPanel({ flowId }: MonitorPanelProps) {
  const [instances, setInstances] = useState<FlowInstance[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const fetchInstances = async () => {
    if (!flowId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/flow-engine/monitor?status=${selectedStatus}&limit=20`);
      const result = await response.json();
      if (result.success) {
        // 过滤只显示当前流程的实例
        const filteredInstances = result.data.filter(
          (instance: any) => instance.flowDefinitionId === flowId
        );
        setInstances(filteredInstances);
      }
    } catch (error) {
      console.error('Failed to fetch instances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (flowId) {
      fetchInstances();
      const interval = setInterval(fetchInstances, 5000);
      return () => clearInterval(interval);
    }
  }, [flowId, selectedStatus]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      running: { color: 'bg-blue-500', icon: <Clock className="w-3 h-3" /> },
      completed: { color: 'bg-green-500', icon: <CheckCircle className="w-3 h-3" /> },
      failed: { color: 'bg-red-500', icon: <AlertCircle className="w-3 h-3" /> },
    };

    const config = statusConfig[status] || { color: 'bg-gray-500', icon: null };
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <span className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
        {config.icon}
        {status}
      </Badge>
    );
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!flowId) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        选择一个流程以查看执行监控
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">执行监控</CardTitle>
              <CardDescription className="text-xs">实时监控流程执行状态</CardDescription>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="running">运行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {instances.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                暂无执行记录
              </div>
            ) : (
              instances.map((instance) => (
                <div
                  key={instance.id}
                  className="border rounded-lg p-3 space-y-2 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">执行实例</span>
                      {getStatusBadge(instance.status)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatTime(instance.startedAt)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">进度：</span>
                      <span className="font-medium ml-1">
                        {instance.successCount}/{instance.totalNodes}
                      </span>
                      {instance.failedCount > 0 && (
                        <span className="text-red-500 ml-1">({instance.failedCount} 失败)</span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">耗时：</span>
                      <span className="font-medium ml-1">{instance.processingTime}ms</span>
                    </div>
                  </div>
                  {instance.errorMessage && (
                    <div className="text-xs text-red-500 bg-red-50 p-2 rounded truncate">
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
