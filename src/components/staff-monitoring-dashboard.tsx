'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Activity,
  Clock,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  UserX,
  Zap,
  Award,
  Calendar,
  MoreHorizontal
} from 'lucide-react';

// 工作人员统计数据接口
interface StaffStatsData {
  timeRange: string;
  robotId?: string;
  summary: {
    totalStaff: number;
    activeStaff: number;
    totalActivities: number;
    avgActivitiesPerStaff: string;
  };
  staffList: Array<{
    staffUserId: string;
    staffName: string;
    totalActivities: number;
    lastActivity: string;
    activityTypes: Record<string, number>;
    sessionCount: number;
    isOnline: boolean;
  }>;
  activityDistribution: Record<string, number>;
  topPerformers: Array<{
    staffUserId: string;
    staffName: string;
    totalActivities: number;
    sessionCount: number;
  }>;
}

// 工作人员详细信息接口
interface StaffDetail {
  staffUserId: string;
  staffName: string;
  timeRange: string;
  summary: {
    totalActivities: number;
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    isOnline: boolean;
  };
  activityTypes: Record<string, number>;
  messageStats: {
    totalMessages: number;
    replies: number;
    byType: Record<string, number>;
  };
  recentActivities: Array<{
    id: string;
    sessionId: string;
    robotId: string;
    activityType: string;
    createdAt: string;
  }>;
  performance: {
    avgSessionsPerHour: number;
    responseRate: number;
  };
}

export default function StaffMonitoringDashboard() {
  const [loading, setLoading] = useState(false);
  const [statsData, setStatsData] = useState<StaffStatsData | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [error, setError] = useState<string | null>(null);

  // 加载工作人员统计数据
  const loadStaffStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/collab/staff-activity-stats?timeRange=${timeRange}`
      );
      const result = await res.json();
      if (result.code === 0) {
        setStatsData(result.data);
      } else {
        setError(result.message || '加载统计数据失败');
      }
    } catch (err) {
      console.error('加载工作人员统计失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载工作人员详细信息
  const loadStaffDetail = async (staffUserId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(
        `/api/collab/staff-detail/${staffUserId}?timeRange=${timeRange}`
      );
      const result = await res.json();
      if (result.code === 0) {
        setSelectedStaff(result.data);
      } else {
        console.error('加载工作人员详情失败:', result.message);
      }
    } catch (err) {
      console.error('加载工作人员详情失败:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadStaffStats();
  }, [timeRange]);

  // 获取活动类型标签
  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      message: '消息',
      join: '加入',
      command: '命令',
      handling: '处理',
      intervention: '介入',
      alert_notification: '告警通知'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">总工作人员数</CardDescription>
            <CardTitle className="text-2xl">
              {statsData?.summary.totalStaff || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">活跃工作人员</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {statsData?.summary.activeStaff || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">总活动数</CardDescription>
            <CardTitle className="text-2xl">
              {statsData?.summary.totalActivities || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">平均活动数/人</CardDescription>
            <CardTitle className="text-2xl">
              {statsData?.summary.avgActivitiesPerStaff || '0'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 工作人员列表 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  工作人员列表
                </CardTitle>
                <CardDescription>
                  按活动量排序的工作人员列表
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1小时</SelectItem>
                    <SelectItem value="24h">24小时</SelectItem>
                    <SelectItem value="7d">7天</SelectItem>
                    <SelectItem value="30d">30天</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={loadStaffStats}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && !statsData ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <p>{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadStaffStats}
                    className="mt-4"
                  >
                    重试
                  </Button>
                </div>
              </div>
            ) : statsData?.staffList && statsData.staffList.length > 0 ? (
              <div className="space-y-3">
                {statsData.staffList.map((staff, index) => (
                  <div
                    key={staff.staffUserId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => loadStaffDetail(staff.staffUserId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                        {staff.staffName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{staff.staffName}</span>
                          {staff.isOnline ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <UserCheck className="w-3 h-3 mr-1" />
                              在线
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              <UserX className="w-3 h-3 mr-1" />
                              离线
                            </Badge>
                          )}
                          {index < 3 && (
                            <Badge className="bg-yellow-500 text-white">
                              <Award className="w-3 h-3 mr-1" />
                              TOP {index + 1}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          活动 {staff.totalActivities} 次 · 会话 {staff.sessionCount} 个
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {staff.totalActivities} 活动
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(staff.lastActivity).toLocaleString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                暂无工作人员数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 表现者 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Top 表现者
            </CardTitle>
            <CardDescription>
              活跃度最高的工作人员
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsData?.topPerformers && statsData.topPerformers.length > 0 ? (
              <div className="space-y-4">
                {statsData.topPerformers.map((staff, index) => (
                  <div
                    key={staff.staffUserId}
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-transparent rounded-lg dark:from-yellow-950"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500 text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{staff.staffName}</div>
                      <div className="text-sm text-muted-foreground">
                        {staff.totalActivities} 次活动
                      </div>
                    </div>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 活动类型分布 */}
      {statsData?.activityDistribution && Object.keys(statsData.activityDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              活动类型分布
            </CardTitle>
            <CardDescription>
              不同类型的活动数量统计
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(statsData.activityDistribution).map(([type, count]) => (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{getActivityTypeLabel(type)}</span>
                    <span className="font-medium">{count} 次</span>
                  </div>
                  <Progress
                    value={(count / (statsData.summary.totalActivities || 1)) * 100}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 工作人员详情 */}
      {selectedStaff && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  {selectedStaff.staffName} - 详细信息
                </CardTitle>
                <CardDescription>
                  活动统计和性能指标
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStaff(null)}
              >
                关闭
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-6">
                {/* 活动统计 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">总活动数</div>
                    <div className="text-2xl font-bold">
                      {selectedStaff.summary.totalActivities}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">会话数</div>
                    <div className="text-2xl font-bold">
                      {selectedStaff.summary.totalSessions}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">活跃会话</div>
                    <div className="text-2xl font-bold text-green-600">
                      {selectedStaff.summary.activeSessions}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">消息数</div>
                    <div className="text-2xl font-bold">
                      {selectedStaff.summary.totalMessages}
                    </div>
                  </div>
                </div>

                {/* 性能指标 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      平均会话/小时
                    </div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-300">
                      {selectedStaff.performance.avgSessionsPerHour}
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      响应率
                    </div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-300">
                      {selectedStaff.performance.responseRate}%
                    </div>
                  </div>
                </div>

                {/* 活动类型 */}
                <div>
                  <h4 className="text-sm font-medium mb-3">活动类型</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedStaff.activityTypes).map(([type, count]) => (
                      <Badge key={type} variant="outline">
                        {getActivityTypeLabel(type)}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* 最近活动 */}
                {selectedStaff.recentActivities && selectedStaff.recentActivities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">最近活动</h4>
                    <div className="space-y-2">
                      {selectedStaff.recentActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getActivityTypeLabel(activity.activityType)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              会话: {activity.sessionId}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(activity.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
