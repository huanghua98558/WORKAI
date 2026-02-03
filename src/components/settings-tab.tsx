'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Bot, Save, RefreshCw, Database, Cpu, Network, Globe, Shield, Bell } from 'lucide-react';

interface SettingsTabProps {
  aiConfig: any;
  isLoadingAiConfig: boolean;
}

export default function SettingsTab({ aiConfig, isLoadingAiConfig }: SettingsTabProps) {
  const [config, setConfig] = useState(aiConfig || {});
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        alert('✅ 配置保存成功');
      } else {
        alert('❌ 保存失败');
      }
    } catch (error) {
      alert('❌ 保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingAiConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-gray-500" />
            系统设置
          </h3>
          <p className="text-muted-foreground mt-1">配置系统参数和 AI 服务</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? '保存中...' : '保存配置'}
        </Button>
      </div>

      {/* AI 服务配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            AI 服务配置
          </CardTitle>
          <CardDescription>配置 AI 模型和服务参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="model">AI 模型</Label>
            <Select
              value={config.model || 'gpt-4'}
              onValueChange={(value) => setConfig({ ...config, model: value })}
            >
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="claude-3">Claude 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={config.apiKey || ''}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="请输入 API Key"
            />
          </div>

          <div>
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature || 0.7}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              控制输出的随机性，值越高输出越随机
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableAI">启用 AI 服务</Label>
              <p className="text-xs text-muted-foreground">
                开启后系统将使用 AI 进行智能回复
              </p>
            </div>
            <Switch
              id="enableAI"
              checked={config.enableAI !== false}
              onCheckedChange={(checked) => setConfig({ ...config, enableAI: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 系统参数 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-green-500" />
            系统参数
          </CardTitle>
          <CardDescription>配置系统运行参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="messageLimit">消息历史保留数量</Label>
            <Input
              id="messageLimit"
              type="number"
              min="10"
              max="1000"
              value={config.messageLimit || 50}
              onChange={(e) => setConfig({ ...config, messageLimit: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              每个会话保留的历史消息数量
            </p>
          </div>

          <div>
            <Label htmlFor="sessionTimeout">会话超时时间（分钟）</Label>
            <Input
              id="sessionTimeout"
              type="number"
              min="5"
              max="1440"
              value={config.sessionTimeout || 30}
              onChange={(e) => setConfig({ ...config, sessionTimeout: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              会话无活动多久后自动关闭
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableLog">启用日志记录</Label>
              <p className="text-xs text-muted-foreground">
                记录所有系统操作和错误信息
              </p>
            </div>
            <Switch
              id="enableLog"
              checked={config.enableLog !== false}
              onCheckedChange={(checked) => setConfig({ ...config, enableLog: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 通知设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-purple-500" />
            通知设置
          </CardTitle>
          <CardDescription>配置告警和通知参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableAlert">启用告警</Label>
              <p className="text-xs text-muted-foreground">
                在系统出现异常时发送告警通知
              </p>
            </div>
            <Switch
              id="enableAlert"
              checked={config.enableAlert !== false}
              onCheckedChange={(checked) => setConfig({ ...config, enableAlert: checked })}
            />
          </div>

          <div>
            <Label htmlFor="alertEmail">告警邮箱</Label>
            <Input
              id="alertEmail"
              type="email"
              value={config.alertEmail || ''}
              onChange={(e) => setConfig({ ...config, alertEmail: e.target.value })}
              placeholder="请输入接收告警的邮箱地址"
            />
          </div>
        </CardContent>
      </Card>

      {/* 系统信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-orange-500" />
            系统信息
          </CardTitle>
          <CardDescription>当前系统运行状态</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">系统版本</div>
              <div className="font-medium">v1.0.0</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">运行模式</div>
              <Badge variant="outline">生产模式</Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">数据库</div>
              <Badge variant="outline">PostgreSQL</Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">AI 服务</div>
              <Badge variant={config.enableAI ? 'default' : 'secondary'}>
                {config.enableAI ? '已启用' : '已禁用'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
