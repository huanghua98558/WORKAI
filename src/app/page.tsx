'use client';

import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
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
  BarChart,
  Sparkles,
  Info,
  Sliders,
  ChevronUp,
  ChevronDown,
  Plus
} from 'lucide-react';

// 类型定义
interface CallbackUrl {
  message: string;
  actionResult: string;
  groupQrcode: string;
  robotStatus: string;
  baseUrl: string;
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
  userId: string;
  groupId: string;
  userName: string;
  groupName: string;
  status: 'auto' | 'human';
  lastActiveTime: string;
  messageCount: number;
  aiReplyCount: number;
  humanReplyCount: number;
  lastIntent?: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('callbacks');
  const [callbacks, setCallbacks] = useState<CallbackUrl | null>(null);
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null);
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [copiedCallback, setCopiedCallback] = useState<string | null>(null);
  const [testingCallback, setTestingCallback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');

  // 加载数据
  useEffect(() => {
    loadData();
    checkConnection();
    const interval = setInterval(() => {
      loadData();
      checkConnection();
    }, 15000); // 每15秒刷新一次
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [callbacksRes, monitorRes, alertRes, sessionsRes] = await Promise.all([
        fetch('/api/admin/callbacks'),
        fetch('/api/admin/monitor/summary'),
        fetch('/api/admin/alerts/stats'),
        fetch('/api/admin/sessions/active?limit=20')
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
        setSessions(data.data || []);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
      setLastUpdateTime(new Date());
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
      console.error('连接检查失败:', error);
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
    try {
      const res = await fetch('/api/admin/callbacks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ ${type} 回调测试成功`);
      } else {
        alert(`❌ ${type} 回调测试失败: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ ${type} 回调测试失败: ${error}`);
    } finally {
      setTestingCallback(null);
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
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ 部署地址变更时会自动更新，无需手动修改
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
                onClick={() => testCallback('robot_status')}
                disabled={testingCallback === 'robot_status'}
                title="测试回调"
              >
                {testingCallback === 'robot_status' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
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
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* 状态栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold">系统概览</h3>
          <p className="text-muted-foreground mt-1">
            实时监控系统运行状态和关键指标
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          最后更新: {formatTime(lastUpdateTime.toISOString())}
          <Button 
            onClick={loadData} 
            variant="ghost" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总回调数</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitorData?.summary.totalCallbacks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              今日累计
              {monitorData?.system?.callback_received && monitorData?.system?.callback_received > 0 && (
                <span className="text-green-600 ml-1">+{monitorData?.system?.callback_received}</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">处理成功率</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitorData?.summary.successRate || '0%'}</div>
            <p className="text-xs text-muted-foreground mt-1">回调处理成功率</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI 成功率</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitorData?.summary.aiSuccessRate || '0%'}</div>
            <p className="text-xs text-muted-foreground mt-1">AI 响应成功率</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">告警数量</CardTitle>
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertData?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">近 7 天告警</p>
          </CardContent>
        </Card>
      </div>

      {/* 详细指标 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              系统指标
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">回调接收</span>
              <Badge variant="secondary">{monitorData?.system.callback_received || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">回调处理</span>
              <Badge variant="secondary">{monitorData?.system.callback_processed || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">回调错误</span>
              <Badge variant={(monitorData?.system?.callback_error ?? 0) > 0 ? 'destructive' : 'secondary'}>
                {monitorData?.system?.callback_error || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">AI 请求</span>
              <Badge variant="secondary">{monitorData?.system?.ai_requests || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">AI 错误</span>
              <Badge variant={(monitorData?.system?.ai_errors ?? 0) > 0 ? 'destructive' : 'secondary'}>
                {monitorData?.system?.ai_errors || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ZapIcon className="h-4 w-4" />
              AI 模型状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">意图识别</span>
              <div className="flex items-center gap-2">
                <Badge variant={monitorData?.ai.intentRecognition.successRate === '100.00' ? 'default' : 'secondary'}>
                  {monitorData?.ai.intentRecognition.successRate || '0%'}
                </Badge>
                {monitorData?.ai.intentRecognition.successRate === '100.00' && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">服务回复</span>
              <div className="flex items-center gap-2">
                <Badge variant={monitorData?.ai.serviceReply.successRate === '100.00' ? 'default' : 'secondary'}>
                  {monitorData?.ai.serviceReply.successRate || '0%'}
                </Badge>
                {monitorData?.ai.serviceReply.successRate === '100.00' && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">闲聊回复</span>
              <div className="flex items-center gap-2">
                <Badge variant={monitorData?.ai.chat.successRate === '100.00' ? 'default' : 'secondary'}>
                  {monitorData?.ai.chat.successRate || '0%'}
                </Badge>
                {monitorData?.ai.chat.successRate === '100.00' && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 告警提示 */}
      {alertData && alertData.total > 0 && (
        <Alert variant={alertData.byLevel.critical > 0 ? 'destructive' : 'default'}>
          <BellRing className="h-4 w-4" />
          <AlertTitle>系统告警</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                严重: {alertData.byLevel.critical}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                警告: {alertData.byLevel.warning}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Info className="h-3 w-3" />
                信息: {alertData.byLevel.info}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  // 会话管理组件
  const SessionsTab = () => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">活跃会话列表</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无活跃会话</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.sessionId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
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
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {session.groupName}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>消息: {session.messageCount}</span>
                        <span>AI回复: {session.aiReplyCount}</span>
                        <span>人工回复: {session.humanReplyCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(session.lastActiveTime)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // 监控告警页面
  const MonitorTab = () => {
    const [alertHistory, setAlertHistory] = useState<any[]>([]);
    const [circuitBreakerStatus, setCircuitBreakerStatus] = useState<boolean>(false);

    useEffect(() => {
      loadAlertData();
    }, []);

    const loadAlertData = async () => {
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
      }
    };

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
              系统监控指标和告警历史记录
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={loadAlertData} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

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
                {alertHistory.map((alert, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
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
        console.error('加载报告数据失败:', error);
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
    onSaveConfig 
  }: { 
    type: string; 
    title: string; 
    description: string; 
    aiConfig: any;
    onSaveConfig: (type: string, config: any) => Promise<void>;
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

    const config = aiConfig?.ai?.[type as keyof typeof aiConfig.ai];
    const builtinModels = aiConfig?.ai?.builtinModels || [];
    
    // 只在第一次加载或配置真正变化时初始化
    useEffect(() => {
      // 检查配置是否真的变化了（避免重复设置）
      const configStr = JSON.stringify(config);
      if (initializedRef.current && prevConfigRef.current === configStr) {
        return; // 配置没有变化，跳过
      }
      
      if (config) {
        console.log(`[${type}] 初始化配置:`, config);
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
    }, [config, type]);

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
        await onSaveConfig(type, {
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
        });
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

  // 人工告警配置组件
  const HumanAlertConfig = () => {
    const [alertEnabled, setAlertEnabled] = useState(true);
    const [alertMode, setAlertMode] = useState('risk');
    const [recipients, setRecipients] = useState<any[]>([]);
    const [alertCount, setAlertCount] = useState(1);
    const [alertInterval, setAlertInterval] = useState(5);
    const [messageTemplate, setMessageTemplate] = useState(
      "⚠️ 风险告警\n\n【用户信息】\n用户：{userName}\n群组：{groupName}\n\n【风险内容】\n{messageContent}\n\n【时间】\n{timestamp}"
    );
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

    const loadAlertConfig = async () => {
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
            setMessageTemplate(data.data.alertMessageTemplate || messageTemplate);
          }
        }
      } catch (error) {
        console.error('加载告警配置失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleSaveConfig = async () => {
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
        console.error('保存配置失败:', error);
        alert('❌ 保存失败');
      } finally {
        setIsLoading(false);
      }
    };

    const handleAddRecipient = async () => {
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
        console.error('添加接收者失败:', error);
        alert('❌ 添加失败');
      } finally {
        setIsLoading(false);
      }
    };

    const handleToggleRecipient = async (id: string, enabled: boolean) => {
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
        console.error('更新接收者失败:', error);
      }
    };

    const handleDeleteRecipient = async (id: string) => {
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
        console.error('删除接收者失败:', error);
        alert('❌ 删除失败');
      }
    };

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
  };

  // 系统设置页面
  const SettingsTab = () => {
    const [autoReplyMode, setAutoReplyMode] = useState('ai');
    const [chatProbability, setChatProbability] = useState(30);
    const [serviceReplyEnabled, setServiceReplyEnabled] = useState(true);
    const [riskAutoHuman, setRiskAutoHuman] = useState(true);
    const [aiConfig, setAiConfig] = useState<any>(null);
    const [activeAiTab, setActiveAiTab] = useState('intentRecognition');
    const [isLoadingAiConfig, setIsLoadingAiConfig] = useState(false);
    
    // 使用 ref 避免重复加载
    const aiConfigLoadedRef = useRef(false);

    useEffect(() => {
      // 只在第一次加载，避免重复请求
      if (!aiConfigLoadedRef.current) {
        loadAiConfig();
        aiConfigLoadedRef.current = true;
      }
    }, []);

    const loadAiConfig = async () => {
      if (isLoadingAiConfig) return; // 防止重复加载
      
      setIsLoadingAiConfig(true);
      try {
        console.log('[AI配置] 开始加载 AI 模型配置...');
        const res = await fetch('/api/admin/config', { cache: 'no-store' });
        
        console.log('[AI配置] API 响应状态:', res.status, res.statusText);
        
        if (res.ok) {
          const data = await res.json();
          console.log('[AI配置] AI 配置加载成功:', data.data);
          setAiConfig(data.data);
        } else {
          console.error('[AI配置] API 返回错误状态:', res.status, res.statusText);
          const errorText = await res.text();
          console.error('[AI配置] 错误响应内容:', errorText);
          setAiConfig(null); // 明确设置为 null
        }
      } catch (error) {
        console.error('[AI配置] 加载 AI 配置失败:', error);
        setAiConfig(null); // 明确设置为 null
      } finally {
        setIsLoadingAiConfig(false);
      }
    };

    const saveSettings = async () => {
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
    };

    // 保存 AI 模型配置
    const saveAiConfig = async (type: string, config: any) => {
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
        }
      } catch (error) {
        alert('❌ 保存失败');
      }
    };

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
              配置意图识别、服务回复、闲聊、报告生成的 AI 模型
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {isLoadingAiConfig ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-purple-500" />
                  <p className="text-sm text-muted-foreground mt-2">正在加载 AI 模型配置...</p>
                </div>
              </div>
            ) : !aiConfig ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
                  <p className="text-sm text-muted-foreground mt-2">AI 模型配置加载失败</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => {
                      aiConfigLoadedRef.current = false;
                      loadAiConfig();
                    }}
                  >
                    重新加载
                  </Button>
                </div>
              </div>
            ) : (
              <Tabs value={activeAiTab} onValueChange={setActiveAiTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="intentRecognition">意图识别</TabsTrigger>
                  <TabsTrigger value="serviceReply">服务回复</TabsTrigger>
                  <TabsTrigger value="chat">闲聊</TabsTrigger>
                  <TabsTrigger value="report">报告生成</TabsTrigger>
                </TabsList>
              
              <TabsContent value="intentRecognition">
                <AiModelConfig
                  type="intentRecognition"
                  title="意图识别模型"
                  description="用于分析用户消息意图，支持聊天、服务、帮助、风险等识别"
                  aiConfig={aiConfig}
                  onSaveConfig={saveAiConfig}
                />
              </TabsContent>
              
              <TabsContent value="serviceReply">
                <AiModelConfig
                  type="serviceReply"
                  title="服务回复模型"
                  description="用于自动回复服务类问题，生成专业、友好的回复"
                  aiConfig={aiConfig}
                  onSaveConfig={saveAiConfig}
                />
              </TabsContent>
              
              <TabsContent value="chat">
                <AiModelConfig
                  type="chat"
                  title="闲聊模型"
                  description="用于闲聊陪伴，生成轻松、自然的对话"
                  aiConfig={aiConfig}
                  onSaveConfig={saveAiConfig}
                />
              </TabsContent>
              
              <TabsContent value="report">
                <AiModelConfig
                  type="report"
                  title="报告生成模型"
                  description="用于生成日终报告，数据分析和总结"
                  aiConfig={aiConfig}
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

  // 仪表盘主页面
  const DashboardTab = () => (
    <div className="space-y-6">
      <OverviewTab />
      
      {/* 最近活跃会话 */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                最近活跃会话
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('sessions')}>
                查看全部 <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.slice(0, 5).map((session) => (
                <div key={session.sessionId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {session.userName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{session.userName}</p>
                      <p className="text-xs text-muted-foreground">{session.groupName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={session.status === 'auto' ? 'default' : 'secondary'}
                      className="gap-1"
                    >
                      {session.status === 'auto' ? '自动' : '人工'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(session.lastActiveTime)}
                    </span>
                  </div>
                </div>
              ))}
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
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid h-auto p-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <TabsTrigger value="dashboard" className="gap-2 py-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">仪表盘</span>
            </TabsTrigger>
            <TabsTrigger value="callbacks" className="gap-2 py-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">回调中心</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2 py-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">会话管理</span>
            </TabsTrigger>
            <TabsTrigger value="monitor" className="gap-2 py-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">监控告警</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 py-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">报告中心</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 py-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">系统设置</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardTab />
          </TabsContent>

          <TabsContent value="callbacks" className="space-y-6">
            <CallbackCenter />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <SessionsTab />
          </TabsContent>

          <TabsContent value="monitor" className="space-y-6">
            <MonitorTab />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportsTab />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
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

