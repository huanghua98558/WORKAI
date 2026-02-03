'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import {
  Bell,
  AlertTriangle,
  ShieldCheck,
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  TestTube,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Info,
  AlertCircle,
} from 'lucide-react';

// 类型定义
interface IntentConfig {
  id: string;
  intentType: string;
  intentName: string;
  intentDescription?: string;
  systemPrompt: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AlertRule {
  id: string;
  intentType: string;
  ruleName: string;
  isEnabled: boolean;
  alertLevel: 'critical' | 'warning' | 'info';
  threshold: number;
  cooldownPeriod: number;
  messageTemplate?: string;
  createdAt: string;
  updatedAt: string;
}

interface NotificationMethod {
  id: string;
  alertRuleId: string;
  methodType: string;
  isEnabled: boolean;
  recipientConfig: any;
  messageTemplate?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface AlertHistory {
  id: string;
  sessionId: string;
  alertRuleId: string;
  intentType: string;
  alertLevel: string;
  userId: string;
  userName: string;
  groupId?: string;
  groupName?: string;
  messageContent?: string;
  alertMessage: string;
  notificationStatus: string;
  notificationResult?: any;
  isHandled: boolean;
  handledBy?: string;
  handledAt?: string;
  createdAt: string;
}

export default function AlertConfigTab() {
  const [activeTab, setActiveTab] = useState('intents');
  const [intents, setIntents] = useState<IntentConfig[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showIntentDialog, setShowIntentDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [editingIntent, setEditingIntent] = useState<IntentConfig | null>(null);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [notificationMethods, setNotificationMethods] = useState<NotificationMethod[]>([]);

  // 加载所有数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [intentsRes, rulesRes, historyRes, statsRes] = await Promise.all([
        fetch('/api/alerts/intents'),
        fetch('/api/alerts/rules'),
        fetch('/api/alerts/history?limit=50'),
        fetch('/api/alerts/stats?timeRange=7d'),
      ]);

      if (intentsRes.ok) {
        const data = await intentsRes.json();
        setIntents(data.data || []);
      }

