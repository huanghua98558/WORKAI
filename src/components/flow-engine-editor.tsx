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
  Trash2,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FlowCanvas from '@/app/flow-engine/components/FlowCanvas';
import FlowNodeLibrary from '@/app/flow-engine/components/FlowNodeLibrary';
import NodeConfigPanel from '@/app/flow-engine/components/NodeConfigPanel';
import FlowConfigPanel from '@/app/flow-engine/components/FlowConfigPanel';
import FlowTestPanel from '@/app/flow-engine/components/FlowTestPanel';
import FlowJsonEditor from '@/app/flow-engine/components/FlowJsonEditor';
import { NodeData as BaseNodeData, EdgeData } from '@/app/flow-engine/types';
import { Node, Edge } from 'reactflow';
import { FlowConfig, defaultConfig } from '@/app/flow-engine/components/FlowConfigPanel';

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
  flowConfig?: FlowConfig;
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

  // 右侧面板视图状态：'node' = 节点属性, 'flow' = 流程属性
  const [rightPanelView, setRightPanelView] = useState<'node' | 'flow'>('node');

  // 流程配置状态
  const [flowConfig, setFlowConfig] = useState<FlowConfig>(
    initialFlow?.flowConfig || {
      ...defaultConfig,
      name: initialFlow?.name || '',
      description: initialFlow?.description || '',
      version: initialFlow?.version || '1.0.0',
    }
  );

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
    // 合并 flowMeta 和 flowConfig 到 flow，确保最新数据被保存
    const finalFlow = {
      ...flow,
      name: flowMeta.name || flow.name,
      description: flowMeta.description || flow.description,
      flowConfig: {
        ...flowConfig,
        name: flowMeta.name || flow.name,
        description: flowMeta.description || flow.description,
        version: flow.version || '1.0.0',
      },
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

  // 删除节点
  const handleDeleteNode = useCallback((nodeId: string) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      edges: prev.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
    }));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

  // 复制节点
  const handleCopyNode = useCallback((newNode: FlowNode) => {
    setFlow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
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
      {/* 顶部工具栏 - 优化后 */}
      <div className="flex-shrink-0 border-b bg-gradient-to-r from-slate-50 to-white px-6 py-3 flex items-center justify-between gap-6 shadow-sm">
        {/* 左侧：流程信息 */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <h2 className="text-base font-bold text-slate-800 whitespace-nowrap">
              {mode === 'create' ? '创建新流程' : '编辑流程'}
            </h2>
          </div>
          <div className="h-6 w-px bg-slate-200 flex-shrink-0" />

          {/* 流程名称输入 */}
          <div className="flex-1 max-w-sm min-w-0">
            <div className="relative">
              <Input
                value={flowMeta.name}
                onChange={(e) => setFlowMeta(prev => ({ ...prev, name: e.target.value }))}
                onBlur={() => setFlow(prev => ({ ...prev, name: flowMeta.name }))}
                placeholder="流程名称 *"
                className="w-full h-9 pr-4 font-medium bg-white/80 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              />
            </div>
          </div>

          {/* 流程描述输入 - 折叠式 */}
          <div className="flex-1 max-w-xs min-w-0">
            <Input
              value={flowMeta.description}
              onChange={(e) => setFlowMeta(prev => ({ ...prev, description: e.target.value }))}
              onBlur={() => setFlow(prev => ({ ...prev, description: flowMeta.description }))}
              placeholder="添加描述..."
              className="w-full h-9 text-sm bg-white/80 border-slate-200/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
            />
          </div>
        </div>

        {/* 右侧：操作按钮组 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* 触发类型选择器 */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-lg border border-slate-200/60 shadow-sm">
            <span className="text-xs font-medium text-slate-600 whitespace-nowrap">触发:</span>
            <Select
              value={flow.triggerType}
              onValueChange={(v) => setFlow({ ...flow, triggerType: v as 'webhook' | 'manual' | 'scheduled' })}
            >
              <SelectTrigger className="w-28 h-7 border-0 bg-transparent px-2 text-sm font-medium text-slate-700 hover:bg-slate-100/50 focus:ring-0 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-[140px]">
                <SelectItem value="webhook" className="text-sm">Webhook</SelectItem>
                <SelectItem value="manual" className="text-sm">手动触发</SelectItem>
                <SelectItem value="scheduled" className="text-sm">定时执行</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* 测试按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestFlow}
            disabled={flow.nodes.length === 0 || isTesting}
            className="h-9 px-4 bg-white/80 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-all duration-200 shadow-sm"
          >
            <TestTube className="w-4 h-4 mr-2" />
            <span className="font-medium">测试</span>
          </Button>

          {/* 保存按钮 */}
          <Button
            onClick={handleSaveFlow}
            disabled={isSaving}
            className="h-9 px-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? '保存中...' : '保存'}
          </Button>

          {/* 关闭按钮 */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 主编辑器区域 */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'visual' | 'json')} className="flex-1 flex flex-col min-h-0">
          {/* Tabs 切换条 */}
          <div className="px-4 py-2.5 border-b bg-gradient-to-b from-white to-slate-50/50">
            <TabsList className="bg-slate-100/80 p-1 rounded-lg shadow-sm">
              <TabsTrigger
                value="visual"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 gap-2 rounded-md h-8 px-4 transition-all duration-200"
              >
                <LayoutGrid className="w-4 h-4" />
                可视化编辑
              </TabsTrigger>
              <TabsTrigger
                value="json"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 gap-2 rounded-md h-8 px-4 transition-all duration-200"
              >
                <FileJson className="w-4 h-4" />
                JSON编辑
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="visual" className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">
            <div className="flex h-full w-full bg-slate-50">

              {/* 左侧：节点库 (固定宽度 250px，可滚动) */}
              <div className="w-[250px] flex-shrink-0 border-r bg-white flex flex-col h-full shadow-[4px_0_24px_-12px_rgba(0,0,0,0.08)]">
                {/* 组件库标题 */}
                <div className="px-4 py-3.5 border-b bg-gradient-to-r from-slate-50 to-white flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                    <LayoutGrid className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-semibold text-sm text-slate-800">组件库</span>
                  <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">拖拽添加</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                  <FlowNodeLibrary />
                </div>
              </div>

              {/* 中间：画布 (自动撑满剩余空间 flex-1) */}
              <div className="flex-1 h-full relative overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50/30 to-violet-50/20">
                {/* 网格背景纹理 */}
                <div className="absolute inset-0 opacity-[0.45]" style={{
                  backgroundImage: `
                    radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.3) 1px, transparent 0)
                  `,
                  backgroundSize: '24px 24px'
                }} />

                <FlowCanvas
                  nodes={flow.nodes}
                  edges={flow.edges}
                  onNodesChange={(nodes) => setFlow({ ...flow, nodes })}
                  onEdgesChange={(edges) => setFlow({ ...flow, edges })}
                  onNodeSelect={(node) => setSelectedNodeId(node?.id ?? null)}
                  onNodeUpdate={handleUpdateNode}
                  selectedNodeId={selectedNodeId}
                  onDeleteNode={handleDeleteNode}
                  onCopyNode={handleCopyNode}
                />

                {/* 浮动的测试面板 (不占空间，悬浮在底部) */}
                {testResults.length > 0 && (
                  <div className="absolute bottom-4 left-4 right-4 max-h-[30%] bg-white/95 backdrop-blur-sm border border-slate-200/80 shadow-xl rounded-xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5">
                    <FlowTestPanel
                      results={testResults}
                      isRunning={isTesting}
                      onClear={() => setTestResults([])}
                    />
                  </div>
                )}
              </div>

              {/* 右侧：配置面板 (固定宽度 320px，可滚动) */}
              <div className="w-[320px] flex-shrink-0 border-l bg-white flex flex-col h-full shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.08)]">
                {/* 面板标题和切换 */}
                <div className="px-4 py-3.5 border-b bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shadow-sm transition-colors ${
                        rightPanelView === 'flow'
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                          : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                      }`}>
                        {rightPanelView === 'flow' ? (
                          <Settings className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <FileJson className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                      <span className="font-semibold text-sm text-slate-800">
                        {rightPanelView === 'flow' ? '流程属性' : '节点属性'}
                      </span>
                    </div>
                    {/* 切换按钮 */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                      <button
                        onClick={() => setRightPanelView('node')}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                          rightPanelView === 'node'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        节点
                      </button>
                      <button
                        onClick={() => setRightPanelView('flow')}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                          rightPanelView === 'flow'
                            ? 'bg-white text-violet-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        流程
                      </button>
                    </div>
                  </div>
                  {/* 当前选中信息 */}
                  {rightPanelView === 'node' && selectedNode && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full max-w-[120px] truncate block">
                      {selectedNode.data?.label || selectedNode.data?.type}
                    </span>
                  )}
                  {rightPanelView === 'flow' && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full max-w-[120px] truncate block">
                      {flow.name || '未命名流程'}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {rightPanelView === 'flow' ? (
                    /* 流程属性配置 */
                    <FlowConfigPanel
                      config={flowConfig}
                      onChange={(config) => {
                        setFlowConfig(config);
                        // 同步到flowMeta
                        setFlowMeta(prev => ({
                          name: config.name,
                          description: config.description,
                        }));
                      }}
                    />
                  ) : (
                    /* 节点属性配置 */
                    selectedNode ? (
                      <NodeConfigPanel
                        node={selectedNode}
                        onUpdate={(updates) => handleUpdateNode(selectedNodeId!, updates)}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4 shadow-inner">
                          <LayoutGrid className="w-8 h-8 opacity-30" />
                        </div>
                        <p className="font-medium text-slate-500 mb-1">选择节点</p>
                        <p className="text-xs text-slate-400">点击画布中的节点进行配置</p>
                      </div>
                    )
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
