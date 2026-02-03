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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  
  // 表单状态
  const [editFormData, setEditFormData] = useState({
    name: '',
    robotId: '',
    description: '',
  });
  const [configFormData, setConfigFormData] = useState({
    apiBaseUrl: '',
    isActive: true,
  });
  const [addFormData, setAddFormData] = useState({
    name: '',
    robotId: '',
    apiBaseUrl: '',
    description: '',
    company: '',
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 检查所有机器人状态
  const checkAllRobotsStatus = async () => {
    try {
      const res = await fetch('/api/proxy/admin/robots/check-status-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 0) {
          console.log('机器人状态检查完成:', data.data);
        }
      }
    } catch (error) {
      console.error('检查机器人状态失败:', error);
    }
  };

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
    // 页面加载时先检查一次机器人状态
    checkAllRobotsStatus();
    // 然后加载机器人列表
    loadRobots();

    // 设置定时刷新：每5分钟检查一次状态并刷新列表
    const refreshInterval = setInterval(() => {
      console.log('定时刷新机器人状态...');
      checkAllRobotsStatus().then(() => {
        loadRobots();
      });
    }, 5 * 60 * 1000); // 5分钟

    // 组件卸载时清除定时器
    return () => clearInterval(refreshInterval);
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
    setEditFormData({
      name: robot.name,
      robotId: robot.robotId,
      description: robot.description || '',
    });
    setShowEditDialog(true);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleConfig = (robot: Robot) => {
    setSelectedRobot(robot);
    setConfigFormData({
      apiBaseUrl: robot.apiBaseUrl,
      isActive: robot.isActive,
    });
    setShowConfigDialog(true);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleTest = (robot: Robot) => {
    setSelectedRobot(robot);
    setShowTestDialog(true);
    setTestResult(null);
    setTestError(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedRobot) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch(`/api/proxy/admin/robots/${selectedRobot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      const result = await res.json();

      if (res.ok) {
        setSaveSuccess(true);
        // 刷新机器人列表
        await loadRobots();
      } else {
        setSaveError(result.message || '保存失败');
      }
    } catch (error: any) {
      setSaveError(error.message || '网络错误，保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedRobot) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch(`/api/proxy/admin/robots/${selectedRobot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configFormData),
      });

      const result = await res.json();

      if (res.ok) {
        setSaveSuccess(true);
        // 刷新机器人列表
        await loadRobots();
      } else {
        setSaveError(result.message || '保存失败');
      }
    } catch (error: any) {
      setSaveError(error.message || '网络错误，保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const executeTest = async () => {
    if (!selectedRobot) return;

    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const res = await fetch(`/api/proxy/admin/robots/${selectedRobot.id}/test`, {
        method: 'POST',
      });
      
      const result = await res.json();
      
      if (res.ok) {
        setTestResult(result);
      } else {
        setTestError(result.message || '测试失败');
      }
    } catch (error: any) {
      setTestError(error.message || '网络错误，测试失败');
    } finally {
      setIsTesting(false);
    }
  };

  const handleAdd = () => {
    setShowAddDialog(true);
    setAddFormData({
      name: '',
      robotId: '',
      apiBaseUrl: 'https://api.worktool.ymdyes.cn/wework/',
      description: '',
      company: '',
      isActive: true,
    });
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSaveAdd = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch('/api/proxy/admin/robots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addFormData),
      });

      const result = await res.json();

      if (res.ok) {
        setSaveSuccess(true);
        // 刷新机器人列表
        await loadRobots();
        // 延迟关闭对话框
        setTimeout(() => {
          setShowAddDialog(false);
        }, 1500);
      } else {
        setSaveError(result.message || '添加失败');
      }
    } catch (error: any) {
      setSaveError(error.message || '网络错误，添加失败');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const getRunningTime = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diff = now.getTime() - created.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}天 ${hours}小时`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  const getRemainingTime = (expiresAt?: string) => {
    if (!expiresAt) return '永久';
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return '已过期';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 365) {
      return '永久';
    } else if (days > 0) {
      return `${days}天`;
    } else {
      return `${hours}小时`;
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
          <Button onClick={handleAdd}>
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
                      
                      <div>
                        <div className="text-muted-foreground mb-1 flex items-center gap-2">
                          <Activity className="h-3 w-3" />
                          已运行时间
                        </div>
                        <div className="font-medium">{getRunningTime(robot.createdAt)}</div>
                      </div>
                      
                      <div>
                        <div className="text-muted-foreground mb-1 flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          剩余时间
                        </div>
                        <div className="font-medium">{getRemainingTime(robot.expiresAt)}</div>
                      </div>
                      
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

      {/* 添加机器人对话框 */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>添加机器人</CardTitle>
              <CardDescription>添加新的机器人到系统</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">机器人名称 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入机器人名称"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">机器人ID <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={addFormData.robotId}
                    onChange={(e) => setAddFormData({ ...addFormData, robotId: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入机器人ID"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">API Base URL <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={addFormData.apiBaseUrl}
                    onChange={(e) => setAddFormData({ ...addFormData, apiBaseUrl: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://api.example.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">企业名称</label>
                  <input
                    type="text"
                    value={addFormData.company}
                    onChange={(e) => setAddFormData({ ...addFormData, company: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入企业名称（可选）"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">描述</label>
                  <textarea
                    value={addFormData.description}
                    onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                    className="w-full p-2 border rounded min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入机器人描述（可选）"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="addIsActive"
                    checked={addFormData.isActive}
                    onChange={(e) => setAddFormData({ ...addFormData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="addIsActive" className="text-sm">启用机器人</label>
                </div>

                {/* 保存反馈 */}
                {saveSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    ✓ 添加成功，即将关闭...
                  </div>
                )}
                {saveError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    ✗ {saveError}
                  </div>
                )}
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={isSaving}>
                取消
              </Button>
              <Button 
                onClick={handleSaveAdd} 
                disabled={isSaving || !addFormData.name.trim() || !addFormData.robotId.trim() || !addFormData.apiBaseUrl.trim()}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    添加中...
                  </>
                ) : (
                  '添加'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

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
                  <label className="text-sm font-medium mb-1 block">机器人ID <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editFormData.robotId}
                    onChange={(e) => setEditFormData({ ...editFormData, robotId: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入机器人ID"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">机器人名称 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入机器人名称"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">描述</label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full p-2 border rounded min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入机器人描述"
                  />
                </div>

                {/* 保存反馈 */}
                {saveSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    ✓ 保存成功
                  </div>
                )}
                {saveError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    ✗ {saveError}
                  </div>
                )}
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSaving || !editFormData.name.trim() || !editFormData.robotId.trim()}>
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
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
                  <label className="text-sm font-medium mb-1 block">机器人ID</label>
                  <div className="p-2 border rounded bg-muted text-sm">{selectedRobot.robotId}</div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">API Base URL <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={configFormData.apiBaseUrl}
                    onChange={(e) => setConfigFormData({ ...configFormData, apiBaseUrl: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://api.example.com"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={configFormData.isActive}
                    onChange={(e) => setConfigFormData({ ...configFormData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-sm">启用机器人</label>
                </div>

                {/* 保存反馈 */}
                {saveSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    ✓ 保存成功
                  </div>
                )}
                {saveError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    ✗ {saveError}
                  </div>
                )}
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                取消
              </Button>
              <Button onClick={handleSaveConfig} disabled={isSaving || !configFormData.apiBaseUrl.trim()}>
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存配置'
                )}
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
                  <div className="mt-1 p-2 border rounded break-all">{selectedRobot.apiBaseUrl}</div>
                </div>
                
                {/* 测试状态 */}
                {isTesting && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                      <span className="font-medium text-blue-700">正在测试中...</span>
                    </div>
                    <div className="mt-2 text-sm text-blue-600">
                      请稍候，正在连接机器人服务器...
                    </div>
                  </div>
                )}

                {/* 测试结果 - 成功 */}
                {testResult && !isTesting && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-700">测试成功</span>
                    </div>
                    <div className="text-sm text-green-600 space-y-1">
                      <p>✓ 机器人连接正常</p>
                      <p>✓ API 验证通过</p>
                      <p>✓ 响应时间: {testResult.responseTime || '< 1000ms'}</p>
                      {testResult.message && (
                        <p>✓ {testResult.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 测试结果 - 失败 */}
                {testError && !isTesting && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-red-700">测试失败</span>
                    </div>
                    <div className="text-sm text-red-600">
                      {testError}
                    </div>
                  </div>
                )}

                {/* 测试步骤 - 只在未测试时显示 */}
                {!isTesting && !testResult && !testError && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    <div className="font-semibold mb-2">测试步骤：</div>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>连接到机器人服务器</li>
                      <li>验证 API 密钥</li>
                      <li>获取机器人状态</li>
                      <li>检查响应时间</li>
                    </ol>
                  </div>
                )}
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                关闭
              </Button>
              {!isTesting && !testResult && (
                <Button onClick={executeTest}>
                  开始测试
                </Button>
              )}
              {testResult && (
                <Button onClick={executeTest}>
                  重新测试
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
