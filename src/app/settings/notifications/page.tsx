'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/components/notifications/NotificationProvider';

export default function NotificationSettingsPage() {
  const { preferences, updatePreferences, testAlert, isConnected } = useNotifications();

  const handleToggle = (key: keyof typeof preferences, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  const handleVolumeChange = (value: number[]) => {
    updatePreferences({ soundVolume: value[0] / 100 });
  };

  const handleLevelToggle = (
    level: 'info' | 'warning' | 'critical',
    type: 'enabled' | 'sound',
    value: boolean
  ) => {
    updatePreferences({
      levelFilters: {
        ...preferences.levelFilters,
        [level]: {
          ...preferences.levelFilters[level],
          [type]: value
        }
      }
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">通知设置</h1>
        <p className="text-gray-600">配置告警通知偏好</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">通用设置</TabsTrigger>
          <TabsTrigger value="levels">告警级别</TabsTrigger>
          <TabsTrigger value="test">测试通知</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>网页通知</CardTitle>
              <CardDescription>配置网页端的告警通知方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">启用通知</div>
                  <div className="text-sm text-gray-500">接收告警通知</div>
                </div>
                <Switch
                  checked={preferences.webNotificationEnabled}
                  onCheckedChange={(checked) => handleToggle('webNotificationEnabled', checked)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Toast 通知</div>
                    <div className="text-sm text-gray-500">右上角轻量提示</div>
                  </div>
                  <Switch
                    checked={preferences.toastEnabled}
                    onCheckedChange={(checked) => handleToggle('toastEnabled', checked)}
                    disabled={!preferences.webNotificationEnabled}
                  />
                </div>

                {preferences.toastEnabled && (
                  <div className="flex items-center justify-between pl-4">
                    <div>
                      <div className="font-medium">自动关闭</div>
                      <div className="text-sm text-gray-500">
                        {preferences.toastAutoCloseDuration / 1000} 秒后自动关闭
                      </div>
                    </div>
                    <Switch
                      checked={preferences.toastAutoClose}
                      onCheckedChange={(checked) => handleToggle('toastAutoClose', checked)}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Modal 弹窗</div>
                  <div className="text-sm text-gray-500">紧急告警强制弹窗</div>
                </div>
                <Switch
                  checked={preferences.modalEnabled}
                  onCheckedChange={(checked) => handleToggle('modalEnabled', checked)}
                  disabled={!preferences.webNotificationEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">系统通知</div>
                  <div className="text-sm text-gray-500">浏览器原生通知（页面最小化时）</div>
                </div>
                <Switch
                  checked={preferences.systemNotificationEnabled}
                  onCheckedChange={(checked) => handleToggle('systemNotificationEnabled', checked)}
                  disabled={!preferences.webNotificationEnabled}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>声音通知</CardTitle>
              <CardDescription>配置告警声音提示</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">启用声音</div>
                  <div className="text-sm text-gray-500">播放告警提示音</div>
                </div>
                <Switch
                  checked={preferences.soundEnabled}
                  onCheckedChange={(checked) => handleToggle('soundEnabled', checked)}
                />
              </div>

              {preferences.soundEnabled && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">音量</div>
                      <div className="text-sm text-gray-500">
                        {Math.round(preferences.soundVolume * 100)}%
                      </div>
                    </div>
                    <Slider
                      value={[preferences.soundVolume * 100]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      step={5}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>连接状态</CardTitle>
              <CardDescription>WebSocket 实时连接状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">
                  {isConnected ? '已连接' : '未连接'}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="levels">
          <Card>
            <CardHeader>
              <CardTitle>告警级别过滤</CardTitle>
              <CardDescription>配置不同级别告警的通知方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Info 级别 */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">ℹ️</span>
                  <div className="font-medium">信息</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">接收通知</div>
                  <Switch
                    checked={preferences.levelFilters.info.enabled}
                    onCheckedChange={(checked) => handleLevelToggle('info', 'enabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">播放声音</div>
                  <Switch
                    checked={preferences.levelFilters.info.sound}
                    onCheckedChange={(checked) => handleLevelToggle('info', 'sound', checked)}
                    disabled={!preferences.levelFilters.info.enabled}
                  />
                </div>
              </div>

              {/* Warning 级别 */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  <div className="font-medium">警告</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">接收通知</div>
                  <Switch
                    checked={preferences.levelFilters.warning.enabled}
                    onCheckedChange={(checked) => handleLevelToggle('warning', 'enabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">播放声音</div>
                  <Switch
                    checked={preferences.levelFilters.warning.sound}
                    onCheckedChange={(checked) => handleLevelToggle('warning', 'sound', checked)}
                    disabled={!preferences.levelFilters.warning.enabled}
                  />
                </div>
              </div>

              {/* Critical 级别 */}
              <div className="space-y-4 p-4 border rounded-lg border-red-200 bg-red-50">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚨</span>
                  <div className="font-medium text-red-600">紧急</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">接收通知</div>
                  <Switch
                    checked={preferences.levelFilters.critical.enabled}
                    onCheckedChange={(checked) => handleLevelToggle('critical', 'enabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">播放声音</div>
                  <Switch
                    checked={preferences.levelFilters.critical.sound}
                    onCheckedChange={(checked) => handleLevelToggle('critical', 'sound', checked)}
                    disabled={!preferences.levelFilters.critical.enabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>测试通知</CardTitle>
              <CardDescription>测试不同级别的告警通知效果</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button
                  onClick={() => testAlert('info')}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <span className="text-2xl mr-2">ℹ️</span>
                  <span className="flex-1 text-left">测试 Info 通知</span>
                </Button>

                <Button
                  onClick={() => testAlert('warning')}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <span className="text-2xl mr-2">⚠️</span>
                  <span className="flex-1 text-left">测试 Warning 通知</span>
                </Button>

                <Button
                  onClick={() => testAlert('critical')}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <span className="text-2xl mr-2">🚨</span>
                  <span className="flex-1 text-left">测试 Critical 通知</span>
                </Button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">
                  注意：Critical 级别的通知会强制弹出 Modal 窗口
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
