'use client';

/**
 * 节点配置面板
 * 根据节点类型动态渲染配置项
 * 性能优化：使用防抖和 React.memo
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import DecisionConfig from './DecisionConfig';
import ContextEnhancerConfig from './ContextEnhancerConfig';

type FlowNode = Node;

interface NodeConfigPanelProps {
  node: FlowNode;
  onUpdate: (updates: Partial<FlowNode>) => void;
}

// 防抖函数
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function NodeConfigPanel({ node, onUpdate }: NodeConfigPanelProps) {
  // 使用本地状态管理配置，不直接更新父组件
  const [localConfig, setLocalConfig] = useState(node.data.config || {});
  const [localName, setLocalName] = useState(node.data.name || '');
  const [localDescription, setLocalDescription] = useState(node.data.description || '');

  // 防抖更新到父组件（300ms）
  const debouncedConfig = useDebounce(localConfig, 300);
  const debouncedName = useDebounce(localName, 300);
  const debouncedDescription = useDebounce(localDescription, 300);

  // 当防抖后的值变化时，更新父组件
  useEffect(() => {
    if (debouncedConfig !== node.data.config) {
      onUpdate({
        data: {
          ...node.data,
          config: debouncedConfig,
        },
      });
    }
  }, [debouncedConfig, node.data.config, node.data, onUpdate]);

  useEffect(() => {
    if (debouncedName !== node.data.name) {
      onUpdate({
        data: { ...node.data, name: debouncedName },
      });
    }
  }, [debouncedName, node.data.name, node.data, onUpdate]);

  useEffect(() => {
    if (debouncedDescription !== node.data.description) {
      onUpdate({
        data: { ...node.data, description: debouncedDescription },
      });
    }
  }, [debouncedDescription, node.data.description, node.data, onUpdate]);

  // 当 node 变化时，同步本地状态
  useEffect(() => {
    setLocalConfig(node.data.config || {});
    setLocalName(node.data.name || '');
    setLocalDescription(node.data.description || '');
  }, [node.data.config, node.data.name, node.data.description]);

  const handleConfigChange = useCallback((key: string, value: any) => {
    setLocalConfig((prev: any) => ({ ...prev, [key]: value }));
  }, []);

  const handleNodeTypeChange = useCallback((value: string) => {
    onUpdate({
      data: {
        ...node.data,
        type: value,
        name: NODE_METADATA[value as keyof typeof NODE_METADATA]?.name || node.data.name,
        description: NODE_METADATA[value as keyof typeof NODE_METADATA]?.description || node.data.description,
        icon: NODE_METADATA[value as keyof typeof NODE_METADATA]?.icon || node.data.icon,
        color: NODE_METADATA[value as keyof typeof NODE_METADATA]?.color || node.data.color,
      },
    });
  }, [node.data, onUpdate]);

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
            onValueChange={handleNodeTypeChange}
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
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            placeholder="输入节点名称"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="node-description">描述</Label>
          <Textarea
            id="node-description"
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            placeholder="输入节点描述"
            className="mt-1 resize-none"
            rows={2}
          />
        </div>
      </div>

      {/* 根据节点类型渲染不同的配置项 */}
      {node.data.type === 'message_receive' && (
        <MemoizedMessageReceiveConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'intent' && (
        <MemoizedIntentConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'decision' && (
        <MemoizedDecisionConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'context_enhancer' && (
        <MemoizedContextEnhancerConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'ai_reply' && (
        <MemoizedAiReplyConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'message_dispatch' && (
        <MemoizedMessageDispatchConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'send_command' && (
        <MemoizedSendCommandConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'command_status' && (
        <MemoizedCommandStatusConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'end' && (
        <MemoizedEndConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'alert_save' && (
        <MemoizedAlertSaveConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'alert_rule' && (
        <MemoizedAlertRuleConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'risk_handler' && (
        <MemoizedRiskHandlerConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'monitor' && (
        <MemoizedMonitorConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'robot_dispatch' && (
        <MemoizedRobotDispatchConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {node.data.type === 'execute_notification' && (
        <MemoizedExecuteNotificationConfig config={localConfig} onChange={handleConfigChange} />
      )}

      {/* 默认情况：未识别的节点类型 */}
      {!['message_receive', 'intent', 'decision', 'context_enhancer', 'ai_reply', 'message_dispatch', 'send_command', 'command_status', 'end', 'alert_save', 'alert_rule', 'risk_handler', 'monitor', 'robot_dispatch', 'execute_notification'].includes(node.data.type || '') && (
        <div className="text-sm text-red-500 text-center py-4">
          <p className="font-medium">未知的节点类型</p>
          <p className="text-xs mt-1">类型: {node.data.type || 'undefined'}</p>
          <p className="text-xs mt-2">请联系管理员添加此节点类型的配置</p>
        </div>
      )}
    </Card>
  );
}

// 使用 React.memo 优化所有配置组件
const MemoizedMessageReceiveConfig = React.memo(function MessageReceiveConfig({ config, onChange }: any) {
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

      {/* ========== 阶段二新增：业务角色提取配置 ========== */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <span>👥</span>
          业务角色提取
        </Label>
        <div className="space-y-3 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="extractBusinessRole"
              checked={config.extractBusinessRole ?? false}
              onCheckedChange={(checked) => onChange('extractBusinessRole', checked)}
            />
            <Label htmlFor="extractBusinessRole" className="text-sm">
              启用业务角色提取
            </Label>
          </div>
          <p className="text-[10px] text-slate-500 ml-6">
            根据群组名称或用户信息自动提取业务角色
          </p>
          {config.extractBusinessRole && (
            <div>
              <Label htmlFor="roleMapping" className="text-xs">角色映射规则</Label>
              <Textarea
                id="roleMapping"
                value={config.roleMapping || ''}
                onChange={(e) => onChange('roleMapping', e.target.value)}
                placeholder="售后:包含'售后','客服'字样&#10;营销:包含'营销','推广'字样&#10;技术:包含'技术','开发'字样"
                className="mt-1 resize-none font-mono text-xs"
                rows={3}
              />
            </div>
          )}
        </div>
      </div>

      {/* ========== 阶段二新增：优先级智能检测 ========== */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <span>🎯</span>
          优先级智能检测
        </Label>
        <div className="space-y-3 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableSmartPriorityDetection"
              checked={config.enableSmartPriorityDetection ?? false}
              onCheckedChange={(checked) => onChange('enableSmartPriorityDetection', checked)}
            />
            <Label htmlFor="enableSmartPriorityDetection" className="text-sm">
              启用智能优先级检测
            </Label>
          </div>
          <p className="text-[10px] text-slate-500 ml-6">
            根据消息关键词自动分配优先级
          </p>
          {config.enableSmartPriorityDetection && (
            <div>
              <Label htmlFor="priorityRules" className="text-xs">优先级规则</Label>
              <Textarea
                id="priorityRules"
                value={config.priorityRules || ''}
                onChange={(e) => onChange('priorityRules', e.target.value)}
                placeholder="高:紧急,bug,故障&#10;中:咨询,问题&#10;低:其他"
                className="mt-1 resize-none font-mono text-xs"
                rows={3}
              />
            </div>
          )}
        </div>
      </div>

      {/* ========== 阶段二新增：消息去重配置 ========== */}
      <div className="pt-3 border-t border-slate-200">
        <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <span>🔒</span>
          消息去重
        </Label>
        <div className="space-y-3 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enableDeduplication"
              checked={config.enableDeduplication ?? false}
              onCheckedChange={(checked) => onChange('enableDeduplication', checked)}
            />
            <Label htmlFor="enableDeduplication" className="text-sm">
              启用消息去重
            </Label>
          </div>
          <p className="text-[10px] text-slate-500 ml-6">
            根据消息内容去重，避免重复处理相同消息
          </p>
          {config.enableDeduplication && (
            <div>
              <Label htmlFor="dedupWindow" className="text-xs">去重窗口（秒）</Label>
              <Input
                id="dedupWindow"
                type="number"
                value={config.dedupWindow || 60}
                onChange={(e) => onChange('dedupWindow', parseInt(e.target.value) || 60)}
                placeholder="60"
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const MemoizedIntentConfig = React.memo(function IntentConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">意图识别配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="model" className="text-sm">
              使用的模型
            </Label>
            <Select
              value={config.model || 'doubao-pro-4k-intent'}
              onValueChange={(value) => onChange('model', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doubao-pro-4k-intent">Doubao Pro 4K Intent</SelectItem>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="claude-3">Claude-3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="confidenceThreshold" className="text-sm">
              置信度阈值
            </Label>
            <Input
              id="confidenceThreshold"
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={config.confidenceThreshold ?? 0.7}
              onChange={(e) => onChange('confidenceThreshold', parseFloat(e.target.value))}
              placeholder="0.7"
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

const MemoizedDecisionConfig = React.memo(function DecisionConfigWrapper({ config, onChange }: any) {
  return <DecisionConfig config={config} onChange={onChange} />;
});

const MemoizedAiReplyConfig = React.memo(function AiReplyConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">AI 回复配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="model" className="text-sm">
              使用的模型
            </Label>
            <Select
              value={config.model || 'gpt-4'}
              onValueChange={(value) => onChange('model', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="claude-3">Claude-3</SelectItem>
                <SelectItem value="doubao-pro">Doubao Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="temperature" className="text-sm">
              温度值
            </Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={config.temperature ?? 0.7}
              onChange={(e) => onChange('temperature', parseFloat(e.target.value))}
              placeholder="0.7"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="maxTokens" className="text-sm">
              最大 token 数
            </Label>
            <Input
              id="maxTokens"
              type="number"
              value={config.maxTokens ?? 1000}
              onChange={(e) => onChange('maxTokens', parseInt(e.target.value))}
              placeholder="1000"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="systemPrompt" className="text-sm">
              系统提示词
            </Label>
            <Textarea
              id="systemPrompt"
              value={config.systemPrompt || ''}
              onChange={(e) => onChange('systemPrompt', e.target.value)}
              placeholder="输入系统提示词"
              className="mt-1 resize-none"
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

const MemoizedMessageDispatchConfig = React.memo(function MessageDispatchConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">消息分发配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="dispatchRule" className="text-sm">
              分发规则
            </Label>
            <Select
              value={config.dispatchRule || 'random'}
              onValueChange={(value) => onChange('dispatchRule', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择分发规则" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">随机分发</SelectItem>
                <SelectItem value="round_robin">轮询分发</SelectItem>
                <SelectItem value="least_busy">分发到最空闲</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
});

const MemoizedSendCommandConfig = React.memo(function SendCommandConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">发送命令配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="commandType" className="text-sm">
              命令类型
            </Label>
            <Input
              id="commandType"
              value={config.commandType || 'text'}
              onChange={(e) => onChange('commandType', e.target.value)}
              placeholder="text"
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

const MemoizedCommandStatusConfig = React.memo(function CommandStatusConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">命令状态配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="statusField" className="text-sm">
              状态字段
            </Label>
            <Input
              id="statusField"
              value={config.statusField || 'status'}
              onChange={(e) => onChange('statusField', e.target.value)}
              placeholder="status"
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

const MemoizedEndConfig = React.memo(function EndConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">结束配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="endSession"
              checked={config.endSession ?? true}
              onCheckedChange={(checked) => onChange('endSession', checked)}
            />
            <Label htmlFor="endSession" className="text-sm">
              结束会话
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
});

const MemoizedAlertSaveConfig = React.memo(function AlertSaveConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">告警保存配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="alertLevel" className="text-sm">
              告警级别
            </Label>
            <Select
              value={config.alertLevel || 'warning'}
              onValueChange={(value) => onChange('alertLevel', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择告警级别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">信息</SelectItem>
                <SelectItem value="warning">警告</SelectItem>
                <SelectItem value="error">错误</SelectItem>
                <SelectItem value="critical">严重</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
});

const MemoizedAlertRuleConfig = React.memo(function AlertRuleConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">告警规则配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="ruleCondition" className="text-sm">
              规则条件
            </Label>
            <Input
              id="ruleCondition"
              value={config.ruleCondition || ''}
              onChange={(e) => onChange('ruleCondition', e.target.value)}
              placeholder="count > 10"
              className="mt-1"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoEscalate"
              checked={config.autoEscalate ?? false}
              onCheckedChange={(checked) => onChange('autoEscalate', checked)}
            />
            <Label htmlFor="autoEscalate" className="text-sm">
              自动升级
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
});

const MemoizedRiskHandlerConfig = React.memo(function RiskHandlerConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">风险处理配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="riskLevel" className="text-sm">
              风险级别
            </Label>
            <Select
              value={config.riskLevel || 'medium'}
              onValueChange={(value) => onChange('riskLevel', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择风险级别" />
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
    </div>
  );
});

const MemoizedMonitorConfig = React.memo(function MonitorConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">监控配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="monitorType" className="text-sm">
              监控类型
            </Label>
            <Select
              value={config.monitorType || 'performance'}
              onValueChange={(value) => onChange('monitorType', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择监控类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance">性能监控</SelectItem>
                <SelectItem value="business">业务监控</SelectItem>
                <SelectItem value="error">错误监控</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
});

const MemoizedRobotDispatchConfig = React.memo(function RobotDispatchConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">机器人分发配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="robotId" className="text-sm">
              机器人 ID
            </Label>
            <Input
              id="robotId"
              value={config.robotId || ''}
              onChange={(e) => onChange('robotId', e.target.value)}
              placeholder="输入机器人 ID"
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

const MemoizedContextEnhancerConfig = React.memo(function ContextEnhancerWrapper({ config, onChange }: any) {
  return <ContextEnhancerConfig config={config} onChange={onChange} />;
});

const MemoizedExecuteNotificationConfig = React.memo(function ExecuteNotificationConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">执行通知配置</Label>
        <div className="space-y-2 mt-2">
          <div>
            <Label htmlFor="notificationType" className="text-sm">
              通知类型
            </Label>
            <Select
              value={config.notificationType || 'email'}
              onValueChange={(value) => onChange('notificationType', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择通知类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">邮件</SelectItem>
                <SelectItem value="sms">短信</SelectItem>
                <SelectItem value="wechat">微信</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="recipients" className="text-sm">
              接收人
            </Label>
            <Textarea
              id="recipients"
              value={config.recipients || ''}
              onChange={(e) => onChange('recipients', e.target.value)}
              placeholder="输入接收人，多个用逗号分隔"
              className="mt-1 resize-none"
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
