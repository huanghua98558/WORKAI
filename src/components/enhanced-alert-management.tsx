'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Layers,
  ArrowUpRight,
  Trash2,
  Edit,
  MoreHorizontal,
  Play,
  RefreshCw,
} from 'lucide-react';

// 类型定义
interface AlertGroup {
  id: string;
  group_name: string;
  group_code: string;
  group_description: string;
  group_color: string;
  sort_order: number;
  is_default: boolean;
  rule_count: number;
  alert_count: number;
}

interface AlertRule {
  id: string;
  intentType: string;
  ruleName: string;
  isEnabled: boolean;
  alertLevel: string;
  groupId: string | null;
  enableEscalation: boolean;
  escalationLevel: number;
  escalationThreshold: number;
  escalationInterval: number;
  escalationConfig: any;
}

interface BatchOperation {
  id: string;
  operation_type: string;
  operation_status: string;
  total_count: number;
  success_count: number;
  failed_count: number;
  created_at: string;
  completed_at: string;
}

interface AnalyticsData {
  overall: any;
  trends: {
    daily: any[];
  };
  byGroup: any[];
  byIntentType: any[];
  distribution: {
    alertLevel: any[];
    escalation: any[];
  };
  performance: {
    responseTime: any[];
  };
  rankings: {
    topUsers: any[];
    topChats: any[];
  };
}

