'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  Activity,
  Settings,
  History,
  RefreshCw,
  Bot,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  ShieldCheck,
  Server,
  Info,
  Zap,
  Calendar,
  Code,
  Link2,
  Edit,
  User,
  Key
} from 'lucide-react';
import { CallbackMonitorPanel } from '@/components/robot/callback-monitor-panel';
import { CallbackConfigPanel } from '@/components/robot/callback-config-panel';
import { CallbackHistoryPanel } from '@/components/robot/callback-history-panel';

interface RobotDetail {
  id: string;
  name: string;
  robotId: string;
  apiBaseUrl: string;
  description?: string;
  isActive: boolean;
  status: 'online' | 'offline' | 'unknown';
  lastCheckAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
  subscriptionType?: string;
  larkAppId?: string;
  eventName?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  robotDetails?: any;
}

export default function RobotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const robotId = params.id as string;
  
  const [robot, setRobot] = useState<RobotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('monitor');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // 获取后端 URL
  const getBackendUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin.replace(':5000', ':5001');
    }
    return 'http://localhost:5001';
  };

  const fetchRobotDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${getBackendUrl()}/api/robots/${robotId}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('获取机器人详情失败');
      }

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(data.message || '获取机器人详情失败');
      }

      setRobot(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      console.error('获取机器人详情失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!robot) return;

    setTestingConnection(true);
    setTestResult(null);

    try {
      // 使用新的测试并保存API
      const response = await fetch(
        `${getBackendUrl()}/api/robots/${robotId}/test-and-save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      setTestResult({
        success: data.code === 0,
        message: data.message || '测试完成',
        robotDetails: data.data?.robot
      });

      // 如果测试成功，重新加载机器人详情以获取最新状态
      if (data.code === 0) {
        await fetchRobotDetail();
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : '测试失败'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  useEffect(() => {
    fetchRobotDetail();
  }, [robotId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-2">
          <Button onClick={fetchRobotDetail} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
        </div>
      </div>
    );
  }

  if (!robot) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Bot className="h-8 w-8" />
                机器人详情
              </h1>
              <Badge variant={robot.isActive ? 'default' : 'secondary'}>
                {robot.isActive ? '已启用' : '已禁用'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Robot ID: {robot.robotId}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={testConnection} 
            disabled={testingConnection}
            variant="default"
          >
            {testingConnection ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                测试中...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                测试连接
              </>
            )}
          </Button>
          <Button onClick={fetchRobotDetail} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 测试结果提示 */}
      {testResult && (
        <Alert variant={testResult.success ? 'default' : 'destructive'} className={testResult.success ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>{testResult.message}</AlertDescription>
        </Alert>
      )}

      {/* 机器人信息卡片 */}
      <Card className="border-2 border-indigo-200 dark:border-indigo-900 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <Avatar className="h-24 w-24 border-4 border-white/30 shadow-lg">
                {robot.avatar ? (
                  <AvatarImage src={robot.avatar} alt={robot.name} />
                ) : null}
                <AvatarFallback className="bg-white/20 text-white text-3xl font-bold">
                  {robot.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold">{robot.name}</h2>
                <Badge 
                  variant={robot.status === 'online' ? 'default' : 'secondary'}
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                >
                  {robot.status === 'online' ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      在线
                    </>
                  ) : robot.status === 'offline' ? (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      离线
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      未知
                    </>
                  )}
                </Badge>
                <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                  {robot.isActive ? '已启用' : '已禁用'}
                </Badge>
              </div>
              
              {robot.description && (
                <p className="text-white/90 mb-3 text-lg">{robot.description}</p>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <span className="font-mono">{robot.robotId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <span className="font-mono text-xs">{robot.apiBaseUrl}</span>
                </div>
                {robot.subscriptionType && (
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span>{robot.subscriptionType}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 详细信息卡片网格 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 基本信息 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              基本信息
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Edit className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">机器人名称</div>
                  <div className="font-medium">{robot.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Robot ID</div>
                  <div className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block">{robot.robotId}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">状态</div>
                  <div className="flex items-center gap-2">
                    {robot.status === 'online' ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">在线</span>
                      </>
                    ) : robot.status === 'offline' ? (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">离线</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">未知</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 时间信息 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              时间信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">创建时间</div>
                  <div className="font-medium text-sm">{formatDate(robot.createdAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">更新时间</div>
                  <div className="font-medium text-sm">{formatDate(robot.updatedAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">最后检查时间</div>
                  <div className="font-medium text-sm">{robot.lastCheckAt ? formatDate(robot.lastCheckAt) : '从未检查'}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API 配置 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Server className="h-4 w-4 text-green-500" />
              API 配置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">API Base URL</div>
                  <div className="font-mono text-xs bg-muted px-2 py-1 rounded break-all">{robot.apiBaseUrl}</div>
                </div>
                {robot.subscriptionType && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">订阅类型</div>
                    <div className="font-medium">{robot.subscriptionType}</div>
                  </div>
                )}
                {robot.larkAppId && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Lark App ID</div>
                    <div className="font-mono text-sm bg-muted px-2 py-1 rounded">{robot.larkAppId}</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 其他配置 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Key className="h-4 w-4 text-orange-500" />
              其他配置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-3">
                {robot.eventName && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Event Name</div>
                    <div className="font-medium">{robot.eventName}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">是否启用</div>
                  <Badge variant={robot.isActive ? 'default' : 'secondary'}>
                    {robot.isActive ? '是' : '否'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 错误信息 */}
      {robot.lastError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>最后错误: {robot.lastError}</AlertDescription>
        </Alert>
      )}

      {/* 回调管理 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            回调监控
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            回调配置
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            回调历史
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitor">
          <CallbackMonitorPanel robotId={robot.id} />
        </TabsContent>

        <TabsContent value="config">
          <CallbackConfigPanel robotId={robot.id} robotName={robot.name} />
        </TabsContent>

        <TabsContent value="history">
          <CallbackHistoryPanel robotId={robot.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
