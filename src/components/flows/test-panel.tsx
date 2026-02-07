'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  instance: {
    id: string;
    flowName: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    processingTime: number;
  };
  logs: Array<{
    id: string;
    nodeName: string;
    nodeType: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  }>;
}

interface TestPanelProps {
  flowId: string | null;
}

export default function TestPanel({ flowId }: TestPanelProps) {
  const [triggerData, setTriggerData] = useState('{\n  "message": "测试数据"\n}');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [polling, setPolling] = useState(false);

  const handleTest = async () => {
    if (!flowId) {
      alert('请先选择流程');
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
          flowId,
          triggerData: parsedTriggerData,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setTestResult(result.data as TestResult);
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

  if (!flowId) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        选择一个流程以进行测试
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">流程测试</CardTitle>
          <CardDescription className="text-xs">手动触发流程执行</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">触发数据（JSON）</label>
            <Textarea
              value={triggerData}
              onChange={(e) => setTriggerData(e.target.value)}
              placeholder="输入触发数据（JSON 格式）"
              className="min-h-[120px] font-mono text-xs"
            />
          </div>

          <Button onClick={handleTest} disabled={loading || polling} className="w-full" size="sm">
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

      {testResult && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">执行结果</CardTitle>
              {getStatusBadge(testResult.instance.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">流程名称：</span>
                <span className="font-medium ml-1">{testResult.instance.flowName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">耗时：</span>
                <span className="font-medium ml-1">{testResult.instance.processingTime}ms</span>
              </div>
              <div>
                <span className="text-muted-foreground">开始时间：</span>
                <span className="font-medium ml-1">{formatTime(testResult.instance.startedAt)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">完成时间：</span>
                <span className="font-medium ml-1">{formatTime(testResult.instance.completedAt)}</span>
              </div>
            </div>

            {testResult.logs.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">执行日志</label>
                <div className="space-y-2 max-h-[200px] overflow-auto">
                  {testResult.logs.map((log) => (
                    <div
                      key={log.id}
                      className="border rounded p-2 space-y-1 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{log.nodeName}</span>
                          {getStatusBadge(log.status)}
                        </div>
                      </div>
                      {log.errorMessage && (
                        <div className="text-xs text-red-500 bg-red-50 p-1 rounded">
                          {log.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {polling && (
              <div className="text-center py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                等待流程执行完成...
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
