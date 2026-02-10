'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GitBranch,
  RefreshCw,
  Play,
  Pause,
  Eye,
  Plus,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  ArrowRight,
  Box,
  Zap,
  Brain,
  MessageSquare,
  FileText,
  AlertCircle,
  Save,
  X,
  Bell,
  Users,
  Maximize2,
  Minimize2,
  Network,
  SearchCode,
  Code
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FlowEditor from '@/components/flow-engine-editor';
import VersionManagement from '@/components/flow-engine/version-management';
import TestPanel from '@/components/flow-engine/test-panel';
import ExecutionMonitor from '@/components/flow-engine/execution-monitor';
import ContextVisualizer from '@/components/flow-engine/context-visualizer';
import ContextDebugPanel from '@/components/flow-engine/context-debug-panel';
import {
  NODE_TYPES,
  NODE_METADATA,
  NODE_CATEGORIES,
  FlowStatus,
  TriggerType
} from '@/app/flow-engine/types';
import {
  getFlowDefinitions,
  getFlowDefinition,
  createFlowDefinition,
  updateFlowDefinition,
  deleteFlowDefinition,
  getFlowInstances,
  FlowDefinition,
  FlowInstance,
  FlowNode
} from '@/lib/api/flow-engine';

// 触发类型配置
const TRIGGER_TYPE_CONFIG: Record<string, { label: string; description: string }> = {
  webhook: { label: 'Webhook触发', description: '通过HTTP请求触发流程' },
  manual: { label: '手动触发', description: '手动启动流程' },
  scheduled: { label: '定时触发', description: '按预定时间触发流程' }
};

// 获取节点配置（从 NODE_METADATA 动态获取）
const getNodeTypeConfig = (nodeType: string) => {
  const meta = NODE_METADATA[nodeType as keyof typeof NODE_METADATA];
  if (!meta) {
    return { icon: Box, color: 'text-gray-500', label: nodeType };
  }
  return {
    icon: Box,
    color: meta.color.replace('bg-', 'text-'),
    label: meta.name
  };
};

