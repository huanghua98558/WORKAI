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
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

// 节点类型枚举 - 匹配后端 NodeType
const NodeType = {
  START: 'start',
  END: 'end',
  CONDITION: 'condition',
  AI_CHAT: 'ai_chat',
  INTENT: 'intent',
  SERVICE: 'service',
  HUMAN_HANDOVER: 'human_handover',
  NOTIFICATION: 'notification'
} as const;

type NodeTypeValue = typeof NodeType[keyof typeof NodeType];

// 流程状态枚举 - 匹配后端 FlowStatus
const FlowStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout'
} as const;

// 触发类型枚举 - 匹配后端 TriggerType
const TriggerType = {
  WEBHOOK: 'webhook',
  MANUAL: 'manual',
  SCHEDULED: 'scheduled'
} as const;

// 节点类型配置
const NODE_TYPE_CONFIG: Record<NodeTypeValue, { icon: any; color: string; label: string }> = {
  start: { icon: Play, color: 'text-green-500', label: '开始' },
  end: { icon: CheckCircle, color: 'text-green-500', label: '结束' },
  condition: { icon: GitBranch, color: 'text-orange-500', label: '条件分支' },
  ai_chat: { icon: Zap, color: 'text-yellow-500', label: 'AI对话' },
  intent: { icon: Brain, color: 'text-purple-500', label: '意图识别' },
  service: { icon: Settings, color: 'text-blue-500', label: '服务节点' },
  human_handover: { icon: Users, color: 'text-red-500', label: '人工转接' },
  notification: { icon: Bell, color: 'text-cyan-500', label: '通知节点' }
};

// 触发类型配置
const TRIGGER_TYPE_CONFIG: Record<string, { label: string; description: string }> = {
  webhook: { label: 'Webhook触发', description: '通过HTTP请求触发流程' },
  manual: { label: '手动触发', description: '手动启动流程' },
  scheduled: { label: '定时触发', description: '按预定时间触发流程' }
};

