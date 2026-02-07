'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RefreshCw,
  Search,
  User,
  Users,
  Shield,
  Bot,
  MessageSquare,
  Headphones,
  Briefcase,
  Bell,
  Save,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// 工作人员类型
export type StaffType = 'management' | 'community' | 'conversion' | 'after_sales' | 'sales' | 'notification';

// 工作人员类型配置
export interface StaffTypeConfig {
  type: StaffType;
  name: string;
  description: string;
  icon: any;
  color: string;
}

// 工作人员类型列表
const STAFF_TYPE_CONFIGS: Record<StaffType, StaffTypeConfig> = {
  management: {
    type: 'management',
    name: '管理人员',
    description: '系统管理人员，拥有所有权限',
    icon: Shield,
    color: 'text-purple-500',
  },
  community: {
    type: 'community',
    name: '社群运维',
    description: '负责社群运营和用户互动',
    icon: Users,
    color: 'text-blue-500',
  },
  conversion: {
    type: 'conversion',
    name: '转化客服',
    description: '负责用户转化和订单处理',
    icon: Bot,
    color: 'text-green-500',
  },
  after_sales: {
    type: 'after_sales',
    name: '售后客服',
    description: '负责售后问题和投诉处理',
    icon: Headphones,
    color: 'text-orange-500',
  },
  sales: {
    type: 'sales',
    name: '销售客服',
    description: '负责销售咨询和商务对接',
    icon: Briefcase,
    color: 'text-indigo-500',
  },
  notification: {
    type: 'notification',
    name: '通知机器人',
    description: '负责系统通知和提醒',
    icon: Bell,
    color: 'text-yellow-500',
  },
};

// 工作人员记录
export interface StaffRecord {
  staffUserId: string;
  staffType: StaffType;
  staffName?: string;
  createdAt?: string;
}

// API 服务
const staffTypeApiService = {
  getAllStaffTypes: async (): Promise<{ success: boolean; data?: StaffRecord[]; error?: string }> => {
    const res = await fetch('/api/staff/type');
    const data = await res.json();
    return data;
  },

  getStaffType: async (staffUserId: string): Promise<{ success: boolean; data?: StaffType; error?: string }> => {
    const res = await fetch(`/api/staff/type?staffUserId=${encodeURIComponent(staffUserId)}`);
    const data = await res.json();
    return data;
  },

  setStaffType: async (staffUserId: string, staffType: StaffType): Promise<{ success: boolean; data?: StaffType; error?: string }> => {
    const res = await fetch('/api/staff/type', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffUserId, staffType }),
    });
    const data = await res.json();
    return data;
  },

  batchSetStaffTypes: async (items: Array<{ staffUserId: string; staffType: StaffType }>): Promise<{ success: boolean; data?: any; error?: string }> => {
    const res = await fetch('/api/staff/type', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    return data;
  },
};

