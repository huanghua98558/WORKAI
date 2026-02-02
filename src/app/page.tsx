'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { 
  BarChart3, 
  MessageSquare, 
  Settings, 
  Activity, 
  AlertTriangle, 
  FileText,
  Bot,
  Zap,
  Copy,
  Check,
  Play,
  RefreshCw,
  TrendingUp,
  Users,
  Shield,
  Database
} from 'lucide-react';

// 类型定义
interface CallbackUrl {
  message: string;
  actionResult: string;
  groupQrcode: string;
  robotStatus: string;
}

interface MonitorData {
  totalCallbacks: number;
  successRate: string;
  aiSuccessRate: string;
}

interface AlertData {
  total: number;
  byLevel: {
    critical: number;
    warning: number;
    info: number;
  };
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [callbacks, setCallbacks] = useState<CallbackUrl | null>(null);
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null);
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [copiedCallback, setCopiedCallback] = useState<string | null>(null);
  const [testingCallback, setTestingCallback] = useState<string | null>(null);

  // 加载数据
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 每30秒刷新一次
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [callbacksRes, monitorRes, alertRes] = await Promise.all([
        fetch('/api/admin/callbacks'),
        fetch('/api/admin/monitor/summary'),
        fetch('/api/admin/alerts/stats')
      ]);

      if (callbacksRes.ok) {
        const data = await callbacksRes.json();
        setCallbacks(data.data.callbacks);
      }

      if (monitorRes.ok) {
        const data = await monitorRes.json();
        setMonitorData(data.data.summary);
      }

      if (alertRes.ok) {
        const data = await alertRes.json();
        setAlertData(data.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  // 复制回调地址
  const copyCallback = async (type: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedCallback(type);
    setTimeout(() => setCopiedCallback(null), 2000);
  };

  // 复制所有回调地址
  const copyAllCallbacks = async () => {
    if (!callbacks) return;
    
    const allUrls = `消息回调: ${callbacks.message}\n执行结果回调: ${callbacks.actionResult}\n群二维码回调: ${callbacks.groupQrcode}\n机器人状态回调: ${callbacks.robotStatus}`;
    await navigator.clipboard.writeText(allUrls);
    setCopiedCallback('all');
    setTimeout(() => setCopiedCallback(null), 2000);
  };

  // 测试回调
  const testCallback = async (type: string) => {
    setTestingCallback(type);
    try {
      const res = await fetch('/api/admin/callbacks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ ${type} 回调测试成功`);
      } else {
        alert(`❌ ${type} 回调测试失败: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ ${type} 回调测试失败: ${error}`);
    } finally {
      setTestingCallback(null);
    }
  };

  // 回调配置中心组件
  const CallbackCenter = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">回调对接中心</h3>
          <p className="text-sm text-muted-foreground">
            配置 WorkTool 回调地址，支持自动生成、一键复制、实时测试
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            统一回调地址
          </CardTitle>
          <CardDescription>
            这些地址需要配置到 WorkTool 平台的回调设置中
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {callbacks && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <div className="flex-1">
                    <label className="text-sm font-medium">消息回调地址</label>
                    <div className="flex gap-2 mt-1">
                      <Input value={callbacks.message} readOnly className="font-mono text-xs" />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyCallback('message', callbacks.message)}
                      >
                        {copiedCallback === 'message' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => testCallback('message')}
                        disabled={testingCallback === 'message'}
                      >
                        {testingCallback === 'message' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <label className="text-sm font-medium">执行结果回调地址</label>
                    <div className="flex gap-2 mt-1">
                      <Input value={callbacks.actionResult} readOnly className="font-mono text-xs" />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyCallback('actionResult', callbacks.actionResult)}
                      >
                        {copiedCallback === 'actionResult' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => testCallback('actionResult')}
                        disabled={testingCallback === 'actionResult'}
                      >
                        {testingCallback === 'actionResult' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Bot className="h-4 w-4 text-purple-500" />
                  <div className="flex-1">
                    <label className="text-sm font-medium">群二维码回调地址</label>
                    <div className="flex gap-2 mt-1">
                      <Input value={callbacks.groupQrcode} readOnly className="font-mono text-xs" />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyCallback('groupQrcode', callbacks.groupQrcode)}
                      >
                        {copiedCallback === 'groupQrcode' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-orange-500" />
                  <div className="flex-1">
                    <label className="text-sm font-medium">机器人状态回调地址</label>
                    <div className="flex gap-2 mt-1">
                      <Input value={callbacks.robotStatus} readOnly className="font-mono text-xs" />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyCallback('robotStatus', callbacks.robotStatus)}
                      >
                        {copiedCallback === 'robotStatus' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => testCallback('robot_status')}
                        disabled={testingCallback === 'robot_status'}
                      >
                        {testingCallback === 'robot_status' ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={copyAllCallbacks}
                  className="w-full"
                  variant="default"
                >
                  {copiedCallback === 'all' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      已复制所有回调地址
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      复制所有回调地址
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // 仪表盘组件
  const OverviewTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">系统概览</h3>
        <p className="text-sm text-muted-foreground">实时监控系统运行状态</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总回调数</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitorData?.totalCallbacks || 0}</div>
            <p className="text-xs text-muted-foreground">今日累计</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitorData?.successRate || '0%'}</div>
            <p className="text-xs text-muted-foreground">回调处理成功率</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI 成功率</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitorData?.aiSuccessRate || '0%'}</div>
            <p className="text-xs text-muted-foreground">AI 响应成功率</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">告警数</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">近 7 天告警</p>
          </CardContent>
        </Card>
      </div>

      {alertData && alertData.total > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>系统告警</AlertTitle>
          <AlertDescription>
            近 7 天共有 <Badge variant="destructive">{alertData.total}</Badge> 个告警，
            其中 {alertData.byLevel.critical} 个严重、{alertData.byLevel.warning} 个警告
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  // 系统设置组件
  const SettingsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">系统设置</h3>
        <p className="text-sm text-muted-foreground">配置系统运行参数</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>自动回复策略</CardTitle>
          <CardDescription>配置 AI 自动回复行为</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">闲聊模式</label>
              <p className="text-xs text-muted-foreground">控制闲聊消息的回复方式</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">AI</Badge>
              <Switch defaultChecked />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">服务回复</label>
              <p className="text-xs text-muted-foreground">自动回复服务类问题</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">自动</Badge>
              <Switch defaultChecked />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">风险处理</label>
              <p className="text-xs text-muted-foreground">检测到风险内容时自动转人工</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">人工</Badge>
              <Switch defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>监控与告警</CardTitle>
          <CardDescription>配置系统监控和预警规则</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">机器人掉线告警</label>
              <p className="text-xs text-muted-foreground">机器人掉线时发送告警</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">错误率告警</label>
              <p className="text-xs text-muted-foreground">错误率超过阈值时告警</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">垃圾信息检测</label>
              <p className="text-xs text-muted-foreground">检测到垃圾信息时告警</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">WorkTool AI 中枢系统</h1>
                <p className="text-sm text-muted-foreground">企业微信社群智能运营平台</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                运行中
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              仪表盘
            </TabsTrigger>
            <TabsTrigger value="callbacks">
              <Zap className="h-4 w-4 mr-2" />
              回调中心
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <Users className="h-4 w-4 mr-2" />
              会话管理
            </TabsTrigger>
            <TabsTrigger value="monitor">
              <Activity className="h-4 w-4 mr-2" />
              监控告警
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="h-4 w-4 mr-2" />
              报告中心
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              系统设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="callbacks" className="space-y-6">
            <CallbackCenter />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>会话管理</CardTitle>
                <CardDescription>查看和管理活跃会话</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">会话列表加载中...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitor" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>监控与告警</CardTitle>
                <CardDescription>系统监控指标和告警历史</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">监控数据加载中...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>报告中心</CardTitle>
                <CardDescription>查看日终报告和导出数据</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">报告列表加载中...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
