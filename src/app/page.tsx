'use client';

import React, { useState, useEffect, useRef, useMemo, memo, useCallback, lazy, Suspense } from 'react';
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

// 懒加载大型组件
const RobotManagement = lazy(() => import('@/components/robot/robot-management-integrated'));
const AlertConfigTab = lazy(() => import('@/components/alert-config-tab'));
const EnhancedAlertManagement = lazy(() => import('@/components/enhanced-alert-management'));
const SystemLogs = lazy(() => import('@/components/system-logs'));
const MonitoringTab = lazy(() => import('@/components/monitoring-tab'));
const MonitorTab = lazy(() => import('@/components/monitor-tab'));
const RealtimeIOTab = lazy(() => import('@/components/realtime-io-tab'));
const UserManagement = lazy(() => import('@/components/user-management'));
const SettingsTab = lazy(() => import('@/components/settings-tab'));
const AlertRulesDialog = lazy(() => import('@/components/monitoring/AlertRulesDialog'));
const BusinessMessageMonitor = lazy(() => import('@/components/business-message-monitor'));
const AIInteractionMonitor = lazy(() => import('@/components/ai-interaction-monitor'));
const AIModule = lazy(() => import('@/components/ai-module'));
const FlowEngineManage = lazy(() => import('@/components/flow-engine-manage'));
const CollabAnalytics = lazy(() => import('@/app/collab-analytics/page'));

// Token统计组件
import { TokenStatsCard } from '@/components/token-stats';

// 引入新的仪表盘组件
const NewDashboardTab = lazy(() => import('@/components/dashboard/NewDashboardTab'));

import { cn } from '@/lib/utils';

// 加载组件
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
}

import { 
  LayoutDashboard,
  Users,
  Bot,
  Activity,
  Brain,
  GitBranch,
  Settings,
  ArrowUp,
  ArrowDown,
  Clock,
  MoreHorizontal,
  Download,
  Copy,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  Zap,
  Zap as ZapIcon,
  Server,
  HardDrive,
  Cpu,
  Database,
  Network,
  Bell,
  BellRing,
  XCircle,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  Radio,
  Code,
  Terminal,
  Handshake,
  BarChart3,
  TrendingUp,
  Link2,
  Play,
  ExternalLink,
  FileText,
  FileJson,
  MessageSquare,
  Globe,
  MessageCircle,
  User,
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
  Check,
  Edit2,
  Circle,
  Mail,
  Building2,
  Send,
  BookOpen
} from 'lucide-react';

import { MessageBubble } from '@/components/ui/message-bubble';

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

interface MonitorSummary {
  date: string;
  executions: {
    total: number;
    success: number;
    error: number;
    processing: number;
    successRate: string;
  };
  ai: {
    total: number;
    success: number;
    error: number;
    successRate: string;
  };
  sessions: {
    active: number;
    total: number;
  };
  aiErrors: number;
  totalCallbacks: number;
  aiSuccessRate: string;
  systemMetrics: {
    callbackReceived: number;
    callbackProcessed: number;
    callbackError: number;
    aiRequests: number;
    aiErrors: number;
  };
}

