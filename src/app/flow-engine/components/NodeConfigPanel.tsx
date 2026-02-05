'use client';

/**
 * 节点配置面板
 * 根据节点类型动态渲染配置项
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Settings, Save } from 'lucide-react';
import { NODE_TYPES, NODE_METADATA } from '../types';

interface NodeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    type: string;
    name: string;
    description?: string;
    config?: Record<string, any>;
    icon?: string;
    color?: string;
  };
}

interface NodeConfigPanelProps {
  node: NodeData;
  onUpdate: (updates: Partial<NodeData>) => void;
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

  const handleSave = () => {
    console.log('节点配置已更新:', config);
    // 配置已经通过onUpdate回调自动保存到flow状态
    // 提示用户配置已更新
    alert('节点配置已更新，请点击"保存流程"按钮保存整个流程。');
  };

  return (
    <Card className="p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">节点配置</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSave}>
          <Save className="w-4 h-4 mr-1" />
          保存
        </Button>
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

      {node.data.type === 'end' && (
        <div className="text-sm text-slate-500 text-center py-4">
          结束节点无需配置
        </div>
      )}

      {node.data.type === 'alert_save' && <AlertSaveConfig config={config} onChange={handleConfigChange} />}

      {node.data.type === 'alert_rule' && <AlertRuleConfig config={config} onChange={handleConfigChange} />}

      {node.data.type === 'execute_notification' && (
        <ExecuteNotificationConfig config={config} onChange={handleConfigChange} />
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
      <div>
        <Label htmlFor="modelId">AI模型</Label>
        <Select
          value={config.modelId || 'default'}
          onValueChange={(value) => onChange('modelId', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择AI模型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">默认意图识别模型</SelectItem>
            <SelectItem value="custom">自定义模型</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="temperature">温度参数</Label>
        <Input
          id="temperature"
          type="number"
          step="0.1"
          min="0"
          max="1"
          value={config.temperature ?? 0.1}
          onChange={(e) => onChange('temperature', parseFloat(e.target.value))}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="systemPrompt">自定义提示词</Label>
        <Textarea
          id="systemPrompt"
          value={config.systemPrompt || ''}
          onChange={(e) => onChange('systemPrompt', e.target.value)}
          placeholder="输入自定义系统提示词"
          className="mt-1 resize-none"
          rows={3}
        />
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">意图过滤</Label>
        <div className="space-y-2 mt-2">
          {['service', 'help', 'chat', 'welcome', 'risk', 'spam'].map((intent) => (
            <div key={intent} className="flex items-center space-x-2">
              <Checkbox
                id={`intent-${intent}`}
                checked={config.allowedIntents?.includes(intent) ?? true}
                onCheckedChange={(checked) => {
                  const intents = config.allowedIntents || ['service', 'help', 'chat', 'welcome', 'risk', 'spam'];
                  if (checked) {
                    onChange('allowedIntents', [...intents, intent]);
                  } else {
                    onChange('allowedIntents', intents.filter((i: string) => i !== intent));
                  }
                }}
              />
              <Label htmlFor={`intent-${intent}`} className="text-sm">
                {intent}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 节点3：决策节点配置
function DecisionConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">决策规则</Label>
        <p className="text-xs text-slate-500 mt-1">
          点击节点可在连线中配置目标节点
        </p>
        <Textarea
          value={JSON.stringify(config.rules || [], null, 2)}
          onChange={(e) => onChange('rules', JSON.parse(e.target.value))}
          className="mt-2 font-mono text-xs"
          rows={6}
          placeholder="配置决策规则（JSON格式）"
        />
      </div>
    </div>
  );
}

// 节点4：AI客服回复配置
function AiReplyConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="defaultModelId">默认模型</Label>
        <Select
          value={config.defaultModelId || 'doubao'}
          onValueChange={(value) => onChange('defaultModelId', value)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择默认AI模型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="doubao">豆包（默认）</SelectItem>
            <SelectItem value="deepseek">DeepSeek</SelectItem>
            <SelectItem value="kimi">Kimi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">上下文配置</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeHistory"
              checked={config.context?.includeHistory ?? true}
              onCheckedChange={(checked) =>
                onChange('context', {
                  ...(config.context || {}),
                  includeHistory: checked,
                })
              }
            />
            <Label htmlFor="includeHistory" className="text-sm">
              包含历史消息
            </Label>
          </div>
          <div>
            <Label htmlFor="maxHistoryMessages" className="text-sm">
              历史消息条数
            </Label>
            <Input
              id="maxHistoryMessages"
              type="number"
              value={config.context?.maxHistoryMessages ?? 5}
              onChange={(e) =>
                onChange('context', {
                  ...(config.context || {}),
                  maxHistoryMessages: parseInt(e.target.value),
                })
              }
              className="mt-1"
            />
          </div>
        </div>
      </div>
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
      <div>
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
          <Label htmlFor="fixedMessage">固定消息内容</Label>
          <Textarea
            id="fixedMessage"
            value={config.fixedMessage || ''}
            onChange={(e) => onChange('fixedMessage', e.target.value)}
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

      <div>
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
              <Label htmlFor="dynamicAtListExpression" className="text-sm">
                动态表达式
              </Label>
              <Input
                id="dynamicAtListExpression"
                value={config.dynamicAtListExpression || ''}
                onChange={(e) => onChange('dynamicAtListExpression', e.target.value)}
                placeholder="{{userName}}"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                支持变量：{"{" + "{userName}" + "}"}, {"{" + "{groupName}" + "}"}
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700">重试配置</Label>
        <div className="space-y-2 mt-2">
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="maxRetries" className="text-sm">
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
                <Label htmlFor="retryDelay" className="text-sm">
                  重试延迟（毫秒）
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
      <div>
        <Label className="text-sm font-medium text-slate-700">告警规则</Label>
        <p className="text-xs text-slate-500 mt-1">
          配置告警规则（JSON格式）
        </p>
        <Textarea
          value={JSON.stringify(config.rules || [], null, 2)}
          onChange={(e) => onChange('rules', JSON.parse(e.target.value))}
          className="mt-2 font-mono text-xs"
          rows={6}
          placeholder="配置告警规则（JSON格式）"
        />
      </div>
    </div>
  );
}

// 节点B3：执行通知配置
function ExecuteNotificationConfig({ config, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">通知方式</Label>
        <p className="text-xs text-slate-500 mt-1">
          配置需要执行的通知方式（JSON格式）
        </p>
        <Textarea
          value={JSON.stringify(config.notificationMethods || [], null, 2)}
          onChange={(e) => onChange('notificationMethods', JSON.parse(e.target.value))}
          className="mt-2 font-mono text-xs"
          rows={8}
          placeholder='[{"type": "robot", "enabled": true, "priority": 1, "robotConfig": {"sendType": "private"}}]'
        />
      </div>
    </div>
  );
}
