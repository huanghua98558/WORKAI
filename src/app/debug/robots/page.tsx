'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function DebugRobotsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [robotsData, setRobotsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[DebugRobots] ${message}`);
  };

  const testRobotsAPI = async () => {
    setLoading(true);
    addLog('开始测试机器人 API...');

    try {
      // 测试 /api/admin/robots
      addLog('请求: GET /api/admin/robots');
      const response = await fetch('/api/admin/robots');
      addLog(`响应状态: ${response.status} ${response.statusText}`);

      const contentType = response.headers.get('content-type');
      addLog(`响应类型: ${contentType}`);

      if (response.ok) {
        const data = await response.json();
        addLog(`响应数据: ${JSON.stringify(data, null, 2)}`);
        setRobotsData(data);

        if (data.code === 0) {
          addLog(`✓ 成功获取 ${data.data?.length || 0} 个机器人`);
        } else {
          addLog(`✗ API 返回错误: ${data.message}`);
        }
      } else {
        addLog(`✗ 请求失败: ${response.status}`);
        const errorText = await response.text();
        addLog(`错误详情: ${errorText}`);
      }
    } catch (error) {
      addLog(`✗ 请求异常: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testLocalStorage = () => {
    addLog('检查 localStorage...');
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    addLog(`access_token: ${token ? '存在' : '不存在'}`);
    addLog(`user: ${user ? '存在' : '不存在'}`);
    if (user) {
      try {
        const userData = JSON.parse(user);
        addLog(`用户信息: ${JSON.stringify(userData, null, 2)}`);
      } catch (e) {
        addLog(`用户信息解析失败`);
      }
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setRobotsData(null);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">机器人 API 调试页面</h1>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>测试操作</CardTitle>
              <CardDescription>点击按钮测试不同的功能</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button onClick={testRobotsAPI} disabled={loading}>
                {loading ? '测试中...' : '测试机器人 API'}
              </Button>
              <Button onClick={testLocalStorage} variant="outline">
                检查 LocalStorage
              </Button>
              <Button onClick={clearLogs} variant="outline">
                清除日志
              </Button>
            </CardContent>
          </Card>

          {robotsData && (
            <Card>
              <CardHeader>
                <CardTitle>机器人数据</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(robotsData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>日志</CardTitle>
                <Badge variant="outline">{logs.length} 条</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500">暂无日志</p>
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
      </div>
    </div>
  );
}
