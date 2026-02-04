'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Database,
  Code,
  AlertTriangle,
  FileText
} from 'lucide-react';

// 流程节点类型
type NodeType = 
  | 'start'
  | 'message_input'
  | 'intent_recognition'
  | 'condition'
  | 'ai_response'
  | 'template_response'
  | 'human_handoff'
  | 'end';

interface FlowNode {
  id: string;
  type: NodeType;
  name: string;
  config?: Record<string, any>;
}

interface FlowExecution {
  id: string;
  flow_id: string;
  flow_name: string;
  session_id: string;
  status: 'running' | 'completed' | 'failed';
  current_node?: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

interface Flow {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: 'active' | 'inactive' | 'draft';
  nodes: FlowNode[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  execution_count?: number;
  success_rate?: string;
}

// 节点类型配置
const NODE_TYPE_CONFIG: Record<NodeType, { icon: any; color: string; label: string }> = {
  start: { icon: Play, color: 'text-green-500', label: '开始' },
  message_input: { icon: MessageSquare, color: 'text-blue-500', label: '消息输入' },
  intent_recognition: { icon: Brain, color: 'text-purple-500', label: '意图识别' },
  condition: { icon: GitBranch, color: 'text-orange-500', label: '条件分支' },
  ai_response: { icon: Zap, color: 'text-yellow-500', label: 'AI响应' },
  template_response: { icon: FileText, color: 'text-cyan-500', label: '模板响应' },
  human_handoff: { icon: Settings, color: 'text-red-500', label: '人工接管' },
  end: { icon: CheckCircle, color: 'text-green-500', label: '结束' }
};

export default function FlowEngineManage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [executions, setExecutions] = useState<FlowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'flows' | 'executions'>('flows');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // 加载流程列表（Mock数据）
  const loadFlows = async () => {
    setIsLoading(true);
    try {
      // TODO: 替换为真实API调用
      // const res = await fetch('/api/flow-engine/flows');
      // if (res.ok) {
      //   const data = await res.json();
      //   setFlows(data.data || []);
      // }
      
      // Mock数据
      setFlows([
        {
          id: 'flow-1',
          name: '智能客服主流程',
          description: '处理用户咨询、问题解答、转人工等完整客服流程',
          version: 3,
          status: 'active',
          nodes: [
            { id: 'node-1', type: 'start', name: '开始' },
            { id: 'node-2', type: 'message_input', name: '接收用户消息' },
            { id: 'node-3', type: 'intent_recognition', name: '意图识别' },
            { id: 'node-4', type: 'condition', name: '条件判断' },
            { id: 'node-5', type: 'ai_response', name: 'AI智能回复' },
            { id: 'node-6', type: 'end', name: '结束' }
          ],
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: 'admin',
          execution_count: 1250,
          success_rate: '98.5'
        },
        {
          id: 'flow-2',
          name: '产品咨询流程',
          description: '专门处理产品相关咨询的流程',
          version: 1,
          status: 'active',
          nodes: [
            { id: 'node-1', type: 'start', name: '开始' },
            { id: 'node-2', type: 'message_input', name: '接收产品咨询' },
            { id: 'node-3', type: 'intent_recognition', name: '识别产品类型' },
            { id: 'node-4', type: 'template_response', name: '返回产品信息' },
            { id: 'node-5', type: 'end', name: '结束' }
          ],
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: 'admin',
          execution_count: 320,
          success_rate: '95.2'
        },
        {
          id: 'flow-3',
          name: '售后服务流程',
          description: '处理售后问题和投诉的流程',
          version: 2,
          status: 'draft',
          nodes: [
            { id: 'node-1', type: 'start', name: '开始' },
            { id: 'node-2', type: 'message_input', name: '接收售后请求' },
            { id: 'node-3', type: 'intent_recognition', name: '识别问题类型' },
            { id: 'node-4', type: 'condition', name: '严重程度判断' },
            { id: 'node-5', type: 'human_handoff', name: '转人工处理' },
            { id: 'node-6', type: 'end', name: '结束' }
          ],
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: 'admin',
          execution_count: 0,
          success_rate: '0.0'
        }
      ]);
    } catch (error) {
      console.error('加载流程列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载执行记录（Mock数据）
  const loadExecutions = async () => {
    try {
      // TODO: 替换为真实API调用
      // const res = await fetch('/api/flow-engine/executions?limit=20');
      // if (res.ok) {
      //   const data = await res.json();
      //   setExecutions(data.data || []);
      // }
      
      // Mock数据
      setExecutions([
        {
          id: 'exec-1',
          flow_id: 'flow-1',
          flow_name: '智能客服主流程',
          session_id: 'session-123',
          status: 'running',
          current_node: 'ai_response',
          started_at: new Date(Date.now() - 30 * 1000).toISOString()
        },
        {
          id: 'exec-2',
          flow_id: 'flow-1',
          flow_name: '智能客服主流程',
          session_id: 'session-456',
          status: 'completed',
          current_node: 'end',
          started_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 1 * 60 * 1000).toISOString()
        },
        {
          id: 'exec-3',
          flow_id: 'flow-2',
          flow_name: '产品咨询流程',
          session_id: 'session-789',
          status: 'completed',
          current_node: 'end',
          started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 4 * 60 * 1000).toISOString()
        }
      ]);
    } catch (error) {
      console.error('加载执行记录失败:', error);
    }
  };

  useEffect(() => {
    loadFlows();
    loadExecutions();
    
    // 自动刷新
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadFlows();
        loadExecutions();
      }, 15000); // 每15秒刷新
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // 切换流程状态
  const toggleFlowStatus = async (flowId: string, newStatus: 'active' | 'inactive') => {
    try {
      // TODO: 替换为真实API调用
      // const res = await fetch(`/api/flow-engine/flows/${flowId}/status`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status: newStatus })
      // });
      // if (res.ok) {
      //   loadFlows();
      // }
      
      // Mock更新
      setFlows(flows.map(flow => 
        flow.id === flowId ? { ...flow, status: newStatus } : flow
      ));
    } catch (error) {
      console.error('切换流程状态失败:', error);
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
              loadExecutions();
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
          流程列表
        </button>
        <button
          onClick={() => setActiveTab('executions')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'executions'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="h-4 w-4 inline mr-2" />
          执行记录
        </button>
      </div>

      {/* 流程列表 */}
      {activeTab === 'flows' && (
        <div className="grid gap-4">
          {flows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {isLoading ? '加载中...' : '暂无流程'}
                </p>
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
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        查看详情
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        编辑
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 流程节点预览 */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {flow.nodes.map((node, index) => {
                        const config = NODE_TYPE_CONFIG[node.type];
                        const Icon = config.icon;
                        return (
                          <React.Fragment key={node.id}>
                            {index > 0 && (
                              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <Badge
                              variant="outline"
                              className={`gap-1 flex-shrink-0 ${config.color} border-current`}
                            >
                              <Icon className="h-3 w-3" />
                              {node.name}
                            </Badge>
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* 统计信息 */}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span>执行次数: {flow.execution_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>成功率: {flow.success_rate || '0.0'}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>更新于: {formatTime(flow.updated_at)}</span>
                      </div>
                      {flow.created_by && (
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          <span>创建者: {flow.created_by}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* 执行记录 */}
      {activeTab === 'executions' && (
        <Card>
          <CardHeader>
            <CardTitle>执行记录</CardTitle>
            <CardDescription>
              显示最近的流程执行情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {executions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {isLoading ? '加载中...' : '暂无执行记录'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {executions.map((execution) => {
                    const flow = flows.find(f => f.id === execution.flow_id);
                    const nodeConfig = execution.current_node 
                      ? NODE_TYPE_CONFIG[flow?.nodes.find(n => n.id === execution.current_node)?.type || 'start']
                      : null;
                    const NodeIcon = nodeConfig?.icon;
                    
                    return (
                      <Card key={execution.id} className="hover:border-primary/40 transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {execution.flow_name}
                                </Badge>
                                {execution.status === 'running' ? (
                                  <Badge variant="outline" className="gap-1 border-blue-500 text-blue-500">
                                    <Activity className="h-3 w-3 animate-pulse" />
                                    运行中
                                  </Badge>
                                ) : execution.status === 'completed' ? (
                                  <Badge variant="outline" className="gap-1 border-green-500 text-green-500">
                                    <CheckCircle className="h-3 w-3" />
                                    已完成
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="gap-1">
                                    <XCircle className="h-3 w-3" />
                                    失败
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm">
                                <div className="text-muted-foreground">
                                  会话ID: {execution.session_id}
                                </div>
                                {execution.current_node && (
                                  <div className="flex items-center gap-2 mt-1 text-primary">
                                    <NodeIcon className="h-3 w-3" />
                                    当前节点: {execution.current_node}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(execution.started_at)}
                              </div>
                              {execution.completed_at && (
                                <div className="text-xs mt-0.5">
                                  完成: {formatTime(execution.completed_at)}
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
              <div>
                <label className="text-sm font-medium">流程名称</label>
                <input
                  type="text"
                  placeholder="输入流程名称"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium">流程描述</label>
                <textarea
                  placeholder="输入流程描述"
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  💡 提示: 完整的可视化流程编排器正在开发中，目前支持通过配置JSON创建流程。
                </p>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button variant="default">
                创建流程
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
