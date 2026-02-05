'use client';

/**
 * 流程编辑器核心组件
 * 用于在对话框中嵌入
 */

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Save,
  TestTube,
  FileJson,
  LayoutGrid,
  X,
  Minimize2,
  Maximize2,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FlowCanvas from '@/app/flow-engine/components/FlowCanvas';
import FlowNodeLibrary from '@/app/flow-engine/components/FlowNodeLibrary';
import NodeConfigPanel from '@/app/flow-engine/components/NodeConfigPanel';
import FlowTestPanel from '@/app/flow-engine/components/FlowTestPanel';
import FlowJsonEditor from '@/app/flow-engine/components/FlowJsonEditor';
import { NodeData as BaseNodeData, EdgeData } from '@/app/flow-engine/types';
import { Node, Edge } from 'reactflow';

// 节点数据类型（适配 React Flow）
export type FlowNode = Node;

// 边类型定义
export type FlowEdge = Edge;

// 流程定义类型
export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  triggerType: 'webhook' | 'manual' | 'scheduled';
  nodes: FlowNode[];
  edges: FlowEdge[];
  version?: string;
}

interface FlowEditorProps {
  initialFlow?: FlowDefinition;
  onSave?: (flow: FlowDefinition) => Promise<void>;
  onClose?: () => void;
  mode?: 'create' | 'edit';
}

