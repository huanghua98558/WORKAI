'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import ContextVisualizer from './context-visualizer';
import { Play, Code, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface TestResult {
  robotId?: string;
  robotIdSource?: string;
  robotName?: string;
  robotNameSource?: string;
  sessionId?: string;
  messageId?: string;
  userName?: string;
  groupName?: string;
  [key: string]: any;
}

export default function ContextDebugPanel() {
  const [contextInput, setContextInput] = useState(JSON.stringify({
    robotId: 'robot-1',
    robotName: '机器人 1',
    robot: {
      robotId: 'robot-2',
      robotName: '机器人 2'
    },
    sessionId: 'session-123',
    messageId: 'message-456',
    userName: '测试用户',
    groupName: '测试群组',
    message: {
      content: '测试消息内容'
    }
  }, null, 2));

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 预设场景
  const scenarios = [
    {
      name: '场景 1: Context 有 robotId',
      description: '直接在 Context 顶层有 robotId',
      context: {
        robotId: 'robot-1',
        robotName: '机器人 1'
      }
    },
    {
      name: '场景 2: 只有 robot.robotId',
      description: 'robotId 只在 robot 对象中',
      context: {
        robot: {
          robotId: 'robot-1',
          robotName: '机器人 1'
        }
      }
    },
    {
      name: '场景 3: 节点配置有 robotId',
      description: 'robotId 在 data 字段中（模拟节点配置）',
      context: {
        data: {
          robotId: 'robot-1'
        }
      }
    },
    {
      name: '场景 4: 完整的 Context',
      description: '包含所有常用字段的完整 Context',
      context: {
        robotId: 'robot-1',
        robotName: '机器人 1',
        robot: {
          robotId: 'robot-1',
          robotName: '机器人 1',
          userId: 'user-1',
          groupId: 'group-1'
        },
        sessionId: 'session-123',
        messageId: 'message-456',
        userName: '测试用户',
        groupName: '测试群组',
        userId: 'user-1',
        groupId: 'group-1',
        message: {
          content: '测试消息内容',
          messageType: 'text'
        },
        timestamp: new Date().toISOString()
      }
    },
    {
      name: '场景 5: 优先级测试',
      description: '测试 robotId 优先级（robot.robotId 应该被优先使用）',
      context: {
        robotId: 'robot-old',
        robot: {
          robotId: 'robot-new',
          robotName: '新机器人'
        }
      }
    },
    {
      name: '场景 6: 缺少 robotId',
      description: '测试缺少 robotId 的情况',
      context: {
        sessionId: 'session-123',
        messageId: 'message-456',
        userName: '测试用户'
      }
    }
  ];

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const context = JSON.parse(contextInput);
      
      // 调用后端 API 测试 Context
      const response = await fetch('/api/flow-engine/context-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context })
      });

      const result = await response.json();

      if (result.success) {
        setTestResult(result.data);
      } else {
        throw new Error(result.error || '测试失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '测试失败');
    } finally {
      setLoading(false);
    }
  };

  const applyScenario = (scenarioContext: any) => {
    setContextInput(JSON.stringify(scenarioContext, null, 2));
    setError(null);
    setTestResult(null);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(contextInput);
      setContextInput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (err) {
      setError('JSON 格式错误');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="test" className="w-full">
        <TabsList>
          <TabsTrigger value="test">测试</TabsTrigger>
          <TabsTrigger value="scenarios">预设场景</TabsTrigger>
          <TabsTrigger value="help">帮助</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Context 调试</CardTitle>
              <CardDescription>
                测试 ContextHelper 方法，验证 robotId 和其他字段的获取逻辑
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">输入 Context 数据（JSON）</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFormatJson}
                  >
                    <Code className="w-4 h-4 mr-2" />
                    格式化
                  </Button>
                </div>
                <Textarea
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  className="font-mono text-sm min-h-[300px]"
                  placeholder="输入 Context 对象（JSON 格式）"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">错误</p>
                    <p className="text-sm text-destructive/80">{error}</p>
                  </div>
                </div>
              )}

              <Button
                onClick={runTest}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    测试中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    运行测试
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {testResult && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>测试结果</CardTitle>
                  <CardDescription>
                    ContextHelper 方法返回的关键字段
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">robotId</Badge>
                          {testResult.robotIdSource && (
                            <Badge variant="outline" className="text-xs">
                              来源: {testResult.robotIdSource}
                            </Badge>
                          )}
                        </div>
                        <p className="text-lg font-mono font-semibold">
                          {testResult.robotId || <span className="text-muted-foreground">未获取到</span>}
                        </p>
                      </div>

                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">robotName</Badge>
                          {testResult.robotNameSource && (
                            <Badge variant="outline" className="text-xs">
                              来源: {testResult.robotNameSource}
                            </Badge>
                          )}
                        </div>
                        <p className="text-lg font-mono font-semibold">
                          {testResult.robotName || <span className="text-muted-foreground">未获取到</span>}
                        </p>
                      </div>

                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <Badge variant="secondary">sessionId</Badge>
                        <p className="text-lg font-mono font-semibold mt-2">
                          {testResult.sessionId || <span className="text-muted-foreground">未获取到</span>}
                        </p>
                      </div>

                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <Badge variant="secondary">messageId</Badge>
                        <p className="text-lg font-mono font-semibold mt-2">
                          {testResult.messageId || <span className="text-muted-foreground">未获取到</span>}
                        </p>
                      </div>

                      <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                        <Badge variant="secondary">userName</Badge>
                        <p className="text-lg font-mono font-semibold mt-2">
                          {testResult.userName || <span className="text-muted-foreground">未获取到</span>}
                        </p>
                      </div>

                      <div className="p-3 bg-pink-50 border border-pink-200 rounded-lg">
                        <Badge variant="secondary">groupName</Badge>
                        <p className="text-lg font-mono font-semibold mt-2">
                          {testResult.groupName || <span className="text-muted-foreground">未获取到</span>}
                        </p>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div>
                <h3 className="text-sm font-medium mb-2">Context 数据可视化</h3>
                <ContextVisualizer context={JSON.parse(contextInput)} />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="scenarios" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>预设场景</CardTitle>
              <CardDescription>
                点击快速加载测试场景，了解不同数据结构下的 Context 获取行为
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scenarios.map((scenario, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => applyScenario(scenario.context)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{scenario.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {scenario.description}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        加载
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>帮助文档</CardTitle>
              <CardDescription>
                了解 ContextHelper 的工作原理和优先级规则
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  robotId 获取优先级
                </h3>
                <ul className="space-y-1 text-sm text-muted-foreground ml-7">
                  <li>1. <code className="bg-muted px-1 rounded">context.robot.robotId</code> - 最高优先级</li>
                  <li>2. <code className="bg-muted px-1 rounded">context.robotId</code> - 次优先级</li>
                  <li>3. <code className="bg-muted px-1 rounded">context.data.robotId</code> - 节点配置</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  常见问题
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                  <li>
                    <strong>Q: 为什么优先使用 robot.robotId？</strong><br />
                    A: 因为 robot 对象通常是完整的数据源，包含更多相关信息。
                  </li>
                  <li>
                    <strong>Q: 如果 Context 中没有 robotId 怎么办？</strong><br />
                    A: ContextHelper 会返回 undefined，节点应该处理这种情况。
                  </li>
                  <li>
                    <strong>Q: 可以自定义字段获取逻辑吗？</strong><br />
                    A: 可以在节点配置中使用 data 字段提供自定义值。
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  注意事项
                </h3>
                <ul className="space-y-1 text-sm text-muted-foreground ml-7">
                  <li>• Context 数据应该始终保持一致性</li>
                  <li>• 优先使用 robot 对象存储相关信息</li>
                  <li>• 节点配置可以覆盖默认值</li>
                  <li>• 确保所有必要的字段都已正确设置</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
