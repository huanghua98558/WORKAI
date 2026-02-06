'use client';

/**
 * 节点配置面板
 * 根据节点类型动态渲染配置项
 */

import React, { useState } from 'react';
import { Node } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Settings } from 'lucide-react';
import { NODE_TYPES, NODE_METADATA } from '../types';

type FlowNode = Node;

interface NodeConfigPanelProps {
  node: FlowNode;
  onUpdate: (updates: Partial<FlowNode>) => void;
}

export default function NodeConfigPanel({ node, onUpdate }: NodeConfigPanelProps) {
  const [config, setConfig] = useState(node.data.config || {});

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate({
      data: {
        ...node.data,
        config: newConfig,
      },
    });
  };

  return (
    <Card className="p-4 bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-slate-600" />
        <h3 className="font-semibold text-slate-900">节点配置</h3>
      </div>

      {/* 节点基本信息 */}
      <div className="space-y-3 mb-4 pb-4 border-b border-slate-200">
        <div>
          <Label htmlFor="node-type">节点类型</Label>
          <Select
            value={node.data.type || ''}
            onValueChange={(value) =>
              onUpdate({
                data: {
                  ...node.data,
                  type: value,
                  name: NODE_METADATA[value as keyof typeof NODE_METADATA]?.name || node.data.name,
                  description: NODE_METADATA[value as keyof typeof NODE_METADATA]?.description || node.data.description,
                  icon: NODE_METADATA[value as keyof typeof NODE_METADATA]?.icon || node.data.icon,
                  color: NODE_METADATA[value as keyof typeof NODE_METADATA]?.color || node.data.color,
                },
              })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="选择节点类型" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(NODE_METADATA).map(([type, meta]) => (
                <SelectItem key={type} value={type}>
                  {meta.icon} {meta.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="node-name">节点名称</Label>
          <Input
            id="node-name"
            value={node.data.name}
            onChange={(e) =>
              onUpdate({
                data: { ...node.data, name: e.target.value },
              })
            }
            placeholder="输入节点名称"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="node-description">描述</Label>
          <Textarea
            id="node-description"
            value={node.data.description || ''}
            onChange={(e) =>
              onUpdate({
                data: { ...node.data, description: e.target.value },
              })
            }
            placeholder="输入节点描述"
            className="mt-1 resize-none"
            rows={2}
          />
        </div>
      </div>

      {/* 根据节点类型渲染不同的配置项 */}
      {node.data.type === 'message_receive' && (
        <MessageReceiveConfig config={config} onChange={handleConfigChange} />
      )}

      {node.data.type === 'intent' && <IntentConfig config={config} onChange={handleConfigChange} />}

      {node.data.type === 'decision' && <DecisionConfig config={config} onChange={handleConfigChange} />}

      {node.data.type === 'ai_reply' && <AiReplyConfig config={config} onChange={handleConfigChange} />}

      {node.data.type === 'message_dispatch' && (
        <MessageDispatchConfig config={config} onChange={handleConfigChange} />
      )}

      {node.data.type === 'send_command' && (
        <SendCommandConfig config={config} onChange={handleConfigChange} />
      )}

      {node.data.type === 'command_status' && (
        <CommandStatusConfig config={config} onChange={handleConfigChange} />
      )}

      {node.data.type === 'end' && <EndConfig config={config} onChange={handleConfigChange} />}

      {node.data.type === 'alert_save' && <AlertSaveConfig config={config} onChange={handleConfigChange} />}

      {node.data.type === 'alert_rule' && <AlertRuleConfig config={config} onChange={handleConfigChange} />}

      {node.data.type === 'risk_handler' && <RiskHandlerConfig config={config} onChange={handleConfigChange} />}

      {node.data.type === 'monitor' && <MonitorConfig config={config} onChange={handleConfigChange} />}

      {node.data.type === 'robot_dispatch' && (
        <RobotDispatchConfig config={config} onChange={handleConfigChange} />
      )}

      {node.data.type === 'execute_notification' && (
        <ExecuteNotificationConfig config={config} onChange={handleConfigChange} />
      )}

      {/* 默认情况：未识别的节点类型 */}
      {!['message_receive', 'intent', 'decision', 'ai_reply', 'message_dispatch', 'send_command', 'command_status', 'end', 'alert_save', 'alert_rule', 'risk_handler', 'monitor', 'robot_dispatch', 'execute_notification'].includes(node.data.type || '') && (
        <div className="text-sm text-red-500 text-center py-4">
          <p className="font-medium">未知的节点类型</p>
          <p className="text-xs mt-1">类型: {node.data.type || 'undefined'}</p>
          <p className="text-xs mt-2">请联系管理员添加此节点类型的配置</p>
        </div>
      )}
    </Card>
  );
}

// 节点1：消息接收配置
function MessageReceiveConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">数据保存配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="saveToDatabase"
              checked={config.saveToDatabase ?? true}
              onCheckedChange={(checked) => onChange('saveToDatabase', checked)}
            />
            <Label htmlFor="saveToDatabase" className="text-sm">
              保存到数据库 (session_messages)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="saveToContext"
              checked={config.saveToContext ?? true}
              onCheckedChange={(checked) => onChange('saveToContext', checked)}
            />
            <Label htmlFor="saveToContext" className="text-sm">
              保存到流程上下文
            </Label>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">字段提取配置</Label>
        <div className="space-y-2 mt-2">
          {['messageId', 'sessionId', 'userName', 'groupName', 'roomType', 'atMe'].map((field) => (
            <div key={field} className="flex items-center space-x-2">
              <Checkbox
                id={`extract-${field}`}
                checked={config.extractFields?.[field] ?? true}
                onCheckedChange={(checked) =>
                  onChange('extractFields', {
                    ...(config.extractFields || {}),
                    [field]: checked,
                  })
                }
              />
              <Label htmlFor={`extract-${field}`} className="text-sm">
                {field}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">WebSocket推送配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableWebSocketPush"
              checked={config.enableWebSocketPush ?? true}
              onCheckedChange={(checked) => onChange('enableWebSocketPush', checked)}
            />
            <Label htmlFor="enableWebSocketPush" className="text-sm">
              启用WebSocket实时推送
            </Label>
          </div>
          <div>
            <Label htmlFor="pushTarget" className="text-sm">
              推送目标
            </Label>
            <Select
              value={config.pushTarget || 'panel1'}
              onValueChange={(value) => onChange('pushTarget', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择推送目标" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="panel1">仅面板1 (业务消息监控)</SelectItem>
                <SelectItem value="panel2">仅面板2 (AI交互监控)</SelectItem>
                <SelectItem value="both">双面板</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

// 节点2：意图识别配置
function IntentConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      {/* AI模型选择 */}
      <div>
        <Label htmlFor="modelId">AI模型</Label>
        <Select
          value={config.modelId || 'doubao-pro-4k'}
          onValueChange={(value) => onChange('modelId', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择AI模型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="doubao-pro-4k">豆包 Pro 4K（推荐）</SelectItem>
            <SelectItem value="doubao-pro-32k">豆包 Pro 32K</SelectItem>
            <SelectItem value="doubao-pro-128k">豆包 Pro 128K</SelectItem>
            <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
            <SelectItem value="kimi-moonshot-v1-8k">Kimi 8K</SelectItem>
            <SelectItem value="kimi-moonshot-v1-32k">Kimi 32K</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 置信度阈值 */}
      <div>
        <Label htmlFor="confidenceThreshold">置信度阈值</Label>
        <Input
          id="confidenceThreshold"
          type="number"
          step="0.1"
          min="0"
          max="1"
          value={config.confidenceThreshold ?? 0.7}
          onChange={(e) => onChange('confidenceThreshold', parseFloat(e.target.value))}
          className="mt-1"
        />
        <p className="text-xs text-slate-500 mt-1">
          0-1之间的值，仅当置信度大于此值时才识别成功，默认0.7
        </p>
      </div>

      {/* 默认意图 */}
      <div>
        <Label htmlFor="fallbackIntent">默认意图（未识别时）</Label>
        <Select
          value={config.fallbackIntent || 'unknown'}
          onValueChange={(value) => onChange('fallbackIntent', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择默认意图" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unknown">未知（unknown）</SelectItem>
            <SelectItem value="chat">对话（chat）</SelectItem>
            <SelectItem value="service">服务（service）</SelectItem>
            <SelectItem value="help">帮助（help）</SelectItem>
            <SelectItem value="welcome">欢迎（welcome）</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500 mt-1">
          当AI无法识别意图时使用的默认值
        </p>
      </div>

      {/* 支持的意图列表 */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">支持的意图列表</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {['service', 'help', 'chat', 'welcome', 'risk', 'spam', 'complaint', 'praise', 'inquiry', 'order'].map((intent) => (
            <div key={intent} className="flex items-center space-x-2">
              <Checkbox
                id={`intent-${intent}`}
                checked={config.supportedIntents?.includes(intent) ?? true}
                onCheckedChange={(checked) => {
                  const intents = config.supportedIntents || ['service', 'help', 'chat', 'welcome', 'risk', 'spam'];
                  if (checked) {
                    onChange('supportedIntents', [...intents, intent]);
                  } else {
                    onChange('supportedIntents', intents.filter((i: string) => i !== intent));
                  }
                }}
              />
              <Label htmlFor={`intent-${intent}`} className="text-sm">
                {intent}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          勾选允许识别的意图类型，未勾选的将被过滤
        </p>
      </div>

      {/* 上下文保存 */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">上下文配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="saveToContext"
              checked={config.saveToContext ?? true}
              onCheckedChange={(checked) => onChange('saveToContext', checked)}
            />
            <Label htmlFor="saveToContext" className="text-sm">
              保存识别结果到上下文
            </Label>
          </div>
          {config.saveToContext && (
            <div className="ml-6">
              <Label htmlFor="contextKey" className="text-xs">
                上下文变量名
              </Label>
              <Input
                id="contextKey"
                value={config.contextKey || 'intent'}
                onChange={(e) => onChange('contextKey', e.target.value)}
                placeholder="intent"
                className="mt-1 font-mono text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* 自定义提示词 */}
      <div className="pt-3 border-t border-slate-200">
        <Label htmlFor="systemPrompt" className="text-sm font-medium text-slate-700">
          自定义提示词（可选）
        </Label>
        <Textarea
          id="systemPrompt"
          value={config.systemPrompt || ''}
          onChange={(e) => onChange('systemPrompt', e.target.value)}
          placeholder="输入自定义系统提示词，用于定义意图识别的行为..."
          className="mt-1 resize-none font-mono text-xs"
          rows={3}
        />
        <p className="text-[10px] text-slate-500 mt-1">
          留空则使用默认意图识别提示词
        </p>
      </div>

      {/* 配置预览 */}
      <details className="pt-2 border-t border-slate-200">
        <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
          查看当前配置（JSON）
        </summary>
        <pre className="mt-2 p-2 bg-slate-50 rounded text-[10px] text-slate-600 overflow-x-auto">
          {JSON.stringify(
            {
              modelId: config.modelId || 'doubao-pro-4k',
              confidenceThreshold: config.confidenceThreshold ?? 0.7,
              fallbackIntent: config.fallbackIntent || 'unknown',
              supportedIntents: config.supportedIntents || [],
              saveToContext: config.saveToContext ?? true,
              contextKey: config.contextKey || 'intent',
              systemPrompt: config.systemPrompt || '',
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
}

// 节点3：决策节点配置
function DecisionConfig({ config, onChange }: any) {
  // 获取条件列表
  const conditions = config.conditions || [
    { expression: '', label: '', targetNodeId: '' }
  ];

  // 添加新条件
  const handleAddCondition = () => {
    const newConditions = [...conditions, { expression: '', label: '', targetNodeId: '' }];
    onChange('conditions', newConditions);
  };

  // 删除条件
  const handleRemoveCondition = (index: number) => {
    const newConditions = conditions.filter((_: any, i: number) => i !== index);
    onChange('conditions', newConditions);
  };

  // 更新条件
  const handleUpdateCondition = (index: number, field: string, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    onChange('conditions', newConditions);
  };

  return (
    <div className="space-y-4">
      {/* 决策模式 */}
      <div>
        <Label htmlFor="decisionMode" className="text-sm font-medium text-slate-700">决策模式</Label>
        <Select
          value={config.decisionMode || 'priority'}
          onValueChange={(value) => onChange('decisionMode', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择决策模式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">优先匹配（按顺序匹配第一个符合条件的条件）</SelectItem>
            <SelectItem value="all">全部匹配（所有条件都必须满足）</SelectItem>
            <SelectItem value="any">任意匹配（任一条件满足即可）</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 默认分支 */}
      <div>
        <Label htmlFor="defaultTarget" className="text-sm font-medium text-slate-700">默认分支</Label>
        <p className="text-xs text-slate-500 mt-1">当所有条件都不满足时跳转到的节点</p>
        <Input
          id="defaultTarget"
          value={config.defaultTarget || ''}
          onChange={(e) => onChange('defaultTarget', e.target.value)}
          placeholder="输入默认目标节点ID"
          className="mt-1"
        />
      </div>

      {/* 条件列表 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium text-slate-700">决策条件</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCondition}
            className="h-7 px-2 text-xs"
          >
            + 添加条件
          </Button>
        </div>

        <div className="space-y-3">
          {conditions.map((condition: any, index: number) => (
            <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-600">条件 {index + 1}</span>
                {conditions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCondition(index)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* 条件名称 */}
              <div className="mb-2">
                <Label htmlFor={`condition-label-${index}`} className="text-xs">条件标签</Label>
                <Input
                  id={`condition-label-${index}`}
                  value={condition.label || ''}
                  onChange={(e) => handleUpdateCondition(index, 'label', e.target.value)}
                  placeholder="例如：转人工、AI回复"
                  className="h-8 text-xs"
                />
              </div>

              {/* 条件表达式 */}
              <div className="mb-2">
                <Label htmlFor={`condition-expression-${index}`} className="text-xs">条件表达式</Label>
                <Input
                  id={`condition-expression-${index}`}
                  value={condition.expression || ''}
                  onChange={(e) => handleUpdateCondition(index, 'expression', e.target.value)}
                  placeholder="例如：context.intent === '投诉'"
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  支持变量：context.xxx, data.xxx
                </p>
              </div>

              {/* 目标节点 */}
              <div>
                <Label htmlFor={`condition-target-${index}`} className="text-xs">目标节点ID</Label>
                <Input
                  id={`condition-target-${index}`}
                  value={condition.targetNodeId || ''}
                  onChange={(e) => handleUpdateCondition(index, 'targetNodeId', e.target.value)}
                  placeholder="输入目标节点的ID"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        {/* 条件为空时的提示 */}
        {conditions.length === 0 && (
          <div className="text-center py-4 text-sm text-slate-400">
            暂无条件，点击上方"添加条件"按钮添加
          </div>
        )}
      </div>

      {/* 高级配置 */}
      <div className="pt-2 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">高级配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableLogging"
              checked={config.enableLogging ?? false}
              onCheckedChange={(checked) => onChange('enableLogging', checked)}
            />
            <Label htmlFor="enableLogging" className="text-xs">
              启用决策日志记录
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="strictMode"
              checked={config.strictMode ?? false}
              onCheckedChange={(checked) => onChange('strictMode', checked)}
            />
            <Label htmlFor="strictMode" className="text-xs">
              严格模式（表达式错误时停止流程）
            </Label>
          </div>
        </div>
      </div>

      {/* JSON 视图（可选） */}
      <details className="pt-2 border-t border-slate-200">
        <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
          查看/编辑 JSON 配置
        </summary>
        <Textarea
          value={JSON.stringify({ conditions, decisionMode: config.decisionMode || 'priority', defaultTarget: config.defaultTarget || '' }, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange('conditions', parsed.conditions || []);
              onChange('decisionMode', parsed.decisionMode || 'priority');
              onChange('defaultTarget', parsed.defaultTarget || '');
            } catch (err) {
              // JSON 解析错误，不更新
            }
          }}
          className="mt-2 font-mono text-xs"
          rows={6}
          placeholder="JSON 格式的决策配置"
        />
      </details>
    </div>
  );
}

// 节点4：AI客服回复配置
function AiReplyConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      {/* AI模型选择 */}
      <div>
        <Label htmlFor="modelId">AI模型</Label>
        <Select
          value={config.modelId || 'doubao-pro-4k'}
          onValueChange={(value) => onChange('modelId', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择AI模型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="doubao-pro-4k">豆包 Pro 4K（推荐）</SelectItem>
            <SelectItem value="doubao-pro-32k">豆包 Pro 32K</SelectItem>
            <SelectItem value="doubao-pro-128k">豆包 Pro 128K</SelectItem>
            <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
            <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
            <SelectItem value="kimi-moonshot-v1-8k">Kimi 8K</SelectItem>
            <SelectItem value="kimi-moonshot-v1-32k">Kimi 32K</SelectItem>
            <SelectItem value="kimi-moonshot-v1-128k">Kimi 128K</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 人设选择 */}
      <div>
        <Label htmlFor="personaId">人设ID（可选）</Label>
        <Select
          value={config.personaId || 'none'}
          onValueChange={(value) => onChange('personaId', value === 'none' ? null : value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择人设（可选）" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">无（默认人设）</SelectItem>
            <SelectItem value="customer_service">客服助手</SelectItem>
            <SelectItem value="technical_support">技术支持</SelectItem>
            <SelectItem value="sales_consultant">销售顾问</SelectItem>
            <SelectItem value="friendly_assistant">友好助手</SelectItem>
            <SelectItem value="professional_expert">专业专家</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500 mt-1">选择后系统会应用对应的人设风格</p>
      </div>

      {/* 生成参数配置 */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">生成参数</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <Label htmlFor="temperature" className="text-xs">
              温度参数 ({config.temperature ?? 0.7})
            </Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={config.temperature ?? 0.7}
              onChange={(e) => onChange('temperature', parseFloat(e.target.value))}
              className="mt-1"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              0=确定，1=随机，默认0.7
            </p>
          </div>
          <div>
            <Label htmlFor="maxTokens" className="text-xs">
              最大Token数
            </Label>
            <Input
              id="maxTokens"
              type="number"
              min="1"
              max="32000"
              value={config.maxTokens ?? 1000}
              onChange={(e) => onChange('maxTokens', parseInt(e.target.value))}
              className="mt-1"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              默认1000，最大32000
            </p>
          </div>
        </div>
      </div>

      {/* 上下文配置 */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">上下文配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="useContextHistory"
              checked={config.useContextHistory ?? true}
              onCheckedChange={(checked) => onChange('useContextHistory', checked)}
            />
            <Label htmlFor="useContextHistory" className="text-sm">
              使用上下文历史
            </Label>
          </div>
          {config.useContextHistory && (
            <div>
              <Label htmlFor="contextWindowSize" className="text-xs">
                上下文窗口大小
              </Label>
              <Input
                id="contextWindowSize"
                type="number"
                min="1"
                max="50"
                value={config.contextWindowSize ?? 10}
                onChange={(e) => onChange('contextWindowSize', parseInt(e.target.value))}
                className="mt-1"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                包含最近N条消息，默认10
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 高级功能 */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">高级功能</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableThinking"
              checked={config.enableThinking ?? false}
              onCheckedChange={(checked) => onChange('enableThinking', checked)}
            />
            <Label htmlFor="enableThinking" className="text-sm">
              启用思考模式（Chain of Thought）
            </Label>
          </div>
          <p className="text-[10px] text-slate-500 ml-6">
            AI会在回答前进行推理，适合复杂问题，但会增加响应时间
          </p>
        </div>
      </div>

      {/* 系统提示词 */}
      <div className="pt-3 border-t border-slate-200">
        <Label htmlFor="systemPrompt" className="text-sm font-medium text-slate-700">
          系统提示词（可选）
        </Label>
        <Textarea
          id="systemPrompt"
          value={config.systemPrompt || ''}
          onChange={(e) => onChange('systemPrompt', e.target.value)}
          placeholder="输入系统提示词，用于定义AI的角色和行为..."
          className="mt-1 resize-none font-mono text-xs"
          rows={4}
        />
        <p className="text-[10px] text-slate-500 mt-1">
          系统提示词会影响AI的回复风格和内容，留空则使用默认提示词
        </p>
      </div>

      {/* 配置预览 */}
      <details className="pt-2 border-t border-slate-200">
        <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
          查看当前配置（JSON）
        </summary>
        <pre className="mt-2 p-2 bg-slate-50 rounded text-[10px] text-slate-600 overflow-x-auto">
          {JSON.stringify(
            {
              modelId: config.modelId || 'doubao-pro-4k',
              personaId: config.personaId || '',
              temperature: config.temperature ?? 0.7,
              maxTokens: config.maxTokens ?? 1000,
              useContextHistory: config.useContextHistory ?? true,
              contextWindowSize: config.contextWindowSize ?? 10,
              enableThinking: config.enableThinking ?? false,
              systemPrompt: config.systemPrompt || '',
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
}

// 节点5：消息分发配置
function MessageDispatchConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">群发配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableGroupDispatch"
              checked={config.groupDispatch?.enabled ?? true}
              onCheckedChange={(checked) =>
                onChange('groupDispatch', {
                  ...(config.groupDispatch || {}),
                  enabled: checked,
                })
              }
            />
            <Label htmlFor="enableGroupDispatch" className="text-sm">
              启用群发
            </Label>
          </div>
          <div>
            <Label htmlFor="groupTargetSource" className="text-sm">
              目标名称来源
            </Label>
            <Select
              value={config.groupDispatch?.targetNameSource || 'context'}
              onValueChange={(value) =>
                onChange('groupDispatch', {
                  ...(config.groupDispatch || {}),
                  targetNameSource: value,
                })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择目标名称来源" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="context">从上下文获取 (groupName)</SelectItem>
                <SelectItem value="custom">使用自定义群名</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">私发配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enablePrivateDispatch"
              checked={config.privateDispatch?.enabled ?? false}
              onCheckedChange={(checked) =>
                onChange('privateDispatch', {
                  ...(config.privateDispatch || {}),
                  enabled: checked,
                })
              }
            />
            <Label htmlFor="enablePrivateDispatch" className="text-sm">
              启用私发
            </Label>
          </div>
          <div>
            <Label htmlFor="privateTargetSource" className="text-sm">
              目标名称来源
            </Label>
            <Select
              value={config.privateDispatch?.targetNameSource || 'context'}
              onValueChange={(value) =>
                onChange('privateDispatch', {
                  ...(config.privateDispatch || {}),
                  targetNameSource: value,
                })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择目标名称来源" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="context">从上下文获取 (userName)</SelectItem>
                <SelectItem value="custom">使用自定义目标</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">@机器人配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="requireAtMe"
              checked={config.atMe?.requireAtMe ?? true}
              onCheckedChange={(checked) =>
                onChange('atMe', {
                  ...(config.atMe || {}),
                  requireAtMe: checked,
                })
              }
            />
            <Label htmlFor="requireAtMe" className="text-sm">
              必须@机器人才回复
            </Label>
          </div>
          <div>
            <Label htmlFor="onNotAtMe" className="text-sm">
              未@时的处理方式
            </Label>
            <Select
              value={config.atMe?.onNotAtMe || 'ignore'}
              onValueChange={(value) =>
                onChange('atMe', {
                  ...(config.atMe || {}),
                  onNotAtMe: value,
                })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择处理方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ignore">忽略消息</SelectItem>
                <SelectItem value="continue">继续处理</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

// 节点6：发送指令配置
function SendCommandConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      {/* 指令类型 */}
      <div>
        <Label htmlFor="commandType">指令类型</Label>
        <Select
          value={config.commandType || 'message'}
          onValueChange={(value) => onChange('commandType', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择指令类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="message">消息</SelectItem>
            <SelectItem value="notification">通知</SelectItem>
            <SelectItem value="command">指令</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 机器人ID */}
      <div>
        <Label htmlFor="robotId">机器人ID</Label>
        <Input
          id="robotId"
          value={config.robotId || ''}
          onChange={(e) => onChange('robotId', e.target.value)}
          placeholder="输入机器人ID"
          className="mt-1"
        />
        <p className="text-xs text-slate-500 mt-1">
          指定发送消息的机器人
        </p>
      </div>

      {/* 接收者配置 */}
      <div>
        <Label className="text-sm font-medium text-slate-700">接收者配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="recipients" className="text-xs">
              接收者列表
            </Label>
            <Textarea
              id="recipients"
              value={config.recipients?.join('\n') || ''}
              onChange={(e) => {
                const recipients = e.target.value
                  .split('\n')
                  .map(r => r.trim())
                  .filter(r => r.length > 0);
                onChange('recipients', recipients);
              }}
              placeholder="每行输入一个接收者ID或名称&#10;例如：&#10;user_123&#10;group_456&#10;admin"
              className="mt-1 resize-none font-mono text-xs"
              rows={4}
            />
            <p className="text-[10px] text-slate-500 mt-1">
              每行一个接收者，支持用户ID、群组ID等
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="recipientsFromContext"
              checked={config.recipientsFromContext ?? false}
              onCheckedChange={(checked) => onChange('recipientsFromContext', checked)}
            />
            <Label htmlFor="recipientsFromContext" className="text-sm">
              从上下文获取接收者
            </Label>
          </div>
          {config.recipientsFromContext && (
            <div>
              <Label htmlFor="recipientsExpression" className="text-xs">
                接收者表达式
              </Label>
              <Input
                id="recipientsExpression"
                value={config.recipientsExpression || ''}
                onChange={(e) => onChange('recipientsExpression', e.target.value)}
                placeholder="context.recipients"
                className="mt-1 font-mono text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* 消息内容 */}
      <div className="pt-3 border-t border-slate-200">
        <Label htmlFor="messageSource">消息来源</Label>
        <Select
          value={config.messageSource || 'ai_response'}
          onValueChange={(value) => onChange('messageSource', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择消息来源" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ai_response">AI回复结果</SelectItem>
            <SelectItem value="fixed">固定消息内容</SelectItem>
            <SelectItem value="template">消息模板</SelectItem>
            <SelectItem value="custom">自定义变量</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.messageSource === 'fixed' && (
        <div>
          <Label htmlFor="messageContent">消息内容</Label>
          <Textarea
            id="messageContent"
            value={config.messageContent || ''}
            onChange={(e) => onChange('messageContent', e.target.value)}
            placeholder="输入固定消息内容（支持变量：{{userName}}, {{intent}}等）"
            className="mt-1 resize-none"
            rows={3}
          />
        </div>
      )}

      {config.messageSource === 'template' && (
        <div>
          <Label htmlFor="messageTemplate">消息模板</Label>
          <Textarea
            id="messageTemplate"
            value={config.messageTemplate || ''}
            onChange={(e) => onChange('messageTemplate', e.target.value)}
            placeholder="输入消息模板"
            className="mt-1 resize-none"
            rows={3}
          />
        </div>
      )}

      {/* 高级配置 */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">高级配置</Label>
        <div className="space-y-3 mt-2">
          {/* 优先级 */}
          <div>
            <Label htmlFor="priority" className="text-xs">
              优先级
            </Label>
            <Select
              value={config.priority || 'normal'}
              onValueChange={(value) => onChange('priority', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">低</SelectItem>
                <SelectItem value="normal">普通（默认）</SelectItem>
                <SelectItem value="high">高</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 日志保存 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="saveLog"
              checked={config.saveLog ?? true}
              onCheckedChange={(checked) => onChange('saveLog', checked)}
            />
            <Label htmlFor="saveLog" className="text-sm">
              保存发送日志
            </Label>
          </div>

          {/* 重试配置 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableRetry"
              checked={config.enableRetry ?? true}
              onCheckedChange={(checked) => onChange('enableRetry', checked)}
            />
            <Label htmlFor="enableRetry" className="text-sm">
              启用失败重试
            </Label>
          </div>
          {config.enableRetry && (
            <div className="grid grid-cols-2 gap-2 ml-6">
              <div>
                <Label htmlFor="retryCount" className="text-xs">
                  重试次数
                </Label>
                <Input
                  id="retryCount"
                  type="number"
                  min="0"
                  max="10"
                  value={config.retryCount ?? 3}
                  onChange={(e) => onChange('retryCount', parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="retryDelay" className="text-xs">
                  延迟（毫秒）
                </Label>
                <Input
                  id="retryDelay"
                  type="number"
                  min="0"
                  max="60000"
                  value={config.retryDelay ?? 2000}
                  onChange={(e) => onChange('retryDelay', parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* @人配置 */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">@人配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableAtList"
              checked={config.enableAtList ?? false}
              onCheckedChange={(checked) => onChange('enableAtList', checked)}
            />
            <Label htmlFor="enableAtList" className="text-sm">
              启用@人功能
            </Label>
          </div>
          {config.enableAtList && (
            <div>
              <Label htmlFor="dynamicAtListExpression" className="text-xs">
                动态表达式
              </Label>
              <Input
                id="dynamicAtListExpression"
                value={config.dynamicAtListExpression || ''}
                onChange={(e) => onChange('dynamicAtListExpression', e.target.value)}
                placeholder="{{userName}}"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                支持变量：{'{{userName}}'}, {'{{groupName}}'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 配置预览 */}
      <details className="pt-2 border-t border-slate-200">
        <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
          查看当前配置（JSON）
        </summary>
        <pre className="mt-2 p-2 bg-slate-50 rounded text-[10px] text-slate-600 overflow-x-auto">
          {JSON.stringify(
            {
              commandType: config.commandType || 'message',
              robotId: config.robotId || '',
              recipients: config.recipients || [],
              messageSource: config.messageSource || 'ai_response',
              messageContent: config.messageContent || '',
              priority: config.priority || 'normal',
              saveLog: config.saveLog ?? true,
              enableRetry: config.enableRetry ?? true,
              retryCount: config.retryCount ?? 3,
              retryDelay: config.retryDelay ?? 2000,
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
}

// 节点7：指令状态记录配置
function CommandStatusConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">保存配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="saveToRobotCommands"
              checked={config.saveToRobotCommands ?? true}
              onCheckedChange={(checked) => onChange('saveToRobotCommands', checked)}
            />
            <Label htmlFor="saveToRobotCommands" className="text-sm">
              保存到robotCommands表
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="updateSessionMessages"
              checked={config.updateSessionMessages ?? true}
              onCheckedChange={(checked) => onChange('updateSessionMessages', checked)}
            />
            <Label htmlFor="updateSessionMessages" className="text-sm">
              更新session_messages表
            </Label>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">WebSocket推送配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableWebSocketPush"
              checked={config.enableWebSocketPush ?? true}
              onCheckedChange={(checked) => onChange('enableWebSocketPush', checked)}
            />
            <Label htmlFor="enableWebSocketPush" className="text-sm">
              启用WebSocket实时推送
            </Label>
          </div>
          <Select
            value={config.pushTarget || 'both'}
            onValueChange={(value) => onChange('pushTarget', value)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="选择推送目标" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="panel1">仅面板1 (业务消息监控)</SelectItem>
              <SelectItem value="panel2">仅面板2 (AI交互监控)</SelectItem>
              <SelectItem value="both">双面板</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// 节点9：告警入库配置
function AlertSaveConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="alertType">告警类型</Label>
        <Select
          value={config.alertType || 'intent'}
          onValueChange={(value) => onChange('alertType', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择告警类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="intent">意图告警</SelectItem>
            <SelectItem value="keyword">关键词告警</SelectItem>
            <SelectItem value="frequency">频率告警</SelectItem>
            <SelectItem value="custom">自定义告警</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.alertType === 'intent' && (
        <div>
          <Label htmlFor="intentType">意图类型</Label>
          <Input
            id="intentType"
            value={config.intentType || ''}
            onChange={(e) => onChange('intentType', e.target.value)}
            placeholder="输入意图类型（如：risk, spam）"
            className="mt-1"
          />
        </div>
      )}

      <div>
        <Label htmlFor="alertLevel">告警级别</Label>
        <Select
          value={config.alertLevel || 'warning'}
          onValueChange={(value) => onChange('alertLevel', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择告警级别" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="critical">严重 (Critical)</SelectItem>
            <SelectItem value="warning">警告 (Warning)</SelectItem>
            <SelectItem value="info">信息 (Info)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.alertType === 'keyword' && (
        <div>
          <Label htmlFor="keywords">关键词列表</Label>
          <Textarea
            id="keywords"
            value={config.keywords?.join(', ') || ''}
            onChange={(e) => onChange('keywords', e.target.value.split(',').map(k => k.trim()))}
            placeholder="输入关键词，用逗号分隔"
            className="mt-1 resize-none"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

// 节点10：告警规则判断配置
function AlertRuleConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      {/* 规则类型 */}
      <div>
        <Label htmlFor="ruleType" className="text-sm font-medium text-slate-700">规则类型</Label>
        <Select
          value={config.ruleType || 'threshold'}
          onValueChange={(value) => onChange('ruleType', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择规则类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="threshold">阈值规则（超过阈值触发）</SelectItem>
            <SelectItem value="frequency">频率规则（指定时间内触发次数）</SelectItem>
            <SelectItem value="trend">趋势规则（持续增长/下降）</SelectItem>
            <SelectItem value="custom">自定义规则（复杂条件）</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 阈值规则配置 */}
      {config.ruleType === 'threshold' && (
        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
          <Label className="text-xs font-medium text-orange-800">阈值配置</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <Label htmlFor="thresholdValue" className="text-xs">阈值</Label>
              <Input
                id="thresholdValue"
                type="number"
                value={config.thresholdValue || ''}
                onChange={(e) => onChange('thresholdValue', parseFloat(e.target.value))}
                placeholder="输入阈值"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="thresholdOperator" className="text-xs">比较运算符</Label>
              <Select
                value={config.thresholdOperator || '>'}
                onValueChange={(value) => onChange('thresholdOperator', value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="&gt;">大于 (&gt;)</SelectItem>
                  <SelectItem value="&gt;=">大于等于 (≥)</SelectItem>
                  <SelectItem value="&lt;">小于 (&lt;)</SelectItem>
                  <SelectItem value="&lt;=">小于等于 (≤)</SelectItem>
                  <SelectItem value="==">等于 (==)</SelectItem>
                  <SelectItem value="!=">不等于 (!=)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-2">
            <Label htmlFor="thresholdField" className="text-xs">监控字段</Label>
            <Input
              id="thresholdField"
              value={config.thresholdField || ''}
              onChange={(e) => onChange('thresholdField', e.target.value)}
              placeholder="例如：alertLevel, severity"
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* 频率规则配置 */}
      {config.ruleType === 'frequency' && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Label className="text-xs font-medium text-blue-800">频率配置</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <Label htmlFor="frequencyCount" className="text-xs">触发次数</Label>
              <Input
                id="frequencyCount"
                type="number"
                value={config.frequencyCount || ''}
                onChange={(e) => onChange('frequencyCount', parseInt(e.target.value))}
                placeholder="输入次数"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="frequencyTimeWindow" className="text-xs">时间窗口（秒）</Label>
              <Input
                id="frequencyTimeWindow"
                type="number"
                value={config.frequencyTimeWindow || ''}
                onChange={(e) => onChange('frequencyTimeWindow', parseInt(e.target.value))}
                placeholder="例如：60"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <p className="text-[10px] text-blue-600 mt-2">
            在指定时间窗口内达到触发次数时告警
          </p>
        </div>
      )}

      {/* 趋势规则配置 */}
      {config.ruleType === 'trend' && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <Label className="text-xs font-medium text-green-800">趋势配置</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <Label htmlFor="trendType" className="text-xs">趋势类型</Label>
              <Select
                value={config.trendType || 'increasing'}
                onValueChange={(value) => onChange('trendType', value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increasing">持续增长</SelectItem>
                  <SelectItem value="decreasing">持续下降</SelectItem>
                  <SelectItem value="sudden_spike">突增</SelectItem>
                  <SelectItem value="sudden_drop">骤降</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="trendThreshold" className="text-xs">阈值（%）</Label>
              <Input
                id="trendThreshold"
                type="number"
                value={config.trendThreshold || ''}
                onChange={(e) => onChange('trendThreshold', parseFloat(e.target.value))}
                placeholder="例如：50"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* 升级策略 */}
      <div>
        <Label className="text-sm font-medium text-slate-700">升级策略</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="escalationLevel" className="text-xs">升级级别</Label>
            <Select
              value={config.escalationLevel || 'none'}
              onValueChange={(value) => onChange('escalationLevel', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不升级</SelectItem>
                <SelectItem value="level1">一级升级（通知组长）</SelectItem>
                <SelectItem value="level2">二级升级（通知主管）</SelectItem>
                <SelectItem value="level3">三级升级（通知高管）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(config.escalationLevel === 'level1' || config.escalationLevel === 'level2' || config.escalationLevel === 'level3') && (
            <div>
              <Label htmlFor="escalationTimeout" className="text-xs">升级超时（分钟）</Label>
              <Input
                id="escalationTimeout"
                type="number"
                value={config.escalationTimeout || 30}
                onChange={(e) => onChange('escalationTimeout', parseInt(e.target.value))}
                placeholder="未处理多久后升级"
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* 通知渠道 */}
      <div>
        <Label className="text-sm font-medium text-slate-700">通知渠道</Label>
        <div className="space-y-2 mt-2">
          {[
            { id: 'notifyWebSocket', label: 'WebSocket 实时通知' },
            { id: 'notifyEmail', label: '邮件通知' },
            { id: 'notifySMS', label: '短信通知' },
            { id: 'notifyWebhook', label: 'Webhook 回调' }
          ].map((channel) => (
            <div key={channel.id} className="flex items-center space-x-2">
              <Checkbox
                id={channel.id}
                checked={config[channel.id] ?? false}
                onCheckedChange={(checked) => onChange(channel.id, checked)}
              />
              <Label htmlFor={channel.id} className="text-xs">
                {channel.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* 自定义规则配置 */}
      {config.ruleType === 'custom' && (
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <Label className="text-xs font-medium text-purple-800">自定义规则表达式</Label>
          <Textarea
            value={config.customExpression || ''}
            onChange={(e) => onChange('customExpression', e.target.value)}
            placeholder="输入自定义规则表达式，例如：alertLevel === 'critical' && duration > 300"
            className="mt-2 font-mono text-xs resize-none"
            rows={3}
          />
          <p className="text-[10px] text-purple-600 mt-1">
            支持使用 JavaScript 表达式，可访问 alert 对象的所有字段
          </p>
        </div>
      )}

      {/* 高级配置 */}
      <div className="pt-2 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">高级配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableDeduplication"
              checked={config.enableDeduplication ?? false}
              onCheckedChange={(checked) => onChange('enableDeduplication', checked)}
            />
            <Label htmlFor="enableDeduplication" className="text-xs">
              启用告警去重（相同内容不重复告警）
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableAutoResolve"
              checked={config.enableAutoResolve ?? false}
              onCheckedChange={(checked) => onChange('enableAutoResolve', checked)}
            />
            <Label htmlFor="enableAutoResolve" className="text-xs">
              启用自动解决（满足条件后自动关闭）
            </Label>
          </div>
          {config.enableAutoResolve && (
            <div>
              <Label htmlFor="autoResolveCondition" className="text-xs">自动解决条件</Label>
              <Input
                id="autoResolveCondition"
                value={config.autoResolveCondition || ''}
                onChange={(e) => onChange('autoResolveCondition', e.target.value)}
                placeholder="例如：status === 'resolved'"
                className="h-8 text-xs font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* JSON 视图（可选） */}
      <details className="pt-2 border-t border-slate-200">
        <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
          查看/编辑 JSON 配置
        </summary>
        <Textarea
          value={JSON.stringify(config, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              Object.keys(parsed).forEach(key => onChange(key, parsed[key]));
            } catch (err) {
              // JSON 解析错误，不更新
            }
          }}
          className="mt-2 font-mono text-xs"
          rows={6}
          placeholder="JSON 格式的规则配置"
        />
      </details>
    </div>
  );
}

// 节点B3：执行通知配置
function ExecuteNotificationConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      {/* 通知渠道配置 */}
      <div>
        <Label className="text-sm font-medium text-slate-700">通知渠道</Label>
        <p className="text-xs text-slate-500 mt-1">选择需要启用的通知方式</p>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableRobotNotification"
              checked={config.enableRobotNotification ?? true}
              onCheckedChange={(checked) => onChange('enableRobotNotification', checked)}
            />
            <Label htmlFor="enableRobotNotification" className="text-xs">
              机器人通知（企业微信）
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableEmailNotification"
              checked={config.enableEmailNotification ?? false}
              onCheckedChange={(checked) => onChange('enableEmailNotification', checked)}
            />
            <Label htmlFor="enableEmailNotification" className="text-xs">
              邮件通知
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableSMSNotification"
              checked={config.enableSMSNotification ?? false}
              onCheckedChange={(checked) => onChange('enableSMSNotification', checked)}
            />
            <Label htmlFor="enableSMSNotification" className="text-xs">
              短信通知
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableWebhookNotification"
              checked={config.enableWebhookNotification ?? false}
              onCheckedChange={(checked) => onChange('enableWebhookNotification', checked)}
            />
            <Label htmlFor="enableWebhookNotification" className="text-xs">
              Webhook 回调
            </Label>
          </div>
        </div>
      </div>

      {/* 机器人通知配置 */}
      {config.enableRobotNotification && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <Label className="text-xs font-medium text-green-800">机器人通知配置</Label>
          <div className="space-y-2 mt-2">
            <div>
              <Label htmlFor="robotSendType" className="text-xs">发送方式</Label>
              <Select
                value={config.robotSendType || 'private'}
                onValueChange={(value) => onChange('robotSendType', value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">私聊</SelectItem>
                  <SelectItem value="group">群消息</SelectItem>
                  <SelectItem value="both">私聊+群消息</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="robotTarget" className="text-xs">目标用户/群组</Label>
              <Input
                id="robotTarget"
                value={config.robotTarget || ''}
                onChange={(e) => onChange('robotTarget', e.target.value)}
                placeholder="输入用户名或群名（支持逗号分隔多个）"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* 邮件通知配置 */}
      {config.enableEmailNotification && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Label className="text-xs font-medium text-blue-800">邮件通知配置</Label>
          <div className="space-y-2 mt-2">
            <div>
              <Label htmlFor="emailSubject" className="text-xs">邮件主题</Label>
              <Input
                id="emailSubject"
                value={config.emailSubject || ''}
                onChange={(e) => onChange('emailSubject', e.target.value)}
                placeholder="输入邮件主题"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="emailRecipients" className="text-xs">收件人</Label>
              <Input
                id="emailRecipients"
                value={config.emailRecipients || ''}
                onChange={(e) => onChange('emailRecipients', e.target.value)}
                placeholder="输入邮箱地址（支持逗号分隔多个）"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Webhook 配置 */}
      {config.enableWebhookNotification && (
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <Label className="text-xs font-medium text-purple-800">Webhook 配置</Label>
          <div className="space-y-2 mt-2">
            <div>
              <Label htmlFor="webhookUrl" className="text-xs">Webhook URL</Label>
              <Input
                id="webhookUrl"
                value={config.webhookUrl || ''}
                onChange={(e) => onChange('webhookUrl', e.target.value)}
                placeholder="https://example.com/webhook"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="webhookMethod" className="text-xs">请求方法</Label>
              <Select
                value={config.webhookMethod || 'POST'}
                onValueChange={(value) => onChange('webhookMethod', value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="webhookIncludeHeaders"
                checked={config.webhookIncludeHeaders ?? true}
                onCheckedChange={(checked) => onChange('webhookIncludeHeaders', checked)}
              />
              <Label htmlFor="webhookIncludeHeaders" className="text-xs">
                包含请求头
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* 通知内容配置 */}
      <div>
        <Label className="text-sm font-medium text-slate-700">通知内容</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="notificationTitle" className="text-xs">标题</Label>
            <Input
              id="notificationTitle"
              value={config.notificationTitle || ''}
              onChange={(e) => onChange('notificationTitle', e.target.value)}
              placeholder="输入通知标题（支持变量：{{alertType}}, {{severity}}等）"
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="notificationBody" className="text-xs">正文内容</Label>
            <Textarea
              id="notificationBody"
              value={config.notificationBody || ''}
              onChange={(e) => onChange('notificationBody', e.target.value)}
              placeholder="输入通知正文内容"
              className="mt-1 resize-none text-xs"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="notificationTemplate" className="text-xs">消息模板</Label>
            <Select
              value={config.notificationTemplate || 'default'}
              onValueChange={(value) => onChange('notificationTemplate', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="选择消息模板" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">默认模板</SelectItem>
                <SelectItem value="simple">简洁模板</SelectItem>
                <SelectItem value="detailed">详细模板</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 通知优先级和紧急程度 */}
      <div>
        <Label className="text-sm font-medium text-slate-700">优先级配置</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label htmlFor="notificationPriority" className="text-xs">优先级</Label>
            <Select
              value={config.notificationPriority || 'normal'}
              onValueChange={(value) => onChange('notificationPriority', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">低优先级</SelectItem>
                <SelectItem value="normal">普通优先级</SelectItem>
                <SelectItem value="high">高优先级</SelectItem>
                <SelectItem value="urgent">紧急</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="notificationUrgency" className="text-xs">紧急程度</Label>
            <Select
              value={config.notificationUrgency || 'medium'}
              onValueChange={(value) => onChange('notificationUrgency', value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">低</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="critical">严重</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 重试和失败处理 */}
      <div>
        <Label className="text-sm font-medium text-slate-700">重试配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableNotificationRetry"
              checked={config.enableNotificationRetry ?? true}
              onCheckedChange={(checked) => onChange('enableNotificationRetry', checked)}
            />
            <Label htmlFor="enableNotificationRetry" className="text-xs">
              启用失败重试
            </Label>
          </div>
          {config.enableNotificationRetry && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="maxRetryAttempts" className="text-xs">最大重试次数</Label>
                <Input
                  id="maxRetryAttempts"
                  type="number"
                  min="0"
                  max="10"
                  value={config.maxRetryAttempts ?? 3}
                  onChange={(e) => onChange('maxRetryAttempts', parseInt(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="retryInterval" className="text-xs">重试间隔（秒）</Label>
                <Input
                  id="retryInterval"
                  type="number"
                  min="0"
                  max="3600"
                  value={config.retryInterval ?? 30}
                  onChange={(e) => onChange('retryInterval', parseInt(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* JSON 视图（可选） */}
      <details className="pt-2 border-t border-slate-200">
        <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
          查看/编辑 JSON 配置
        </summary>
        <Textarea
          value={JSON.stringify(config, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              Object.keys(parsed).forEach(key => onChange(key, parsed[key]));
            } catch (err) {
              // JSON 解析错误，不更新
            }
          }}
          className="mt-2 font-mono text-xs"
          rows={6}
          placeholder="JSON 格式的通知配置"
        />
      </details>
    </div>
  );
}

// 风险处理节点配置
function RiskHandlerConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="riskModelId">AI模型</Label>
        <Select
          value={config.riskModelId || 'doubao'}
          onValueChange={(value) => onChange('riskModelId', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择AI模型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="doubao">豆包（默认）</SelectItem>
            <SelectItem value="deepseek">DeepSeek</SelectItem>
            <SelectItem value="kimi">Kimi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="riskLevelThreshold">风险等级阈值</Label>
        <Select
          value={config.riskLevelThreshold || 'medium'}
          onValueChange={(value) => onChange('riskLevelThreshold', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择风险等级阈值" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">低风险（low）</SelectItem>
            <SelectItem value="medium">中风险（medium）</SelectItem>
            <SelectItem value="high">高风险（high）</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">AI安抚消息配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="comfortMessageTemplate">安抚消息模板</Label>
            <Textarea
              id="comfortMessageTemplate"
              value={config.comfortMessageTemplate || '您好，我理解您的担忧。我们会尽快为您处理这个问题。'}
              onChange={(e) => onChange('comfortMessageTemplate', e.target.value)}
              placeholder="输入安抚消息模板（支持变量：{{userName}}, {{intent}}等）"
              className="mt-1 resize-none"
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableComfort"
              checked={config.enableComfort ?? true}
              onCheckedChange={(checked) => onChange('enableComfort', checked)}
            />
            <Label htmlFor="enableComfort" className="text-sm">
              启用AI安抚消息
            </Label>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">人工通知配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableHumanNotify"
              checked={config.enableHumanNotify ?? true}
              onCheckedChange={(checked) => onChange('enableHumanNotify', checked)}
            />
            <Label htmlFor="enableHumanNotify" className="text-sm">
              启用人工通知
            </Label>
          </div>
          {config.enableHumanNotify && (
            <>
              <div>
                <Label htmlFor="notifyMessage" className="text-sm">
                  通知消息内容
                </Label>
                <Textarea
                  id="notifyMessage"
                  value={config.notifyMessage || '检测到风险对话，需要人工介入处理。'}
                  onChange={(e) => onChange('notifyMessage', e.target.value)}
                  placeholder="输入人工通知消息"
                  className="mt-1 resize-none"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="notifyTargets" className="text-sm">
                  通知目标（管理员用户名，逗号分隔）
                </Label>
                <Input
                  id="notifyTargets"
                  value={config.notifyTargets || ''}
                  onChange={(e) => onChange('notifyTargets', e.target.value)}
                  placeholder="admin1,admin2"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="notifyMethod" className="text-sm">
                  通知方式
                </Label>
                <Select
                  value={config.notifyMethod || 'private'}
                  onValueChange={(value) => onChange('notifyMethod', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="选择通知方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">私聊</SelectItem>
                    <SelectItem value="group">群消息</SelectItem>
                    <SelectItem value="both">私聊+群消息</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 监控节点配置
function MonitorConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="monitorTarget">监控目标</Label>
        <Select
          value={config.monitorTarget || 'group'}
          onValueChange={(value) => onChange('monitorTarget', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择监控目标" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="group">群组</SelectItem>
            <SelectItem value="user">用户</SelectItem>
            <SelectItem value="all">全局监控</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.monitorTarget === 'group' && (
        <div>
          <Label htmlFor="targetGroupName" className="text-sm">
            目标群组名称
          </Label>
          <Input
            id="targetGroupName"
            value={config.targetGroupName || ''}
            onChange={(e) => onChange('targetGroupName', e.target.value)}
            placeholder="输入群组名称"
            className="mt-1"
          />
        </div>
      )}

      {config.monitorTarget === 'user' && (
        <div>
          <Label htmlFor="targetUserName" className="text-sm">
            目标用户名称
          </Label>
          <Input
            id="targetUserName"
            value={config.targetUserName || ''}
            onChange={(e) => onChange('targetUserName', e.target.value)}
            placeholder="输入用户名称"
            className="mt-1"
          />
        </div>
      )}

      <div>
        <Label className="text-sm font-medium text-slate-700">监控内容配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="monitorAllMessages"
              checked={config.monitorAllMessages ?? true}
              onCheckedChange={(checked) => onChange('monitorAllMessages', checked)}
            />
            <Label htmlFor="monitorAllMessages" className="text-sm">
              监控所有消息
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="monitorAtMentions"
              checked={config.monitorAtMentions ?? false}
              onCheckedChange={(checked) => onChange('monitorAtMentions', checked)}
            />
            <Label htmlFor="monitorAtMentions" className="text-sm">
              仅监控@机器人的消息
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="monitorKeywords"
              checked={config.monitorKeywords ?? false}
              onCheckedChange={(checked) => onChange('monitorKeywords', checked)}
            />
            <Label htmlFor="monitorKeywords" className="text-sm">
              关键词监控
            </Label>
          </div>
        </div>
      </div>

      {config.monitorKeywords && (
        <div>
          <Label htmlFor="keywordList" className="text-sm">
            关键词列表（逗号分隔）
          </Label>
          <Input
            id="keywordList"
            value={config.keywordList || ''}
            onChange={(e) => onChange('keywordList', e.target.value)}
            placeholder="告警,故障,问题"
            className="mt-1"
          />
        </div>
      )}

      <div>
        <Label className="text-sm font-medium text-slate-700">响应配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="triggerAction" className="text-sm">
              触发后的动作
            </Label>
            <Select
              value={config.triggerAction || 'passive'}
              onValueChange={(value) => onChange('triggerAction', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择触发动作" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passive">仅记录，不触发流程</SelectItem>
                <SelectItem value="active">触发流程继续执行</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="monitorTimeout" className="text-sm">
              监控超时时间（秒）
            </Label>
            <Input
              id="monitorTimeout"
              type="number"
              min="0"
              max="3600"
              value={config.monitorTimeout ?? 300}
              onChange={(e) => onChange('monitorTimeout', parseInt(e.target.value))}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">数据存储配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="saveMonitorData"
              checked={config.saveMonitorData ?? true}
              onCheckedChange={(checked) => onChange('saveMonitorData', checked)}
            />
            <Label htmlFor="saveMonitorData" className="text-sm">
              保存监控数据到数据库
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableWebSocketPush"
              checked={config.enableWebSocketPush ?? false}
              onCheckedChange={(checked) => onChange('enableWebSocketPush', checked)}
            />
            <Label htmlFor="enableWebSocketPush" className="text-sm">
              启用WebSocket实时推送
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}

// END 节点配置
function EndConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      {/* 结束类型 */}
      <div>
        <Label htmlFor="endType">结束类型</Label>
        <Select
          value={config.endType || 'success'}
          onValueChange={(value) => onChange('endType', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择结束类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="success">成功结束</SelectItem>
            <SelectItem value="failure">失败结束</SelectItem>
            <SelectItem value="manual">手动结束</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500 mt-1">
          标记流程的结束状态
        </p>
      </div>

      {/* 返回消息 */}
      <div>
        <Label htmlFor="returnMessage">返回消息（可选）</Label>
        <Textarea
          id="returnMessage"
          value={config.returnMessage || ''}
          onChange={(e) => onChange('returnMessage', e.target.value)}
          placeholder="输入流程结束时的返回消息"
          className="mt-1 resize-none"
          rows={3}
        />
        <p className="text-xs text-slate-500 mt-1">
          流程结束时显示给用户的消息，支持变量：{"{{userName}}"}, {"{{intent}}"}等
        </p>
      </div>

      {/* 会话处理 */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">会话处理</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="saveSession"
              checked={config.saveSession ?? true}
              onCheckedChange={(checked) => onChange('saveSession', checked)}
            />
            <Label htmlFor="saveSession" className="text-sm">
              保存会话数据
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cleanupContext"
              checked={config.cleanupContext ?? true}
              onCheckedChange={(checked) => onChange('cleanupContext', checked)}
            />
            <Label htmlFor="cleanupContext" className="text-sm">
              清理流程上下文
            </Label>
          </div>
        </div>
      </div>

      {/* 日志记录 */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">日志记录</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="logEndTime"
              checked={config.logEndTime ?? true}
              onCheckedChange={(checked) => onChange('logEndTime', checked)}
            />
            <Label htmlFor="logEndTime" className="text-sm">
              记录结束时间
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="logSummary"
              checked={config.logSummary ?? false}
              onCheckedChange={(checked) => onChange('logSummary', checked)}
            />
            <Label htmlFor="logSummary" className="text-sm">
              生成流程执行摘要
            </Label>
          </div>
        </div>
      </div>

      {/* 配置预览 */}
      <details className="pt-2 border-t border-slate-200">
        <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
          查看当前配置（JSON）
        </summary>
        <pre className="mt-2 p-2 bg-slate-50 rounded text-[10px] text-slate-600 overflow-x-auto">
          {JSON.stringify(
            {
              endType: config.endType || 'success',
              returnMessage: config.returnMessage || '',
              saveSession: config.saveSession ?? true,
              cleanupContext: config.cleanupContext ?? true,
              logEndTime: config.logEndTime ?? true,
              logSummary: config.logSummary ?? false,
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
}

// ROBOT_DISPATCH 节点配置（第13种节点）
function RobotDispatchConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      {/* 机器人选择 */}
      <div>
        <Label htmlFor="robotId">机器人ID</Label>
        <Input
          id="robotId"
          value={config.robotId || ''}
          onChange={(e) => onChange('robotId', e.target.value)}
          placeholder="输入机器人ID"
          className="mt-1"
        />
        <p className="text-xs text-slate-500 mt-1">
          指定处理消息的机器人
        </p>
      </div>

      {/* 分发模式 */}
      <div>
        <Label htmlFor="dispatchMode">分发模式</Label>
        <Select
          value={config.dispatchMode || 'single'}
          onValueChange={(value) => onChange('dispatchMode', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择分发模式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">单机器人</SelectItem>
            <SelectItem value="round_robin">轮询</SelectItem>
            <SelectItem value="load_balancing">负载均衡</SelectItem>
            <SelectItem value="random">随机</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500 mt-1">
          single: 固定机器人；round_robin: 轮询分配；load_balancing: 根据负载分配；random: 随机选择
        </p>
      </div>

      {/* 优先级 */}
      <div>
        <Label htmlFor="priority">优先级</Label>
        <Select
          value={config.priority || 'normal'}
          onValueChange={(value) => onChange('priority', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择优先级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">低</SelectItem>
            <SelectItem value="normal">普通（默认）</SelectItem>
            <SelectItem value="high">高</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 并发控制 */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">并发控制</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label htmlFor="maxConcurrentTasks" className="text-xs">
              最大并发任务数
            </Label>
            <Input
              id="maxConcurrentTasks"
              type="number"
              min="1"
              max="100"
              value={config.maxConcurrentTasks ?? 10}
              onChange={(e) => onChange('maxConcurrentTasks', parseInt(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="timeoutSeconds" className="text-xs">
              超时时间（秒）
            </Label>
            <Input
              id="timeoutSeconds"
              type="number"
              min="1"
              max="300"
              value={config.timeoutSeconds ?? 30}
              onChange={(e) => onChange('timeoutSeconds', parseInt(e.target.value))}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* 重试配置 */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">重试配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="retryOnFailure"
              checked={config.retryOnFailure ?? true}
              onCheckedChange={(checked) => onChange('retryOnFailure', checked)}
            />
            <Label htmlFor="retryOnFailure" className="text-sm">
              失败时重试
            </Label>
          </div>
          {config.retryOnFailure && (
            <div className="grid grid-cols-2 gap-2 ml-6">
              <div>
                <Label htmlFor="maxRetries" className="text-xs">
                  最大重试次数
                </Label>
                <Input
                  id="maxRetries"
                  type="number"
                  min="0"
                  max="10"
                  value={config.maxRetries ?? 3}
                  onChange={(e) => onChange('maxRetries', parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="retryDelaySeconds" className="text-xs">
                  重试延迟（秒）
                </Label>
                <Input
                  id="retryDelaySeconds"
                  type="number"
                  min="0"
                  max="60"
                  value={config.retryDelaySeconds ?? 2}
                  onChange={(e) => onChange('retryDelaySeconds', parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 故障转移 */}
      <div className="pt-3 border-t border-slate-200">
        <Label htmlFor="fallbackRobotId" className="text-sm font-medium text-slate-700">
          故障转移配置
        </Label>
        <div className="mt-2">
          <Label htmlFor="fallbackRobotId" className="text-xs">
            备用机器人ID
          </Label>
          <Input
            id="fallbackRobotId"
            value={config.fallbackRobotId || ''}
            onChange={(e) => onChange('fallbackRobotId', e.target.value)}
            placeholder="主机器人失败时切换的备用机器人"
            className="mt-1"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            主机器人失败时，自动切换到备用机器人
          </p>
        </div>
      </div>

      {/* 分发规则 */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">分发规则（可选）</Label>
        <p className="text-xs text-slate-500 mt-1">
          配置规则后，根据条件动态选择不同的机器人
        </p>
        <Textarea
          value={config.dispatchRules ? JSON.stringify(config.dispatchRules, null, 2) : ''}
          onChange={(e) => {
            try {
              const rules = JSON.parse(e.target.value);
              onChange('dispatchRules', rules);
            } catch (err) {
              // JSON 解析错误
            }
          }}
          className="mt-2 font-mono text-xs resize-none"
          rows={4}
          placeholder={`[
  {
    "id": "rule1",
    "name": "规则1",
    "condition": "context.intent === '投诉'",
    "robotId": "robot_support",
    "priority": 10
  }
]`}
        />
      </div>

      {/* 日志和通知 */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700">日志和通知</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="logDispatch"
              checked={config.logDispatch ?? true}
              onCheckedChange={(checked) => onChange('logDispatch', checked)}
            />
            <Label htmlFor="logDispatch" className="text-sm">
              记录分发日志
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notifyOnFailure"
              checked={config.notifyOnFailure ?? false}
              onCheckedChange={(checked) => onChange('notifyOnFailure', checked)}
            />
            <Label htmlFor="notifyOnFailure" className="text-sm">
              失败时通知
            </Label>
          </div>
          {config.notifyOnFailure && (
            <div className="ml-6">
              <Label htmlFor="notifyChannels" className="text-xs">
                通知渠道（逗号分隔）
              </Label>
              <Input
                id="notifyChannels"
                value={config.notifyChannels?.join(', ') || ''}
                onChange={(e) => {
                  const channels = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                  onChange('notifyChannels', channels);
                }}
                placeholder="email,wechat,webhook"
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* 配置预览 */}
      <details className="pt-2 border-t border-slate-200">
        <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-800">
          查看当前配置（JSON）
        </summary>
        <pre className="mt-2 p-2 bg-slate-50 rounded text-[10px] text-slate-600 overflow-x-auto">
          {JSON.stringify(
            {
              robotId: config.robotId || '',
              dispatchMode: config.dispatchMode || 'single',
              priority: config.priority || 'normal',
              maxConcurrentTasks: config.maxConcurrentTasks ?? 10,
              timeoutSeconds: config.timeoutSeconds ?? 30,
              retryOnFailure: config.retryOnFailure ?? true,
              maxRetries: config.maxRetries ?? 3,
              retryDelaySeconds: config.retryDelaySeconds ?? 2,
              fallbackRobotId: config.fallbackRobotId || '',
              dispatchRules: config.dispatchRules || [],
              logDispatch: config.logDispatch ?? true,
              notifyOnFailure: config.notifyOnFailure ?? false,
              notifyChannels: config.notifyChannels || [],
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
}
