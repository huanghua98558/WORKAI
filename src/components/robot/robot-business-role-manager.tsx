'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, Bot, Shield, Headphones, Briefcase, Bell, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import BusinessRoleForm from './business-role-form';

// 业务角色接口
export interface BusinessRole {
  id: string;
  name: string;
  code: string;
  description: string;
  aiBehavior: 'full_auto' | 'semi_auto' | 'record_only';
  staffEnabled: boolean;
  staffTypeFilter: string[];
  keywords: string[];
  defaultTaskPriority: 'low' | 'normal' | 'high';
  enableTaskCreation: boolean;
  robotId: string | null;
  robotName: string | null;
  robotRobotId: string | null;
  createdAt: string;
  updatedAt: string;
}

// 业务角色图标映射
const BUSINESS_ROLE_ICONS: Record<string, React.ElementType> = {
  community_ops: Bot,
  conversion_staff: Briefcase,
  after_sales: Headphones,
};

// 业务角色颜色映射
const BUSINESS_ROLE_COLORS: Record<string, string> = {
  community_ops: 'bg-blue-500',
  conversion_staff: 'bg-green-500',
  after_sales: 'bg-orange-500',
};

// AI 行为名称映射
const AI_BEHAVIOR_NAMES: Record<string, string> = {
  full_auto: '全自动',
  semi_auto: '半自动',
  record_only: '仅记录',
};

// 任务优先级名称映射
const PRIORITY_NAMES: Record<string, string> = {
  low: '低',
  normal: '中',
  high: '高',
};

export default function RobotBusinessRoleManager() {
  const [businessRoles, setBusinessRoles] = useState<BusinessRole[]>([]);
  const [robots, setRobots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<BusinessRole | null>(null);

  // 加载机器人列表（只在组件挂载时加载一次）
  useEffect(() => {
    const fetchRobots = async () => {
      try {
        const response = await fetch('/api/proxy/admin/robots');
        const result = await response.json();
        if (result.code === 0 && result.data) {
          // 确保 id 字段是字符串类型
          const formattedRobots = result.data.map((robot: any) => ({
            ...robot,
            id: String(robot.id),
          }));
          console.log('[RobotBusinessRoleManager] 机器人列表加载成功:', formattedRobots.length, '个');
          console.log('[RobotBusinessRoleManager] 机器人详情:', formattedRobots);
          setRobots(formattedRobots);
        }
      } catch (error) {
        console.error('加载机器人列表失败:', error);
      }
    };

    console.log('[RobotBusinessRoleManager] 开始加载机器人列表...');
    fetchRobots();
  }, []); // 空依赖数组，只在挂载时执行一次

  // 监控 robots 状态变化（调试用）
  useEffect(() => {
    console.log('[RobotBusinessRoleManager] robots 状态变化:', robots.length, '个机器人');
  }, [robots]);

  // 加载业务角色列表
  const loadBusinessRoles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/robots/business-roles');
      const result = await response.json();

      if (result.success) {
        setBusinessRoles(result.data || []);
      } else {
        toast.error('加载业务角色失败：' + result.error);
      }
    } catch (error) {
      console.error('加载业务角色失败:', error);
      toast.error('加载业务角色失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinessRoles();
  }, []);

  // 删除业务角色
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除业务角色"${name}"吗？`)) {
      return;
    }

    try {
      const response = await fetch('/api/robots/business-roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success('业务角色删除成功');
        loadBusinessRoles();
      } else {
        toast.error('删除失败：' + result.error);
      }
    } catch (error) {
      console.error('删除业务角色失败:', error);
      toast.error('删除失败');
    }
  };

  // 编辑业务角色
  const handleEdit = (role: BusinessRole) => {
    setEditingRole(role);
    setShowDialog(true);
  };

  // 新增业务角色
  const handleAdd = () => {
    setEditingRole(null);
    setShowDialog(true);
  };

  // 保存成功后的回调
  const handleSaveSuccess = () => {
    setShowDialog(false);
    setEditingRole(null);
    loadBusinessRoles();
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">业务角色管理</h2>
          <p className="text-muted-foreground">
            配置机器人的业务定位和行为规则
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadBusinessRoles} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            新增业务角色
          </Button>
        </div>
      </div>

      {/* 业务角色列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {businessRoles.map((role) => {
          const Icon = BUSINESS_ROLE_ICONS[role.code] || Bot;
          const color = BUSINESS_ROLE_COLORS[role.code] || 'bg-gray-500';

          return (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-md ${color} text-white`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{role.name}</CardTitle>
                      <CardDescription className="text-xs">{role.code}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={role.robotId ? 'default' : 'outline'}>
                    {role.robotId ? '已绑定' : '通用'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 机器人绑定信息 */}
                {role.robotId && role.robotName && (
                  <div className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">绑定机器人：</span>
                    <span className="font-medium">{role.robotName}</span>
                    <span className="text-muted-foreground text-xs">({role.robotRobotId})</span>
                  </div>
                )}

                {/* 描述 */}
                {role.description && (
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                )}

                {/* AI 行为 */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">AI 行为：</span>
                  <Badge variant="secondary">{AI_BEHAVIOR_NAMES[role.aiBehavior]}</Badge>
                </div>

                {/* 工作人员识别 */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">识别工作人员：</span>
                  <Badge variant={role.staffEnabled ? 'default' : 'secondary'}>
                    {role.staffEnabled ? '是' : '否'}
                  </Badge>
                </div>

                {/* 关键词 */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">触发关键词：</p>
                  <div className="flex flex-wrap gap-1">
                    {role.keywords.slice(0, 5).map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {role.keywords.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{role.keywords.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 任务创建 */}
                {role.enableTaskCreation && (
                  <div className="flex items-center gap-2 text-sm text-orange-600">
                    <Bell className="w-4 h-4" />
                    <span>启用任务创建</span>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(role)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDelete(role.id, role.name)}
                    disabled={role.robotId !== null}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 空状态 */}
      {businessRoles.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无业务角色</h3>
            <p className="text-muted-foreground mb-4">
              创建业务角色来定义机器人的业务定位和行为规则
            </p>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              创建第一个业务角色
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 新增/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? '编辑业务角色' : '新增业务角色'}</DialogTitle>
            <DialogDescription>
              {editingRole
                ? '修改业务角色的配置信息'
                : '创建一个新的业务角色'}
            </DialogDescription>
          </DialogHeader>
          <BusinessRoleForm
            robots={robots}
            initialData={editingRole}
            onSave={handleSaveSuccess}
            onCancel={() => setShowDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
