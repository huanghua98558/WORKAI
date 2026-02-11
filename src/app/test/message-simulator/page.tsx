'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

// 消息类型定义
type MessageType = 'user' | 'staff' | 'operation' | 'robot';

// 测试结果接口
interface TestResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  timestamp: string;
}

export default function MessageSimulator() {
  // 消息参数
  const [robotId, setRobotId] = useState('robot_001');
  const [messageType, setMessageType] = useState<MessageType>('user');
  const [senderId, setSenderId] = useState('test_user_001');
  const [senderName, setSenderName] = useState('测试用户');
  const [content, setContent] = useState('你好，我想咨询产品功能');
  const [imageUrl, setImageUrl] = useState('');
  const [groupId, setGroupId] = useState('test_group_001');
  const [groupName, setGroupName] = useState('测试社群');

  // 工作人员相关参数
  const [staffType, setStaffType] = useState('客服专员');
  const [priority, setPriority] = useState('normal');

  // 运营相关参数
  const [operationType, setOperationType] = useState('公告');
  const [targetUserCount, setTargetUserCount] = useState(0);

  // 测试结果
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  // 预设测试场景
  const testScenarios = [
    {
      name: '用户普通咨询',
      messageType: 'user' as MessageType,
      content: '你好，我想了解一下产品的价格',
      senderId: 'user_001',
      senderName: '张三',
    },
    {
      name: '用户紧急求助',
      messageType: 'user' as MessageType,
      content: '我遇到了紧急问题，请立即处理！',
      senderId: 'user_002',
      senderName: '李四',
    },
    {
      name: '工作人员回复',
      messageType: 'staff' as MessageType,
      content: '您好，我们已经收到您的问题，正在为您处理',
      senderId: 'staff_001',
      senderName: '王客服',
      staffType: '客服专员',
    },
    {
      name: '运营发布公告',
      messageType: 'operation' as MessageType,
      content: '各位用户请注意，系统将于今晚进行维护升级',
      senderId: 'operation_001',
      senderName: '运营小助手',
      operationType: '公告',
    },
    {
      name: '用户发送图片',
      messageType: 'user' as MessageType,
      content: '请帮我识别这张图片',
      senderId: 'user_003',
      senderName: '赵五',
      imageUrl: 'https://example.com/test-image.jpg',
    },
    {
      name: '协同分析请求',
      messageType: 'staff' as MessageType,
      content: '需要协助分析用户投诉问题',
      senderId: 'staff_002',
      senderName: '刘经理',
      staffType: '主管',
    },
  ];

  // 发送测试消息
  const sendTestMessage = async (scenario?: typeof testScenarios[0]) => {
    const testPayload = scenario || {
      messageType,
      senderId,
      senderName,
      content,
      imageUrl,
      staffType,
      operationType,
      priority,
    };

    setIsTesting(true);

    try {
      // 确定触发类型
      const triggerType = testPayload.messageType === 'operation' ? 'operation_message' :
                          testPayload.messageType === 'staff' ? 'staff_message' :
                          testPayload.messageType === 'robot' ? 'webhook_message' :
                          'user_message';

      const response = await fetch('/api/flow-engine/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          robotId,
          content: testPayload.content,
          senderId: testPayload.senderId,
          senderName: testPayload.senderName,
          senderType: testPayload.messageType,
          imageUrl: testPayload.imageUrl,
          groupId,
          groupName,
          triggerType,
          // 额外参数
          staffType: testPayload.staffType,
          operationType: testPayload.operationType,
          priority: testPayload.priority,
        }),
      });

      const result = await response.json();

      const testResult: TestResult = {
        success: result.success,
        message: result.message,
        data: result.data,
        error: result.error,
        timestamp: new Date().toISOString(),
      };

      setTestResults(prev => [testResult, ...prev].slice(0, 10)); // 只保留最近10条
    } catch (error: any) {
      setTestResults(prev => [{
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 10));
    } finally {
      setIsTesting(false);
    }
  };

  // 快速测试 - 执行所有预设场景
  const runAllTests = async () => {
    for (const scenario of testScenarios) {
      await sendTestMessage(scenario);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 间隔1秒
    }
  };

  // 清空测试结果
  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">消息模拟测试工具</h1>
        <p className="text-muted-foreground mt-2">
          模拟发送不同类型的消息，测试统一消息处理流程
        </p>
      </div>

      <Tabs defaultValue="quick-test" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quick-test">快速测试</TabsTrigger>
          <TabsTrigger value="custom">自定义消息</TabsTrigger>
          <TabsTrigger value="results">测试结果</TabsTrigger>
        </TabsList>

        {/* 快速测试标签页 */}
        <TabsContent value="quick-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>预设测试场景</CardTitle>
              <CardDescription>点击下方按钮快速执行预设的测试场景</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {testScenarios.map((scenario, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{scenario.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {scenario.content.substring(0, 50)}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">{scenario.messageType}</Badge>
                        {scenario.staffType && (
                          <Badge variant="outline">{scenario.staffType}</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => sendTestMessage(scenario)}
                      disabled={isTesting}
                      variant="outline"
                      size="sm"
                    >
                      测试
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={runAllTests}
                  disabled={isTesting}
                  className="flex-1"
                >
                  {isTesting ? '测试中...' : '运行全部测试'}
                </Button>
                <Button
                  onClick={clearResults}
                  variant="outline"
                  disabled={testResults.length === 0}
                >
                  清空结果
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 自定义消息标签页 */}
        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>自定义消息参数</CardTitle>
              <CardDescription>设置消息参数并发送测试</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="robotId">机器人ID</Label>
                  <Input
                    id="robotId"
                    value={robotId}
                    onChange={(e) => setRobotId(e.target.value)}
                    placeholder="robot_001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="messageType">消息类型</Label>
                  <Select value={messageType} onValueChange={(v: any) => setMessageType(v)}>
                    <SelectTrigger id="messageType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">用户消息</SelectItem>
                      <SelectItem value="staff">工作人员消息</SelectItem>
                      <SelectItem value="operation">运营消息</SelectItem>
                      <SelectItem value="robot">机器人消息</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senderId">发送者ID</Label>
                  <Input
                    id="senderId"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    placeholder="sender_id"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senderName">发送者名称</Label>
                  <Input
                    id="senderName"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="发送者名称"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupId">群组ID</Label>
                  <Input
                    id="groupId"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    placeholder="group_id"
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

                {messageType === 'staff' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="staffType">工作人员类型</Label>
                      <Select value={staffType} onValueChange={setStaffType}>
                        <SelectTrigger id="staffType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="客服专员">客服专员</SelectItem>
                          <SelectItem value="主管">主管</SelectItem>
                          <SelectItem value="专家">专家</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">优先级</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger id="priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">低</SelectItem>
                          <SelectItem value="normal">普通</SelectItem>
                          <SelectItem value="high">高</SelectItem>
                          <SelectItem value="urgent">紧急</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {messageType === 'operation' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="operationType">运营类型</Label>
                      <Select value={operationType} onValueChange={setOperationType}>
                        <SelectTrigger id="operationType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="公告">公告</SelectItem>
                          <SelectItem value="活动">活动</SelectItem>
                          <SelectItem value="通知">通知</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="targetUserCount">目标用户数</Label>
                      <Input
                        id="targetUserCount"
                        type="number"
                        value={targetUserCount}
                        onChange={(e) => setTargetUserCount(parseInt(e.target.value))}
                        placeholder="0"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">消息内容</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="请输入消息内容..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">图片URL（可选）</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <Button
                onClick={() => sendTestMessage()}
                disabled={isTesting}
                className="w-full"
              >
                {isTesting ? '发送中...' : '发送测试消息'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 测试结果标签页 */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>测试结果</CardTitle>
              <CardDescription>最近10条测试消息的执行结果</CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  暂无测试结果，请先发送测试消息
                </div>
              ) : (
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <Alert key={index} variant={result.success ? 'default' : 'destructive'}>
                      <AlertTitle className="flex items-center justify-between">
                        <span>
                          {result.success ? '✓ 测试成功' : '✗ 测试失败'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </AlertTitle>
                      <AlertDescription className="mt-2">
                        {result.error ? (
                          <div className="text-red-600">{result.error}</div>
                        ) : (
                          <div className="space-y-2">
                            <div>{result.message}</div>
                            {result.data && (
                              <details className="text-sm">
                                <summary className="cursor-pointer text-muted-foreground">
                                  查看详细信息
                                </summary>
                                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                                  {JSON.stringify(result.data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
