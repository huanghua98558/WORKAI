'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Bot, 
  Save, 
  RefreshCw, 
  Database, 
  Cpu, 
  Bell, 
  AlertTriangle,
  MessageSquare,
  FileText,
  Zap,
  Shield,
  Activity,
  Mail,
  UserCheck
} from 'lucide-react';

interface SettingsTabProps {
  aiConfig: any;
  isLoadingAiConfig: boolean;
}

export default function SettingsTab({ aiConfig, isLoadingAiConfig }: SettingsTabProps) {
  const [config, setConfig] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 加载完整配置
  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.data || {});
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        alert('✅ 配置保存成功');
        loadConfig(); // 重新加载配置
      } else {
        const data = await res.json();
        alert(`❌ 保存失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      alert('❌ 保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const updateAiConfig = (provider: string, field: string, value: any) => {
    setConfig({
      ...config,
      ai: {
        ...config.ai,
        [provider]: {
          ...config.ai?.[provider],
          [field]: value
        }
      }
    });
  };

  const updateAutoReplyConfig = (field: string, value: any) => {
    setConfig({
      ...config,
      autoReply: {
        ...config.autoReply,
        [field]: value
      }
    });
  };

  const updateMonitorConfig = (field: string, value: any) => {
    setConfig({
      ...config,
      monitor: {
        ...config.monitor,
        [field]: value
      }
    });
  };

  const updateAlertConfig = (field: string, value: any) => {
    setConfig({
      ...config,
      alert: {
        ...config.alert,
        [field]: value
      }
    });
  };

  if (isLoading || isLoadingAiConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const builtinModels = config.ai?.builtinModels || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-gray-500" />
            系统设置
          </h3>
          <p className="text-muted-foreground mt-1">配置系统参数、自动回复、监控和告警规则</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadConfig} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="autoreply" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="autoreply">
            <MessageSquare className="h-4 w-4 mr-2" />
            自动回复
          </TabsTrigger>
          <TabsTrigger value="monitor">
            <Activity className="h-4 w-4 mr-2" />
            监控
          </TabsTrigger>
          <TabsTrigger value="alert">
            <Bell className="h-4 w-4 mr-2" />
            告警
          </TabsTrigger>
        </TabsList>

        {/* 自动回复配置 */}
        <TabsContent value="autoreply" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                闲聊配置
              </CardTitle>
              <CardDescription>配置闲聊模式的回复策略</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="chatMode">闲聊模式</Label>
                <Select
                  value={config.autoReply?.chatMode || 'ai'}
                  onValueChange={(value) => updateAutoReplyConfig('chatMode', value)}
                >
                  <SelectTrigger id="chatMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai">AI 智能回复</SelectItem>
                    <SelectItem value="probability">概率回复</SelectItem>
                    <SelectItem value="fixed">固定话术</SelectItem>
                    <SelectItem value="none">不回复</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.autoReply?.chatMode === 'probability' && (
                <div>
                  <Label htmlFor="chatProbability">回复概率 ({Math.round((config.autoReply?.chatProbability || 0.3) * 100)}%)</Label>
                  <Input
                    id="chatProbability"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.autoReply?.chatProbability || 0.3}
                    onChange={(e) => updateAutoReplyConfig('chatProbability', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    值越大，回复概率越高
                  </p>
                </div>
              )}

              {config.autoReply?.chatMode === 'fixed' && (
                <div>
                  <Label htmlFor="chatFixedReply">固定回复内容</Label>
                  <Textarea
                    id="chatFixedReply"
                    value={config.autoReply?.chatFixedReply || ''}
                    onChange={(e) => updateAutoReplyConfig('chatFixedReply', e.target.value)}
                    placeholder="请输入固定的回复内容"
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-500" />
                服务配置
              </CardTitle>
              <CardDescription>配置服务咨询的回复模式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="serviceMode">服务模式</Label>
                <Select
                  value={config.autoReply?.serviceMode || 'auto'}
                  onValueChange={(value) => updateAutoReplyConfig('serviceMode', value)}
                >
                  <SelectTrigger id="serviceMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">AI 自动回复</SelectItem>
                    <SelectItem value="human">人工接管</SelectItem>
                    <SelectItem value="none">不回复</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  服务咨询消息的处理方式
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                风险配置
              </CardTitle>
              <CardDescription>配置风险内容的处理方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="riskMode">风险模式</Label>
                <Select
                  value={config.autoReply?.riskMode || 'human'}
                  onValueChange={(value) => updateAutoReplyConfig('riskMode', value)}
                >
                  <SelectTrigger id="riskMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="human">人工接管（推荐）</SelectItem>
                    <SelectItem value="ignore">忽略</SelectItem>
                    <SelectItem value="auto">自动回复</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  检测到风险内容时的处理方式
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 监控配置 */}
        <TabsContent value="monitor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                监控开关
              </CardTitle>
              <CardDescription>启用或禁用系统监控功能</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="monitorEnabled">启用监控</Label>
                  <p className="text-xs text-muted-foreground">
                    开启后系统将实时监控各项指标
                  </p>
                </div>
                <Switch
                  id="monitorEnabled"
                  checked={config.monitor?.enabled !== false}
                  onCheckedChange={(checked) => updateMonitorConfig('enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="alertEnabled">启用告警</Label>
                  <p className="text-xs text-muted-foreground">
                    开启后监控异常时将发送告警通知
                  </p>
                </div>
                <Switch
                  id="alertEnabled"
                  checked={config.monitor?.alertEnabled !== false}
                  onCheckedChange={(checked) => updateMonitorConfig('alertEnabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-500" />
                监控指标
              </CardTitle>
              <CardDescription>选择需要监控的系统指标</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="metricSystem">系统指标</Label>
                  <p className="text-xs text-muted-foreground">
                    CPU、内存、磁盘使用率
                  </p>
                </div>
                <Switch
                  id="metricSystem"
                  checked={config.monitor?.metrics?.system !== false}
                  onCheckedChange={(checked) => {
                    setConfig({
                      ...config,
                      monitor: {
                        ...config.monitor,
                        metrics: {
                          ...config.monitor?.metrics,
                          system: checked
                        }
                      }
                    });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="metricGroup">群组指标</Label>
                  <p className="text-xs text-muted-foreground">
                    群组消息数、活跃度
                  </p>
                </div>
                <Switch
                  id="metricGroup"
                  checked={config.monitor?.metrics?.group !== false}
                  onCheckedChange={(checked) => {
                    setConfig({
                      ...config,
                      monitor: {
                        ...config.monitor,
                        metrics: {
                          ...config.monitor?.metrics,
                          group: checked
                        }
                      }
                    });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="metricUser">用户指标</Label>
                  <p className="text-xs text-muted-foreground">
                    用户活跃度、消息数
                  </p>
                </div>
                <Switch
                  id="metricUser"
                  checked={config.monitor?.metrics?.user !== false}
                  onCheckedChange={(checked) => {
                    setConfig({
                      ...config,
                      monitor: {
                        ...config.monitor,
                        metrics: {
                          ...config.monitor?.metrics,
                          user: checked
                        }
                      }
                    });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="metricAi">AI 指标</Label>
                  <p className="text-xs text-muted-foreground">
                    AI 调用成功率、响应时间
                  </p>
                </div>
                <Switch
                  id="metricAi"
                  checked={config.monitor?.metrics?.ai !== false}
                  onCheckedChange={(checked) => {
                    setConfig({
                      ...config,
                      monitor: {
                        ...config.monitor,
                        metrics: {
                          ...config.monitor?.metrics,
                          ai: checked
                        }
                      }
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 告警配置 */}
        <TabsContent value="alert" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-purple-500" />
                告警规则
              </CardTitle>
              <CardDescription>配置系统告警规则和通知方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.alert?.rules?.map((rule: any, index: number) => (
                <div key={rule.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? '启用' : '禁用'}
                      </Badge>
                      <span className="font-medium">{rule.name}</span>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => {
                        const newRules = [...(config.alert?.rules || [])];
                        newRules[index].enabled = checked;
                        updateAlertConfig('rules', newRules);
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
              )) || <div className="text-center py-4 text-muted-foreground">暂无告警规则</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" />
                邮件通知
              </CardTitle>
              <CardDescription>配置告警邮件通知</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableEmail">启用邮件通知</Label>
                  <p className="text-xs text-muted-foreground">
                    通过邮件发送告警通知
                  </p>
                </div>
                <Switch
                  id="enableEmail"
                  checked={config.alert?.email?.enabled || false}
                  onCheckedChange={(checked) => {
                    setConfig({
                      ...config,
                      alert: {
                        ...config.alert,
                        email: {
                          ...(config.alert?.email || {}),
                          enabled: checked
                        }
                      }
                    });
                  }}
                />
              </div>

              <div>
                <Label htmlFor="alertEmail">接收邮箱</Label>
                <Input
                  id="alertEmail"
                  type="email"
                  value={config.alert?.email?.to || ''}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      alert: {
                        ...config.alert,
                        email: {
                          ...(config.alert?.email || {}),
                          to: e.target.value
                        }
                      }
                    });
                  }}
                  placeholder="example@domain.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// AI 提供商配置组件
interface AIProviderConfigProps {
  provider: string;
  config: any;
  builtinModels: any[];
  onUpdate: (provider: string, field: string, value: any) => void;
  icon: React.ReactNode;
  name: string;
}

function AIProviderConfig({ provider, config, builtinModels, onUpdate, icon, name }: AIProviderConfigProps) {
  const [modelType, setModelType] = useState<'builtin' | 'custom'>(
    config?.useBuiltin ? 'builtin' : 'custom'
  );

  const handleModelTypeChange = (type: 'builtin' | 'custom') => {
    setModelType(type);
    onUpdate(provider, 'useBuiltin', type === 'builtin');
    onUpdate(provider, 'useCustom', type === 'custom');
  };

  const suitableModels = builtinModels.filter((m: any) => 
    m.category?.includes(name === '意图识别' ? 'intent' : 
                       name === '服务回复' ? 'service' : 
                       name === '报告生成' ? 'report' : 'conversion')
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <span className="font-medium">{name}</span>
      </div>

      {/* 模型类型选择 */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id={`${provider}-builtin`}
            checked={modelType === 'builtin'}
            onCheckedChange={() => handleModelTypeChange('builtin')}
          />
          <Label htmlFor={`${provider}-builtin`} className="cursor-pointer">
            内置模型
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id={`${provider}-custom`}
            checked={modelType === 'custom'}
            onCheckedChange={() => handleModelTypeChange('custom')}
          />
          <Label htmlFor={`${provider}-custom`} className="cursor-pointer">
            自定义模型
          </Label>
        </div>
      </div>

      {modelType === 'builtin' && (
        <div>
          <Label>选择内置模型</Label>
          <Select
            value={config?.builtinModelId || ''}
            onValueChange={(value) => onUpdate(provider, 'builtinModelId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择模型" />
            </SelectTrigger>
            <SelectContent>
              {suitableModels.map((model: any) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name} - {model.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {modelType === 'custom' && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
          <div>
            <Label>API 提供商</Label>
            <Select
              value={config?.customModel?.provider || 'openai'}
              onValueChange={(value) => onUpdate(provider, 'customModel', {
                ...config?.customModel,
                provider: value
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="azure">Azure OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>模型名称</Label>
            <Input
              value={config?.customModel?.model || ''}
              onChange={(e) => onUpdate(provider, 'customModel', {
                ...config?.customModel,
                model: e.target.value
              })}
              placeholder="gpt-4o"
            />
          </div>

          <div>
            <Label>API Key</Label>
            <Input
              type="password"
              value={config?.customModel?.apiKey || ''}
              onChange={(e) => onUpdate(provider, 'customModel', {
                ...config?.customModel,
                apiKey: e.target.value
              })}
              placeholder="请输入 API Key"
            />
          </div>

          <div>
            <Label>API Base URL（可选）</Label>
            <Input
              value={config?.customModel?.apiBase || ''}
              onChange={(e) => onUpdate(provider, 'customModel', {
                ...config?.customModel,
                apiBase: e.target.value
              })}
              placeholder="https://api.openai.com/v1"
            />
          </div>
        </div>
      )}

      {/* 系统提示词 */}
      <div>
        <Label>系统提示词</Label>
        <Textarea
          value={config?.systemPrompt || ''}
          onChange={(e) => onUpdate(provider, 'systemPrompt', e.target.value)}
          placeholder="请输入系统提示词"
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">
          用于指导 AI 的行为和回复风格
        </p>
      </div>
    </div>
  );
}
