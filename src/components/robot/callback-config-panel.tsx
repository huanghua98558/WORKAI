'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Settings, RefreshCw, Copy, Link, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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
  const [backendUrl, setBackendUrl] = useState('');

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
      setBackendUrl(getBackendUrl());
      
      // 设置 replyAll 默认值
      if (data.data.callbackConfigList) {
        const messageCallback = data.data.callbackConfigList.find((c: CallbackConfig) => c.callbackType === '11');
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

  // 复制回调URL
  const copyCallbackUrl = async (callbackUrl: string) => {
    try {
      await navigator.clipboard.writeText(callbackUrl);
      toast.success('已复制到剪贴板', {
        description: callbackUrl
      });
    } catch (error) {
      console.error('复制失败:', error);
      toast.error('复制失败');
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
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={fetchConfig}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 回调类型映射
  const callbackTypes = {
    '0': { name: '群二维码', description: '机器人拉群成功后的群二维码', endpoint: '/api/worktool/callback/qrcode' },
    '1': { name: '指令结果', description: '机器人发送指令的执行结果', endpoint: '/api/worktool/callback/action-result' },
    '5': { name: '上线回调', description: '机器人上线时的通知', endpoint: '/api/worktool/callback/robot-online' },
    '6': { name: '下线回调', description: '机器人下线时的通知', endpoint: '/api/worktool/callback/robot-offline' },
    '11': { name: '消息回调', description: '群内有人提问时触发的消息回调', endpoint: '/api/worktool/callback/message' }
  };

  return (
    <div className="space-y-4">
      {/* 后端URL信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            回调基础地址
          </CardTitle>
          <CardDescription>
            WorkTool 机器人将回调请求发送到此地址
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              value={backendUrl}
              readOnly
              placeholder="加载中..."
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(backendUrl);
                toast.success('已复制到剪贴板');
              }}
              disabled={!backendUrl}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {backendUrl && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>回调地址已配置，机器人可以正常接收回调</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 状态提示 */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 回调配置列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>回调配置</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchConfig}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </CardTitle>
          <CardDescription>
            配置 WorkTool 机器人的回调接口，接收各类事件通知
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config?.callbackConfigList?.map((callbackConfig) => {
            const typeInfo = callbackTypes[callbackConfig.callbackType as keyof typeof callbackTypes];
            const fullCallbackUrl = `${backendUrl}${typeInfo?.endpoint}?robotId=${robotId}`;
            
            return (
              <div key={callbackConfig.callbackType} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-medium">{typeInfo?.name}</Label>
                      <Badge variant={callbackConfig.configured ? "default" : "secondary"}>
                        {callbackConfig.configured ? "已配置" : "未配置"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {typeInfo?.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCallbackUrl(fullCallbackUrl)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      复制
                    </Button>
                    {callbackConfig.configured ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCallback(callbackConfig.callbackType)}
                        disabled={configuring === callbackConfig.callbackType}
                      >
                        {configuring === callbackConfig.callbackType ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        删除
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleConfigureCallback(callbackConfig.callbackType)}
                        disabled={configuring === callbackConfig.callbackType}
                      >
                        {configuring === callbackConfig.callbackType ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Settings className="h-4 w-4 mr-2" />
                        )}
                        配置
                      </Button>
                    )}
                  </div>
                </div>

                {/* 回调URL */}
                {callbackConfig.configured && callbackConfig.callbackUrl && (
                  <div className="bg-muted p-3 rounded-md">
                    <div className="text-xs font-medium mb-1">回调地址：</div>
                    <div className="font-mono text-xs break-all">
                      {callbackConfig.callbackUrl}
                    </div>
                  </div>
                )}

                {/* 消息回调的 replyAll 配置 */}
                {callbackConfig.callbackType === '11' && (
                  <div className="pt-2">
                    <Label htmlFor="replyAll">回复模式</Label>
                    <select
                      id="replyAll"
                      value={replyAll}
                      onChange={(e) => setReplyAll(e.target.value)}
                      className="mt-1 w-full p-2 border rounded-md"
                      disabled={configuring === '11'}
                    >
                      <option value="0">仅回复提问者</option>
                      <option value="1">回复所有人</option>
                    </select>
                    {callbackConfig.configured && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleConfigureCallback('11')}
                        disabled={configuring === '11'}
                      >
                        {configuring === '11' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Settings className="h-4 w-4 mr-2" />
                        )}
                        更新配置
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 提示信息 */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="space-y-1 text-sm">
              <div className="font-medium text-amber-900">配置提示</div>
              <div className="text-amber-800 space-y-1">
                <p>• 机器人上线回调地址: {backendUrl}/api/worktool/callback/robot-online?robotId={robotId}</p>
                <p>• 机器人下线回调地址: {backendUrl}/api/worktool/callback/robot-offline?robotId={robotId}</p>
                <p>• 配置后需要等待 WorkTool 平台同步更新，可能需要几分钟时间</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
