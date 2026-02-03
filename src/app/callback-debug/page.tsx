'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Send, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface TestResponse {
  code: number;
  message: string;
  data?: any;
}

export default function CallbackDebugPage() {
  const [robotId, setRobotId] = useState('wt22phhjpt2xboerspxsote472xdnyq2');
  const [spoken, setSpoken] = useState('测试消息：你好');
  const [receivedName, setReceivedName] = useState('测试用户');
  const [groupName, setGroupName] = useState('测试群组');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<TestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testMessageCallback = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);

    try {
      const res = await fetch('/api/worktool/callback/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spoken,
          rawSpoken: spoken,
          receivedName,
          groupName,
          groupRemark: groupName,
          roomType: 3,
          atMe: true,
          textType: 1,
        }),
      });

      const data = await res.json();
      setResponse(data);

      if (res.ok && data.code === 0) {
        console.log('✅ 回调测试成功:', data);
      } else {
        console.error('❌ 回调测试失败:', data);
      }
    } catch (err: any) {
      setError(err.message || '网络错误');
      console.error('❌ 回调测试异常:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRobotInfo = async () => {
    try {
      const res = await fetch(`/api/proxy/admin/robots/check-status/${robotId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (res.ok && data.code === 0) {
        const robot = data.data?.robot;
        if (robot) {
          console.log('✅ 机器人信息加载成功:', robot);
        }
      } else {
        console.error('❌ 机器人信息加载失败:', data);
      }
    } catch (err: any) {
      console.error('❌ 机器人信息加载异常:', err);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">消息回调调试工具</h1>
        <p className="text-muted-foreground">
          测试和调试 WorkTool 消息回调功能
        </p>
      </div>

      <div className="space-y-6">
        {/* 回调地址 */}
        <Card>
          <CardHeader>
            <CardTitle>回调地址</CardTitle>
            <CardDescription>
              WorkTool 配置的回调地址
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value={`https://n2hsd37kxc.coze.site/api/worktool/callback/message?robotId=${robotId}`}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={() => {
                navigator.clipboard.writeText(`https://n2hsd37kxc.coze.site/api/worktool/callback/message?robotId=${robotId}`);
              }}>
                📋
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 测试参数 */}
        <Card>
          <CardHeader>
            <CardTitle>测试参数</CardTitle>
            <CardDescription>
              配置测试消息的参数
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="robotId">机器人 ID</Label>
              <Input
                id="robotId"
                value={robotId}
                onChange={(e) => setRobotId(e.target.value)}
                placeholder="输入机器人 ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spoken">消息内容</Label>
              <Textarea
                id="spoken"
                value={spoken}
                onChange={(e) => setSpoken(e.target.value)}
                placeholder="输入测试消息"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receivedName">发送者名称</Label>
                <Input
                  id="receivedName"
                  value={receivedName}
                  onChange={(e) => setReceivedName(e.target.value)}
                  placeholder="发送者名称"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupName">群组名称</Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="群组名称"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={testMessageCallback}
                disabled={loading || !robotId || !spoken}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    发送中...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    发送测试消息
                  </>
                )}
              </Button>

              <Button
                onClick={loadRobotInfo}
                variant="outline"
                disabled={!robotId}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                加载机器人信息
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 响应结果 */}
        {(response || error) && (
          <Card>
            <CardHeader>
              <CardTitle>响应结果</CardTitle>
              <CardDescription>
                回调请求的响应结果
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-semibold text-red-900">请求失败</div>
                    <div className="text-sm text-red-700 mt-1">{error}</div>
                  </div>
                </div>
              )}

              {response && (
                <>
                  {response.code === 0 ? (
                    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-green-900">回调成功</div>
                        <div className="text-sm text-green-700 mt-1">{response.message}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-red-900">回调失败</div>
                        <div className="text-sm text-red-700 mt-1">
                          Code: {response.code}, Message: {response.message}
                        </div>
                      </div>
                    </div>
                  )}

                  {response.data && (
                    <div className="mt-4">
                      <Label>响应数据</Label>
                      <pre className="mt-2 p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-xs">
                        {JSON.stringify(response.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. 在 WorkTool 后台配置回调地址，格式如下：</p>
            <code className="block p-2 bg-slate-100 rounded text-xs">
              https://n2hsd37kxc.coze.site/api/worktool/callback/message?robotId={你的机器人ID}
            </code>
            <p className="mt-4">2. 在本页面输入机器人 ID 和测试消息</p>
            <p>3. 点击"发送测试消息"按钮模拟 WorkTool 回调</p>
            <p>4. 查看响应结果和日志（F12 打开开发者工具）</p>
            <p className="mt-4 text-orange-600 font-medium">
              注意：真实回调需要从 WorkTool 服务器发起，本工具仅用于测试和调试
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
