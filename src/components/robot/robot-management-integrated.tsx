'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Activity
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
}

export default function RobotManagement() {
  const router = useRouter();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('robots');

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

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            机器人管理
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理机器人、分组、角色、指令和监控
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRobots} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            添加机器人
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{robots.length}</div>
                <div className="text-xs text-muted-foreground">总数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {robots.filter(r => r.isActive && r.status === 'online').length}
                </div>
                <div className="text-xs text-muted-foreground">在线</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {robots.filter(r => r.isActive && r.status === 'offline').length}
                </div>
                <div className="text-xs text-muted-foreground">离线</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {robots.filter(r => !r.isActive).length}
                </div>
                <div className="text-xs text-muted-foreground">停用</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-muted/50">
          <TabsTrigger value="robots" className="gap-2">
            <Bot className="h-4 w-4" />
            机器人列表
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <Building2 className="h-4 w-4" />
            分组管理
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            角色管理
          </TabsTrigger>
          <TabsTrigger value="commands" className="gap-2">
            <Sparkles className="h-4 w-4" />
            指令发送
          </TabsTrigger>
          <TabsTrigger value="monitor" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            监控大屏
          </TabsTrigger>
        </TabsList>

        {/* 机器人列表 */}
        <TabsContent value="robots" className="space-y-4">
          <div className="grid gap-4">
            {robots.map(robot => (
              <Card key={robot.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Bot className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{robot.name}</h3>
                          {getStatusBadge(robot.isActive, robot.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">{robot.robotId}</div>
                        {robot.description && (
                          <div className="text-sm">{robot.description}</div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>API: {robot.apiBaseUrl}</span>
                          {robot.company && <span>企业: {robot.company}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        编辑
                      </Button>
                      <Button variant="outline" size="sm">
                        配置
                      </Button>
                      <Button variant="outline" size="sm">
                        测试
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
    </div>
  );
}
