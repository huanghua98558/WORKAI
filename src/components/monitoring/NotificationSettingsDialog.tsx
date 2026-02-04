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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Volume2,
  Monitor,
  MessageSquare,
  Bot,
  Plus,
  Trash2,
  TestTube,
  Save,
  X,
  Check,
  Settings as SettingsIcon
} from 'lucide-react';

interface NotificationMethod {
  id: string;
  alertRuleId: string;
  methodType: 'sound' | 'desktop' | 'wechat' | 'robot';
  isEnabled: boolean;
  recipientConfig: Record<string, any>;
  messageTemplate?: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface NotificationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertRuleId: string;
  alertRuleName?: string;
}

export function NotificationSettingsDialog({
  open,
  onOpenChange,
  alertRuleId,
  alertRuleName
}: NotificationSettingsDialogProps) {
  const [methods, setMethods] = useState<NotificationMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sound');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [robots, setRobots] = useState<Array<{ id: string; robotId: string; robotName: string; isActive: boolean }>>([]);

  // 加载机器人列表
  const loadRobots = async () => {
    try {
      const response = await fetch('/api/robots', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.code === 0) {
        setRobots(data.data || []);
      }
    } catch (error) {
      console.error('加载机器人列表失败:', error);
    }
  };

  // 加载通知方式
  const loadMethods = async () => {
    if (!alertRuleId) {
      console.error('[NotificationSettingsDialog] alertRuleId 为空，无法加载通知方式');
      setTestResult({
        success: false,
        message: '告警规则 ID 为空'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications/methods?alertRuleId=${alertRuleId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('[NotificationSettingsDialog] 加载通知方式响应:', data);

      if (data.code === 0) {
        setMethods(data.data || []);
      } else {
        console.error('[NotificationSettingsDialog] 加载通知方式失败:', data);
      }
    } catch (error) {
      console.error('[NotificationSettingsDialog] 加载通知方式失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && alertRuleId) {
      loadMethods();
    }
  }, [open, alertRuleId]);

  useEffect(() => {
    if (open) {
      loadRobots();
    }
  }, [open]);

  // 添加通知方式
  const addMethod = async (methodType: 'sound' | 'desktop' | 'wechat' | 'robot') => {
    console.log('[NotificationSettingsDialog] 添加通知方式:', { methodType, alertRuleId });

    if (!alertRuleId) {
      console.error('[NotificationSettingsDialog] alertRuleId 为空，无法添加通知方式');
      setTestResult({
        success: false,
        message: '告警规则 ID 为空，无法添加通知方式'
      });
      return;
    }

    try {
      const response = await fetch('/api/notifications/methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertRuleId,
          methodType,
          isEnabled: true,
          priority: 10,
          recipientConfig: getDefaultConfig(methodType),
        }),
      });

      const data = await response.json();
      console.log('[NotificationSettingsDialog] 添加通知方式响应:', data);

      if (data.code === 0) {
        setMethods([...methods, data.data]);
        setTestResult({
          success: true,
          message: '添加成功'
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || '添加失败'
        });
      }
    } catch (error) {
      console.error('添加通知方式失败:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '添加失败'
      });
    }
  };

  // 获取默认配置
  const getDefaultConfig = (methodType: string): Record<string, any> => {
    const configs: Record<string, any> = {
      sound: {
        enabled: true,
        volume: 0.8,
        levelFilters: {
          info: { enabled: false, sound: false },
          warning: { enabled: true, sound: true },
          critical: { enabled: true, sound: true },
        },
      },
      desktop: {
        enabled: true,
        requireInteraction: false,
      },
      wechat: {
        webhookUrl: '',
        mentionAll: false,
        mentionedList: [],
      },
      robot: {
        robotId: '',
        mode: 'private',
        userName: '',
        groupName: '',
      },
    };
    return configs[methodType] || {};
  };

  // 更新通知方式
  const updateMethod = async (methodId: string, updates: Partial<NotificationMethod>) => {
    try {
      const response = await fetch(`/api/notifications/methods/${methodId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.code === 0) {
        setMethods(methods.map(m => m.id === methodId ? { ...m, ...updates } : m));
      }
    } catch (error) {
      console.error('更新通知方式失败:', error);
    }
  };

  // 删除通知方式
  const deleteMethod = async (methodId: string) => {
    if (!confirm('确定要删除这个通知方式吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/notifications/methods/${methodId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.code === 0) {
        setMethods(methods.filter(m => m.id !== methodId));
        setTestResult({
          success: true,
          message: '删除成功'
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || '删除失败'
        });
      }
    } catch (error) {
      console.error('删除通知方式失败:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '删除失败'
      });
    }
  };

  // 切换启用状态
  const toggleMethod = async (methodId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/notifications/methods/${methodId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();
      if (data.code === 0) {
        setMethods(methods.map(m => m.id === methodId ? { ...m, isEnabled: enabled } : m));
      }
    } catch (error) {
      console.error('切换通知方式状态失败:', error);
    }
  };

  // 测试通知
  const testNotification = async (methodType: string) => {
    setTestResult(null);
    try {
      const method = methods.find(m => m.methodType === methodType);
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          methodType,
          config: method?.recipientConfig || getDefaultConfig(methodType),
        }),
      });

      const data = await response.json();
      setTestResult({
        success: data.data?.success || false,
        message: data.data?.error || data.data?.message || '测试完成',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '测试失败',
      });
    }
  };

  // 获取方法图标
  const getMethodIcon = (methodType: string) => {
    const icons: Record<string, any> = {
      sound: Volume2,
      desktop: Monitor,
      wechat: MessageSquare,
      robot: Bot,
    };
    return icons[methodType] || Bell;
  };

  // 获取方法名称
  const getMethodName = (methodType: string) => {
    const names: Record<string, string> = {
      sound: '声音通知',
      desktop: '桌面弹窗',
      wechat: '企业微信',
      robot: '机器人私聊',
    };
    return names[methodType] || methodType;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            通知渠道配置
          </DialogTitle>
          <DialogDescription>
            {alertRuleName && `告警规则: ${alertRuleName}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sound" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              声音
            </TabsTrigger>
            <TabsTrigger value="desktop" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              桌面弹窗
            </TabsTrigger>
            <TabsTrigger value="wechat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              企业微信
            </TabsTrigger>
            <TabsTrigger value="robot" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              机器人
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sound" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>声音通知设置</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testNotification('sound')}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      测试
                    </Button>
                    {(() => {
                      const method = methods.find(m => m.methodType === 'sound');
                      return method ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMethod(method.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除
                        </Button>
                      ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!alertRuleId}
                        onClick={(e) => {
                          console.log('[NotificationSettingsDialog] 添加按钮被点击:', { methodType: 'sound', alertRuleId });
                          e.preventDefault();
                          e.stopPropagation();
                          addMethod('sound');
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {alertRuleId ? '添加' : '规则ID为空'}
                      </Button>
                    )}
                    )()}
                  </div>
                </CardTitle>
                <CardDescription>配置告警声音提示</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {methods.filter(m => m.methodType === 'sound').map(method => (
                  <div key={method.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sound-enabled">启用声音通知</Label>
                      <Switch
                        id="sound-enabled"
                        checked={method.isEnabled}
                        onCheckedChange={(checked) => toggleMethod(method.id, checked)}
                      />
                    </div>

                    {method.isEnabled && method.recipientConfig.volume !== undefined && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>音量</Label>
                          <span className="text-sm text-gray-500">
                            {Math.round(method.recipientConfig.volume * 100)}%
                          </span>
                        </div>
                        <Slider
                          value={[method.recipientConfig.volume * 100]}
                          onValueChange={([value]) =>
                            updateMethod(method.id, {
                              recipientConfig: {
                                ...method.recipientConfig,
                                volume: value / 100,
                              },
                            })
                          }
                          max={100}
                          step={5}
                        />
                      </div>
                    )}

                    {method.isEnabled && method.recipientConfig.levelFilters && (
                      <div className="space-y-3 pt-2 border-t">
                        <Label>级别设置</Label>
                        {Object.entries(method.recipientConfig.levelFilters).map(([level, config]: [string, any]) => (
                          <div key={level} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{level}</Badge>
                              <span className="text-sm text-gray-500">启用通知</span>
                            </div>
                            <Switch
                              checked={config.enabled}
                              onCheckedChange={(checked) =>
                                updateMethod(method.id, {
                                  recipientConfig: {
                                    ...method.recipientConfig,
                                    levelFilters: {
                                      ...method.recipientConfig.levelFilters,
                                      [level]: { ...config, enabled: checked },
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {methods.filter(m => m.methodType === 'sound').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Volume2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>尚未配置声音通知</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="desktop" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>桌面弹窗设置</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testNotification('desktop')}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      测试
                    </Button>
                    {(() => {
                      const method = methods.find(m => m.methodType === 'desktop');
                      return method ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMethod(method.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除
                        </Button>
                      ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!alertRuleId}
                        onClick={(e) => {
                          console.log('[NotificationSettingsDialog] 添加按钮被点击:', { methodType: 'desktop', alertRuleId });
                          e.preventDefault();
                          e.stopPropagation();
                          addMethod('desktop');
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {alertRuleId ? '添加' : '规则ID为空'}
                      </Button>
                    )}
                    )()}
                  </div>
                </CardTitle>
                <CardDescription>配置浏览器桌面通知</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {methods.filter(m => m.methodType === 'desktop').map(method => (
                  <div key={method.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="desktop-enabled">启用桌面弹窗</Label>
                      <Switch
                        id="desktop-enabled"
                        checked={method.isEnabled}
                        onCheckedChange={(checked) => toggleMethod(method.id, checked)}
                      />
                    </div>

                    {method.isEnabled && (
                      <>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="desktop-interaction">需要用户交互才能关闭</Label>
                          <Switch
                            id="desktop-interaction"
                            checked={method.recipientConfig.requireInteraction || false}
                            onCheckedChange={(checked) =>
                              updateMethod(method.id, {
                                recipientConfig: {
                                  ...method.recipientConfig,
                                  requireInteraction: checked,
                                },
                              })
                            }
                          />
                        </div>

                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            💡 提示：桌面弹窗需要浏览器授权。首次使用时，系统会请求通知权限。
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {methods.filter(m => m.methodType === 'desktop').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Monitor className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>尚未配置桌面弹窗</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wechat" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>企业微信通知设置</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testNotification('wechat')}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      测试
                    </Button>
                    {(() => {
                      const method = methods.find(m => m.methodType === 'wechat');
                      return method ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMethod(method.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除
                        </Button>
                      ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!alertRuleId}
                        onClick={(e) => {
                          console.log('[NotificationSettingsDialog] 添加按钮被点击:', { methodType: 'wechat', alertRuleId });
                          e.preventDefault();
                          e.stopPropagation();
                          addMethod('wechat');
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {alertRuleId ? '添加' : '规则ID为空'}
                      </Button>
                    )}
                    )()}
                  </div>
                </CardTitle>
                <CardDescription>配置企业微信群机器人通知</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {methods.filter(m => m.methodType === 'wechat').map(method => (
                  <div key={method.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="wechat-enabled">启用企业微信通知</Label>
                      <Switch
                        id="wechat-enabled"
                        checked={method.isEnabled}
                        onCheckedChange={(checked) => toggleMethod(method.id, checked)}
                      />
                    </div>

                    {method.isEnabled && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="wechat-webhook">Webhook URL</Label>
                          <Input
                            id="wechat-webhook"
                            placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                            value={method.recipientConfig.webhookUrl || ''}
                            onChange={(e) =>
                              updateMethod(method.id, {
                                recipientConfig: {
                                  ...method.recipientConfig,
                                  webhookUrl: e.target.value,
                                },
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="wechat-mention-all">@所有人</Label>
                          <Switch
                            id="wechat-mention-all"
                            checked={method.recipientConfig.mentionAll || false}
                            onCheckedChange={(checked) =>
                              updateMethod(method.id, {
                                recipientConfig: {
                                  ...method.recipientConfig,
                                  mentionAll: checked,
                                },
                              })
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {methods.filter(m => m.methodType === 'wechat').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>尚未配置企业微信通知</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="robot" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>机器人私聊通知设置</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testNotification('robot')}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      测试
                    </Button>
                    {(() => {
                      const method = methods.find(m => m.methodType === 'robot');
                      return method ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMethod(method.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除
                        </Button>
                      ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!alertRuleId}
                        onClick={(e) => {
                          console.log('[NotificationSettingsDialog] 添加按钮被点击:', { methodType: 'robot', alertRuleId });
                          e.preventDefault();
                          e.stopPropagation();
                          addMethod('robot');
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {alertRuleId ? '添加' : '规则ID为空'}
                      </Button>
                    )}
                    )()}
                  </div>
                </CardTitle>
                <CardDescription>配置机器人私聊通知</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {methods.filter(m => m.methodType === 'robot').map(method => (
                  <div key={method.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="robot-enabled">启用机器人私聊通知</Label>
                      <Switch
                        id="robot-enabled"
                        checked={method.isEnabled}
                        onCheckedChange={(checked) => toggleMethod(method.id, checked)}
                      />
                    </div>

                    {method.isEnabled && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="robot-select">选择机器人</Label>
                          <Select
                            value={method.recipientConfig.robotId || ''}
                            onValueChange={(value) =>
                              updateMethod(method.id, {
                                recipientConfig: {
                                  ...method.recipientConfig,
                                  robotId: value,
                                },
                              })
                            }
                          >
                            <SelectTrigger id="robot-select">
                              <SelectValue placeholder="选择一个机器人" />
                            </SelectTrigger>
                            <SelectContent>
                              {robots.length === 0 ? (
                                <div className="p-2 text-sm text-gray-500">
                                  暂无可用机器人
                                </div>
                              ) : (
                                robots.map((robot) => (
                                  <SelectItem key={robot.id} value={robot.robotId}>
                                    {robot.name} ({robot.robotId})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="notification-mode">通知模式</Label>
                          <Select
                            value={method.recipientConfig.mode || 'private'}
                            onValueChange={(value) =>
                              updateMethod(method.id, {
                                recipientConfig: {
                                  ...method.recipientConfig,
                                  mode: value,
                                },
                              })
                            }
                          >
                            <SelectTrigger id="notification-mode">
                              <SelectValue placeholder="选择通知模式" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="private">私聊通知</SelectItem>
                              <SelectItem value="group">群聊通知</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {method.recipientConfig.mode === 'private' && (
                          <div className="space-y-2">
                            <Label htmlFor="robot-user-name">接收人昵称</Label>
                            <Input
                              id="robot-user-name"
                              placeholder="输入接收人的微信昵称"
                              value={method.recipientConfig.userName || ''}
                              onChange={(e) =>
                                updateMethod(method.id, {
                                  recipientConfig: {
                                    ...method.recipientConfig,
                                    userName: e.target.value,
                                  },
                                })
                              }
                            />
                            <p className="text-xs text-gray-500">
                              请填写对方在微信中的昵称（如：张三）
                            </p>
                          </div>
                        )}

                        {method.recipientConfig.mode === 'group' && (
                          <div className="space-y-2">
                            <Label htmlFor="robot-group-name">群聊名称</Label>
                            <Input
                              id="robot-group-name"
                              placeholder="输入接收通知的群聊名称"
                              value={method.recipientConfig.groupName || ''}
                              onChange={(e) =>
                                updateMethod(method.id, {
                                  recipientConfig: {
                                    ...method.recipientConfig,
                                    groupName: e.target.value,
                                  },
                                })
                              }
                            />
                            <p className="text-xs text-gray-500">
                              请填写群聊的完整名称（如：工作群）
                            </p>
                          </div>
                        )}

                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            💡 提示：
                            {method.recipientConfig.mode === 'group'
                              ? '机器人将向指定名称的群聊发送消息通知。请确保群聊名称与微信中完全一致。'
                              : '机器人将向指定昵称的用户发送私聊消息通知。请确保用户昵称与微信中完全一致。'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {methods.filter(m => m.methodType === 'robot').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>尚未配置机器人私聊通知</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {testResult && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
            testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {testResult.success ? (
              <Check className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
