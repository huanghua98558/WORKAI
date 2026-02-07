'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface NodeData {
  id: string;
  type: string;
  name: string;
  description: string;
  config: any;
}

interface NodeConfigPanelProps {
  flowId: string | null;
  nodeId: string | null;
}

export default function NodeConfigPanel({ flowId, nodeId }: NodeConfigPanelProps) {
  const [nodeData, setNodeData] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (flowId && nodeId) {
      loadNodeData();
    }
  }, [flowId, nodeId]);

  const loadNodeData = async () => {
    if (!flowId || !nodeId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/flow-engine/definitions/${flowId}`);
      const result = await response.json();
      if (result.success) {
        const flow = result.data;
        const node = flow.nodes.find((n: any) => n.id === nodeId);
        if (node) {
          setNodeData({
            id: node.id,
            type: node.type,
            name: node.name,
            description: node.description || '',
            config: node.config || {},
          });
        }
      }
    } catch (error) {
      console.error('Failed to load node data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nodeData || !flowId) return;

    setSaving(true);
    try {
      // 先获取完整的流程数据
      const flowResponse = await fetch(`/api/flow-engine/definitions/${flowId}`);
      const flowResult = await flowResponse.json();

      if (flowResult.success) {
        const flow = flowResult.data;
        // 更新节点数据
        const updatedNodes = flow.nodes.map((node: any) =>
          node.id === nodeId
            ? {
                ...node,
                name: nodeData.name,
                description: nodeData.description,
                config: nodeData.config,
              }
            : node
        );

        // 保存流程
        const saveResponse = await fetch(`/api/flow-engine/definitions/${flowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...flow,
            nodes: updatedNodes,
          }),
        });

        const saveResult = await saveResponse.json();
        if (saveResult.success) {
          alert('节点配置已保存');
        } else {
          alert(saveResult.error || '保存失败');
        }
      }
    } catch (error) {
      console.error('Failed to save node:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!nodeData) {
    return <div className="text-center py-8 text-muted-foreground">加载中...</div>;
  }

  const getNodeIcon = (type: string) => {
    const icons: Record<string, string> = {
      http: '🌐',
      ai: '🤖',
      condition: '⚡',
      delay: '⏰',
      email: '📧',
      sms: '📱',
      webhook: '🔗',
      default: '⬜',
    };
    return icons[type] || icons.default;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getNodeIcon(nodeData.type)}</span>
            <div>
              <CardTitle className="text-lg">节点配置</CardTitle>
              <CardDescription className="text-xs">配置节点属性和参数</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="node-type">节点类型</Label>
            <Select value={nodeData.type} disabled>
              <SelectTrigger id="node-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="http">🌐 HTTP 请求</SelectItem>
                <SelectItem value="ai">🤖 AI 对话</SelectItem>
                <SelectItem value="condition">⚡ 条件判断</SelectItem>
                <SelectItem value="delay">⏰ 延迟</SelectItem>
                <SelectItem value="email">📧 发送邮件</SelectItem>
                <SelectItem value="sms">📱 发送短信</SelectItem>
                <SelectItem value="webhook">🔗 Webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-name">
              节点名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="node-name"
              value={nodeData.name}
              onChange={(e) => setNodeData({ ...nodeData, name: e.target.value })}
              placeholder="输入节点名称"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-description">节点描述</Label>
            <Textarea
              id="node-description"
              value={nodeData.description}
              onChange={(e) => setNodeData({ ...nodeData, description: e.target.value })}
              placeholder="描述这个节点的功能"
              rows={3}
            />
          </div>

          {nodeData.type === 'http' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="http-url">请求 URL</Label>
                <Input
                  id="http-url"
                  value={nodeData.config.url || ''}
                  onChange={(e) =>
                    setNodeData({
                      ...nodeData,
                      config: { ...nodeData.config, url: e.target.value },
                    })
                  }
                  placeholder="https://api.example.com/endpoint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="http-method">请求方法</Label>
                <Select
                  value={nodeData.config.method || 'GET'}
                  onValueChange={(value) =>
                    setNodeData({
                      ...nodeData,
                      config: { ...nodeData.config, method: value },
                    })
                  }
                >
                  <SelectTrigger id="http-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {nodeData.type === 'delay' && (
            <div className="space-y-2">
              <Label htmlFor="delay-ms">延迟时间（毫秒）</Label>
              <Input
                id="delay-ms"
                type="number"
                value={nodeData.config.delay || ''}
                onChange={(e) =>
                  setNodeData({
                    ...nodeData,
                    config: { ...nodeData.config, delay: parseInt(e.target.value) },
                  })
                }
                placeholder="1000"
              />
            </div>
          )}

          {nodeData.type === 'ai' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ai-prompt">AI 提示词</Label>
                <Textarea
                  id="ai-prompt"
                  value={nodeData.config.prompt || ''}
                  onChange={(e) =>
                    setNodeData({
                      ...nodeData,
                      config: { ...nodeData.config, prompt: e.target.value },
                    })
                  }
                  placeholder="输入 AI 提示词"
                  rows={4}
                />
              </div>
            </>
          )}

          <Button onClick={handleSave} className="w-full" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
