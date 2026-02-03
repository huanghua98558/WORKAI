'use client';

import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import RobotManagement from '@/components/robot/robot-management-integrated';
import AlertConfigTab from '@/components/alert-config-tab';
import EnhancedAlertManagement from '@/components/enhanced-alert-management';
import SystemLogs from '@/components/system-logs';
import PromptTraining from '@/components/prompt-training';
import MonitoringTab from '@/components/monitoring-tab';
import { 
  BarChart3, 
  MessageSquare,
  Settings,
  Activity,
  AlertTriangle,
  AlertCircle,
  FileText,
  Bot,
  Zap,
  Copy,
  Check,
  Play,
  RefreshCw,
  TrendingUp,
  Users,
  User,
  Shield,
  Database,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Download,
  Calendar,
  Search,
  Filter,
  Zap as ZapIcon,
  Server,
  HardDrive,
  Cpu,
  Network,
  Bell,
  BellRing,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Code,
  Terminal,
  Link2,
  ExternalLink,
  FileJson,
  LayoutDashboard,
  MessageCircle,
  UserCheck,
  Eye,
  BarChart,
  Sparkles,
  Info,
  Sliders,
  ChevronUp,
  ChevronDown,
  Plus,
  Save,
  X,
  Edit2,
  Circle,
  Mail,
  Building2,
  Send,
  BookOpen
} from 'lucide-react';

// 类型定义
interface CallbackUrl {
  message: string;
  actionResult: string;
  groupQrcode: string;
  robotStatus: string;
  baseUrl: string;
}

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

interface MonitorData {
  date: string;
  system: {
    callback_received: number;
    callback_processed: number;
    callback_error: number;
    ai_requests: number;
    ai_errors: number;
  };
  ai: {
    intentRecognition: { successRate: string };
    serviceReply: { successRate: string };
    chat: { successRate: string };
  };
  summary: {
    totalCallbacks: number;
    successRate: string;
    aiSuccessRate: string;
  };
}

interface AlertData {
  total: number;
  byLevel: {
    critical: number;
    warning: number;
    info: number;
  };
  recent: any[];
}

