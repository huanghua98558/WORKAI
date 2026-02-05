/**
 * 风险消息详情对话框
 * 显示风险消息的完整信息和处理日志
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  User,
  MessageSquare,
  Clock,
  CheckCircle2,
  Activity,
  FileText,
  X,
} from 'lucide-react';

interface RiskMessageDetailProps {
  riskId: string;
  open: boolean;
  onClose: () => void;
}

interface RiskDetail {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  groupName: string;
  content: string;
  aiReply: string;
  status: 'processing' | 'resolved' | 'escalated';
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  handledByStaff?: string[];
}

interface HandlingLog {
  id: string;
  riskId: string;
  action: string;
  actor: string;
  content: string;
  metadata: any;
  createdAt: string;
}

export default function RiskMessageDetailDialog({
  riskId,
  open,
  onClose,
}: RiskMessageDetailProps) {
  const [riskDetail, setRiskDetail] = useState<RiskDetail | null>(null);
  const [handlingLogs, setHandlingLogs] = useState<HandlingLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && riskId) {
      loadRiskDetail();
    }
  }, [open, riskId]);

  const loadRiskDetail = async () => {
    setLoading(true);
    try {
      // 加载风险消息详情
      const [detailRes, logsRes] = await Promise.all([
        fetch(`/api/risk/${riskId}`),
        fetch(`/api/risk/${riskId}/logs`),
      ]);

      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setRiskDetail(detailData);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setHandlingLogs(logsData.data || []);
      }
    } catch (error) {
      console.error('加载详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      processing: { label: '处理中', color: 'bg-yellow-100 text-yellow-800' },
      resolved: { label: '已解决', color: 'bg-green-100 text-green-800' },
      escalated: { label: '已升级', color: 'bg-red-100 text-red-800' },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.processing;
    return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>;
  };

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      ai_reply: 'AI回复',
      staff_reply: '工作人员回复',
      manual_intervention: '人工介入',
      auto_resolved: '自动解决',
      notification_sent: '发送通知',
      escalation: '升级处理',
    };
    return actionMap[action] || action;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <DialogTitle>风险消息详情</DialogTitle>
              {riskDetail && getStatusBadge(riskDetail.status)}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            {riskDetail && `风险ID: ${riskDetail.id} • 创建于 ${new Date(riskDetail.createdAt).toLocaleString('zh-CN')}`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : !riskDetail ? (
          <div className="text-center py-12 text-muted-foreground">
            加载失败或数据不存在
          </div>
        ) : (
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList>
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="logs">处理日志</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* 用户信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    用户信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">用户ID</p>
                    <p className="font-medium">{riskDetail.userId || '未知'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">用户名</p>
                    <p className="font-medium">{riskDetail.userName || '未知'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">群聊</p>
                    <p className="font-medium">{riskDetail.groupName || '未知'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">会话ID</p>
                    <p className="font-medium text-sm">{riskDetail.sessionId}</p>
                  </div>
                </CardContent>
              </Card>

              {/* 消息内容 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    消息内容
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">用户消息：</p>
                    <div className="bg-gray-50 p-3 rounded-lg border">
                      <p className="text-sm">{riskDetail.content}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">AI回复：</p>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-sm">{riskDetail.aiReply || '无回复'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 处理状态 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    处理状态
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">当前状态</span>
                    {getStatusBadge(riskDetail.status)}
                  </div>
                  {riskDetail.resolvedBy && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">解决者</span>
                      <span className="font-medium">
                        {riskDetail.resolvedBy === 'AI' ? 'AI自动解决' : riskDetail.resolvedBy}
                      </span>
                    </div>
                  )}
                  {riskDetail.resolvedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">解决时间</span>
                      <span className="font-medium">
                        {new Date(riskDetail.resolvedAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  )}
                  {riskDetail.handledByStaff && riskDetail.handledByStaff.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground block mb-2">
                        处理过的工作人员：
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {riskDetail.handledByStaff.map((staffId) => (
                          <Badge key={staffId} variant="outline">
                            {staffId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    处理日志
                    <Badge variant="outline" className="ml-2">
                      {handlingLogs.length} 条记录
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {handlingLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无处理日志
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {handlingLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border"
                        >
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleString('zh-CN')}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {getActionLabel(log.action)}
                              </Badge>
                              <span className="text-xs font-medium">{log.actor}</span>
                            </div>
                            {log.content && (
                              <p className="text-sm text-gray-700">{log.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
