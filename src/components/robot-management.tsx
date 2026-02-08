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
  Filter,
  ArrowUpDown
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 导入API工具类
import { adminRobotApi, ResponseHelper, type Robot as ApiRobot } from '@/lib/api';

// 导入新的组件
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
  // WorkTool 详细信息
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRobot, setEditingRobot] = useState<Robot | null>(null);
  const [activeSubTab, setActiveSubTab] = useState('list'); // 新增子标签页状态
  const [formData, setFormData] = useState<RobotFormData>({
    name: '',
    robotId: '',
    apiBaseUrl: process.env.NEXT_PUBLIC_WORKTOOL_API_BASE_URL || 'https://api.worktool.ymdyes.cn/wework/',
    description: '',
    isActive: true
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; timestamp?: string }>>({});
  const [formTestResult, setFormTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingRobotId, setTestingRobotId] = useState<string | null>(null);
  const [callbackUrls, setCallbackUrls] = useState<Record<string, string>>({});
  const [callbackConfigs, setCallbackConfigs] = useState<Record<string, any[]>>({});
  const [configuringRobotId, setConfiguringRobotId] = useState<string | null>(null);
  const [queryingRobotId, setQueryingRobotId] = useState<string | null>(null);
  const [refreshingRobotId, setRefreshingRobotId] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  
  // 新增筛选和排序状态
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'createdAt' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 加载机器人列表
  const loadRobots = async () => {
    setIsLoading(true);
    try {
      // 使用新的API工具类
      const response = await adminRobotApi.getList();

      if (ResponseHelper.isSuccess(response)) {
        // 类型断言，因为api-robot的Robot类型和组件的Robot类型有差异
        setRobots((response.data || []) as Robot[]);
        console.log('[loadRobots] 加载成功，机器人数量:', response.data?.length || 0);
      } else {
        console.error('[loadRobots] 加载失败:', response.message);
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

  // 计算运行时间
  const calculateRunTime = (robot: Robot) => {
    if (robot.activatedAt) {
      const now = new Date();
      const activatedTime = new Date(robot.activatedAt);
      const diffMs = now.getTime() - activatedTime.getTime();
      
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        return `${days}天${hours}小时${minutes}分钟`;
      } else if (hours > 0) {
        return `${hours}小时${minutes}分钟`;
      } else {
        return `${minutes}分钟`;
      }
    }
    return '未知';
  };

  // 计算剩余时间
  const calculateRemainingTime = (robot: Robot) => {
    if (robot.expiresAt) {
      const now = new Date();
      const expiresTime = new Date(robot.expiresAt);
      const diffMs = expiresTime.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        return '已过期';
      }
      
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 365) {
        const years = Math.floor(days / 365);
        return `${years}年`;
      } else if (days > 0) {
        return `${days}天`;
      } else if (hours > 0) {
        return `${hours}小时`;
      } else {
        return `${minutes}分钟`;
      }
    }
    return '未知';
  };

  // 打开创建对话框
  const handleCreate = () => {
    setEditingRobot(null);
    setFormData({
      name: '',
      robotId: '',
      apiBaseUrl: process.env.NEXT_PUBLIC_WORKTOOL_API_BASE_URL || 'https://api.worktool.ymdyes.cn/wework/',
      description: '',
      isActive: true
    });
    setValidationErrors([]);
    setFormTestResult(null);
    setIsDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (robot: Robot) => {
    setEditingRobot(robot);
    setFormData({
      name: robot.name,
      robotId: robot.robotId,
      apiBaseUrl: robot.apiBaseUrl,
      description: robot.description || '',
      isActive: robot.isActive
    });
    setValidationErrors([]);
    setFormTestResult(null);
    setIsDialogOpen(true);
  };

  // 筛选和排序机器人列表
  const getFilteredAndSortedRobots = () => {
    let filtered = [...robots];
    
    // 按状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(robot => robot.isActive && robot.status === statusFilter);
    }
    
    // 排序
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-CN');
          break;
        case 'status':
          // 在线在前，离线在后，已停用在最后
          const statusPriority = { 'online': 0, 'offline': 1, 'unknown': 2 };
          const aStatus = a.isActive ? (statusPriority[a.status] || 2) : 3;
          const bStatus = b.isActive ? (statusPriority[b.status] || 2) : 3;
          comparison = aStatus - bStatus;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        default:
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  };

  // 验证配置
  const validateConfig = async () => {
    try {
      const res = await fetch('/api/admin/robots/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robotId: formData.robotId,
          apiBaseUrl: formData.apiBaseUrl
        })
      });

      const data = await res.json();
      if (data.code === 0) {
        setValidationErrors(data.data.errors || []);
        if (!data.data.valid) {
          // 验证失败时，等待用户看到错误信息后再返回
          // 这里不阻止保存，让用户看到错误信息后可以决定是否继续
        }
        return data.data.valid;
      }
      setValidationErrors(['验证服务请求失败']);
      return false;
    } catch (error) {
      console.error('验证配置失败:', error);
      setValidationErrors(['网络错误，无法验证配置']);
      return false;
    }
  };

  // 测试连接
  const testConnection = async (robotId?: string) => {
    const targetRobotId = robotId || formData.robotId;
    const targetApiBaseUrl = robotId ? robots.find(r => r.robotId === robotId)?.apiBaseUrl : formData.apiBaseUrl;

    if (!targetApiBaseUrl) return;

    // 如果是表单测试
    if (!robotId) {
      setTestingRobotId('form');
      try {
        const res = await fetch('/api/proxy/admin/robots/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            robotId: 'test',
            apiBaseUrl: targetApiBaseUrl
          })
        });

        const data = await res.json();
        setFormTestResult({
          success: data.code === 0,
          message: data.message || '连接成功'
        });
      } catch (error) {
        setFormTestResult({
          success: false,
          message: '测试失败：网络错误，请检查 API Base URL 是否正确'
        });
      } finally {
        setTestingRobotId(null);
      }
      return;
    }

    // 机器人测试
    if (!targetRobotId) return;

    setTestingRobotId(targetRobotId);

    try {
      const res = await fetch('/api/proxy/admin/robots/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robotId: targetRobotId,
          apiBaseUrl: targetApiBaseUrl
        })
      });

      const data = await res.json();
      setTestResults(prev => ({
        ...prev,
        [targetRobotId]: {
          success: data.code === 0,
          message: data.message,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [targetRobotId]: {
          success: false,
          message: '测试失败：网络错误',
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setTestingRobotId(null);
    }
  };

  // 保存机器人
  const handleSave = async () => {
    // 先验证配置（但不阻止保存）
    const isValid = await validateConfig();
    
    // 如果验证失败，询问用户是否继续
    if (!isValid && validationErrors.length > 0) {
      const shouldContinue = confirm(
        `配置验证失败：\n${validationErrors.join('\n')}\n\n是否继续保存？`
      );
      if (!shouldContinue) {
        return;
      }
    }

    // 检查必填字段
    if (!formData.name.trim()) {
      alert('请输入机器人名称');
      return;
    }
    if (!formData.robotId.trim()) {
      alert('请输入 Robot ID');
      return;
    }
    if (!formData.apiBaseUrl.trim()) {
      alert('请输入 API Base URL');
      return;
    }

    try {
      const url = editingRobot 
        ? `/api/admin/robots/${editingRobot.id}`
        : '/api/admin/robots';
      
      const method = editingRobot ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      
      if (data.code === 0) {
        setIsDialogOpen(false);
        setValidationErrors([]);
        loadRobots();
        alert(editingRobot ? '更新成功' : '添加成功');
      } else {
        alert(data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存机器人失败:', error);
      alert('保存失败，请检查网络连接');
    }
  };

  // 删除机器人
  const handleDelete = async (robot: Robot) => {
    if (!confirm(`确定要删除机器人 "${robot.name}" 吗？`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/robots/${robot.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      
      if (data.code === 0) {
        loadRobots();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除机器人失败:', error);
      alert('删除失败，请检查网络连接');
    }
  };

  // 检查状态（刷新机器人信息）
  const handleCheckStatus = async (robot: Robot) => {
    setRefreshingRobotId(robot.robotId);
    try {
      const res = await fetch(`/api/proxy/admin/robots/check-status/${robot.robotId}`, {
        method: 'POST'
      });

      const data = await res.json();
      if (data.code === 0) {
        loadRobots();
        alert(`机器人 "${robot.name}" 信息已更新！`);
      } else {
        alert(`更新失败：${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('检查状态失败:', error);
      alert(`更新失败：网络错误`);
    } finally {
      setRefreshingRobotId(null);
    }
  };

  // 一键刷新所有机器人
  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    try {
      const res = await fetch('/api/proxy/admin/robots/check-status-all', {
        method: 'POST'
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('批量刷新失败，HTTP状态:', res.status, errorText);
        alert(`批量刷新失败：HTTP ${res.status} - ${errorText || '未知错误'}`);
        return;
      }

      const data = await res.json();
      if (data.code === 0) {
        loadRobots();
        alert(data.message || '批量刷新完成！');
      } else {
        alert(`批量刷新失败：${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('批量刷新失败:', error);
      alert('批量刷新失败：网络错误');
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // 复制 Robot ID
  const copyRobotId = (robotId: string) => {
    navigator.clipboard.writeText(robotId);
  };

  // 获取回调地址
  const getCallbackUrl = async (robot: Robot) => {
    try {
      const res = await fetch(`/api/admin/robots/${robot.id}/callback-url`);
      const data = await res.json();

      if (data.code === 0) {
        setCallbackUrls(prev => ({
          ...prev,
          [robot.id]: data.data.callbackUrl
        }));
      }
    } catch (error) {
      console.error('获取回调地址失败:', error);
    }
  };

  // 复制回调地址
  const copyCallbackUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('回调地址已复制到剪贴板');
  };

  // 配置回调地址
  const configCallback = async (robot: Robot) => {
    if (!confirm(`确定要为机器人 "${robot.name}" 配置回调地址吗？`)) {
      return;
    }

    setConfiguringRobotId(robot.id);

    try {
      const res = await fetch(`/api/admin/robots/${robot.id}/config-callback`, {
        method: 'POST'
      });

      const data = await res.json();

      if (data.code === 0) {
        alert('配置成功！');
        setCallbackUrls(prev => ({
          ...prev,
          [robot.id]: data.data.callbackUrl
        }));
      } else {
        alert(data.message || '配置失败');
      }
    } catch (error) {
      console.error('配置回调地址失败:', error);
      alert('配置失败，请检查网络连接');
    } finally {
      setConfiguringRobotId(null);
    }
  };

  // 查询回调配置
  const queryCallbackConfig = async (robot: Robot) => {
    setQueryingRobotId(robot.id);
    try {
      const res = await fetch(`/api/admin/robots/${robot.id}/callback-config`);
      const data = await res.json();
      if (data.code === 0) {
        setCallbackConfigs(prev => ({
          ...prev,
          [robot.id]: data.data || []
        }));
        if (data.data && data.data.length > 0) {
          alert(`查询成功！当前配置了 ${data.data.length} 个回调类型：\n${data.data.map((item: any) => `${item.callbackType}: ${item.callbackUrl}`).join('\n')}`);
        } else {
          alert('查询成功！当前未配置任何回调地址');
        }
      } else {
        alert(data.message || '查询失败');
      }
    } catch (error) {
      console.error('查询回调配置失败:', error);
      alert('查询失败，请检查网络连接');
    } finally {
      setQueryingRobotId(null);
    }
  };

  // 获取状态徽章
  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> 已停用</Badge>;
    }
    
    switch (status) {
      case 'online':
        return <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3" /> 在线</Badge>;
      case 'offline':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> 离线</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3" /> 未知</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            机器人管理
          </h2>
          <p className="text-muted-foreground mt-1">
            管理多个 WorkTool 机器人，配置连接参数和监控状态
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={loadRobots}
            disabled={isLoading}
            title="从数据库重新加载"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新列表
          </Button>
          <Button
            variant="secondary"
            onClick={handleRefreshAll}
            disabled={isRefreshingAll}
            title="从 WorkTool API 更新所有机器人信息"
          >
            <Zap className={`h-4 w-4 mr-2 ${isRefreshingAll ? 'animate-spin' : ''}`} />
            {isRefreshingAll ? '刷新中...' : '一键刷新'}
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            添加机器人
          </Button>
        </div>
      </div>

      {/* 统计信息 */}
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

      {/* 新功能提示 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>新功能推荐</AlertTitle>
        <AlertDescription>
          系统现已支持分组管理和角色管理，可以帮助您更好地组织和管理多个机器人。
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/#robot-groups')}>
              <Building2 className="h-4 w-4 mr-2" />
              分组管理
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/#robot-roles')}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              角色管理
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/#command-sender')}>
              <Sparkles className="h-4 w-4 mr-2" />
              指令发送
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/#monitoring-dashboard')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              监控大屏
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* 筛选和排序 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">筛选与排序</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 状态筛选 */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">状态筛选:</span>
              <Select value={statusFilter} onValueChange={(value: 'all' | 'online' | 'offline') => setStatusFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="online">在线</SelectItem>
                  <SelectItem value="offline">离线</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 排序 */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">排序:</span>
              <Select value={sortBy} onValueChange={(value: 'name' | 'status' | 'createdAt' | 'updatedAt') => setSortBy(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">名称</SelectItem>
                  <SelectItem value="status">状态</SelectItem>
                  <SelectItem value="createdAt">创建时间</SelectItem>
                  <SelectItem value="updatedAt">更新时间</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? '升序' : '降序'}
              >
                {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {sortOrder === 'asc' ? '升序' : '降序'}
              </Button>
            </div>

            {/* 显示结果数 */}
            <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
              显示 {getFilteredAndSortedRobots().length} / {robots.length} 个机器人
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 性能指标 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            性能指标
          </CardTitle>
          <CardDescription>
            各机器人的消息处理统计和性能分析
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {robots.filter(r => r.isActive).map((robot) => (
              <div key={robot.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">{robot.name}</span>
                    <Badge variant="outline" className="text-xs">{robot.robotId}</Badge>
                    {getStatusBadge(robot.status, robot.isActive)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckStatus(robot)}
                      disabled={refreshingRobotId === robot.robotId}
                    >
                      {refreshingRobotId === robot.robotId ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      刷新
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testConnection(robot.robotId)}
                      disabled={testingRobotId === robot.robotId}
                    >
                      {testingRobotId === robot.robotId ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <TestTube className="h-3 w-3 mr-1" />
                      )}
                      测试
                    </Button>
                  </div>
                </div>
                
                {testResults[robot.robotId] && (
                  <Alert
                    variant={testResults[robot.robotId].success ? 'default' : 'destructive'}
                    className={testResults[robot.robotId].success ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}
                  >
                    {testResults[robot.robotId].success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertDescription className="text-xs">
                      {testResults[robot.robotId].message}
                      {testResults[robot.robotId].timestamp && (
                        <span className="block mt-1 opacity-70">
                          测试时间: {new Date(testResults[robot.robotId].timestamp!).toLocaleString('zh-CN')}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
            
            {robots.filter(r => r.isActive).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无启用的机器人
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 机器人列表 */}
      <div className="grid gap-4">
        {getFilteredAndSortedRobots().map((robot) => (
          <Card key={robot.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-3 rounded-lg ${robot.isActive ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <Bot className={`h-6 w-6 ${robot.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{robot.name}</CardTitle>
                      {getStatusBadge(robot.status, robot.isActive)}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Code className="h-3 w-3" />
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{robot.robotId}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={() => copyRobotId(robot.robotId)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </CardDescription>
                    {robot.description && (
                      <p className="text-sm text-muted-foreground mt-1">{robot.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCheckStatus(robot)}
                    disabled={refreshingRobotId === robot.robotId}
                    title="从 WorkTool API 同步机器人信息"
                  >
                    {refreshingRobotId === robot.robotId ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    同步信息
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(robot)}
                    title="编辑"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(robot)}
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* WorkTool 详细信息 */}
                {(robot.nickname || robot.company || robot.ipAddress || robot.isValid !== undefined || robot.messageCallbackEnabled !== undefined) && (
                  <div className="grid gap-3 md:grid-cols-2 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-lg">
                    {robot.nickname && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">昵称</div>
                          <div className="text-sm font-medium truncate">{robot.nickname}</div>
                        </div>
                      </div>
                    )}
                    {robot.company && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">企业</div>
                          <div className="text-sm font-medium truncate">{robot.company}</div>
                        </div>
                      </div>
                    )}
                    {robot.ipAddress && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">IP 地址</div>
                          <div className="text-sm font-mono truncate">{robot.ipAddress}</div>
                        </div>
                      </div>
                    )}
                    {robot.isValid !== undefined && (
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">状态</div>
                          <Badge variant={robot.isValid ? 'default' : 'destructive'} className="text-xs">
                            {robot.isValid ? '有效' : '无效'}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {robot.activatedAt && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">已运行</div>
                          <div className="text-sm font-medium">{calculateRunTime(robot)}</div>
                        </div>
                      </div>
                    )}
                    {robot.expiresAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">剩余时间</div>
                          <div className="text-sm font-medium">{calculateRemainingTime(robot)}</div>
                        </div>
                      </div>
                    )}
                    {robot.messageCallbackEnabled !== undefined && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">消息回调</div>
                          <Badge variant={robot.messageCallbackEnabled ? 'default' : 'secondary'} className="text-xs">
                            {robot.messageCallbackEnabled ? '开启' : '关闭'}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* API 配置 */}
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">API Base URL</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={robot.apiBaseUrl}
                        readOnly
                        className="font-mono text-xs bg-muted"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">最后检查时间</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {robot.lastCheckAt
                          ? new Date(robot.lastCheckAt).toLocaleString('zh-CN')
                          : '从未检查'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 回调地址配置 */}
                {robot.isActive && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      消息回调地址
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={callbackUrls[robot.id] || '点击获取'}
                          readOnly
                          placeholder="点击下方按钮获取回调地址"
                          className="font-mono text-xs bg-muted"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => getCallbackUrl(robot)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          获取
                        </Button>
                        {callbackUrls[robot.id] && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyCallbackUrl(callbackUrls[robot.id]!)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            复制
                          </Button>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => configCallback(robot)}
                        disabled={configuringRobotId === robot.id}
                        className="w-full"
                      >
                        {configuringRobotId === robot.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            配置中...
                          </>
                        ) : (
                          <>
                            <Settings className="h-4 w-4 mr-2" />
                            自动配置到 WorkTool
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => queryCallbackConfig(robot)}
                        disabled={queryingRobotId === robot.id}
                        className="w-full"
                      >
                        {queryingRobotId === robot.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            查询中...
                          </>
                        ) : (
                          <>
                            <Info className="h-4 w-4 mr-2" />
                            查询回调配置
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        回调地址格式：{callbackUrls[robot.id] ? callbackUrls[robot.id].substring(0, 40) + '...' : '未配置'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 测试结果 */}
                {testResults[robot.robotId] && (
                  <Alert
                    variant={testResults[robot.robotId].success ? 'default' : 'destructive'}
                    className={testResults[robot.robotId].success ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}
                  >
                    {testResults[robot.robotId].success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle className="text-sm">连接测试结果</AlertTitle>
                    <AlertDescription className="text-xs">
                      {testResults[robot.robotId].message}
                      {testResults[robot.robotId].timestamp && (
                        <span className="block mt-1 opacity-70">
                          测试时间: {new Date(testResults[robot.robotId].timestamp!).toLocaleString('zh-CN')}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* 错误信息 */}
                {robot.lastError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-sm">错误信息</AlertTitle>
                    <AlertDescription className="text-xs">{robot.lastError}</AlertDescription>
                  </Alert>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => testConnection(robot.robotId)}
                    disabled={testingRobotId === robot.robotId}
                  >
                    {testingRobotId === robot.robotId ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        测试中...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        测试连接
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* 空状态 */}
        {robots.length === 0 && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无机器人</h3>
              <p className="text-muted-foreground text-center mb-4">
                添加第一个机器人开始使用 WorkTool 服务
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                添加机器人
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRobot ? '编辑机器人' : '添加机器人'}</DialogTitle>
            <DialogDescription>
              配置 WorkTool 机器人的连接参数和管理信息
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 基本信息 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                基本信息
              </h4>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">机器人名称 *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：客服机器人"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Robot ID *</label>
                <Input
                  value={formData.robotId}
                  onChange={(e) => setFormData({ ...formData, robotId: e.target.value })}
                  placeholder="例如：worktool1"
                />
                <p className="text-xs text-muted-foreground">
                  从 WorkTool 平台获取的唯一标识符
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">描述</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="机器人的用途和功能描述..."
                  rows={2}
                />
              </div>
            </div>

            {/* API 配置 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Server className="h-4 w-4" />
                API 配置
              </h4>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">API Base URL *</label>
                <Input
                  value={formData.apiBaseUrl}
                  onChange={(e) => setFormData({ ...formData, apiBaseUrl: e.target.value })}
                  placeholder="https://api.worktool.ymdyes.cn/wework/"
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    WorkTool API 服务地址。如果部署后无法连接，请修改为实际的服务地址。
                  </p>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      部署环境可能无法访问默认地址。请尝试：
                      1. 修改为内网可访问的地址（如 http://内网IP:端口/）
                      2. 确认 WorkTool API 服务是否正常运行
                      3. 检查防火墙和网络配置
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </div>

            {/* 状态设置 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                状态设置
              </h4>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">启用机器人</div>
                  <div className="text-xs text-muted-foreground">
                    启用后将接收和处理 WorkTool 回调
                  </div>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            {/* 验证结果 */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle className="text-sm">配置验证失败</AlertTitle>
                <AlertDescription className="text-xs">
                  <ul className="list-disc list-inside mt-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* 测试连接结果 */}
            {formTestResult && (
              <Alert
                variant={formTestResult.success ? 'default' : 'destructive'}
                className={formTestResult.success ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}
              >
                {formTestResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle className="text-sm">
                  {formTestResult.success ? '连接测试成功' : '连接测试失败'}
                </AlertTitle>
                <AlertDescription className="text-xs">
                  {formTestResult.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="outline"
              onClick={validateConfig}
            >
              <TestTube className="h-4 w-4 mr-2" />
              验证配置
            </Button>
            <Button
              variant="outline"
              onClick={() => testConnection()}
              disabled={testingRobotId === 'form'}
            >
              {testingRobotId === 'form' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Activity className="h-4 w-4 mr-2" />
              )}
              测试连接
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 添加 Code 图标导入
const { Code } = require('lucide-react');
