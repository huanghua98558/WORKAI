'use client';

import { useState, useEffect } from 'react';
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
  RadioOff,
  Code,
  Terminal,
  Link2,
  ExternalLink,
  FileJson,
  LayoutDashboard,
  MessageCircle,
  UserCheck,
  BarChart
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
      const res = await fetch('/api/admin/health');
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
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'} className="gap-1">
            {connectionStatus === 'connected' ? (
              <>
                <CheckCircle className="h-3 w-3" />
                已连接
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
              {monitorData?.system.callback_received > 0 && (
                <span className="text-green-600 ml-1">+{monitorData.system.callback_received}</span>
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
              <Badge variant={monitorData?.system.callback_error > 0 ? 'destructive' : 'secondary'}>
                {monitorData?.system.callback_error || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">AI 请求</span>
              <Badge variant="secondary">{monitorData?.system.ai_requests || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">AI 错误</span>
              <Badge variant={monitorData?.system.ai_errors > 0 ? 'destructive' : 'secondary'}>
                {monitorData?.system.ai_errors || 0}
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  监控与告警
                </CardTitle>
                <CardDescription>系统监控指标和告警历史</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">监控数据加载中...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  报告中心
                </CardTitle>
                <CardDescription>查看日终报告和导出数据</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">报告列表加载中...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  系统设置
                </CardTitle>
                <CardDescription>配置系统运行参数</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">设置页面开发中...</p>
              </CardContent>
            </Card>
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

// Info 图标组件
function Info({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