// 主组件
export default function StaffTypeConfig() {
  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingStaff, setEditingStaff] = useState<{ staffUserId: string; staffType: StaffType } | null>(null);
  const [newStaffUserId, setNewStaffUserId] = useState('');
  const [newStaffType, setNewStaffType] = useState<StaffType>('community');
  const [batchInput, setBatchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<StaffType | 'all'>('all');

  // 加载数据
  const loadStaffRecords = async () => {
    setLoading(true);
    try {
      const result = await staffTypeApiService.getAllStaffTypes();
      if (result.success && result.data) {
        setStaffRecords(result.data);
      } else {
        console.error('加载工作人员类型失败:', result.error);
      }
    } catch (error) {
      console.error('加载工作人员类型失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffRecords();
  }, []);

  // 添加/更新工作人员类型
  const handleSetStaffType = async () => {
    if (!newStaffUserId) {
      alert('请输入工作人员ID');
      return;
    }

    const result = await staffTypeApiService.setStaffType(newStaffUserId, newStaffType);
    if (result.success) {
      alert('设置成功');
      setNewStaffUserId('');
      setNewStaffType('community');
      loadStaffRecords();
    } else {
      alert('设置失败: ' + result.error);
    }
  };

  // 批量设置工作人员类型
  const handleBatchSetStaffTypes = async () => {
    if (!batchInput.trim()) {
      alert('请输入批量设置内容');
      return;
    }

    // 解析输入（格式：staffUserId, staffType，每行一个）
    const lines = batchInput.split('\n').filter(line => line.trim());
    const items: Array<{ staffUserId: string; staffType: StaffType }> = [];

    for (const line of lines) {
      const [staffUserId, staffType] = line.split(',').map(s => s.trim());
      if (staffUserId && staffType && Object.keys(STAFF_TYPE_CONFIGS).includes(staffType)) {
        items.push({ staffUserId, staffType: staffType as StaffType });
      }
    }

    if (items.length === 0) {
      alert('没有有效的输入行');
      return;
    }

    const result = await staffTypeApiService.batchSetStaffTypes(items);
    if (result.success) {
      alert(`批量设置完成，成功 ${result.data.successCount} 条，失败 ${result.data.failureCount} 条`);
      setBatchInput('');
      loadStaffRecords();
    } else {
      alert('批量设置失败: ' + result.error);
    }
  };

  // 过滤记录
  const filteredRecords = staffRecords.filter(record => {
    const matchesSearch = !searchQuery || 
      record.staffUserId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.staffName && record.staffName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'all' || record.staffType === typeFilter;
    return matchesSearch && matchesType;
  });

  // 统计数据
  const stats = {
    total: staffRecords.length,
    management: staffRecords.filter(r => r.staffType === 'management').length,
    community: staffRecords.filter(r => r.staffType === 'community').length,
    conversion: staffRecords.filter(r => r.staffType === 'conversion').length,
    after_sales: staffRecords.filter(r => r.staffType === 'after_sales').length,
    sales: staffRecords.filter(r => r.staffType === 'sales').length,
    notification: staffRecords.filter(r => r.staffType === 'notification').length,
  };

  // 获取工作人员类型徽章
  const getStaffTypeBadge = (staffType: StaffType) => {
    const config = STAFF_TYPE_CONFIGS[staffType];
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`gap-1 border-${config.color.split('-')[1]}-500 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.name}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" />
            工作人员类型配置
          </h3>
          <p className="text-muted-foreground mt-1">
            配置工作人员类型，用于机器人角色识别和消息处理
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadStaffRecords}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="border-primary/20 hover:border-primary/40 transition-all">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">总计</CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3 text-blue-500" />
              全部人员
            </div>
          </CardContent>
        </Card>

        {Object.entries(STAFF_TYPE_CONFIGS).map(([type, config]) => (
          <Card key={type} className={`border-${config.color.split('-')[1]}-500/20 hover:border-${config.color.split('-')[1]}-500/40 transition-all`}>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">{config.name}</CardDescription>
              <CardTitle className={`text-2xl font-bold ${config.color}`}>
                {stats[type as StaffType]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <config.icon className={`h-3 w-3 ${config.color}`} />
                {config.description}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 添加工作人员 */}
      <Card>
        <CardHeader>
          <CardTitle>添加工作人员类型</CardTitle>
          <CardDescription>
            设置单个工作人员的类型
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="staffUserId">工作人员ID</Label>
              <Input
                id="staffUserId"
                placeholder="输入工作人员的用户ID"
                value={newStaffUserId}
                onChange={(e) => setNewStaffUserId(e.target.value)}
              />
            </div>
            <div className="w-[200px]">
              <Label htmlFor="staffType">工作人员类型</Label>
              <Select value={newStaffType} onValueChange={(v: any) => setNewStaffType(v)}>
                <SelectTrigger id="staffType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STAFF_TYPE_CONFIGS).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <config.icon className={`h-4 w-4 ${config.color}`} />
                        {config.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSetStaffType}>
                <Save className="h-4 w-4 mr-2" />
                保存
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 批量设置 */}
      <Card>
        <CardHeader>
          <CardTitle>批量设置工作人员类型</CardTitle>
          <CardDescription>
            批量设置多个工作人员的类型（格式：staffUserId, staffType，每行一个）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="示例：&#10;user_123, community&#10;user_456, after_sales&#10;user_789, conversion"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              rows={6}
            />
            <div className="flex justify-end">
              <Button onClick={handleBatchSetStaffTypes}>
                <Save className="h-4 w-4 mr-2" />
                批量保存
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 搜索和过滤 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="搜索工作人员ID或姓名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="类型过滤" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {Object.entries(STAFF_TYPE_CONFIGS).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <config.icon className={`h-4 w-4 ${config.color}`} />
                      {config.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 工作人员列表 */}
      <Card>
        <CardHeader>
          <CardTitle>工作人员列表</CardTitle>
          <CardDescription>
            显示所有已配置的工作人员（共 {filteredRecords.length} 条）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <RefreshCw className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                <p className="text-muted-foreground">加载中...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无工作人员记录</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">工作人员ID</TableHead>
                    <TableHead className="w-[200px]">工作人员类型</TableHead>
                    <TableHead className="w-[200px]">创建时间</TableHead>
                    <TableHead className="w-[150px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.staffUserId} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono">{record.staffUserId}</span>
                        </div>
                        {record.staffName && (
                          <div className="text-xs text-muted-foreground">{record.staffName}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStaffTypeBadge(record.staffType)}
                      </TableCell>
                      <TableCell>
                        {record.createdAt ? (
                          new Date(record.createdAt).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingStaff({ staffUserId: record.staffUserId, staffType: record.staffType });
                              setNewStaffUserId(record.staffUserId);
                              setNewStaffType(record.staffType);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
