'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Play, 
  Save, 
  Copy, 
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Edit3,
  MessageSquare,
  TestTube2,
  FileText,
  Layout
} from 'lucide-react';
import Editor from '@monaco-editor/react';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  variables: string[];
  version: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  category: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ModelResponse {
  model: string;
  response: string;
  latency: number;
  success: boolean;
  error?: string;
}

const BUILTIN_MODELS = [
  'doubao-seed-1-8-251228',
  'doubao-seed-1-6-251015',
  'doubao-seed-1-6-flash-250615',
  'doubao-seed-1-6-thinking-250715',
  'doubao-seed-1-6-lite-251015',
  'deepseek-v3-2-251201',
  'deepseek-r1-250528',
  'kimi-k2-250905'
];

export default function PromptTraining() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('');
  const [selectedModels, setSelectedModels] = useState<string[]>(['doubao-seed-1-8-251228']);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelResponses, setModelResponses] = useState<ModelResponse[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'test'>('chat');
  const [isInitDefaults, setIsInitDefaults] = useState(false);
  const [defaultTemplateStatus, setDefaultTemplateStatus] = useState<{ total: number; existing: number; missing: number } | null>(null);
  
  // 模板编辑状态
  const [templateForm, setTemplateForm] = useState<Partial<PromptTemplate>>({
    name: '',
    description: '',
    type: 'serviceReply',
    systemPrompt: '',
    userPrompt: '{{input}}',
    temperature: 0.7,
    maxTokens: 2000
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到对话底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // 加载模板列表
  useEffect(() => {
    loadTemplates();
    loadTestCases();
    checkDefaultTemplates();
  }, []);

  // 选择模板时加载表单
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        setTemplateForm(template);
      }
    }
  }, [selectedTemplateId, templates]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/prompt-templates');
      const data = await response.json();
      setTemplates(data.data || []);
      
      if (data.data && data.data.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(data.data[0].id);
      }
    } catch (error) {
      console.error('加载模板失败:', error);
    }
  };

  const loadTestCases = async () => {
    // 暂时不使用测试用例 API，直接使用空数组
    setTestCases([]);
  };

  const saveTemplate = async () => {
    setIsSaving(true);
    try {
      const payload = selectedTemplateId
        ? { ...templateForm, id: selectedTemplateId }
        : templateForm;

      const url = selectedTemplateId 
        ? `/api/prompt-templates/${selectedTemplateId}`
        : '/api/prompt-templates';
      
      const method = selectedTemplateId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.code === 0) {
        await loadTemplates();
        if (!selectedTemplateId && data.data?.id) {
          setSelectedTemplateId(data.data.id);
        }
        alert('模板保存成功');
      } else {
        alert(data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存模板失败:', error);
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const createNewTemplate = () => {
    setSelectedTemplateId('');
    setTemplateForm({
      name: `新模板 ${templates.length + 1}`,
      description: '',
      type: 'serviceReply',
      systemPrompt: '',
      userPrompt: '{{input}}',
      temperature: 0.7,
      maxTokens: 2000
    });
  };

  // 检查默认模板是否存在
  const checkDefaultTemplates = async () => {
    try {
      const response = await fetch('/api/prompt-templates/check-default');
      const data = await response.json();
      if (data.code === 0) {
        setDefaultTemplateStatus(data.data);
        return data.data;
      }
    } catch (error) {
      console.error('检查默认模板失败:', error);
    }
    return null;
  };

  // 初始化默认模板
  const initDefaultTemplates = async (force: boolean = false) => {
    if (!confirm(force ? '确定要强制覆盖现有默认模板吗？' : '确定要添加缺失的默认模板吗？')) return;

    setIsInitDefaults(true);
    try {
      const response = await fetch('/api/prompt-templates/init-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      });

      const data = await response.json();
      if (data.code === 0) {
        alert(`初始化完成：新建 ${data.data.created} 个，跳过 ${data.data.skipped} 个`);
        await loadTemplates();
        await checkDefaultTemplates();
      } else {
        alert(data.message || '初始化失败');
      }
    } catch (error) {
      console.error('初始化默认模板失败:', error);
      alert('初始化失败');
    } finally {
      setIsInitDefaults(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('确定要删除此模板吗？')) return;

    try {
      const response = await fetch(`/api/prompt-templates/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.code === 0) {
        await loadTemplates();
        if (selectedTemplateId === id) {
          setSelectedTemplateId(templates.find(t => t.id !== id)?.id || '');
        }
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除模板失败:', error);
    }
  };

  const duplicateTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/prompt-templates/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: undefined })
      });

      const data = await response.json();
      if (data.code === 0) {
        await loadTemplates();
        alert('模板复制成功');
      } else {
        alert(data.message || '复制失败');
      }
    } catch (error) {
      console.error('复制模板失败:', error);
      alert('复制失败');
    }
  };

  const exportTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/prompt-templates/${id}/export`);
      const data = await response.json();

      if (data.code === 0) {
        const json = JSON.stringify(data.data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.data.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert(data.message || '导出失败');
      }
    } catch (error) {
      console.error('导出模板失败:', error);
      alert('导出失败');
    }
  };

  const importTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/prompt-templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (result.code === 0) {
        await loadTemplates();
        alert('导入成功');
      } else {
        alert(result.message || '导入失败');
      }
    } catch (error) {
      console.error('导入模板失败:', error);
      alert('导入失败，请检查文件格式');
    } finally {
      event.target.value = '';
    }
  };

  const selectTestCase = (id: string) => {
    setSelectedTestCaseId(id);
    const testCase = testCases.find(t => t.id === id);
    if (testCase) {
      setUserInput(testCase.input);
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim() || !templateForm.systemPrompt) return;

    const userMessage: ConversationMessage = {
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString()
    };

    setConversation(prev => [...prev, userMessage]);
    setIsGenerating(true);

    try {
      // 并行调用所有选中的模型
      const promises = selectedModels.map(async (model) => {
        const startTime = Date.now();
        try {
          const response = await fetch('/api/prompt-tests/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              systemPrompt: templateForm.systemPrompt,
              userPrompt: templateForm.userPrompt?.replace('{{input}}', userInput) || userInput,
              temperature: templateForm.temperature || 0.7,
              maxTokens: templateForm.maxTokens || 2000
            })
          });

          const data = await response.json();
          const latency = Date.now() - startTime;

          return {
            model,
            response: data.data?.response || '',
            latency,
            success: data.code === 0,
            error: data.message
          };
        } catch (error) {
          return {
            model,
            response: '',
            latency: Date.now() - startTime,
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
          };
        }
      });

      const responses = await Promise.all(promises);
      setModelResponses(responses);

      // 使用第一个成功的模型回复作为主要对话
      const mainResponse = responses.find(r => r.success);
      if (mainResponse) {
        const assistantMessage: ConversationMessage = {
          role: 'assistant',
          content: mainResponse.response,
          timestamp: new Date().toISOString()
        };
        setConversation(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('生成失败:', error);
    } finally {
      setIsGenerating(false);
      setUserInput('');
    }
  };

  const runTestCase = async () => {
    if (!selectedTestCaseId || selectedModels.length === 0) return;

    const testCase = testCases.find(t => t.id === selectedTestCaseId);
    if (!testCase) return;

    setIsGenerating(true);
    try {
      const promises = selectedModels.map(async (model) => {
        const startTime = Date.now();
        try {
          const response = await fetch('/api/prompt-tests/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              systemPrompt: templateForm.systemPrompt,
              userPrompt: templateForm.userPrompt?.replace('{{input}}', testCase.input) || testCase.input,
              temperature: templateForm.temperature || 0.7,
              maxTokens: templateForm.maxTokens || 2000
            })
          });

          const data = await response.json();
          const latency = Date.now() - startTime;

          return {
            model,
            response: data.data?.response || '',
            latency,
            success: data.code === 0,
            error: data.message
          };
        } catch (error) {
          return {
            model,
            response: '',
            latency: Date.now() - startTime,
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
          };
        }
      });

      const responses = await Promise.all(promises);
      setModelResponses(responses);
    } catch (error) {
      console.error('测试失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleModel = (model: string) => {
    setSelectedModels(prev => 
      prev.includes(model) 
        ? prev.filter(m => m !== model)
        : [...prev, model]
    );
  };

  const clearConversation = () => {
    setConversation([]);
    setModelResponses([]);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-3 p-4 bg-gray-50">
      {/* 第一栏：模板列表 */}
      <Card className="w-64 flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText size={18} />
            Prompt 模板
          </h3>
          <div className="flex gap-1">
            <input
              type="file"
              accept=".json"
              onChange={importTemplate}
              className="hidden"
              id="import-template"
            />
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => initDefaultTemplates(false)}
              disabled={isInitDefaults}
              title="恢复默认模板"
            >
              <RefreshCw size={16} className={isInitDefaults ? 'animate-spin' : ''} />
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <label htmlFor="import-template" className="cursor-pointer">
                <Copy size={16} />
              </label>
            </Button>
            <Button size="sm" variant="ghost" onClick={createNewTemplate}>
              <Plus size={16} />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {templates.map(template => (
              <div
                key={template.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedTemplateId === template.id 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                }`}
                onClick={() => setSelectedTemplateId(template.id)}
              >
                <div className="font-medium text-sm truncate">{template.name}</div>
                <div className="text-xs text-gray-500 truncate">{template.type}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateTemplate(template.id);
                    }}
                    title="复制"
                  >
                    <Copy size={12} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportTemplate(template.id);
                    }}
                    title="导出"
                  >
                    <Layout size={12} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1 text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTemplate(template.id);
                    }}
                    title="删除"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {/* 默认模板状态提示 */}
          {defaultTemplateStatus && defaultTemplateStatus.missing > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800 mb-2">
                ⚠️ 缺少 {defaultTemplateStatus.missing} 个默认模板
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => initDefaultTemplates(false)}
                disabled={isInitDefaults}
                className="w-full"
              >
                {isInitDefaults ? '初始化中...' : '点击恢复默认模板'}
              </Button>
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* 第二栏：编辑器 */}
      <Card className="w-[30%] flex flex-col p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Edit3 size={18} />
          Prompt 编辑器
        </h3>

        <div className="space-y-4 flex-1 overflow-y-auto">
          <div>
            <Label>模板名称</Label>
            <Input
              value={templateForm.name ?? ''}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              placeholder="模板名称"
              className="mt-1"
            />
          </div>

          <div>
            <Label>分类</Label>
            <Select
              value={templateForm.type ?? 'serviceReply'}
              onValueChange={(value) => setTemplateForm({ ...templateForm, type: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intentRecognition">意图识别</SelectItem>
                <SelectItem value="serviceReply">服务回复</SelectItem>
                <SelectItem value="chat">闲聊</SelectItem>
                <SelectItem value="report">报告生成</SelectItem>
                <SelectItem value="conversion">转化客服</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>温度: {templateForm.temperature}</Label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={templateForm.temperature ?? 0.7}
              onChange={(e) => setTemplateForm({ ...templateForm, temperature: parseFloat(e.target.value) })}
              className="w-full mt-1"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <Label>系统提示词 (System Prompt)</Label>
              <span className="text-xs text-gray-400">支持变量: {'{{sessionId}}, {{userName}}, {{groupName}}'}</span>
            </div>
            <div className="h-[200px] border rounded-lg mt-1 overflow-hidden">
              <Editor
                height="200px"
                defaultLanguage="markdown"
                value={templateForm.systemPrompt}
                onChange={(value) => setTemplateForm({ ...templateForm, systemPrompt: value || '' })}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on'
                }}
              />
            </div>
          </div>

          <div className="flex-1">
            <Label>用户提示词模板 (使用 {'{{input}}'} 代表用户输入)</Label>
            <div className="h-[150px] border rounded-lg mt-1 overflow-hidden">
              <Editor
                height="150px"
                defaultLanguage="markdown"
                value={templateForm.userPrompt}
                onChange={(value) => setTemplateForm({ ...templateForm, userPrompt: value || '' })}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on'
                }}
              />
            </div>
          </div>

          <Button onClick={saveTemplate} disabled={isSaving} className="w-full">
            <Save size={16} className="mr-2" />
            {isSaving ? '保存中...' : '保存模板'}
          </Button>
        </div>
      </Card>

      {/* 第三栏：对话 + 模型选择 */}
      <Card className="w-[35%] flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare size={18} />
            实时测试
          </h3>
          <Button size="sm" variant="ghost" onClick={clearConversation}>
            <RefreshCw size={14} />
          </Button>
        </div>

        {/* 模型选择 */}
        <div className="mb-4">
          <Label className="text-sm">选择模型（可多选）</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {BUILTIN_MODELS.map(model => (
              <Badge
                key={model}
                variant={selectedModels.includes(model) ? 'default' : 'outline'}
                className="cursor-pointer hover:opacity-80"
                onClick={() => toggleModel(model)}
              >
                {model}
              </Badge>
            ))}
          </div>
        </div>

        {/* 对话区域 */}
        <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 p-4 bg-gray-50">
            {conversation.length === 0 ? (
              <div className="text-center text-gray-400 text-sm mt-20">
                开始测试您的 Prompt
              </div>
            ) : (
              <div className="space-y-4">
                {conversation.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border shadow-sm'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-white border rounded-lg px-4 py-2 shadow-sm">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <RefreshCw size={14} className="animate-spin" />
                        AI 正在思考...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* 输入区域 */}
          <div className="border-t p-3 bg-white">
            <div className="flex gap-2">
              <Input
                value={userInput ?? ''}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="输入测试内容..."
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={isGenerating || !userInput.trim()}>
                <Play size={16} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 第四栏：测试用例 + 模型对比 */}
      <Card className="w-[calc(35%-48px)] flex flex-col p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TestTube2 size={18} />
          测试用例 & 对比
        </h3>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'test')}>
          <TabsList className="w-full">
            <TabsTrigger value="chat" className="flex-1">对话历史</TabsTrigger>
            <TabsTrigger value="test" className="flex-1">测试用例</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <ScrollArea className="h-[calc(100%-40px)]">
              {modelResponses.length === 0 ? (
                <div className="text-center text-gray-400 text-sm mt-10">
                  发送消息后查看模型对比
                </div>
              ) : (
                <div className="space-y-3">
                  {modelResponses.map((response, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{response.model}</Badge>
                        {response.success && (
                          <span className="text-xs text-gray-500">
                            {response.latency}ms
                          </span>
                        )}
                      </div>
                      <div className="text-sm">
                        {response.success ? (
                          <div className="whitespace-pre-wrap">{response.response}</div>
                        ) : (
                          <div className="text-red-500 text-xs">{response.error}</div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="test" className="mt-4">
            <div className="space-y-4 h-[calc(100%-40px)] flex flex-col">
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => {
                  const newTestCase: TestCase = {
                    id: Date.now().toString(),
                    name: `测试用例 ${testCases.length + 1}`,
                    input: '',
                    expectedOutput: '',
                    category: templateForm.type || 'serviceReply'
                  };
                  setTestCases([...testCases, newTestCase]);
                  setSelectedTestCaseId(newTestCase.id);
                }}>
                  <Plus size={14} className="mr-1" />
                  新建
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {testCases.map(testCase => (
                    <div
                      key={testCase.id}
                      className={`p-3 rounded-lg cursor-pointer border ${
                        selectedTestCaseId === testCase.id
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => selectTestCase(testCase.id)}
                    >
                      <div className="font-medium text-sm">{testCase.name}</div>
                      <div className="text-xs text-gray-500 truncate mt-1">
                        {testCase.input}
                      </div>
                      <div className="flex justify-between mt-2">
                        <Badge variant="outline" className="text-xs">
                          {testCase.category}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1 text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTestCases(testCases.filter(t => t.id !== testCase.id));
                          }}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {selectedTestCaseId && (
                <div className="space-y-2 pt-2 border-t">
                  <Input
                    value={testCases.find(t => t.id === selectedTestCaseId)?.name || ''}
                    onChange={(e) => {
                      setTestCases(testCases.map(t =>
                        t.id === selectedTestCaseId ? { ...t, name: e.target.value } : t
                      ));
                    }}
                    placeholder="用例名称"
                    className="text-sm"
                  />
                  <Textarea
                    value={testCases.find(t => t.id === selectedTestCaseId)?.input || ''}
                    onChange={(e) => {
                      setTestCases(testCases.map(t =>
                        t.id === selectedTestCaseId ? { ...t, input: e.target.value } : t
                      ));
                    }}
                    placeholder="输入内容"
                    rows={3}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={runTestCase} disabled={isGenerating} className="w-full">
                    <TestTube2 size={14} className="mr-1" />
                    运行测试
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
