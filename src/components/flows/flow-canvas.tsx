'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Save } from 'lucide-react';

interface Node {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  config: any;
}

interface Edge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface FlowData {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
}

interface FlowCanvasProps {
  flowId: string;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

export default function FlowCanvas({ flowId, selectedNodeId, onSelectNode }: FlowCanvasProps) {
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (flowId) {
      loadFlowData();
    }
  }, [flowId]);

  const loadFlowData = async () => {
    try {
      const response = await fetch(`/api/flow-engine/definitions/${flowId}`);
      const result = await response.json();
      if (result.success) {
        setFlowData(result.data);
      }
    } catch (error) {
      console.error('Failed to load flow data:', error);
    }
  };

  const handleSave = async () => {
    if (!flowData) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/flow-engine/definitions/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flowData),
      });

      const result = await response.json();
      if (result.success) {
        alert('保存成功');
      } else {
        alert(result.error || '保存失败');
      }
    } catch (error) {
      console.error('Failed to save flow:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNode = () => {
    if (!flowData) return;

    const newId = `node_${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'http',
      name: '新节点',
      position: { x: 100 + flowData.nodes.length * 150, y: 100 },
      config: {},
    };

    setFlowData({
      ...flowData,
      nodes: [...flowData.nodes, newNode],
    });
  };

  const handleNodeClick = (nodeId: string) => {
    onSelectNode(nodeId);
  };

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

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      http: 'bg-blue-100 border-blue-300',
      ai: 'bg-purple-100 border-purple-300',
      condition: 'bg-yellow-100 border-yellow-300',
      delay: 'bg-gray-100 border-gray-300',
      email: 'bg-green-100 border-green-300',
      sms: 'bg-pink-100 border-pink-300',
      webhook: 'bg-orange-100 border-orange-300',
      default: 'bg-gray-50 border-gray-200',
    };
    return colors[type] || colors.default;
  };

  if (!flowData) {
    return <div className="flex-1 flex items-center justify-center">加载中...</div>;
  }

  return (
    <div className="flex-1 flex flex-col bg-muted/30">
      {/* 顶部信息栏 */}
      <div className="border-b bg-background p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">{flowData.name}</h2>
          <Badge variant="secondary">v{flowData.version || '1.0'}</Badge>
          <Badge>{flowData.nodes.length} 节点</Badge>
          <Badge variant="outline">{flowData.edges.length} 连线</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleAddNode}>
            <Plus className="mr-2 h-4 w-4" />
            添加节点
          </Button>
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 overflow-auto p-4">
        <div className="relative min-h-[600px] bg-background border rounded-lg p-4">
          {/* 简化的节点渲染 */}
          {flowData.nodes.map((node) => (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              className={`absolute cursor-pointer transition-all hover:scale-105 ${
                selectedNodeId === node.id ? 'ring-2 ring-primary' : ''
              }`}
              style={{
                left: `${node.position.x}px`,
                top: `${node.position.y}px`,
              }}
            >
              <Card
                className={`w-32 p-3 ${getNodeColor(node.type)} border-2 hover:shadow-md`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl">{getNodeIcon(node.type)}</span>
                  <div className="text-center">
                    <p className="text-xs font-medium truncate w-full">{node.name}</p>
                    <p className="text-xs text-muted-foreground">{node.type}</p>
                  </div>
                </div>
              </Card>
            </div>
          ))}

          {/* 简化的连线渲染 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {flowData.edges.map((edge) => {
              const fromNode = flowData.nodes.find((n) => n.id === edge.from);
              const toNode = flowData.nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const fromX = fromNode.position.x + 64; // 节点宽度的一半
              const fromY = fromNode.position.y + 40;
              const toX = toNode.position.x + 64;
              const toY = toNode.position.y;

              return (
                <g key={edge.id}>
                  <defs>
                    <marker
                      id={`arrow-${edge.id}`}
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                      markerUnits="strokeWidth"
                    >
                      <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
                    </marker>
                  </defs>
                  <path
                    d={`M${fromX},${fromY} C${fromX},${toY - 20} ${toX},${fromY + 20} ${toX},${toY}`}
                    stroke="#94a3b8"
                    strokeWidth="2"
                    fill="none"
                    markerEnd={`url(#arrow-${edge.id})`}
                  />
                  {edge.label && (
                    <text
                      x={(fromX + toX) / 2}
                      y={(fromY + toY) / 2 - 10}
                      className="text-xs fill-muted-foreground"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {flowData.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p>暂无节点</p>
                <p className="text-sm mt-1">点击上方"添加节点"开始编辑</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
