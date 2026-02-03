'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
      return <Badge variant="secondary">停用</Badge>;
    }
    
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500">在线</Badge>;
      case 'offline':
        return <Badge variant="secondary">离线</Badge>;
      case 'maintenance':
        return <Badge variant="outline">维护</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const { stats, robots, timeRange } = data;

  return (
    <div className="space-y-6">
      {/* 顶部控制栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">监控大屏</h2>
          <p className="text-sm text-muted-foreground">
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
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg border ${autoRefresh ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
          >
            {autoRefresh ? '自动刷新中' : '手动刷新'}
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>机器人总数</CardDescription>
            <CardTitle className="text-3xl">{stats.totalRobots}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              在线: {stats.activeRobots} / 总数: {stats.totalRobots}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>会话统计</CardDescription>
            <CardTitle className="text-3xl">{stats.activeSessions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              活跃: {stats.activeSessions} / 总计: {stats.totalSessions}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>指令统计</CardDescription>
            <CardTitle className="text-3xl">{stats.totalCommands}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              累计执行 {stats.totalCommands} 条指令
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>整体健康度</CardDescription>
            <CardTitle className="text-3xl">{stats.avgHealthScore.toFixed(1)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              成功率: {stats.avgSuccessRate.toFixed(1)}% • 利用率: {stats.overallUtilization.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 机器人列表 */}
      <Card>
        <CardHeader>
          <CardTitle>机器人监控</CardTitle>
          <CardDescription>
            {robots.length} 个机器人的实时状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>机器人</TableHead>
                <TableHead>分组</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>健康度</TableHead>
                <TableHead>成功率</TableHead>
                <TableHead>负载</TableHead>
                <TableHead>会话</TableHead>
                <TableHead>指令</TableHead>
                <TableHead>响应时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {robots.map(robot => (
                <TableRow key={robot.robot_id}>
                  <TableCell className="font-medium">
                    {robot.robot_name}
                    <div className="text-xs text-muted-foreground">{robot.robot_id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{robot.group_name || '无分组'}</Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(robot.is_active, robot.robot_status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getHealthColor(robot.health_level)}`} />
                      <span>{robot.health_score.toFixed(0)}%</span>
                      <Badge variant="outline" className="text-xs">
                        {getHealthLabel(robot.health_level)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={robot.success_rate} className="w-16" />
                      <span className="text-sm">{robot.success_rate.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={robot.utilization_rate} 
                        className="w-16"
                        color={robot.utilization_rate > 80 ? 'destructive' : 'default'}
                      />
                      <span className="text-sm">{robot.utilization_rate.toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {robot.current_sessions}/{robot.max_sessions}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>活跃: {robot.sessionStats.active}</div>
                      <div className="text-muted-foreground">完成: {robot.sessionStats.completed}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>待处理: {robot.commandStats.pending}</div>
                      <div className="text-muted-foreground">完成: {robot.commandStats.completed}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {robot.avg_response_time.toFixed(0)}ms
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 错误统计 */}
      {robots.some(r => r.topErrors.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {robots.filter(r => r.topErrors.length > 0).map(robot => (
            <Card key={robot.robot_id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {robot.robot_name} - 错误统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {robot.topErrors.map(error => (
                    <div key={error.error_type} className="flex justify-between items-center">
                      <span className="text-sm">{error.error_type}</span>
                      <Badge variant="destructive">{error.error_count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
