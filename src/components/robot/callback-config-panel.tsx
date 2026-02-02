'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Settings, RefreshCw } from 'lucide-react';

interface CallbackConfig {
  callbackType: string;
  callbackTypeName: string;
  callbackUrl: string | null;
  configured: boolean;
}

interface CallbackConfigData {
  robotId: string;
  robotName: string;
  callbackConfigList: CallbackConfig[];
}

interface CallbackConfigPanelProps {
  robotId: string;
  robotName: string;
}

export function CallbackConfigPanel({ robotId, robotName }: CallbackConfigPanelProps) {
  const [config, setConfig] = useState<CallbackConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [replyAll, setReplyAll] = useState('1');

  // 获取后端 URL
  const getBackendUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin.replace(':5000', ':5001');
    }
    return 'http://localhost:5001';
  };

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${getBackendUrl()}/api/robots/${robotId}/callback-config`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('获取回调配置失败');
      }

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(data.message || '获取回调配置失败');
      }

      setConfig(data.data);
      
      // 设置 replyAll 默认值
      if (data.data.callbackConfigList) {
        const messageCallback = data.data.callbackConfigList.find(c => c.callbackType === '11');
        if (messageCallback && messageCallback.configured) {
          // 从 URL 中解析 replyAll 参数（如果有）
          const urlParams = new URLSearchParams(messageCallback.callbackUrl?.split('?')[1]);
          const replyAllParam = urlParams.get('replyAll');
          if (replyAllParam) {
            setReplyAll(replyAllParam);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      console.error('获取回调配置失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [robotId]);

  const handleConfigureCallback = async (callbackType: string) => {
    setConfiguring(callbackType);
    setError(null);
    setSuccess(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // 传递后端 URL
      headers['x-backend-url'] = getBackendUrl();

      const endpoint = callbackType === '11' 
        ? `${getBackendUrl()}/api/robots/${robotId}/config-callback`
        : `${getBackendUrl()}/api/robots/${robotId}/config-callback-type`;

      const body = callbackType === '11'
        ? { replyAll }
        : { callbackType };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('配置回调失败');
      }

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(data.message || '配置回调失败');
      }

      setSuccess('回调配置成功');
      await fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      console.error('配置回调失败:', err);
    } finally {
      setConfiguring(null);
    }
  };

  const handleDeleteCallback = async (callbackType: string) => {
    if (!confirm('确定要删除此回调配置吗？')) {
      return;
    }

    setConfiguring(callbackType);
    setError(null);
    setSuccess(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      headers['x-backend-url'] = getBackendUrl();

      const response = await fetch(
        `${getBackendUrl()}/api/robots/${robotId}/delete-callback-type`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ callbackType })
        }
      );

      if (!response.ok) {
        throw new Error('删除回调配置失败');
      }

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(data.message || '删除回调配置失败');
      }

      setSuccess('回调配置删除成功');
      await fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      console.error('删除回调配置失败:', err);
    } finally {
      setConfiguring(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>回调配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>回调配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-destructive">{error}</div>
            <Button onClick={fetchConfig} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>回调配置</CardTitle>
              <CardDescription>配置 WorkTool 回调地址</CardDescription>
            </div>
            <Button onClick={fetchConfig} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4" variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4" variant="default">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* 机器人信息 */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="text-sm">
              <div className="font-medium mb-1">机器人: {config.robotName}</div>
              <div className="text-muted-foreground">Robot ID: {config.robotId}</div>
            </div>
          </div>

          <div className="space-y-6">
            {config.callbackConfigList.map((item) => (
              <Card key={item.callbackType}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{item.callbackTypeName}</CardTitle>
                      <Badge variant={item.configured ? 'default' : 'secondary'}>
                        {item.configured ? '已配置' : '未配置'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.configured && item.callbackUrl && (
                    <div className="mb-4">
                      <Label>回调地址</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md text-sm font-mono break-all">
                        {item.callbackUrl}
                      </div>
                    </div>
                  )}

                  {/* 消息回调特殊选项 */}
                  {item.callbackType === '11' && item.configured && (
                    <div className="mb-4 space-y-2">
                      <Label>回复模式</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={replyAll === '1'}
                          onCheckedChange={(checked) => setReplyAll(checked ? '1' : '0')}
                        />
                        <span className="text-sm text-muted-foreground">
                          {replyAll === '1' ? '回复所有人' : '只回复机器人'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {!item.configured ? (
                      <Button
                        onClick={() => handleConfigureCallback(item.callbackType)}
                        disabled={configuring === item.callbackType}
                      >
                        {configuring === item.callbackType ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            配置中...
                          </>
                        ) : (
                          '配置回调'
                        )}
                      </Button>
                    ) : (
                      <>
                        {item.callbackType === '11' && (
                          <Button
                            onClick={() => handleConfigureCallback(item.callbackType)}
                            disabled={configuring === item.callbackType}
                            variant="outline"
                          >
                            {configuring === item.callbackType ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                更新中...
                              </>
                            ) : (
                              '更新配置'
                            )}
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDeleteCallback(item.callbackType)}
                          disabled={configuring === item.callbackType}
                          variant="destructive"
                        >
                          {configuring === item.callbackType ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              删除中...
                            </>
                          ) : (
                            '删除配置'
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
