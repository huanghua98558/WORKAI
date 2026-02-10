'use client';

/**
 * 增强的节点属性配置面板
 * 支持多种节点类型的详细参数化配置
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Settings,
  MessageSquare,
  Brain,
  AlertTriangle,
  User,
  Send,
  Database,
  Bell,
  X,
  Trash2,
  Info,
  Zap,
  Clock,
  Target,
  FileText,
  Users,
  Bot,
  MessageCircle,
  Heart,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Node } from 'reactflow';
import { FlowNode } from '@/components/flow-engine-editor';

// AI 模型提供商
export type AIProvider = 'doubao' | 'deepseek' | 'kimi';

// 基础节点数据接口
export interface BaseNodeConfig {
  id: string;
  type: string;
  label: string;
  description?: string;
  enabled: boolean;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
  timeout?: number;
  notes?: string;
}

// 意图识别配置
export interface IntentRecognitionConfig extends BaseNodeConfig {
  type: 'intent_recognition';
  config: {
    enabled: boolean;
    intentTypes: ('daily_chat' | 'after_sales' | 'complaint' | 'query')[];
    confidenceThreshold: number;
    useHistory: boolean;
    historyCount: number;
    promptTemplate?: string;
  };
}

// 情感分析配置
export interface SentimentAnalysisConfig extends BaseNodeConfig {
  type: 'sentiment_analysis';
  config: {
    enabled: boolean;
    sentimentTypes: ('positive' | 'neutral' | 'negative')[];
    intensityThresholds: {
      low: number;
      medium: number;
      high: number;
    };
    useEmoji: boolean;
    promptTemplate?: string;
  };
}

// 告警判断配置
export interface AlertJudgmentConfig extends BaseNodeConfig {
  type: 'alert_judgment';
  config: {
    enabled: boolean;
    alertLevels: ('P0' | 'P1' | 'P2' | 'P3')[];
    alertTypes: ('user_complaint' | 'after_sales' | 'low_satisfaction' | 'frequent_complaint' | 'human_intervention_request' | 'system_error')[];
    responseTimes: {
      P0: number;
      P1: number;
      P2: number;
      P3: number;
    };
    escalationRules: {
      enabled: boolean;
      escalationTimes: {
        P0: number;
        P1: number;
        P2: number;
      };
    };
  };
}

// 介入判断配置
export interface InterventionJudgmentConfig extends BaseNodeConfig {
  type: 'intervention_judgment';
  config: {
    enabled: boolean;
    conditions: {
      consecutiveNegativeCount: number;
      maxSatisfactionScore: number;
      minComplaintCount: number;
      requireHumanService: boolean;
      aiConfidenceThreshold: number;
      maxConversationRounds: number;
    };
  };
}

// 回复生成配置
export interface ReplyGenerationConfig extends BaseNodeConfig {
  type: 'reply_generation';
  config: {
    enabled: boolean;
    strategy: 'daily_chat' | 'query' | 'after_sales' | 'complaint' | 'auto';
    aiProvider: AIProvider;
    model: string;
    temperature: number;
    maxTokens: number;
    personalization: boolean;
    promptTemplate?: string;
  };
}

// 上下文检索配置
export interface ContextRetrievalConfig extends BaseNodeConfig {
  type: 'context_retrieval';
  config: {
    enabled: boolean;
    retrievalStrategy: 'recent' | 'relevant' | 'hybrid';
    historyCount: number;
    includeUserSession: boolean;
    includeGroupSession: boolean;
    includeUserProfile: boolean;
    includeAfterSalesTasks: boolean;
    maxHistoryLength: number;
  };
}

// 消息发送配置
export interface MessageSendConfig extends BaseNodeConfig {
  type: 'message_send';
  config: {
    enabled: boolean;
    robotSelection: {
      strategy: 'priority' | 'load' | 'health' | 'type';
      preferredRobotTypes: ('main_bot' | 'after_sales_bot' | 'emergency_bot' | 'backup_bot')[];
    };
    delayStrategy: {
      baseDelay: number;
      randomFactor: number;
      priorityAdjustment: {
        P0: number;
        P1: number;
        P2: number;
        P3: number;
      };
      intentAdjustment: {
        complaint: number;
        after_sales: number;
        query: number;
        daily_chat: number;
      };
      sentimentAdjustment: {
        negative_high: number;
        negative_medium: number;
        negative_low: number;
      };
    };
    retryConfig: {
      maxRetries: number;
      retryDelay: number;
    };
  };
}

// 售后任务配置
export interface AfterSalesTaskConfig extends BaseNodeConfig {
  type: 'after_sales_task';
  config: {
    enabled: boolean;
    taskTypes: ('refund' | 'product_issue' | 'service_issue' | 'order_issue' | 'other')[];
    defaultPriority: 'P0' | 'P1' | 'P2' | 'P3';
    autoAssignment: boolean;
    assignmentStrategy: 'load_balance' | 'skill_based' | 'priority_based';
    syncToTencentDocs: boolean;
    collaborationTeam?: string[];
  };
}

// 通用节点配置
export interface GeneralNodeConfig extends BaseNodeConfig {
  type: string;
  config?: Record<string, any>;
}

export type NodeConfig =
  | IntentRecognitionConfig
  | SentimentAnalysisConfig
  | AlertJudgmentConfig
  | InterventionJudgmentConfig
  | ReplyGenerationConfig
  | ContextRetrievalConfig
  | MessageSendConfig
  | AfterSalesTaskConfig
  | GeneralNodeConfig;

interface NodeConfigPanelProps {
  node: FlowNode | null;
  onUpdate: (nodeId: string, updates: Partial<FlowNode>) => void;
  onDelete?: (nodeId: string) => void;
  onClose?: () => void;
}

// 默认配置模板
const defaultConfigs: Record<string, any> = {
  intent_recognition: {
    enabled: true,
    intentTypes: ['daily_chat', 'after_sales', 'complaint', 'query'],
    confidenceThreshold: 0.7,
    useHistory: true,
    historyCount: 5,
  },
  sentiment_analysis: {
    enabled: true,
    sentimentTypes: ['positive', 'neutral', 'negative'],
    intensityThresholds: {
      low: 30,
      medium: 60,
      high: 80,
    },
    useEmoji: true,
  },
  alert_judgment: {
    enabled: true,
    alertLevels: ['P0', 'P1', 'P2', 'P3'],
    alertTypes: ['user_complaint', 'after_sales', 'low_satisfaction', 'frequent_complaint', 'human_intervention_request', 'system_error'],
    responseTimes: {
      P0: 5,
      P1: 15,
      P2: 30,
      P3: 60,
    },
    escalationRules: {
      enabled: true,
      escalationTimes: {
        P0: 15,
        P1: 30,
        P2: 60,
      },
    },
  },
  intervention_judgment: {
    enabled: true,
    conditions: {
      consecutiveNegativeCount: 3,
      maxSatisfactionScore: 40,
      minComplaintCount: 2,
      requireHumanService: false,
      aiConfidenceThreshold: 0.5,
      maxConversationRounds: 10,
    },
  },
  reply_generation: {
    enabled: true,
    strategy: 'auto',
    aiProvider: 'doubao',
    model: 'doubao-pro',
    temperature: 0.7,
    maxTokens: 500,
    personalization: true,
  },
  context_retrieval: {
    enabled: true,
    retrievalStrategy: 'recent',
    historyCount: 10,
    includeUserSession: true,
    includeGroupSession: true,
    includeUserProfile: true,
    includeAfterSalesTasks: true,
    maxHistoryLength: 50,
  },
  message_send: {
    enabled: true,
    robotSelection: {
      strategy: 'priority',
      preferredRobotTypes: ['main_bot', 'after_sales_bot', 'emergency_bot', 'backup_bot'],
    },
    delayStrategy: {
      baseDelay: 5,
      randomFactor: 0.2,
      priorityAdjustment: {
        P0: 1,
        P1: 2,
        P2: 3,
        P3: 5,
      },
      intentAdjustment: {
        complaint: 1,
        after_sales: 2,
        query: 3,
        daily_chat: 5,
      },
      sentimentAdjustment: {
        negative_high: 1,
        negative_medium: 2,
        negative_low: 3,
      },
    },
    retryConfig: {
      maxRetries: 3,
      retryDelay: 5,
    },
  },
  after_sales_task: {
    enabled: true,
    taskTypes: ['refund', 'product_issue', 'service_issue', 'order_issue', 'other'],
    defaultPriority: 'P2',
    autoAssignment: true,
    assignmentStrategy: 'skill_based',
    syncToTencentDocs: true,
  },
};

export default function NodeConfigPanel({ node, onUpdate, onDelete, onClose }: NodeConfigPanelProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<NodeConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 初始化配置
  useEffect(() => {
    if (node) {
      const defaultConfig = defaultConfigs[node.data.type] || {};
      setConfig({
        id: node.id,
        type: node.data.type,
        label: node.data.label || node.data.type,
        enabled: node.data.enabled !== false,
        config: node.data.config || defaultConfig,
        description: node.data.description,
        timeout: node.data.timeout,
        notes: node.data.notes,
      } as NodeConfig);
      setHasChanges(false);
    }
  }, [node]);

  // 更新配置
  const handleUpdateConfig = (updates: Partial<NodeConfig>) => {
    if (!node || !config) return;

    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setHasChanges(true);

    // 实时更新节点数据
    onUpdate(node.id, {
      data: {
        ...node.data,
        ...updates,
      },
    });
  };

  // 保存配置
  const handleSave = () => {
    if (!node || !config) return;

    onUpdate(node.id, {
      data: {
        ...node.data,
        ...config,
      },
    });

    setHasChanges(false);
    toast({
      title: "配置已保存",
      description: "节点属性配置已更新",
    });
  };

  // 删除节点
  const handleDelete = () => {
    if (!node || !onDelete) return;

    if (window.confirm('确定要删除这个节点吗？')) {
      onDelete(node.id);
      toast({
        title: "节点已删除",
        description: `节点 ${node.data.label} 已被删除`,
      });
      if (onClose) onClose();
    }
  };

  // 渲染节点类型特定的配置表单
  const renderConfigForm = () => {
    if (!node || !config) return null;

    const nodeType = node.data.type; // 实际的节点类型（如 'multi_task_ai'）
    const subType = node.data.config?.subType || node.data.config?.operation; // 子类型

    // 新的统一节点类型（v6.1）
    switch (nodeType) {
      // AI 处理多任务 - 包含意图识别、情感分析、回复生成等
      case 'multi_task_ai':
        if (subType === 'intent_recognition') {
          return <IntentRecognitionForm config={config as IntentRecognitionConfig} onUpdate={handleUpdateConfig} />;
        } else if (subType === 'sentiment_analysis') {
          return <SentimentAnalysisForm config={config as SentimentAnalysisConfig} onUpdate={handleUpdateConfig} />;
        } else if (subType === 'reply_generation') {
          return <ReplyGenerationForm config={config as ReplyGenerationConfig} onUpdate={handleUpdateConfig} />;
        } else {
          // 默认显示 AI 配置选项
          return <MultiTaskAIForm config={config as GeneralNodeConfig} onUpdate={handleUpdateConfig} subType={subType} />;
        }

      // 消息管理多任务 - 包含消息接收、发送、分发等
      case 'multi_task_message':
        if (subType === 'message_send') {
          return <MessageSendForm config={config as MessageSendConfig} onUpdate={handleUpdateConfig} />;
        } else if (subType === 'message_receive') {
          return <MessageReceiveForm config={config as GeneralNodeConfig} onUpdate={handleUpdateConfig} />;
        } else {
          return <MultiTaskMessageForm config={config as GeneralNodeConfig} onUpdate={handleUpdateConfig} subType={subType} />;
        }

      // 告警管理多任务 - 包含告警判断、升级等
      case 'multi_task_alert':
        if (subType === 'alert_judgment') {
          return <AlertJudgmentForm config={config as AlertJudgmentConfig} onUpdate={handleUpdateConfig} />;
        } else {
          return <MultiTaskAlertForm config={config as GeneralNodeConfig} onUpdate={handleUpdateConfig} subType={subType} />;
        }

      // 人员管理多任务 - 包含介入判断等
      case 'multi_task_staff':
        if (subType === 'intervention_judgment') {
          return <InterventionJudgmentForm config={config as InterventionJudgmentConfig} onUpdate={handleUpdateConfig} />;
        } else {
          return <MultiTaskStaffForm config={config as GeneralNodeConfig} onUpdate={handleUpdateConfig} subType={subType} />;
        }

      // 任务管理多任务 - 包含售后任务等
      case 'multi_task_task':
        if (subType === 'after_sales_task') {
          return <AfterSalesTaskForm config={config as AfterSalesTaskConfig} onUpdate={handleUpdateConfig} />;
        } else {
          return <MultiTaskTaskForm config={config as GeneralNodeConfig} onUpdate={handleUpdateConfig} subType={subType} />;
        }

      // 协同分析多任务
      case 'multi_task_analysis':
        return <MultiTaskAnalysisForm config={config as GeneralNodeConfig} onUpdate={handleUpdateConfig} subType={subType} />;

      // 机器人交互多任务
      case 'multi_task_robot':
        return <MultiTaskRobotForm config={config as GeneralNodeConfig} onUpdate={handleUpdateConfig} subType={subType} />;

      // 上下文节点
      case 'context':
        if (subType === 'context_retrieval') {
          return <ContextRetrievalForm config={config as ContextRetrievalConfig} onUpdate={handleUpdateConfig} />;
        }
        return <ContextForm config={config as GeneralNodeConfig} onUpdate={handleUpdateConfig} subType={subType} />;

      // 决策节点
      case 'decision':
        return <DecisionForm config={config as GeneralNodeConfig} onUpdate={handleUpdateConfig} />;

      // 默认：显示通用配置
      default:
        return <GeneralConfigForm config={config} onUpdate={handleUpdateConfig} />;
    }
  };

  // 获取节点类型图标
  const getNodeIcon = (type: string) => {
    const icons: Record<string, any> = {
      message_receive: MessageSquare,
      intent_recognition: Brain,
      sentiment_analysis: Heart,
      alert_judgment: AlertTriangle,
      intervention_judgment: Users,
      reply_generation: MessageCircle,
      context_retrieval: Database,
      message_send: Send,
      after_sales_task: Target,
      condition: Zap,
      save_data: Database,
      notify: Bell,
    };
    return icons[type] || Settings;
  };

  if (!node) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>请选择一个节点进行配置</p>
        </div>
      </div>
    );
  }

  const NodeIcon = getNodeIcon(config?.type || '');

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <NodeIcon className="h-5 w-5 text-primary flex-shrink-0" />
          <h3 className="font-semibold text-sm truncate">
            {config?.label || node.data.label || node.data.type}
          </h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 配置内容 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-4">
          {/* 基础配置 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                基础配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">节点名称</Label>
                <Input
                  id="label"
                  value={config?.label || ''}
                  onChange={(e) => handleUpdateConfig({ label: e.target.value })}
                  placeholder="输入节点名称"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">节点描述</Label>
                <Textarea
                  id="description"
                  value={config?.description || ''}
                  onChange={(e) => handleUpdateConfig({ description: e.target.value })}
                  placeholder="输入节点描述"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">启用节点</Label>
                <Switch
                  id="enabled"
                  checked={config?.enabled ?? true}
                  onCheckedChange={(checked) => handleUpdateConfig({ enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeout">超时时间（秒）</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={config?.timeout || 30}
                  onChange={(e) => handleUpdateConfig({ timeout: parseInt(e.target.value) })}
                  placeholder="30"
                  min={1}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">备注</Label>
                <Textarea
                  id="notes"
                  value={config?.notes || ''}
                  onChange={(e) => handleUpdateConfig({ notes: e.target.value })}
                  placeholder="添加备注信息"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* 节点类型特定配置 */}
          {renderConfigForm()}
        </div>
      </div>

      {/* 底部操作栏 */}
      {hasChanges && (
        <div className="p-4 border-t bg-muted/50">
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              保存更改
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHasChanges(false)}
            >
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 意图识别配置表单 ====================
function IntentRecognitionForm({
  config,
  onUpdate
}: {
  config: IntentRecognitionConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-500" />
          意图识别配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>启用意图识别</Label>
          <Switch
            checked={config.config.enabled}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, enabled: checked } })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>识别意图类型</Label>
          <div className="space-y-2">
            {[
              { value: 'daily_chat', label: '日常聊天' },
              { value: 'after_sales', label: '售后任务' },
              { value: 'complaint', label: '用户投诉' },
              { value: 'query', label: '查询咨询' },
            ].map((item) => (
              <div key={item.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`intent-${item.value}`}
                  checked={config.config.intentTypes.includes(item.value as any)}
                  onCheckedChange={(checked) => {
                    const newTypes = checked
                      ? [...config.config.intentTypes, item.value]
                      : config.config.intentTypes.filter((t) => t !== item.value);
                    onUpdate({ config: { ...config.config, intentTypes: newTypes } });
                  }}
                />
                <Label htmlFor={`intent-${item.value}`} className="text-sm cursor-pointer">
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>置信度阈值: {config.config.confidenceThreshold.toFixed(2)}</Label>
          <Slider
            value={[config.config.confidenceThreshold]}
            onValueChange={([value]) =>
              onUpdate({ config: { ...config.config, confidenceThreshold: value } })
            }
            min={0}
            max={1}
            step={0.05}
          />
          <p className="text-xs text-muted-foreground">
            仅当置信度超过此阈值时才使用识别结果
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Label>使用历史消息</Label>
          <Switch
            checked={config.config.useHistory}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, useHistory: checked } })
            }
          />
        </div>

        {config.config.useHistory && (
          <div className="space-y-2">
            <Label>历史消息数量: {config.config.historyCount}</Label>
            <Slider
              value={[config.config.historyCount]}
              onValueChange={([value]) =>
                onUpdate({ config: { ...config.config, historyCount: value } })
              }
              min={1}
              max={20}
              step={1}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="intent-prompt">自定义提示词模板（可选）</Label>
          <Textarea
            id="intent-prompt"
            value={config.config.promptTemplate || ''}
            onChange={(e) =>
              onUpdate({ config: { ...config.config, promptTemplate: e.target.value } })
            }
            placeholder="输入自定义的意图识别提示词模板"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            留空则使用系统默认提示词
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 情感分析配置表单 ====================
function SentimentAnalysisForm({
  config,
  onUpdate
}: {
  config: SentimentAnalysisConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-500" />
          情感分析配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>启用情感分析</Label>
          <Switch
            checked={config.config.enabled}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, enabled: checked } })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>识别情感类型</Label>
          <div className="space-y-2">
            {[
              { value: 'positive', label: '正面（满意）' },
              { value: 'neutral', label: '中性（客观）' },
              { value: 'negative', label: '负面（不满）' },
            ].map((item) => (
              <div key={item.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`sentiment-${item.value}`}
                  checked={config.config.sentimentTypes.includes(item.value as any)}
                  onCheckedChange={(checked) => {
                    const newTypes = checked
                      ? [...config.config.sentimentTypes, item.value]
                      : config.config.sentimentTypes.filter((t) => t !== item.value);
                    onUpdate({ config: { ...config.config, sentimentTypes: newTypes } });
                  }}
                />
                <Label htmlFor={`sentiment-${item.value}`} className="text-sm cursor-pointer">
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="intensity">
            <AccordionTrigger className="text-sm">
              情感强度阈值配置
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                <Label>高强度阈值: {config.config.intensityThresholds.high}%</Label>
                <Slider
                  value={[config.config.intensityThresholds.high]}
                  onValueChange={([value]) =>
                    onUpdate({
                      config: {
                        ...config.config,
                        intensityThresholds: {
                          ...config.config.intensityThresholds,
                          high: value,
                        },
                      },
                    })
                  }
                  min={0}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label>中强度阈值: {config.config.intensityThresholds.medium}%</Label>
                <Slider
                  value={[config.config.intensityThresholds.medium]}
                  onValueChange={([value]) =>
                    onUpdate({
                      config: {
                        ...config.config,
                        intensityThresholds: {
                          ...config.config.intensityThresholds,
                          medium: value,
                        },
                      },
                    })
                  }
                  min={0}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label>低强度阈值: {config.config.intensityThresholds.low}%</Label>
                <Slider
                  value={[config.config.intensityThresholds.low]}
                  onValueChange={([value]) =>
                    onUpdate({
                      config: {
                        ...config.config,
                        intensityThresholds: {
                          ...config.config.intensityThresholds,
                          low: value,
                        },
                      },
                    })
                  }
                  min={0}
                  max={100}
                  step={5}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                情感强度基于情感值的绝对值计算
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex items-center justify-between">
          <Label>识别表情符号情感</Label>
          <Switch
            checked={config.config.useEmoji}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, useEmoji: checked } })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sentiment-prompt">自定义提示词模板（可选）</Label>
          <Textarea
            id="sentiment-prompt"
            value={config.config.promptTemplate || ''}
            onChange={(e) =>
              onUpdate({ config: { ...config.config, promptTemplate: e.target.value } })
            }
            placeholder="输入自定义的情感分析提示词模板"
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 告警判断配置表单 ====================
function AlertJudgmentForm({
  config,
  onUpdate
}: {
  config: AlertJudgmentConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          告警判断配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>启用告警判断</Label>
          <Switch
            checked={config.config.enabled}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, enabled: checked } })
            }
          />
        </div>

        <Tabs defaultValue="levels" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="levels">告警级别</TabsTrigger>
            <TabsTrigger value="types">告警类型</TabsTrigger>
            <TabsTrigger value="response">响应时间</TabsTrigger>
          </TabsList>

          <TabsContent value="levels" className="space-y-3">
            <div className="space-y-2">
              <Label>启用的告警级别</Label>
              <div className="space-y-2">
                {[
                  { value: 'P0', label: 'P0（最高优先级）', color: 'text-red-500' },
                  { value: 'P1', label: 'P1（高优先级）', color: 'text-orange-500' },
                  { value: 'P2', label: 'P2（中优先级）', color: 'text-yellow-500' },
                  { value: 'P3', label: 'P3（低优先级）', color: 'text-green-500' },
                ].map((item) => (
                  <div key={item.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`level-${item.value}`}
                      checked={config.config.alertLevels.includes(item.value as any)}
                      onCheckedChange={(checked) => {
                        const newLevels = checked
                          ? [...config.config.alertLevels, item.value]
                          : config.config.alertLevels.filter((l) => l !== item.value);
                        onUpdate({ config: { ...config.config, alertLevels: newLevels } });
                      }}
                    />
                    <Label htmlFor={`level-${item.value}`} className={`text-sm cursor-pointer ${item.color}`}>
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="escalation">
                <AccordionTrigger className="text-sm">
                  告警升级配置
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>启用告警升级</Label>
                    <Switch
                      checked={config.config.escalationRules.enabled}
                      onCheckedChange={(checked) =>
                        onUpdate({
                          config: {
                            ...config.config,
                            escalationRules: {
                              ...config.config.escalationRules,
                              enabled: checked,
                            },
                          },
                        })
                      }
                    />
                  </div>

                  {config.config.escalationRules.enabled && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>P0 升级时间（分钟）: {config.config.escalationRules.escalationTimes.P0}</Label>
                        <Slider
                          value={[config.config.escalationRules.escalationTimes.P0]}
                          onValueChange={([value]) =>
                            onUpdate({
                              config: {
                                ...config.config,
                                escalationRules: {
                                  ...config.config.escalationRules,
                                  escalationTimes: {
                                    ...config.config.escalationRules.escalationTimes,
                                    P0: value,
                                  },
                                },
                              },
                            })
                          }
                          min={5}
                          max={60}
                          step={5}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>P1 升级时间（分钟）: {config.config.escalationRules.escalationTimes.P1}</Label>
                        <Slider
                          value={[config.config.escalationRules.escalationTimes.P1]}
                          onValueChange={([value]) =>
                            onUpdate({
                              config: {
                                ...config.config,
                                escalationRules: {
                                  ...config.config.escalationRules,
                                  escalationTimes: {
                                    ...config.config.escalationRules.escalationTimes,
                                    P1: value,
                                  },
                                },
                              },
                            })
                          }
                          min={5}
                          max={60}
                          step={5}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>P2 升级时间（分钟）: {config.config.escalationRules.escalationTimes.P2}</Label>
                        <Slider
                          value={[config.config.escalationRules.escalationTimes.P2]}
                          onValueChange={([value]) =>
                            onUpdate({
                              config: {
                                ...config.config,
                                escalationRules: {
                                  ...config.config.escalationRules,
                                  escalationTimes: {
                                    ...config.config.escalationRules.escalationTimes,
                                    P2: value,
                                  },
                                },
                              },
                            })
                          }
                          min={5}
                          max={60}
                          step={5}
                        />
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="types" className="space-y-3">
            <div className="space-y-2">
              <Label>启用的告警类型</Label>
              <div className="space-y-2">
                {[
                  { value: 'user_complaint', label: '用户投诉' },
                  { value: 'after_sales', label: '售后任务' },
                  { value: 'low_satisfaction', label: '低满意度预警' },
                  { value: 'frequent_complaint', label: '频繁投诉预警' },
                  { value: 'human_intervention_request', label: '人工介入请求' },
                  { value: 'system_error', label: '系统异常' },
                ].map((item) => (
                  <div key={item.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`alert-type-${item.value}`}
                      checked={config.config.alertTypes.includes(item.value as any)}
                      onCheckedChange={(checked) => {
                        const newTypes = checked
                          ? [...config.config.alertTypes, item.value]
                          : config.config.alertTypes.filter((t) => t !== item.value);
                        onUpdate({ config: { ...config.config, alertTypes: newTypes } });
                      }}
                    />
                    <Label htmlFor={`alert-type-${item.value}`} className="text-sm cursor-pointer">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="response" className="space-y-4">
            {[
              { level: 'P0', label: 'P0 响应时间' },
              { level: 'P1', label: 'P1 响应时间' },
              { level: 'P2', label: 'P2 响应时间' },
              { level: 'P3', label: 'P3 响应时间' },
            ].map((item) => (
              <div key={item.level} className="space-y-2">
                <Label>
                  {item.label}（分钟）: {config.config.responseTimes[item.level as keyof typeof config.config.responseTimes]}
                </Label>
                <Slider
                  value={[config.config.responseTimes[item.level as keyof typeof config.config.responseTimes]]}
                  onValueChange={([value]) =>
                    onUpdate({
                      config: {
                        ...config.config,
                        responseTimes: {
                          ...config.config.responseTimes,
                          [item.level]: value,
                        },
                      },
                    })
                  }
                  min={1}
                  max={60}
                  step={1}
                />
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ==================== 介入判断配置表单 ====================
function InterventionJudgmentForm({
  config,
  onUpdate
}: {
  config: InterventionJudgmentConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-purple-500" />
          介入判断配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>启用介入判断</Label>
          <Switch
            checked={config.config.enabled}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, enabled: checked } })
            }
          />
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="conditions">
            <AccordionTrigger className="text-sm">
              介入条件配置
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                <Label>连续负面情绪次数: {config.config.conditions.consecutiveNegativeCount}</Label>
                <Slider
                  value={[config.config.conditions.consecutiveNegativeCount]}
                  onValueChange={([value]) =>
                    onUpdate({
                      config: {
                        ...config.config,
                        conditions: {
                          ...config.config.conditions,
                          consecutiveNegativeCount: value,
                        },
                      },
                    })
                  }
                  min={1}
                  max={10}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  用户连续表达负面消息达到此次数时触发介入
                </p>
              </div>

              <div className="space-y-2">
                <Label>最低满意度阈值: {config.config.conditions.maxSatisfactionScore}分</Label>
                <Slider
                  value={[config.config.conditions.maxSatisfactionScore]}
                  onValueChange={([value]) =>
                    onUpdate({
                      config: {
                        ...config.config,
                        conditions: {
                          ...config.config.conditions,
                          maxSatisfactionScore: value,
                        },
                      },
                    })
                  }
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  用户满意度低于此分数时触发介入
                </p>
              </div>

              <div className="space-y-2">
                <Label>最低投诉次数: {config.config.conditions.minComplaintCount}</Label>
                <Slider
                  value={[config.config.conditions.minComplaintCount]}
                  onValueChange={([value]) =>
                    onUpdate({
                      config: {
                        ...config.config,
                        conditions: {
                          ...config.config.conditions,
                          minComplaintCount: value,
                        },
                      },
                    })
                  }
                  min={1}
                  max={10}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  用户投诉次数达到此次数时触发介入
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label>用户明确要求人工服务</Label>
                <Switch
                  checked={config.config.conditions.requireHumanService}
                  onCheckedChange={(checked) =>
                    onUpdate({
                      config: {
                        ...config.config,
                        conditions: {
                          ...config.config.conditions,
                          requireHumanService: checked,
                        },
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>AI 置信度阈值: {config.config.conditions.aiConfidenceThreshold.toFixed(2)}</Label>
                <Slider
                  value={[config.config.conditions.aiConfidenceThreshold]}
                  onValueChange={([value]) =>
                    onUpdate({
                      config: {
                        ...config.config,
                        conditions: {
                          ...config.config.conditions,
                          aiConfidenceThreshold: value,
                        },
                      },
                    })
                  }
                  min={0}
                  max={1}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground">
                  AI置信度低于此阈值时触发介入
                </p>
              </div>

              <div className="space-y-2">
                <Label>最大对话轮次: {config.config.conditions.maxConversationRounds}</Label>
                <Slider
                  value={[config.config.conditions.maxConversationRounds]}
                  onValueChange={([value]) =>
                    onUpdate({
                      config: {
                        ...config.config,
                        conditions: {
                          ...config.config.conditions,
                          maxConversationRounds: value,
                        },
                      },
                    })
                  }
                  min={5}
                  max={50}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  对话轮次超过此时仍未解决问题时触发介入
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

// ==================== 回复生成配置表单 ====================
function ReplyGenerationForm({
  config,
  onUpdate
}: {
  config: ReplyGenerationConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-500" />
          回复生成配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>启用回复生成</Label>
          <Switch
            checked={config.config.enabled}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, enabled: checked } })
            }
          />
        </div>

        <Tabs defaultValue="strategy" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="strategy">策略</TabsTrigger>
            <TabsTrigger value="model">模型</TabsTrigger>
            <TabsTrigger value="prompt">提示词</TabsTrigger>
          </TabsList>

          <TabsContent value="strategy" className="space-y-4">
            <div className="space-y-2">
              <Label>回复策略</Label>
              <Select
                value={config.config.strategy}
                onValueChange={(value: any) =>
                  onUpdate({ config: { ...config.config, strategy: value } })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">自动（根据意图选择）</SelectItem>
                  <SelectItem value="daily_chat">日常聊天</SelectItem>
                  <SelectItem value="query">查询咨询</SelectItem>
                  <SelectItem value="after_sales">售后任务</SelectItem>
                  <SelectItem value="complaint">投诉安抚</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>个性化回复</Label>
              <Switch
                checked={config.config.personalization}
                onCheckedChange={(checked) =>
                  onUpdate({ config: { ...config.config, personalization: checked } })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              根据用户画像和历史对话调整回复风格
            </p>
          </TabsContent>

          <TabsContent value="model" className="space-y-4">
            <div className="space-y-2">
              <Label>AI 提供商</Label>
              <Select
                value={config.config.aiProvider}
                onValueChange={(value: AIProvider) =>
                  onUpdate({ config: { ...config.config, aiProvider: value } })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doubao">豆包 (Doubao)</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="kimi">Kimi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>模型</Label>
              <Select
                value={config.config.model}
                onValueChange={(value) =>
                  onUpdate({ config: { ...config.config, model: value } })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doubao-pro">Doubao Pro</SelectItem>
                  <SelectItem value="doubao-lite">Doubao Lite</SelectItem>
                  <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                  <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
                  <SelectItem value="kimi-pro">Kimi Pro</SelectItem>
                  <SelectItem value="kimi-lite">Kimi Lite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Temperature: {config.config.temperature.toFixed(1)}</Label>
              <Slider
                value={[config.config.temperature]}
                onValueChange={([value]) =>
                  onUpdate({ config: { ...config.config, temperature: value } })
                }
                min={0}
                max={1}
                step={0.1}
              />
              <p className="text-xs text-muted-foreground">
                控制回复的随机性，值越高越随机
              </p>
            </div>

            <div className="space-y-2">
              <Label>最大 Token 数: {config.config.maxTokens}</Label>
              <Slider
                value={[config.config.maxTokens]}
                onValueChange={([value]) =>
                  onUpdate({ config: { ...config.config, maxTokens: value } })
                }
                min={100}
                max={2000}
                step={100}
              />
              <p className="text-xs text-muted-foreground">
                控制回复的最大长度
              </p>
            </div>
          </TabsContent>

          <TabsContent value="prompt" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reply-prompt">自定义提示词模板（可选）</Label>
              <Textarea
                id="reply-prompt"
                value={config.config.promptTemplate || ''}
                onChange={(e) =>
                  onUpdate({ config: { ...config.config, promptTemplate: e.target.value } })
                }
                placeholder="输入自定义的回复生成提示词模板"
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                留空则使用系统默认提示词。可以使用 {'{intent}'}, {'{sentiment}'}, {'{context}'} 等变量
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ==================== 上下文检索配置表单 ====================
function ContextRetrievalForm({
  config,
  onUpdate
}: {
  config: ContextRetrievalConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4 text-cyan-500" />
          上下文检索配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>启用上下文检索</Label>
          <Switch
            checked={config.config.enabled}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, enabled: checked } })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>检索策略</Label>
          <Select
            value={config.config.retrievalStrategy}
            onValueChange={(value: any) =>
              onUpdate({ config: { ...config.config, retrievalStrategy: value } })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">最近消息</SelectItem>
              <SelectItem value="relevant">相关消息</SelectItem>
              <SelectItem value="hybrid">混合策略</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>历史消息数量: {config.config.historyCount}</Label>
          <Slider
            value={[config.config.historyCount]}
            onValueChange={([value]) =>
              onUpdate({ config: { ...config.config, historyCount: value } })
            }
            min={1}
            max={50}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <Label>最大历史长度: {config.config.maxHistoryLength}</Label>
          <Slider
            value={[config.config.maxHistoryLength]}
            onValueChange={([value]) =>
              onUpdate({ config: { ...config.config, maxHistoryLength: value } })
            }
            min={10}
            max={200}
            step={10}
          />
          <p className="text-xs text-muted-foreground">
            控制发送给AI的上下文总长度（字符数）
          </p>
        </div>

        <div className="space-y-3 pt-2 border-t">
          <Label>检索内容</Label>
          <div className="space-y-2">
            {[
              { key: 'includeUserSession', label: '用户会话历史' },
              { key: 'includeGroupSession', label: '群组会话历史' },
              { key: 'includeUserProfile', label: '用户画像信息' },
              { key: 'includeAfterSalesTasks', label: '售后任务信息' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <Label className="text-sm">{item.label}</Label>
                <Switch
                  checked={config.config[item.key as keyof typeof config.config] as boolean}
                  onCheckedChange={(checked) =>
                    onUpdate({
                      config: {
                        ...config.config,
                        [item.key]: checked,
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 消息发送配置表单 ====================
function MessageSendForm({
  config,
  onUpdate
}: {
  config: MessageSendConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Send className="h-4 w-4 text-blue-500" />
          消息发送配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>启用消息发送</Label>
          <Switch
            checked={config.config.enabled}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, enabled: checked } })
            }
          />
        </div>

        <Tabs defaultValue="robot" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="robot">机器人选择</TabsTrigger>
            <TabsTrigger value="delay">延迟策略</TabsTrigger>
            <TabsTrigger value="retry">重试配置</TabsTrigger>
          </TabsList>

          <TabsContent value="robot" className="space-y-4">
            <div className="space-y-2">
              <Label>选择策略</Label>
              <Select
                value={config.config.robotSelection.strategy}
                onValueChange={(value: any) =>
                  onUpdate({
                    config: {
                      ...config.config,
                      robotSelection: {
                        ...config.config.robotSelection,
                        strategy: value,
                      },
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">基于优先级</SelectItem>
                  <SelectItem value="load">基于负载</SelectItem>
                  <SelectItem value="health">基于健康状态</SelectItem>
                  <SelectItem value="type">基于类型</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>首选机器人类型</Label>
              <div className="space-y-2">
                {[
                  { value: 'main_bot', label: '主要机器人' },
                  { value: 'after_sales_bot', label: '售后机器人' },
                  { value: 'emergency_bot', label: '应急机器人' },
                  { value: 'backup_bot', label: '备用机器人' },
                ].map((item) => (
                  <div key={item.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`robot-${item.value}`}
                      checked={config.config.robotSelection.preferredRobotTypes.includes(item.value as any)}
                      onCheckedChange={(checked) => {
                        const newTypes = checked
                          ? [...config.config.robotSelection.preferredRobotTypes, item.value]
                          : config.config.robotSelection.preferredRobotTypes.filter((t) => t !== item.value);
                        onUpdate({
                          config: {
                            ...config.config,
                            robotSelection: {
                              ...config.config.robotSelection,
                              preferredRobotTypes: newTypes,
                            },
                          },
                        });
                      }}
                    />
                    <Label htmlFor={`robot-${item.value}`} className="text-sm cursor-pointer">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="delay" className="space-y-4">
            <div className="space-y-2">
              <Label>基础延迟（秒）: {config.config.delayStrategy.baseDelay}</Label>
              <Slider
                value={[config.config.delayStrategy.baseDelay]}
                onValueChange={([value]) =>
                  onUpdate({
                    config: {
                      ...config.config,
                      delayStrategy: {
                        ...config.config.delayStrategy,
                        baseDelay: value,
                      },
                    },
                  })
                }
                min={1}
                max={30}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>随机因子: ±{Math.round(config.config.delayStrategy.randomFactor * 100)}%</Label>
              <Slider
                value={[config.config.delayStrategy.randomFactor * 100]}
                onValueChange={([value]) =>
                  onUpdate({
                    config: {
                      ...config.config,
                      delayStrategy: {
                        ...config.config.delayStrategy,
                        randomFactor: value / 100,
                      },
                    },
                  })
                }
                min={0}
                max={50}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                在基础延迟上增加随机波动，使回复更自然
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="priority">
                <AccordionTrigger className="text-sm">
                  优先级调整
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {[
                    { level: 'P0', label: 'P0 消息' },
                    { level: 'P1', label: 'P1 消息' },
                    { level: 'P2', label: 'P2 消息' },
                    { level: 'P3', label: 'P3 消息' },
                  ].map((item) => (
                    <div key={item.level} className="space-y-2">
                      <Label>
                        {item.label}延迟（秒）: {config.config.delayStrategy.priorityAdjustment[item.level as keyof typeof config.config.delayStrategy.priorityAdjustment]}
                      </Label>
                      <Slider
                        value={[config.config.delayStrategy.priorityAdjustment[item.level as keyof typeof config.config.delayStrategy.priorityAdjustment]]}
                        onValueChange={([value]) =>
                          onUpdate({
                            config: {
                              ...config.config,
                              delayStrategy: {
                                ...config.config.delayStrategy,
                                priorityAdjustment: {
                                  ...config.config.delayStrategy.priorityAdjustment,
                                  [item.level]: value,
                                },
                              },
                            },
                          })
                        }
                        min={1}
                        max={30}
                        step={1}
                      />
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="intent">
                <AccordionTrigger className="text-sm">
                  意图调整
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {[
                    { key: 'complaint', label: '投诉类消息' },
                    { key: 'after_sales', label: '售后类消息' },
                    { key: 'query', label: '查询类消息' },
                    { key: 'daily_chat', label: '日常聊天' },
                  ].map((item) => (
                    <div key={item.key} className="space-y-2">
                      <Label>
                        {item.label}延迟（秒）: {config.config.delayStrategy.intentAdjustment[item.key as keyof typeof config.config.delayStrategy.intentAdjustment]}
                      </Label>
                      <Slider
                        value={[config.config.delayStrategy.intentAdjustment[item.key as keyof typeof config.config.delayStrategy.intentAdjustment]]}
                        onValueChange={([value]) =>
                          onUpdate({
                            config: {
                              ...config.config,
                              delayStrategy: {
                                ...config.config.delayStrategy,
                                intentAdjustment: {
                                  ...config.config.delayStrategy.intentAdjustment,
                                  [item.key]: value,
                                },
                              },
                            },
                          })
                        }
                        min={1}
                        max={30}
                        step={1}
                      />
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sentiment">
                <AccordionTrigger className="text-sm">
                  情感调整
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {[
                    { key: 'negative_high', label: '负面高强度' },
                    { key: 'negative_medium', label: '负面中强度' },
                    { key: 'negative_low', label: '负面低强度' },
                  ].map((item) => (
                    <div key={item.key} className="space-y-2">
                      <Label>
                        {item.label}延迟（秒）: {config.config.delayStrategy.sentimentAdjustment[item.key as keyof typeof config.config.delayStrategy.sentimentAdjustment]}
                      </Label>
                      <Slider
                        value={[config.config.delayStrategy.sentimentAdjustment[item.key as keyof typeof config.config.delayStrategy.sentimentAdjustment]]}
                        onValueChange={([value]) =>
                          onUpdate({
                            config: {
                              ...config.config,
                              delayStrategy: {
                                ...config.config.delayStrategy,
                                sentimentAdjustment: {
                                  ...config.config.delayStrategy.sentimentAdjustment,
                                  [item.key]: value,
                                },
                              },
                            },
                          })
                        }
                        min={1}
                        max={30}
                        step={1}
                      />
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="retry" className="space-y-4">
            <div className="space-y-2">
              <Label>最大重试次数: {config.config.retryConfig.maxRetries}</Label>
              <Slider
                value={[config.config.retryConfig.maxRetries]}
                onValueChange={([value]) =>
                  onUpdate({
                    config: {
                      ...config.config,
                      retryConfig: {
                        ...config.config.retryConfig,
                        maxRetries: value,
                      },
                    },
                  })
                }
                min={0}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>重试延迟（秒）: {config.config.retryConfig.retryDelay}</Label>
              <Slider
                value={[config.config.retryConfig.retryDelay]}
                onValueChange={([value]) =>
                  onUpdate({
                    config: {
                      ...config.config,
                      retryConfig: {
                        ...config.config.retryConfig,
                        retryDelay: value,
                      },
                    },
                  })
                }
                min={1}
                max={60}
                step={1}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ==================== 售后任务配置表单 ====================
function AfterSalesTaskForm({
  config,
  onUpdate
}: {
  config: AfterSalesTaskConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-pink-500" />
          售后任务配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>启用售后任务</Label>
          <Switch
            checked={config.config.enabled}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, enabled: checked } })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>任务类型</Label>
          <div className="space-y-2">
            {[
              { value: 'refund', label: '退款任务' },
              { value: 'product_issue', label: '产品问题' },
              { value: 'service_issue', label: '服务问题' },
              { value: 'order_issue', label: '订单问题' },
              { value: 'other', label: '其他问题' },
            ].map((item) => (
              <div key={item.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`task-${item.value}`}
                  checked={config.config.taskTypes.includes(item.value as any)}
                  onCheckedChange={(checked) => {
                    const newTypes = checked
                      ? [...config.config.taskTypes, item.value]
                      : config.config.taskTypes.filter((t) => t !== item.value);
                    onUpdate({ config: { ...config.config, taskTypes: newTypes } });
                  }}
                />
                <Label htmlFor={`task-${item.value}`} className="text-sm cursor-pointer">
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>默认优先级</Label>
          <Select
            value={config.config.defaultPriority}
            onValueChange={(value: any) =>
              onUpdate({ config: { ...config.config, defaultPriority: value } })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="P0">P0（最高）</SelectItem>
              <SelectItem value="P1">P1（高）</SelectItem>
              <SelectItem value="P2">P2（中）</SelectItem>
              <SelectItem value="P3">P3（低）</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label>自动分配工作人员</Label>
          <Switch
            checked={config.config.autoAssignment}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, autoAssignment: checked } })
            }
          />
        </div>

        {config.config.autoAssignment && (
          <div className="space-y-2">
            <Label>分配策略</Label>
            <Select
              value={config.config.assignmentStrategy}
              onValueChange={(value: any) =>
                onUpdate({ config: { ...config.config, assignmentStrategy: value } })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="load_balance">负载均衡</SelectItem>
                <SelectItem value="skill_based">基于技能</SelectItem>
                <SelectItem value="priority_based">基于优先级</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label>同步到腾讯文档</Label>
          <Switch
            checked={config.config.syncToTencentDocs}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, syncToTencentDocs: checked } })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="collaboration-team">协同团队（可选，用逗号分隔）</Label>
          <Input
            id="collaboration-team"
            value={config.config.collaborationTeam?.join(', ') || ''}
            onChange={(e) =>
              onUpdate({
                config: {
                  ...config.config,
                  collaborationTeam: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                },
              })
            }
            placeholder="例如：售后团队A, 售后团队B"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 通用配置表单 ====================
function GeneralConfigForm({
  config,
  onUpdate
}: {
  config: GeneralNodeConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="h-4 w-4 text-gray-500" />
          节点配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            此节点类型的详细配置暂未实现。您可以在 JSON 编辑器中手动配置节点属性。
          </p>
        </div>

        {config.config && Object.keys(config.config).length > 0 && (
          <div className="space-y-2">
            <Label>现有配置（JSON）</Label>
            <Textarea
              value={JSON.stringify(config.config, null, 2)}
              onChange={(e) => {
                try {
                  const newConfig = JSON.parse(e.target.value);
                  onUpdate({ config: newConfig });
                } catch (err) {
                  // 忽略 JSON 解析错误
                }
              }}
              rows={10}
              className="font-mono text-xs"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== AI 处理多任务配置表单 ====================
function MultiTaskAIForm({
  config,
  onUpdate,
  subType
}: {
  config: GeneralNodeConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
  subType?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-500" />
          AI 处理多任务配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>子类型（操作类型）</Label>
          <Select
            value={subType}
            onValueChange={(value) =>
              onUpdate({ config: { ...config.config, subType: value } })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="选择操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="intent_recognition">意图识别</SelectItem>
              <SelectItem value="sentiment_analysis">情感分析</SelectItem>
              <SelectItem value="reply_generation">回复生成</SelectItem>
              <SelectItem value="ai_chat">AI 对话</SelectItem>
              <SelectItem value="unified_analyze">统一分析</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {subType === 'intent_recognition' && (
          <IntentRecognitionForm config={config as IntentRecognitionConfig} onUpdate={onUpdate} />
        )}
        {subType === 'sentiment_analysis' && (
          <SentimentAnalysisForm config={config as SentimentAnalysisConfig} onUpdate={onUpdate} />
        )}
        {subType === 'reply_generation' && (
          <ReplyGenerationForm config={config as ReplyGenerationConfig} onUpdate={onUpdate} />
        )}

        {subType && subType !== 'intent_recognition' && subType !== 'sentiment_analysis' && subType !== 'reply_generation' && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              子类型 "{subType}" 的详细配置正在开发中。请使用 JSON 编辑器配置。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 消息管理多任务配置表单 ====================
function MultiTaskMessageForm({
  config,
  onUpdate,
  subType
}: {
  config: GeneralNodeConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
  subType?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-green-500" />
          消息管理多任务配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>子类型（操作类型）</Label>
          <Select
            value={subType}
            onValueChange={(value) =>
              onUpdate({ config: { ...config.config, subType: value } })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="选择操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="message_receive">消息接收</SelectItem>
              <SelectItem value="message_send">消息发送</SelectItem>
              <SelectItem value="message_dispatch">消息分发</SelectItem>
              <SelectItem value="message_sync">消息同步</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {subType === 'message_send' && (
          <MessageSendForm config={config as MessageSendConfig} onUpdate={onUpdate} />
        )}
        {subType === 'message_receive' && (
          <MessageReceiveForm config={config} onUpdate={onUpdate} />
        )}

        {subType && subType !== 'message_send' && subType !== 'message_receive' && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              子类型 "{subType}" 的详细配置正在开发中。请使用 JSON 编辑器配置。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 消息接收配置表单 ====================
function MessageReceiveForm({
  config,
  onUpdate
}: {
  config: GeneralNodeConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          消息接收配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>保存到数据库</Label>
          <Switch
            checked={config.config?.saveToDatabase ?? true}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, saveToDatabase: checked } })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>验证内容</Label>
          <Switch
            checked={config.config?.validateContent ?? false}
            onCheckedChange={(checked) =>
              onUpdate({ config: { ...config.config, validateContent: checked } })
            }
          />
        </div>

        {config.config?.validateContent && (
          <div className="space-y-2">
            <Label>最大消息长度: {config.config.maxMessageLength || 5000}</Label>
            <Slider
              value={[config.config.maxMessageLength || 5000]}
              onValueChange={([value]) =>
                onUpdate({ config: { ...config.config, maxMessageLength: value } })
              }
              min={100}
              max={10000}
              step={100}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 告警管理多任务配置表单 ====================
function MultiTaskAlertForm({
  config,
  onUpdate,
  subType
}: {
  config: GeneralNodeConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
  subType?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          告警管理多任务配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>子类型（操作类型）</Label>
          <Select
            value={subType}
            onValueChange={(value) =>
              onUpdate({ config: { ...config.config, subType: value } })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="选择操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alert_judgment">告警判断</SelectItem>
              <SelectItem value="alert_save">告警保存</SelectItem>
              <SelectItem value="alert_notify">告警通知</SelectItem>
              <SelectItem value="alert_escalate">告警升级</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {subType === 'alert_judgment' && (
          <AlertJudgmentForm config={config as AlertJudgmentConfig} onUpdate={onUpdate} />
        )}

        {subType && subType !== 'alert_judgment' && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              子类型 "{subType}" 的详细配置正在开发中。请使用 JSON 编辑器配置。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 人员管理多任务配置表单 ====================
function MultiTaskStaffForm({
  config,
  onUpdate,
  subType
}: {
  config: GeneralNodeConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
  subType?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-pink-500" />
          人员管理多任务配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>子类型（操作类型）</Label>
          <Select
            value={subType}
            onValueChange={(value) =>
              onUpdate({ config: { ...config.config, subType: value } })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="选择操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="intervention_judgment">介入判断</SelectItem>
              <SelectItem value="staff_matching">人员匹配</SelectItem>
              <SelectItem value="staff_notification">人员通知</SelectItem>
              <SelectItem value="human_handover">人工接管</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {subType === 'intervention_judgment' && (
          <InterventionJudgmentForm config={config as InterventionJudgmentConfig} onUpdate={onUpdate} />
        )}

        {subType && subType !== 'intervention_judgment' && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              子类型 "{subType}" 的详细配置正在开发中。请使用 JSON 编辑器配置。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 任务管理多任务配置表单 ====================
function MultiTaskTaskForm({
  config,
  onUpdate,
  subType
}: {
  config: GeneralNodeConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
  subType?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-indigo-500" />
          任务管理多任务配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>子类型（操作类型）</Label>
          <Select
            value={subType}
            onValueChange={(value) =>
              onUpdate({ config: { ...config.config, subType: value } })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="选择操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="after_sales_task">售后任务</SelectItem>
              <SelectItem value="task_create">创建任务</SelectItem>
              <SelectItem value="task_assign">分配任务</SelectItem>
              <SelectItem value="task_update">更新任务</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {subType === 'after_sales_task' && (
          <AfterSalesTaskForm config={config as AfterSalesTaskConfig} onUpdate={onUpdate} />
        )}

        {subType && subType !== 'after_sales_task' && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              子类型 "{subType}" 的详细配置正在开发中。请使用 JSON 编辑器配置。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 协同分析多任务配置表单 ====================
function MultiTaskAnalysisForm({
  config,
  onUpdate,
  subType
}: {
  config: GeneralNodeConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
  subType?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-teal-500" />
          协同分析多任务配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>子类型（操作类型）</Label>
          <Select
            value={subType}
            onValueChange={(value) =>
              onUpdate({ config: { ...config.config, subType: value } })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="选择操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff_monitoring">工作人员监控</SelectItem>
              <SelectItem value="satisfaction_analysis">用户满意度分析</SelectItem>
              <SelectItem value="collaboration_report">协同分析报告</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            子类型 "{subType || '未选择'}" 的详细配置正在开发中。请使用 JSON 编辑器配置。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 机器人交互多任务配置表单 ====================
function MultiTaskRobotForm({
  config,
  onUpdate,
  subType
}: {
  config: GeneralNodeConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
  subType?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-600" />
          机器人交互多任务配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>子类型（操作类型）</Label>
          <Select
            value={subType}
            onValueChange={(value) =>
              onUpdate({ config: { ...config.config, subType: value } })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="选择操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="robot_dispatch">机器人调度</SelectItem>
              <SelectItem value="send_command">发送指令</SelectItem>
              <SelectItem value="command_status">指令状态查询</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            子类型 "{subType || '未选择'}" 的详细配置正在开发中。请使用 JSON 编辑器配置。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 上下文节点配置表单 ====================
function ContextForm({
  config,
  onUpdate,
  subType
}: {
  config: GeneralNodeConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
  subType?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4 text-indigo-600" />
          上下文节点配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>子类型（操作类型）</Label>
          <Select
            value={subType}
            onValueChange={(value) =>
              onUpdate({ config: { ...config.config, subType: value } })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="选择操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="context_retrieval">上下文检索</SelectItem>
              <SelectItem value="context_enhancer">上下文增强</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {subType === 'context_retrieval' && (
          <ContextRetrievalForm config={config as ContextRetrievalConfig} onUpdate={onUpdate} />
        )}

        {subType && subType !== 'context_retrieval' && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              子类型 "{subType}" 的详细配置正在开发中。请使用 JSON 编辑器配置。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 决策节点配置表单 ====================
function DecisionForm({
  config,
  onUpdate
}: {
  config: GeneralNodeConfig;
  onUpdate: (updates: Partial<NodeConfig>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-500" />
          决策节点配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            决策节点的详细配置正在开发中。请使用 JSON 编辑器配置。
          </p>
        </div>

        <div className="space-y-2">
          <Label>现有配置（JSON）</Label>
          <Textarea
            value={JSON.stringify(config.config || {}, null, 2)}
            onChange={(e) => {
              try {
                const newConfig = JSON.parse(e.target.value);
                onUpdate({ config: newConfig });
              } catch (err) {
                // 忽略 JSON 解析错误
              }
            }}
            rows={10}
            className="font-mono text-xs"
          />
        </div>
      </CardContent>
    </Card>
  );
}
