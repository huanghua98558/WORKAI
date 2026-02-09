'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
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
  MessageCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  PlayCircle,
  History,
  Link2,
  Copy,
  Trash2
} from 'lucide-react';

// 导入子组件
import RobotGroupManager from '@/components/robot/robot-group-manager';
import RobotRoleManager from '@/components/robot/robot-role-manager';
import RobotBusinessRoleManager from '@/components/robot/robot-business-role-manager';
import CommandSender from '@/components/robot/command-sender';
import MonitoringDashboard from '@/components/robot/monitoring-dashboard';
import WorkToolMessageSender from '@/components/robot/worktool-message-sender';
import WorkToolOnlineStatus from '@/components/robot/worktool-online-status';

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
  // 业务角色信息
  businessRoles?: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  // 回调地址（5个）
  messageCallbackUrl?: string;
  resultCallbackUrl?: string;
  qrcodeCallbackUrl?: string;
  onlineCallbackUrl?: string;
  offlineCallbackUrl?: string;
  // 通讯地址（8个）
  sendMessageApi?: string;
  updateApi?: string;
  getInfoApi?: string;
  onlineApi?: string;
  onlineInfosApi?: string;
  listRawMessageApi?: string;
  rawMsgListApi?: string;
  qaLogListApi?: string;
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
  // 新增：API 地址管理相关状态
  const [apiEndpointsOpen, setApiEndpointsOpen] = useState(false);
  const [callbackEndpointsOpen, setCallbackEndpointsOpen] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; timestamp: string }>>({});
  const [logsOpen, setLogsOpen] = useState(false);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // 新增：回调对话框状态
  const [showCallbackDialog, setShowCallbackDialog] = useState(false);
  const [showWorkToolDialog, setShowWorkToolDialog] = useState(false);
  
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
  // 注意：后端路由暂未实现，暂时注释掉
  // const checkAllRobotsStatus = async () => {
  //   try {
  //     const res = await fetch('/api/proxy/admin/robots/check-status-all', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({}),
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       if (data.code === 0) {
  //         console.log('机器人状态检查完成:', data.data);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('检查机器人状态失败:', error);
  //   }
  // };

  // 刷新机器人列表（注意：checkAllRobotsStatus 功能暂未实现）
  const handleRefresh = async () => {
    // 后端路由暂未实现，暂时注释掉
    // await checkAllRobotsStatus();
    await loadRobots();
  };

  // 加载机器人列表
  const loadRobots = async () => {
    setIsLoading(true);
    try {
      // 使用 /api/monitoring/robots-status API，与首页保持一致
      // 添加时间戳参数防止缓存
      const res = await fetch(`/api/monitoring/robots-status?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.code === 0 && data.data && data.data.robots) {
          // 加载业务角色信息
          const businessRolesRes = await fetch('/api/robots/business-roles');
          let businessRolesMap: Record<string, any[]> = {};

          if (businessRolesRes.ok) {
            const businessRolesData = await businessRolesRes.json();
            if (businessRolesData.success) {
              // 按 robotId 分组业务角色
              businessRolesMap = businessRolesData.data.reduce((acc: Record<string, any[]>, role: any) => {
                if (role.robotId) {
                  if (!acc[role.robotId]) {
                    acc[role.robotId] = [];
                  }
                  acc[role.robotId].push({
                    id: role.id,
                    name: role.name,
                    code: role.code,
                  });
                }
                return acc;
              }, {});
            }
          }

          // 将业务角色信息附加到机器人数据
          const robotsWithRoles = (data.data.robots || []).map((robot: Robot) => ({
            ...robot,
            businessRoles: businessRolesMap[robot.id] || [],
          }));

          setRobots(robotsWithRoles);
        }
      }
    } catch (error) {
      console.error('加载机器人列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 页面加载时加载机器人列表
    loadRobots();

    // 设置定时刷新：每5分钟刷新列表（注意：checkAllRobotsStatus 功能暂未实现）
    const refreshInterval = setInterval(() => {
      console.log('定时刷新机器人状态...');
      // 后端路由暂未实现，暂时注释掉
      // checkAllRobotsStatus().then(() => {
        loadRobots();
      // });
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

  const handleCallback = (robot: Robot) => {
    setSelectedRobot(robot);
    setShowCallbackDialog(true);
    // 重置测试结果
    setTestResults({});
    setApiLogs([]);
  };

  const handleWorkTool = (robot: Robot) => {
    setSelectedRobot(robot);
    setShowWorkToolDialog(true);
  };

  // 同步机器人信息
  const handleCheckStatus = async (robot: Robot) => {
    try {
      const res = await fetch(`/api/admin/robots/check-status/${robot.robotId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const result = await res.json();

      if (res.ok && result.code === 0) {
        // 刷新机器人列表以显示最新信息
        await loadRobots();
        const checkResult = result.data?.checkResult;
        // 只要 API 调用成功，就认为同步成功，不管机器人是否在线
        alert(`机器人信息同步成功！${checkResult?.message || ''}`);
      } else {
        alert('机器人信息同步失败：' + (result.message || '未知错误'));
      }
    } catch (error: any) {
      console.error('同步机器人信息失败:', error);
      alert('同步机器人信息失败：' + error.message);
    }
  };

  // 删除机器人
  const handleDelete = async (robot: Robot) => {
    if (!robot) return;

    // 确认对话框
    const confirmed = confirm(
      `确定要删除机器人 "${robot.name || robot.nickname || robot.robotId}" 吗？\n\n此操作不可撤销，删除后将无法恢复。`
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/robots/${robot.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const result = await res.json();

      if (res.ok && result.code === 0) {
        // 刷新机器人列表
        await loadRobots();
        alert('机器人删除成功！');
      } else {
        alert('机器人删除失败：' + (result.message || '未知错误'));
      }
    } catch (error: any) {
      console.error('删除机器人失败:', error);
      alert('删除机器人失败：' + error.message);
    }
  };

  // 重新生成地址
  const handleRegenerateUrls = async () => {
    if (!selectedRobot) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/robots/${selectedRobot.id}/regenerate-urls`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({})
      });

      const result = await response.json();

      if (result.code === 0) {
        // 更新选中的机器人
        setSelectedRobot(result.data);
        // 刷新机器人列表
        await loadRobots();
        alert('地址重新生成成功！');
      } else {
        alert('地址重新生成失败：' + result.message);
      }
    } catch (error: any) {
      console.error('重新生成地址失败:', error);
      alert('地址重新生成失败：' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 复制地址到剪贴板
  const handleCopyUrl = (url: string, label: string) => {
    if (!url || url === '未配置') {
      alert('地址未配置，无法复制');
      return;
    }
    navigator.clipboard.writeText(url).then(() => {
      alert(`${label}已复制到剪贴板`);
    }).catch((error) => {
      console.error('复制失败:', error);
      alert('复制失败，请手动复制');
    });
  };

  const handleSaveEdit = async () => {
    if (!selectedRobot) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch(`/api/admin/robots/${selectedRobot.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
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
      const res = await fetch(`/api/admin/robots/${selectedRobot.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
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
      const res = await fetch('/api/admin/robots/test', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          robotId: selectedRobot.robotId,
          apiBaseUrl: selectedRobot.apiBaseUrl,
        }),
      });

      const result = await res.json();

      if (res.ok && result.code === 0) {
        setTestResult({
          success: true,
          message: result.message,
          robotDetails: result.robotDetails,
          responseTime: '< 1000ms',
        });
      } else {
        setTestError(result.message || '测试失败');
      }
    } catch (error: any) {
      setTestError(error.message || '网络错误，测试失败');
    } finally {
      setIsTesting(false);
    }
  };

  // 测试单个 API 接口
  const handleTestEndpoint = async (endpointType: string) => {
    if (!selectedRobot) return;
    
    setTestingEndpoint(endpointType);
    try {
      const response = await fetch(`/api/admin/robots/${selectedRobot.id}/api-endpoints/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ endpointType })
      });
      
      const result = await response.json();
      
      if (result.code === 0) {
        setTestResults({
          ...testResults,
          [endpointType]: {
            success: result.data.success,
            message: result.data.message,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        setTestResults({
          ...testResults,
          [endpointType]: {
            success: false,
            message: result.message || '测试失败',
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error: any) {
      setTestResults({
        ...testResults,
        [endpointType]: {
          success: false,
          message: '测试请求失败',
          timestamp: new Date().toISOString()
        }
      });
    } finally {
      setTestingEndpoint(null);
    }
  };

  // 批量测试所有通讯地址
  const handleTestAllEndpoints = async () => {
    if (!selectedRobot) return;
    
    setTestingEndpoint('all');
    try {
      const response = await fetch(`/api/admin/robots/${selectedRobot.id}/api-endpoints/test-all`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      const result = await response.json();
      
      if (result.code === 0) {
        const newResults: Record<string, { success: boolean; message: string; timestamp: string }> = {};
        result.data.forEach((item: any) => {
          newResults[item.endpointType] = {
            success: item.success,
            message: item.message,
            timestamp: new Date().toISOString()
          };
        });
        setTestResults(newResults);
      }
    } catch (error: any) {
      console.error('批量测试失败:', error);
    } finally {
      setTestingEndpoint(null);
    }
  };

  // 获取接口调用日志
  const handleLoadLogs = async () => {
    if (!selectedRobot) return;
    
    setLogsLoading(true);
    try {
      const response = await fetch(`/api/admin/robots/${selectedRobot.id}/api-endpoints/logs?page=1&pageSize=20`, {
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      
      if (result.code === 0) {
        setApiLogs(result.data.list || []);
      }
    } catch (error: any) {
      console.error('获取日志失败:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  // 打开日志面板时自动加载
  useEffect(() => {
    if (logsOpen && selectedRobot) {
      handleLoadLogs();
    }
  }, [logsOpen, selectedRobot]);

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
      const res = await fetch('/api/admin/robots', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(addFormData),
      });

      const result = await res.json();

      if (res.ok && result.code === 0) {
        setSaveSuccess(true);
        
        // 立即将新机器人添加到列表中（乐观更新）
        const newRobot = result.data;
        setRobots(prev => [...prev, newRobot]);
        
        // 然后刷新完整的机器人列表
        await loadRobots();
        
        // 延迟关闭对话框，让用户看到成功提示
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
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
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
        <TabsList className="grid w-full grid-cols-6 h-14 bg-white/90 backdrop-blur-md border-2 border-slate-200/80 shadow-lg shadow-slate-200/50 rounded-2xl p-1.5 mb-6">
          <TabsTrigger value="robots" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
            <Bot className="h-5 w-5" />
            机器人列表
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
            <Building2 className="h-5 w-5" />
            分组管理
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
            <ShieldCheck className="h-5 w-5" />
            角色管理
          </TabsTrigger>
          <TabsTrigger value="business-roles" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
            <Activity className="h-5 w-5" />
            业务角色
          </TabsTrigger>
          <TabsTrigger value="commands" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
            <Sparkles className="h-5 w-5" />
            指令发送
          </TabsTrigger>
          <TabsTrigger value="monitor" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
            <BarChart3 className="h-5 w-5" />
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold">{robot.name || robot.nickname || '未命名机器人'}</h3>
                            {getStatusBadge(robot.isActive, robot.status)}
                            {/* 业务角色标志 */}
                            {robot.businessRoles && robot.businessRoles.length > 0 && (
                              <div className="flex items-center gap-1 ml-2">
                                {robot.businessRoles.map((role) => (
                                  <Badge 
                                    key={role.id} 
                                    variant="outline" 
                                    className="text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                  >
                                    {role.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {robot.company && robot.nickname 
                              ? `${robot.company} - ${robot.nickname}` 
                              : robot.company || robot.nickname || ''}
                          </div>
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCallback(robot)}
                        >
                          <Link2 className="h-4 w-4 mr-2" />
                          回调
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCheckStatus(robot)}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          同步信息
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleWorkTool(robot)}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          WorkTool
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDelete(robot)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
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

        {/* 业务角色管理 */}
        <TabsContent value="business-roles">
          <RobotBusinessRoleManager />
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

      {/* 编辑机器人对话框 */}
      {showEditDialog && selectedRobot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>编辑机器人</CardTitle>
              <CardDescription>编辑机器人配置和查看 API 地址</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">机器人名称</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">机器人ID</label>
                  <input
                    type="text"
                    value={editFormData.robotId}
                    disabled
                    className="w-full p-2 border rounded bg-muted"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">描述</label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
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
              <Button onClick={handleSaveEdit} disabled={isSaving}>
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

      {/* 回调与通讯地址对话框 */}
      {showCallbackDialog && selectedRobot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>回调与通讯地址 - {selectedRobot.name}</CardTitle>
              <CardDescription>查看和管理机器人的回调地址与通讯地址</CardDescription>
            </CardHeader>
            <CardContent>
              {/* 提示和操作栏 */}
              <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {selectedRobot.messageCallbackUrl ? '地址已生成' : '地址未生成，请点击按钮生成'}
                </div>
                <Button size="sm" onClick={handleRegenerateUrls} disabled={isSaving}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
                  {isSaving ? '生成中...' : '重新生成地址'}
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* 通讯地址折叠面板 */}
                <div className="space-y-4">
                  <Collapsible open={apiEndpointsOpen} onOpenChange={setApiEndpointsOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          <span>通讯地址（8个）</span>
                        </div>
                        {apiEndpointsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      <div className="flex justify-end mb-2">
                        <Button size="sm" onClick={handleTestAllEndpoints} disabled={testingEndpoint === 'all'}>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          批量测试
                        </Button>
                      </div>
                      {[
                        { key: 'sendMessageApi', label: '发送消息', type: 'sendMessage' },
                        { key: 'updateApi', label: '机器人后端通讯加密地址', type: 'update' },
                        { key: 'getInfoApi', label: '获取机器人信息地址', type: 'getInfo' },
                        { key: 'onlineApi', label: '查询机器人是否在线地址', type: 'online' },
                        { key: 'onlineInfosApi', label: '查询机器人登录日志地址', type: 'onlineInfos' },
                        { key: 'listRawMessageApi', label: '指令消息API调用查询地址', type: 'listRawMessage' },
                        { key: 'rawMsgListApi', label: '指令执行结果查询地址', type: 'rawMsgList' },
                        { key: 'qaLogListApi', label: '机器人消息回调日志列表查询地址', type: 'qaLogList' }
                      ].map(endpoint => (
                        <div key={endpoint.key} className="flex items-center gap-2 p-2 border rounded-lg bg-secondary/30">
                          <div className="flex-1">
                            <div className="text-sm font-medium">{endpoint.label}</div>
                            <div className="text-xs text-muted-foreground break-all">
                              {selectedRobot[endpoint.key as keyof Robot] as string || '未配置'}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyUrl(selectedRobot[endpoint.key as keyof Robot] as string, endpoint.label)}
                            title="复制地址"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestEndpoint(endpoint.type)}
                            disabled={testingEndpoint === endpoint.type}
                            title="测试接口"
                          >
                            {testingEndpoint === endpoint.type ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <PlayCircle className="w-4 h-4" />
                            )}
                          </Button>
                          {testResults[endpoint.type] && (
                            <Badge variant={testResults[endpoint.type].success ? "default" : "destructive"}>
                              {testResults[endpoint.type].success ? '成功' : '失败'}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* 回调地址折叠面板 */}
                  <Collapsible open={callbackEndpointsOpen} onOpenChange={setCallbackEndpointsOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          <span>回调地址（5个）</span>
                        </div>
                        {callbackEndpointsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {[
                        { key: 'messageCallbackUrl', label: '消息回调' },
                        { key: 'resultCallbackUrl', label: '执行结果回调' },
                        { key: 'qrcodeCallbackUrl', label: '群二维码回调' },
                        { key: 'onlineCallbackUrl', label: '机器人上线回调' },
                        { key: 'offlineCallbackUrl', label: '机器人下线回调' }
                      ].map(endpoint => (
                        <div key={endpoint.key} className="flex items-center gap-2 p-2 border rounded-lg bg-secondary/30">
                          <div className="flex-1">
                            <div className="text-sm font-medium">{endpoint.label}</div>
                            <div className="text-xs text-muted-foreground break-all">
                              {selectedRobot[endpoint.key as keyof Robot] as string || '未配置'}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyUrl(selectedRobot[endpoint.key as keyof Robot] as string, endpoint.label)}
                            title="复制地址"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* 接口调用日志折叠面板 */}
                  <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4" />
                          <span>接口调用日志</span>
                        </div>
                        {logsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="max-h-60 overflow-y-auto border rounded-lg p-2">
                        {logsLoading ? (
                          <div className="text-center text-muted-foreground py-4">加载中...</div>
                        ) : apiLogs.length === 0 ? (
                          <div className="text-center text-muted-foreground py-4">暂无日志</div>
                        ) : (
                          <div className="space-y-2">
                            {apiLogs.map((log: any, index: number) => (
                              <div key={index} className="text-xs p-2 border rounded">
                                <div className="flex justify-between items-start">
                                  <span className="font-medium">{log.endpoint_type}</span>
                                  <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                                    {log.status}
                                  </Badge>
                                </div>
                                <div className="text-muted-foreground mt-1">
                                  {new Date(log.created_at).toLocaleString()}
                                </div>
                                {log.error_message && (
                                  <div className="text-red-500 mt-1">{log.error_message}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowCallbackDialog(false)}>
                关闭
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* WorkTool 功能对话框 */}
      {showWorkToolDialog && selectedRobot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>WorkTool 功能 - {selectedRobot.name}</CardTitle>
              <CardDescription>使用 WorkTool API 发送消息和管理机器人</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="send-message" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="send-message">发送消息</TabsTrigger>
                  <TabsTrigger value="status">在线状态</TabsTrigger>
                  <TabsTrigger value="info">机器人信息</TabsTrigger>
                  <TabsTrigger value="logs">消息日志</TabsTrigger>
                </TabsList>

                <TabsContent value="send-message" className="space-y-4 mt-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      发送消息给企业微信用户。支持文本、图片、视频三种类型。
                    </p>
                  </div>
                  <WorkToolMessageSender
                    robotId={selectedRobot.robotId}
                    onSendSuccess={() => {
                      toast.success('消息发送成功');
                    }}
                    onSendError={(error) => {
                      toast.error('消息发送失败: ' + error);
                    }}
                  />
                </TabsContent>

                <TabsContent value="status" className="space-y-4 mt-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      实时显示机器人的在线状态。
                    </p>
                  </div>
                  <WorkToolOnlineStatus
                    robotId={selectedRobot.robotId}
                    showDetails={true}
                    autoRefresh={true}
                    refreshInterval={30000}
                  />
                </TabsContent>

                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      查看机器人的详细信息。
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">机器人ID</label>
                      <div className="p-2 border rounded bg-muted text-sm">{selectedRobot.robotId}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">机器人名称</label>
                      <div className="p-2 border rounded bg-muted text-sm">{selectedRobot.name}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">公司</label>
                      <div className="p-2 border rounded bg-muted text-sm">{selectedRobot.company || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">昵称</label>
                      <div className="p-2 border rounded bg-muted text-sm">{selectedRobot.nickname || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">IP地址</label>
                      <div className="p-2 border rounded bg-muted text-sm">{selectedRobot.ipAddress || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">激活时间</label>
                      <div className="p-2 border rounded bg-muted text-sm">{selectedRobot.activatedAt ? new Date(selectedRobot.activatedAt).toLocaleString('zh-CN') : '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">过期时间</label>
                      <div className="p-2 border rounded bg-muted text-sm">{selectedRobot.expiresAt ? new Date(selectedRobot.expiresAt).toLocaleString('zh-CN') : '-'}</div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="logs" className="space-y-4 mt-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      查看机器人的消息日志。
                    </p>
                  </div>
                  <div className="p-4 text-center text-muted-foreground">
                    消息日志功能开发中...
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowWorkToolDialog(false)}>
                关闭
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
