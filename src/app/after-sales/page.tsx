'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAfterSalesSSE } from '@/hooks/useAfterSalesSSE';
import {
  Headphones,
  TrendingUp,
  Users,
  MessageSquare,
  RefreshCw,
  Download,
  BarChart3,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Bell,
  BellOff
} from 'lucide-react';

// 懒加载组件
import SatisfactionAnalysisCard from '@/components/satisfaction-analysis-card';
import AfterSalesTaskOptimized from '@/components/after-sales-task-optimized';
import StaffMonitoringDashboard from '@/components/staff-monitoring-dashboard';

export default function AfterSalesDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [showNotifications, setShowNotifications] = useState(false);

  // SSE连接 - 监听售后相关消息
  const { connected, notifications, clearNotifications } = useAfterSalesSSE({
    onTaskCreated: (data) => {
      console.log('[售后SSE] 新任务创建:', data);
      setRefreshKey(prev => prev + 1);
    },
    onTaskUpdated: (data) => {
      console.log('[售后SSE] 任务更新:', data);
      setRefreshKey(prev => prev + 1);
    },
    onSatisfactionUpdated: (data) => {
      console.log('[售后SSE] 满意度更新:', data);
      setRefreshKey(prev => prev + 1);
    },
    onStaffActivity: (data) => {
      console.log('[售后SSE] 工作人员活动:', data);
      setRefreshKey(prev => prev + 1);
    },
    onConnected: () => {
      console.log('[售后页面] SSE连接成功');
    },
    onError: (error) => {
      console.error('[售后页面] SSE连接错误:', error);
    },
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = async () => {
    try {
      // 导出所有数据
      const [satisfactionRes, tasksRes] = await Promise.all([
        fetch(`/api/collab/satisfaction/analyze?timeRange=${timeRange}`),
        fetch(`/api/collab/after-sales-tasks?limit=1000`)
      ]);

      const [satisfactionData, tasksData] = await Promise.all([
        satisfactionRes.json(),
        tasksRes.json()
      ]);

      // 创建导出数据
      const exportData = {
        exportedAt: new Date().toISOString(),
        timeRange,
        satisfaction: satisfactionData.data,
        tasks: tasksData.data
      };

      // 下载文件
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `after-sales-export-${timeRange}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出数据失败:', error);
      alert('导出数据失败，请稍后重试');
    }
  };

  // 将SSE通知转换为显示格式
  const notificationList = notifications.map(notif => {
    const time = new Date(notif.timestamp).toLocaleTimeString('zh-CN');
    let message = '';

    switch (notif.type) {
      case 'task_created':
        message = `新任务创建: ${notif.data.taskId || '未知'} - ${notif.data.title || '无标题'}`;
        break;
      case 'task_updated':
        message = `任务更新: ${notif.data.taskId || '未知'} - ${notif.data.status || '未知状态'}`;
        break;
      case 'satisfaction_updated':
        message = `满意度更新: ${notif.data.score || '未知'}`;
        break;
      case 'staff_activity':
        message = `工作人员活动: ${notif.data.staffName || '未知工作人员'}`;
        break;
      default:
        message = `未知通知: ${JSON.stringify(notif.data)}`;
    }

    return { time, message, type: notif.type };
  });

  return (
    <div className="space-y-6" key={refreshKey}>
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Headphones className="w-8 h-8 text-green-600" />
            售后管理中心
            {connected ? (
              <Badge className="bg-green-100 text-green-800">
                <Bell className="w-3 h-3 mr-1" />
                实时
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                <BellOff className="w-3 h-3 mr-1" />
                离线
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            用户满意度分析、工作人员监控、售后任务管理
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">最近1小时</SelectItem>
              <SelectItem value="24h">最近24小时</SelectItem>
              <SelectItem value="7d">最近7天</SelectItem>
              <SelectItem value="30d">最近30天</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            title="刷新数据"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            title="导出数据"
          >
            <Download className="w-4 h-4 mr-2" />
            导出数据
          </Button>
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              title="实时通知"
            >
              <Bell className="w-4 h-4" />
              {notificationList.length > 0 && (
                <Badge className="absolute -top-1 -right-1 px-1.5 py-0 text-xs min-w-[18px] h-[18px] flex items-center justify-center bg-red-500">
                  {notificationList.length}
                </Badge>
              )}
            </Button>
            {/* 通知面板 */}
            {showNotifications && notificationList.length > 0 && (
              <div className="absolute right-0 top-10 w-80 bg-background border rounded-lg shadow-lg p-4 z-50 max-h-[400px] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">实时通知</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearNotifications()}
                    className="text-xs"
                  >
                    清空
                  </Button>
                </div>
                <div className="space-y-2">
                  {notificationList.map((notification, index) => (
                    <div
                      key={index}
                      className="text-xs p-2 bg-muted rounded flex items-start gap-2"
                    >
                      <span className="text-muted-foreground">{notification.time}</span>
                      <span className="flex-1">{notification.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">平均满意度</CardDescription>
            <CardTitle className="text-2xl text-blue-700 dark:text-blue-300">
              <TrendingUp className="inline w-5 h-5 mr-1" />
              85.6
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">任务完成率</CardDescription>
            <CardTitle className="text-2xl text-green-700 dark:text-green-300">
              <CheckCircle className="inline w-5 h-5 mr-1" />
              92.3%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">活跃工作人员</CardDescription>
            <CardTitle className="text-2xl text-purple-700 dark:text-purple-300">
              <Users className="inline w-5 h-5 mr-1" />
              12
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">待处理任务</CardDescription>
            <CardTitle className="text-2xl text-orange-700 dark:text-orange-300">
              <AlertTriangle className="inline w-5 h-5 mr-1" />
              8
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="satisfaction" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            满意度分析
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="w-4 h-4" />
            工作人员监控
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <Activity className="w-4 h-4" />
            售后任务
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SatisfactionAnalysisCard />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-500" />
                  实时活动
                </CardTitle>
                <CardDescription>
                  售后相关的实时活动和通知
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <Zap className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <div className="font-medium">新任务创建</div>
                      <div className="text-sm text-muted-foreground">
                        用户反馈产品问题，自动创建售后任务
                      </div>
                    </div>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">2分钟前</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div className="flex-1">
                      <div className="font-medium">任务完成</div>
                      <div className="text-sm text-muted-foreground">
                        工作人员张三完成了售后任务 #1234
                      </div>
                    </div>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">15分钟前</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <div className="flex-1">
                      <div className="font-medium">满意度下降</div>
                      <div className="text-sm text-muted-foreground">
                        最近1小时用户满意度下降了5%
                      </div>
                    </div>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">30分钟前</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="satisfaction" className="space-y-4">
          <SatisfactionAnalysisCard />
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <StaffMonitoringDashboard />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <AfterSalesTaskOptimized />
        </TabsContent>
      </Tabs>
    </div>
  );
}