export default function FlowEditor({ initialFlow, onSave, onClose, mode = 'create' }: FlowEditorProps) {
  const { toast } = useToast();
  const [flow, setFlow] = useState<FlowDefinition>(
    initialFlow || {
      id: `flow_${Date.now()}`,
      name: '新流程',
      description: '',
      triggerType: 'webhook',
      nodes: [],
      edges: []
    }
  );

  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 性能优化：将流程元数据（名称、描述）拆分为独立 state
  // 避免在输入时触发整个 flow 对象更新，导致画布重绘
  const [flowMeta, setFlowMeta] = useState({
    name: initialFlow?.name || '',
    description: initialFlow?.description || '',
  });

  // 状态优化：只存储选中的节点 ID，从 flow.nodes 派生 selectedNode
  // 避免数据拷贝导致的同步问题，遵循单数据源原则
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = flow.nodes.find(n => n.id === selectedNodeId) ?? null;

  // 同步 initialFlow 到 flowMeta
  React.useEffect(() => {
    if (initialFlow) {
      setFlowMeta({
        name: initialFlow.name,
        description: initialFlow.description,
      });
    }
  }, [initialFlow]);

  // 注入自定义滚动条样式
  React.useEffect(() => {
    const customScrollbarStyles = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f5f9;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `;
    const style = document.createElement('style');
    style.textContent = customScrollbarStyles;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // 保存流程
  const handleSaveFlow = async () => {
    // 合并 flowMeta 到 flow，确保最新数据被保存
    const finalFlow = {
      ...flow,
      name: flowMeta.name || flow.name,
      description: flowMeta.description || flow.description,
    };

    if (!finalFlow.name.trim()) {
      toast({
        title: "验证失败",
        description: "请输入流程名称",
        variant: "destructive",
      });
      return;
    }

    if (finalFlow.nodes.length === 0) {
      toast({
        title: "验证失败",
        description: "请至少添加一个节点",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(finalFlow);
      }
      // 保存成功后关闭弹窗
      if (onClose) onClose();
    } catch (error) {
      console.error('保存失败:', error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : '未知错误，请查看控制台',
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 更新节点数据
  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<FlowNode>) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }));
    // 不需要手动更新 selectedNode，因为它是从 flow.nodes 派生的
  }, []);

  // JSON 编辑校验：防止非法 JSON 破坏流程
  const validateFlowStructure = (flowToValidate: FlowDefinition): { valid: boolean; error?: string } => {
    // 校验名称
    if (!flowToValidate.name || typeof flowToValidate.name !== 'string') {
      return { valid: false, error: '流程名称无效' };
    }

    // 校验节点
    if (!Array.isArray(flowToValidate.nodes)) {
      return { valid: false, error: 'nodes 必须是数组' };
    }

    for (const node of flowToValidate.nodes) {
      if (!node.id || !node.data?.type) {
        return { valid: false, error: `节点缺少必要字段 (id 或 type): ${JSON.stringify(node)}` };
      }

      if (typeof node.position?.x !== 'number' || typeof node.position?.y !== 'number') {
        return { valid: false, error: `节点 ${node.id} 位置信息无效` };
      }
    }

    // 校验边
    if (!Array.isArray(flowToValidate.edges)) {
      return { valid: false, error: 'edges 必须是数组' };
    }

    for (const edge of flowToValidate.edges) {
      if (!edge.source || !edge.target) {
        return { valid: false, error: `连线缺少 source 或 target: ${JSON.stringify(edge)}` };
      }
    }

    return { valid: true };
  };

  // 测试流程
  const handleTestFlow = async () => {
    setIsTesting(true);
    setTestResults([]);

    try {
      // 前端模拟测试
      const results = await simulateFlowExecution(flow);
      setTestResults(results);
    } catch (error) {
      console.error('测试失败:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // 前端模拟流程执行
  const simulateFlowExecution = async (flowData: FlowDefinition): Promise<any[]> => {
    const results: any[] = [];

    for (const node of flowData.nodes) {
      results.push({
        nodeId: node.id,
        nodeName: node.data.name,
        nodeType: node.data.type,
        status: 'running',
        duration: Math.floor(Math.random() * 2000) + 100,
        timestamp: new Date().toISOString()
      });

      // 模拟执行延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      // 根据节点类型返回不同的结果
      let output = {};
      switch (node.data.type) {
        case 'message_receive':
          output = { messageId: `msg_${Date.now()}`, sessionId: `session_${Date.now()}` };
          break;
        case 'intent':
          output = { intent: 'service', confidence: 0.95 };
          break;
        case 'decision':
          output = { conditionResult: 'true', matchedBranch: 'service' };
          break;
        case 'ai_reply':
          output = { reply: '这是AI生成的回复内容' };
          break;
        case 'message_dispatch':
          output = { targetName: '客服群', shouldDispatch: true };
          break;
        case 'send_command':
          output = { sendId: `send_${Date.now()}`, status: 'sent' };
          break;
        case 'command_status':
          output = { saved: true, messageId: `msg_${Date.now()}` };
          break;
        case 'alert_save':
          output = { alertId: `alert_${Date.now()}`, alertLevel: 'warning' };
          break;
        case 'alert_rule':
          output = { matchedRule: 'rule1', shouldEscalate: false };
          break;
        case 'end':
          output = { completed: true };
          break;
        default:
          output = {};
      }

      results[results.length - 1].status = 'completed';
      results[results.length - 1].output = output;
    }

    return results;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 border-b bg-white px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 whitespace-nowrap">
            {mode === 'create' ? '创建新流程' : '编辑流程'}
          </h2>
          <div className="flex flex-col gap-1 flex-1 max-w-md min-w-0">
            <Input
              value={flowMeta.name}
              onChange={(e) => setFlowMeta(prev => ({ ...prev, name: e.target.value }))}
              onBlur={() => setFlow(prev => ({ ...prev, name: flowMeta.name }))}
              placeholder="流程名称 *"
              className="w-full"
            />
            <Input
              value={flowMeta.description}
              onChange={(e) => setFlowMeta(prev => ({ ...prev, description: e.target.value }))}
              onBlur={() => setFlow(prev => ({ ...prev, description: flowMeta.description }))}
              placeholder="流程描述（可选）"
              className="w-full text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Label htmlFor="trigger-type" className="text-sm">触发类型：</Label>
            <Select
              value={flow.triggerType}
              onValueChange={(v) => setFlow({ ...flow, triggerType: v as 'webhook' | 'manual' | 'scheduled' })}
            >
              <SelectTrigger id="trigger-type" className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="manual">手动</SelectItem>
                <SelectItem value="scheduled">定时</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-6 w-px bg-slate-200" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestFlow}
            disabled={flow.nodes.length === 0 || isTesting}
          >
            <TestTube className="w-4 h-4 mr-2" />
            测试流程
          </Button>
          <Button
            onClick={handleSaveFlow}
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? '保存中...' : '保存流程'}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 主编辑器区域 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'visual' | 'json')} className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b">
            <TabsList>
              <TabsTrigger value="visual">
                <LayoutGrid className="w-4 h-4 mr-2" />
                可视化编辑
              </TabsTrigger>
              <TabsTrigger value="json">
                <FileJson className="w-4 h-4 mr-2" />
                JSON编辑
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="visual" className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">
            <div className="flex h-full w-full bg-slate-50">

              {/* 左侧：节点库 (固定宽度 250px，可滚动) */}
              <div className="w-[250px] flex-shrink-0 border-r bg-white flex flex-col h-full">
                <div className="p-3 border-b bg-slate-50/50 font-medium text-sm text-slate-700">
                  组件库
                </div>
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                  <FlowNodeLibrary />
                </div>
              </div>

              {/* 中间：画布 (自动撑满剩余空间 flex-1) */}
              <div className="flex-1 h-full relative overflow-hidden bg-slate-100/50">
                <FlowCanvas
                  nodes={flow.nodes}
                  edges={flow.edges}
                  onNodesChange={(nodes) => setFlow({ ...flow, nodes })}
                  onEdgesChange={(edges) => setFlow({ ...flow, edges })}
                  onNodeSelect={(node) => setSelectedNodeId(node?.id ?? null)}
                  onNodeUpdate={handleUpdateNode}
                  selectedNodeId={selectedNodeId}
                />

                {/* 浮动的测试面板 (不占空间，悬浮在底部) */}
                {testResults.length > 0 && (
                  <div className="absolute bottom-4 left-4 right-4 max-h-[30%] bg-white border shadow-lg rounded-lg overflow-hidden flex flex-col animate-in slide-in-from-bottom-5">
                    <FlowTestPanel
                      results={testResults}
                      isRunning={isTesting}
                      onClear={() => setTestResults([])}
                    />
                  </div>
                )}
              </div>

              {/* 右侧：配置面板 (固定宽度 320px，可滚动) */}
              <div className="w-[320px] flex-shrink-0 border-l bg-white flex flex-col h-full">
                <div className="p-3 border-b bg-slate-50/50 font-medium text-sm text-slate-700">
                  节点属性
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {selectedNode ? (
                    <NodeConfigPanel
                      node={selectedNode}
                      onUpdate={(updates) => handleUpdateNode(selectedNodeId!, updates)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                      <LayoutGrid className="w-12 h-12 mb-3 opacity-20" />
                      <p>请点击画布中的节点</p>
                      <p>进行参数配置</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </TabsContent>

          <TabsContent value="json" className="flex-1 p-4 overflow-hidden">
            <FlowJsonEditor
              flow={flow}
              onChange={(newFlow) => {
                try {
                  const validation = validateFlowStructure(newFlow);
                  if (!validation.valid) {
                    toast({
                      variant: 'destructive',
                      title: 'JSON 格式错误',
                      description: validation.error,
                    });
                    return;
                  }
                  setFlow(newFlow);
                } catch (error) {
                  toast({
                    variant: 'destructive',
                    title: 'JSON 解析失败',
                    description: error instanceof Error ? error.message : '未知错误',
                  });
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
