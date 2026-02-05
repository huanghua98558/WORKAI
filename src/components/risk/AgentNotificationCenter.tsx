/**
 * 客服工作台通知中心
 * 集中显示和管理风险消息通知
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bell, Filter, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import RiskNotificationCard, { RiskNotificationData } from './RiskNotificationCard';
import { toast } from 'sonner';

export default function AgentNotificationCenter() {
  const [notifications, setNotifications] = useState<RiskNotificationData[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 加载通知列表
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/risk/active?limit=20');
      if (response.ok) {
        const data = await response.json();
        // 转换数据格式
        const formattedNotifications = data.data.map((item: any) => ({
          riskId: item.id,
          sessionId: item.sessionId,
          userId: item.userId || '',
          userName: item.userName || '未知用户',
          groupName: item.groupName || '未知群聊',
          message: item.content,
          aiReply: item.aiReply || '无',
          priority: 'medium', // 从配置中读取
          timestamp: item.createdAt,
          status: item.status,
        }));
        setNotifications(formattedNotifications);
        setUnreadCount(formattedNotifications.length);
      }
    } catch (error) {
      console.error('加载通知失败:', error);
      toast.error('加载通知失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadNotifications();
    // 每30秒自动刷新
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // 过滤通知
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === 'all') return true;
    return notification.priority === activeTab;
  });

  // 介入处理
  const handleIntervene = (riskId: string, sessionId: string) => {
    // 跳转到会话详情页面
    window.location.href = `/sessions/${sessionId}`;
  };

  // 忽略
  const handleIgnore = async (riskId: string) => {
    try {
      const response = await fetch(`/api/risk/${riskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved', resolvedBy: 'ignored' }),
      });
      if (response.ok) {
        toast.success('已忽略');
        loadNotifications();
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 标记为已处理
  const handleResolve = async (riskId: string, resolvedBy: string) => {
    try {
      const response = await fetch(`/api/risk/${riskId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy }),
      });
      if (response.ok) {
        toast.success('已标记为已处理');
        loadNotifications();
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 查看详情
  const handleViewDetails = (riskId: string) => {
    // 打开详情对话框
    console.log('查看详情:', riskId);
    toast.info('详情功能开发中...');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="h-6 w-6 text-blue-600" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div>
              <CardTitle>风险消息通知中心</CardTitle>
              <CardDescription>
                {unreadCount > 0
                  ? `您有 ${unreadCount} 条待处理的风险消息`
                  : '暂无待处理的风险消息'}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadNotifications}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all">
                全部 ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="high">
                <AlertTriangle className="h-4 w-4 mr-1" />
                高优先级
              </TabsTrigger>
              <TabsTrigger value="medium">中优先级</TabsTrigger>
              <TabsTrigger value="low">低优先级</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-muted-foreground">
                  {activeTab === 'all' ? '暂无风险消息通知' : '暂无该优先级的消息'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <RiskNotificationCard
                    key={notification.riskId}
                    notification={notification}
                    onIntervene={handleIntervene}
                    onIgnore={handleIgnore}
                    onResolve={handleResolve}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
