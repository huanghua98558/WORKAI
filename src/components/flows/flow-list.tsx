'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Flow {
  id: string;
  name: string;
  version: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FlowListProps {
  selectedFlowId: string | null;
  onSelectFlow: (flowId: string) => void;
}

export default function FlowList({ selectedFlowId, onSelectFlow }: FlowListProps) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 加载流程列表
  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    try {
      const response = await fetch('/api/flow-engine/definitions');
      const result = await response.json();
      if (result.success) {
        setFlows(result.data);
      }
    } catch (error) {
      console.error('Failed to load flows:', error);
    }
  };

  const handleCreateFlow = async () => {
    const flowName = prompt('请输入流程名称:');
    if (!flowName) return;

    try {
      const response = await fetch('/api/flow-engine/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: flowName,
          description: '',
          trigger_type: 'manual',
        }),
      });

      const result = await response.json();
      if (result.success) {
        loadFlows();
        onSelectFlow(result.data.id);
      }
    } catch (error) {
      console.error('Failed to create flow:', error);
      alert('创建流程失败');
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm('确定要删除这个流程吗？')) return;

    try {
      const response = await fetch(`/api/flow-engine/definitions/${flowId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        loadFlows();
        if (selectedFlowId === flowId) {
          onSelectFlow('');
        }
      }
    } catch (error) {
      console.error('Failed to delete flow:', error);
      alert('删除流程失败');
    }
  };

  const filteredFlows = flows.filter((flow) =>
    flow.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Input
          placeholder="搜索流程..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8"
        />
        <Button onClick={handleCreateFlow} className="w-full" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          新建流程
        </Button>
      </div>

      <div className="space-y-2">
        {filteredFlows.map((flow) => (
          <Card
            key={flow.id}
            className={`cursor-pointer transition-colors hover:bg-accent ${
              selectedFlowId === flow.id ? 'bg-accent border-primary' : ''
            }`}
            onClick={() => onSelectFlow(flow.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm truncate">{flow.name}</h3>
                    {flow.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        v{flow.version}
                      </Badge>
                    )}
                  </div>
                  {flow.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {flow.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(flow.updated_at).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDeleteFlow(flow.id)}>
                      删除流程
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
