'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, RefreshCw } from 'lucide-react';

export default function MonitorMetricsTest() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const loadMetrics = async () => {
    addLog('🔄 开始加载监控指标...');
    setLoading(true);
    setError(null);

    try {
      addLog('📡 请求 API: /api/admin/monitor/summary');
      const res = await fetch('/api/admin/monitor/summary');
      addLog(`📥 响应状态: ${res.status} ${res.ok ? 'OK' : 'FAIL'}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      addLog(`📊 响应数据: success=${data.success}, hasData=${!!data.data}`);

      if (data.success && data.data) {
        setMetrics(data.data);
        addLog('✅ 数据加载成功');
      } else {
        throw new Error('数据格式错误');
      }
    } catch (error: any) {
      addLog(`❌ 加载失败: ${error.message}`);
      setError(error.message);
    } finally {
      setLoading(false);
      addLog('🏁 加载完成');
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">监控指标测试页面</h1>

      {/* 日志面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            加载日志
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 font-mono text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded max-h-60 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">暂无日志</div>
            ) : (
              logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 监控指标卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">监控指标</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-4 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          )}

          {error && (
            <div className="text-center py-4 text-red-500">
              ❌ {error}
            </div>
          )}

          {metrics && !loading && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">系统指标</h3>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <div className="text-muted-foreground">回调处理</div>
                    <div className="font-bold">{metrics.system?.callback_processed || 0}</div>
                  </div>
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <div className="text-muted-foreground">回调错误</div>
                    <div className="font-bold">{metrics.system?.callback_error || 0}</div>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-900/20 rounded">
                    <div className="text-muted-foreground">回调接收</div>
                    <div className="font-bold">{metrics.system?.callback_received || 0}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">AI 指标</h3>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <div className="text-muted-foreground">意图识别</div>
                    <div className="font-bold">{metrics.ai?.intentRecognition?.successRate || 'N/A'}%</div>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <div className="text-muted-foreground">服务回复</div>
                    <div className="font-bold">{metrics.ai?.serviceReply?.successRate || 'N/A'}%</div>
                  </div>
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                    <div className="text-muted-foreground">闲聊</div>
                    <div className="font-bold">{metrics.ai?.chat?.successRate || 'N/A'}%</div>
                  </div>
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                    <div className="text-muted-foreground">整体</div>
                    <div className="font-bold">{metrics.summary?.aiSuccessRate || 'N/A'}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 控制按钮 */}
      <div className="flex gap-2">
        <button
          onClick={loadMetrics}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          重新加载
        </button>
      </div>
    </div>
  );
}
