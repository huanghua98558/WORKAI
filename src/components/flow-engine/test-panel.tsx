'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  instance: {
    id: string;
    flowDefinitionId: string;
    flowName: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    processingTime: number;
  };
  logs: Array<{
    id: string;
    nodeId: string;
    nodeType: string;
    nodeName: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  }>;
}

export default function TestPanel() {
  const [flowName, setFlowName] = useState('');
  const [triggerData, setTriggerData] = useState('{\n  "message": "测试数据"\n}');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [polling, setPolling] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState('');

  // 模拟流程列表（实际应该从 API 获取）
  const flows = [
    { id: '1', name: '群组协作流程' },
    { id: '2', name: '视频号流程' },
    { id: '3', name: 'AI 分析流程' },
  ];

  const handleTest = async () => {
    if (!selectedFlow) {
      alert('请选择流程');
      return;
    }

    setLoading(true);
    try {
      let parsedTriggerData;
      try {
        parsedTriggerData = JSON.parse(triggerData);
      } catch (e) {
        alert('触发数据格式错误，请确保是有效的 JSON');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/flow-engine/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flowName: selectedFlow,
          triggerData: parsedTriggerData,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTestResult(result.data as TestResult);

        // 开始轮询执行状态
        setPolling(true);
        pollStatus(result.data.instance.id);
      } else {
        alert(result.error || '测试启动失败');
      }
    } catch (error) {
      console.error('Test failed:', error);
      alert('测试启动失败');
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = async (instanceId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/flow-engine/test?instanceId=${instanceId}`);
        const result = await response.json();
        if (result.success) {
          setTestResult(result.data as TestResult);

          // 如果流程完成或失败，停止轮询
          if (
            result.data.instance.status === 'completed' ||
            result.data.instance.status === 'failed'
          ) {
            clearInterval(pollInterval);
            setPolling(false);
          }
        }
      } catch (error) {
        console.error('Polling failed:', error);
        clearInterval(pollInterval);
        setPolling(false);
      }
    }, 2000);

    // 最多轮询5分钟
    setTimeout(() => {
      clearInterval(pollInterval);
      setPolling(false);
    }, 5 * 60 * 1000);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      running: { color: 'bg-blue-500', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
      completed: { color: 'bg-green-500', icon: <CheckCircle className="w-4 h-4" /> },
      failed: { color: 'bg-red-500', icon: <AlertCircle className="w-4 h-4" /> },
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
      {/* 测试配置 */}
      <Card>
        <CardHeader>
          <CardTitle>流程测试</CardTitle>
          <CardDescription>手动触发流程执行并查看结果</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flow-select">选择流程</Label>
            <Select value={selectedFlow} onValueChange={setSelectedFlow}>
              <SelectTrigger id="flow-select">
                <SelectValue placeholder="选择要测试的流程" />
              </SelectTrigger>
              <SelectContent>
                {flows.map((flow) => (
                  <SelectItem key={flow.id} value={flow.name}>
                    {flow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trigger-data">触发数据（JSON）</Label>
            <Textarea
              id="trigger-data"
              value={triggerData}
              onChange={(e) => setTriggerData(e.target.value)}
              placeholder="输入触发数据（JSON 格式）"
              className="min-h-[150px] font-mono text-sm"
            />
          </div>

          <Button onClick={handleTest} disabled={loading || polling} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                启动中...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                开始测试
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 测试结果 */}
      {testResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>执行结果</CardTitle>
                <CardDescription>流程 ID: {testResult.instance.id}</CardDescription>
              </div>
              {getStatusBadge(testResult.instance.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">流程名称：</span>
                <span className="font-medium ml-2">{testResult.instance.flowName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">状态：</span>
                <span className="font-medium ml-2">{testResult.instance.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground">开始时间：</span>
                <span className="font-medium ml-2">{formatTime(testResult.instance.startedAt)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">完成时间：</span>
                <span className="font-medium ml-2">{formatTime(testResult.instance.completedAt)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">耗时：</span>
                <span className="font-medium ml-2">{testResult.instance.processingTime}ms</span>
              </div>
            </div>

            {/* 执行日志 */}
            <div className="space-y-2">
              <h4 className="font-semibold">执行日志</h4>
              <div className="space-y-2">
                {testResult.logs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-3 space-y-1 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.nodeName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {log.nodeType}
                        </Badge>
                        {getStatusBadge(log.status)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(log.startedAt)}
                      </span>
                    </div>
                    {log.errorMessage && (
                      <div className="text-sm text-red-500 bg-red-50 p-2 rounded mt-2">
                        {log.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {polling && (
              <div className="text-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                等待流程执行完成...
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
