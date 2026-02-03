'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

export default function TestMonitorDirectPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<'proxy' | 'direct'>('proxy');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    setLogs([]);

    try {
      addLog('🔄 开始加载监控指标...');
      addLog(`📡 使用方式: ${method === 'proxy' ? '前端代理 (/api/admin/monitor/summary)' : '直接调用后端 (http://localhost:5001/api/admin/monitor/summary)'}`);

      const url = method === 'proxy' 
        ? '/api/admin/monitor/summary'
        : 'http://localhost:5001/api/admin/monitor/summary';

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      addLog(`📥 HTTP 状态: ${response.status} ${response.statusText}`);
      addLog(`📥 Content-Type: ${response.headers.get('Content-Type')}`);

      if (!response.ok) {
        addLog(`❌ HTTP 错误: ${response.status}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      addLog(`📥 响应文本长度: ${text.length} 字符`);
      addLog(`📥 响应文本 (完整): ${text}`);
      
      const data = JSON.parse(text);
      addLog(`📊 JSON 解析成功`);
      addLog(`📊 data.success: ${data.success}`);
      addLog(`📊 data.data: ${JSON.stringify(data.data)}`);
      addLog(`📊 data.data 类型: ${typeof data.data}`);
      addLog(`📊 data.data 是否为空对象: ${JSON.stringify(data.data) === '{}'}`);

      if (data.success && data.data && typeof data.data === 'object' && Object.keys(data.data).length > 0) {
        setMetrics(data.data);
        addLog(`✅ 数据加载成功`);
        addLog(`✅ keys: ${Object.keys(data.data).join(', ')}`);
      } else {
        addLog(`❌ 数据格式错误`);
        addLog(`❌ data.success: ${data.success}`);
        addLog(`❌ data.data: ${JSON.stringify(data.data)}`);
        addLog(`❌ Object.keys(data.data).length: ${Object.keys(data.data || {}).length}`);
        throw new Error('数据格式错误');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ 加载失败: ${errMsg}`);
      setError(errMsg);
    } finally {
      setLoading(false);
      addLog(`🏁 加载完成`);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [method]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>监控指标测试 - 对比测试</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button
              onClick={() => setMethod('proxy')}
              variant={method === 'proxy' ? 'default' : 'outline'}
              disabled={loading}
            >
              使用前端代理
            </Button>
            <Button
              onClick={() => setMethod('direct')}
              variant={method === 'direct' ? 'default' : 'outline'}
              disabled={loading}
            >
              直接调用后端
            </Button>
            <Button onClick={loadMetrics} disabled={loading}>
              重新加载
            </Button>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            <p>当前测试方式: <strong>{method === 'proxy' ? '前端代理 (/api/admin/monitor/summary)' : '直接调用后端 (http://localhost:5001/api/admin/monitor/summary)'}</strong></p>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Card className="mb-6 border-red-500 bg-red-50 dark:bg-red-900/10">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400 font-medium">❌ 错误: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* 监控指标 */}
      {metrics && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>监控指标</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-medium mb-2">系统指标</h3>
                <p className="text-sm">回调接收: {metrics.system.callback_received}</p>
                <p className="text-sm">回调处理: {metrics.system.callback_processed}</p>
                <p className="text-sm">回调错误: {metrics.system.callback_error}</p>
                <p className="text-sm">AI 请求: {metrics.system.ai_requests}</p>
                <p className="text-sm">AI 错误: {metrics.system.ai_errors}</p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h3 className="font-medium mb-2">AI 指标</h3>
                <p className="text-sm">意图识别: {metrics.ai.intentRecognition.success} / {metrics.ai.intentRecognition.total} ({metrics.ai.intentRecognition.successRate.toFixed(2)}%)</p>
                <p className="text-sm">服务回复: {metrics.ai.serviceReply.success} / {metrics.ai.serviceReply.total} ({metrics.ai.serviceReply.successRate.toFixed(2)}%)</p>
                <p className="text-sm">闲聊: {metrics.ai.chat.success} / {metrics.ai.chat.total} ({metrics.ai.chat.successRate.toFixed(2)}%)</p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h3 className="font-medium mb-2">总结</h3>
                <p className="text-sm">总回调数: {metrics.summary.totalCallbacks}</p>
                <p className="text-sm">成功率: {metrics.summary.successRate}%</p>
                <p className="text-sm">AI 成功率: {metrics.summary.aiSuccessRate.toFixed(2)}%</p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-medium mb-2">原始数据</h3>
                <pre className="text-xs overflow-auto max-h-40 bg-gray-100 dark:bg-gray-900 p-2 rounded">
                  {JSON.stringify(metrics, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 加载状态 */}
      {loading && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">加载中...</p>
          </CardContent>
        </Card>
      )}

      {/* 日志面板 */}
      <Card>
        <CardHeader>
          <CardTitle>加载日志</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">暂无日志</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
