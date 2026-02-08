'use client';

/**
 * 决策节点配置组件
 * 支持多条件、表达式模式、默认分支等功能
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, ChevronUp, ChevronDown, Copy, TestTube, HelpCircle, Lightbulb } from 'lucide-react';

interface DecisionConfigProps {
  config: any;
  onChange: (key: string, value: any) => void;
}

// 操作符列表
const OPERATORS = [
  // 相等性比较
  { value: '===', label: '等于 (===)', group: '相等性' },
  { value: '!==', label: '不等于 (!==)', group: '相等性' },
  { value: '==', label: '等于 (==)', group: '相等性' },
  { value: '!=', label: '不等于 (!=)', group: '相等性' },

  // 数值比较
  { value: '>', label: '大于 (>)', group: '数值' },
  { value: '<', label: '小于 (<)', group: '数值' },
  { value: '>=', label: '大于等于 (>=)', group: '数值' },
  { value: '<=', label: '小于等于 (<=)', group: '数值' },

  // 字符串匹配
  { value: 'contains', label: '包含', group: '字符串' },
  { value: 'startsWith', label: '开始于', group: '字符串' },
  { value: 'endsWith', label: '结束于', group: '字符串' },

  // 高级匹配
  { value: 'in', label: '数组包含 (in)', group: '高级' },
  { value: 'regex', label: '正则表达式 (regex)', group: '高级' },
];

// 操作符映射（兼容旧版本）
const OPERATOR_MAPPING: Record<string, string> = {
  'equals': '===',
  'not_equals': '!==',
  'greater_than': '>',
  'less_than': '<',
  'contains': 'contains',
  'not_contains': 'not_contains',
};

// 内置变量
const CONTEXT_VARIABLES = [
  { name: 'intent', label: '用户意图', type: 'string', description: 'AI识别的意图（service/tech_support/complaint等）' },
  { name: 'priority', label: '优先级', type: 'number', description: '消息优先级（0-1）' },
  { name: 'userName', label: '用户名', type: 'string', description: '发送消息的用户名' },
  { name: 'groupName', label: '群组名', type: 'string', description: '消息来源群组名' },
  { name: 'roomType', label: '房间类型', type: 'string', description: '房间类型（single/group）' },
  { name: 'atMe', label: '是否@我', type: 'boolean', description: '是否@了机器人' },
  { name: 'messageId', label: '消息ID', type: 'string', description: '消息唯一标识' },
  { name: 'sessionId', label: '会话ID', type: 'string', description: '会话唯一标识' },
  { name: 'emotion', label: '情绪', type: 'string', description: 'AI识别的情绪（positive/negative/neutral）' },
  { name: 'businessRole', label: '业务角色', type: 'string', description: '提取的业务角色（售后/营销/技术等）' },
  { name: 'staffReplied', label: '工作人员已回复', type: 'boolean', description: '工作人员是否已回复' },
  { name: 'staffReplyCount', label: '工作人员回复次数', type: 'number', description: '工作人员回复次数' },
];

// 条件模板
const CONDITION_TEMPLATES = [
  {
    id: 'template_service',
    name: '服务咨询',
    description: '判断是否为服务咨询',
    conditions: [
      {
        field: 'intent',
        operator: '===',
        value: 'service',
        name: '服务咨询',
        enabled: true
      }
    ]
  },
  {
    id: 'template_tech',
    name: '技术支持',
    description: '判断是否为技术支持',
    conditions: [
      {
        field: 'intent',
        operator: '===',
        value: 'tech_support',
        name: '技术支持',
        enabled: true
      }
    ]
  },
  {
    id: 'template_high_priority',
    name: '高优先级消息',
    description: '判断是否为高优先级消息',
    conditions: [
      {
        field: 'priority',
        operator: '>',
        value: 0.7,
        name: '高优先级',
        enabled: true
      }
    ]
  },
  {
    id: 'template_complaint',
    name: '投诉处理',
    description: '判断是否为投诉',
    conditions: [
      {
        field: 'intent',
        operator: '===',
        value: 'complaint',
        name: '投诉',
        enabled: true
      }
    ]
  },
  {
    id: 'template_at_me',
    name: '@机器人',
    description: '判断是否@了机器人',
    conditions: [
      {
        field: 'atMe',
        operator: '===',
        value: true,
        name: '@机器人',
        enabled: true
      }
    ]
  },
  {
    id: 'template_urgent_unreplied',
    name: '未回复的高优先级',
    description: '判断是否为未回复的高优先级消息',
    conditions: [
      {
        field: 'priority',
        operator: '>',
        value: 0.7,
        name: '高优先级',
        enabled: true
      },
      {
        field: 'staffReplied',
        operator: '===',
        value: false,
        name: '未回复',
        enabled: true
      }
    ],
    logic: 'AND'
  }
];

export default function DecisionConfig({ config, onChange }: DecisionConfigProps) {
  const [decisionMode, setDecisionMode] = useState<'condition_list' | 'expression'>(
    config.decisionMode || 'condition_list'
  );
  const [showVariableHelp, setShowVariableHelp] = useState(false);
  const [showTemplateHelp, setShowTemplateHelp] = useState(false);

  // 兼容旧版本配置
  const conditions = config.conditions || [];
  const expression = config.expression || '';
  const defaultBranch = config.defaultBranch || '';
  const conditionLogic = config.conditionLogic || 'OR';

  // 初始化条件列表（兼容旧版本）
  const initializeConditions = (): any[] => {
    // 如果已有条件列表，直接使用
    if (conditions && conditions.length > 0) {
      return conditions;
    }

    // 如果有旧版本的单条件配置，转换为新的条件列表
    if (config.conditionField && config.conditionOperator && config.conditionValue) {
      const oldOperator = config.conditionOperator;
      const newOperator = OPERATOR_MAPPING[oldOperator] || oldOperator;

      return [
        {
          id: `cond_${Date.now()}`,
          name: '条件1',
          field: config.conditionField,
          operator: newOperator,
          value: config.conditionValue,
          enabled: true
        }
      ];
    }

    // 默认返回空数组
    return [];
  };

  const currentConditions = initializeConditions();

  // 添加条件
  const addCondition = () => {
    const newConditions = [
      ...currentConditions,
      {
        id: `cond_${Date.now()}`,
        name: `条件${currentConditions.length + 1}`,
        field: 'intent',
        operator: '===',
        value: '',
        enabled: true
      }
    ];
    onChange('conditions', newConditions);
  };

  // 更新条件
  const updateCondition = (conditionId: string, field: string, value: any) => {
    const newConditions = currentConditions.map(cond =>
      cond.id === conditionId ? { ...cond, [field]: value } : cond
    );
    onChange('conditions', newConditions);
  };

  // 删除条件
  const deleteCondition = (conditionId: string) => {
    const newConditions = currentConditions.filter(cond => cond.id !== conditionId);
    onChange('conditions', newConditions);
  };

  // 复制条件
  const duplicateCondition = (condition: any) => {
    const newConditions = [
      ...currentConditions,
      {
        ...condition,
        id: `cond_${Date.now()}`,
        name: `${condition.name} (副本)`
      }
    ];
    onChange('conditions', newConditions);
  };

  // 移动条件
  const moveCondition = (conditionId: string, direction: 'up' | 'down') => {
    const index = currentConditions.findIndex(cond => cond.id === conditionId);
    if (index < 0) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentConditions.length) return;

    const newConditions = [...currentConditions];
    [newConditions[index], newConditions[newIndex]] = [newConditions[newIndex], newConditions[index]];
    onChange('conditions', newConditions);
  };

  // 应用模板
  const applyTemplate = (template: any) => {
    onChange('conditions', template.conditions);
    if (template.logic) {
      onChange('conditionLogic', template.logic);
    }
    setShowTemplateHelp(false);
  };

  return (
    <div className="space-y-4">
      {/* 决策模式选择 */}
      <div>
        <Label className="text-sm font-medium text-slate-700">决策模式</Label>
        <Select value={decisionMode} onValueChange={(value: any) => {
          setDecisionMode(value);
          onChange('decisionMode', value);
        }}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择决策模式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="condition_list">条件列表 (推荐)</SelectItem>
            <SelectItem value="expression">表达式 (高级)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={decisionMode} onValueChange={(value: any) => {
        setDecisionMode(value);
        onChange('decisionMode', value);
      }} className="w-full">
        {/* 条件列表模式 */}
        <TabsContent value="condition_list" className="space-y-4 mt-0">
          {/* 条件列表 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-700">条件列表</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateHelp(!showTemplateHelp)}
                  className="h-7 text-xs"
                >
                  <Lightbulb className="w-3 h-3 mr-1" />
                  模板
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCondition}
                  className="h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  添加条件
                </Button>
              </div>
            </div>

            {/* 条件模板面板 */}
            {showTemplateHelp && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <div className="text-xs font-medium text-amber-800">快速应用条件模板</div>
                <div className="grid grid-cols-1 gap-2">
                  {CONDITION_TEMPLATES.map(template => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(template)}
                      className="h-auto py-2 px-3 text-left justify-start"
                    >
                      <div>
                        <div className="font-medium text-xs">{template.name}</div>
                        <div className="text-[10px] text-slate-500">{template.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 条件列表 */}
            {currentConditions.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                <p className="text-sm text-slate-400 mb-2">暂无条件</p>
                <Button variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="w-3 h-3 mr-1" />
                  添加第一个条件
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {currentConditions.map((condition, index) => (
                  <div key={condition.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    {/* 条件头部 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={condition.enabled ?? true}
                          onCheckedChange={(checked) => updateCondition(condition.id, 'enabled', checked)}
                          id={`enable-${condition.id}`}
                        />
                        <Input
                          value={condition.name || `条件${index + 1}`}
                          onChange={(e) => updateCondition(condition.id, 'name', e.target.value)}
                          className="h-7 w-32 text-sm"
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveCondition(condition.id, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveCondition(condition.id, 'down')}
                          disabled={index === currentConditions.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateCondition(condition)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCondition(condition.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* 条件配置 */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor={`field-${condition.id}`} className="text-[10px] text-slate-500">
                          字段
                        </Label>
                        <Select
                          value={condition.field || 'intent'}
                          onValueChange={(value) => updateCondition(condition.id, 'field', value)}
                        >
                          <SelectTrigger className="h-7 mt-0.5">
                            <SelectValue placeholder="字段" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTEXT_VARIABLES.map(variable => (
                              <SelectItem key={variable.name} value={variable.name}>
                                {variable.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`operator-${condition.id}`} className="text-[10px] text-slate-500">
                          操作符
                        </Label>
                        <Select
                          value={condition.operator || '==='}
                          onValueChange={(value) => updateCondition(condition.id, 'operator', value)}
                        >
                          <SelectTrigger className="h-7 mt-0.5">
                            <SelectValue placeholder="操作符" />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map(operator => (
                              <SelectItem key={operator.value} value={operator.value}>
                                <span className="text-xs">{operator.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`value-${condition.id}`} className="text-[10px] text-slate-500">
                          值
                        </Label>
                        <Input
                          id={`value-${condition.id}`}
                          value={condition.value || ''}
                          onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                          placeholder="值"
                          className="h-7 mt-0.5"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 条件逻辑 */}
          {currentConditions.length > 1 && (
            <div>
              <Label className="text-sm font-medium text-slate-700">条件逻辑</Label>
              <Select value={conditionLogic} onValueChange={(value) => onChange('conditionLogic', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="选择条件逻辑" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OR">OR - 匹配任意条件</SelectItem>
                  <SelectItem value="AND">AND - 匹配所有条件</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500 mt-1">
                {conditionLogic === 'OR'
                  ? '任意一个条件满足时，即执行对应的分支'
                  : '所有条件都满足时，才执行对应的分支'}
              </p>
            </div>
          )}
        </TabsContent>

        {/* 表达式模式 */}
        <TabsContent value="expression" className="space-y-4 mt-0">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-slate-700">表达式</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVariableHelp(!showVariableHelp)}
                className="h-7 text-xs"
              >
                <HelpCircle className="w-3 h-3 mr-1" />
                可用变量
              </Button>
            </div>
            <Textarea
              value={expression}
              onChange={(e) => onChange('expression', e.target.value)}
              placeholder='{{intent}} === "service" && {{priority}} > 0.5'
              className="mt-1 font-mono text-sm resize-none"
              rows={4}
            />
            <p className="text-[10px] text-slate-500 mt-1">
              使用 {'{{variable}}'} 语法引用流程上下文变量
            </p>

            {/* 变量帮助面板 */}
            {showVariableHelp && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs font-medium text-blue-800 mb-2">可用变量</div>
                <div className="grid grid-cols-1 gap-1">
                  {CONTEXT_VARIABLES.map(variable => (
                    <div key={variable.name} className="flex items-start gap-2 text-xs">
                      <code className="text-blue-600 bg-blue-100 px-1 rounded">
                        {variable.name}
                      </code>
                      <div className="flex-1">
                        <span className="text-slate-700">{variable.label}</span>
                        <span className="text-slate-500 ml-1">({variable.type})</span>
                        <p className="text-[10px] text-slate-500">{variable.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 表达式帮助 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs font-medium text-slate-700 mb-2">表达式示例</div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono bg-white p-2 rounded">
                {'{{intent}} === "service"'}
              </div>
              <div className="text-[10px] font-mono bg-white p-2 rounded">
                {'{{priority}} > 0.7 && !{{staffReplied}}'}
              </div>
              <div className="text-[10px] font-mono bg-white p-2 rounded">
                {'{{businessRole}} === "售后" || {{businessRole}} === "技术"'}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 默认分支 */}
      <div>
        <Label className="text-sm font-medium text-slate-700">默认分支</Label>
        <Input
          value={defaultBranch}
          onChange={(e) => onChange('defaultBranch', e.target.value)}
          placeholder="当所有条件都不满足时执行的节点ID"
          className="mt-1"
        />
        <p className="text-[10px] text-slate-500 mt-1">
          当所有条件都不满足时，将执行此分支
        </p>
      </div>

      {/* 测试按钮 (占位符) */}
      <div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            // TODO: 实现条件测试功能
            alert('条件测试功能即将上线！');
          }}
        >
          <TestTube className="w-4 h-4 mr-2" />
          测试条件
        </Button>
      </div>
    </div>
  );
}
