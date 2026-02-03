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
  UserCheck,
  ChevronLeft
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
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          机器人管理中心
        </h2>
        <p className="text-muted-foreground text-lg">
          统一管理机器人、分组、角色、指令和监控
        </p>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">总机器人数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-3">
              <Bot className="h-6 w-6 text-blue-500" />
              {robots.length}
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">在线</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-3 text-green-600">
              <CheckCircle className="h-6 w-6" />
              {robots.filter(r => r.isActive && r.status === 'online').length}
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">离线</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-3 text-red-600">
              <XCircle className="h-6 w-6" />
              {robots.filter(r => r.isActive && r.status === 'offline').length}
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">已停用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-3 text-orange-600">
              <AlertTriangle className="h-6 w-6" />
              {robots.filter(r => !r.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 功能模块卡片 - 美观设计 */}
      <div className="space-y-6">
        {!activeTab ? (
          <>
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold mb-2">功能模块</h3>
              <p className="text-muted-foreground">选择下面的功能模块开始管理</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* 机器人列表 */}
              <Card 
                className="group cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 hover:border-blue-500"
                onClick={() => setActiveTab('list')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-500 transition-colors">
                      <Bot className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {robots.length} 个
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-xl">机器人列表</CardTitle>
                  <CardDescription>
                    查看和管理所有机器人的基本信息、状态和配置
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {robots.filter(r => r.isActive && r.status === 'online').length} 个在线
                    <XCircle className="h-4 w-4 text-red-500 ml-2" />
                    {robots.filter(r => r.isActive && r.status === 'offline').length} 个离线
                  </div>
                </CardContent>
              </Card>

              {/* 分组管理 */}
              <Card 
                className="group cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 hover:border-purple-500"
                onClick={() => setActiveTab('groups')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-500 transition-colors">
                      <Building2 className="h-8 w-8 text-purple-600 group-hover:text-white transition-colors" />
                    </div>
                    <Badge variant="secondary" className="text-sm">管理</Badge>
                  </div>
                  <CardTitle className="mt-4 text-xl">分组管理</CardTitle>
                  <CardDescription>
                    创建和管理机器人分组，配置路由策略和负载均衡
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">客服组</Badge>
                    <Badge variant="outline" className="text-xs">销售组</Badge>
                    <Badge variant="outline" className="text-xs">运营组</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 角色管理 */}
              <Card 
                className="group cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 hover:border-amber-500"
                onClick={() => setActiveTab('roles')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-amber-100 rounded-lg group-hover:bg-amber-500 transition-colors">
                      <ShieldCheck className="h-8 w-8 text-amber-600 group-hover:text-white transition-colors" />
                    </div>
                    <Badge variant="secondary" className="text-sm">权限</Badge>
                  </div>
                  <CardTitle className="mt-4 text-xl">角色管理</CardTitle>
                  <CardDescription>
                    配置机器人角色、权限和操作范围
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">14种权限</Badge>
                    <Badge variant="outline" className="text-xs">12种操作</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 指令发送 */}
              <Card 
                className="group cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 hover:border-pink-500"
                onClick={() => setActiveTab('commands')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-pink-100 rounded-lg group-hover:bg-pink-500 transition-colors">
                      <Sparkles className="h-8 w-8 text-pink-600 group-hover:text-white transition-colors" />
                    </div>
                    <Badge variant="secondary" className="text-sm">发送</Badge>
                  </div>
                  <CardTitle className="mt-4 text-xl">指令发送</CardTitle>
                  <CardDescription>
                    向在线机器人发送指令，实时查看执行状态
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">8种类型</Badge>
                    <Badge variant="outline" className="text-xs">实时状态</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 监控大屏 */}
              <Card 
                className="group cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 hover:border-emerald-500"
                onClick={() => setActiveTab('monitor')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-emerald-100 rounded-lg group-hover:bg-emerald-500 transition-colors">
                      <BarChart3 className="h-8 w-8 text-emerald-600 group-hover:text-white transition-colors" />
                    </div>
                    <Badge variant="secondary" className="text-sm">监控</Badge>
                  </div>
                  <CardTitle className="mt-4 text-xl">监控大屏</CardTitle>
                  <CardDescription>
                    实时监控所有机器人状态、健康度和性能指标
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">自动刷新</Badge>
                    <Badge variant="outline" className="text-xs">实时数据</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 返回提示 */}
              <Card className="border-dashed flex items-center justify-center min-h-[200px] bg-muted/50">
                <div className="text-center text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">更多功能即将推出</p>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <>
            {/* 返回按钮 */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('')}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                返回功能模块
              </Button>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* 功能标签页 */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

            {/* 机器人列表 */}
            <TabsContent value="list" className="space-y-6">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="h-5 w-5 text-blue-500" />
                        <CardTitle className="text-xl">机器人列表</CardTitle>
                      </div>
                      <CardDescription>
                        管理所有机器人的基本信息、状态和配置
                      </CardDescription>
                    </div>
                    <Button onClick={loadRobots} disabled={isLoading} variant="outline">
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      刷新
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>提示</AlertTitle>
                <AlertDescription>
                  机器人列表功能正在开发中。请使用其他功能模块管理机器人。
                  当前共有 <Badge variant="secondary" className="mx-1">{robots.length}</Badge> 个机器人，
                  其中 <Badge variant="outline" className="mx-1 text-green-600">{robots.filter(r => r.isActive && r.status === 'online').length}</Badge> 个在线。
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                {robots.map(robot => (
                  <Card key={robot.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <Bot className="h-8 w-8 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-lg">{robot.name}</div>
                            <div className="text-sm text-muted-foreground">{robot.robotId}</div>
                          </div>
                          <Badge 
                            variant={robot.isActive && robot.status === 'online' ? 'default' : 'secondary'}
                            className={robot.isActive && robot.status === 'online' ? 'bg-green-500' : ''}
                          >
                            {robot.isActive && robot.status === 'online' ? '在线' : '离线'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="gap-2">
                            <Edit2 className="h-4 w-4" />
                            编辑
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2">
                            <Settings className="h-4 w-4" />
                            配置
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {robots.length === 0 && (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center text-muted-foreground">
                        <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>暂无机器人数据</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* 分组管理 */}
            <TabsContent value="groups" className="space-y-6">
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-5 w-5 text-purple-500" />
                    <CardTitle className="text-xl">分组管理</CardTitle>
                  </div>
                  <CardDescription>
                    创建和管理机器人分组，配置路由策略和负载均衡
                  </CardDescription>
                </CardHeader>
              </Card>
              <RobotGroupManager />
            </TabsContent>

            {/* 角色管理 */}
            <TabsContent value="roles" className="space-y-6">
              <Card className="border-l-4 border-l-amber-500">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-5 w-5 text-amber-500" />
                    <CardTitle className="text-xl">角色管理</CardTitle>
                  </div>
                  <CardDescription>
                    配置机器人角色、权限和操作范围
                  </CardDescription>
                </CardHeader>
              </Card>
              <RobotRoleManager />
            </TabsContent>

            {/* 指令发送 */}
            <TabsContent value="commands" className="space-y-6">
              <Card className="border-l-4 border-l-pink-500">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-5 w-5 text-pink-500" />
                    <CardTitle className="text-xl">指令发送</CardTitle>
                  </div>
                  <CardDescription>
                    向在线机器人发送指令，实时查看执行状态
                  </CardDescription>
                </CardHeader>
              </Card>
              <CommandSender />
            </TabsContent>

            {/* 监控大屏 */}
            <TabsContent value="monitor" className="space-y-6">
              <Card className="border-l-4 border-l-emerald-500">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="h-5 w-5 text-emerald-500" />
                    <CardTitle className="text-xl">监控大屏</CardTitle>
                  </div>
                  <CardDescription>
                    实时监控所有机器人状态、健康度和性能指标
                  </CardDescription>
                </CardHeader>
              </Card>
              <MonitoringDashboard />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