// 兼容性：支持老接口数据结构
interface MonitorDataOld {
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

// 使用联合类型支持新旧接口
type MonitorData = MonitorSummary | MonitorDataOld;

// 辅助函数：兼容新旧数据结构，获取回调接收数
const getCallbackReceived = (data: MonitorData | null): number => {
  if (!data) return 0;
  // 新接口
  if ('systemMetrics' in data) {
    return data.systemMetrics?.callbackReceived || 0;
  }
  // 老接口
  return (data as any).system?.callback_received || 0;
};

// 辅助函数：兼容新旧数据结构，获取成功率
const getSuccessRate = (data: MonitorData | null): string => {
  if (!data) return '0%';
  // 新接口
  if ('executions' in data) {
    return data.executions?.successRate || '0%';
  }
  // 老接口
  return (data as any).summary?.successRate || '0%';
};

// 辅助函数：兼容新旧数据结构，获取AI成功率
const getAiSuccessRate = (data: MonitorData | null): string => {
  if (!data) return '0%';
  // 新接口
  if ('ai' in data && typeof (data as any).ai.successRate === 'string') {
    return (data as any).ai.successRate || '0%';
  }
  // 老接口
  return (data as any).summary?.aiSuccessRate || '0%';
};

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
  lastMessage?: string; // 最新消息内容
  isFromUser?: boolean; // 最新消息是否来自用户
  isFromBot?: boolean; // 最新消息是否来自机器人
  isHuman?: boolean; // 最新消息是否人工回复
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
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null); // 控制展开的会话
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<'all' | 'auto' | 'human'>('all');
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false); // 标记初始化是否完成
  const [alertStats, setAlertStats] = useState<AlertData | null>(null); // 新的告警统计数据
  const [isAlertRulesDialogOpen, setIsAlertRulesDialogOpen] = useState(false); // 告警规则对话框状态
  const [isSearchingSessions, setIsSearchingSessions] = useState(false);
  const [showRobotDetail, setShowRobotDetail] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [robotInfoMap, setRobotInfoMap] = useState<Record<string, { name: string; loaded: boolean }>>({});
  const [replyContent, setReplyContent] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyResult, setReplyResult] = useState<{ success: boolean; message: string; timestamp?: Date } | null>(null);

  // 加载机器人列表（使用新接口）
  const loadRobots = async () => {
    try {
      const res = await fetch('/api/monitoring/robots-status');
      if (res.ok) {
        const data = await res.json();
        if (data.code === 0 && data.data && data.data.robots) {
          const robotsList = data.data.robots || [];
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

  // 添加超时的fetch包装器
  const fetchWithTimeout = async (url: string, timeoutMs: number = 3000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`API请求超时: ${url}`);
        // 返回一个假的响应
        return { ok: false, json: async () => ({}) } as Response;
      }
      throw error;
    }
  };

  const loadData = async () => {
    const startTime = Date.now();
    
    try {
      // 注意：会话数据已在初始化时加载，这里不再重复加载
      // 只加载监控数据和告警数据

      // 监控相关数据（重要数据）
      const importantPromises = [
        fetchWithTimeout('/api/monitoring/summary', 3000),
        fetchWithTimeout('/api/proxy/admin/callbacks', 3000), // 回调配置，保留
      ];
      
      // 可选数据：即使失败也不影响主要功能
      const optionalPromises = [
        fetchWithTimeout('/api/proxy/health', 2000),
        fetchWithTimeout('/api/alerts/analytics/overview', 3000), // 使用新接口
      ];

      console.log('[数据加载] 开始加载监控数据...');
      // 并行加载重要数据
      const importantResults = await Promise.allSettled(importantPromises);
      const [monitorRes, callbacksRes] = importantResults.map(r => 
        r.status === 'fulfilled' ? r.value : { ok: false, json: async () => ({}) } as Response
      );

      if (monitorRes.ok) {
        try {
          const data = await monitorRes.json();
          // 兼容两种返回格式：{ code: 0, data: {...} } 或 { success: true, data: {...} }
          if (data.code === 0 || data.success === true) {
            setMonitorData(data.data);
            console.log('[数据加载] Monitor 数据加载成功');
          }
        } catch (e) {
          console.error('解析monitor数据失败:', e);
        }
      }

      if (callbacksRes.ok) {
        try {
          const data = await callbacksRes.json();
          // 兼容两种返回格式：{ code: 0, data: {...} } 或 { success: true, data: {...} }
          if (data.code === 0 || data.success === true) {
            setCallbacks(data.data);
            console.log('[数据加载] Callbacks 数据加载成功:', data.data);
          }
        } catch (e) {
          console.error('解析callbacks数据失败:', e);
        }
      }
      console.log(`[数据加载] 监控数据加载完成，耗时: ${Date.now() - startTime}ms`);

      // 更新最后加载时间
      setLastUpdateTime(new Date());

      // 可选数据在后台加载，不阻塞UI
      Promise.allSettled(optionalPromises).then(async (optionalResults) => {
        const [uptimeRes, alertRes] = optionalResults.map(r => 
          r.status === 'fulfilled' ? r.value : { ok: false, json: async () => ({}) } as Response
        );

        // 检查连接状态
        if (uptimeRes.ok) {
          setConnectionStatus('connected');
          try {
            const data = await uptimeRes.json();
            if (data.startTime) {
              const uptimeMs = Date.now() - data.startTime;
              setServerUptime(formatUptime(uptimeMs));
              console.log('[数据加载] Server uptime 加载成功:', formatUptime(uptimeMs));
            }
          } catch (e) {
            console.error('解析uptime数据失败:', e);
          }
        } else {
          setConnectionStatus('disconnected');
        }

        // 处理告警数据（使用新接口）
        if (alertRes.ok) {
          try {
            const data = await alertRes.json();
            // 兼容两种返回格式：{ code: 0, data: {...} } 或 { success: true, data: {...} }
            if (data.code === 0 || data.success === true) {
              setAlertStats(data.data);
              console.log('[数据加载] Alert Stats 数据加载成功');
            }
          } catch (e) {
            console.error('解析告警数据失败:', e);
          }
        }
        
        console.log(`[数据加载] 可选数据加载完成，耗时: ${Date.now() - startTime}ms`);
      });

    } catch (error) {
      setConnectionStatus('disconnected');
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
      console.log(`[数据加载] 总耗时: ${Date.now() - startTime}ms`);
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

  // 自动刷新：每60秒只刷新关键数据（会话列表）
  // 避免频繁刷新导致页面闪烁和性能问题
  // 仅在用户不活动时刷新，避免干扰用户操作
  useEffect(() => {
    // 如果会话详情打开，不进行自动刷新
    if (showSessionDetail) {
      return;
    }

    // 如果当前是监控标签页，暂停自动刷新（避免与监控组件的刷新冲突）
    if (activeTab === 'monitoring') {
      return;
    }

    // 禁用自动刷新，改为手动刷新，避免页面闪烁
    // 如需自动刷新，请取消下面的注释
    /*
    const interval = setInterval(() => {
      console.log('[自动刷新] 刷新关键数据...');
      // 只刷新会话数据，快速响应
      fetchWithTimeout('/api/proxy/admin/sessions/active?limit=20', 2000).then(res => {
        if (res.ok) {
          res.json().then(data => {
            const uniqueSessions = (data.data || []).reduce((acc: Session[], session: Session) => {
              if (!acc.find(s => s.sessionId === session.sessionId)) {
                acc.push(session);
              }
              return acc;
            }, []);
            setSessions(uniqueSessions);
          });
        }
      });
    }, 60000); // 每 60 秒刷新一次会话数据

    return () => clearInterval(interval);
    */
  }, [showSessionDetail, activeTab]);

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

  // 加载会话消息
  const loadSessionMessages = async (sessionId: string) => {
    console.log('[会话详情] 开始加载消息', { sessionId });
    setIsLoadingSessionMessages(true);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/messages`);
      console.log('[会话详情] API 响应', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[会话详情] 消息数据', {
          success: data.success,
          dataLength: data.data?.length,
          data: data.data
        });
        setSessionMessages(data.data || []);
      } else {
        console.error('[会话详情] API 返回错误状态', res.status);
        const errorData = await res.json().catch(() => ({}));
        console.error('[会话详情] 错误数据', errorData);
        setSessionMessages([]);
      }
    } catch (error) {
      console.error('[会话详情] 加载会话消息失败:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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
    console.log('[会话详情] 查看会话详情', {
      sessionId: session.sessionId,
      userName: session.userName,
      groupName: session.groupName
    });

    if (!session.sessionId) {
      console.error('[会话详情] sessionId 为空', session);
      alert('会话 ID 为空，无法查看详情');
      return;
    }

    setSelectedSession(session);
    setShowSessionDetail(true);
    loadSessionMessages(session.sessionId);

    // 加载机器人信息
    if (session.robotId) {
      console.log('[会话详情] 开始加载机器人信息', { robotId: session.robotId });
      const robotName = await loadRobotInfo(session.robotId);
      console.log('[会话详情] 机器人信息加载完成', { robotName });
      if (robotName) {
        // 更新选中的会话，添加机器人名称
        setSelectedSession(prev => prev ? { ...prev, robotName } : null);
      }
    }

    // 重新获取最新的会话信息，确保机器人名称和状态正确
    try {
      console.log('[会话详情] 重新获取会话信息', { sessionId: session.sessionId });
      const res = await fetch(`/api/admin/sessions/${session.sessionId}`);
      console.log('[会话详情] 会话信息响应', {
        status: res.status,
        ok: res.ok
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[会话详情] 会话信息数据', {
          success: data.success,
          hasData: !!data.data,
          sessionId: data.data?.sessionId
        });

        if (data.success && data.data) {
          setSelectedSession(data.data);
          // 如果返回的数据没有机器人名称，使用我们获取的
          if (!data.data.robotName && session.robotId && robotInfoMap[session.robotId]?.name) {
            console.log('[会话详情] 使用缓存的机器人名称', {
              robotId: session.robotId,
              robotName: robotInfoMap[session.robotId as string].name
            });
            setSelectedSession(prev => prev ? { ...prev, robotName: robotInfoMap[session.robotId as string].name } : null);
          }
        }
      } else {
        console.error('[会话详情] 获取会话信息失败', { status: res.status });
      }
    } catch (error) {
      console.error('[会话详情] 获取会话信息异常:', {
        error: error instanceof Error ? error.message : String(error)
      });
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

  // 监听搜索条件变化（仅在初始化完成后执行，避免重复加载）
  useEffect(() => {
    // 初始化未完成时，不执行搜索
    if (!isInitialLoadDone) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      handleSearchSessions();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [sessionSearchQuery, sessionStatusFilter, isInitialLoadDone]);

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

  // 初始化加载（只执行一次）- 优化：优先加载关键数据
  useEffect(() => {
    const startTime = Date.now();
    console.log('[初始化] 开始加载数据...');
    
    // 立即加载最关键的数据（会话列表）
    const loadCriticalData = async () => {
      console.log('[初始化] 开始加载关键数据...');
      checkConnection();
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 增加到10秒

        console.log('[初始化] 发起会话 API 请求...');
        const sessionsRes = await fetch('/api/proxy/admin/sessions/active?limit=20', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('[初始化] 会话 API 请求完成，状态:', sessionsRes.ok, sessionsRes.status);
        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          console.log('[初始化] API 返回数据:', data);
          const uniqueSessions = (data.data || []).reduce((acc: Session[], session: Session) => {
            if (!acc.find(s => s.sessionId === session.sessionId)) {
              acc.push(session);
            }
            return acc;
          }, []);
          console.log('[初始化] 去重后的会话数量:', uniqueSessions.length, uniqueSessions);
          setSessions(uniqueSessions);
          console.log(`[初始化] 关键数据加载完成，耗时: ${Date.now() - startTime}ms`);
        } else {
          console.error('[初始化] 会话 API 请求失败，状态码:', sessionsRes.status);
        }
      } catch (e) {
        console.error('[初始化] 加载会话数据失败:', e);
      } finally {
        // 标记初始化完成，允许搜索 useEffect 执行
        console.log('[初始化] 初始化加载完成，允许搜索执行');
        setIsInitialLoadDone(true);
      }
    };

    console.log('[初始化] 调用 loadCriticalData...');
    loadCriticalData();

    // 300ms后加载次要数据（不阻塞首次渲染）
    const delayedLoad = setTimeout(() => {
      console.log(`[初始化] 开始加载次要数据，耗时: ${Date.now() - startTime}ms`);
      loadRobots();
      loadAiConfig();
    }, 300);

    // 800ms后加载监控数据（确保首屏渲染完成后再加载）
    const delayedMonitorLoad = setTimeout(() => {
      console.log(`[初始化] 开始加载监控数据，耗时: ${Date.now() - startTime}ms`);
      loadData();
    }, 800);

    return () => {
      clearTimeout(delayedLoad);
      clearTimeout(delayedMonitorLoad);
      console.log(`[初始化] 清理定时器，总耗时: ${Date.now() - startTime}ms`);
    };
  }, []);

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

      {/* 科幻风格部署信息卡片 */}
      <Card className="sci-fi-card border-primary/30 hover:border-primary/50 transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-primary/20">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Server className="h-5 w-5 animate-tech-glow" />
            部署信息
          </CardTitle>
          <CardDescription className="text-muted-foreground">
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

      {/* 科幻风格回调地址列表 */}
      <div className="grid gap-4">
        {/* 消息回调 */}
        <Card className="sci-fi-card border-primary/30 hover:border-primary/50 transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-primary/20">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg animate-pulse-glow">
                  <MessageCircle className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">消息回调地址</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    接收群消息、私聊消息、@机器人等所有消息
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="gap-1 border-primary/30">
                <Radio className="h-3 w-3 text-primary" />
                <span className="text-xs">实时推送</span>
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
        <Card className="sci-fi-card border-primary/30 hover:border-primary/50 transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-primary/20">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg animate-pulse-glow-cyan">
                  <Activity className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">执行结果回调地址</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    接收发送消息、踢人、拉人、建群等操作结果
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="gap-1 border-primary/30">
                <Radio className="h-3 w-3 text-primary" />
                <span className="text-xs">实时推送</span>
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

        {/* 科幻风格群二维码回调卡片 */}
        <Card className="sci-fi-card border-primary/30 hover:border-primary/50 transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-primary/20">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg animate-pulse-glow-purple">
                  <QrCodeIcon className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">群二维码回调地址</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    接收群二维码生成、更新、失效等事件
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="gap-1 border-primary/30">
                <Radio className="h-3 w-3 text-primary" />
                <span className="text-xs">事件推送</span>
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
        <Card className="sci-fi-card border-primary/30 hover:border-primary/50 transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-b border-primary/20">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg animate-pulse-glow">
                  <ShieldCheck className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">机器人状态回调地址</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    接收机器人上线、掉线、心跳异常等状态事件
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="gap-1 border-primary/30">
                <Radio className="h-3 w-3 text-primary" />
                <span className="text-xs">实时监控</span>
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
  const OverviewTab = () => {
    console.log('[OverviewTab] 渲染，当前 sessions 数量:', sessions.length, sessions);
    
    return (
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
            <div className="text-2xl font-bold">{getCallbackReceived(monitorData)}</div>
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
            <div className="text-2xl font-bold">{getCallbackReceived(monitorData)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              今日累计
              {getCallbackReceived(monitorData) > 0 && (
                <span className="ml-1">+{getCallbackReceived(monitorData)}</span>
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
            <div className="text-2xl font-bold">{getSuccessRate(monitorData)}</div>
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
            <div className="text-2xl font-bold">{getAiSuccessRate(monitorData)}</div>
            <p className="text-xs text-muted-foreground mt-1">AI 响应成功率</p>
          </CardContent>
        </Card>

        {/* Token统计 */}
        <TokenStatsCard />
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
                            month: '2-digit',
                            day: '2-digit',
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
          {/* 系统概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-blue-500" />
                系统概览
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* 在线用户数 */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-muted-foreground">在线用户</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {sessions.length}
                  </div>
                </div>

                {/* 今日消息数 */}
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs text-muted-foreground">今日消息</span>
                  </div>
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {sessions.reduce((sum, s) => sum + s.messageCount, 0)}
                  </div>
                </div>

                {/* AI成功率 */}
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-xs text-muted-foreground">AI成功率</span>
                  </div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {getAiSuccessRate(monitorData)}
                  </div>
                </div>

                {/* 在线机器人数 */}
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs text-muted-foreground">在线机器人</span>
                  </div>
                  <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    {onlineRobots.length} / {robots.length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
        </div>
      </div>
    </div>
    );
  };

  // 会话管理组件（集成业务消息监控）
  const SessionsTab = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'auto' | 'human'>('all');
    const [filterIntent, setFilterIntent] = useState<string>('all');
    const [activeSubTab, setActiveSubTab] = useState<'sessions' | 'messages'>('sessions');

    // 显示加载状态
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4 text-muted-foreground">加载会话数据中...</p>
          </div>
        </div>
      );
    }

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
        {/* 顶部标题和操作栏 - 现代设计 */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              会话管理
            </h3>
            <p className="text-sm text-muted-foreground ml-15">
              查看和管理活跃的用户会话，监控业务消息与AI交互
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-2 h-8 px-3 border-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-sm">{sessions.length}</span>
              <span className="text-muted-foreground text-sm">个活跃会话</span>
            </Badge>
            <Badge 
              variant={showSessionDetail ? "secondary" : "outline"} 
              className="gap-2 h-8 px-3 border-2 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${!showSessionDetail ? 'animate-spin text-green-600 dark:text-green-400' : ''}`} />
              <span className="text-sm">{showSessionDetail ? '刷新暂停' : '自动刷新'}</span>
            </Badge>
            <Button 
              onClick={loadData} 
              variant="outline" 
              size="default"
              className="h-9 px-4 border-2 hover:bg-blue-50 hover:border-blue-400 dark:hover:bg-blue-950/30 dark:hover:border-blue-600 transition-all"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              手动刷新
            </Button>
          </div>
        </div>

        {/* 子标签切换 */}
        <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'sessions' | 'messages')} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-[600px] h-14 bg-white/90 backdrop-blur-md border-2 border-slate-200/80 shadow-lg shadow-slate-200/50 rounded-2xl p-1.5 mb-6">
            <TabsTrigger value="sessions" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
              <Users className="h-5 w-5" />
              会话列表
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
              <MessageSquare className="h-5 w-5" />
              业务消息监控
            </TabsTrigger>
          </TabsList>

          {/* 会话列表内容 */}
          <TabsContent value="sessions" className="space-y-4 mt-4">
            {/* 统计卡片 - 现代渐变设计 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    总会话数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                    {stats.total}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">活跃用户会话</div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    自动模式
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-400 bg-clip-text text-transparent">
                    {stats.auto}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">AI自动处理</div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-white" />
                    </div>
                    人工模式
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-400 bg-clip-text text-transparent">
                    {stats.human}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">人工接管</div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    总消息数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-400 bg-clip-text text-transparent">
                    {stats.totalMessages}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">累计消息</div>
                </CardContent>
              </Card>
            </div>

        {/* 最近会话 - 卡片式布局 */}
        {sessions.length > 0 && (
          <Card className="border-2">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/30">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  最近活跃会话
                </CardTitle>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs">
                  {Math.min(sessions.length, 10)} 个
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {sessions.slice(0, 10).map((session) => (
                  <Card
                    key={session.sessionId}
                    className="group hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 cursor-pointer bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20"
                    onClick={() => {
                      setSelectedSession(session);
                      setShowSessionDetail(true);
                      loadSessionMessages(session.sessionId);
                    }}
                  >
                    <CardContent className="p-4">
                      {/* 用户头像和状态 */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{session.userName || '未知用户'}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge
                              variant={session.status === 'auto' ? 'default' : 'secondary'}
                              className={cn(
                                "h-5 px-1.5 text-[10px] gap-0.5 flex-shrink-0",
                                session.status === 'auto'
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50"
                              )}
                            >
                              {session.status === 'auto' ? (
                                <Bot className="h-2.5 w-2.5" />
                              ) : (
                                <Users className="h-2.5 w-2.5" />
                              )}
                              {session.status === 'auto' ? '自动' : '人工'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* 最近消息 */}
                      <div className="mb-3 min-h-[3rem]">
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {session.lastMessage || '暂无消息'}
                        </div>
                      </div>

                      {/* 底部信息 */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/50">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {session.messageCount}
                        </span>
                        <span className="font-medium text-blue-600 dark:text-blue-400 flex-shrink-0">
                          {formatTime(session.lastActiveTime)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 搜索和筛选 - 简洁设计 */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* 搜索框 */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  placeholder="搜索用户名或群组名称..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-11 bg-muted/30 focus:bg-background border-2"
                />
              </div>
              
              {/* 状态筛选 */}
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-full sm:w-[150px] h-11 border-2">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="auto">自动模式</SelectItem>
                  <SelectItem value="human">人工模式</SelectItem>
                </SelectContent>
              </Select>

              {/* 意图筛选 */}
              <Select value={filterIntent} onValueChange={setFilterIntent}>
                <SelectTrigger className="w-full sm:w-[150px] h-11 border-2">
                  <SelectValue placeholder="全部意图" />
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

              {/* 清除按钮 */}
              {(searchTerm || filterStatus !== 'all' || filterIntent !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setFilterIntent('all');
                  }}
                  className="h-11 px-4 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  清除
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 会话列表 - 现代卡片式设计 */}
        <Card id="full-session-list" className="border-2">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/30">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                全部会话
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {filteredSessions.length} / {sessions.length}
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-muted/60 mx-auto mb-4 flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">暂无匹配的会话</p>
                {(searchTerm || filterStatus !== 'all' || filterIntent !== 'all') && (
                  <Button 
                    variant="link" 
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                      setFilterIntent('all');
                    }}
                    className="mt-3 text-blue-600 dark:text-blue-400"
                  >
                    <X className="h-4 w-4 mr-1" />
                    清除所有筛选条件
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSessions.map((session) => (
                  <Card
                    key={session.sessionId}
                    className="group hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 cursor-pointer bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/50"
                    onClick={() => handleViewSessionDetail(session)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* 左侧头像区域 */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                            <UserCheck className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        
                        {/* 中间信息区域 */}
                        <div className="flex-1 min-w-0">
                          {/* 第一行：用户名、状态、意图 */}
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="font-semibold text-sm truncate">{session.userName || '未知用户'}</span>
                            
                            <Badge 
                              variant={session.status === 'auto' ? 'default' : 'secondary'}
                              className={cn(
                                "gap-0.5 h-5 px-1.5 text-[10px] flex-shrink-0",
                                session.status === 'auto'
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50"
                              )}
                            >
                              {session.status === 'auto' ? (
                                <>
                                  <Bot className="h-2.5 w-2.5" />
                                  自动
                                </>
                              ) : (
                                <>
                                  <Users className="h-2.5 w-2.5" />
                                  人工
                                </>
                              )}
                            </Badge>
                            
                            {session.lastIntent && (
                              <Badge variant="outline" className="gap-0.5 h-5 px-1.5 text-[10px] border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300">
                                <Sparkles className="h-2.5 w-2.5" />
                                {session.lastIntent}
                              </Badge>
                            )}
                            
                            {session.aiReplyCount > 0 && (
                              <div className="flex items-center gap-0.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded-full text-[10px]">
                                <CheckCircle className="h-2.5 w-2.5" />
                                已回复
                              </div>
                            )}
                          </div>
                          
                          {/* 第二行：群组、消息 */}
                          <div className="flex items-center gap-2 text-xs mb-1.5 flex-wrap">
                            <div className="flex items-center gap-1 text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
                              <Building2 className="h-3 w-3" />
                              {session.groupName || '未知群组'}
                            </div>
                            {session.lastMessage && (
                              <div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-md">
                                {session.isFromUser ? (
                                  <User className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                ) : session.isHuman ? (
                                  <UserCheck className="h-3 w-3 text-orange-500 flex-shrink-0" />
                                ) : (
                                  <Bot className="h-3 w-3 text-green-500 flex-shrink-0" />
                                )}
                                <span className="truncate text-muted-foreground">{session.lastMessage}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* 第三行：统计信息 */}
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {session.messageCount}
                            </span>
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <Bot className="h-3 w-3" />
                              {session.aiReplyCount}
                            </span>
                            <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                              <User className="h-3 w-3" />
                              {session.humanReplyCount}
                            </span>
                            {session.company && (
                              <span className="hidden lg:inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <Building2 className="h-3 w-3" />
                                {session.company}
                                {session.robotNickname && ` (${session.robotNickname})`}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* 右侧时间区域 */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                            {formatTime(session.lastActiveTime)}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] border-2 hover:bg-blue-50 hover:border-blue-400 dark:hover:bg-blue-950/30 dark:hover:border-blue-600 opacity-60 group-hover:opacity-100 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSessionStatus(session);
                            }}
                          >
                            {session.status === 'auto' ? (
                              <>
                                <UserCheck className="h-3 w-3 mr-1" />
                                转人工
                              </>
                            ) : (
                              <>
                                <Bot className="h-3 w-3 mr-1" />
                                转自动
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* 业务消息监控内容 */}
          <TabsContent value="messages" className="mt-5">
            <BusinessMessageMonitor
              sessions={sessions}
              onNavigateToSession={(sessionId) => {
                const targetSession = sessions.find(s => s.sessionId === sessionId);
                if (targetSession) {
                  setSelectedSession(targetSession);
                  setShowSessionDetail(true);
                  loadSessionMessages(sessionId);
                }
              }}
            />
          </TabsContent>
        </Tabs>
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
      const expireTime = new Date(robot.expiresAt);
      const diffMs = expireTime.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        return '已过期';
      }
      
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        return `${days}天${hours}小时`;
      } else if (hours > 0) {
        return `${hours}小时${minutes}分钟`;
      } else {
        return `${minutes}分钟`;
      }
    }
    return '未知';
  };

  // 仪表盘主页面 - 使用新的设计
  const DashboardTab = () => (
    <Suspense fallback={<div className="p-8 text-center">加载中...</div>}>
      <NewDashboardTab
        monitorData={monitorData as any}
        alertData={alertData as any}
        alertStats={alertStats as any}
        robots={robots}
        sessions={sessions}
        lastUpdateTime={lastUpdateTime}
        loadData={loadData}
        isLoading={isLoading}
        setActiveTab={setActiveTab}
      />
    </Suspense>
  );

  return (
    <div className="min-h-screen bg-tech-grid dark:bg-tech-grid">
      {/* 科幻风格标题栏 */}
      <header className="border-b border-primary/20 glass sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 左侧 Logo 和标题 */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                {/* 发光背景 */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl animate-pulse-glow blur-sm"></div>
                {/* Logo 图标 */}
                <div className="relative p-2.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl animate-float">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                {/* 装饰元素 */}
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-tech-glow"></div>
              </div>
              
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  WorkTool AI 中枢系统
                </h1>
                <p className="text-sm text-muted-foreground">企业微信社群智能运营平台</p>
              </div>
            </div>

            {/* 右侧状态信息 */}
            <div className="flex items-center gap-4">
              {/* 服务器地址 */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-background/50 rounded-lg border border-primary/20">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                  {callbacks?.baseUrl || '加载中...'}
                </span>
              </div>

              {/* 运行状态 */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 rounded-lg border border-primary/20">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-xs font-medium ${connectionStatus === 'connected' ? 'text-green-500' : 'text-red-500'}`}>
                  {connectionStatus === 'connected' ? 'RUNNING' : 'OFFLINE'}
                </span>
              </div>

              {/* 刷新按钮 */}
              <Button 
                onClick={loadData} 
                variant="outline"
                size="sm"
                className="border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all duration-300"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''} text-primary`} />
              </Button>
            </div>
          </div>

          {/* 装饰线条 */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* 精简后的导航栏 - 8个核心功能 */}
          <TabsList className="w-full lg:w-auto flex flex-wrap justify-center lg:justify-start gap-2 p-1.5 bg-transparent border-none shadow-none rounded-xl">
            <TabsTrigger
              value="dashboard"
              className="gap-2.5 py-5 px-3.5 min-w-[75px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-600/30 border-2 border-slate-200/70 hover:border-blue-400/80 hover:bg-blue-50/90 hover:shadow-lg hover:shadow-blue-400/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 rounded-xl"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="font-semibold text-base sm:text-base">仪表盘</span>
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="gap-2.5 py-5 px-3.5 min-w-[75px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-600/30 border-2 border-slate-200/70 hover:border-blue-400/80 hover:bg-blue-50/90 hover:shadow-lg hover:shadow-blue-400/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 rounded-xl"
            >
              <Users className="h-5 w-5" />
              <span className="font-semibold text-base sm:text-base">会话管理</span>
            </TabsTrigger>
            <TabsTrigger
              value="robots"
              className="gap-2.5 py-5 px-3.5 min-w-[75px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-600/30 border-2 border-slate-200/70 hover:border-blue-400/80 hover:bg-blue-50/90 hover:shadow-lg hover:shadow-blue-400/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 rounded-xl"
            >
              <Bot className="h-5 w-5" />
              <span className="font-semibold text-base sm:text-base">机器人管理</span>
            </TabsTrigger>
            <TabsTrigger
              value="monitor"
              className="gap-2.5 py-5 px-3.5 min-w-[75px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-600/30 border-2 border-slate-200/70 hover:border-blue-400/80 hover:bg-blue-50/90 hover:shadow-lg hover:shadow-blue-400/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 rounded-xl"
            >
              <Activity className="h-5 w-5" />
              <span className="font-semibold text-base sm:text-base">监控告警</span>
            </TabsTrigger>
            <TabsTrigger
              value="ai-module"
              className="gap-2.5 py-5 px-3.5 min-w-[75px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-600/30 border-2 border-slate-200/70 hover:border-blue-400/80 hover:bg-blue-50/90 hover:shadow-lg hover:shadow-blue-400/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 rounded-xl"
            >
              <Brain className="h-5 w-5" />
              <span className="font-semibold text-base sm:text-base">AI模块</span>
            </TabsTrigger>
            <TabsTrigger
              value="flow-engine"
              className="gap-2.5 py-5 px-3.5 min-w-[75px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-600/30 border-2 border-slate-200/70 hover:border-blue-400/80 hover:bg-blue-50/90 hover:shadow-lg hover:shadow-blue-400/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 rounded-xl"
            >
              <GitBranch className="h-5 w-5" />
              <span className="font-semibold text-base sm:text-base">流程引擎</span>
            </TabsTrigger>
            <TabsTrigger
              value="collab-analytics"
              className="gap-2.5 py-5 px-3.5 min-w-[75px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-600/30 border-2 border-slate-200/70 hover:border-blue-400/80 hover:bg-blue-50/90 hover:shadow-lg hover:shadow-blue-400/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 rounded-xl"
            >
              <Handshake className="h-5 w-5" />
              <span className="font-semibold text-base sm:text-base">协同分析</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="gap-2.5 py-5 px-3.5 min-w-[75px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-600/30 border-2 border-slate-200/70 hover:border-blue-400/80 hover:bg-blue-50/90 hover:shadow-lg hover:shadow-blue-400/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 rounded-xl"
            >
              <Settings className="h-5 w-5" />
              <span className="font-semibold text-base sm:text-base">系统设置</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardTab />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <SessionsTab />
          </TabsContent>

          <TabsContent value="robots" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <RobotManagement />
            </Suspense>
          </TabsContent>

          <TabsContent value="monitor" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <MonitorTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="ai-module" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              {/* AI模块集成AI交互监控 */}
              <Tabs defaultValue="config" className="w-full">
                <TabsList className="grid w-full max-w-[600px] grid-cols-2 h-14 bg-white/90 backdrop-blur-md border-2 border-slate-200/80 shadow-lg shadow-slate-200/50 rounded-2xl p-1.5 mb-6">
                  <TabsTrigger value="config" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
                    <Settings className="h-5 w-5" />
                    AI配置
                  </TabsTrigger>
                  <TabsTrigger value="monitoring" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
                    <Sparkles className="h-5 w-5" />
                    AI交互监控
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="mt-5">
                  <Suspense fallback={<LoadingSpinner />}>
                    <AIModule />
                  </Suspense>
                </TabsContent>

                <TabsContent value="monitoring" className="mt-5">
                  <Suspense fallback={<LoadingSpinner />}>
                    <AIInteractionMonitor />
                  </Suspense>
                </TabsContent>
              </Tabs>
            </Suspense>
          </TabsContent>

          <TabsContent value="flow-engine" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <FlowEngineManage />
            </Suspense>
          </TabsContent>

          <TabsContent value="collab-analytics" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <CollabAnalytics />
            </Suspense>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <SettingsTab aiConfig={aiConfig} isLoadingAiConfig={isLoadingAiConfig} />
            </Suspense>
          </TabsContent>

          <TabsContent value="callbacks" className="space-y-6 hidden">
            <CallbackCenter />
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
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
            <div className="flex-1 overflow-y-auto space-y-6">
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
              <Card className="flex-1 flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    消息记录
                    <Badge variant="outline" className="ml-2">{sessionMessages.length} 条</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
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
                    <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
                      {sessionMessages.map((msg: any) => (
                        <MessageBubble
                          key={msg.id || msg.timestamp || Math.random()}
                          content={msg.content}
                          isFromUser={msg.isFromUser}
                          isHuman={msg.isHuman}
                          timestamp={msg.timestamp}
                          displayMode="detail"
                          userName={msg.userName}
                          robotName={msg.robotName || (msg.robotId && robotInfoMap[msg.robotId]?.name)}
                          operatorName={msg.extraData?.operator}
                          intent={msg.intent}
                          renderIntentBadge={(intent) => (
                            <Badge variant="outline" className="text-xs">
                              意图: {intent}
                            </Badge>
                          )}
                        />
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

