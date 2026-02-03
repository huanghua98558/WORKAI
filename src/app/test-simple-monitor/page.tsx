'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function SimpleMonitorTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [data, setData] = useState<any>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  useEffect(() => {
    addLog('🔄 开始加载...');

    fetch('/api/admin/monitor/summary')
      .then(res => {
        addLog(`📥 HTTP状态: ${res.status} ${res.statusText}`);
        addLog(`📥 Content-Type: ${res.headers.get('Content-Type')}`);
        return res.text();
      })
      .then(text => {
        addLog(`📥 响应文本长度: ${text.length}`);
        addLog(`📥 响应文本: ${text}`);
        const parsed = JSON.parse(text);
        addLog(`📊 JSON解析成功`);
        addLog(`📊 parsed.success: ${parsed.success}`);
        addLog(`📊 parsed.data: ${JSON.stringify(parsed.data)}`);
        addLog(`📊 parsed.data === {}: ${JSON.stringify(parsed.data) === '{}'}`);
        setData(parsed);
      })
      .catch(err => {
        addLog(`❌ 错误: ${err.message}`);
      });
  }, []);

  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h1 className="text-xl font-bold mb-4">简单监控测试</h1>
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="text-sm font-mono">
                {log}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {data && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-bold mb-4">数据</h2>
            <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
