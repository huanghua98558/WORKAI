'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Brain,
  AlertTriangle,
  Shield,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Settings as SettingsIcon,
  Save,
  RefreshCw
} from 'lucide-react';

interface IntentConfig {
  id: string;
  intentType: string;
  intentName: string;
  intentDescription: string;
  systemPrompt: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IntentConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INTENT_DESCRIPTIONS = {
  chat: {
    name: '闲聊/问候',
    description: '日常问候、社交对话、情感表达、礼貌用语',
    icon: MessageSquare,
    color: 'bg-blue-500',
  },
  service: {
    name: '服务咨询',
    description: '产品/服务咨询、问题求助、业务咨询、售后问题',
    icon: Sparkles,
    color: 'bg-green-500',
  },
  help: {
    name: '帮助请求',
    description: '请求帮助、使用说明、功能介绍、操作指南',
    icon: HelpCircle,
    color: 'bg-purple-500',
  },
  risk: {
    name: '风险内容',
    description: '政治敏感、法律风险、负面言论、危机事件',
    icon: AlertTriangle,
    color: 'bg-red-500',
  },
  spam: {
    name: '垃圾信息',
    description: '广告推广、刷屏行为、无意义内容、推广信息',
    icon: Shield,
    color: 'bg-orange-500',
  },
  welcome: {
    name: '欢迎语',
    description: '新人入群、自我介绍、加入通知、欢迎他人',
    icon: Sparkles,
    color: 'bg-teal-500',
  },
  admin: {
    name: '管理指令',
    description: '系统配置、管理指令、数据操作、权限控制',
    icon: SettingsIcon,
    color: 'bg-gray-500',
  },
};

export function IntentConfigDialog({ open, onOpenChange }: IntentConfigDialogProps) {
  const [configs, setConfigs] = useState<Record<string, IntentConfig>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('risk');
  const [editedPrompt, setEditedPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // 加载意图配置
  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/intents', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.code === 0) {
        const configMap: Record<string, IntentConfig> = {};
        (data.data || []).forEach((config: IntentConfig) => {
          configMap[config.intentType] = config;
        });
        setConfigs(configMap);
      }
    } catch (error) {
      console.error('加载意图配置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadConfigs();
    }
  }, [open]);

  // 切换 Tab 时加载对应的 Prompt
  useEffect(() => {
    if (configs[activeTab]) {
      setEditedPrompt(configs[activeTab].systemPrompt);
    }
  }, [activeTab, configs]);

  // 保存配置
  const saveConfig = async () => {
    const config = configs[activeTab];
    if (!config) return;

    setIsSaving(true);
    setSaveResult(null);

    try {
      const response = await fetch(`/api/ai/intents/${config.intentType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intentType: config.intentType,
          intentName: config.intentName,
          intentDescription: config.intentDescription,
          systemPrompt: editedPrompt,
          isEnabled: true,
        }),
      });

      const data = await response.json();
      if (data.code === 0) {
        setSaveResult({
          success: true,
          message: '保存成功'
        });
        loadConfigs();
      } else {
        setSaveResult({
          success: false,
          message: data.message || '保存失败'
        });
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      setSaveResult({
        success: false,
        message: error instanceof Error ? error.message : '保存失败'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 重置为默认
  const resetToDefault = async () => {
    if (!confirm('确定要重置为默认提示词吗？当前修改将丢失。')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai/intents/${activeTab}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.code === 0) {
        setEditedPrompt(data.data.systemPrompt);
        setSaveResult({
          success: true,
          message: '已重置为默认提示词'
        });
        loadConfigs();
      }
    } catch (error) {
      console.error('重置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI 意图识别配置
          </DialogTitle>
          <DialogDescription>
            配置 AI 如何识别用户消息的意图类型
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-4 w-full h-auto flex-wrap">
              {(Object.keys(INTENT_DESCRIPTIONS) as Array<keyof typeof INTENT_DESCRIPTIONS>).map(
                (type) => {
                  const desc = INTENT_DESCRIPTIONS[type];
                  return (
                    <TabsTrigger
                      key={type}
                      value={type}
                      className="flex items-center gap-2"
                    >
                      <desc.icon className="h-4 w-4" />
                      {desc.name}
                    </TabsTrigger>
                  );
                }
              )}
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <div className="pr-4 space-y-4">
                {(Object.keys(INTENT_DESCRIPTIONS) as Array<keyof typeof INTENT_DESCRIPTIONS>).map(
                  (type) => {
                    const desc = INTENT_DESCRIPTIONS[type];
                    const config = configs[type];

                    if (type !== activeTab) return null;

                    return (
                      <div key={type} className="space-y-4">
                        <Card>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-lg ${desc.color}`}>
                                  <desc.icon className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <CardTitle className="flex items-center gap-2">
                                    {desc.name}
                                    {config?.isEnabled ? (
                                      <Badge variant="outline" className="text-xs">
                                        已启用
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">
                                        已禁用
                                      </Badge>
                                    )}
                                  </CardTitle>
                                  <CardDescription className="mt-1">
                                    {desc.description}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={resetToDefault}
                                  disabled={isLoading}
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  重置
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor={`prompt-${type}`}>
                                AI 识别提示词（System Prompt）
                              </Label>
                              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                                <p className="font-medium mb-1">💡 提示：</p>
                                <p>
                                  这是 AI 用于识别消息意图的系统提示词。
                                  您可以根据业务需求修改判断标准，提高识别准确率。
                                </p>
                              </div>
                              <Textarea
                                id={`prompt-${type}`}
                                value={editedPrompt}
                                onChange={(e) => setEditedPrompt(e.target.value)}
                                placeholder="输入 AI 识别提示词..."
                                rows={15}
                                className="font-mono text-sm"
                              />
                            </div>

                            {saveResult && (
                              <div
                                className={`p-3 rounded-lg flex items-center gap-2 ${
                                  saveResult.success
                                    ? 'bg-green-50 text-green-800'
                                    : 'bg-red-50 text-red-800'
                                }`}
                              >
                                {saveResult.success ? '✅' : '❌'}
                                <span className="text-sm">{saveResult.message}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>识别标准</CardTitle>
                            <CardDescription>
                              AI 根据以下标准判断消息是否属于该意图
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="prose prose-sm max-w-none">
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: config?.intentDescription?.replace(/\n/g, '<br/>') || '',
                                }}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  }
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button onClick={saveConfig} disabled={isSaving || isLoading}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? '保存中...' : '保存配置'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
