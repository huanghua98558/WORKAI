'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Bot, 
  Clock, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  Zap,
  Shield,
  MessageSquare,
  Command,
  Cpu,
  AlertTriangle
} from 'lucide-react';

interface MonitoringData {
  robots: RobotMonitor[];
  stats: {
    totalRobots: number;
    activeRobots: number;
    totalSessions: number;
    activeSessions: number;
    totalCommands: number;
    avgHealthScore: number;
    avgSuccessRate: number;
    overallUtilization: number;
  };
  timeRange: {
    start: string;
    end: string;
  };
}

interface RobotMonitor {
  robot_id: string;
  robot_name: string;
  group_name?: string;
  is_active: boolean;
  robot_status: string;
  health_score: number;
  success_rate: number;
  current_sessions: number;
  max_sessions: number;
  avg_response_time: number;
  utilization_rate: number;
  health_level: string;
  sessionStats: {
    total: number;
    active: number;
    completed: number;
    failed: number;
    avgDuration: number;
  };
  commandStats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    avgProcessing: number;
  };
  topErrors: Array<{
    error_type: string;
    error_count: number;
  }>;
}

export default function MonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 加载监控数据
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/robot-monitoring?period=${period}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('加载监控数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 10000); // 10秒刷新一次
      return () => clearInterval(interval);
    }
  }, [period, autoRefresh]);

  // 获取健康状态颜色
  const getHealthColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // 获取健康状态标签
  const getHealthLabel = (level: string) => {
    switch (level) {
      case 'excellent': return '优秀';
      case 'good': return '良好';
      case 'fair': return '一般';
      case 'poor': return '差';
      default: return '未知';
    }
  };

  // 获取状态标签
  const getStatusBadge = (isActive: boolean, status: string) => {
    if (!isActive) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">停用</Badge>;
    }

    switch (status) {
      case 'online':
        return <Badge className="bg-green-500 hover:bg-green-600">在线</Badge>;
      case 'offline':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600">离线</Badge>;
      case 'maintenance':
        return <Badge variant="outline" className="border-orange-500 text-orange-500">维护</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  const { stats, robots, timeRange } = data;

  return (
    <div className="space-y-6">
      {/* 顶部控制栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-emerald-500" />
            监控大屏
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            实时监控机器人集群状态 • {new Date(timeRange.start).toLocaleString('zh-CN')} ~ {new Date(timeRange.end).toLocaleString('zh-CN')}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">近1小时</SelectItem>
              <SelectItem value="6h">近6小时</SelectItem>
              <SelectItem value="24h">近24小时</SelectItem>
              <SelectItem value="7d">近7天</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? '自动刷新' : '手动刷新'}
          </Button>
        </div>
      </div>

      {/* 统计卡片 - 美观设计 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 机器人总数 */}
        <Card className="overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium">机器人总数</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Bot className="h-6 w-6 text-blue-500" />
              {stats.totalRobots}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-600 font-medium">{stats.activeRobots}</span>
                <span className="text-muted-foreground">在线</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-600 font-medium">{stats.totalRobots - stats.activeRobots}</span>
                <span className="text-muted-foreground">离线</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 会话统计 */}
        <Card className="overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium">活跃会话</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-green-500" />
              {stats.activeSessions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">总计:</span>
                <span className="font-medium">{stats.totalSessions}</span>
              </div>
              <div className="text-muted-foreground">
                占比: {((stats.activeSessions / stats.totalSessions) * 100).toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>


        {/* 指令统计 */}
        <Card className="overflow-hidden border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium">指令执行</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Command className="h-6 w-6 text-purple-500" />
              {stats.totalCommands}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              累计执行指令数量
            </div>
          </CardContent>
        </Card>

        {/* 整体健康度 */}
        <Card className="overflow-hidden border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="text-sm font-medium">整体健康度</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Shield className="h-6 w-6 text-emerald-500" />
              {stats.avgHealthScore.toFixed(1)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">成功率:</span>
                <span className="font-medium">{stats.avgSuccessRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Cpu className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">利用率:</span>
                <span className="font-medium">{stats.overallUtilization.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 性能指标 - 进度条展示 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              整体性能指标
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">平均成功率</span>
                <span className="font-medium">{stats.avgSuccessRate.toFixed(1)}%</span>
              </div>
              <Progress value={stats.avgSuccessRate} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">平均健康度</span>
                <span className="font-medium">{stats.avgHealthScore.toFixed(1)}%</span>
              </div>
              <Progress value={stats.avgHealthScore} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">整体利用率</span>
                <span className="font-medium">{stats.overallUtilization.toFixed(1)}%</span>
              </div>
              <Progress value={stats.overallUtilization} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              资源使用情况
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">在线机器人占比</span>
                <span className="font-medium">{((stats.activeRobots / stats.totalRobots) * 100).toFixed(1)}%</span>
              </div>
              <Progress value={(stats.activeRobots / stats.totalRobots) * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">活跃会话占比</span>
                <span className="font-medium">{((stats.activeSessions / stats.totalSessions) * 100).toFixed(1)}%</span>
              </div>
              <Progress value={(stats.activeSessions / stats.totalSessions) * 100} className="h-2" />
            </div>
            <div className="flex items-center gap-4 text-sm pt-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">平均响应时间:</span>
                <span className="font-medium">
                  {robots.length > 0 
                    ? (robots.reduce((sum, r) => sum + r.avg_response_time, 0) / robots.length).toFixed(0)
                    : 0}ms
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 机器人监控列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            机器人监控详情
          </CardTitle>
          <CardDescription>
            {robots.length} 个机器人的实时状态和性能指标
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">机器人</TableHead>
                  <TableHead className="font-semibold">分组</TableHead>
                  <TableHead className="font-semibold">状态</TableHead>
                  <TableHead className="font-semibold">健康度</TableHead>
                  <TableHead className="font-semibold">成功率</TableHead>
                  <TableHead className="font-semibold">负载</TableHead>
                  <TableHead className="font-semibold">会话</TableHead>
                  <TableHead className="font-semibold">指令</TableHead>
                  <TableHead className="font-semibold">响应时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {robots.map(robot => (
                  <TableRow 
                    key={robot.robot_id} 
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Bot className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{robot.robot_name}</div>
                          <div className="text-xs text-muted-foreground">{robot.robot_id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                        {robot.group_name || '无分组'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(robot.is_active, robot.robot_status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getHealthColor(robot.health_level)}`} />
                        <span className="font-medium">{robot.health_score.toFixed(0)}%</span>
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                        >
                          {getHealthLabel(robot.health_level)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={robot.success_rate} 
                          className="w-20 h-2"
                        />
                        <span className="text-sm font-medium">{robot.success_rate.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={robot.utilization_rate} 
                            className="w-20 h-2"
                          />
                          <span className="text-sm font-medium">{robot.utilization_rate.toFixed(0)}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {robot.current_sessions}/{robot.max_sessions}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <Zap className="h-3 w-3 text-blue-500" />
                          <span className="font-medium">活跃: {robot.sessionStats.active}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>完成: {robot.sessionStats.completed}</span>
                        </div>
                        {robot.sessionStats.failed > 0 && (
                          <div className="flex items-center gap-2 text-red-500">
                            <AlertTriangle className="h-3 w-3" />
                            <span>失败: {robot.sessionStats.failed}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <Command className="h-3 w-3 text-purple-500" />
                          <span className="font-medium">待处理: {robot.commandStats.pending}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <RefreshCw className="h-3 w-3 text-blue-500" />
                          <span>处理中: {robot.commandStats.processing}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>完成: {robot.commandStats.completed}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{robot.avg_response_time.toFixed(0)}ms</div>
                        <div className="text-xs text-muted-foreground">
                          {robot.avg_response_time < 500 ? (
                            <span className="text-green-500">快速</span>
                          ) : robot.avg_response_time < 1000 ? (
                            <span className="text-yellow-500">一般</span>
                          ) : (
                            <span className="text-red-500">较慢</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 错误统计 - 美观展示 */}
      {robots.some(r => r.topErrors.length > 0) && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              错误统计
            </CardTitle>
            <CardDescription>
              需要关注的机器人错误信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {robots.filter(r => r.topErrors.length > 0).map(robot => (
                <Card key={robot.robot_id} className="border-2 border-red-200 hover:border-red-400 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <CardTitle className="text-base">{robot.robot_name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {robot.topErrors.map((error, index) => (
                        <div 
                          key={error.error_type} 
                          className="flex justify-between items-center p-2 bg-red-50 rounded-lg"
                        >
                          <span className="text-sm font-medium">{error.error_type}</span>
                          <Badge variant="destructive" className="bg-red-500">
                            {error.error_count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
