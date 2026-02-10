'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, RotateCcw, CheckCircle, Clock, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FlowVersion {
  id: string;
  name: string;
  version: string;
  is_active: boolean;
  description: string;
  created_at: string;
  updated_at: string;
  priority: number;
}

interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export default function VersionManagement() {
  const { toast } = useToast();
  const [selectedFlow, setSelectedFlow] = useState('');
  const [versions, setVersions] = useState<FlowVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [flowsLoading, setFlowsLoading] = useState(false);

  // 从 API 获取流程列表
  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    setFlowsLoading(true);
    try {
      const response = await fetch('/api/flow-engine/definitions');
      const result = await response.json();
      if (result.success && result.data) {
        setFlows(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch flows:', error);
    } finally {
      setFlowsLoading(false);
    }
  };

  const fetchVersions = async (flowDefinitionId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/flow-engine/versions?flowDefinitionId=${flowDefinitionId}`);
      const result = await response.json();
      if (result.success) {
        setVersions(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlowChange = (flowDefinitionId: string) => {
    setSelectedFlow(flowDefinitionId);
    if (flowDefinitionId) {
      fetchVersions(flowDefinitionId);
    }
  };

  const handleCreateVersion = async () => {
    if (!selectedFlow) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '请先选择流程',
      });
      return;
    }

    try {
      const response = await fetch('/api/flow-engine/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flowDefinitionId: selectedFlow,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: '成功',
          description: `成功创建版本 ${result.data.version}`,
        });
        fetchVersions(selectedFlow);
      } else {
        toast({
          variant: 'destructive',
          title: '错误',
          description: result.error || '创建版本失败',
        });
      }
    } catch (error) {
      console.error('Create version failed:', error);
      toast({
        variant: 'destructive',
        title: '错误',
        description: '创建版本失败',
      });
    }
  };

  const handleActivate = async (versionId: string) => {
    try {
      const response = await fetch(`/api/flow-engine/versions/${versionId}/activate`, {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: '成功',
          description: '版本已激活',
        });
        fetchVersions(selectedFlow);
      } else {
        toast({
          variant: 'destructive',
          title: '错误',
          description: result.error || '激活失败',
        });
      }
    } catch (error) {
      console.error('Activate version failed:', error);
      toast({
        variant: 'destructive',
        title: '错误',
        description: '激活失败',
      });
    }
  };

  const handleRollback = async (versionId: string) => {
    try {
      const response = await fetch(`/api/flow-engine/versions/${versionId}/rollback`, {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: '成功',
          description: result.message || '回滚成功',
        });
        fetchVersions(selectedFlow);
      } else {
        toast({
          variant: 'destructive',
          title: '错误',
          description: result.error || '回滚失败',
        });
      }
    } catch (error) {
      console.error('Rollback failed:', error);
      toast({
        variant: 'destructive',
        title: '错误',
        description: '回滚失败',
      });
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* 流程选择 */}
      <Card>
        <CardHeader>
          <CardTitle>版本管理</CardTitle>
          <CardDescription>管理流程版本、创建新版本、回滚到历史版本</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flow-select">选择流程</Label>
            <Select value={selectedFlow} onValueChange={handleFlowChange}>
              <SelectTrigger id="flow-select" className="w-full">
                <SelectValue placeholder="选择要管理的流程" />
              </SelectTrigger>
              <SelectContent className="max-w-2xl">
                {flows.map((flow) => (
                  <SelectItem key={flow.id} value={flow.id} className="max-w-2xl">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium truncate">{flow.name}</span>
                      {flow.description && (
                        <span className="text-xs text-muted-foreground truncate">{flow.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFlow && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  创建新版本
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>创建新版本</DialogTitle>
                  <DialogDescription>
                    基于当前活跃版本创建新版本，所有节点和边将被复制。
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>流程名称</Label>
                    <Input value={flows.find(f => f.id === selectedFlow)?.name || selectedFlow} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>版本说明</Label>
                    <Input placeholder="输入版本变更说明（可选）" />
                  </div>
                  <Button onClick={handleCreateVersion} className="w-full">
                    确认创建
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* 版本列表 */}
      {selectedFlow && (
        <Card>
          <CardHeader>
            <CardTitle>版本历史</CardTitle>
            <CardDescription>{flows.find(f => f.id === selectedFlow)?.name || selectedFlow} 的所有版本</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无版本
                </div>
              ) : (
                versions.map((version, index) => (
                  <div
                    key={version.id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {version.is_active ? (
                          <Badge className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            当前版本
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <History className="h-3 w-3" />
                            历史版本
                          </Badge>
                        )}
                        <h3 className="font-semibold truncate">v{version.version}</h3>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatTime(version.created_at)}
                      </div>
                    </div>

                    {version.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{version.description}</p>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {!version.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(version.id)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          激活
                        </Button>
                      )}
                      {!version.is_active && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <RotateCcw className="mr-2 h-4 w-4" />
                              回滚
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认回滚</AlertDialogTitle>
                              <AlertDialogDescription>
                                回滚将创建一个新版本，内容基于 v{version.version}。
                                当前活跃版本将被标记为历史版本。
                                <br />
                                <br />
                                确定要回滚到 v{version.version} 吗？
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRollback(version.id)}>
                                确认回滚
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
