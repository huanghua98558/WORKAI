'use client';

/**
 * WorkTool AI 2.1 - 流程引擎编辑器
 *
 * 功能：
 * - 可视化流程编辑（拖拽、连线）
 * - 10种节点支持
 * - 节点配置面板
 * - 流程测试（前端模拟）
 * - JSON编辑器
 */

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Save, TestTube, FileJson, Settings } from 'lucide-react';
import FlowCanvas from './components/FlowCanvas';
import FlowNodeLibrary from './components/FlowNodeLibrary';
import NodeConfigPanel from './components/NodeConfigPanel';
import FlowTestPanel from './components/FlowTestPanel';
import FlowJsonEditor from './components/FlowJsonEditor';

// 节点类型定义
export interface NodeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    name: string;
    description?: string;
    config?: Record<string, any>;
  };
}

// 边类型定义
export interface EdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// 流程定义类型
export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  triggerType: 'webhook' | 'manual' | 'scheduled';
  nodes: NodeData[];
  edges: EdgeData[];
}

export default function FlowEnginePage() {
  const [flow, setFlow] = useState<FlowDefinition>({
    id: `flow_${Date.now()}`,
    name: '新流程',
    description: '',
    triggerType: 'webhook',
    nodes: [],
    edges: []
  });

  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  // 保存流程
  const handleSaveFlow = async () => {
    try {
      console.log('保存流程:', flow);
      // TODO: 调用API保存流程
      alert('流程保存成功！');
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请查看控制台');
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
        nodeType: node.type,
        status: 'running',
        duration: Math.floor(Math.random() * 2000) + 100,
        timestamp: new Date().toISOString()
      });

      // 模拟执行延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      // 根据节点类型返回不同的结果
      let output = {};
      switch (node.type) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-[1920px] mx-auto">
        {/* 页面头部 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                流程引擎编辑器
              </h1>
              <p className="text-slate-600">
                可视化编排消息处理流程，支持拖拽配置，无需写代码
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsTesting(false)}
                disabled={!isTesting}
              >
                清除日志
              </Button>
              <Button
                variant="outline"
                onClick={handleTestFlow}
                disabled={flow.nodes.length === 0 || isTesting}
              >
                <TestTube className="w-4 h-4 mr-2" />
                测试流程
              </Button>
              <Button onClick={handleSaveFlow}>
                <Save className="w-4 h-4 mr-2" />
                保存流程
              </Button>
            </div>
          </div>

          {/* 流程基本信息 */}
          <Card className="p-4 bg-white shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="flow-name">流程名称</Label>
                <Input
                  id="flow-name"
                  value={flow.name}
                  onChange={(e) => setFlow({ ...flow, name: e.target.value })}
                  placeholder="输入流程名称"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="flow-description">流程描述</Label>
                <Input
                  id="flow-description"
                  value={flow.description}
                  onChange={(e) => setFlow({ ...flow, description: e.target.value })}
                  placeholder="输入流程描述"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="trigger-type">触发类型</Label>
                <select
                  id="trigger-type"
                  value={flow.triggerType}
                  onChange={(e) => setFlow({ ...flow, triggerType: e.target.value as any })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="webhook">Webhook触发</option>
                  <option value="manual">手动触发</option>
                  <option value="scheduled">定时触发</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* 主编辑器区域 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'visual' | 'json')}>
          <TabsList className="mb-4">
            <TabsTrigger value="visual">
              <Settings className="w-4 h-4 mr-2" />
              可视化编辑
            </TabsTrigger>
            <TabsTrigger value="json">
              <FileJson className="w-4 h-4 mr-2" />
              JSON编辑
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              {/* 左侧：节点库 */}
              <div className="col-span-2">
                <FlowNodeLibrary />
              </div>

              {/* 中间：画布 */}
              <div className="col-span-7">
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
              <div className="col-span-3 space-y-4">
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

          <TabsContent value="json">
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