export default function FlowEngineManage() {
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [instances, setInstances] = useState<FlowInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<FlowDefinition | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'flows' | 'instances' | 'versions' | 'test' | 'monitor' | 'context-viz' | 'context-debug'>('flows');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingJson, setEditingJson] = useState('');
  const [isJsonValid, setIsJsonValid] = useState(true);

  // 编辑器对话框状态（统一用于创建和编辑）
  // 安全初始化对话框状态，避免服务端渲染时访问 window 对象
  const [editorDialog, setEditorDialog] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    width: number;
    height: number | string;
    isMaximized: boolean;
  }>({
    isOpen: false,
    mode: 'create',
    width: 1400,
    height: 600, // 默认值，避免服务端渲染时访问 window.innerHeight
    isMaximized: false,
  });

  // 客户端挂载后更新高度
  React.useEffect(() => {
    setEditorDialog(prev => ({
      ...prev,
      height: window.innerHeight * 0.85,
    }));
  }, []);

  // 辅助函数：转换后端FlowNode到FlowEditor的NodeData
  const convertToEditorNodes = (flowNodes: FlowNode[]) => {
    return flowNodes.map((node, index) => {
      // 处理大小写不匹配问题（如 'END' vs 'end'）
      const nodeTypeLower = (node.type || '').toLowerCase();
      const nodeTypeKey = Object.keys(NODE_TYPES).find(key =>
        NODE_TYPES[key as keyof typeof NODE_TYPES].toLowerCase() === nodeTypeLower
      ) as keyof typeof NODE_TYPES;
      const nodeType = nodeTypeKey ? NODE_TYPES[nodeTypeKey] : node.type;
      const metadata = nodeTypeKey ? NODE_METADATA[NODE_TYPES[nodeTypeKey]] : undefined;

      // 后端返回的节点结构：{ id, data: { name, config, description }, type, position }
      // 兼容两种数据结构：直接访问或通过 data 属性访问
      const nodeName = node.data?.name || node.name || '未命名节点';
      const nodeConfig = node.data?.config || node.config || {};
      const nodeDescription = node.data?.description || metadata?.description || '';

      return {
        id: node.id,
        type: 'custom',  // React Flow 节点类型
        position: node.position || {
          x: 100 + (index % 3) * 250,
          y: 100 + Math.floor(index / 3) * 150
        },
        data: {
          type: nodeType,  // 使用标准化的节点类型
          name: nodeName,
          description: nodeDescription,
          config: nodeConfig,
          icon: metadata?.icon || '⚙️',
          color: metadata?.color || 'bg-gray-500',
        },
      };
    });
  };

  // 辅助函数：转换FlowEditor的NodeData到后端FlowNode
  const convertToBackendNodes = (editorNodes: any[]) => {
    return editorNodes.map(node => ({
      id: node.id,
      type: node.data.type || node.type,  // 使用 node.data.type 作为业务节点类型
      name: node.data.name,
      config: node.data.config || {},
      position: node.position,
    }));
  };

  // 辅助函数：转换FlowEditor的Edge到后端Edge
  const convertToBackendEdges = (editorEdges: any[]) => {
    return editorEdges.map(edge => ({
      source: edge.source,
      target: edge.target,
      condition: edge.sourceHandle,
    }));
  };

  const { toast } = useToast();

  // 加载流程列表
  const loadFlows = async () => {
    setIsLoading(true);
    try {
      const result = await getFlowDefinitions({ limit: 50 });
      if (result.success) {
        setFlows(result.data);
      } else {
        toast({
          title: "加载失败",
          description: result.error || '加载流程列表失败',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('加载流程列表失败:', error);
      toast({
        title: "加载失败",
        description: '加载流程列表失败',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化 v6.1 流程
  const handleInitializeFlows = async () => {
    if (!confirm('确定要初始化 v6.1 流程吗？这会导入默认流程文件到数据库。')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/flow-engine/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "初始化成功",
          description: `成功导入 ${result.data.success} 个流程，失败 ${result.data.failed} 个`,
          variant: "default",
        });
        
        // 刷新流程列表
        await loadFlows();
        
        // 显示详细结果
        if (result.data.errors.length > 0) {
          console.error('部分流程导入失败:', result.data.errors);
        }
      } else {
        toast({
          title: "初始化失败",
          description: result.error || '初始化流程失败',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('初始化流程失败:', error);
      toast({
        title: "初始化失败",
        description: '初始化流程失败',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 加载实例列表
  const loadInstances = async () => {
    try {
      const result = await getFlowInstances({ limit: 50 });
      if (result.success) {
        setInstances(result.data);
      } else {
        toast({
          title: "加载失败",
          description: result.error || '加载实例列表失败',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('加载实例列表失败:', error);
      toast({
        title: "加载失败",
        description: '加载实例列表失败',
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadFlows();
    loadInstances();
    
    // 自动刷新
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadFlows();
        loadInstances();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // 切换流程状态
  const toggleFlowStatus = async (flowId: string, newStatus: 'active' | 'inactive') => {
    try {
      const result = await updateFlowDefinition(flowId, { status: newStatus });
      if (result.success) {
        setFlows(flows.map(flow => 
          flow.id === flowId ? { ...flow, status: newStatus } : flow
        ));
        toast({
          title: "状态已更新",
          description: newStatus === 'active' ? '流程已启用' : '流程已停用',
        });
      } else {
        toast({
          title: "操作失败",
          description: result.error || '切换流程状态失败',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('切换流程状态失败:', error);
      toast({
        title: "操作失败",
        description: '切换流程状态失败',
        variant: "destructive",
      });
    }
  };

  // 删除流程
  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm('确定要删除这个流程吗？此操作不可恢复。')) return;
    
    try {
      const result = await deleteFlowDefinition(flowId);
      if (result.success) {
        setFlows(flows.filter(flow => flow.id !== flowId));
        toast({
          title: "删除成功",
          description: "流程已删除",
        });
      } else {
        toast({
          title: "删除失败",
          description: result.error || '删除流程失败',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('删除流程失败:', error);
      toast({
        title: "删除失败",
        description: '删除流程失败',
        variant: "destructive",
      });
    }
  };

  // 打开编辑对话框
  const openEditDialog = async (flowId: string) => {
    try {
      const result = await getFlowDefinition(flowId);
      if (result.success && result.data) {
        setSelectedFlow(result.data);

        // 设置编辑器对话框状态
        setEditorDialog({
          ...editorDialog,
          isOpen: true,
          mode: 'edit',
        });
      } else {
        toast({
          title: "加载失败",
          description: result.error || '加载流程详情失败',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('加载流程详情失败:', error);
      toast({
        title: "加载失败",
        description: '加载流程详情失败',
        variant: "destructive",
      });
    }
  };

  // 打开详情对话框
  const openDetailDialog = async (flowId: string) => {
    try {
      const result = await getFlowDefinition(flowId);
      if (result.success && result.data) {
        setSelectedFlow(result.data);
        // 格式化 JSON 到编辑器
        const flowData = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          version: result.data.version,
          status: result.data.status,
          trigger_type: result.data.trigger_type,
          timeout: result.data.timeout,
          retryConfig: result.data.retryConfig,
          nodes: result.data.nodes || [],
          edges: result.data.edges || [],
          variables: result.data.variables || {},
        };
        setEditingJson(JSON.stringify(flowData, null, 2));
        setIsJsonValid(true);
        setIsDetailDialogOpen(true);
      } else {
        toast({
          title: "加载失败",
          description: result.error || '加载流程详情失败',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('加载流程详情失败:', error);
      toast({
        title: "加载失败",
        description: '加载流程详情失败',
        variant: "destructive",
      });
    }
  };

  // 编辑流程详情属性
  const handleUpdateFlowProperties = async (updates: Partial<FlowDefinition>) => {
    try {
      const result = await updateFlowDefinition(selectedFlow!.id, updates);
      if (result.success) {
        await loadFlows();
        // 更新选中的流程
        setSelectedFlow(prev => prev ? { ...prev, ...updates } : null);
        toast({
          title: "更新成功",
          description: "流程属性已更新",
        });
      } else {
        throw new Error(result.error || '更新失败');
      }
    } catch (error) {
      console.error('更新流程属性失败:', error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : '未知错误',
        variant: "destructive",
      });
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-500">
            <CheckCircle className="h-3 w-3" />
            运行中
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="outline" className="gap-1 border-gray-500 text-gray-500">
            <Pause className="h-3 w-3" />
            已停用
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            草稿
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 获取实例状态图标
  const getInstanceStatusBadge = (status: string) => {
    switch (status) {
      case FlowStatus.RUNNING:
        return (
          <Badge variant="outline" className="gap-1 border-blue-500 text-blue-500">
            <Activity className="h-3 w-3 animate-pulse" />
            运行中
          </Badge>
        );
      case FlowStatus.COMPLETED:
        return (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-500">
            <CheckCircle className="h-3 w-3" />
            已完成
          </Badge>
        );
      case FlowStatus.FAILED:
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            失败
          </Badge>
        );
      case FlowStatus.PENDING:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            待执行
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-blue-500" />
            流程引擎管理
          </h3>
          <p className="text-muted-foreground mt-1">
            可视化编排业务流程，实时监控流程执行状态
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-primary/10 border-primary/30' : ''}
          >
            {autoRefresh ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-pulse" />
                自动刷新
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                手动刷新
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadFlows();
              loadInstances();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleInitializeFlows}
            disabled={isLoading}
          >
            <Settings className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            初始化 v6.1 流程
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setEditorDialog({ ...editorDialog, isOpen: true, mode: 'create' })}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            新建流程（可视化编辑）
          </Button>
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('flows')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'flows'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <GitBranch className="h-4 w-4 inline mr-2" />
          流程列表 ({flows.length})
        </button>
        <button
          onClick={() => setActiveTab('instances')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'instances'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="h-4 w-4 inline mr-2" />
          执行记录 ({instances.length})
        </button>
        <button
          onClick={() => setActiveTab('versions')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'versions'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4 inline mr-2" />
          版本管理
        </button>
        <button
          onClick={() => setActiveTab('test')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'test'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Play className="h-4 w-4 inline mr-2" />
          测试面板
        </button>
        <button
          onClick={() => setActiveTab('monitor')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'monitor'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Eye className="h-4 w-4 inline mr-2" />
          执行监控
        </button>
        <button
          onClick={() => setActiveTab('context-viz')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'context-viz'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Network className="h-4 w-4 inline mr-2" />
          Context 可视化
        </button>
        <button
          onClick={() => setActiveTab('context-debug')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'context-debug'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <SearchCode className="h-4 w-4 inline mr-2" />
          Context 调试
        </button>
      </div>

      {/* 流程列表 */}
      {activeTab === 'flows' && (
        <div className="grid gap-4">
          {isLoading && flows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-12 w-12 text-muted-foreground animate-spin mb-4" />
                <p className="text-muted-foreground">加载中...</p>
              </CardContent>
            </Card>
          ) : flows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">暂无流程</p>
                <Button onClick={() => setEditorDialog({ ...editorDialog, isOpen: true, mode: 'create' })} className="gap-2">
                  <Plus className="h-4 w-4" />
                  创建第一个流程
                </Button>
              </CardContent>
            </Card>
          ) : (
            flows.map((flow) => (
              <Card key={flow.id} className="hover:border-primary/40 transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-semibold">{flow.name}</h4>
                        {getStatusBadge(flow.status)}
                        <Badge variant="outline" className="text-xs">
                          v{flow.version}
                        </Badge>
                      </div>
                      {flow.description && (
                        <p className="text-sm text-muted-foreground">{flow.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {flow.status === 'active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleFlowStatus(flow.id, 'inactive')}
                          className="h-8"
                        >
                          <Pause className="h-3.5 w-3.5 mr-1" />
                          停用
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleFlowStatus(flow.id, 'active')}
                          className="h-8"
                        >
                          <Play className="h-3.5 w-3.5 mr-1" />
                          启用
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openDetailDialog(flow.id)} className="h-8 px-2">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(flow.id)} className="h-8 px-2">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteFlow(flow.id)} className="h-8 px-2 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 流程节点预览 */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {flow.nodes && flow.nodes.length > 0 ? flow.nodes.slice(0, 8).map((node, index) => {
                        const config = getNodeTypeConfig(node.type);
                        const Icon = config?.icon || Box;
                        const nodeName = node.data?.name || node.name || node.id || '未命名节点';
                        return (
                          <React.Fragment key={node.id}>
                            {index > 0 && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            )}
                            <Badge
                              variant="outline"
                              className={`gap-1 flex-shrink-0 text-xs py-0.5 px-2 ${config?.color || 'text-gray-500'} border-current`}
                            >
                              <Icon className="h-3 w-3" />
                              <span className="max-w-[120px] truncate">{nodeName}</span>
                            </Badge>
                          </React.Fragment>
                        );
                      }) : (
                        <Badge variant="outline" className="text-muted-foreground text-xs">
                          <Box className="h-3 w-3 mr-1" />
                          暂无节点
                        </Badge>
                      )}
                      {flow.nodes && flow.nodes.length > 8 && (
                        <Badge variant="outline" className="text-muted-foreground text-xs ml-1">
                          +{flow.nodes.length - 8}
                        </Badge>
                      )}
                    </div>

                    {/* 统计信息 */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5" />
                        <span>执行: {flow.execution_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>成功率: {flow.success_rate ? `${flow.success_rate}%` : '0%'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>更新: {formatTime(flow.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* 执行记录 */}
      {activeTab === 'instances' && (
        <Card>
          <CardHeader>
            <CardTitle>执行记录</CardTitle>
            <CardDescription>
              显示最近的流程执行情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {instances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {isLoading ? '加载中...' : '暂无执行记录'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {instances.map((instance) => {
                    const flow = flows.find(f => f.id === instance.definition_id);
                    const currentNode = instance.current_node 
                      ? flow?.nodes?.find(n => n.id === instance.current_node)
                      : null;
                    const nodeConfig = currentNode ? getNodeTypeConfig(currentNode.type) : null;
                    const NodeIcon = nodeConfig?.icon;

                    return (
                      <Card key={instance.id} className="hover:border-primary/40 transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {instance.definition_name || flow?.name || '未知流程'}
                                </Badge>
                                {getInstanceStatusBadge(instance.status)}
                              </div>
                              <div className="text-sm">
                                <div className="text-muted-foreground">
                                  会话ID: {instance.id}
                                </div>
                                {instance.current_node && NodeIcon && (
                                  <div className="flex items-center gap-2 mt-1 text-primary">
                                    <NodeIcon className="h-3 w-3" />
                                    当前节点: {instance.current_node}
                                  </div>
                                )}
                                {instance.error_message && (
                                  <div className="flex items-center gap-2 mt-1 text-red-500">
                                    <AlertCircle className="h-3 w-3" />
                                    {instance.error_message}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(instance.started_at)}
                              </div>
                              {instance.completed_at && (
                                <div className="text-xs mt-0.5">
                                  完成: {formatTime(instance.completed_at)}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* 版本管理 */}
      {activeTab === 'versions' && (
        <VersionManagement />
      )}

      {/* 测试面板 */}
      {activeTab === 'test' && (
        <TestPanel />
      )}

      {/* 执行监控 */}
      {activeTab === 'monitor' && (
        <ExecutionMonitor />
      )}

      {/* Context 可视化 */}
      {activeTab === 'context-viz' && (
        <ContextVisualizer context={{
          robotId: 'robot-1',
          robotName: '机器人 1',
          sessionId: 'session-123',
          messageId: 'message-456',
          userName: '测试用户',
          groupName: '测试群组',
          timestamp: new Date().toISOString(),
          message: {
            content: '测试消息内容',
            type: 'text'
          }
        }} />
      )}

      {/* Context 调试 */}
      {activeTab === 'context-debug' && (
        <ContextDebugPanel />
      )}

      {/* 统一的流程编辑器对话框（创建和编辑） */}
      {editorDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200/50"
            style={{
              width: editorDialog.isMaximized ? '95vw' : `${editorDialog.width}px`,
              height: editorDialog.isMaximized ? '95vh' : `${editorDialog.height}px`,
            }}
          >
            {/* 对话框顶部工具栏 */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-slate-50 via-white to-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <GitBranch className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    {editorDialog.mode === 'create' ? '创建新流程' : '编辑流程'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editorDialog.mode === 'create'
                      ? '可视化流程编排 · 拖拽式编辑'
                      : selectedFlow?.name || ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditorDialog({
                      ...editorDialog,
                      isMaximized: !editorDialog.isMaximized,
                      width: editorDialog.isMaximized ? 1400 : window.innerWidth * 0.95,
                      height: editorDialog.isMaximized ? '85vh' : window.innerHeight * 0.95,
                    });
                  }}
                  title={editorDialog.isMaximized ? "还原" : "最大化"}
                  className="h-8 w-8 p-0 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  {editorDialog.isMaximized ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditorDialog({ ...editorDialog, isOpen: false });
                    setSelectedFlow(null);
                  }}
                  title="关闭"
                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 调整大小的手柄 */}
            <div
              className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = editorDialog.width;
                const startHeight = typeof editorDialog.height === 'number'
                  ? editorDialog.height
                  : parseInt(editorDialog.height as string) || 600;

                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const newWidth = Math.max(800, startWidth + (moveEvent.clientX - startX));
                  const newHeight = Math.max(600, startHeight + (moveEvent.clientY - startY));
                  setEditorDialog({
                    ...editorDialog,
                    width: newWidth,
                    height: newHeight,
                    isMaximized: false,
                  });
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-slate-300 rounded-br" />
            </div>

            {/* FlowEditor 内容 */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {editorDialog.mode === 'create' ? (
                <FlowEditor
                  mode="create"
                  onSave={async (flow) => {
                    try {
                      const result = await createFlowDefinition({
                        name: flow.name,
                        description: flow.description,
                        status: 'active',
                        trigger_type: flow.triggerType,
                        trigger_config: {},
                        version: '1.0.0',
                        nodes: convertToBackendNodes(flow.nodes),
                        edges: convertToBackendEdges(flow.edges),
                      });

                      if (result.success) {
                        await loadFlows();
                        setEditorDialog({ ...editorDialog, isOpen: false });
                        toast({
                          title: '流程创建成功',
                          description: `流程 "${flow.name}" 已创建`,
                        });
                      } else {
                        throw new Error(result.error || '创建失败');
                      }
                    } catch (error) {
                      console.error('创建流程失败:', error);
                      toast({
                        variant: 'destructive',
                        title: '创建失败',
                        description: error instanceof Error ? error.message : '未知错误',
                      });
                      throw error;
                    }
                  }}
                  onClose={() => {
                    setEditorDialog({ ...editorDialog, isOpen: false });
                  }}
                />
              ) : (
                <FlowEditor
                  mode="edit"
                  initialFlow={{
                    id: selectedFlow!.id,
                    name: selectedFlow!.name,
                    description: selectedFlow!.description || '',
                    triggerType: selectedFlow!.trigger_type || 'webhook',
                    nodes: convertToEditorNodes(selectedFlow!.nodes || []),
                    edges: selectedFlow!.edges?.map((edge, index) => ({
                      id: `edge_${index}`,
                      source: edge.source,
                      target: edge.target,
                    })) || [],
                  }}
                  onSave={async (flow) => {
                    try {
                      const result = await updateFlowDefinition(selectedFlow!.id, {
                        name: flow.name,
                        description: flow.description,
                        status: selectedFlow!.status,
                        trigger_type: flow.triggerType,
                        trigger_config: selectedFlow!.trigger_config || {},
                        version: selectedFlow!.version || '1.0.0',
                        nodes: convertToBackendNodes(flow.nodes),
                        edges: convertToBackendEdges(flow.edges),
                      });

                      if (result.success) {
                        await loadFlows();
                        setEditorDialog({ ...editorDialog, isOpen: false });
                        setSelectedFlow(null);
                        toast({
                          title: '流程更新成功',
                          description: `流程 "${flow.name}" 已更新`,
                        });
                      } else {
                        throw new Error(result.error || '更新失败');
                      }
                    } catch (error) {
                      console.error('更新流程失败:', error);
                      toast({
                        variant: 'destructive',
                        title: '更新失败',
                        description: error instanceof Error ? error.message : '未知错误',
                      });
                      throw error;
                    }
                  }}
                  onClose={() => {
                    setEditorDialog({ ...editorDialog, isOpen: false });
                    setSelectedFlow(null);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 查看详情对话框 */}
      {isDetailDialogOpen && selectedFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-blue-500" />
                  {selectedFlow.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  流程详情与配置编辑
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsDetailDialogOpen(false);
                  setSelectedFlow(null);
                  setEditingJson('');
                  setIsJsonValid(true);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-hidden flex">
              {/* 左侧：属性编辑 */}
              <div className="w-1/2 border-r overflow-y-auto p-6 space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">基本信息</Label>
                  
                  <div className="grid gap-3">
                    <div>
                      <Label htmlFor="flow-name" className="text-xs">流程名称</Label>
                      <Input
                        id="flow-name"
                        value={selectedFlow.name}
                        onChange={(e) => setSelectedFlow({ ...selectedFlow, name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="flow-description" className="text-xs">描述</Label>
                      <Textarea
                        id="flow-description"
                        value={selectedFlow.description || ''}
                        onChange={(e) => setSelectedFlow({ ...selectedFlow, description: e.target.value })}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="flow-version" className="text-xs">版本</Label>
                        <Input
                          id="flow-version"
                          value={selectedFlow.version || '1.0.0'}
                          onChange={(e) => setSelectedFlow({ ...selectedFlow, version: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="flow-status" className="text-xs">状态</Label>
                        <Select
                          value={selectedFlow.status || 'active'}
                          onValueChange={(value) => setSelectedFlow({ ...selectedFlow, status: value as any })}
                        >
                          <SelectTrigger id="flow-status" className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">运行中</SelectItem>
                            <SelectItem value="inactive">已停用</SelectItem>
                            <SelectItem value="draft">草稿</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="flow-trigger" className="text-xs">触发类型</Label>
                        <Select
                          value={selectedFlow.trigger_type || 'webhook'}
                          onValueChange={(value) => setSelectedFlow({ ...selectedFlow, trigger_type: value as any })}
                        >
                          <SelectTrigger id="flow-trigger" className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TRIGGER_TYPE_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs">执行次数</Label>
                        <div className="mt-1 text-sm">{selectedFlow.execution_count || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">节点列表 ({selectedFlow.nodes?.length || 0})</Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedFlow.nodes && selectedFlow.nodes.length > 0 ? selectedFlow.nodes.map((node, index) => {
                      const config = getNodeTypeConfig(node.type);
                      const Icon = config?.icon || Box;
                      return (
                        <Card key={node.id} className="p-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${config?.color || 'text-gray-500'} border-current`}>
                              {index + 1}
                            </Badge>
                            <Icon className={`h-4 w-4 ${config?.color || 'text-gray-500'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {node.data?.name || node.name || node.id || '未命名节点'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {config?.label || node.type}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    }) : (
                      <div className="text-sm text-muted-foreground p-3 border rounded-lg">
                        暂无节点
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">时间信息</Label>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">创建时间:</span>
                      <div className="mt-1">{formatTime(selectedFlow.created_at)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">更新时间:</span>
                      <div className="mt-1">{formatTime(selectedFlow.updated_at)}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 右侧：JSON编辑器 */}
              <div className="w-1/2 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-slate-600" />
                    <span className="font-semibold text-sm">JSON 编辑器</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isJsonValid ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        有效
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-600">
                        <XCircle className="w-3 h-3" />
                        无效
                      </span>
                    )}
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      格式化
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      压缩
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden p-4">
                  <textarea
                    value={editingJson}
                    onChange={(e) => {
                      setEditingJson(e.target.value);
                      try {
                        JSON.parse(e.target.value);
                        setIsJsonValid(true);
                      } catch {
                        setIsJsonValid(false);
                      }
                    }}
                    className={`w-full h-full font-mono text-xs p-3 rounded-lg border-2 resize-none overflow-auto ${
                      isJsonValid ? 'border-slate-200 focus:border-blue-500' : 'border-red-500 focus:border-red-500'
                    }`}
                    placeholder="流程定义的 JSON..."
                  />
                </div>
                <div className="p-3 bg-blue-50 text-xs text-blue-700">
                  💡 提示：编辑 JSON 后点击"保存"按钮。确保 JSON 格式正确，否则无法保存。
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailDialogOpen(false);
                  setSelectedFlow(null);
                  setEditingJson('');
                }}
              >
                取消
              </Button>
              <Button
                onClick={async () => {
                  // 如果JSON有效，从JSON更新
                  if (isJsonValid && editingJson) {
                    try {
                      const parsedJson = JSON.parse(editingJson);
                      await handleUpdateFlowProperties({
                        name: parsedJson.name,
                        description: parsedJson.description,
                        version: parsedJson.version,
                        status: parsedJson.status,
                        trigger_type: parsedJson.trigger_type,
                        nodes: parsedJson.nodes,
                        edges: parsedJson.edges,
                        variables: parsedJson.variables,
                        timeout: parsedJson.timeout,
                        retryConfig: parsedJson.retryConfig,
                      });
                    } catch (error) {
                      toast({
                        variant: "destructive",
                        title: "JSON解析失败",
                        description: error instanceof Error ? error.message : '未知错误',
                      });
                      return;
                    }
                  } else {
                    // 否则从表单字段更新
                    await handleUpdateFlowProperties({
                      name: selectedFlow.name,
                      description: selectedFlow.description,
                      version: selectedFlow.version,
                      status: selectedFlow.status,
                      trigger_type: selectedFlow.trigger_type,
                    });
                  }
                  setIsDetailDialogOpen(false);
                  setSelectedFlow(null);
                  setEditingJson('');
                }}
                disabled={!isJsonValid}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                保存更改
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