      if (rulesRes.ok) {
        const data = await rulesRes.json();
        setRules(data.data || []);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.data || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data || {});
      }
    } catch (error) {
      console.error('加载告警配置失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 加载通知方式
  const loadNotificationMethods = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/alerts/rules/${ruleId}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotificationMethods(data.data || []);
      }
    } catch (error) {
      console.error('加载通知方式失败:', error);
    }
  };

  // 保存意图配置
  const saveIntentConfig = async (config: any) => {
    try {
      const res = await fetch('/api/alerts/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setShowIntentDialog(false);
        setEditingIntent(null);
        loadData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('保存意图配置失败:', error);
      return false;
    }
  };

  // 保存告警规则
  const saveAlertRule = async (rule: any) => {
    try {
      const res = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      if (res.ok) {
        setShowRuleDialog(false);
        setEditingRule(null);
        loadData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('保存告警规则失败:', error);
      return false;
    }
  };

  // 标记告警为已处理
  const handleAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/history/${alertId}/handle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handledBy: 'admin' }),
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('标记告警失败:', error);
    }
  };

  // 测试通知
  const testNotification = async (methodType: string, recipientConfig: any) => {
    try {
      const res = await fetch('/api/alerts/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methodType, recipientConfig }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.data.message);
      }
    } catch (error) {
      console.error('测试通知失败:', error);
    }
  };

  // 获取告警级别颜色
  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // 获取通知方式图标
  const getNotificationIcon = (methodType: string) => {
    switch (methodType) {
      case 'robot':
        return <MessageSquare className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <Phone className="h-4 w-4" />;
      case 'wechat':
        return <Send className="h-4 w-4" />;
      case 'dingtalk':
        return <Bell className="h-4 w-4" />;
      case 'feishu':
        return <Info className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-orange-500" />
            告警配置管理
          </h3>
          <p className="text-muted-foreground mt-1">
            配置意图识别、告警规则和通知方式
          </p>
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

      {/* 告警统计卡片 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总告警数</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total || 0}</div>
              <p className="text-xs text-muted-foreground">近 7 天</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">严重告警</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.critical || 0}
              </div>
              <p className="text-xs text-muted-foreground">需要立即处理</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已处理</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.handled || 0}
              </div>
              <p className="text-xs text-muted-foreground">已妥善处理</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待处理</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.unhandled || 0}
              </div>
              <p className="text-xs text-muted-foreground">等待处理</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 配置管理 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="intents">意图配置</TabsTrigger>
          <TabsTrigger value="rules">告警规则</TabsTrigger>
          <TabsTrigger value="history">告警历史</TabsTrigger>
        </TabsList>

        {/* 意图配置 */}
        <TabsContent value="intents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>意图配置</CardTitle>
                  <CardDescription>管理AI意图识别的配置</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingIntent(null);
                    setShowIntentDialog(true);
                  }}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新增意图
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {intents.map((intent) => (
                  <div
                    key={intent.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{intent.intentName}</span>
                          <Badge variant="outline">{intent.intentType}</Badge>
                          <Switch
                            checked={intent.isEnabled}
                            onChange={async () => {
                              await saveIntentConfig({
                                ...intent,
                                isEnabled: !intent.isEnabled,
                              });
                            }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {intent.intentDescription}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingIntent(intent);
                          setShowIntentDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 告警规则 */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>告警规则</CardTitle>
                  <CardDescription>配置不同意图的告警触发规则</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingRule(null);
                    setShowRuleDialog(true);
                  }}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新增规则
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rule.ruleName}</span>
                        <Badge className={getAlertLevelColor(rule.alertLevel)}>
                          {rule.alertLevel}
                        </Badge>
                        <Badge variant="outline">{rule.intentType}</Badge>
                        <Switch
                          checked={rule.isEnabled}
                          onChange={async () => {
                            await saveAlertRule({
                              ...rule,
                              isEnabled: !rule.isEnabled,
                            });
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRule(rule);
                            loadNotificationMethods(rule.id);
                            setShowNotificationDialog(true);
                          }}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          通知方式
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingRule(rule);
                            setShowRuleDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">阈值：</span>
                        <span className="font-medium ml-1">{rule.threshold} 次</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">冷却：</span>
                        <span className="font-medium ml-1">{rule.cooldownPeriod} 秒</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">通知方式：</span>
                        <span className="font-medium ml-1">
                          {notificationMethods.filter(m => m.alertRuleId === rule.id).length} 种
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 告警历史 */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>告警历史</CardTitle>
              <CardDescription>查看最近的告警记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无告警记录</p>
                  </div>
                ) : (
                  history.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getAlertLevelColor(alert.alertLevel)}>
                            {alert.alertLevel}
                          </Badge>
                          <Badge variant="outline">{alert.intentType}</Badge>
                          {alert.isHandled ? (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              已处理
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              <Clock className="h-3 w-3 mr-1" />
                              待处理
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div className="mb-2">
                        <p className="text-sm font-medium">{alert.alertMessage}</p>
                        {alert.messageContent && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            原消息: {alert.messageContent}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          用户: {alert.userName} {alert.groupName && `| 群组: ${alert.groupName}`}
                        </div>
                        {!alert.isHandled && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAlert(alert.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            标记为已处理
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 意图配置对话框 */}
      <Dialog open={showIntentDialog} onOpenChange={setShowIntentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingIntent ? '编辑意图配置' : '新增意图配置'}</DialogTitle>
            <DialogDescription>
              配置AI意图识别的系统提示词和描述
            </DialogDescription>
          </DialogHeader>
          <IntentConfigForm
            intent={editingIntent}
            onSave={saveIntentConfig}
            onCancel={() => {
              setShowIntentDialog(false);
              setEditingIntent(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 告警规则对话框 */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? '编辑告警规则' : '新增告警规则'}</DialogTitle>
            <DialogDescription>
              配置告警触发条件、级别和通知方式
            </DialogDescription>
          </DialogHeader>
          <AlertRuleForm
            rule={editingRule}
            intents={intents}
            onSave={saveAlertRule}
            onCancel={() => {
              setShowRuleDialog(false);
              setEditingRule(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 通知方式对话框 */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>通知方式配置</DialogTitle>
            <DialogDescription>
              配置告警触发的通知方式和接收人
            </DialogDescription>
          </DialogHeader>
          {selectedRule && (
            <NotificationMethodList
              ruleId={selectedRule.id}
              ruleName={selectedRule.ruleName}
              onTest={testNotification}
              onClose={() => {
                setShowNotificationDialog(false);
                setSelectedRule(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 意图配置表单组件
function IntentConfigForm({ intent, onSave, onCancel }: any) {
  const [formData, setFormData] = useState(
    intent || {
      intentType: '',
      intentName: '',
      intentDescription: '',
      systemPrompt: '',
      isEnabled: true,
    }
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="intentType">意图类型</Label>
          <Input
            id="intentType"
            value={formData.intentType}
            onChange={(e) =>
              setFormData({ ...formData, intentType: e.target.value })
            }
            placeholder="service, help, chat, ..."
            disabled={!!intent}
          />
        </div>
        <div>
          <Label htmlFor="intentName">意图名称</Label>
          <Input
            id="intentName"
            value={formData.intentName}
            onChange={(e) =>
              setFormData({ ...formData, intentName: e.target.value })
            }
            placeholder="服务咨询"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="intentDescription">意图描述</Label>
        <Input
          id="intentDescription"
          value={formData.intentDescription}
          onChange={(e) =>
            setFormData({ ...formData, intentDescription: e.target.value })
          }
          placeholder="用户咨询产品或服务相关问题"
        />
      </div>
      <div>
        <Label htmlFor="systemPrompt">系统提示词</Label>
        <Textarea
          id="systemPrompt"
          value={formData.systemPrompt}
          onChange={(e) =>
            setFormData({ ...formData, systemPrompt: e.target.value })
          }
          placeholder="你是一个企业微信群消息意图识别专家..."
          rows={6}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={formData.isEnabled}
          onChange={(e: any) =>
            setFormData({ ...formData, isEnabled: e.target.checked })
          }
        />
        <Label>启用</Label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={() => onSave(formData)}>
          <Save className="h-4 w-4 mr-2" />
          保存
        </Button>
      </DialogFooter>
    </div>
  );
}

// 告警规则表单组件
function AlertRuleForm({ rule, intents, onSave, onCancel }: any) {
  const [formData, setFormData] = useState(
    rule || {
      intentType: '',
      ruleName: '',
      isEnabled: true,
      alertLevel: 'warning' as const,
      threshold: 1,
      cooldownPeriod: 300,
      messageTemplate: '',
    }
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="intentType">意图类型</Label>
          <Select
            value={formData.intentType}
            onValueChange={(value) =>
              setFormData({ ...formData, intentType: value })
            }
            disabled={!!rule}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择意图类型" />
            </SelectTrigger>
            <SelectContent>
              {intents.map((intent: any) => (
                <SelectItem key={intent.id} value={intent.intentType}>
                  {intent.intentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="ruleName">规则名称</Label>
          <Input
            id="ruleName"
            value={formData.ruleName}
            onChange={(e) =>
              setFormData({ ...formData, ruleName: e.target.value })
            }
            placeholder="风险内容告警"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="alertLevel">告警级别</Label>
          <Select
            value={formData.alertLevel}
            onValueChange={(value: any) =>
              setFormData({ ...formData, alertLevel: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">严重</SelectItem>
              <SelectItem value="warning">警告</SelectItem>
              <SelectItem value="info">信息</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="threshold">阈值（次）</Label>
          <Input
            id="threshold"
            type="number"
            value={formData.threshold}
            onChange={(e) =>
              setFormData({ ...formData, threshold: parseInt(e.target.value) })
            }
          />
        </div>
        <div>
          <Label htmlFor="cooldownPeriod">冷却（秒）</Label>
          <Input
            id="cooldownPeriod"
            type="number"
            value={formData.cooldownPeriod}
            onChange={(e) =>
              setFormData({ ...formData, cooldownPeriod: parseInt(e.target.value) })
            }
          />
        </div>
      </div>
      <div>
        <Label htmlFor="messageTemplate">告警消息模板</Label>
        <Textarea
          id="messageTemplate"
          value={formData.messageTemplate}
          onChange={(e) =>
            setFormData({ ...formData, messageTemplate: e.target.value })
          }
          placeholder="⚠️ {alertLevel}告警\n\n用户 {userName} 在群组 {groupName} 发送了..."
          rows={6}
        />
        <p className="text-xs text-muted-foreground mt-1">
          可用变量: {userName}, {groupName}, {messageContent}, {intent}, {intentType}, {alertLevel}, {timestamp}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={formData.isEnabled}
          onChange={(e: any) =>
            setFormData({ ...formData, isEnabled: e.target.checked })
          }
        />
        <Label>启用</Label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={() => onSave(formData)}>
          <Save className="h-4 w-4 mr-2" />
          保存
        </Button>
      </DialogFooter>
    </div>
  );
}

// 通知方式列表组件
function NotificationMethodList({ ruleId, ruleName, onTest, onClose }: any) {
  const [methods, setMethods] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const loadMethods = async () => {
    try {
      const res = await fetch(`/api/alerts/rules/${ruleId}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setMethods(data.data || []);
      }
    } catch (error) {
      console.error('加载通知方式失败:', error);
    }
  };

  useEffect(() => {
    loadMethods();
  }, [ruleId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium">{ruleName}</p>
          <p className="text-sm text-muted-foreground">
            已配置 {methods.length} 种通知方式
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          添加通知方式
        </Button>
      </div>
      <div className="space-y-2">
        {methods.map((method) => (
          <div
            key={method.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                {getNotificationIcon(method.methodType)}
              </div>
              <div>
                <p className="font-medium">
                  {getNotificationTypeName(method.methodType)}
                </p>
                <p className="text-sm text-muted-foreground">
                  优先级: {method.priority}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTest(method.methodType, method.recipientConfig)}
              >
                <TestTube className="h-4 w-4 mr-2" />
                测试
              </Button>
              <Switch
                checked={method.isEnabled}
                onChange={async () => {
                  await fetch(`/api/alerts/notifications/${method.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isEnabled: !method.isEnabled }),
                  });
                  loadMethods();
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          关闭
        </Button>
      </DialogFooter>
    </div>
  );
}

// 获取通知方式名称
function getNotificationTypeName(methodType: string) {
  const names: any = {
    robot: '机器人通知',
    email: '邮件通知',
    sms: '短信通知',
    wechat: '企业微信',
    dingtalk: '钉钉',
    feishu: '飞书',
  };
  return names[methodType] || methodType;
}
