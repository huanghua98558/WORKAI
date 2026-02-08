'use client';

/**
 * 上下文增强器配置组件
 * 提取上下文信息，生成AI提示词补充内容
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, HelpCircle, Sparkles, FileText, Settings } from 'lucide-react';

interface ContextEnhancerConfigProps {
  config: any;
  onChange: (key: string, value: any) => void;
}

// 可用的上下文变量
const CONTEXT_VARIABLES = [
  { name: 'intent', label: '用户意图', type: 'string', description: 'AI识别的意图（service/tech_support/complaint等）' },
  { name: 'priority', label: '优先级', type: 'number', description: '消息优先级（0-1）' },
  { name: 'emotion', label: '情绪', type: 'string', description: 'AI识别的情绪（positive/negative/neutral）' },
  { name: 'userName', label: '用户名', type: 'string', description: '发送消息的用户名' },
  { name: 'groupName', label: '群组名', type: 'string', description: '消息来源群组名' },
  { name: 'roomType', label: '房间类型', type: 'string', description: '房间类型（single/group）' },
  { name: 'atMe', label: '是否@我', type: 'boolean', description: '是否@了机器人' },
  { name: 'messageId', label: '消息ID', type: 'string', description: '消息唯一标识' },
  { name: 'sessionId', label: '会话ID', type: 'string', description: '会话唯一标识' },
  { name: 'businessRole', label: '业务角色', type: 'string', description: '提取的业务角色（售后/营销/技术等）' },
  { name: 'staffReplied', label: '工作人员已回复', type: 'boolean', description: '工作人员是否已回复' },
  { name: 'staffReplyCount', label: '工作人员回复次数', type: 'number', description: '工作人员回复次数' },
];

// 预设模板
const PROMPT_TEMPLATES = [
  {
    id: 'template_basic',
    name: '基础信息',
    description: '提取基础上下文信息',
    template: `用户意图：{{intent}}
消息优先级：{{priority}}
用户：{{userName}}
群组：{{groupName}}`,
  },
  {
    id: 'template_emotion',
    name: '情绪分析',
    description: '关注用户情绪状态',
    template: `用户意图：{{intent}}
用户情绪：{{emotion}}
用户：{{userName}}

请根据用户情绪调整回复策略：
- 如果情绪负面，先安抚用户
- 如果情绪正面，可以适当互动`,
  },
  {
    id: 'template_priority',
    name: '优先级处理',
    description: '根据优先级调整回复',
    template: `用户意图：{{intent}}
消息优先级：{{priority}}
用户级别：{{userName}}
@机器人：{{atMe ? '是' : '否'}}

优先级处理策略：
- 优先级 > 0.7：优先处理，快速响应
- @机器人：立即响应
- 普通优先级：正常处理`,
  },
  {
    id: 'template_role',
    name: '业务角色感知',
    description: '根据业务角色调整回复',
    template: `用户意图：{{intent}}
用户：{{userName}}
业务角色：{{businessRole}}
群组：{{groupName}}

业务角色处理策略：
- 售后：使用友好、耐心的语气
- 营销：使用专业、热情的语气
- 技术：使用准确、简洁的语气`,
  },
  {
    id: 'template_full',
    name: '完整上下文',
    description: '提取所有可用上下文',
    template: `=== 用户信息 ===
用户名：{{userName}}
用户意图：{{intent}}
用户情绪：{{emotion}}
业务角色：{{businessRole}}

=== 消息信息 ===
消息优先级：{{priority}}
群组：{{groupName}}
房间类型：{{roomType}}
@机器人：{{atMe ? '是' : '否'}}

=== 工作人员状态 ===
工作人员已回复：{{staffReplied}}
工作人员回复次数：{{staffReplyCount}}

=== 处理建议 ===
请根据以上上下文信息，提供专业、个性化的回复。`,
  },
];

export default function ContextEnhancerConfig({ config, onChange }: ContextEnhancerConfigProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(
    config.extractFields || ['intent', 'priority', 'userName']
  );
  const [promptTemplate, setPromptTemplate] = useState<string>(
    config.promptTemplate || ''
  );
  const [contextVariable, setContextVariable] = useState<string>(
    config.contextVariable || 'aiPromptSupplement'
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // 切换字段选择
  const toggleField = (fieldName: string) => {
    const newFields = selectedFields.includes(fieldName)
      ? selectedFields.filter(f => f !== fieldName)
      : [...selectedFields, fieldName];
    setSelectedFields(newFields);
    onChange('extractFields', newFields);
  };

  // 全选/取消全选
  const toggleAllFields = () => {
    if (selectedFields.length === CONTEXT_VARIABLES.length) {
      setSelectedFields([]);
      onChange('extractFields', []);
    } else {
      setSelectedFields(CONTEXT_VARIABLES.map(v => v.name));
      onChange('extractFields', CONTEXT_VARIABLES.map(v => v.name));
    }
  };

  // 应用模板
  const applyTemplate = (template: string) => {
    setPromptTemplate(template);
    onChange('promptTemplate', template);
  };

  // 预览补充内容（模拟）
  const previewSupplement = () => {
    let content = promptTemplate;
    selectedFields.forEach(field => {
      const variable = CONTEXT_VARIABLES.find(v => v.name === field);
      if (variable) {
        const placeholder = `{{${field}}}`;
        let mockValue = '';
        switch (variable.type) {
          case 'string':
            mockValue = `[${variable.label}]`;
            break;
          case 'number':
            mockValue = '0.8';
            break;
          case 'boolean':
            mockValue = 'true/false';
            break;
          default:
            mockValue = `[${field}]`;
        }
        content = content.replace(new RegExp(placeholder, 'g'), mockValue);
      }
    });
    return content;
  };

  return (
    <div className="space-y-4">
      {/* 顶部说明 */}
      <Card className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <div className="flex items-start gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium text-indigo-900">
              上下文增强器
            </div>
            <div className="text-xs text-indigo-700 mt-1">
              提取上下文信息，生成AI提示词补充内容，帮助AI更好地理解用户需求
            </div>
          </div>
        </div>
      </Card>

      {/* 提取字段选择 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium text-slate-700">
            提取字段
          </Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAllFields}
            className="h-7 text-xs"
          >
            {selectedFields.length === CONTEXT_VARIABLES.length ? '取消全选' : '全选'}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CONTEXT_VARIABLES.map(variable => (
            <div
              key={variable.name}
              className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <Checkbox
                id={`field-${variable.name}`}
                checked={selectedFields.includes(variable.name)}
                onCheckedChange={() => toggleField(variable.name)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <Label
                  htmlFor={`field-${variable.name}`}
                  className="text-xs font-medium text-slate-900 cursor-pointer truncate"
                >
                  {variable.label}
                </Label>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                  {variable.description}
                </p>
                <Badge variant="outline" className="mt-1 text-[9px] px-1.5 py-0 h-4">
                  {variable.type}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 补充提示词模板 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium text-slate-700">
            补充提示词模板
          </Label>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
              className="h-7 text-xs"
            >
              <HelpCircle className="w-3 h-3 mr-1" />
              模板
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="h-7 text-xs"
            >
              {showPreview ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
              预览
            </Button>
          </div>
        </div>

        {/* 模板选择面板 */}
        {showHelp && (
          <Card className="p-3 mb-2 bg-amber-50 border-amber-200">
            <div className="text-xs font-medium text-amber-900 mb-2">
              快速应用模板
            </div>
            <div className="grid grid-cols-1 gap-2">
              {PROMPT_TEMPLATES.map(template => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(template.template)}
                  className="h-auto py-2 px-3 text-left justify-start"
                >
                  <div>
                    <div className="font-medium text-xs">{template.name}</div>
                    <div className="text-[10px] text-slate-500">{template.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* 模板编辑器 */}
        <Textarea
          value={promptTemplate}
          onChange={(e) => {
            setPromptTemplate(e.target.value);
            onChange('promptTemplate', e.target.value);
          }}
          placeholder={`用户意图：{{intent}}
消息优先级：{{priority}}
用户：{{userName}}

请根据以上信息，提供专业回复。`}
          className="mt-1 font-mono text-sm resize-none min-h-[120px]"
          rows={6}
        />

        {/* 变量提示 */}
        {selectedFields.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedFields.map(field => (
              <Badge
                key={field}
                variant="secondary"
                className="text-[10px] px-2 py-0.5"
              >
                {'{{'}{field}{'}}'}
              </Badge>
            ))}
          </div>
        )}

        {/* 预览面板 */}
        {showPreview && (
          <Card className="mt-2 p-3 bg-slate-50 border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">预览（模拟）</span>
            </div>
            <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono bg-white p-2 rounded border">
              {previewSupplement() || '（请先选择字段和配置模板）'}
            </pre>
          </Card>
        )}
      </div>

      {/* 上下文变量名 */}
      <div>
        <Label className="text-sm font-medium text-slate-700">
          写入上下文的变量名
        </Label>
        <Input
          value={contextVariable}
          onChange={(e) => {
            setContextVariable(e.target.value);
            onChange('contextVariable', e.target.value);
          }}
          placeholder="aiPromptSupplement"
          className="mt-1"
        />
        <p className="text-[10px] text-slate-500 mt-1">
          生成的补充内容将写入此变量，AI回复节点可以读取使用
        </p>
      </div>

      {/* 高级设置 */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic" className="text-xs">
            <Settings className="w-3 h-3 mr-1" />
            基础设置
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            高级设置
          </TabsTrigger>
        </TabsList>
        <TabsContent value="basic" className="space-y-3 mt-3">
          <div>
            <Label className="text-xs text-slate-600">补充提示词位置</Label>
            <Input
              value={config.position || 'after'}
              onChange={(e) => onChange('position', e.target.value)}
              className="mt-1 h-8 text-xs"
              placeholder="after"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              before（基础提示词之前）或 after（基础提示词之后）
            </p>
          </div>
        </TabsContent>
        <TabsContent value="advanced" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-slate-600">启用变量自动补全</Label>
              <p className="text-[10px] text-slate-500">
                自动填充缺失的变量为默认值
              </p>
            </div>
            <Checkbox
              checked={config.enableAutoFill ?? false}
              onCheckedChange={(checked) => onChange('enableAutoFill', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-slate-600">启用Markdown格式</Label>
              <p className="text-[10px] text-slate-500">
                生成的补充内容使用Markdown格式
              </p>
            </div>
            <Checkbox
              checked={config.enableMarkdown ?? true}
              onCheckedChange={(checked) => onChange('enableMarkdown', checked)}
            />
          </div>
          <div>
            <Label className="text-xs text-slate-600">最大长度限制</Label>
            <Input
              type="number"
              value={config.maxLength ?? 500}
              onChange={(e) => onChange('maxLength', parseInt(e.target.value))}
              className="mt-1 h-8 text-xs"
              placeholder="500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              限制补充内容的最大字符数（0表示不限制）
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