export default function FlowEngineManage() {
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [instances, setInstances] = useState<FlowInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<FlowDefinition | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'flows' | 'instances'>('flows');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { toast } = useToast();

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft' as 'active' | 'inactive' | 'draft',
    trigger_type: 'webhook' as 'webhook' | 'manual' | 'scheduled',
    trigger_config: {} as Record<string, any>,
    nodes: [] as FlowNode[],
  });

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
        setFormData({
          name: result.data.name,
          description: result.data.description || '',
          status: result.data.status,
          trigger_type: result.data.trigger_type || 'webhook',
          trigger_config: result.data.trigger_config || {},
          nodes: result.data.nodes || [],
        });
        setIsEditDialogOpen(true);
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

  // 创建流程
  const handleCreateFlow = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "验证失败",
        description: "请输入流程名称",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createFlowDefinition({
        name: formData.name,
        description: formData.description,
        status: formData.status,
        trigger_type: formData.trigger_type,
        trigger_config: formData.trigger_config,
        nodes: formData.nodes,
      });

      if (result.success) {
        setFlows([result.data!, ...flows]);
        setIsCreateDialogOpen(false);
        setFormData({
          name: '',
          description: '',
          status: 'draft',
          trigger_type: 'webhook',
          trigger_config: {},
          nodes: [],
        });
        toast({
          title: "创建成功",
          description: "流程已创建",
        });
      } else {
        toast({
          title: "创建失败",
          description: result.error || '创建流程失败',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('创建流程失败:', error);
      toast({
        title: "创建失败",
        description: '创建流程失败',
        variant: "destructive",
      });
    }
  };

  // 更新流程
  const handleUpdateFlow = async () => {
    if (!selectedFlow || !formData.name.trim()) {
      toast({
        title: "验证失败",
        description: "请输入流程名称",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await updateFlowDefinition(selectedFlow.id, {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        trigger_type: formData.trigger_type,
        trigger_config: formData.trigger_config,
        nodes: formData.nodes,
      });

      if (result.success) {
        setFlows(flows.map(flow => 
          flow.id === selectedFlow.id ? result.data! : flow
        ));
        setIsEditDialogOpen(false);
        setSelectedFlow(null);
        toast({
          title: "更新成功",
          description: "流程已更新",
        });
      } else {
        toast({
          title: "更新失败",
          description: result.error || '更新流程失败',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('更新流程失败:', error);
      toast({
        title: "更新失败",
        description: '更新流程失败',
        variant: "destructive",
      });
    }
  };

  // 获取状态图标
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
            variant="default"
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            创建流程
          </Button>
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('flows')}
          className={`px-4 py-2 font-medium transition-colors ${
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
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'instances'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="h-4 w-4 inline mr-2" />
          执行记录 ({instances.length})
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
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
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
                    <div className="flex gap-2">
                      {flow.status === 'active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleFlowStatus(flow.id, 'inactive')}
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          停用
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleFlowStatus(flow.id, 'active')}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          启用
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openDetailDialog(flow.id)}>
                        <Eye className="h-4 w-4 mr-1" />
                        查看详情
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(flow.id)}>
                        <Edit className="h-4 w-4 mr-1" />
                        编辑
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteFlow(flow.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        删除
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 流程节点预览 */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {flow.nodes && flow.nodes.length > 0 ? flow.nodes.map((node, index) => {
                        const config = NODE_TYPE_CONFIG[node.type as NodeTypeValue];
                        const Icon = config?.icon || Box;
                        return (
                          <React.Fragment key={node.id}>
                            {index > 0 && (
                              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <Badge
                              variant="outline"
                              className={`gap-1 flex-shrink-0 ${config?.color || 'text-gray-500'} border-current`}
                            >
                              <Icon className="h-3 w-3" />
                              {node.name}
                            </Badge>
                          </React.Fragment>
                        );
                      }) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Box className="h-3 w-3 mr-1" />
                          暂无节点
                        </Badge>
                      )}
                    </div>

                    {/* 统计信息 */}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span>执行次数: {flow.execution_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>成功率: {flow.success_rate ? `${flow.success_rate}%` : '0.0%'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>更新于: {formatTime(flow.updated_at)}</span>
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
                    const nodeConfig = instance.current_node 
                      ? NODE_TYPE_CONFIG[flow?.nodes?.find(n => n.id === instance.current_node)?.type as NodeTypeValue || 'start']
                      : null;
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
                                {instance.current_node && (
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

      {/* 创建流程对话框 */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>创建新流程</CardTitle>
              <CardDescription>
                创建一个新的业务流程，支持可视化编排
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flow-name">流程名称 *</Label>
                <Input
                  id="flow-name"
                  placeholder="输入流程名称"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flow-description">流程描述</Label>
                <Textarea
                  id="flow-description"
                  placeholder="输入流程描述"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flow-trigger">触发类型</Label>
                <select
                  id="flow-trigger"
                  value={formData.trigger_type}
                  onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value as any })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="webhook">Webhook触发</option>
                  <option value="manual">手动触发</option>
                  <option value="scheduled">定时触发</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {TRIGGER_TYPE_CONFIG[formData.trigger_type]?.description}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  可用节点类型:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <Badge key={type} variant="outline" className={`gap-1 ${config.color} border-current`}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  💡 提示: 完整的可视化流程编排器正在开发中，目前支持通过配置JSON创建流程。流程创建后，可以在编辑页面添加节点和配置流程逻辑。
                </p>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                setFormData({
                  name: '',
                  description: '',
                  status: 'draft',
                  trigger_type: 'webhook',
                  trigger_config: {},
                  nodes: [],
                });
              }}>
                取消
              </Button>
              <Button onClick={handleCreateFlow} disabled={!formData.name.trim()}>
                <Save className="h-4 w-4 mr-2" />
                创建流程
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 编辑流程对话框 */}
      {isEditDialogOpen && selectedFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>编辑流程</CardTitle>
              <CardDescription>
                编辑流程配置和节点
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-flow-name">流程名称 *</Label>
                <Input
                  id="edit-flow-name"
                  placeholder="输入流程名称"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-flow-description">流程描述</Label>
                <Textarea
                  id="edit-flow-description"
                  placeholder="输入流程描述"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-flow-status">流程状态</Label>
                <select
                  id="edit-flow-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="draft">草稿</option>
                  <option value="active">运行中</option>
                  <option value="inactive">已停用</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-flow-trigger">触发类型</Label>
                <select
                  id="edit-flow-trigger"
                  value={formData.trigger_type}
                  onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value as any })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="webhook">Webhook触发</option>
                  <option value="manual">手动触发</option>
                  <option value="scheduled">定时触发</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {TRIGGER_TYPE_CONFIG[formData.trigger_type]?.description}
                </p>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedFlow(null);
              }}>
                取消
              </Button>
              <Button onClick={handleUpdateFlow} disabled={!formData.name.trim()}>
                <Save className="h-4 w-4 mr-2" />
                保存更改
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 查看详情对话框 */}
      {isDetailDialogOpen && selectedFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedFlow.name}</CardTitle>
                  <CardDescription>
                    流程详情和配置信息
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    setSelectedFlow(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 基本信息 */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">基本信息</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">版本:</span>
                    <span className="ml-2">{selectedFlow.version}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">状态:</span>
                    <span className="ml-2">{getStatusBadge(selectedFlow.status)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">触发类型:</span>
                    <span className="ml-2">{TRIGGER_TYPE_CONFIG[selectedFlow.trigger_type]?.label || selectedFlow.trigger_type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">执行次数:</span>
                    <span className="ml-2">{selectedFlow.execution_count || 0}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">描述:</span>
                    <p className="ml-2 mt-1">{selectedFlow.description || '暂无描述'}</p>
                  </div>
                </div>
              </div>

              {/* 节点列表 */}
              {selectedFlow.nodes && selectedFlow.nodes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">节点列表 ({selectedFlow.nodes.length})</h4>
                  <div className="space-y-2">
                    {selectedFlow.nodes.map((node, index) => {
                      const config = NODE_TYPE_CONFIG[node.type as NodeTypeValue];
                      const Icon = config?.icon || Box;
                      return (
                        <Card key={node.id} className="p-3">
                          <div className="flex items-center gap-3">
                            <Badge className={`${config?.color || 'text-gray-500'} border-current`} variant="outline">
                              {index + 1}
                            </Badge>
                            <Icon className={`h-5 w-5 ${config?.color || 'text-gray-500'}`} />
                            <div className="flex-1">
                              <div className="font-medium">{node.name}</div>
                              <div className="text-sm text-muted-foreground">
                                类型: {config?.label || node.type}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 时间信息 */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">时间信息</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">创建时间:</span>
                    <span className="ml-2">{formatTime(selectedFlow.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">更新时间:</span>
                    <span className="ml-2">{formatTime(selectedFlow.updated_at)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
