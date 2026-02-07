'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, History, CheckCircle } from 'lucide-react';

interface FlowVersion {
  id: string;
  name: string;
  version: string;
  is_active: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

interface VersionPanelProps {
  flowId: string | null;
}

export default function VersionPanel({ flowId }: VersionPanelProps) {
  const [versions, setVersions] = useState<FlowVersion[]>([]);
  const [flowName, setFlowName] = useState<string>('');

  useEffect(() => {
    if (flowId) {
      loadVersions();
    }
  }, [flowId]);

  const loadVersions = async () => {
    if (!flowId) return;

    try {
      // 获取流程信息
      const flowResponse = await fetch(`/api/flow-engine/definitions/${flowId}`);
      const flowResult = await flowResponse.json();
      if (flowResult.success) {
        setFlowName(flowResult.data.name);

        // 获取版本列表
        const versionResponse = await fetch(`/api/flow-engine/versions?flowName=${flowResult.data.name}`);
        const versionResult = await versionResponse.json();
        if (versionResult.success) {
          setVersions(versionResult.data);
        }
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  const handleCreateVersion = async () => {
    if (!flowName) return;

    try {
      const response = await fetch('/api/flow-engine/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowName }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`成功创建版本 ${result.data.version}`);
        loadVersions();
      } else {
        alert(result.error || '创建版本失败');
      }
    } catch (error) {
      console.error('Failed to create version:', error);
      alert('创建版本失败');
    }
  };

  const handleActivate = async (versionId: string) => {
    try {
      const response = await fetch(`/api/flow-engine/versions/${versionId}/activate`, {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        alert('版本已激活');
        loadVersions();
      } else {
        alert(result.error || '激活失败');
      }
    } catch (error) {
      console.error('Failed to activate version:', error);
      alert('激活失败');
    }
  };

  const handleRollback = async (versionId: string, versionNumber: string) => {
    if (!confirm(`确定要回滚到 v${versionNumber} 吗？`)) return;

    try {
      const response = await fetch(`/api/flow-engine/versions/${versionId}/rollback`, {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message || '回滚成功');
        loadVersions();
      } else {
        alert(result.error || '回滚失败');
      }
    } catch (error) {
      console.error('Failed to rollback version:', error);
      alert('回滚失败');
    }
  };

  if (!flowId) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        选择一个流程以查看版本历史
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full" size="sm">
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
          <Button onClick={handleCreateVersion} className="w-full">
            确认创建
          </Button>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            暂无版本历史
          </div>
        ) : (
          versions.map((version) => (
            <Card key={version.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
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
                      <span className="font-medium text-sm">v{version.version}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {new Date(version.created_at).toLocaleString('zh-CN')}
                  </p>

                  {!version.is_active && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleActivate(version.id)}
                      >
                        激活
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRollback(version.id, version.version)}
                      >
                        回滚
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
