'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  ShieldCheck
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
}

export default function RobotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const robotId = params.id as string;
  
  const [robot, setRobot] = useState<RobotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('monitor');

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
                {robot.name}
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
        <Button onClick={fetchRobotDetail} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* 机器人基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">机器人名称</div>
              <div className="font-medium">{robot.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Robot ID</div>
              <div className="font-mono text-sm">{robot.robotId}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">API 地址</div>
              <div className="font-mono text-sm break-all">{robot.apiBaseUrl}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">状态</div>
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
            <div>
              <div className="text-sm text-muted-foreground">创建时间</div>
              <div className="font-medium">{formatDate(robot.createdAt)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">最后检查</div>
              <div className="font-medium">{robot.lastCheckAt ? formatDate(robot.lastCheckAt) : '从未检查'}</div>
            </div>
            {robot.description && (
              <div className="md:col-span-2">
                <div className="text-sm text-muted-foreground">描述</div>
                <div className="font-medium">{robot.description}</div>
              </div>
            )}
          </div>

          {robot.lastError && (
            <Alert variant="destructive" className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>最后错误: {robot.lastError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

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