interface Session {
  sessionId: string;
  userId?: string;
  groupId?: string;
  userName?: string;
  groupName?: string;
  robotId?: string;
  robotName?: string;
  robotNickname?: string;
  company?: string; // 企业名称
  userInfo?: {
    userName?: string;
    groupName?: string;
  };
  status: 'auto' | 'human';
  lastActiveTime: string;
  messageCount: number;
  replyCount?: number;
  aiReplyCount: number;
  humanReplyCount: number;
  lastIntent?: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [callbacks, setCallbacks] = useState<CallbackUrl | null>(null);
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null);
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [onlineRobots, setOnlineRobots] = useState<Robot[]>([]);
  const [copiedCallback, setCopiedCallback] = useState<string | null>(null);
  const [testingCallback, setTestingCallback] = useState<string | null>(null);
  const [callbackTestResults, setCallbackTestResults] = useState<Record<string, { status: 'success' | 'error' | 'loading' | 'pending', message?: string, lastTest?: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [isEditingCallback, setIsEditingCallback] = useState(false);
  const [editingBaseUrl, setEditingBaseUrl] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [isLoadingAiConfig, setIsLoadingAiConfig] = useState(false);
  const [serverUptime, setServerUptime] = useState<string>('加载中...');
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [isLoadingSessionMessages, setIsLoadingSessionMessages] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<'all' | 'auto' | 'human'>('all');
  const [isSearchingSessions, setIsSearchingSessions] = useState(false);
  const [showRobotDetail, setShowRobotDetail] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [robotInfoMap, setRobotInfoMap] = useState<Record<string, { name: string; loaded: boolean }>>({});
  const [replyContent, setReplyContent] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyResult, setReplyResult] = useState<{ success: boolean; message: string; timestamp?: Date } | null>(null);

  // 初始化加载（只执行一次）
  useEffect(() => {
    loadData();
    loadRobots();
    checkConnection();
    loadAiConfig(); // 只在组件挂载时加载一次 AI 配置
  }, []);

  // 自动刷新：每隔 10 秒刷新一次会话数据
  // 当打开会话详情时停止刷新，关闭会话详情后恢复刷新
  // 当切换到监控标签页时停止刷新（监控组件有自己的刷新机制）
  useEffect(() => {
    // 如果会话详情打开，不进行自动刷新
    if (showSessionDetail) {
      return;
    }

    // 如果当前是监控标签页，暂停自动刷新（避免与监控组件的刷新冲突）
    if (activeTab === 'monitoring') {
      return;
    }

    const interval = setInterval(() => {
      loadData();
      loadRobots();
    }, 10000); // 每 10 秒刷新一次

    return () => clearInterval(interval);
  }, [showSessionDetail, activeTab]);

  // 加载机器人列表
  const loadRobots = async () => {
    try {
      const res = await fetch('/api/proxy/admin/robots');
      if (res.ok) {
        const data = await res.json();
        if (data.code === 0) {
          const robotsList = data.data || [];
          setRobots(robotsList);
          // 筛选出在线的机器人
          const online = robotsList.filter((r: Robot) => r.isActive && r.status === 'online');
          setOnlineRobots(online);
        }
      }
    } catch (error) {
      console.error('加载机器人列表失败:', error);
    }
  };

  // 初始化回调测试状态（当回调地址加载完成后）
  useEffect(() => {
    if (callbacks) {
      // 初始化所有回调状态为"未测试"
      const initialResults: Record<string, { status: 'success' | 'error' | 'loading' | 'pending', message?: string, lastTest?: string }> = {};
      Object.keys(callbacks).forEach(key => {
        if (key !== 'baseUrl' && callbacks[key as keyof CallbackUrl]) {
          initialResults[key] = { status: 'pending', message: '未测试' };
        }
      });
      setCallbackTestResults(initialResults);
    }
  }, [!!callbacks]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [callbacksRes, monitorRes, alertRes, sessionsRes, uptimeRes] = await Promise.all([
        fetch('/api/admin/callbacks'),
        fetch('/api/admin/monitor/summary'),
        fetch('/api/admin/alerts/stats'),
        fetch('/api/admin/sessions/active?limit=20'),
        fetch('/api/proxy/health') // 获取服务器运行时间
      ]);

      if (callbacksRes.ok) {
        const data = await callbacksRes.json();
        setCallbacks(data.data);
      }

      if (monitorRes.ok) {
        const data = await monitorRes.json();
        setMonitorData(data.data);
      }

      if (alertRes.ok) {
        const data = await alertRes.json();
        setAlertData(data.data);
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        // 去重：确保sessionId唯一
        const uniqueSessions = (data.data || []).reduce((acc: Session[], session: Session) => {
          if (!acc.find(s => s.sessionId === session.sessionId)) {
            acc.push(session);
          }
          return acc;
        }, []);
        setSessions(uniqueSessions);
      }

      if (uptimeRes.ok) {
        const data = await uptimeRes.json();
        // 更新服务器运行时间（假设返回的是启动时间戳）
        if (data.startTime) {
          const uptimeMs = Date.now() - data.startTime;
          setServerUptime(formatUptime(uptimeMs));
        }
      }
    } catch (error) {
      // 加载数据失败
    } finally {
      setIsLoading(false);
      setLastUpdateTime(new Date());
    }
  };

  // 格式化运行时间
  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // 加载会话消息
  const loadSessionMessages = async (sessionId: string) => {
    setIsLoadingSessionMessages(true);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setSessionMessages(data.data || []);
      } else {
        setSessionMessages([]);
      }
    } catch (error) {
      console.error('加载会话消息失败:', error);
      setSessionMessages([]);
    } finally {
      setIsLoadingSessionMessages(false);
    }
  };

  // 获取机器人信息（企微昵称）
  const loadRobotInfo = async (robotId: string): Promise<string | null> => {
    // 如果已经加载过，直接返回缓存的名称
    if (robotInfoMap[robotId]?.loaded) {
      return robotInfoMap[robotId].name;
    }

    try {
      const res = await fetch(`/api/proxy/robot/info?robotId=${encodeURIComponent(robotId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.code === 200 && data.data?.name) {
          // 缓存机器人名称
          setRobotInfoMap(prev => ({
            ...prev,
            [robotId]: { name: data.data.name, loaded: true }
          }));
          return data.data.name;
        }
      }
    } catch (error) {
      console.error('获取机器人信息失败:', error);
    }
    
    // 缓存加载失败状态
    setRobotInfoMap(prev => ({
      ...prev,
      [robotId]: { name: '', loaded: true }
    }));
    return null;
  };

  // 查看会话详情
  const handleViewSessionDetail = async (session: Session) => {
    setSelectedSession(session);
    setShowSessionDetail(true);
    loadSessionMessages(session.sessionId);
    
    // 加载机器人信息
    if (session.robotId) {
      const robotName = await loadRobotInfo(session.robotId);
      if (robotName) {
        // 更新选中的会话，添加机器人名称
        setSelectedSession(prev => prev ? { ...prev, robotName } : null);
      }
    }
    
    // 重新获取最新的会话信息，确保机器人名称和状态正确
    try {
      const res = await fetch(`/api/admin/sessions/${session.sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setSelectedSession(data.data);
          // 如果返回的数据没有机器人名称，使用我们获取的
          if (!data.data.robotName && session.robotId && robotInfoMap[session.robotId]?.name) {
            setSelectedSession(prev => prev ? { ...prev, robotName: robotInfoMap[session.robotId as string].name } : null);
          }
        }
      }
    } catch (error) {
      console.error('获取会话信息失败:', error);
    }
  };

  // 发送回复消息
  const handleSendReply = async () => {
    if (!selectedSession || !selectedSession.robotId || !replyContent.trim()) {
      return;
    }

    setIsSendingReply(true);
    setReplyResult(null);

    try {
      // 确定接收者
      const toName = selectedSession.groupName || selectedSession.userName;
      if (!toName) {
        throw new Error('无法确定接收者');
      }

      // 创建指令
      const commandPayload = {
        list: [{
          type: 203,
          titleList: [toName],
          receivedContent: replyContent.trim()
        }]
      };

      const commandType = selectedSession.groupName ? 'send_group_message' : 'send_private_message';

      const res = await fetch('/api/admin/robot-commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          robotId: selectedSession.robotId,
          commandType,
          commandPayload,
          priority: 5,
          maxRetries: 3
        })
      });

      const data = await res.json();

      // 注意：API 返回的是 { success: true/false, data: {...} }，不是 { code: 0 }
      if (!res.ok || !data.success) {
        throw new Error(data.message || '创建指令失败');
      }

      const commandId = data.data.commandId || data.data.id;

      // 轮询指令状态
      let attempts = 0;
      const maxAttempts = 60; // 最多轮询60次（约1分钟）
      let finalStatus = null;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒

        const statusRes = await fetch(`/api/admin/robot-commands/${commandId}`);
        const statusData = await statusRes.json();

        // 注意：API 返回的是 { success: true, data: {...} }，不是 { code: 0 }
        if (statusRes.ok && statusData.success && statusData.data) {
          const command = statusData.data;
          if (command.status === 'completed') {
            finalStatus = command;
            break;
          } else if (command.status === 'failed') {
            finalStatus = command;
            break;
          }
        }

        attempts++;
      }

      if (finalStatus) {
        if (finalStatus.status === 'completed') {
          setReplyResult({
            success: true,
            message: `消息发送成功！指令ID: ${commandId}`,
            timestamp: new Date()
          });
          // 清空输入框
          setReplyContent('');
          // 重新加载消息列表
          await loadSessionMessages(selectedSession.sessionId);
        } else {
          setReplyResult({
            success: false,
            message: `消息发送失败！${finalStatus.errorMessage || '未知错误'}`,
            timestamp: new Date()
          });
        }
      } else {
        setReplyResult({
          success: false,
          message: `消息发送超时，请稍后查看指令状态。指令ID: ${commandId}`,
          timestamp: new Date()
        });
      }
    } catch (error: any) {
      console.error('发送回复失败:', error);
      setReplyResult({
        success: false,
        message: error.message || '发送失败',
        timestamp: new Date()
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleToggleSessionStatus = async (session: Session) => {
    try {
      const url = session.status === 'auto'
        ? `/api/admin/sessions/${session.sessionId}/takeover`
        : `/api/admin/sessions/${session.sessionId}/auto`;

      const body = JSON.stringify(session.status === 'auto'
        ? { operator: 'admin' }
        : {}
      );

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // 更新会话列表中的会话状态
          setSessions(prevSessions =>
            prevSessions.map(s =>
              s.sessionId === session.sessionId
                ? { ...s, status: data.data.status }
                : s
            )
          );
          alert(`✅ 已切换为${session.status === 'auto' ? '人工接管' : '自动模式'}`);
        }
      } else {
        alert('❌ 切换失败');
      }
    } catch (error) {
      console.error('切换会话状态失败:', error);
      alert('❌ 切换失败');
    }
  };

  // 搜索和筛选会话
  const handleSearchSessions = async () => {
    if (!sessionSearchQuery.trim() && sessionStatusFilter === 'all') {
      // 重置为原始会话列表
      setIsSearchingSessions(true);
      try {
        const res = await fetch('/api/admin/sessions/active?limit=50');
        if (res.ok) {
          const data = await res.json();
          // 去重：确保sessionId唯一
          const uniqueSessions = (data.data || []).reduce((acc: Session[], session: Session) => {
            if (!acc.find(s => s.sessionId === session.sessionId)) {
              acc.push(session);
            }
            return acc;
          }, []);
          setSessions(uniqueSessions);
        }
      } catch (error) {
        console.error('搜索会话失败:', error);
      } finally {
        setIsSearchingSessions(false);
      }
      return;
    }

    setIsSearchingSessions(true);
    try {
      // 如果有搜索关键词，搜索消息
      if (sessionSearchQuery.trim()) {
        const res = await fetch(`/api/admin/sessions/search?q=${encodeURIComponent(sessionSearchQuery)}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          // 从消息中提取唯一会话
          const uniqueSessions = new Map();
          data.data?.forEach((msg: any) => {
            if (!uniqueSessions.has(msg.sessionId)) {
              uniqueSessions.set(msg.sessionId, {
                sessionId: msg.sessionId,
                userName: msg.userName,
                groupName: msg.groupName,
                messageCount: 1,
                lastActiveTime: msg.timestamp,
                status: 'auto', // 默认为 auto，需要从会话信息中获取
              });
            }
          });
          setSessions(Array.from(uniqueSessions.values()));
        }
      } else {
        // 只有筛选条件
        const res = await fetch('/api/admin/sessions/active?limit=50');
        if (res.ok) {
          const data = await res.json();
          const filtered = (data.data || []).filter((s: Session) => {
            if (sessionStatusFilter === 'all') return true;
            return s.status === sessionStatusFilter;
          });
          setSessions(filtered);
        }
      }
    } catch (error) {
      console.error('搜索会话失败:', error);
    } finally {
      setIsSearchingSessions(false);
    }
  };

  // 监听搜索条件变化
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearchSessions();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [sessionSearchQuery, sessionStatusFilter]);

  const loadAiConfig = async () => {
    if (isLoadingAiConfig) return;
    
    setIsLoadingAiConfig(true);
    try {
      const res = await fetch('/api/admin/config', { cache: 'no-store' });
      
      if (res.ok) {
        const data = await res.json();
        setAiConfig(data.data);
      }
    } catch (error) {
    } finally {
      setIsLoadingAiConfig(false);
    }
  };

  const checkConnection = async () => {
    setConnectionStatus('loading');
    try {
      // 通过 Next.js API 代理调用后端健康检查
      const res = await fetch('/api/proxy/health');
      if (res.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      
      setConnectionStatus('disconnected');
    }
  };

  // 复制回调地址
  const copyCallback = async (type: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedCallback(type);
    setTimeout(() => setCopiedCallback(null), 2000);
  };

  // 复制所有回调地址（JSON格式，适合机器对接）
  const copyAllCallbacksJSON = async () => {
    if (!callbacks) return;
    
    const allUrls = {
      baseUrl: callbacks.baseUrl,
      callbacks: {
        message: callbacks.message,
        actionResult: callbacks.actionResult,
        groupQrcode: callbacks.groupQrcode,
        robotStatus: callbacks.robotStatus
      }
    };
    
    await navigator.clipboard.writeText(JSON.stringify(allUrls, null, 2));
    setCopiedCallback('all_json');
    setTimeout(() => setCopiedCallback(null), 2000);
  };

  // 保存回调地址
  const saveCallbackBaseUrl = async () => {
    if (!editingBaseUrl.trim()) {
      alert('❌ 回调地址不能为空');
      return;
    }
    
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployment: {
            callbackBaseUrl: editingBaseUrl.trim()
          }
        })
      });
      
      if (res.ok) {
        alert('✅ 回调地址已保存');
        setIsEditingCallback(false);
        loadData(); // 重新加载回调地址
      } else {
        const errorData = await res.json();
        alert(`❌ 保存失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      
      alert('❌ 保存失败，请检查网络连接');
    }
  };

  // 复制所有回调地址（文本格式）
  const copyAllCallbacks = async () => {
    if (!callbacks) return;
    
    const allUrls = `# WorkTool AI 中枢系统 - 回调地址配置

基础地址: ${callbacks.baseUrl}

## 回调地址配置

### 1. 消息回调地址
${callbacks.message}

### 2. 指令执行结果回调地址
${callbacks.actionResult}

### 3. 群二维码回调地址
${callbacks.groupQrcode}

### 4. 机器人状态回调地址
${callbacks.robotStatus}

---

生成时间: ${new Date().toISOString()}
系统版本: 1.0.0`;
    
    await navigator.clipboard.writeText(allUrls);
    setCopiedCallback('all');
    setTimeout(() => setCopiedCallback(null), 2000);
  };

  // 测试回调
  const testCallback = async (type: string) => {
    setTestingCallback(type);
    setCallbackTestResults(prev => ({
      ...prev,
      [type]: { status: 'loading', message: '正在测试...' }
    }));
    
    try {
      const res = await fetch('/api/admin/callbacks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      const data = await res.json();
      
      if (data.success) {
        setCallbackTestResults(prev => ({
          ...prev,
          [type]: { 
            status: 'success', 
            message: '连接成功',
            lastTest: new Date().toISOString()
          }
        }));
      } else {
        setCallbackTestResults(prev => ({
          ...prev,
          [type]: { 
            status: 'error', 
            message: data.error || '连接失败',
            lastTest: new Date().toISOString()
          }
        }));
      }
    } catch (error) {
      setCallbackTestResults(prev => ({
        ...prev,
        [type]: { 
          status: 'error', 
          message: `网络错误: ${error}`,
          lastTest: new Date().toISOString()
        }
      }));
    } finally {
      setTestingCallback(null);
    }
  };

  // 测试所有回调
  const testAllCallbacks = async () => {
    if (!callbacks) return;
    
    const callbackTypes = ['message', 'actionResult', 'groupQrcode', 'robotStatus'];
    
    for (const type of callbackTypes) {
      await testCallback(type);
      // 添加延迟，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 回调对接中心组件
  const CallbackCenter = () => (
    <div className="space-y-6">
      {/* 头部信息 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-blue-500" />
            回调对接中心
          </h3>
          <p className="text-muted-foreground mt-1">
            配置 WorkTool 机器人回调地址，用于接收机器人消息和状态更新
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={
              connectionStatus === 'connected' ? 'default' : 
              connectionStatus === 'loading' ? 'secondary' : 
              'destructive'
            } 
            className="gap-1"
          >
            {connectionStatus === 'connected' ? (
              <>
                <CheckCircle className="h-3 w-3" />
                已连接
              </>
            ) : connectionStatus === 'loading' ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                加载中
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                未连接
              </>
            )}
          </Badge>
          <Button 
            onClick={loadData} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button 
            onClick={testAllCallbacks} 
            variant="outline" 
            size="sm"
            disabled={!!testingCallback || !callbacks}
          >
            <Zap className="h-4 w-4 mr-2" />
            测试所有回调
          </Button>
        </div>
      </div>

      {/* 基础信息卡片 */}
      <Card className="border-2 border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            部署信息
          </CardTitle>
          <CardDescription className="text-blue-100">
            当前部署环境的基础配置信息
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">基础回调地址</label>
              <div className="flex gap-2 mt-1">
                {isEditingCallback ? (
                  <>
                    <Input 
                      value={editingBaseUrl} 
                      onChange={(e) => setEditingBaseUrl(e.target.value)}
                      className="font-mono text-xs"
                      placeholder="https://your-domain.com"
                    />
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={saveCallbackBaseUrl}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setIsEditingCallback(false);
                        setEditingBaseUrl(callbacks?.baseUrl || '');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Input 
                      value={callbacks?.baseUrl || ''} 
                      readOnly 
                      className="font-mono text-xs bg-muted"
                      placeholder="加载中..."
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => callbacks && copyCallback('baseUrl', callbacks.baseUrl)}
                    >
                      {copiedCallback === 'baseUrl' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setIsEditingCallback(true);
                        setEditingBaseUrl(callbacks?.baseUrl || '');
                      }}
                      title="编辑回调地址"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isEditingCallback ? '输入完整的回调地址（包括协议和域名）' : '⚠️ 部署地址变更时会自动更新，如需手动修改请点击编辑按钮'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">系统版本</label>
              <div className="flex gap-2 mt-1">
                <Input 
                  value="v1.0.0" 
                  readOnly 
                  className="font-mono text-xs bg-muted"
                />
                <Badge variant="outline">稳定版</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 回调地址列表 */}
      <div className="grid gap-4">
        {/* 消息回调 */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base">消息回调地址</CardTitle>
                  <CardDescription className="text-xs">
                    接收群消息、私聊消息、@机器人等所有消息
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Radio className="h-3 w-3" />
                实时推送
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                value={callbacks?.message || ''} 
                readOnly 
                className="font-mono text-xs bg-muted"
                placeholder="加载中..."
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => callbacks && copyCallback('message', callbacks.message)}
                title="复制地址"
              >
                {copiedCallback === 'message' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => testCallback('message')}
                disabled={testingCallback === 'message'}
                title="测试回调"
              >
                {testingCallback === 'message' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Badge 
                variant={
                  callbackTestResults.message?.status === 'success' ? 'default' :
                  callbackTestResults.message?.status === 'error' ? 'destructive' :
                  callbackTestResults.message?.status === 'loading' ? 'secondary' : 'outline'
                }
                className="gap-1"
              >
                {callbackTestResults.message?.status === 'success' ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    {callbackTestResults.message.message || '已连接'}
                  </>
                ) : callbackTestResults.message?.status === 'error' ? (
                  <>
                    <XCircle className="h-3 w-3" />
                    {callbackTestResults.message.message || '连接失败'}
                  </>
                ) : callbackTestResults.message?.status === 'loading' ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    测试中
                  </>
                ) : (
                  <>
                    <Circle className="h-3 w-3" />
                    未测试
                  </>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 执行结果回调 */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-base">执行结果回调地址</CardTitle>
                  <CardDescription className="text-xs">
                    接收发送消息、踢人、拉人、建群等操作结果
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Radio className="h-3 w-3" />
                实时推送
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                value={callbacks?.actionResult || ''} 
                readOnly 
                className="font-mono text-xs bg-muted"
                placeholder="加载中..."
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => callbacks && copyCallback('actionResult', callbacks.actionResult)}
                title="复制地址"
              >
                {copiedCallback === 'actionResult' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => testCallback('actionResult')}
                disabled={testingCallback === 'actionResult'}
                title="测试回调"
              >
                {testingCallback === 'actionResult' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Badge 
                variant={
                  callbackTestResults.actionResult?.status === 'success' ? 'default' :
                  callbackTestResults.actionResult?.status === 'error' ? 'destructive' :
                  callbackTestResults.actionResult?.status === 'loading' ? 'secondary' : 'outline'
                }
                className="gap-1"
              >
                {callbackTestResults.actionResult?.status === 'success' ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    {callbackTestResults.actionResult.message || '已连接'}
                  </>
                ) : callbackTestResults.actionResult?.status === 'error' ? (
                  <>
                    <XCircle className="h-3 w-3" />
                    {callbackTestResults.actionResult.message || '连接失败'}
                  </>
                ) : callbackTestResults.actionResult?.status === 'loading' ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    测试中
                  </>
                ) : (
                  <>
                    <Circle className="h-3 w-3" />
                    未测试
                  </>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 群二维码回调 */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <QrCodeIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-base">群二维码回调地址</CardTitle>
                  <CardDescription className="text-xs">
                    接收群二维码生成、更新、失效等事件
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Radio className="h-3 w-3" />
                事件推送
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                value={callbacks?.groupQrcode || ''} 
                readOnly 
                className="font-mono text-xs bg-muted"
                placeholder="加载中..."
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => callbacks && copyCallback('groupQrcode', callbacks.groupQrcode)}
                title="复制地址"
              >
                {copiedCallback === 'groupQrcode' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => testCallback('groupQrcode')}
                disabled={testingCallback === 'groupQrcode'}
                title="测试回调"
              >
                {testingCallback === 'groupQrcode' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Badge 
                variant={
                  callbackTestResults.groupQrcode?.status === 'success' ? 'default' :
                  callbackTestResults.groupQrcode?.status === 'error' ? 'destructive' :
                  callbackTestResults.groupQrcode?.status === 'loading' ? 'secondary' : 'outline'
                }
                className="gap-1"
              >
                {callbackTestResults.groupQrcode?.status === 'success' ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    {callbackTestResults.groupQrcode.message || '已连接'}
                  </>
                ) : callbackTestResults.groupQrcode?.status === 'error' ? (
                  <>
                    <XCircle className="h-3 w-3" />
                    {callbackTestResults.groupQrcode.message || '连接失败'}
                  </>
                ) : callbackTestResults.groupQrcode?.status === 'loading' ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    测试中
                  </>
                ) : (
                  <>
                    <Circle className="h-3 w-3" />
                    未测试
                  </>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 机器人状态回调 */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-base">机器人状态回调地址</CardTitle>
                  <CardDescription className="text-xs">
                    接收机器人上线、掉线、心跳异常等状态事件
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Radio className="h-3 w-3" />
                实时监控
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                value={callbacks?.robotStatus || ''} 
                readOnly 
                className="font-mono text-xs bg-muted"
                placeholder="加载中..."
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => callbacks && copyCallback('robotStatus', callbacks.robotStatus)}
                title="复制地址"
              >
                {copiedCallback === 'robotStatus' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => testCallback('robotStatus')}
                disabled={testingCallback === 'robotStatus'}
                title="测试回调"
              >
                {testingCallback === 'robotStatus' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Badge 
                variant={
                  callbackTestResults.robotStatus?.status === 'success' ? 'default' :
                  callbackTestResults.robotStatus?.status === 'error' ? 'destructive' :
                  callbackTestResults.robotStatus?.status === 'loading' ? 'secondary' : 'outline'
                }
                className="gap-1"
              >
                {callbackTestResults.robotStatus?.status === 'success' ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    {callbackTestResults.robotStatus.message || '已连接'}
                  </>
                ) : callbackTestResults.robotStatus?.status === 'error' ? (
                  <>
                    <XCircle className="h-3 w-3" />
                    {callbackTestResults.robotStatus.message || '连接失败'}
                  </>
                ) : callbackTestResults.robotStatus?.status === 'loading' ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    测试中
                  </>
                ) : (
                  <>
                    <Circle className="h-3 w-3" />
                    未测试
                  </>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 批量操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            批量操作 - 机器对接专用
          </CardTitle>
          <CardDescription>
            一键复制所有回调地址，用于 WorkTool 机器人快速对接
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <Button 
              onClick={copyAllCallbacks}
              className="w-full"
              variant="default"
              size="lg"
            >
              {copiedCallback === 'all' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  已复制文本格式
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  复制文本格式（易读）
                </>
              )}
            </Button>
            <Button 
              onClick={copyAllCallbacksJSON}
              className="w-full"
              variant="secondary"
              size="lg"
            >
              {copiedCallback === 'all_json' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  已复制 JSON 格式
                </>
              ) : (
                <>
                  <FileJson className="h-4 w-4 mr-2" />
                  复制 JSON 格式（机器）
                </>
              )}
            </Button>
          </div>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>对接说明</AlertTitle>
            <AlertDescription className="text-sm">
              1. 将上述回调地址配置到 WorkTool 平台的对应回调设置中<br/>
              2. 部署地址变更时，这些地址会自动更新，无需重新配置<br/>
              3. 建议定期测试回调接口，确保通信正常
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );

  // 仪表盘组件
  // 仪表盘组件
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* 系统状态横幅 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 border-none text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <CardTitle className="text-base">系统状态</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">正常运行</div>
            <p className="text-sm text-white/80 mt-1">所有服务运行正常</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 border-none text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle className="text-base">运行时间</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serverUptime}</div>
            <p className="text-sm text-white/80 mt-1">系统持续运行中</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-pink-600 border-none text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <CardTitle className="text-base">今日消息</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitorData?.system?.callback_received || 0}</div>
            <p className="text-sm text-white/80 mt-1">今日累计接收消息</p>
          </CardContent>
        </Card>
      </div>

      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">系统概览</h2>
          <p className="text-muted-foreground mt-1">
            实时监控系统运行状态和关键指标
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span suppressHydrationWarning>最后更新: {formatTime(lastUpdateTime.toISOString())}</span>
          </div>
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">回调消息</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitorData?.system?.callback_received || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              今日累计
              {monitorData?.system?.callback_received && monitorData?.system?.callback_received > 0 && (
                <span className="ml-1">+{monitorData?.system?.callback_received}</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">处理成功率</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitorData?.summary.successRate || '0%'}</div>
            <p className="text-xs text-muted-foreground mt-1">回调处理成功率</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI 成功率</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitorData?.summary.aiSuccessRate || '0%'}</div>
            <p className="text-xs text-muted-foreground mt-1">AI 响应成功率</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">告警数量</CardTitle>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertData?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">近 7 天告警</p>
          </CardContent>
        </Card>
      </div>

      {/* 会话列表和快速操作 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 最近活跃会话 - 占2列 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  最近活跃会话
                </CardTitle>
                <Badge variant="secondary">{sessions.length} 个</Badge>
                <Badge variant={showSessionDetail ? "secondary" : "outline"} className="gap-1">
                  <RefreshCw className={`h-3 w-3 ${!showSessionDetail && 'animate-spin'}`} />
                  {showSessionDetail ? '已暂停' : '刷新中'}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('sessions')}>
                查看全部 <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>暂无活跃会话</p>
                </div>
              ) : sessions.slice(0, 5).map((session) => {
                const userName = session.userName || session.userInfo?.userName;
                const groupName = session.groupName || session.userInfo?.groupName;
                const robotName = session.robotName || '未知机器人';

                return (
                  <div
                    key={session.sessionId}
                    className="flex items-start justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    onClick={() => handleViewSessionDetail(session)}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg flex-shrink-0">
                        {userName?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-semibold truncate">{userName || '未知用户'}</p>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded">
                            <Bot className="h-3 w-3" />
                            {robotName}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{groupName || '未知群组'}</p>
                        {session.company && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 truncate mt-1">
                            <Building2 className="h-3 w-3 inline mr-1" />
                            {session.company}
                            {session.robotNickname && ` (${session.robotNickname})`}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(session.lastActiveTime).toLocaleString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-3 flex-shrink-0">
                      <Badge
                        variant={session.status === 'auto' ? 'default' : 'secondary'}
                        className="gap-1"
                      >
                        {session.status === 'auto' ? (
                          <>
                            <Bot className="h-3 w-3" />
                            AI
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3" />
                            人工
                          </>
                        )}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {session.messageCount} 条
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 快速操作和系统信息 - 占1列 */}
        <div className="space-y-6">
          {/* 机器人状态 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-500" />
                机器人状态
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm text-muted-foreground">在线机器人</span>
                <Badge variant="default" className="bg-green-500">
                  {onlineRobots.length} / {robots.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-muted-foreground">总机器人数</span>
                <span className="font-medium">{robots.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* 快速操作 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                快速操作
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setActiveTab('callbacks')}
              >
                <Link2 className="h-4 w-4" />
                配置回调地址
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setActiveTab('robots')}
              >
                <Bot className="h-4 w-4" />
                管理机器人
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="h-4 w-4" />
                系统设置
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // 会话管理组件
  const SessionsTab = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'auto' | 'human'>('all');
    const [filterIntent, setFilterIntent] = useState<string>('all');

    // 过滤会话
    const filteredSessions = sessions.filter(session => {
      // 搜索过滤
      const matchesSearch = !searchTerm || 
        session.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.groupName?.toLowerCase().includes(searchTerm.toLowerCase());

      // 状态过滤
      const matchesStatus = filterStatus === 'all' || session.status === filterStatus;

      // 意图过滤
      const matchesIntent = filterIntent === 'all' || session.lastIntent === filterIntent;

      return matchesSearch && matchesStatus && matchesIntent;
    });

    // 计算统计数据
    const stats = {
      total: sessions.length,
      auto: sessions.filter(s => s.status === 'auto').length,
      human: sessions.filter(s => s.status === 'human').length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messageCount, 0),
      aiReplies: sessions.reduce((sum, s) => sum + s.aiReplyCount, 0),
      humanReplies: sessions.reduce((sum, s) => sum + s.humanReplyCount, 0),
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-green-500" />
              会话管理
            </h3>
            <p className="text-muted-foreground mt-1">
              查看和管理活跃的用户会话
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {sessions.length} 个活跃会话
            </Badge>
            <Badge variant={showSessionDetail ? "secondary" : "outline"} className="gap-1">
              <RefreshCw className={`h-3 w-3 ${!showSessionDetail && 'animate-spin'}`} />
              {showSessionDetail ? '刷新暂停' : '自动刷新'}
            </Badge>
            <Button 
              onClick={loadData} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总会话数</CardTitle>
              <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                活跃会话
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">自动模式</CardTitle>
              <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.auto}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                AI 自动回复
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">人工模式</CardTitle>
              <UserCheck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.human}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                人工接管
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总消息数</CardTitle>
              <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalMessages}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                消息总量
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 最近活跃会话 */}
        {sessions.length > 0 && (
          <Card className="border-2 border-green-200 dark:border-green-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  最近活跃会话
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={showSessionDetail ? "secondary" : "outline"} className="gap-1">
                    <RefreshCw className={`h-3 w-3 ${!showSessionDetail && 'animate-spin'}`} />
                    {showSessionDetail ? '已暂停' : '刷新中'}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    {sessions.length} 个会话
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {sessions.slice(0, 6).map((session) => {
                  const userName = session.userName || session.userInfo?.userName;
                  const groupName = session.groupName || session.userInfo?.groupName;

                  return (
                    <div 
                      key={session.sessionId} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950"
                      onClick={() => {
                        setSelectedSession(session);
                        setShowSessionDetail(true);
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {userName?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{userName || '未知用户'}</p>
                          <p className="text-xs text-muted-foreground truncate">{groupName || '未知群组'}</p>
                          {session.company && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
                              <Building2 className="h-3 w-3 inline mr-1" />
                              {session.company}
                              {session.robotNickname && ` (${session.robotNickname})`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                        <Badge 
                          variant={session.status === 'auto' ? 'default' : 'secondary'}
                          className="gap-1 text-xs"
                        >
                          {session.status === 'auto' ? (
                            <Bot className="h-3 w-3" />
                          ) : (
                            <Users className="h-3 w-3" />
                          )}
                          {session.status === 'auto' ? '自动' : '人工'}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(session.lastActiveTime)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const sessionList = document.getElementById('full-session-list');
                    if (sessionList) {
                      sessionList.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  查看完整会话列表 <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="搜索用户或群组..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="auto">自动模式</SelectItem>
                  <SelectItem value="human">人工模式</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterIntent} onValueChange={setFilterIntent}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="意图" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部意图</SelectItem>
                  <SelectItem value="service">服务咨询</SelectItem>
                  <SelectItem value="help">帮助请求</SelectItem>
                  <SelectItem value="chat">闲聊</SelectItem>
                  <SelectItem value="welcome">欢迎</SelectItem>
                  <SelectItem value="risk">风险内容</SelectItem>
                  <SelectItem value="spam">垃圾信息</SelectItem>
                  <SelectItem value="admin">管理指令</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 会话列表 */}
        <Card id="full-session-list">
          <CardHeader>
            <CardTitle className="text-base">
              会话列表 ({filteredSessions.length}/{sessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无匹配的会话</p>
                {searchTerm || filterStatus !== 'all' || filterIntent !== 'all' ? (
                  <Button 
                    variant="link" 
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                      setFilterIntent('all');
                    }}
                    className="mt-2"
                  >
                    清除筛选
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleViewSessionDetail(session)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{session.userName}</span>
                          <Badge 
                            variant={session.status === 'auto' ? 'default' : 'secondary'}
                            className="gap-1"
                          >
                            {session.status === 'auto' ? (
                              <Bot className="h-3 w-3" />
                            ) : (
                              <Users className="h-3 w-3" />
                            )}
                            {session.status === 'auto' ? '自动' : '人工'}
                          </Badge>
                          {session.lastIntent && (
                            <Badge variant="outline" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              {session.lastIntent}
                            </Badge>
                          )}
                          {session.aiReplyCount > 0 && (
                            <Badge variant="outline" className="gap-1 border-green-500 text-green-600 dark:text-green-400">
                              <CheckCircle className="h-3 w-3" />
                              已回复
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {session.groupName}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            消息: {session.messageCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            AI回复: {session.aiReplyCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            人工回复: {session.humanReplyCount}
                          </span>
                          {session.company && (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <Building2 className="h-3 w-3" />
                              {session.company}
                              {session.robotNickname && ` (${session.robotNickname})`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(session.lastActiveTime)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation(); // 阻止冒泡，避免打开详情
                          handleToggleSessionStatus(session);
                        }}
                      >
                        {session.status === 'auto' ? (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            人工接管
                          </>
                        ) : (
                          <>
                            <Bot className="h-3 w-3 mr-1" />
                            自动模式
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // 监控告警页面
  const MonitorTab = () => {
    const [monitorSubTab, setMonitorSubTab] = useState('monitor');
    const [alertHistory, setAlertHistory] = useState<any[]>([]);
    const [circuitBreakerStatus, setCircuitBreakerStatus] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(false);

    const loadAlertData = async () => {
      setIsLoading(true);
      try {
        const [alertsRes, circuitRes] = await Promise.all([
          fetch('/api/admin/alerts/history?limit=20'),
          fetch('/api/admin/circuit-breaker/status')
        ]);

        if (alertsRes.ok) {
          const data = await alertsRes.json();
          setAlertHistory(data.data || []);
        }

        if (circuitRes.ok) {
          const data = await circuitRes.json();
          setCircuitBreakerStatus(data.data.isOpen);
        }
      } catch (error) {
        console.error('加载告警数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 只在组件首次挂载时加载一次
    useEffect(() => {
      console.log('MonitorTab: 组件挂载');
      loadAlertData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resetCircuitBreaker = async () => {
      if (confirm('确定要重置熔断器吗？这将重新启用 AI 服务。')) {
        try {
          const res = await fetch('/api/admin/circuit-breaker/reset', { method: 'POST' });
          if (res.ok) {
            alert('✅ 熔断器已重置');
            loadAlertData();
          }
        } catch (error) {
          alert('❌ 重置失败');
        }
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-red-500" />
              监控与告警
            </h3>
            <p className="text-muted-foreground mt-1">
              系统监控指标和告警管理
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => loadAlertData()}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

        {/* 子 Tabs */}
        <Tabs value={monitorSubTab} onValueChange={setMonitorSubTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="monitor">系统监控</TabsTrigger>
            <TabsTrigger value="alerts">告警配置</TabsTrigger>
            <TabsTrigger value="alert-enhanced">告警增强</TabsTrigger>
          </TabsList>

          {/* 系统监控 */}
          <TabsContent value="monitor" className="space-y-4">
            {/* 告警统计卡片 */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总告警数</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{alertData?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">近 7 天</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">严重告警</CardTitle>
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{alertData?.byLevel.critical || 0}</div>
                  <p className="text-xs text-muted-foreground">需要立即处理</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">警告告警</CardTitle>
                  <Bell className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{alertData?.byLevel.warning || 0}</div>
                  <p className="text-xs text-muted-foreground">需要关注</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">信息告警</CardTitle>
                  <Info className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{alertData?.byLevel.info || 0}</div>
                  <p className="text-xs text-muted-foreground">提示信息</p>
                </CardContent>
              </Card>
            </div>

            {/* 熔断器状态 */}
            <Alert variant={circuitBreakerStatus ? 'destructive' : 'default'}>
              {circuitBreakerStatus ? (
                <>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>熔断器已开启</AlertTitle>
                  <AlertDescription>
                    AI 服务已被临时禁用，所有请求将跳过 AI 处理。
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-2"
                      onClick={resetCircuitBreaker}
                    >
                      重置熔断器
                    </Button>
                  </AlertDescription>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertTitle>系统运行正常</AlertTitle>
                  <AlertDescription>熔断器已关闭，AI 服务正常运行。</AlertDescription>
                </>
              )}
            </Alert>

            {/* 告警历史 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">告警历史</CardTitle>
                <CardDescription>最近的告警记录</CardDescription>
              </CardHeader>
              <CardContent>
                {alertHistory.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无告警记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alertHistory.map((alert) => (
                      <div key={alert.id || alert.timestamp} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className={`p-2 rounded-lg ${
                          alert.level === 'critical' ? 'bg-red-100 dark:bg-red-900' :
                          alert.level === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900' :
                          'bg-blue-100 dark:bg-blue-900'
                        }`}>
                          {alert.level === 'critical' && <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />}
                          {alert.level === 'warning' && <Bell className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />}
                          {alert.level === 'info' && <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{alert.ruleName}</span>
                            <Badge variant={
                              alert.level === 'critical' ? 'destructive' :
                              alert.level === 'warning' ? 'secondary' :
                              'outline'
                            }>
                              {alert.level}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatTime(alert.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 告警配置 */}
          <TabsContent value="alerts">
            <AlertConfigTab />
          </TabsContent>

          {/* 告警增强 */}
          <TabsContent value="alert-enhanced">
            <EnhancedAlertManagement />
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // 报告中心页面
  const ReportsTab = () => {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState<any>(null);

    useEffect(() => {
      if (activeTab === 'reports') {
        loadReportData();
      }
    }, [activeTab, selectedDate]);

    const loadReportData = async () => {
      try {
        const res = await fetch(`/api/admin/reports/${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          setReportData(data.data);
        }
      } catch (error) {
        
      }
    };

    const generateReport = async () => {
      if (confirm(`确定要生成 ${selectedDate} 的日终报告吗？`)) {
        try {
          const res = await fetch('/api/admin/reports/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: selectedDate })
          });
          if (res.ok) {
            alert('✅ 报告生成成功');
            loadReportData();
          }
        } catch (error) {
          alert('❌ 报告生成失败');
        }
      }
    };

    const exportCSV = async () => {
      try {
        const res = await fetch(`/api/admin/reports/${selectedDate}/export`);
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `records_${selectedDate}.csv`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      } catch (error) {
        alert('❌ 导出失败');
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-purple-500" />
              报告中心
            </h3>
            <p className="text-muted-foreground mt-1">
              查看日终报告和导出数据
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={loadReportData} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

        {/* 日期选择 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">选择报告日期</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={loadReportData}>
                查看报告
              </Button>
              <Button onClick={generateReport} variant="outline">
                生成报告
              </Button>
              <Button onClick={exportCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                导出 CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 报告内容 */}
        {reportData ? (
          <div className="space-y-6">
            {/* 概览 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">报告概览</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="text-sm text-muted-foreground">日期</label>
                    <p className="text-2xl font-bold">{reportData.date}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">总记录数</label>
                    <p className="text-2xl font-bold">{reportData.totalRecords || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">AI 自动回复</label>
                    <p className="text-2xl font-bold text-blue-600">{reportData.byStatus?.auto || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">人工接管</label>
                    <p className="text-2xl font-bold text-orange-600">{reportData.byStatus?.human || 0}</p>
                  </div>
                </div>

                {reportData.aiSummary && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">AI 总结</h4>
                    <p className="text-sm text-muted-foreground">{reportData.aiSummary}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 群分布 */}
            {reportData.byGroup && Object.keys(reportData.byGroup).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">群消息分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(reportData.byGroup).map(([groupName, info]: [string, any]) => (
                      <div key={groupName} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                            {groupName.charAt(0)}
                          </div>
                          <span className="font-medium">{groupName}</span>
                        </div>
                        <Badge variant="secondary">{info.count} 条消息</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 意图分布 */}
            {reportData.byIntent && Object.keys(reportData.byIntent).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">意图分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries(reportData.byIntent).map(([intent, count]: [string, any]) => (
                      <div key={intent} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium capitalize">{intent}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>选择日期并点击"查看报告"加载数据</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // AI 模型配置组件（提取到外部避免重新渲染）
  const AiModelConfig = React.memo(({ 
    type, 
    title, 
    description, 
    aiConfig,
    onSaveConfig,
    extraConfig
  }: { 
    type: string; 
    title: string; 
    description: string; 
    aiConfig: any;
    onSaveConfig: (type: string, config: any) => Promise<void>;
    extraConfig?: string[];
  }) => {
    const [useBuiltin, setUseBuiltin] = useState(true);
    const [builtinModelId, setBuiltinModelId] = useState('');
    const [customProvider, setCustomProvider] = useState('openai');
    const [customModel, setCustomModel] = useState('');
    const [customApiKey, setCustomApiKey] = useState('');
    const [customApiBase, setCustomApiBase] = useState('');
    
    // 高级配置参数
    const [systemPrompt, setSystemPrompt] = useState('');
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(1000);
    const [topP, setTopP] = useState(1.0);
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    const [isSaving, setIsSaving] = useState(false);
    
    // 使用 ref 避免重复初始化
    const initializedRef = useRef(false);
    const prevConfigRef = useRef<any>(null);
    const configRef = useRef<any>(null);

    const config = aiConfig?.ai?.[type as keyof typeof aiConfig.ai];
    const builtinModels = aiConfig?.ai?.builtinModels || [];
    
    // 只在第一次加载或配置真正变化时初始化
    useEffect(() => {
      // 使用 ref 来跟踪配置，避免重复执行
      configRef.current = config;
      
      // 检查配置是否真的变化了（避免重复设置）
      const configStr = JSON.stringify(config);
      if (initializedRef.current && prevConfigRef.current === configStr) {
        return; // 配置没有变化，跳过
      }
      
      if (config) {
        setUseBuiltin(config.useBuiltin);
        setBuiltinModelId(config.builtinModelId || '');
        if (config.customModel) {
          setCustomProvider(config.customModel.provider || 'openai');
          setCustomModel(config.customModel.model || '');
          setCustomApiKey(config.customModel.apiKey || '');
          setCustomApiBase(config.customModel.apiBase || '');
        }
        // 加载高级配置
        setSystemPrompt(config.systemPrompt || getDefaultSystemPrompt(type));
        setTemperature(config.temperature ?? 0.7);
        setMaxTokens(config.maxTokens ?? 1000);
        setTopP(config.topP ?? 1.0);
        initializedRef.current = true;
        prevConfigRef.current = configStr;
      }
    }, [config]); // 只依赖 config

    // 获取默认的系统提示词
    const getDefaultSystemPrompt = (type: string): string => {
      const prompts: Record<string, string> = {
        'intentRecognition': `你是一个企业微信群消息意图识别专家。请分析用户消息并返回意图类型。

意图类型定义：
- chat: 闲聊、问候、日常对话
- service: 服务咨询、问题求助
- help: 帮助请求、使用说明
- risk: 风险内容、敏感话题、恶意攻击
- spam: 垃圾信息、广告、刷屏
- welcome: 欢迎语、新人打招呼
- admin: 管理指令、系统配置

请以 JSON 格式返回结果，包含以下字段：
{
  "intent": "意图类型",
  "needReply": true/false,
  "needHuman": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}`,
        'serviceReply': `你是一个企业微信群服务助手。请根据用户问题和意图，生成专业、友好的回复。

回复要求：
1. 语言简洁明了，控制在 200 字以内
2. 语气亲切友好，使用表情符号增加亲和力
3. 避免敏感词汇和不当内容
4. 如果需要人工介入，明确提示`,
        'chat': `你是一个友好的聊天伙伴。请以轻松、自然的方式回应用户的闲聊内容。

要求：
1. 回复简短，控制在 100 字以内
2. 语气轻松活泼，可以使用表情符号
3. 保持对话连贯性`,
        'conversion': `你是一个专业的转化客服专员，擅长通过对话引导用户完成转化目标。

转化目标：
- 引导用户购买产品/服务
- 引导用户填写表单/注册账号
- 引导用户参加活动/预约
- 引导用户咨询详情

回复策略：
1. 先了解用户需求和痛点
2. 针对性地介绍产品/服务的价值
3. 用利益点而非功能点打动用户
4. 适时提出行动号召（CTA）
5. 语气热情、专业、有说服力
6. 适度使用表情符号增加亲和力
7. 控制在 300 字以内，保持简洁有力

注意事项：
- 不要过于强势或推销感太强
- 关注用户反馈，灵活调整策略
- 建立信任，避免引起反感`,
        'report': `你是一个数据分析师。请根据以下数据生成日终总结报告。

报告要求：
1. 包含关键指标统计（消息数、回复数、人工介入数等）
2. 识别问题和风险
3. 提出改进建议
4. 语言简洁专业`
      };
      return prompts[type] || '';
    };

    // 获取当前类型的分类关键词
    const getCategoryKeyword = (type: string) => {
      const mapping: Record<string, string> = {
        'intentRecognition': 'intent',
        'serviceReply': 'service',
        'chat': 'chat',
        'conversion': 'service',
        'report': 'report'
      };
      return mapping[type] || type;
    };

    // 过滤符合条件的模型
    const filteredModels = builtinModels.filter((m: any) => {
      const keyword = getCategoryKeyword(type);
      return m.category && m.category.includes(keyword);
    });

    const handleSave = async () => {
      setIsSaving(true);
      try {
        const configData = {
          useBuiltin,
          builtinModelId,
          useCustom: !useBuiltin,
          customModel: {
            provider: customProvider,
            model: customModel,
            apiKey: customApiKey,
            apiBase: customApiBase
          },
          // 高级配置
          systemPrompt,
          temperature,
          maxTokens,
          topP
        };

        await onSaveConfig(type, configData);

        // 如果有 extraConfig（用于客服与闲聊合并场景），同步保存其他配置
        if (extraConfig && Array.isArray(extraConfig)) {
          for (const syncType of extraConfig) {
            await onSaveConfig(syncType, configData);
          }
        }
      } finally {
        setIsSaving(false);
      }
    };

    const handleResetPrompt = () => {
      setSystemPrompt(getDefaultSystemPrompt(type));
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 模型类型选择 */}
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            <label className="text-sm font-medium">选择模型类型：</label>
            <div className="flex gap-2">
              <Button
                variant={useBuiltin ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseBuiltin(true)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                内置模型
              </Button>
              <Button
                variant={!useBuiltin ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseBuiltin(false)}
              >
                <Settings className="h-4 w-4 mr-2" />
                自定义 API
              </Button>
            </div>
          </div>

          {/* 内置模型选择 */}
          {useBuiltin && (
            <div className="space-y-4">
              <label className="text-sm font-medium">选择内置模型：</label>
              {filteredModels.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 border rounded-lg">
                  没有找到适合此场景的模型
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredModels.map((model: any) => (
                    <div
                      key={model.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        builtinModelId === model.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setBuiltinModelId(model.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{model.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {model.provider}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>最大 token: {model.maxTokens}</span>
                            <span>流式: {model.supportStream ? '✓' : '✗'}</span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          builtinModelId === model.id
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 自定义 API 配置 */}
          {!useBuiltin && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">API 提供商</label>
                  <select
                    value={customProvider}
                    onChange={(e) => setCustomProvider(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="openai">OpenAI (GPT)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="google">Google (Gemini)</option>
                    <option value="azure">Azure OpenAI</option>
                    <option value="zhipu">智谱 AI (GLM)</option>
                    <option value="baichuan">百川 AI</option>
                    <option value="minimax">MiniMax</option>
                    <option value="xunfei">讯飞星火</option>
                    <option value="custom">自定义 API</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">模型名称</label>
                  <Input
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="例如: gpt-4o, claude-3-opus-20240229"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">API Key</label>
                <Input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="输入 API Key"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">API Base URL (可选)</label>
                <Input
                  value={customApiBase}
                  onChange={(e) => setCustomApiBase(e.target.value)}
                  placeholder="例如: https://api.openai.com/v1"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  留空使用默认地址
                </p>
              </div>

              {/* 常见 API 配置提示 */}
              {customProvider === 'openai' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>OpenAI 配置提示</AlertTitle>
                  <AlertDescription className="text-sm">
                    常用模型：gpt-4o, gpt-4-turbo, gpt-3.5-turbo<br/>
                    API Base: https://api.openai.com/v1
                  </AlertDescription>
                </Alert>
              )}
              {customProvider === 'google' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Google Gemini 配置提示</AlertTitle>
                  <AlertDescription className="text-sm">
                    常用模型：gemini-1.5-pro, gemini-1.0-pro<br/>
                    API Base: https://generativelanguage.googleapis.com/v1beta
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* 高级配置 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                高级配置
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? '收起' : '展开'}
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4 ml-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-1" />
                )}
              </Button>
            </div>

            {showAdvanced && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                {/* 系统提示词 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">系统提示词（角色设定）</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetPrompt}
                      className="h-7 text-xs"
                    >
                      恢复默认
                    </Button>
                  </div>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="输入 AI 的角色设定和指令..."
                    className="w-full min-h-[120px] px-3 py-2 border rounded-md text-sm resize-vertical"
                  />
                  <p className="text-xs text-muted-foreground">
                    定义 AI 的角色、行为规则和回复风格
                  </p>
                </div>

                {/* 参数调整 */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* 温度 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <label>温度（创造性）</label>
                      <span className="font-mono text-xs">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      值越高，回复越有创造性（0-2）
                    </p>
                  </div>

                  {/* Top P */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <label>Top P（采样）</label>
                      <span className="font-mono text-xs">{topP}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={topP}
                      onChange={(e) => setTopP(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      控制回复多样性（0-1）
                    </p>
                  </div>

                  {/* 最大 Tokens */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <label>最大 Tokens</label>
                      <span className="font-mono text-xs">{maxTokens}</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="8000"
                      step="100"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      限制回复长度（100-8000）
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              '保存配置'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  });

  // 用户管理页面
  const UserManagement = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [newUser, setNewUser] = useState({
      username: '',
      password: '',
      role: 'operator',
      email: ''
    });

    // 使用 useRef 保存 loadUsers 函数，避免依赖项变化导致重复调用
    const loadUsersRef = useRef<any>(null);
    
    loadUsersRef.current = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data.data || []);
        }
      } catch (error) {
        
      } finally {
        setIsLoading(false);
      }
    };

    // 只在组件挂载时加载一次
    useEffect(() => {
      loadUsersRef.current();
    }, []);

    const handleAddUser = async () => {
      if (!newUser.username || !newUser.password || !newUser.role) {
        alert('请填写完整的用户信息');
        return;
      }

      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });

        if (res.ok) {
          alert('✅ 用户添加成功');
          setShowAddDialog(false);
          setNewUser({ username: '', password: '', role: 'operator', email: '' });
          loadUsersRef.current();
        } else {
          const text = await res.text();
          let errorMessage = '未知错误';
          try {
            const data = JSON.parse(text);
            errorMessage = data.error || data.message || errorMessage;
          } catch {
            if (text) errorMessage = text;
          }
          alert(`❌ 添加失败: ${errorMessage}`);
        }
      } catch (error) {
        
        alert('❌ 添加失败');
      } finally {
        setIsLoading(false);
      }
    };

    const handleUpdateUser = async () => {
      if (!editingUser) return;

      try {
        setIsLoading(true);
        const updateData: any = {};
        // 只有在密码非空时才包含密码字段
        if (editingUser.password && editingUser.password.trim() !== '') {
          updateData.password = editingUser.password;
        }
        if (editingUser.role) updateData.role = editingUser.role;
        if (editingUser.email !== undefined) updateData.email = editingUser.email;
        if (editingUser.isActive !== undefined) updateData.isActive = editingUser.isActive;

        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        if (res.ok) {
          alert('✅ 用户更新成功');
          setShowEditDialog(false);
          setEditingUser(null);
          loadUsersRef.current();
        } else {
          const text = await res.text();
          let errorMessage = '未知错误';
          try {
            const data = JSON.parse(text);
            errorMessage = data.error || data.message || errorMessage;
          } catch {
            if (text) errorMessage = text;
          }
          alert(`❌ 更新失败: ${errorMessage}`);
        }
      } catch (error) {
        
        alert('❌ 更新失败');
      } finally {
        setIsLoading(false);
      }
    };

    const handleDeleteUser = async (id: string) => {
      if (!confirm('确定要删除这个用户吗？')) return;

      try {
        setIsLoading(true);
        const res = await fetch(`/api/admin/users/${id}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          alert('✅ 用户已删除');
          loadUsersRef.current();
        } else {
          alert('❌ 删除失败');
        }
      } catch (error) {
        
        alert('❌ 删除失败');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-green-500" />
              用户管理
            </h3>
            <p className="text-muted-foreground mt-1">
              管理系统用户（管理员和监测员）
            </p>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            添加用户
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">用户列表</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无用户</p>
                <p className="text-sm mt-2">点击"添加用户"按钮创建新用户</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                        {user.role === 'admin' ? <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" /> : <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.username}</span>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? '管理员' : '操作员'}
                          </Badge>
                          {!user.isActive && <Badge variant="destructive">已禁用</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.email && `邮箱: ${user.email}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUser({
                            ...user,
                            password: ''  // 清空密码字段，避免显示当前密码
                          });
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-500 hover:text-red-700"
                        disabled={user.username === 'admin'}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 添加用户对话框 */}
        {showAddDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">添加用户</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">用户名</label>
                  <Input
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    placeholder="输入用户名"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">密码</label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    placeholder="输入密码"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">角色</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="operator">操作员</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">邮箱</label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="输入邮箱（可选）"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddDialog(false);
                      setNewUser({ username: '', password: '', role: 'operator', email: '' });
                    }}
                  >
                    取消
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleAddUser}
                    disabled={isLoading}
                  >
                    {isLoading ? '添加中...' : '添加'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 编辑用户对话框 */}
        {showEditDialog && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">编辑用户</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">用户名</label>
                  <Input
                    value={editingUser.username}
                    disabled
                    className="mt-1 bg-muted"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">密码（留空则不修改）</label>
                  <Input
                    type="password"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                    placeholder="输入新密码"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">角色</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                    disabled={editingUser.username === 'admin'}
                  >
                    <option value="operator">操作员</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">邮箱</label>
                  <Input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    placeholder="输入邮箱"
                    className="mt-1"
                  />
                </div>
                {editingUser.username !== 'admin' && (
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">启用状态</label>
                    <Switch
                      checked={editingUser.isActive}
                      onCheckedChange={(checked) => setEditingUser({...editingUser, isActive: checked})}
                    />
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setShowEditDialog(false);
                      setEditingUser(null);
                    }}
                  >
                    取消
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleUpdateUser}
                    disabled={isLoading}
                  >
                    {isLoading ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 人工告警配置组件
  const HumanAlertConfig = React.memo(() => {
    const [alertEnabled, setAlertEnabled] = useState(true);
    const [alertMode, setAlertMode] = useState('risk');
    const [recipients, setRecipients] = useState<any[]>([]);
    const [alertCount, setAlertCount] = useState(1);
    const [alertInterval, setAlertInterval] = useState(5);
    const defaultTemplate = useMemo(() => "⚠️ 风险告警\n\n【用户信息】\n用户：{userName}\n群组：{groupName}\n\n【风险内容】\n{messageContent}\n\n【时间】\n{timestamp}", []);
    const [messageTemplate, setMessageTemplate] = useState(defaultTemplate);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newRecipient, setNewRecipient] = useState({
      name: '',
      userId: '',
      type: 'private'
    });
    const [isLoading, setIsLoading] = useState(false);

    // 加载配置
    useEffect(() => {
      loadAlertConfig();
    }, []);

    const loadAlertConfig = useCallback(async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/human-handover/config');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setAlertEnabled(data.data.enabled || false);
            setAlertMode(data.data.autoMode || 'risk');
            setRecipients(data.data.alertRecipients || []);
            setAlertCount(data.data.alertCount || 1);
            setAlertInterval((data.data.alertInterval || 5000) / 1000);
            setMessageTemplate(data.data.alertMessageTemplate || defaultTemplate);
          }
        }
      } catch (error) {
        
      } finally {
        setIsLoading(false);
      }
    }, [defaultTemplate]);

    const handleSaveConfig = useCallback(async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/human-handover/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: alertEnabled,
            autoMode: alertMode,
            alertRecipients: recipients,
            alertCount: alertCount,
            alertInterval: alertInterval * 1000,
            alertMessageTemplate: messageTemplate
          })
        });
        
        if (res.ok) {
          alert('✅ 配置已保存');
        } else {
          alert('❌ 保存失败');
        }
      } catch (error) {
        
        alert('❌ 保存失败');
      } finally {
        setIsLoading(false);
      }
    }, [alertEnabled, alertMode, recipients, alertCount, alertInterval, messageTemplate]);

    const handleAddRecipient = useCallback(async () => {
      if (!newRecipient.name || !newRecipient.userId) {
        alert('请填写完整的接收者信息');
        return;
      }

      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/human-handover/recipients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecipient)
        });

        const data = await res.json();
        
        if (res.ok && data.success) {
          alert('✅ 接收者添加成功');
          setShowAddDialog(false);
          setNewRecipient({ name: '', userId: '', type: 'private' });
          loadAlertConfig();
        } else {
          alert(`❌ 添加失败: ${data.error || '未知错误'}`);
        }
      } catch (error) {
        
        alert('❌ 添加失败');
      } finally {
        setIsLoading(false);
      }
    }, [newRecipient, loadAlertConfig]);

    const handleToggleRecipient = useCallback(async (id: string, enabled: boolean) => {
      try {
        const res = await fetch(`/api/admin/human-handover/recipients/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled })
        });

        if (res.ok) {
          loadAlertConfig();
        }
      } catch (error) {
        
      }
    }, [loadAlertConfig]);

    const handleDeleteRecipient = useCallback(async (id: string) => {
      if (!confirm('确定要删除这个接收者吗？')) return;

      try {
        const res = await fetch(`/api/admin/human-handover/recipients/${id}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          alert('✅ 接收者已删除');
          loadAlertConfig();
        } else {
          alert('❌ 删除失败');
        }
      } catch (error) {
        
        alert('❌ 删除失败');
      }
    }, [loadAlertConfig]);

    return (
      <Card className="border-2 border-blue-200 dark:border-blue-900">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            人工告警配置
          </CardTitle>
          <CardDescription className="text-blue-100">
            配置风险内容的告警接收者和消息模板
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* 启用开关 */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">启用人工告警</label>
              <p className="text-xs text-muted-foreground">检测到风险内容时自动发送告警消息</p>
            </div>
            <Switch 
              checked={alertEnabled} 
              onCheckedChange={setAlertEnabled}
            />
          </div>

          {/* 告警模式 */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">告警模式</label>
              <p className="text-xs text-muted-foreground">选择自动告警或手动告警</p>
            </div>
            <select 
              className="px-3 py-2 border rounded-md text-sm"
              value={alertMode}
              onChange={(e) => setAlertMode(e.target.value)}
            >
              <option value="risk">风险内容自动告警</option>
              <option value="manual">手动发送告警</option>
            </select>
          </div>

          {/* 接收者列表 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">告警接收者</label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                添加接收者
              </Button>
            </div>
            
            {recipients.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/30">
                <p className="mb-2">配置接收告警的微信用户：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>填写微信用户的名称</li>
                  <li>填写微信用户的ID（必填）</li>
                  <li>选择发送方式（私聊或群聊）</li>
                  <li>可配置多个接收者，系统会逐一发送告警</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-2">
                {recipients.map((recipient: any) => (
                  <div 
                    key={recipient.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={recipient.enabled}
                        onCheckedChange={(checked) => handleToggleRecipient(recipient.id, checked)}
                      />
                      <div>
                        <p className="font-medium text-sm">{recipient.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {recipient.type === 'private' ? '私聊' : '群聊'}: {recipient.userId}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRecipient(recipient.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 发送配置 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">发送次数</label>
                <p className="text-xs text-muted-foreground">每个接收者发送的告警消息数量</p>
              </div>
              <select 
                className="px-3 py-2 border rounded-md text-sm"
                value={alertCount}
                onChange={(e) => setAlertCount(parseInt(e.target.value))}
              >
                <option value="1">1 次</option>
                <option value="2">2 次</option>
                <option value="3">3 次</option>
                <option value="5">5 次</option>
                <option value="10">10 次</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">发送间隔</label>
                <p className="text-xs text-muted-foreground">多次发送时的间隔时间（秒）</p>
              </div>
              <select 
                className="px-3 py-2 border rounded-md text-sm"
                value={alertInterval}
                onChange={(e) => setAlertInterval(parseInt(e.target.value))}
              >
                <option value="1">1 秒</option>
                <option value="5">5 秒</option>
                <option value="10">10 秒</option>
                <option value="30">30 秒</option>
                <option value="60">60 秒</option>
              </select>
            </div>
          </div>

          {/* 消息模板 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">告警消息模板</label>
            <p className="text-xs text-muted-foreground">
              支持的变量：{'{userName}'} - 用户名，{'{groupName}'} - 群组名，{'{messageContent}'} - 消息内容，{'{timestamp}'} - 时间
            </p>
            <textarea
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              placeholder="输入告警消息模板..."
              className="w-full min-h-[120px] px-3 py-2 border rounded-md text-sm resize-vertical font-mono"
            />
          </div>

          {/* 保存按钮 */}
          <Button 
            onClick={handleSaveConfig} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              '保存配置'
            )}
          </Button>

          {/* 添加接收者对话框 */}
          {showAddDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold mb-4">添加接收者</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">名称</label>
                    <Input
                      value={newRecipient.name}
                      onChange={(e) => setNewRecipient({...newRecipient, name: e.target.value})}
                      placeholder="例如：管理员小王"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">用户ID（必填）</label>
                    <Input
                      value={newRecipient.userId}
                      onChange={(e) => setNewRecipient({...newRecipient, userId: e.target.value})}
                      placeholder="例如：wxid_xxx"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">发送方式</label>
                    <select
                      value={newRecipient.type}
                      onChange={(e) => setNewRecipient({...newRecipient, type: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="private">私聊</option>
                      <option value="group">群聊</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setShowAddDialog(false);
                        setNewRecipient({ name: '', userId: '', type: 'private' });
                      }}
                    >
                      取消
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleAddRecipient}
                      disabled={isLoading}
                    >
                      {isLoading ? '添加中...' : '添加'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  });

  // QA 问答库管理页面
  const QAManagement = () => {
    const [qaList, setQaList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingQA, setEditingQA] = useState<any>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newQA, setNewQA] = useState({
      keyword: '',
      reply: '',
      receiverType: 'all',
      priority: 5,
      isExactMatch: false,
      relatedKeywords: '',
      groupName: '',
      isActive: true
    });
    const [searchTerm, setSearchTerm] = useState('');

    const loadQAList = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/qa');
        if (res.ok) {
          const data = await res.json();
          setQaList(data.data || []);
        }
      } catch (error) {
        console.error('加载 QA 列表失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleAddQA = async () => {
      try {
        const res = await fetch('/api/admin/qa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newQA)
        });
        if (res.ok) {
          alert('✅ QA 问答添加成功');
          setShowAddModal(false);
          setNewQA({
            keyword: '',
            reply: '',
            receiverType: 'all',
            priority: 5,
            isExactMatch: false,
            relatedKeywords: '',
            groupName: '',
            isActive: true
          });
          loadQAList();
        } else {
          alert('❌ 添加失败');
        }
      } catch (error) {
        alert('❌ 添加失败');
      }
    };

    const handleUpdateQA = async () => {
      if (!editingQA) return;
      try {
        const res = await fetch(`/api/admin/qa/${editingQA.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingQA)
        });
        if (res.ok) {
          alert('✅ QA 问答更新成功');
          setEditingQA(null);
          loadQAList();
        } else {
          alert('❌ 更新失败');
        }
      } catch (error) {
        alert('❌ 更新失败');
      }
    };

    const handleDeleteQA = async (id: string) => {
      if (!confirm('确定要删除这条 QA 问答吗？')) return;
      try {
        const res = await fetch(`/api/admin/qa/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          alert('✅ QA 问答删除成功');
          loadQAList();
        } else {
          alert('❌ 删除失败');
        }
      } catch (error) {
        alert('❌ 删除失败');
      }
    };

    useEffect(() => {
      loadQAList();
    }, []);

    const filteredQAList = qaList.filter(qa => 
      qa.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qa.reply.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6 text-gray-500" />
              QA 问答库
            </h3>
            <p className="text-muted-foreground mt-1">
              管理系统问答知识库，支持精确匹配和模糊匹配
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            添加问答
          </Button>
        </div>

        {/* 搜索框 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Search className="h-4 w-4 mt-3 text-muted-foreground" />
              <Input
                placeholder="搜索关键词或回复内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* QA 列表 */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : filteredQAList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无 QA 问答
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQAList.map((qa) => (
                  <div key={qa.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={qa.isExactMatch ? 'default' : 'secondary'}>
                            {qa.isExactMatch ? '精确匹配' : '模糊匹配'}
                          </Badge>
                          <Badge variant="outline">
                            优先级: {qa.priority}
                          </Badge>
                          {qa.groupName && (
                            <Badge variant="outline">
                              群: {qa.groupName}
                            </Badge>
                          )}
                          <Badge variant={qa.isActive ? 'default' : 'secondary'}>
                            {qa.isActive ? '启用' : '禁用'}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">关键词:</span>
                          <span className="font-medium ml-2">{qa.keyword}</span>
                        </div>
                        {qa.relatedKeywords && (
                          <div>
                            <span className="text-sm text-muted-foreground">关联关键词:</span>
                            <span className="ml-2">{qa.relatedKeywords}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-sm text-muted-foreground">回复:</span>
                          <p className="mt-1">{qa.reply}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingQA(qa)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQA(qa.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 添加 QA 模态框 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>添加 QA 问答</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">关键词 *</label>
                  <Input
                    value={newQA.keyword}
                    onChange={(e) => setNewQA({ ...newQA, keyword: e.target.value })}
                    placeholder="输入关键词"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">回复内容 *</label>
                  <textarea
                    value={newQA.reply}
                    onChange={(e) => setNewQA({ ...newQA, reply: e.target.value })}
                    placeholder="输入回复内容"
                    rows={4}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">接收者类型</label>
                    <select
                      value={newQA.receiverType}
                      onChange={(e) => setNewQA({ ...newQA, receiverType: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    >
                      <option value="all">全部</option>
                      <option value="user">私聊</option>
                      <option value="group">群聊</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">优先级</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={newQA.priority}
                      onChange={(e) => setNewQA({ ...newQA, priority: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">关联关键词（逗号分隔）</label>
                  <Input
                    value={newQA.relatedKeywords}
                    onChange={(e) => setNewQA({ ...newQA, relatedKeywords: e.target.value })}
                    placeholder="输入关联关键词"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">限制群名（可选）</label>
                  <Input
                    value={newQA.groupName}
                    onChange={(e) => setNewQA({ ...newQA, groupName: e.target.value })}
                    placeholder="输入群名"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newQA.isExactMatch}
                    onCheckedChange={(checked) => setNewQA({ ...newQA, isExactMatch: checked })}
                  />
                  <span className="text-sm">精确匹配</span>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddModal(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddQA}>
                    添加
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 编辑 QA 模态框 */}
        {editingQA && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>编辑 QA 问答</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">关键词 *</label>
                  <Input
                    value={editingQA.keyword}
                    onChange={(e) => setEditingQA({ ...editingQA, keyword: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">回复内容 *</label>
                  <textarea
                    value={editingQA.reply}
                    onChange={(e) => setEditingQA({ ...editingQA, reply: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">接收者类型</label>
                    <select
                      value={editingQA.receiverType}
                      onChange={(e) => setEditingQA({ ...editingQA, receiverType: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    >
                      <option value="all">全部</option>
                      <option value="user">私聊</option>
                      <option value="group">群聊</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">优先级</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={editingQA.priority}
                      onChange={(e) => setEditingQA({ ...editingQA, priority: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">关联关键词（逗号分隔）</label>
                  <Input
                    value={editingQA.relatedKeywords || ''}
                    onChange={(e) => setEditingQA({ ...editingQA, relatedKeywords: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">限制群名（可选）</label>
                  <Input
                    value={editingQA.groupName || ''}
                    onChange={(e) => setEditingQA({ ...editingQA, groupName: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingQA.isExactMatch}
                    onCheckedChange={(checked) => setEditingQA({ ...editingQA, isExactMatch: checked })}
                  />
                  <span className="text-sm">精确匹配</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingQA.isActive}
                    onCheckedChange={(checked) => setEditingQA({ ...editingQA, isActive: checked })}
                  />
                  <span className="text-sm">启用</span>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditingQA(null)}>
                    取消
                  </Button>
                  <Button onClick={handleUpdateQA}>
                    保存
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // 系统设置页面
  const SettingsTab = ({ aiConfig: propsAiConfig, isLoadingAiConfig: propsIsLoadingAiConfig }: { 
    aiConfig: any; 
    isLoadingAiConfig: boolean;
  }) => {
    const [autoReplyMode, setAutoReplyMode] = useState('ai');
    const [chatProbability, setChatProbability] = useState(30);
    const [serviceReplyEnabled, setServiceReplyEnabled] = useState(true);
    const [riskAutoHuman, setRiskAutoHuman] = useState(true);
    
    // 使用 localStorage 保存用户的标签页选择
    const [activeAiTab, setActiveAiTab] = useState(() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('aiConfigTab');
        return saved || 'intentRecognition';
      }
      return 'intentRecognition';
    });

    // 当标签页变化时，保存到 localStorage
    const handleTabChange = (value: string) => {
      setActiveAiTab(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem('aiConfigTab', value);
      }
    };

    // 移除内部加载逻辑，使用父组件传入的状态
    // const [aiConfig, setAiConfig] = useState<any>(null);
    // const [isLoadingAiConfig, setIsLoadingAiConfig] = useState(false);
    // const [hasLoadedAiConfig, setHasLoadedAiConfig] = useState(false);

    // useEffect(() => {
    //   // 只在第一次加载时请求，避免重复请求
    //   if (!hasLoadedAiConfig) {
    //     loadAiConfig();
    //     setHasLoadedAiConfig(true);
    //   }
    // }, [hasLoadedAiConfig]);

    // const loadAiConfig = async () => {
    //   if (isLoadingAiConfig) return; // 防止重复加载
      
    //   setIsLoadingAiConfig(true);
    //   try {
    //     
    //     const res = await fetch('/api/admin/config', { cache: 'no-store' });
        
    //     
        
    //     if (res.ok) {
    //       const data = await res.json();
    //       
    //       setAiConfig(data.data);
    //     } else {
    //       
    //       const errorText = await res.text();
    //       
    //       setAiConfig(null); // 明确设置为 null
    //     }
    //   } catch (error) {
    //     
    //     setAiConfig(null); // 明确设置为 null
    //   } finally {
    //     setIsLoadingAiConfig(false);
    //   }
    // };

    // 保存 AI 模型配置
    const saveAiConfig = useCallback(async (type: string, config: any) => {
      try {
        const res = await fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ai: {
              [type]: config
            }
          })
        });
        if (res.ok) {
          alert('✅ AI 模型配置已保存');
          // 重新加载 AI 配置，确保状态同步
          // 这里不需要重置 activeAiTab，让用户保持在当前标签页
        } else {
          alert('❌ 保存失败');
        }
      } catch (error) {
        console.error('保存 AI 配置失败:', error);
        alert('❌ 保存失败');
      }
    }, []);

    const saveSettings = useCallback(async () => {
      try {
        const res = await fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            autoReply: {
              chatMode: autoReplyMode,
              chatProbability: chatProbability / 100,
              serviceMode: serviceReplyEnabled ? 'auto' : 'none',
              riskMode: riskAutoHuman ? 'human' : 'auto'
            }
          })
        });
        if (res.ok) {
          alert('✅ 设置已保存');
        }
      } catch (error) {
        alert('❌ 保存失败');
      }
    }, [autoReplyMode, chatProbability, serviceReplyEnabled, riskAutoHuman]);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-gray-500" />
              系统设置
            </h3>
            <p className="text-muted-foreground mt-1">
              配置系统运行参数和策略
            </p>
          </div>
        </div>

        {/* AI 模型配置 */}
        <Card className="border-2 border-purple-200 dark:border-purple-900">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              AI 模型配置
            </CardTitle>
            <CardDescription className="text-purple-100">
              配置意图判断、客服与闲聊、报告生成的 AI 模型
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {propsIsLoadingAiConfig ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-purple-500" />
                  <p className="text-sm text-muted-foreground mt-2">正在加载 AI 模型配置...</p>
                </div>
              </div>
            ) : !propsAiConfig ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
                  <p className="text-sm text-muted-foreground mt-2">AI 模型配置加载失败</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => {
                      // TODO: 需要将父组件的 loadAiConfig 函数通过 props 传递下来
                      // 临时方案：重新加载页面
                      window.location.reload();
                    }}
                  >
                    重新加载
                  </Button>
                </div>
              </div>
            ) : (
              <Tabs value={activeAiTab} onValueChange={handleTabChange} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="intentRecognition">意图判断</TabsTrigger>
                  <TabsTrigger value="serviceChat">客服与闲聊</TabsTrigger>
                  <TabsTrigger value="conversion">转化客服</TabsTrigger>
                  <TabsTrigger value="report">报告生成</TabsTrigger>
                </TabsList>

                <TabsContent value="intentRecognition">
                  <AiModelConfig
                    type="intentRecognition"
                    title="意图判断模型"
                    description="用于分析用户消息意图，支持聊天、服务、帮助、风险等识别"
                    aiConfig={propsAiConfig}
                    onSaveConfig={saveAiConfig}
                  />
                </TabsContent>

                <TabsContent value="serviceChat">
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-900 dark:text-blue-100">
                          <p className="font-medium mb-1">客服与闲聊共用模型</p>
                          <p className="text-blue-700 dark:text-blue-300">
                            此配置同时应用于"服务回复"和"闲聊"两个场景，使用同一个AI模型处理。
                          </p>
                        </div>
                      </div>
                    </div>

                    <AiModelConfig
                      type="serviceReply"
                      title="客服与闲聊模型"
                      description="用于自动回复服务类问题和闲聊陪伴，生成专业、友好、自然的对话"
                      aiConfig={propsAiConfig}
                      onSaveConfig={saveAiConfig}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="conversion">
                  <div className="space-y-6">
                    <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-900 dark:text-amber-100">
                          <p className="font-medium mb-1">转化客服专用模式</p>
                          <p className="text-amber-700 dark:text-amber-300">
                            转化客服模式专门用于销售和转化场景，通过引导性对话促进用户完成购买、注册等转化目标。需要在机器人管理中为特定机器人开启"转化客服模式"才能生效。
                          </p>
                        </div>
                      </div>
                    </div>

                    <AiModelConfig
                      type="conversion"
                      title="转化客服模型"
                      description="用于销售转化场景，通过对话引导用户完成购买、注册、预约等转化目标"
                      aiConfig={propsAiConfig}
                      onSaveConfig={saveAiConfig}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="report">
                  <AiModelConfig
                    type="report"
                    title="报告生成模型"
                    description="用于生成日终报告，数据分析和总结"
                    aiConfig={propsAiConfig}
                    onSaveConfig={saveAiConfig}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* 自动回复策略 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              自动回复策略
            </CardTitle>
            <CardDescription>配置 AI 自动回复行为</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">闲聊模式</label>
                <p className="text-xs text-muted-foreground">控制闲聊消息的回复方式</p>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={autoReplyMode}
                  onChange={(e) => setAutoReplyMode(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="none">不回复</option>
                  <option value="probability">概率回复</option>
                  <option value="fixed">固定话术</option>
                  <option value="ai">AI 陪聊</option>
                </select>
              </div>
            </div>

            {autoReplyMode === 'probability' && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">回复概率</label>
                  <span className="text-sm text-muted-foreground">{chatProbability}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={chatProbability}
                  onChange={(e) => setChatProbability(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  设置 AI 回复闲聊消息的概率
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">服务回复</label>
                <p className="text-xs text-muted-foreground">自动回复服务类问题</p>
              </div>
              <Switch 
                checked={serviceReplyEnabled}
                onCheckedChange={setServiceReplyEnabled}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">风险内容处理</label>
                <p className="text-xs text-muted-foreground">检测到风险内容时自动转人工</p>
              </div>
              <Switch 
                checked={riskAutoHuman}
                onCheckedChange={setRiskAutoHuman}
              />
            </div>

            <Button onClick={saveSettings} className="w-full">
              保存设置
            </Button>
          </CardContent>
        </Card>

        {/* 人工告警配置 */}
        <HumanAlertConfig />

        {/* 监控预警设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              监控预警设置
            </CardTitle>
            <CardDescription>配置系统监控和预警规则</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">机器人掉线告警</label>
                <p className="text-xs text-muted-foreground">机器人掉线时发送告警消息</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">错误率告警</label>
                <p className="text-xs text-muted-foreground">错误率超过 10% 时发送告警</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">垃圾信息检测</label>
                <p className="text-xs text-muted-foreground">检测到垃圾信息时发送告警</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* 系统信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              系统信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">系统版本</span>
              <span className="font-medium">v1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">运行模式</span>
              <Badge variant="outline">内存模式</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">基础地址</span>
              <span className="font-mono text-xs">{callbacks?.baseUrl || '未配置'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

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

  // 实时IO查看页面
  const RealtimeIOTab = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'user' | 'bot'>('all');
    const [selectedRobot, setSelectedRobot] = useState<string>('');
    const [messageLimit, setMessageLimit] = useState<number>(50);
    const lastFetchTime = useRef<number>(0);

    const loadMessages = async (limit?: number) => {
      // 防抖：1秒内不重复加载
      const now = Date.now();
      if (now - lastFetchTime.current < 1000) {
        console.log('RealtimeIO: 防抖，跳过本次加载');
        return;
      }
      lastFetchTime.current = now;

      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.append('limit', (limit || messageLimit).toString());
        if (filterType !== 'all') {
          params.append('type', filterType);
        }
        if (selectedRobot) {
          params.append('robotId', selectedRobot);
        }

        console.log(`RealtimeIO: 加载消息 limit=${limit || messageLimit}, filter=${filterType}, robot=${selectedRobot}`);

        const res = await fetch(`/api/ai-io?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          console.log(`RealtimeIO: 加载完成，共 ${data.data?.length || 0} 条消息`);
          setMessages(data.data || []);
        }
      } catch (error) {
        console.error('加载消息失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 只在组件首次挂载时加载一次
    useEffect(() => {
      console.log('RealtimeIO: 组件挂载');
      loadMessages();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">实时 AI 输入输出</h2>
            <p className="text-muted-foreground">实时查看 AI 的输入和输出内容</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMessages()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">用户消息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {messages.filter(m => m.type === 'user').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">机器人回复</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {messages.filter(m => m.type === 'bot').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">总消息数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messages.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">会话数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(messages.map(m => m.sessionId)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>消息列表</CardTitle>
                <CardDescription>最近 {messageLimit} 条消息记录</CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="user">用户消息</SelectItem>
                    <SelectItem value="bot">机器人回复</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={messageLimit.toString()} onValueChange={(value) => setMessageLimit(parseInt(value))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50条</SelectItem>
                    <SelectItem value="100">100条</SelectItem>
                    <SelectItem value="200">200条</SelectItem>
                    <SelectItem value="500">500条</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无消息记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg: any, index: number) => (
                  <div
                    key={msg.id || index}
                    className={`p-4 rounded-lg border ${
                      msg.type === 'user'
                        ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                        : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {msg.type === 'user' ? (
                          <User className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Bot className="h-4 w-4 text-green-600" />
                        )}
                        <span className="font-medium text-sm">
                          {msg.type === 'user' ? msg.userName : msg.robotName || '机器人'}
                        </span>
                        {msg.intent && (
                          <Badge variant="outline" className="text-xs">
                            {msg.intent}
                          </Badge>
                        )}
                        {msg.confidence && (
                          <Badge variant="outline" className="text-xs">
                            置信度: {(msg.confidence * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {msg.content}
                    </div>
                    {msg.groupName && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        群组: {msg.groupName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // 仪表盘主页面
  const DashboardTab = () => (
    <div className="space-y-6">
      <OverviewTab />
      
      {/* 在线机器人信息 */}
      {onlineRobots.length > 0 && (
        <Card className="border-2 border-indigo-200 dark:border-indigo-900">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-5 w-5" />
                在线机器人
              </CardTitle>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                {onlineRobots.length} 个在线
              </Badge>
            </div>
            <CardDescription className="text-indigo-100">
              当前系统中正在运行的机器人
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {onlineRobots.map((robot) => (
                <div 
                  key={robot.id} 
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950"
                  onClick={() => {
                    setSelectedRobot(robot);
                    setShowRobotDetail(true);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                      <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{robot.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono truncate">{robot.robotId}</p>
                      {robot.nickname && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate">
                          {robot.nickname}
                        </p>
                      )}
                    </div>
                    <Badge variant="default" className="gap-1 bg-green-500">
                      <CheckCircle className="h-3 w-3" />
                      在线
                    </Badge>
                  </div>
                  
                  {/* 详细信息 */}
                  {(robot.company || robot.ipAddress || robot.activatedAt || robot.expiresAt) && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {robot.company && (
                        <div className="flex items-center gap-2 text-xs">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{robot.company}</span>
                        </div>
                      )}
                      {robot.ipAddress && (
                        <div className="flex items-center gap-2 text-xs">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono truncate">{robot.ipAddress}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        {robot.activatedAt && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>已运行 {calculateRunTime(robot)}</span>
                          </div>
                        )}
                        {robot.expiresAt && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>剩余 {calculateRemainingTime(robot)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {robot.description && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{robot.description}</p>
                  )}
                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>
                      最后检查: {robot.lastCheckAt ? formatTime(robot.lastCheckAt) : '从未检查'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveTab('robots')}
              >
                查看所有机器人 <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      {/* 头部 */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  WorkTool AI 中枢系统
                </h1>
                <p className="text-sm text-muted-foreground">企业微信社群智能运营平台</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                {callbacks?.baseUrl || '加载中...'}
              </div>
              <Badge 
                variant={connectionStatus === 'connected' ? 'default' : 'destructive'} 
                className="gap-1"
              >
                {connectionStatus === 'connected' ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    运行中
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    未连接
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-12 lg:w-auto lg:inline-grid h-auto p-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <TabsTrigger value="dashboard" className="gap-2 py-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">仪表盘</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2 py-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">会话管理</span>
            </TabsTrigger>
            <TabsTrigger value="robots" className="gap-2 py-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">机器人管理</span>
            </TabsTrigger>
            <TabsTrigger value="monitor" className="gap-2 py-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">监控告警</span>
            </TabsTrigger>
            <TabsTrigger value="realtime" className="gap-2 py-2">
              <Terminal className="h-4 w-4" />
              <span className="hidden sm:inline">实时消息</span>
            </TabsTrigger>
            <TabsTrigger value="prompt-training" className="gap-2 py-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">AI 训练</span>
            </TabsTrigger>
            <TabsTrigger value="callbacks" className="gap-2 py-2 hidden">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">回调中心</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2 py-2">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">用户管理</span>
            </TabsTrigger>
            <TabsTrigger value="qa" className="gap-2 py-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">知识库</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 py-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">系统设置</span>
            </TabsTrigger>
            <TabsTrigger value="system-logs" className="gap-2 py-2">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">系统日志</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-2 py-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">实时监控</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardTab />
          </TabsContent>

          <TabsContent value="callbacks" className="space-y-6 hidden">
            <CallbackCenter />
          </TabsContent>

          <TabsContent value="robots" className="space-y-6">
            <RobotManagement />
          </TabsContent>

          <TabsContent value="qa" className="space-y-6">
            <div className="text-center py-12 space-y-4">
              <div className="flex justify-center">
                <Database className="h-16 w-16 text-blue-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">知识库管理</h3>
                <p className="text-muted-foreground mt-2">
                  管理问答库、文档和报告
                </p>
              </div>
              <Button 
                size="lg"
                onClick={() => window.location.href = '/knowledge-base'}
                className="gap-2"
              >
                <BookOpen className="h-5 w-5" />
                进入知识库
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <SessionsTab />
          </TabsContent>

          <TabsContent value="monitor" className="space-y-6">
            <MonitorTab />
          </TabsContent>

          <TabsContent value="realtime" className="space-y-6">
            <RealtimeIOTab />
          </TabsContent>

          <TabsContent value="prompt-training" className="space-y-6">
            <PromptTraining />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SettingsTab aiConfig={aiConfig} isLoadingAiConfig={isLoadingAiConfig} />
          </TabsContent>

          <TabsContent value="system-logs" className="space-y-6">
            <SystemLogs />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <MonitoringTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* 精美页脚 */}
      <footer className="mt-auto border-t bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 py-12">
          {/* 主要内容区 */}
          <div className="grid gap-8 lg:gap-12 md:grid-cols-3">
            {/* 品牌信息 */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/20">
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    WorkTool AI
                  </h4>
                  <p className="text-sm text-muted-foreground">企业微信社群智能运营平台</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-lg">
                专注于企业微信群智能化运营，提供意图识别、自动回复、告警监控等全方位解决方案。
                助力企业高效管理社群，提升用户体验，实现数字化转型。
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <Zap className="h-3 w-3" />
                  高效智能
                </Badge>
                <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <ShieldCheck className="h-3 w-3" />
                  安全可靠
                </Badge>
                <Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  <Activity className="h-3 w-3" />
                  实时监控
                </Badge>
              </div>
            </div>

            {/* 联系方式 */}
            <div>
              <div className="flex gap-2">
                {/* 手机 */}
                <Card className="flex-1 min-w-[100px] border border-blue-100 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                  <CardContent className="p-2">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <MessageCircle className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 w-full">
                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">手机</div>
                        <div className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">13337289759</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 微信 */}
                <Card className="flex-1 min-w-[100px] border border-green-100 dark:border-green-900/50 hover:border-green-300 dark:hover:border-green-700 transition-colors">
                  <CardContent className="p-2">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <MessageCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 w-full">
                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">微信</div>
                        <div className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">xhy12040523</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* QQ */}
                <Card className="flex-1 min-w-[100px] border border-purple-100 dark:border-purple-900/50 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                  <CardContent className="p-2">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Globe className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 w-full">
                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">QQ</div>
                        <div className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">1823985558</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* 底部版权栏 */}
          <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-xs text-muted-foreground">
                © 2026 WorkTool AI. 企业微信社群智能运营平台. All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  Powered by Next.js
                </span>
                <span className="flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  Fastify Backend
                </span>
                <span className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  PostgreSQL
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* 会话详情弹窗 */}
      <Dialog open={showSessionDetail} onOpenChange={setShowSessionDetail}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="h-6 w-6 text-blue-500" />
              会话详情
            </DialogTitle>
            <DialogDescription className="text-base">
              查看会话的详细信息和消息记录
            </DialogDescription>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-6">
              {/* 会话基本信息卡片 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">基本信息</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">用户</p>
                      <p className="font-medium">{selectedSession.userName || selectedSession.userInfo?.userName || '未知用户'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">群组</p>
                      <p className="font-medium">{selectedSession.groupName || selectedSession.userInfo?.groupName || '未知群组'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">企业</p>
                      <p className="font-medium">
                        {selectedSession.company || selectedSession.robotName || '未知企业'}
                        {selectedSession.robotNickname && ` (${selectedSession.robotNickname})`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">会话ID</p>
                      <p className="font-mono text-sm">{selectedSession.sessionId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">最后活跃</p>
                      <p className="text-sm">
                        {new Date(selectedSession.lastActiveTime).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">消息数</p>
                      <p className="font-medium">{selectedSession.messageCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">当前状态</p>
                      <Badge variant={selectedSession.status === 'auto' ? 'default' : 'secondary'}>
                        {selectedSession.status === 'auto' ? (
                          <>
                            <Bot className="h-3 w-3 mr-1" />
                            AI 接管
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            人工
                          </>
                        )}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">AI 回复</p>
                      <p className="font-medium">{selectedSession.aiReplyCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">人工回复</p>
                      <p className="font-medium">{selectedSession.humanReplyCount || 0}</p>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
                    {selectedSession.status === 'auto' ? (
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/admin/sessions/${selectedSession.sessionId}/takeover`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ operator: 'admin' })
                            });
                            if (res.ok) {
                              alert('✅ 已切换为人工接管');
                              setShowSessionDetail(false);
                              // 重新加载会话列表
                              const sessionsRes = await fetch('/api/admin/sessions/active?limit=20');
                              if (sessionsRes.ok) {
                                const data = await sessionsRes.json();
                                // 去重：确保sessionId唯一
                                const uniqueSessions = (data.data || []).reduce((acc: Session[], session: Session) => {
                                  if (!acc.find(s => s.sessionId === session.sessionId)) {
                                    acc.push(session);
                                  }
                                  return acc;
                                }, []);
                                setSessions(uniqueSessions);
                              }
                            } else {
                              alert('❌ 切换失败');
                            }
                          } catch (error) {
                            console.error('切换失败:', error);
                            alert('❌ 切换失败');
                          }
                        }}
                      >
                        <UserCheck className="h-4 w-4" />
                        切换为人工接管
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/admin/sessions/${selectedSession.sessionId}/auto`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({})
                            });
                            if (res.ok) {
                              alert('✅ 已切换回自动模式');
                              // 重新加载会话信息
                              const sessionRes = await fetch(`/api/admin/sessions/${selectedSession.sessionId}`);
                              if (sessionRes.ok) {
                                const data = await sessionRes.json();
                                if (data.success && data.data) {
                                  setSelectedSession(data.data);
                                }
                              }
                              // 重新加载会话列表
                              const sessionsRes = await fetch('/api/admin/sessions/active?limit=20');
                              if (sessionsRes.ok) {
                                const data = await sessionsRes.json();
                                // 去重：确保sessionId唯一
                                const uniqueSessions = (data.data || []).reduce((acc: Session[], session: Session) => {
                                  if (!acc.find(s => s.sessionId === session.sessionId)) {
                                    acc.push(session);
                                  }
                                  return acc;
                                }, []);
                                setSessions(uniqueSessions);
                              }
                            } else {
                              alert('❌ 切换失败');
                            }
                          } catch (error) {
                            console.error('切换失败:', error);
                            alert('❌ 切换失败');
                          }
                        }}
                      >
                        <Bot className="h-4 w-4" />
                        切换回自动模式
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 消息记录 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    消息记录
                    <Badge variant="outline" className="ml-2">{sessionMessages.length} 条</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingSessionMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                      <span className="text-sm text-muted-foreground">加载中...</span>
                    </div>
                  ) : sessionMessages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>暂无消息记录</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {sessionMessages.map((msg: any) => (
                        <div
                          key={msg.id || msg.timestamp || Math.random()}
                          className={`flex ${msg.isFromUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] ${
                            msg.isFromUser
                              ? 'bg-blue-500 text-white'
                              : msg.isHuman
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : 'bg-gray-100 dark:bg-gray-800'
                          } rounded-2xl p-4 ${msg.isFromUser ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                              <span className={`text-sm font-bold ${msg.isFromUser ? 'text-white' : 'text-foreground'}`}>
                                {msg.isFromUser ? (
                                  <>
                                    <User className="h-4 w-4 inline mr-1.5" />
                                    {msg.userName || '用户'}
                                  </>
                                ) : msg.isHuman ? (
                                  <>
                                    <UserCheck className="h-4 w-4 inline mr-1.5" />
                                    {msg.extraData?.operator || '人工客服'}
                                  </>
                                ) : (
                                  <>
                                    <Bot className="h-4 w-4 inline mr-1.5 text-blue-600 dark:text-blue-400" />
                                    {msg.robotName || (msg.robotId && robotInfoMap[msg.robotId]?.name) || 'AI'}
                                  </>
                                )}
                              </span>
                              <span className="text-xs opacity-70">
                                {new Date(msg.timestamp).toLocaleString('zh-CN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            {msg.intent && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                意图: {msg.intent}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 回复表单 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    回复消息
                    {replyResult && (
                      <Badge variant={replyResult.success ? "default" : "destructive"} className="ml-2">
                        {replyResult.success ? "发送成功" : "发送失败"}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedSession?.robotId ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Bot className="h-4 w-4" />
                        <span>使用机器人: {selectedSession.robotName || selectedSession.robotNickname || selectedSession.robotId}</span>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reply-content">回复内容</Label>
                        <Textarea
                          id="reply-content"
                          placeholder="请输入回复内容..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          disabled={isSendingReply}
                          rows={4}
                          className="resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>发送到:</span>
                          <Badge variant="outline">
                            {selectedSession.groupName ? `群聊: ${selectedSession.groupName}` : `私聊: ${selectedSession.userName}`}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setReplyContent('');
                              setReplyResult(null);
                            }}
                            disabled={isSendingReply || !replyContent}
                          >
                            清空
                          </Button>
                          <Button
                            onClick={handleSendReply}
                            disabled={isSendingReply || !replyContent.trim()}
                            className="min-w-[120px]"
                          >
                            {isSendingReply ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                发送中...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                发送
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {replyResult && (
                        <Alert variant={replyResult.success ? "default" : "destructive"}>
                          {replyResult.success ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <AlertTitle>
                            {replyResult.success ? "发送成功" : "发送失败"}
                          </AlertTitle>
                          <AlertDescription>
                            {replyResult.message}
                            {replyResult.timestamp && (
                              <div className="text-xs mt-1 text-muted-foreground">
                                时间: {replyResult.timestamp.toLocaleString('zh-CN')}
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>无法回复</AlertTitle>
                      <AlertDescription>
                        此会话没有关联的机器人，无法发送回复消息。
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSessionDetail(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 机器人详情对话框 */}
      <Dialog open={showRobotDetail} onOpenChange={setShowRobotDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              机器人详情
            </DialogTitle>
            <DialogDescription>
              查看和管理机器人配置信息
            </DialogDescription>
          </DialogHeader>

          {selectedRobot && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">机器人名称</p>
                  <p className="font-medium">{selectedRobot.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">机器人ID</p>
                  <p className="font-mono text-sm">{selectedRobot.robotId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">状态</p>
                  <Badge variant={selectedRobot.status === 'online' ? 'default' : 'secondary'}>
                    {selectedRobot.status === 'online' ? (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        在线
                      </div>
                    ) : selectedRobot.status === 'offline' ? (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full" />
                        离线
                      </div>
                    ) : (
                      '未知'
                    )}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">启用状态</p>
                  <Badge variant={selectedRobot.isActive ? 'default' : 'secondary'}>
                    {selectedRobot.isActive ? '已启用' : '已禁用'}
                  </Badge>
                </div>
                {selectedRobot.nickname && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">昵称</p>
                    <p className="font-medium">{selectedRobot.nickname}</p>
                  </div>
                )}
                {selectedRobot.company && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">公司</p>
                    <p className="font-medium">{selectedRobot.company}</p>
                  </div>
                )}
                {selectedRobot.ipAddress && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">IP地址</p>
                    <p className="font-mono text-sm">{selectedRobot.ipAddress}</p>
                  </div>
                )}
                {selectedRobot.apiBaseUrl && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">API地址</p>
                    <p className="font-mono text-sm break-all">{selectedRobot.apiBaseUrl}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-2">时间信息</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">创建时间</p>
                    <p>{new Date(selectedRobot.createdAt).toLocaleString('zh-CN')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">更新时间</p>
                    <p>{new Date(selectedRobot.updatedAt).toLocaleString('zh-CN')}</p>
                  </div>
                  {selectedRobot.lastCheckAt && (
                    <div>
                      <p className="text-muted-foreground">最后检查时间</p>
                      <p>{new Date(selectedRobot.lastCheckAt).toLocaleString('zh-CN')}</p>
                    </div>
                  )}
                  {selectedRobot.activatedAt && (
                    <div>
                      <p className="text-muted-foreground">激活时间</p>
                      <p>{new Date(selectedRobot.activatedAt).toLocaleString('zh-CN')}</p>
                    </div>
                  )}
                  {selectedRobot.expiresAt && (
                    <div>
                      <p className="text-muted-foreground">过期时间</p>
                      <p>{new Date(selectedRobot.expiresAt).toLocaleString('zh-CN')}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedRobot.lastError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>最近错误</AlertTitle>
                  <AlertDescription>{selectedRobot.lastError}</AlertDescription>
                </Alert>
              )}

              {selectedRobot.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">描述</p>
                  <p className="text-sm">{selectedRobot.description}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRobotDetail(false)}>
              关闭
            </Button>
            <Button onClick={() => {
              setActiveTab('robots');
              setShowRobotDetail(false);
            }}>
              管理机器人
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// QRCode 图标组件
function QrCodeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  );
}

