'use client';

/**
 * 流程属性配置面板
 * 用于配置流程级别的属性，如版本、超时、重试配置等
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Clock,
  RotateCcw,
  Tag,
  Layers,
  CheckCircle,
  AlertTriangle,
  Plus,
  X,
  Save,
  Bell
} from 'lucide-react';

export interface FlowConfig {
  // 基本信息
  name: string;
  description: string;
  version: string;
  status: 'active' | 'inactive' | 'draft';

  // 执行配置
  timeout: number;
  maxExecutionTime: number;

  // 重试配置
  retryConfig: {
    enabled: boolean;
    maxRetries: number;
    retryInterval: number;
    backoffEnabled: boolean;
    backoffMultiplier: number;
  };

  // 标签和分类
  tags: string[];
  category: string;

  // 通知配置
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    onTimeout: boolean;
  };

  // 调试配置
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

interface FlowConfigPanelProps {
  config: FlowConfig;
  onChange: (config: FlowConfig) => void;
}

const defaultConfig: FlowConfig = {
  name: '',
  description: '',
  version: '1.0.0',
  status: 'draft',
  timeout: 30000,
  maxExecutionTime: 60000,
  retryConfig: {
    enabled: false,
    maxRetries: 3,
    retryInterval: 1000,
    backoffEnabled: true,
    backoffMultiplier: 2,
  },
  tags: [],
  category: '',
  notifications: {
    onSuccess: false,
    onFailure: true,
    onTimeout: true,
  },
  debugMode: false,
  logLevel: 'info',
};

export { defaultConfig };

export default function FlowConfigPanel({ config, onChange }: FlowConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState<FlowConfig>(config);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = <K extends keyof FlowConfig>(key: K, value: FlowConfig[K]) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  const handleRetryConfigChange = <K extends keyof FlowConfig['retryConfig']>(
    key: K,
    value: FlowConfig['retryConfig'][K]
  ) => {
    const newConfig = {
      ...localConfig,
      retryConfig: { ...localConfig.retryConfig, [key]: value }
    };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  const handleNotificationChange = <K extends keyof FlowConfig['notifications']>(
    key: K,
    value: FlowConfig['notifications'][K]
  ) => {
    const newConfig = {
      ...localConfig,
      notifications: { ...localConfig.notifications, [key]: value }
    };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  const addTag = () => {
    if (newTag.trim() && !localConfig.tags.includes(newTag.trim())) {
      const newTags = [...localConfig.tags, newTag.trim()];
      handleChange('tags', newTags);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = localConfig.tags.filter(tag => tag !== tagToRemove);
    handleChange('tags', newTags);
  };

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Settings className="w-4 h-4 text-blue-500" />
          基本信息
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="flow-name" className="text-xs font-medium">流程名称</Label>
            <Input
              id="flow-name"
              value={localConfig.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="输入流程名称"
              className="mt-1.5 h-8"
            />
          </div>

          <div>
            <Label htmlFor="flow-description" className="text-xs font-medium">描述</Label>
            <Textarea
              id="flow-description"
              value={localConfig.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="描述流程的用途和功能"
              className="mt-1.5 min-h-[60px] text-sm"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="flow-version" className="text-xs font-medium">版本号</Label>
              <Input
                id="flow-version"
                value={localConfig.version}
                onChange={(e) => handleChange('version', e.target.value)}
                placeholder="1.0.0"
                className="mt-1.5 h-8"
              />
            </div>

            <div>
              <Label htmlFor="flow-status" className="text-xs font-medium">状态</Label>
              <Select
                value={localConfig.status}
                onValueChange={(value) => handleChange('status', value as any)}
              >
                <SelectTrigger id="flow-status" className="mt-1.5 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      草稿
                    </div>
                  </SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      运行中
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      已停用
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="flow-category" className="text-xs font-medium">分类</Label>
            <Select
              value={localConfig.category}
              onValueChange={(value) => handleChange('category', value)}
            >
              <SelectTrigger id="flow-category" className="mt-1.5 h-8">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="message">消息处理</SelectItem>
                <SelectItem value="robot">机器人控制</SelectItem>
                <SelectItem value="ai">AI 智能处理</SelectItem>
                <SelectItem value="alert">告警通知</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium">标签</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {localConfig.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="h-6 text-xs gap-1 px-2 py-0">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              ))}
              <div className="flex gap-1.5 flex-1 min-w-[120px]">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="添加标签..."
                  className="h-6 text-xs flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addTag}
                  className="h-6 px-2 text-xs"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* 执行配置 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Clock className="w-4 h-4 text-amber-500" />
          执行配置
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium">节点超时时间</Label>
              <span className="text-xs text-slate-500">{(localConfig.timeout / 1000).toFixed(1)}秒</span>
            </div>
            <Input
              type="number"
              value={localConfig.timeout}
              onChange={(e) => handleChange('timeout', Number(e.target.value))}
              className="h-8"
              min="1000"
              step="1000"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium">最大执行时间</Label>
              <span className="text-xs text-slate-500">{(localConfig.maxExecutionTime / 1000).toFixed(1)}秒</span>
            </div>
            <Input
              type="number"
              value={localConfig.maxExecutionTime}
              onChange={(e) => handleChange('maxExecutionTime', Number(e.target.value))}
              className="h-8"
              min="1000"
              step="1000"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* 重试配置 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <RotateCcw className="w-4 h-4 text-violet-500" />
            重试配置
          </div>
          <Switch
            checked={localConfig.retryConfig.enabled}
            onCheckedChange={(checked) => handleRetryConfigChange('enabled', checked)}
            className="scale-75"
          />
        </div>

        {localConfig.retryConfig.enabled && (
          <div className="space-y-3 pl-6 border-l-2 border-violet-100">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-medium">最大重试次数</Label>
                <span className="text-xs text-slate-500">{localConfig.retryConfig.maxRetries}次</span>
              </div>
              <Input
                type="number"
                value={localConfig.retryConfig.maxRetries}
                onChange={(e) => handleRetryConfigChange('maxRetries', Number(e.target.value))}
                className="h-8"
                min="1"
                max="10"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-medium">重试间隔</Label>
                <span className="text-xs text-slate-500">{(localConfig.retryConfig.retryInterval / 1000).toFixed(1)}秒</span>
              </div>
              <Input
                type="number"
                value={localConfig.retryConfig.retryInterval}
                onChange={(e) => handleRetryConfigChange('retryInterval', Number(e.target.value))}
                className="h-8"
                min="100"
                step="100"
              />
            </div>

            <div className="flex items-center justify-between py-1.5">
              <div>
                <Label className="text-xs font-medium">指数退避</Label>
                <p className="text-[10px] text-slate-500 mt-0.5">重试间隔随次数递增</p>
              </div>
              <Switch
                checked={localConfig.retryConfig.backoffEnabled}
                onCheckedChange={(checked) => handleRetryConfigChange('backoffEnabled', checked)}
                className="scale-75"
              />
            </div>

            {localConfig.retryConfig.backoffEnabled && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-medium">退避倍数</Label>
                  <span className="text-xs text-slate-500">×{localConfig.retryConfig.backoffMultiplier}</span>
                </div>
                <Input
                  type="number"
                  value={localConfig.retryConfig.backoffMultiplier}
                  onChange={(e) => handleRetryConfigChange('backoffMultiplier', Number(e.target.value))}
                  className="h-8"
                  min="1"
                  max="5"
                  step="0.5"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* 通知配置 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Bell className="w-4 h-4 text-rose-500" />
          通知配置
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between py-1">
            <Label className="text-xs font-medium">成功通知</Label>
            <Switch
              checked={localConfig.notifications.onSuccess}
              onCheckedChange={(checked) => handleNotificationChange('onSuccess', checked)}
              className="scale-75"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <Label className="text-xs font-medium">失败通知</Label>
            <Switch
              checked={localConfig.notifications.onFailure}
              onCheckedChange={(checked) => handleNotificationChange('onFailure', checked)}
              className="scale-75"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <Label className="text-xs font-medium">超时通知</Label>
            <Switch
              checked={localConfig.notifications.onTimeout}
              onCheckedChange={(checked) => handleNotificationChange('onTimeout', checked)}
              className="scale-75"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* 调试配置 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Layers className="w-4 h-4 text-emerald-500" />
          调试配置
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <div>
              <Label className="text-xs font-medium">调试模式</Label>
              <p className="text-[10px] text-slate-500 mt-0.5">启用详细日志输出</p>
            </div>
            <Switch
              checked={localConfig.debugMode}
              onCheckedChange={(checked) => handleChange('debugMode', checked)}
              className="scale-75"
            />
          </div>

          <div>
            <Label className="text-xs font-medium">日志级别</Label>
            <Select
              value={localConfig.logLevel}
              onValueChange={(value) => handleChange('logLevel', value as any)}
            >
              <SelectTrigger className="mt-1.5 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="error">Error (仅错误)</SelectItem>
                <SelectItem value="warn">Warning (警告)</SelectItem>
                <SelectItem value="info">Info (信息)</SelectItem>
                <SelectItem value="debug">Debug (调试)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 配置预览 */}
      <Card className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/30 border-blue-100">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 mb-1">配置摘要</p>
            <div className="space-y-0.5 text-[10px] text-slate-600">
              <div className="flex justify-between">
                <span>状态:</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0">
                  {localConfig.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>超时:</span>
                <span>{(localConfig.timeout / 1000).toFixed(0)}s</span>
              </div>
              {localConfig.retryConfig.enabled && (
                <div className="flex justify-between">
                  <span>重试:</span>
                  <span>{localConfig.retryConfig.maxRetries}次</span>
                </div>
              )}
              {localConfig.tags.length > 0 && (
                <div className="flex justify-between items-center gap-2">
                  <span>标签:</span>
                  <div className="flex gap-0.5 flex-wrap justify-end">
                    {localConfig.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {localConfig.tags.length > 2 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0">
                        +{localConfig.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
