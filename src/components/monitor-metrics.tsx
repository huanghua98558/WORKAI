'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface Metrics {
  date: string;
  system: {
    callback_received: number;
    callback_processed: number;
    callback_error: number;
    ai_requests: number;
    ai_errors: number;
  };
  ai: {
    intentRecognition: { total: number; success: number; failure: number; successRate: number };
    serviceReply: { total: number; success: number; failure: number; successRate: number };
    chat: { total: number; success: number; failure: number; successRate: number };
    report: { total: number; success: number; failure: number; successRate: number };
  };
  summary: {
    totalCallbacks: number;
    successRate: string;
    aiSuccessRate: number;
  };
}

interface MonitorMetricsProps {
  className?: string;
}

export default function MonitorMetrics({ className }: MonitorMetricsProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const isMounted = useRef(true);
  const isLoading = useRef(false);

  const loadMetrics = async (showLoading = false) => {
    // 防止并发请求
    if (isLoading.current) {
      console.log('⚠️  已有请求正在进行，跳过本次请求');
      return;
    }

    if (!isMounted.current) return;

    isLoading.current = true;
    console.log('🔄 开始加载监控指标...');

    if (showLoading) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    
    setError(null);

    try {
      console.log('📡 请求 API: /api/admin/monitor/summary');
      
      const response = await fetch('/api/admin/monitor/summary');
      console.log('📥 HTTP状态:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('❌ HTTP 错误:', response.status);
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      console.log('📥 响应文本长度:', text.length);
      console.log('📥 响应文本:', text);
      
      const data = JSON.parse(text);
      console.log('📊 JSON解析成功');
      console.log('📊 data.success:', data.success);
      console.log('📊 data.data:', JSON.stringify(data.data));
      console.log('📊 data.data === {}:', JSON.stringify(data.data) === '{}');

      if (data.success && data.data && typeof data.data === 'object' && Object.keys(data.data).length > 0) {
        setMetrics(data.data);
        setLastUpdate(new Date());
        console.log('✅ 数据加载成功，设置metrics');
      } else {
        console.error('❌ 数据验证失败');
        console.error('❌ data.success:', data.success);
        console.error('❌ data.data:', data.data);
        console.error('❌ Object.keys(data.data).length:', Object.keys(data.data || {}).length);
        throw new Error('数据格式错误');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('❌ 加载失败:', errMsg);
      setError(errMsg);
    } finally {
      isLoading.current = false;
      if (isMounted.current) {
        setLoading(false);
        setIsRefreshing(false);
        console.log('🏁 加载完成');
      }
    }
  };

  useEffect(() => {
    console.log('🚀 useEffect 执行，开始初始加载');
    loadMetrics(true);

    const interval = setInterval(() => {
      loadMetrics(false);
    }, 30000);

    return () => {
      console.log('🧹 清理 effect');
      isMounted.current = false;
      clearInterval(interval);
    };
  }, []);

  const formatSuccessRate = (rate: number | string): string => {
    if (typeof rate === 'number') {
      return rate.toFixed(2) + '%';
    }
    if (typeof rate === 'string') {
      if (rate.includes('%')) {
        return rate;
      }
      const num = parseFloat(rate);
      if (!isNaN(num)) {
        return num.toFixed(2) + '%';
      }
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">加载中...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">监控指标</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center min-h-[200px]">
            <p className="text-sm text-muted-foreground">暂无数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 计算 AI 调用指标
  const aiTotalSuccess = (metrics.ai.intentRecognition?.success || 0) +
                        (metrics.ai.serviceReply?.success || 0) +
                        (metrics.ai.chat?.success || 0) +
                        (metrics.ai.report?.success || 0);
  const aiTotalFailure = (metrics.ai.intentRecognition?.failure || 0) +
                        (metrics.ai.serviceReply?.failure || 0) +
                        (metrics.ai.chat?.failure || 0) +
                        (metrics.ai.report?.failure || 0);
  const aiTotalRequests = aiTotalSuccess + aiTotalFailure;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">监控指标</CardTitle>
        <div className="flex items-center gap-2">
          {isRefreshing && (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadMetrics(true)}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 回调处理指标 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">回调处理</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">已处理</p>
                <p className="text-2xl font-bold">{metrics.system.callback_processed}</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">错误</p>
                <p className="text-2xl font-bold">{metrics.system.callback_error}</p>
              </div>
            </div>
          </div>

          {/* AI 调用指标 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">AI 调用</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">成功</p>
                <p className="text-2xl font-bold">{aiTotalSuccess}</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">失败</p>
                <p className="text-2xl font-bold">{aiTotalFailure}</p>
              </div>
            </div>
          </div>

          {/* 成功率指标 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">成功率</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">回调</p>
                <p className="text-2xl font-bold">{formatSuccessRate(metrics.summary.successRate)}</p>
              </div>
              <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">AI</p>
                <p className="text-2xl font-bold">{formatSuccessRate(metrics.summary.aiSuccessRate)}</p>
              </div>
            </div>
          </div>

          {/* 意图识别详情 */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">意图识别</p>
              <span className="text-xs font-medium">
                {metrics.ai.intentRecognition?.success || 0} / {metrics.ai.intentRecognition?.total || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${metrics.ai.intentRecognition?.total > 0
                    ? (metrics.ai.intentRecognition.success / metrics.ai.intentRecognition.total) * 100
                    : 0}%`
                }}
              />
            </div>
          </div>

          {/* 服务回复详情 */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">服务回复</p>
              <span className="text-xs font-medium">
                {metrics.ai.serviceReply?.success || 0} / {metrics.ai.serviceReply?.total || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${metrics.ai.serviceReply?.total > 0
                    ? (metrics.ai.serviceReply.success / metrics.ai.serviceReply.total) * 100
                    : 0}%`
                }}
              />
            </div>
          </div>

          {/* 闲聊详情 */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">闲聊</p>
              <span className="text-xs font-medium">
                {metrics.ai.chat?.success || 0} / {metrics.ai.chat?.total || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${metrics.ai.chat?.total > 0
                    ? (metrics.ai.chat.success / metrics.ai.chat.total) * 100
                    : 0}%`
                }}
              />
            </div>
          </div>
        </div>

        {lastUpdate && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            最后更新: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
