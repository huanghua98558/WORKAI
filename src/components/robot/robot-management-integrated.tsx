'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Bot,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Play,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Info,
  Save,
  X,
  Server,
  Activity,
  BarChart3,
  Zap,
  Globe,
  Copy,
  TestTube,
  Settings,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Building2,
  Calendar,
  MessageCircle,
  User,
  Sparkles,
  LayoutDashboard,
  UserCheck
} from 'lucide-react';

// 导入子组件
import RobotGroupManager from '@/components/robot/robot-group-manager';
import RobotRoleManager from '@/components/robot/robot-role-manager';
import CommandSender from '@/components/robot/command-sender';
import MonitoringDashboard from '@/components/robot/monitoring-dashboard';

interface Robot {
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
  nickname?: string;
  company?: string;
  ipAddress?: string;
  isValid?: boolean;
  activatedAt?: string;
  expiresAt?: string;
  messageCallbackEnabled?: boolean;
  extraData?: any;
}

interface RobotFormData {
  name: string;
  robotId: string;
  apiBaseUrl: string;
  description?: string;
  isActive: boolean;
}

export default function RobotManagement() {
  const router = useRouter();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 主标签页：list, groups, roles, commands, monitor

  // 加载机器人列表
  const loadRobots = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/proxy/admin/robots');
      if (res.ok) {
        const data = await res.json();
        if (data.code === 0) {
          setRobots(data.data || []);
        }
      }
    } catch (error) {
      console.error('加载机器人列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRobots();
  }, []);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-6 w-6" />
          机器人管理中心
        </h2>
        <p className="text-muted-foreground mt-1">
          统一管理机器人、分组、角色、指令和监控
        </p>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">总机器人数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-500" />
              {robots.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">在线</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              {robots.filter(r => r.isActive && r.status === 'online').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">离线</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              {robots.filter(r => r.isActive && r.status === 'offline').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">已停用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2 text-gray-600">
              <AlertTriangle className="h-5 w-5" />
              {robots.filter(r => !r.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 功能标签页 */}
      <Card>
        <CardHeader>
          <CardTitle>功能模块</CardTitle>
          <CardDescription>
            选择不同的功能模块来管理机器人相关的各项功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
              <TabsTrigger value="list" className="gap-2">
                <Bot className="h-4 w-4" />
                <span>机器人列表</span>
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span>分组管理</span>
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>角色管理</span>
              </TabsTrigger>
              <TabsTrigger value="commands" className="gap-2">
                <Sparkles className="h-4 w-4" />
                <span>指令发送</span>
              </TabsTrigger>
              <TabsTrigger value="monitor" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>监控大屏</span>
              </TabsTrigger>
            </TabsList>

            {/* 机器人列表 */}
            <TabsContent value="list" className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">机器人列表</h3>
                  <p className="text-sm text-muted-foreground">管理所有机器人的基本信息和配置</p>
                </div>
                <Button onClick={loadRobots} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </div>

              {/* 这里可以复用原有的机器人列表组件 */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>提示</AlertTitle>
                <AlertDescription>
                  机器人列表功能正在开发中。请使用其他功能模块管理机器人。
                  当前共有 {robots.length} 个机器人，其中 {robots.filter(r => r.isActive && r.status === 'online').length} 个在线。
                </AlertDescription>
              </Alert>

              {/* 简单的机器人列表展示 */}
              <div className="space-y-2">
                {robots.map(robot => (
                  <Card key={robot.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Bot className="h-8 w-8 text-blue-500" />
                          <div>
                            <div className="font-semibold">{robot.name}</div>
                            <div className="text-sm text-muted-foreground">{robot.robotId}</div>
                          </div>
                          <Badge variant={robot.isActive && robot.status === 'online' ? 'default' : 'secondary'}>
                            {robot.isActive && robot.status === 'online' ? '在线' : '离线'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit2 className="h-4 w-4 mr-1" />
                            编辑
                          </Button>
                          <Button size="sm" variant="outline">
                            <Settings className="h-4 w-4 mr-1" />
                            配置
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {robots.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无机器人数据
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 分组管理 */}
            <TabsContent value="groups">
              <RobotGroupManager />
            </TabsContent>

            {/* 角色管理 */}
            <TabsContent value="roles">
              <RobotRoleManager />
            </TabsContent>

            {/* 指令发送 */}
            <TabsContent value="commands">
              <CommandSender />
            </TabsContent>

            {/* 监控大屏 */}
            <TabsContent value="monitor">
              <MonitoringDashboard />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
