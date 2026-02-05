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
import { Play, Save, TestTube, FileJson, Settings, X, Minimize2, Maximize2 } from 'lucide-react';
import FlowCanvas from '@/app/flow-engine/components/FlowCanvas';
import FlowNodeLibrary from '@/app/flow-engine/components/FlowNodeLibrary';
import NodeConfigPanel from '@/app/flow-engine/components/NodeConfigPanel';
import FlowTestPanel from '@/app/flow-engine/components/FlowTestPanel';
import FlowJsonEditor from '@/app/flow-engine/components/FlowJsonEditor';
import { NodeData as BaseNodeData, EdgeData } from '@/app/flow-engine/types';

// 节点数据类型（适配 React Flow）
export interface NodeData {
  id: string;
  type: string;  // React Flow 节点类型（'custom'）
  position: { x: number; y: number };
  data: {
    type: string;  // 业务节点类型（'message_receive', 'intent' 等）
    name: string;
    description?: string;
    config?: Record<string, any>;
    icon?: string;
    color?: string;
  };
}

// 边类型定义
export type Edge = EdgeData;

// 流程定义类型
export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  triggerType: 'webhook' | 'manual' | 'scheduled';
  nodes: NodeData[];
  edges: Edge[];
  version?: string;
}

interface FlowEditorProps {
  initialFlow?: FlowDefinition;
  onSave?: (flow: FlowDefinition) => Promise<void>;
  onClose?: () => void;
  mode?: 'create' | 'edit';
}

export default function FlowEditor({ initialFlow, onSave, onClose, mode = 'create' }: FlowEditorProps) {
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

  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 保存流程
  const handleSaveFlow = async () => {
    if (!flow.name.trim()) {
      alert('请输入流程名称');
      return;
    }

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(flow);
      }
      // 如果有onClose，则保存后关闭
      // if (onClose) onClose();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请查看控制台');
    } finally {
      setIsSaving(false);
    }
  };

  // 更新节点数据
  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<NodeData>) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }));

    // 更新选中的节点
    if (selectedNode?.id === nodeId) {
      setSelectedNode(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedNode]);

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
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-lg font-semibold text-slate-900">
            {mode === 'create' ? '创建新流程' : '编辑流程'}
          </h2>
          <div className="flex items-center gap-2">
            <Input
              value={flow.name}
              onChange={(e) => setFlow({ ...flow, name: e.target.value })}
              placeholder="流程名称"
              className="w-48"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTestResults([])}
            disabled={testResults.length === 0}
          >
            清除日志
          </Button>
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
                <Settings className="w-4 h-4 mr-2" />
                可视化编辑
              </TabsTrigger>
              <TabsTrigger value="json">
                <FileJson className="w-4 h-4 mr-2" />
                JSON编辑
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="visual" className="flex-1 p-4 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 h-full min-h-0">
              {/* 左侧：节点库 */}
              <div className="col-span-2 overflow-hidden">
                <FlowNodeLibrary />
              </div>

              {/* 中间：画布 */}
              <div className="col-span-7 overflow-hidden">
                <FlowCanvas
                  nodes={flow.nodes}
                  edges={flow.edges}
                  onNodesChange={(nodes) => setFlow({ ...flow, nodes })}
                  onEdgesChange={(edges) => setFlow({ ...flow, edges })}
                  onNodeSelect={setSelectedNode}
                  onNodeUpdate={handleUpdateNode}
                  selectedNodeId={selectedNode?.id}
                />
              </div>

              {/* 右侧：配置面板 */}
              <div className="col-span-3 space-y-4 overflow-y-auto">
                {selectedNode && (
                  <NodeConfigPanel
                    node={selectedNode}
                    onUpdate={(updates) => handleUpdateNode(selectedNode.id, updates)}
                  />
                )}

                {/* 测试面板 */}
                {testResults.length > 0 && (
                  <FlowTestPanel
                    results={testResults}
                    isRunning={isTesting}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="json" className="flex-1 p-4 overflow-hidden">
            <FlowJsonEditor
              flow={flow}
              onChange={setFlow}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
