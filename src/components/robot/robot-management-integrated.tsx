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
  Activity,
  Globe,
  Server,
  Clock,
  Edit3,
  Settings,
  TestTube,
  ToggleLeft,
  ToggleRight,
  MessageCircle
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
}

export default function RobotManagement() {
  const router = useRouter();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('robots');
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);

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

  const handleEdit = (robot: Robot) => {
    setSelectedRobot(robot);
    setShowEditDialog(true);
  };

  const handleConfig = (robot: Robot) => {
    setSelectedRobot(robot);
    setShowConfigDialog(true);
  };

  const handleTest = async (robot: Robot) => {
    setSelectedRobot(robot);
    setShowTestDialog(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
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
                  <div className="space-y-4">
                    {/* 顶部：名称、状态、操作按钮 */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Bot className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{robot.name}</h3>
                            {getStatusBadge(robot.isActive, robot.status)}
                            {robot.nickname && (
                              <Badge variant="outline" className="text-xs">{robot.nickname}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{robot.robotId}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(robot)}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          编辑
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleConfig(robot)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          配置
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTest(robot)}
                        >
                          <TestTube className="h-4 w-4 mr-2" />
                          测试
                        </Button>
                      </div>
                    </div>

                    {/* 描述 */}
                    {robot.description && (
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        {robot.description}
                      </div>
                    )}

                    {/* 详细信息 */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1 flex items-center gap-2">
                          <Globe className="h-3 w-3" />
                          API 地址
                        </div>
                        <div className="font-medium break-all">{robot.apiBaseUrl}</div>
                      </div>
                      
                      {robot.company && (
                        <div>
                          <div className="text-muted-foreground mb-1 flex items-center gap-2">
                            <Building2 className="h-3 w-3" />
                            企业
                          </div>
                          <div className="font-medium">{robot.company}</div>
                        </div>
                      )}
                      
                      {robot.ipAddress && (
                        <div>
                          <div className="text-muted-foreground mb-1 flex items-center gap-2">
                            <Server className="h-3 w-3" />
                            IP 地址
                          </div>
                          <div className="font-medium">{robot.ipAddress}</div>
                        </div>
                      )}
                      
                      <div>
                        <div className="text-muted-foreground mb-1 flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          创建时间
                        </div>
                        <div className="font-medium">{formatDate(robot.createdAt)}</div>
                      </div>
                      
                      {robot.lastCheckAt && (
                        <div>
                          <div className="text-muted-foreground mb-1 flex items-center gap-2">
                            <Activity className="h-3 w-3" />
                            最后检查
                          </div>
                          <div className="font-medium">{formatDate(robot.lastCheckAt)}</div>
                        </div>
                      )}
                      
                      {robot.messageCallbackEnabled !== undefined && (
                        <div>
                          <div className="text-muted-foreground mb-1 flex items-center gap-2">
                            <MessageCircle className="h-3 w-3" />
                            消息回调
                          </div>
                          <div className="font-medium">
                            {robot.messageCallbackEnabled ? (
                              <Badge className="bg-green-500">已开启</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600">未开启</Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <div className="text-muted-foreground mb-1 flex items-center gap-2">
                          {robot.isActive ? <ToggleRight className="h-3 w-3 text-green-500" /> : <ToggleLeft className="h-3 w-3 text-gray-500" />}
                          状态
                        </div>
                        <div className="font-medium">
                          {robot.isActive ? '已启用' : '已停用'}
                          {robot.isValid !== undefined && (
                            <Badge variant={robot.isValid ? 'outline' : 'destructive'} className="ml-2 text-xs">
                              {robot.isValid ? '有效' : '无效'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 错误信息 */}
                    {robot.lastError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                        <div className="font-semibold mb-1">最后错误：</div>
                        <div>{robot.lastError}</div>
                      </div>
                    )}
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

      {/* 编辑对话框 */}
      {showEditDialog && selectedRobot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>编辑机器人</CardTitle>
              <CardDescription>修改机器人基本信息</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">机器人名称</label>
                  <div className="mt-1 p-2 border rounded">{selectedRobot.name}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">描述</label>
                  <div className="mt-1 p-2 border rounded min-h-[80px]">
                    {selectedRobot.description || '暂无描述'}
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                取消
              </Button>
              <Button onClick={() => setShowEditDialog(false)}>
                保存
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 配置对话框 */}
      {showConfigDialog && selectedRobot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>机器人配置</CardTitle>
              <CardDescription>配置机器人的高级选项</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">机器人ID</label>
                  <div className="mt-1 p-2 border rounded">{selectedRobot.robotId}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">API Base URL</label>
                  <div className="mt-1 p-2 border rounded">{selectedRobot.apiBaseUrl}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={selectedRobot.isActive} />
                  <label htmlFor="isActive" className="text-sm">启用机器人</label>
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                取消
              </Button>
              <Button onClick={() => setShowConfigDialog(false)}>
                保存配置
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 测试对话框 */}
      {showTestDialog && selectedRobot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>测试机器人</CardTitle>
              <CardDescription>测试机器人连接是否正常</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">测试机器人</label>
                  <div className="mt-1 p-2 border rounded">{selectedRobot.name}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">API 地址</label>
                  <div className="mt-1 p-2 border rounded">{selectedRobot.apiBaseUrl}</div>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  <div className="font-semibold mb-2">测试步骤：</div>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>连接到机器人服务器</li>
                    <li>验证 API 密钥</li>
                    <li>获取机器人状态</li>
                    <li>检查响应时间</li>
                  </ol>
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                取消
              </Button>
              <Button onClick={() => setShowTestDialog(false)}>
                开始测试
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
