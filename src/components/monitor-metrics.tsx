'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Cpu, 
  HardDrive, 
  Network, 
  Bot, 
  MessageSquare, 
  Users, 
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock
} from 'lucide-react';

interface MonitorMetricsProps {
  className?: string;
}

export default function MonitorMetrics({ className }: MonitorMetricsProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    try {
      // 从监控API获取数据
      const res = await fetch('/api/admin/monitor/summary');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('加载监控指标失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    // 每30秒刷新一次
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            监控指标
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            加载中...
          </div>
        </CardContent>
      </Card>
    );
  }

  const systemMetrics = metrics.system || {};
  const aiMetrics = metrics.ai || {};

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" />
          监控指标
        </CardTitle>
        <CardDescription>实时系统状态和性能指标</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 系统指标 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">系统指标</span>
          </div>
          
          <div className="space-y-1">
            <MetricItem
              label="回调处理"
              value={systemMetrics.callback_processed || 0}
              trend={systemMetrics.callback_error || 0}
              total={systemMetrics.callback_received || 0}
              icon={<Zap className="h-3 w-3" />}
            />
            <MetricItem
              label="AI 调用"
              value={aiMetrics.success || 0}
              trend={aiMetrics.error || 0}
              icon={<Bot className="h-3 w-3" />}
            />
          </div>
        </div>

        {/* AI 性能 */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">AI 性能</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
              <div className="text-xs text-muted-foreground">意图识别</div>
              <div className="text-sm font-bold text-green-600 dark:text-green-400">
                {aiMetrics.intentRecognition?.successRate || 'N/A'}
              </div>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="text-xs text-muted-foreground">服务回复</div>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {aiMetrics.serviceReply?.successRate || 'N/A'}
              </div>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
              <div className="text-xs text-muted-foreground">闲聊</div>
              <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                {aiMetrics.chat?.successRate || 'N/A'}
              </div>
            </div>
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
              <div className="text-xs text-muted-foreground">整体</div>
              <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                {aiMetrics.successRate || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* 系统状态 */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">系统状态</span>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
            <span className="text-sm">系统运行正常</span>
            <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <Activity className="h-3 w-3 mr-1" />
              在线
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            <Clock className="h-3 w-3 inline mr-1" />
            最后更新: {new Date().toLocaleTimeString('zh-CN')}
          </div>
        </div>

        {/* 快速操作 */}
        <div className="pt-2 border-t">
          <Label className="text-sm font-medium">监控开关</Label>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">启用监控</span>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">启用告警</span>
            <Switch defaultChecked />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricItemProps {
  label: string;
  value: number;
  trend?: number;
  total?: number;
  icon: React.ReactNode;
}

function MetricItem({ label, value, trend = 0, total, icon }: MetricItemProps) {
  const isError = trend > 0;
  
  return (
    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
      <div className="flex items-center gap-2">
        <div className="text-muted-foreground">{icon}</div>
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">{value.toLocaleString()}</div>
        {trend > 0 && (
          <div className="text-xs text-red-500 flex items-center justify-end gap-1">
            <TrendingUp className="h-3 w-3" />
            {trend} 错误
          </div>
        )}
        {total && total > value && (
          <div className="text-xs text-muted-foreground">
            总计: {total.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
