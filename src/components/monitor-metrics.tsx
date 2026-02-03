'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Clock,
  RefreshCw
} from 'lucide-react';

interface MonitorMetricsProps {
  className?: string;
}

export default function MonitorMetrics({ className }: MonitorMetricsProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(true);

  const loadMetrics = async (showLoading = false) => {
    // 如果组件已卸载，不执行加载
    if (!isMounted.current) return;

    console.log('🔄 开始加载监控指标...');

    if (showLoading) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    
    setError(null);

    // 添加超时机制（5秒）
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), 5000);
    });

    try {
      console.log('📡 请求 API: /api/admin/monitor/summary');
      
      const res = await Promise.race([
        fetch('/api/admin/monitor/summary'),
        timeoutPromise
      ]) as Response;
      
      console.log('📥 响应状态:', res.status, res.ok);
      
      if (!res.ok) {
        console.error('❌ HTTP 错误:', res.status, res.statusText);
        throw new Error('加载失败');
      }

      const data = await res.json();
      console.log('📊 响应数据:', data);
      
      if (isMounted.current && data.success && data.data) {
        console.log('✅ 数据加载成功');
        setMetrics(data.data);
      } else {
        console.error('❌ 数据格式错误:', data);
        throw new Error('数据格式错误');
      }
    } catch (error) {
      console.error('❌ 加载监控指标失败:', error);
      
      if (isMounted.current) {
        setError('加载失败');
        // 设置默认数据，避免显示空白
        setMetrics({
          system: {
            callback_processed: 0,
            callback_error: 0,
            callback_received: 0,
            ai_requests: 0,
            ai_errors: 0
          },
          ai: {
            intentRecognition: { successRate: 'N/A' },
            serviceReply: { successRate: 'N/A' },
            chat: { successRate: 'N/A' },
            report: { successRate: 'N/A' },
            successRate: 'N/A'
          },
          summary: {
            totalCallbacks: 0,
            successRate: 'N/A',
            aiSuccessRate: 'N/A'
          }
        });
      }
    } finally {
      if (isMounted.current) {
        console.log('🏁 加载完成，loading = false');
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    // 初始加载
    loadMetrics(true);

    // 每30秒刷新一次（不显示加载状态）
    const interval = setInterval(() => {
      loadMetrics(false);
    }, 30000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, []);

  // 初始加载状态
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            监控指标
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            加载中...
          </div>
          {error && (
            <div className="mt-2 text-center text-xs text-red-500">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const systemMetrics = metrics?.system || {};
  const aiMetrics = metrics?.ai || {};
  const summaryMetrics = metrics?.summary || {};

  // 格式化成功率为百分比
  const formatSuccessRate = (rate: number | string): string => {
    if (typeof rate === 'number') {
      return rate.toFixed(2) + '%';
    }
    if (typeof rate === 'string') {
      // 如果已经是百分比格式，直接返回
      if (rate.includes('%')) {
        return rate;
      }
      // 如果是数字字符串，转换为百分比
      const num = parseFloat(rate);
      if (!isNaN(num)) {
        return num.toFixed(2) + '%';
      }
    }
    return 'N/A';
  };

  // 计算 AI 总成功率（从各个模块的总成功数和总数）
  const aiTotalSuccess = (aiMetrics.intentRecognition?.success || 0) +
                        (aiMetrics.serviceReply?.success || 0) +
                        (aiMetrics.chat?.success || 0) +
                        (aiMetrics.report?.success || 0);
  const aiTotalFailure = (aiMetrics.intentRecognition?.failure || 0) +
                        (aiMetrics.serviceReply?.failure || 0) +
                        (aiMetrics.chat?.failure || 0) +
                        (aiMetrics.report?.failure || 0);
  const aiTotalRequests = aiTotalSuccess + aiTotalFailure;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              监控指标
            </CardTitle>
            <CardDescription className="mt-1">实时系统状态和性能指标</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadMetrics(false)}
            disabled={isRefreshing}
            className="h-8 w-8 p-0 ml-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
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
              value={aiTotalSuccess}
              trend={aiTotalFailure}
              total={aiTotalRequests}
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
                {formatSuccessRate(aiMetrics.intentRecognition?.successRate || 'N/A')}
              </div>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="text-xs text-muted-foreground">服务回复</div>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {formatSuccessRate(aiMetrics.serviceReply?.successRate || 'N/A')}
              </div>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
              <div className="text-xs text-muted-foreground">闲聊</div>
              <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                {formatSuccessRate(aiMetrics.chat?.successRate || 'N/A')}
              </div>
            </div>
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
              <div className="text-xs text-muted-foreground">整体</div>
              <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                {formatSuccessRate(summaryMetrics.aiSuccessRate || 'N/A')}
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
          
          {error ? (
            <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
              <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadMetrics(false)}
                disabled={isRefreshing}
                className="h-6 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                重试
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
              <span className="text-sm">系统运行正常</span>
              <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <Activity className="h-3 w-3 mr-1" />
                在线
              </Badge>
            </div>
          )}
          
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