// API 服务
const apiService = {
  // 分组管理
  getGroups: async () => {
    const res = await fetch('/api/alerts/groups');
    const data = await res.json();
    return data.data;
  },

  createGroup: async (group: Partial<AlertGroup>) => {
    const res = await fetch('/api/alerts/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });
    return res.json();
  },

  updateGroup: async (id: string, group: Partial<AlertGroup>) => {
    const res = await fetch(`/api/alerts/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });
    return res.json();
  },

  deleteGroup: async (id: string) => {
    const res = await fetch(`/api/alerts/groups/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // 批量操作
  batchMarkHandled: async (filter: any, handledBy: string, handledNote: string) => {
    const res = await fetch('/api/alerts/batch/mark-handled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filterConditions: filter, handledBy, handledNote }),
    });
    return res.json();
  },

  batchIgnore: async (filter: any, ignoredBy: string, ignoredNote: string) => {
    const res = await fetch('/api/alerts/batch/ignore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filterConditions: filter, ignoredBy, ignoredNote }),
    });
    return res.json();
  },

  // 统计分析
  getAnalyticsReport: async (days: number = 7) => {
    const res = await fetch(`/api/alerts/analytics/report?days=${days}`);
    const data = await res.json();
    return data.data;
  },

  getGroupStats: async (groupId: string) => {
    const res = await fetch(`/api/alerts/groups/${groupId}/stats`);
    const data = await res.json();
    return data.data;
  },
};

// 主组件
export default function EnhancedAlertManagement() {
  const [activeTab, setActiveTab] = useState('groups');
  const [groups, setGroups] = useState<AlertGroup[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<AlertGroup | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [editedGroup, setEditedGroup] = useState<Partial<AlertGroup>>({});

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsData, analyticsData] = await Promise.all([
        apiService.getGroups(),
        apiService.getAnalyticsReport(7),
      ]);
      setGroups(groupsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 编辑分组
  const handleEditGroup = (group: AlertGroup) => {
    setSelectedGroup(group);
    setEditedGroup({ ...group });
    setEditDialogOpen(true);
  };

  const saveGroup = async () => {
    try {
      if (editedGroup.id) {
        await apiService.updateGroup(editedGroup.id, editedGroup);
      } else {
        await apiService.createGroup(editedGroup);
      }
      setEditDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('保存分组失败:', error);
    }
  };

  // 删除分组
  const handleDeleteGroup = (group: AlertGroup) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteGroup = async () => {
    if (selectedGroup) {
      try {
        await apiService.deleteGroup(selectedGroup.id);
        setDeleteDialogOpen(false);
        loadData();
      } catch (error) {
        console.error('删除分组失败:', error);
        alert('删除失败: ' + (error as any).message);
      }
    }
  };

  // 渲染分组管理
  const renderGroupsManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">告警分组管理</h3>
          <p className="text-sm text-gray-500">管理告警的分组分类</p>
        </div>
        <Button onClick={() => handleEditGroup({} as AlertGroup)}>
          <Layers className="h-4 w-4 mr-2" />
          新建分组
        </Button>
      </div>

      <div className="grid gap-4">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.group_color }}
                  />
                  <div>
                    <CardTitle className="text-base">{group.group_name}</CardTitle>
                    <CardDescription className="text-xs">{group.group_code}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {group.is_default && (
                    <Badge variant="secondary" className="text-xs">默认</Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {group.rule_count} 规则
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {group.alert_count} 告警
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditGroup(group)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGroup(group)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{group.group_description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // 渲染统计分析
  const renderAnalytics = () => {
    if (!analytics) return <div>加载中...</div>;

    return (
      <div className="space-y-6">
        {/* 总体统计 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">总告警数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.overall?.total_count || 0}</div>
              <p className="text-xs text-gray-500 mt-1">过去7天</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">待处理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">
                {analytics.overall?.pending_count || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">需要关注</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">已处理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {analytics.overall?.handled_count || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">已完成</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {Math.round(analytics.overall?.avg_response_time_seconds || 0)}s
              </div>
              <p className="text-xs text-gray-500 mt-1">处理效率</p>
            </CardContent>
          </Card>
        </div>

        {/* 告警级别分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              告警级别分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.distribution?.alertLevel?.map((item: any) => (
                <div key={item.alert_level} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{item.alert_level}</span>
                      <span className="text-sm text-gray-500">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor:
                            item.alert_level === 'critical'
                              ? '#EF4444'
                              : item.alert_level === 'warning'
                              ? '#F59E0B'
                              : '#3B82F6',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 每日趋势 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              每日趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>总计</TableHead>
                    <TableHead>待处理</TableHead>
                    <TableHead>已处理</TableHead>
                    <TableHead>严重</TableHead>
                    <TableHead>警告</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.trends?.daily?.map((item: any) => (
                    <TableRow key={item.date}>
                      <TableCell className="font-medium">{item.date}</TableCell>
                      <TableCell>{item.total_count}</TableCell>
                      <TableCell className="text-orange-500">{item.pending_count}</TableCell>
                      <TableCell className="text-green-500">{item.handled_count}</TableCell>
                      <TableCell className="text-red-500">{item.critical_count}</TableCell>
                      <TableCell className="text-yellow-500">{item.warning_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top用户和群组 */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5" />
                告警最多的用户
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.rankings?.topUsers?.map((user: any, index: number) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <span className="text-sm">{user.user_name}</span>
                    </div>
                    <Badge variant="outline">{user.alert_count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-5 w-5" />
                告警最多的群组
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.rankings?.topChats?.map((chat: any, index: number) => (
                  <div
                    key={chat.group_chat_id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <span className="text-sm">{chat.group_name}</span>
                    </div>
                    <Badge variant="outline">{chat.alert_count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">告警管理增强</h1>
        <p className="text-gray-500">分组管理 · 批量处理 · 升级机制 · 统计分析</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="groups">分组管理</TabsTrigger>
          <TabsTrigger value="batch">批量处理</TabsTrigger>
          <TabsTrigger value="escalation">升级机制</TabsTrigger>
          <TabsTrigger value="analytics">统计分析</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-6">
          {renderGroupsManagement()}
        </TabsContent>

        <TabsContent value="batch" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>批量处理</CardTitle>
              <CardDescription>对告警进行批量操作</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">批量处理功能开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>升级机制</CardTitle>
              <CardDescription>配置告警自动升级规则</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">升级机制配置开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {renderAnalytics()}
        </TabsContent>
      </Tabs>

      {/* 编辑分组对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editedGroup.id ? '编辑分组' : '新建分组'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="groupName">分组名称</Label>
              <Input
                id="groupName"
                value={editedGroup.group_name || ''}
                onChange={(e) => setEditedGroup({ ...editedGroup, group_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="groupCode">分组代码</Label>
              <Input
                id="groupCode"
                value={editedGroup.group_code || ''}
                onChange={(e) => setEditedGroup({ ...editedGroup, group_code: e.target.value })}
                disabled={!!editedGroup.id}
              />
            </div>
            <div>
              <Label htmlFor="groupDescription">分组描述</Label>
              <Textarea
                id="groupDescription"
                value={editedGroup.group_description || ''}
                onChange={(e) => setEditedGroup({ ...editedGroup, group_description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="groupColor">分组颜色</Label>
              <Input
                id="groupColor"
                type="color"
                value={editedGroup.group_color || '#3B82F6'}
                onChange={(e) => setEditedGroup({ ...editedGroup, group_color: e.target.value })}
                className="h-10 w-full"
              />
            </div>
            <div>
              <Label htmlFor="sortOrder">排序</Label>
              <Input
                id="sortOrder"
                type="number"
                value={editedGroup.sort_order || 0}
                onChange={(e) => setEditedGroup({ ...editedGroup, sort_order: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isDefault"
                checked={editedGroup.is_default || false}
                onCheckedChange={(checked) => setEditedGroup({ ...editedGroup, is_default: checked })}
              />
              <Label htmlFor="isDefault">设为默认分组</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={saveGroup}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除分组 "{selectedGroup?.group_name}" 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGroup}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
