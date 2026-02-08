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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  UserCheck,
  Server,
  HardDrive,
  Network,
  Globe,
  Clock,
  Info,
  Users
} from 'lucide-react';
import SystemLogs from '@/components/system-logs';
import UserManagement from '@/components/user-management';

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

  const updateAutoReplyConfig = (field: string, value: any) => {
    setConfig({
      ...config,
      autoReply: {
        ...config.autoReply,
        [field]: value
      }
    });
  };

  const updateAiConfig = (field: string, value: any) => {
    setConfig({
      ...config,
      ai: {
        ...config.ai,
        [field]: value
      }
    });
  };

  const updateFlowConfig = (field: string, value: any) => {
    setConfig({
      ...config,
      flow: {
        ...config.flow,
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

  const updateNotificationConfig = (field: string, value: any) => {
    setConfig({
      ...config,
      notification: {
        ...config.notification,
        [field]: value
      }
    });
  };

  // 测试工作人员识别规则（前端实现）
  const handleTestStaffIdentifier = async () => {
    const staffConfig = config.staff || {};

    console.log('[测试] 当前配置:', JSON.stringify(staffConfig, null, 2));

    // 检查是否启用
    if (!staffConfig.enabled) {
      alert('⚠️ 工作人员检测未启用\n\n请先启用"工作人员检测"开关，然后再进行测试。');
      return;
    }

    // 检查是否有识别规则
    const hasRules =
      (staffConfig.userIds && staffConfig.userIds.length > 0) ||
      (staffConfig.enterpriseNames && staffConfig.enterpriseNames.length > 0) ||
      (staffConfig.userRemarks && staffConfig.userRemarks.length > 0) ||
      (staffConfig.nicknames && staffConfig.nicknames.length > 0) ||
      (staffConfig.specialPatterns && staffConfig.specialPatterns.length > 0);

    if (!hasRules) {
      alert('⚠️ 没有配置识别规则\n\n请先配置至少一种识别规则：\n\n1. 企业名称\n2. 备注名关键词\n3. 昵称关键词\n4. 特殊标识\n5. 用户ID\n\n然后再进行测试。');
      return;
    }

    // 创建测试消息
    const testMessages = [
      {
        userId: 'user001',
        receivedName: 'XX公司-客服',
        userRemark: '客服专员',
        platform: 'enterprise',
        description: '企业微信客服（应识别）'
      },
      {
        userId: 'user002',
        receivedName: '技术支持-小王',
        userRemark: '',
        platform: 'enterprise',
        description: '企业微信技术支持（应识别）'
      },
      {
        userId: 'user003',
        receivedName: '李四',
        userRemark: '',
        platform: 'personal',
        description: '个人微信用户（不应识别）'
      }
    ];

    console.log('[测试] 测试消息:', testMessages);

    // 测试每个消息
    const results = testMessages.map(msg => {
      const isStaff = isStaffUser(msg, staffConfig);
      const matchedRule = getMatchedRule(msg, staffConfig);
      console.log('[测试] 消息:', msg, '识别结果:', isStaff, '匹配规则:', matchedRule);
      return {
        ...msg,
        isStaff,
        matchedRule
      };
    });

    // 显示结果
    let resultText = '工作人员识别规则测试结果\n\n';
    resultText += `当前配置:\n`;
    if (staffConfig.enterpriseNames?.length) resultText += `- 企业名称: ${staffConfig.enterpriseNames.join(', ')}\n`;
    if (staffConfig.userRemarks?.length) resultText += `- 备注名关键词: ${staffConfig.userRemarks.join(', ')}\n`;
    if (staffConfig.nicknames?.length) resultText += `- 昵称关键词: ${staffConfig.nicknames.join(', ')}\n`;
    if (staffConfig.specialPatterns?.length) resultText += `- 特殊标识: ${staffConfig.specialPatterns.join(', ')}\n`;
    if (staffConfig.userIds?.length) resultText += `- 用户ID: ${staffConfig.userIds.join(', ')}\n`;
    resultText += '\n测试结果:\n\n';

    resultText += results.map(r => {
      const status = r.isStaff ? '✅ 是工作人员' : '❌ 不是工作人员';
      const rule = r.matchedRule ? `\n匹配规则: ${r.matchedRule.reason}` : '\n未匹配任何规则';
      return `${status}\n用户: ${r.receivedName}\n${r.description}${rule}`;
    }).join('\n\n');

    alert(resultText);
  };

  // 前端实现：判断用户是否为工作人员
  const isStaffUser = (message: any, config: any) => {
    if (!config.enabled) return false;

    const { userId, receivedName, userRemark, platform } = message;
    const userIds = config.userIds || [];
    const userRemarks = config.userRemarks || [];
    const nicknames = config.nicknames || [];
    const enterpriseNames = config.enterpriseNames || [];
    const specialPatterns = config.specialPatterns || [];

    // 1. userId匹配
    if (userIds.includes(userId)) return true;

    // 2. 企业名匹配
    if (platform === 'enterprise') {
      for (const enterpriseName of enterpriseNames) {
        if (receivedName && receivedName.includes(enterpriseName)) {
          return true;
        }
      }
    }

    // 3. 备注名匹配
    if (userRemark) {
      for (const remark of userRemarks) {
        if (userRemark.includes(remark)) {
          return true;
        }
      }
    }

    // 4. 昵称匹配
    if (receivedName) {
      for (const nickname of nicknames) {
        if (receivedName.includes(nickname)) {
          return true;
        }
      }
    }

    // 5. 特殊标识匹配
    for (const pattern of specialPatterns) {
      if ((receivedName && receivedName.includes(pattern)) ||
          (userRemark && userRemark.includes(pattern))) {
        return true;
      }
    }

    return false;
  };

  // 前端实现：获取匹配的识别规则
  const getMatchedRule = (message: any, config: any) => {
    const { userId, receivedName, userRemark, platform } = message;
    const userIds = config.userIds || [];
    const userRemarks = config.userRemarks || [];
    const nicknames = config.nicknames || [];
    const enterpriseNames = config.enterpriseNames || [];
    const specialPatterns = config.specialPatterns || [];

    if (userIds.includes(userId)) {
      return {
        type: 'userId',
        value: userId,
        reason: '直接指定的用户ID'
      };
    }

    if (platform === 'enterprise') {
      for (const enterpriseName of enterpriseNames) {
        if (receivedName && receivedName.includes(enterpriseName)) {
          return {
            type: 'enterpriseName',
            value: enterpriseName,
            reason: '企业微信企业名匹配'
          };
        }
      }
    }

    if (userRemark) {
      for (const remark of userRemarks) {
        if (userRemark.includes(remark)) {
          return {
            type: 'userRemark',
            value: remark,
            reason: '备注名关键词匹配'
          };
        }
      }
    }

    if (receivedName) {
      for (const nickname of nicknames) {
        if (receivedName.includes(nickname)) {
          return {
            type: 'nickname',
            value: nickname,
            reason: '昵称关键词匹配'
          };
        }
      }
    }

    if (receivedName || userRemark) {
      for (const pattern of specialPatterns) {
        if ((receivedName && receivedName.includes(pattern)) ||
            (userRemark && userRemark.includes(pattern))) {
          return {
            type: 'specialPattern',
            value: pattern,
            reason: '特殊标识匹配'
          };
        }
      }
    }

    return null;
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
          <p className="text-muted-foreground mt-1">配置系统参数、自动回复、AI、流程、日志等</p>
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
        <TabsList className="grid w-full grid-cols-5 h-14 bg-white/90 backdrop-blur-md border-2 border-slate-200/80 shadow-lg shadow-slate-200/50 rounded-2xl p-1.5 mb-6">
          <TabsTrigger value="autoreply" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
            <MessageSquare className="h-5 w-5" />
            自动回复
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
            <Bot className="h-5 w-5" />
            AI配置
          </TabsTrigger>
          <TabsTrigger value="flow" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
            <Zap className="h-5 w-5" />
            流程配置
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
            <Users className="h-5 w-5" />
            用户管理
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2.5 h-11 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
            <Server className="h-5 w-5" />
            系统日志
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
                  value={config.autoReply?.riskMode || 'auto_notify'}
                  onValueChange={(value) => updateAutoReplyConfig('riskMode', value)}
                >
                  <SelectTrigger id="riskMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto_notify">
                      <div className="flex flex-col">
                        <span>AI安抚 + 通知人工（推荐）</span>
                        <span className="text-xs text-muted-foreground">
                          AI先处理安抚，人工可选择介入
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="human">人工接管（立即转人工）</SelectItem>
                    <SelectItem value="auto">仅AI处理</SelectItem>
                    <SelectItem value="ignore">忽略</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  检测到风险内容时的处理方式
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-500" />
                工作人员识别配置
              </CardTitle>
              <CardDescription>配置如何识别群内的工作人员（用于检测其他人工是否已处理）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>企业名称（企业微信）</Label>
                <Textarea
                  value={(config.staff?.enterpriseNames || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      enterpriseNames: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个企业名，如：&#10;XX公司&#10;XX科技"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  企业微信用户的企业名（支持模糊匹配）
                </p>
              </div>

              <div>
                <Label>备注名关键词</Label>
                <Textarea
                  value={(config.staff?.userRemarks || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      userRemarks: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个关键词，如：&#10;客服&#10;专员&#10;支持"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  用户的备注名包含这些关键词时会被识别为工作人员
                </p>
              </div>

              <div>
                <Label>昵称关键词</Label>
                <Textarea
                  value={(config.staff?.nicknames || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      nicknames: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个关键词，如：&#10;官方客服&#10;技术支持"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  用户的昵称包含这些关键词时会被识别为工作人员
                </p>
              </div>

              <div>
                <Label>特殊标识</Label>
                <Input
                  value={(config.staff?.specialPatterns || []).join(',')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      specialPatterns: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  })}
                  placeholder="客服,专员,支持,管理员"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  多个标识用逗号分隔（如：客服,专员,支持）
                </p>
              </div>

              <div>
                <Label>直接指定用户ID</Label>
                <Textarea
                  value={(config.staff?.userIds || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      userIds: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个用户ID，如：&#10;user123&#10;user456"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  直接指定哪些用户ID是工作人员（最准确的识别方式）
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="enableStaffDetection">启用工作人员检测</Label>
                  <p className="text-xs text-muted-foreground">
                    启用后会自动检测工作人员是否已处理风险消息
                  </p>
                </div>
                <Switch
                  id="enableStaffDetection"
                  checked={config.staff?.enabled ?? true}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      enabled: checked
                    }
                  })}
                />
              </div>

              {/* 保存提示 */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>配置保存提示</AlertTitle>
                <AlertDescription>
                  修改配置后，请点击页面顶部的{" "}
                  <span className="font-semibold">"保存配置"</span>{" "}
                  按钮以保存工作人员识别设置。
                </AlertDescription>
              </Alert>

              {/* 测试按钮 */}
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleTestStaffIdentifier()}
                  className="w-full"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  测试工作人员识别规则
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI配置 */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-500" />
                AI模型配置
              </CardTitle>
              <CardDescription>配置意图识别、服务回复、闲聊使用的AI模型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="intentModel">意图识别模型</Label>
                <Select
                  value={config.ai?.intentRecognition?.builtinModelId || 'doubao-pro-4k'}
                  onValueChange={(value) => updateAiConfig('intentRecognition', {
                    ...config.ai?.intentRecognition,
                    builtinModelId: value
                  })}
                >
                  <SelectTrigger id="intentModel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {builtinModels.map((model: any) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="serviceModel">服务回复模型</Label>
                <Select
                  value={config.ai?.serviceReply?.builtinModelId || 'doubao-pro-32k'}
                  onValueChange={(value) => updateAiConfig('serviceReply', {
                    ...config.ai?.serviceReply,
                    builtinModelId: value
                  })}
                >
                  <SelectTrigger id="serviceModel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {builtinModels.map((model: any) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="chatModel">闲聊模型</Label>
                <Select
                  value={config.ai?.chat?.builtinModelId || 'doubao-pro-4k'}
                  onValueChange={(value) => updateAiConfig('chat', {
                    ...config.ai?.chat,
                    builtinModelId: value
                  })}
                >
                  <SelectTrigger id="chatModel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {builtinModels.map((model: any) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-yellow-500" />
                AI预算控制
              </CardTitle>
              <CardDescription>配置AI调用的预算上限和超限策略</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dailyBudget">每日预算上限（元）</Label>
                <Input
                  id="dailyBudget"
                  type="number"
                  value={config.ai?.budget?.dailyLimit || 100}
                  onChange={(e) => updateAiConfig('budget', {
                    ...config.ai?.budget,
                    dailyLimit: parseFloat(e.target.value)
                  })}
                />
              </div>

              <div>
                <Label htmlFor="singleBudget">单次成本上限（元）</Label>
                <Input
                  id="singleBudget"
                  type="number"
                  value={config.ai?.budget?.singleLimit || 10}
                  onChange={(e) => updateAiConfig('budget', {
                    ...config.ai?.budget,
                    singleLimit: parseFloat(e.target.value)
                  })}
                />
              </div>

              <div>
                <Label htmlFor="overLimitStrategy">超限策略</Label>
                <Select
                  value={config.ai?.budget?.overLimitStrategy || 'downgrade'}
                  onValueChange={(value) => updateAiConfig('budget', {
                    ...config.ai?.budget,
                    overLimitStrategy: value
                  })}
                >
                  <SelectTrigger id="overLimitStrategy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stop">停止服务</SelectItem>
                    <SelectItem value="downgrade">降级服务</SelectItem>
                    <SelectItem value="notify">仅通知</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-500" />
                工作人员识别配置
              </CardTitle>
              <CardDescription>配置如何识别群内的工作人员（用于检测其他人工是否已处理）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>企业名称（企业微信）</Label>
                <Textarea
                  value={(config.staff?.enterpriseNames || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      enterpriseNames: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个企业名，如：&#10;XX公司&#10;XX科技"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  企业微信用户的企业名（支持模糊匹配）
                </p>
              </div>

              <div>
                <Label>备注名关键词</Label>
                <Textarea
                  value={(config.staff?.userRemarks || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      userRemarks: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个关键词，如：&#10;客服&#10;专员&#10;支持"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  用户的备注名包含这些关键词时会被识别为工作人员
                </p>
              </div>

              <div>
                <Label>昵称关键词</Label>
                <Textarea
                  value={(config.staff?.nicknames || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      nicknames: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个关键词，如：&#10;官方客服&#10;技术支持"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  用户的昵称包含这些关键词时会被识别为工作人员
                </p>
              </div>

              <div>
                <Label>特殊标识</Label>
                <Input
                  value={(config.staff?.specialPatterns || []).join(',')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      specialPatterns: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  })}
                  placeholder="客服,专员,支持,管理员"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  多个标识用逗号分隔（如：客服,专员,支持）
                </p>
              </div>

              <div>
                <Label>直接指定用户ID</Label>
                <Textarea
                  value={(config.staff?.userIds || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      userIds: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个用户ID，如：&#10;user123&#10;user456"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  直接指定哪些用户ID是工作人员（最准确的识别方式）
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="enableStaffDetection">启用工作人员检测</Label>
                  <p className="text-xs text-muted-foreground">
                    启用后会自动检测工作人员是否已处理风险消息
                  </p>
                </div>
                <Switch
                  id="enableStaffDetection"
                  checked={config.staff?.enabled ?? true}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      enabled: checked
                    }
                  })}
                />
              </div>

              {/* 保存提示 */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>配置保存提示</AlertTitle>
                <AlertDescription>
                  修改配置后，请点击页面顶部的{" "}
                  <span className="font-semibold">"保存配置"</span>{" "}
                  按钮以保存工作人员识别设置。
                </AlertDescription>
              </Alert>

              {/* 测试按钮 */}
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleTestStaffIdentifier()}
                  className="w-full"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  测试工作人员识别规则
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 流程配置 */}
        <TabsContent value="flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                流程引擎设置
              </CardTitle>
              <CardDescription>配置流程引擎的全局参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="defaultFlow">默认流程</Label>
                <Select
                  value={config.flow?.defaultFlow || 'customer-service'}
                  onValueChange={(value) => updateFlowConfig('defaultFlow', value)}
                >
                  <SelectTrigger id="defaultFlow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer-service">客服回复流程</SelectItem>
                    <SelectItem value="alert">告警流程</SelectItem>
                    <SelectItem value="command">指令执行流程</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="flowTimeout">流程超时时间（秒）</Label>
                <Input
                  id="flowTimeout"
                  type="number"
                  value={config.flow?.timeout || 300}
                  onChange={(e) => updateFlowConfig('timeout', parseInt(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="retryCount">错误重试次数</Label>
                <Input
                  id="retryCount"
                  type="number"
                  value={config.flow?.retryCount || 3}
                  onChange={(e) => updateFlowConfig('retryCount', parseInt(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="versionManagement">流程版本管理</Label>
                  <p className="text-xs text-muted-foreground">
                    启用后，流程修改会创建新版本
                  </p>
                </div>
                <Switch
                  id="versionManagement"
                  checked={config.flow?.versionManagement || false}
                  onCheckedChange={(checked) => updateFlowConfig('versionManagement', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                节点配置
              </CardTitle>
              <CardDescription>配置各类型节点的超时时间</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="aiNodeTimeout">AI节点超时时间（秒）</Label>
                <Input
                  id="aiNodeTimeout"
                  type="number"
                  value={config.flow?.nodeTimeout?.ai || 30}
                  onChange={(e) => updateFlowConfig('nodeTimeout', {
                    ...config.flow?.nodeTimeout,
                    ai: parseInt(e.target.value)
                  })}
                />
              </div>

              <div>
                <Label htmlFor="webhookNodeTimeout">Webhook节点超时时间（秒）</Label>
                <Input
                  id="webhookNodeTimeout"
                  type="number"
                  value={config.flow?.nodeTimeout?.webhook || 10}
                  onChange={(e) => updateFlowConfig('nodeTimeout', {
                    ...config.flow?.nodeTimeout,
                    webhook: parseInt(e.target.value)
                  })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-500" />
                工作人员识别配置
              </CardTitle>
              <CardDescription>配置如何识别群内的工作人员（用于检测其他人工是否已处理）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>企业名称（企业微信）</Label>
                <Textarea
                  value={(config.staff?.enterpriseNames || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      enterpriseNames: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个企业名，如：&#10;XX公司&#10;XX科技"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  企业微信用户的企业名（支持模糊匹配）
                </p>
              </div>

              <div>
                <Label>备注名关键词</Label>
                <Textarea
                  value={(config.staff?.userRemarks || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      userRemarks: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个关键词，如：&#10;客服&#10;专员&#10;支持"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  用户的备注名包含这些关键词时会被识别为工作人员
                </p>
              </div>

              <div>
                <Label>昵称关键词</Label>
                <Textarea
                  value={(config.staff?.nicknames || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      nicknames: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个关键词，如：&#10;官方客服&#10;技术支持"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  用户的昵称包含这些关键词时会被识别为工作人员
                </p>
              </div>

              <div>
                <Label>特殊标识</Label>
                <Input
                  value={(config.staff?.specialPatterns || []).join(',')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      specialPatterns: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  })}
                  placeholder="客服,专员,支持,管理员"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  多个标识用逗号分隔（如：客服,专员,支持）
                </p>
              </div>

              <div>
                <Label>直接指定用户ID</Label>
                <Textarea
                  value={(config.staff?.userIds || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      userIds: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个用户ID，如：&#10;user123&#10;user456"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  直接指定哪些用户ID是工作人员（最准确的识别方式）
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="enableStaffDetection">启用工作人员检测</Label>
                  <p className="text-xs text-muted-foreground">
                    启用后会自动检测工作人员是否已处理风险消息
                  </p>
                </div>
                <Switch
                  id="enableStaffDetection"
                  checked={config.staff?.enabled ?? true}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      enabled: checked
                    }
                  })}
                />
              </div>

              {/* 保存提示 */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>配置保存提示</AlertTitle>
                <AlertDescription>
                  修改配置后，请点击页面顶部的{" "}
                  <span className="font-semibold">"保存配置"</span>{" "}
                  按钮以保存工作人员识别设置。
                </AlertDescription>
              </Alert>

              {/* 测试按钮 */}
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleTestStaffIdentifier()}
                  className="w-full"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  测试工作人员识别规则
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 用户管理 */}
        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>

        {/* 系统日志 */}
        <TabsContent value="logs" className="space-y-4">
          <SystemLogs />
        </TabsContent>

        {/* 数据管理（暂未实现） */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                数据备份
              </CardTitle>
              <CardDescription>配置数据备份策略</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoBackup">自动备份</Label>
                  <p className="text-xs text-muted-foreground">
                    定期自动备份系统数据
                  </p>
                </div>
                <Switch
                  id="autoBackup"
                  checked={config.data?.autoBackup || false}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    data: { ...config.data, autoBackup: checked }
                  })}
                />
              </div>

              <div>
                <Label htmlFor="backupFrequency">备份频率</Label>
                <Select
                  value={config.data?.backupFrequency || 'daily'}
                  onValueChange={(value) => setConfig({
                    ...config,
                    data: { ...config.data, backupFrequency: value }
                  })}
                >
                  <SelectTrigger id="backupFrequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">每天</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                    <SelectItem value="monthly">每月</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="retentionDays">保留天数</Label>
                <Input
                  id="retentionDays"
                  type="number"
                  value={config.data?.retentionDays || 30}
                  onChange={(e) => setConfig({
                    ...config,
                    data: { ...config.data, retentionDays: parseInt(e.target.value) }
                  })}
                />
              </div>

              <Button variant="outline">
                <Database className="h-4 w-4 mr-2" />
                手动备份
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知配置（暂未实现） */}
        <TabsContent value="notification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-purple-500" />
                邮件通知配置
              </CardTitle>
              <CardDescription>配置SMTP邮件服务器</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="smtpHost">SMTP服务器</Label>
                <Input
                  id="smtpHost"
                  value={config.notification?.email?.smtpHost || ''}
                  onChange={(e) => updateNotificationConfig('email', {
                    ...config.notification?.email,
                    smtpHost: e.target.value
                  })}
                  placeholder="smtp.example.com"
                />
              </div>

              <div>
                <Label htmlFor="smtpPort">SMTP端口</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={config.notification?.email?.smtpPort || 587}
                  onChange={(e) => updateNotificationConfig('email', {
                    ...config.notification?.email,
                    smtpPort: parseInt(e.target.value)
                  })}
                />
              </div>

              <div>
                <Label htmlFor="smtpUsername">SMTP用户名</Label>
                <Input
                  id="smtpUsername"
                  value={config.notification?.email?.smtpUsername || ''}
                  onChange={(e) => updateNotificationConfig('email', {
                    ...config.notification?.email,
                    smtpUsername: e.target.value
                  })}
                />
              </div>

              <div>
                <Label htmlFor="smtpPassword">SMTP密码</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  value={config.notification?.email?.smtpPassword || ''}
                  onChange={(e) => updateNotificationConfig('email', {
                    ...config.notification?.email,
                    smtpPassword: e.target.value
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableEmail">启用邮件通知</Label>
                  <p className="text-xs text-muted-foreground">
                    启用后，告警通知将通过邮件发送
                  </p>
                </div>
                <Switch
                  id="enableEmail"
                  checked={config.notification?.email?.enabled || false}
                  onCheckedChange={(checked) => updateNotificationConfig('email', {
                    ...config.notification?.email,
                    enabled: checked
                  })}
                />
              </div>

              <Button variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                测试邮件发送
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 高级设置（暂未实现） */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-gray-500" />
                系统性能
              </CardTitle>
              <CardDescription>配置系统性能相关参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="maxConcurrency">最大并发数</Label>
                <Input
                  id="maxConcurrency"
                  type="number"
                  value={config.advanced?.maxConcurrency || 100}
                  onChange={(e) => setConfig({
                    ...config,
                    advanced: { ...config.advanced, maxConcurrency: parseInt(e.target.value) }
                  })}
                />
              </div>

              <div>
                <Label htmlFor="cacheTimeout">缓存超时时间（秒）</Label>
                <Input
                  id="cacheTimeout"
                  type="number"
                  value={config.advanced?.cacheTimeout || 3600}
                  onChange={(e) => setConfig({
                    ...config,
                    advanced: { ...config.advanced, cacheTimeout: parseInt(e.target.value) }
                  })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5 text-blue-500" />
                集成配置（只读）
              </CardTitle>
              <CardDescription>查看第三方服务配置状态</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  <span>S3对象存储</span>
                </div>
                <Badge variant="outline">已连接</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>PostgreSQL数据库</span>
                </div>
                <Badge variant="outline">已连接</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  <span>Redis缓存</span>
                </div>
                <Badge variant="outline">已连接</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-500" />
                系统信息
              </CardTitle>
              <CardDescription>查看系统运行状态</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>系统版本</Label>
                  <p className="text-sm font-medium">v2.1.0</p>
                </div>
                <div>
                  <Label>运行时间</Label>
                  <p className="text-sm font-medium">
                    <Clock className="h-4 w-4 inline mr-1" />
                    {config.advanced?.uptime || '加载中...'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-500" />
                工作人员识别配置
              </CardTitle>
              <CardDescription>配置如何识别群内的工作人员（用于检测其他人工是否已处理）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>企业名称（企业微信）</Label>
                <Textarea
                  value={(config.staff?.enterpriseNames || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      enterpriseNames: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个企业名，如：&#10;XX公司&#10;XX科技"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  企业微信用户的企业名（支持模糊匹配）
                </p>
              </div>

              <div>
                <Label>备注名关键词</Label>
                <Textarea
                  value={(config.staff?.userRemarks || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      userRemarks: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个关键词，如：&#10;客服&#10;专员&#10;支持"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  用户的备注名包含这些关键词时会被识别为工作人员
                </p>
              </div>

              <div>
                <Label>昵称关键词</Label>
                <Textarea
                  value={(config.staff?.nicknames || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      nicknames: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个关键词，如：&#10;官方客服&#10;技术支持"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  用户的昵称包含这些关键词时会被识别为工作人员
                </p>
              </div>

              <div>
                <Label>特殊标识</Label>
                <Input
                  value={(config.staff?.specialPatterns || []).join(',')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      specialPatterns: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  })}
                  placeholder="客服,专员,支持,管理员"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  多个标识用逗号分隔（如：客服,专员,支持）
                </p>
              </div>

              <div>
                <Label>直接指定用户ID</Label>
                <Textarea
                  value={(config.staff?.userIds || []).join('\n')}
                  onChange={(e) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      userIds: e.target.value.split('\n').filter(Boolean)
                    }
                  })}
                  placeholder="每行一个用户ID，如：&#10;user123&#10;user456"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  直接指定哪些用户ID是工作人员（最准确的识别方式）
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="enableStaffDetection">启用工作人员检测</Label>
                  <p className="text-xs text-muted-foreground">
                    启用后会自动检测工作人员是否已处理风险消息
                  </p>
                </div>
                <Switch
                  id="enableStaffDetection"
                  checked={config.staff?.enabled ?? true}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    staff: {
                      ...config.staff,
                      enabled: checked
                    }
                  })}
                />
              </div>

              {/* 保存提示 */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>配置保存提示</AlertTitle>
                <AlertDescription>
                  修改配置后，请点击页面顶部的{" "}
                  <span className="font-semibold">"保存配置"</span>{" "}
                  按钮以保存工作人员识别设置。
                </AlertDescription>
              </Alert>

              {/* 测试按钮 */}
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleTestStaffIdentifier()}
                  className="w-full"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  测试工作人员识别规则
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
