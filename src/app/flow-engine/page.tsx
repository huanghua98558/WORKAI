'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VersionManagement from '@/components/flow-engine/version-management';
import TestPanel from '@/components/flow-engine/test-panel';
import ExecutionMonitor from '@/components/flow-engine/execution-monitor';
import { Plus } from 'lucide-react';

export default function FlowEnginePage() {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'manual',
  });

  const handleCreateFlow = async () => {
    if (!formData.name.trim()) {
      alert('请输入流程名称');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/flow-engine/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          trigger_type: formData.triggerType,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsCreateDialogOpen(false);
        // 跳转到编辑器页面
        router.push(`/flows/editor?flowId=${result.data.id}`);
      } else {
        alert(result.error || '创建流程失败');
      }
    } catch (error) {
      console.error('Failed to create flow:', error);
      alert('创建流程失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">流程引擎管理</h1>
          <p className="text-muted-foreground mt-2">
            管理流程版本、测试流程执行、监控流程运行状态
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="mr-2 h-5 w-5" />
              新建流程（可视化编辑）
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl">创建新流程</DialogTitle>
              <DialogDescription>
                创建一个新的业务流程，配置触发条件和节点流程
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="flow-name">
                  流程名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="flow-name"
                  placeholder="例如：客户满意度调查流程"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={creating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flow-description">流程描述</Label>
                <Textarea
                  id="flow-description"
                  placeholder="描述这个流程的用途和功能..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={creating}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trigger-type">触发类型</Label>
                <Select
                  value={formData.triggerType}
                  onValueChange={(value) => setFormData({ ...formData, triggerType: value })}
                  disabled={creating}
                >
                  <SelectTrigger id="trigger-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">手动触发</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="schedule">定时任务</SelectItem>
                    <SelectItem value="event">事件触发</SelectItem>
                    <SelectItem value="message">消息触发</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={creating}
                >
                  取消
                </Button>
                <Button className="flex-1" onClick={handleCreateFlow} disabled={creating}>
                  {creating ? '创建中...' : '创建流程'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="monitor" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monitor">执行监控</TabsTrigger>
          <TabsTrigger value="test">测试面板</TabsTrigger>
          <TabsTrigger value="version">版本管理</TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="mt-6">
          <ExecutionMonitor />
        </TabsContent>

        <TabsContent value="test" className="mt-6">
          <TestPanel />
        </TabsContent>

        <TabsContent value="version" className="mt-6">
          <VersionManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
