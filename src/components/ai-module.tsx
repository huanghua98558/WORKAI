'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Brain,
  Bot,
  MessageSquare,
  TestTube2,
  Settings,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Play,
  CheckCircle,
  XCircle,
  Info,
  Users,
  MessageCircle,
  FileText,
  Activity,
  Zap,
  Clock,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface AIModel {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  providerDisplayName: string;
  modelId: string;
  type?: string;
  description?: string;
  maxTokens?: number;
  status: 'active' | 'inactive';
  healthStatus: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  capabilities: string[];
  priority?: number;
  createdAt: string;
  isBuiltin?: boolean;
}

interface AIPersona {
  id: string;
  name: string;
  roleType: string;
  description: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
}

interface MessageTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  isActive: boolean;
}

// 中文映射函数
const getHealthStatusText = (status: string) => {
  const map: Record<string, { text: string; icon: React.ReactNode }> = {
    healthy: { text: '健康', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    degraded: { text: '降级', icon: <Zap className="h-3 w-3 mr-1" /> },
    down: { text: '离线', icon: <XCircle className="h-3 w-3 mr-1" /> }
  };
  return map[status] || { text: status, icon: null };
};

const getStatusText = (status: string) => {
  return status === 'active' ? '启用' : '禁用';
};

const getModelTypeText = (type?: string) => {
  const map: Record<string, string> = {
    intent: '意图识别',
    chat: '对话生成',
    text: '文本处理',
    embedding: '向量化'
  };
  return map[type || ''] || type || '未知';
};

const getCapabilityText = (cap: string) => {
  const map: Record<string, string> = {
    intent_recognition: '意图识别',
    text_generation: '文本生成',
    conversation: '对话',
    code_generation: '代码生成',
    image_recognition: '图像识别',
    embedding: '向量化'
  };
  return map[cap] || cap;
};

export default function AIModule() {
  const [activeTab, setActiveTab] = useState('models');
  const [loading, setLoading] = useState(true);

  // AI模型管理
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [showModelDetail, setShowModelDetail] = useState(false);
  const [testingModel, setTestingModel] = useState<string | null>(null);

  // AI角色管理
  const [personas, setPersonas] = useState<AIPersona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<AIPersona | null>(null);
  const [showPersonaDialog, setShowPersonaDialog] = useState(false);

  // 话术模板管理
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // AI调试
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testModel, setTestModel] = useState('');

  // 加载数据
  useEffect(() => {
    loadAIModels();
    loadAIPersonas();
    loadMessageTemplates();
  }, []);

  const loadAIModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/proxy/ai/models');
      const data = await response.json();

      if (data.success) {
        const formattedModels = data.data.map((model: any) => ({
          id: model.id,
          name: model.name || model.displayName || model.display_name,
          displayName: model.displayName || model.display_name || model.name,
          provider: model.providerName || model.provider_name || model.provider,
          providerDisplayName: model.providerDisplayName || model.provider_display_name || model.providerName || model.provider_name,
          modelId: model.modelId || model.model_id,
          type: model.type,
          description: model.description,
          maxTokens: model.maxTokens || model.max_tokens,
          status: model.isEnabled || model.is_enabled ? 'active' : 'inactive',
          healthStatus: 'healthy' as const,
          capabilities: model.capabilities || [],
          priority: model.priority,
          createdAt: model.createdAt || model.created_at,
          isBuiltin: true // 所有从API加载的都是内置模型
        }));
        setModels(formattedModels);
      }
    } catch (error) {
      console.error('加载AI模型失败:', error);
      toast.error('加载AI模型失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAIPersonas = async () => {
    try {
      const response = await fetch('/api/proxy/ai/personas');
      const data = await response.json();

      if (data.success) {
        const formattedPersonas = data.data.map((persona: any) => ({
          id: persona.id,
          name: persona.name,
          roleType: persona.type,
          description: persona.description,
          systemPrompt: persona.system_prompt,
          temperature: persona.temperature,
          maxTokens: persona.max_tokens,
          isActive: persona.is_active
        }));
        setPersonas(formattedPersonas);
      }
    } catch (error) {
      console.error('加载AI角色失败:', error);
      toast.error('加载AI角色失败');
    }
  };

  const loadMessageTemplates = async () => {
    try {
      const response = await fetch('/api/proxy/ai/templates');
      const data = await response.json();

      if (data.success) {
        const formattedTemplates = data.data.map((template: any) => ({
          id: template.id,
          category: template.category,
          name: template.category_name || template.name,
          description: template.description || '',
          template: template.template,
          variables: template.variables || [],
          isActive: template.is_active
        }));
        setTemplates(formattedTemplates);
      }
    } catch (error) {
      console.error('加载话术模板失败:', error);
      toast.error('加载话术模板失败');
    }
  };

  // 模型启用/禁用
  const handleToggleModelStatus = async (modelId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disable' : 'enable';
    try {
      const response = await fetch(`/api/proxy/ai/models/${modelId}/${newStatus}`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`模型已${newStatus === 'enable' ? '启用' : '禁用'}`);
        loadAIModels();
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  // 模型健康检查
  const handleHealthCheck = async (modelId: string) => {
    setTestingModel(modelId);
    try {
      const response = await fetch(`/api/proxy/ai/models/${modelId}/health`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        toast.success('模型健康检查通过');
      } else {
        toast.error(data.error || '健康检查失败');
      }
    } catch (error) {
      console.error('健康检查失败:', error);
      toast.error('健康检查失败');
    } finally {
      setTestingModel(null);
    }
  };

  // 查看模型详情
  const handleViewModelDetail = (model: AIModel) => {
    setSelectedModel(model);
    setShowModelDetail(true);
  };

  // AI角色CRUD操作
  const handleSavePersona = async () => {
    try {
      const payload = {
        name: selectedPersona?.name || '',
        type: selectedPersona?.roleType || 'custom',
        category: 'service',
        description: selectedPersona?.description || '',
        systemPrompt: selectedPersona?.systemPrompt || '',
        temperature: selectedPersona?.temperature || 0.7,
        maxTokens: selectedPersona?.maxTokens || 2000,
        isActive: selectedPersona?.isActive ?? true,
        isDefault: false
      };

      const url = selectedPersona?.id
        ? `/api/ai/personas/${selectedPersona.id}`
        : '/api/ai/personas';

      const response = await fetch(url, {
        method: selectedPersona?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(selectedPersona?.id ? '角色更新成功' : '角色创建成功');
        setShowPersonaDialog(false);
        setSelectedPersona(null);
        loadAIPersonas();
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  const handleDeletePersona = async (id: string) => {
    if (!confirm('确定要删除这个角色吗？')) return;

    try {
      const response = await fetch(`/api/ai/personas/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('角色删除成功');
        loadAIPersonas();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  const handleEditPersona = (persona: AIPersona) => {
    setSelectedPersona(persona);
    setShowPersonaDialog(true);
  };

  // 话术模板CRUD操作
  const handleSaveTemplate = async () => {
    try {
      const payload = {
        category: selectedTemplate?.category || '',
        categoryName: selectedTemplate?.name || '',
        description: selectedTemplate?.description || '',
        template: selectedTemplate?.template || '',
        variables: selectedTemplate?.variables || [],
        isActive: selectedTemplate?.isActive ?? true
      };

      const url = selectedTemplate?.id
        ? `/api/ai/templates/${selectedTemplate.id}`
        : '/api/ai/templates';

      const response = await fetch(url, {
        method: selectedTemplate?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(selectedTemplate?.id ? '模板更新成功' : '模板创建成功');
        setShowTemplateDialog(false);
        setSelectedTemplate(null);
        loadMessageTemplates();
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      const response = await fetch(`/api/ai/templates/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('模板删除成功');
        loadMessageTemplates();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateDialog(true);
  };

  // AI测试
  const handleAITest = async () => {
    if (!testModel || !testInput) {
      toast.error('请选择模型并输入测试内容');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: testModel,
          input: testInput
        })
      });

      const data = await response.json();
      if (data.success) {
        setTestResult(data.data);
        toast.success('测试完成');
      } else {
        toast.error(data.error || '测试失败');
      }
    } catch (error) {
      console.error('测试失败:', error);
      toast.error('测试失败');
    } finally {
      setIsTesting(false);
    }
  };

  if (loading && models.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-500" />
            AI 模块
          </h3>
          <p className="text-muted-foreground mt-1">
            管理 AI 模型、角色、话术模板和调试功能
          </p>
        </div>
        <Button variant="outline" onClick={() => { loadAIModels(); loadAIPersonas(); loadMessageTemplates(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="models" className="gap-2">
            <Bot className="h-4 w-4" />
            AI模型
          </TabsTrigger>
          <TabsTrigger value="personas" className="gap-2">
            <Users className="h-4 w-4" />
            AI角色
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            话术模板
          </TabsTrigger>
          <TabsTrigger value="debug" className="gap-2">
            <TestTube2 className="h-4 w-4" />
            AI调试
          </TabsTrigger>
        </TabsList>

        {/* AI模型管理 */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    AI 模型管理
                  </CardTitle>
                  <CardDescription className="mt-2">
                    管理 {models.length} 个内置 AI 模型，支持健康检查和启用/禁用
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-300">
                  这些是系统内置的 AI 模型，内置模型不支持编辑和删除。您可以启用/禁用模型，或进行健康检查。
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {models.map((model) => (
                  <div key={model.id} className="border rounded-lg hover:shadow-md transition-all">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* 左侧：模型基本信息 */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                            <Bot className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">{model.displayName}</h3>
                              <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
                                {getStatusText(model.status)}
                              </Badge>
                              {model.type && (
                                <Badge variant="outline" className="text-xs">
                                  {getModelTypeText(model.type)}
                                </Badge>
                              )}
                              {model.isBuiltin && (
                                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                  <ShieldCheck className="h-3 w-3 mr-1" />
                                  内置
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Bot className="h-3 w-3" />
                                {model.providerDisplayName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Cpu className="h-3 w-3" />
                                {model.modelId.slice(0, 20)}{model.modelId.length > 20 ? '...' : ''}
                              </span>
                            </div>

                            {model.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {model.description}
                              </p>
                            )}

                            {/* 能力标签 */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {model.capabilities.map((cap) => (
                                <Badge key={cap} variant="outline" className="text-xs">
                                  {getCapabilityText(cap)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 右侧：状态和操作 */}
                        <div className="flex flex-col items-end gap-3">
                          {/* 健康状态 */}
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                model.healthStatus === 'healthy' ? 'default' :
                                model.healthStatus === 'degraded' ? 'warning' : 'destructive'
                              }
                            >
                              {getHealthStatusText(model.healthStatus).icon}
                              {getHealthStatusText(model.healthStatus).text}
                            </Badge>
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={model.status === 'active'}
                              onCheckedChange={() => handleToggleModelStatus(model.id, model.status)}
                              disabled={testingModel === model.id}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleHealthCheck(model.id)}
                              disabled={testingModel === model.id}
                            >
                              {testingModel === model.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Activity className="h-4 w-4" />
                              )}
                              健康检查
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewModelDetail(model)}
                            >
                              <Info className="h-4 w-4" />
                              详情
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI角色管理 */}
        <TabsContent value="personas" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    AI 角色管理
                  </CardTitle>
                  <CardDescription className="mt-2">
                    管理 {personas.length} 个预设 AI 角色和自定义角色
                  </CardDescription>
                </div>
                <Button onClick={() => setShowPersonaDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加角色
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {personas.map((persona) => (
                  <div key={persona.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{persona.name}</h3>
                          <Badge variant="outline">{persona.roleType === 'preset' ? '预设角色' : '自定义角色'}</Badge>
                          {persona.isActive && <Badge variant="default">启用</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {persona.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPersona(persona)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePersona(persona.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 话术模板管理 */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    话术模板
                  </CardTitle>
                  <CardDescription className="mt-2">
                    管理 {templates.length} 个话术模板，覆盖各类场景
                  </CardDescription>
                </div>
                <Button onClick={() => setShowTemplateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加模板
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  目前已加载 {templates.length} 个话术模板示例，完整版本包含更多模板。
                </AlertDescription>
              </Alert>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MessageCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{template.name}</h3>
                          <Badge variant="secondary">{template.category}</Badge>
                          {template.isActive && <Badge variant="default">启用</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {template.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI调试 */}
        <TabsContent value="debug" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5 text-primary" />
                AI 调试
              </CardTitle>
              <CardDescription className="mt-2">
                测试 AI 意图识别和回复生成能力
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="test-model">选择模型</Label>
                  <Select value={testModel} onValueChange={setTestModel}>
                    <SelectTrigger id="test-model">
                      <SelectValue placeholder="选择 AI 模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="test-input">测试输入</Label>
                  <Textarea
                    id="test-input"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="输入要测试的内容..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleAITest} disabled={isTesting}>
                  {isTesting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      测试中...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      开始测试
                    </>
                  )}
                </Button>
              </div>

              {testResult && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">测试结果</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 模型详情对话框 */}
      <Dialog open={showModelDetail} onOpenChange={setShowModelDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              模型详情
            </DialogTitle>
          </DialogHeader>
          {selectedModel && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">模型名称</Label>
                  <p className="font-semibold">{selectedModel.displayName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">提供商</Label>
                  <p className="font-semibold">{selectedModel.providerDisplayName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">模型 ID</Label>
                  <p className="font-mono text-sm">{selectedModel.modelId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">模型类型</Label>
                  <p className="font-semibold">{getModelTypeText(selectedModel.type)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">最大 Token</Label>
                  <p className="font-semibold">{selectedModel.maxTokens || '未设置'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <p className="font-semibold">{getStatusText(selectedModel.status)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">健康状态</Label>
                  <p className="font-semibold">{getHealthStatusText(selectedModel.healthStatus).text}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">创建时间</Label>
                  <p className="text-sm">{new Date(selectedModel.createdAt).toLocaleString('zh-CN')}</p>
                </div>
              </div>

              {selectedModel.description && (
                <div>
                  <Label className="text-muted-foreground">描述</Label>
                  <p className="text-sm mt-1">{selectedModel.description}</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">能力</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedModel.capabilities.map((cap) => (
                    <Badge key={cap} variant="outline">
                      {getCapabilityText(cap)}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedModel.isBuiltin && (
                <Alert className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50">
                  <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <AlertDescription className="text-purple-800 dark:text-purple-300">
                    这是系统内置模型，不支持编辑和删除操作。
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowModelDetail(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI角色对话框 */}
      <Dialog open={showPersonaDialog} onOpenChange={setShowPersonaDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPersona ? '编辑 AI 角色' : '添加 AI 角色'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="persona-name">角色名称</Label>
              <Input
                id="persona-name"
                value={selectedPersona?.name || ''}
                onChange={(e) => setSelectedPersona({ ...selectedPersona, name: e.target.value } as AIPersona)}
                placeholder="例如：客服助手"
              />
            </div>
            <div>
              <Label htmlFor="persona-type">角色类型</Label>
              <Select
                value={selectedPersona?.roleType || 'custom'}
                onValueChange={(value) => setSelectedPersona({ ...selectedPersona, roleType: value } as AIPersona)}
              >
                <SelectTrigger id="persona-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preset">预设角色</SelectItem>
                  <SelectItem value="custom">自定义角色</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="persona-description">描述</Label>
              <Textarea
                id="persona-description"
                value={selectedPersona?.description || ''}
                onChange={(e) => setSelectedPersona({ ...selectedPersona, description: e.target.value } as AIPersona)}
                placeholder="角色描述"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="persona-prompt">系统提示词</Label>
              <Textarea
                id="persona-prompt"
                value={selectedPersona?.systemPrompt || ''}
                onChange={(e) => setSelectedPersona({ ...selectedPersona, systemPrompt: e.target.value } as AIPersona)}
                placeholder="系统提示词"
                rows={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="persona-temperature">温度参数</Label>
                <Input
                  id="persona-temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={selectedPersona?.temperature || 0.7}
                  onChange={(e) => setSelectedPersona({ ...selectedPersona, temperature: parseFloat(e.target.value) } as AIPersona)}
                />
              </div>
              <div>
                <Label htmlFor="persona-maxtokens">最大 Token</Label>
                <Input
                  id="persona-maxtokens"
                  type="number"
                  value={selectedPersona?.maxTokens || 2000}
                  onChange={(e) => setSelectedPersona({ ...selectedPersona, maxTokens: parseInt(e.target.value) } as AIPersona)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="persona-active"
                checked={selectedPersona?.isActive ?? true}
                onCheckedChange={(checked) => setSelectedPersona({ ...selectedPersona, isActive: checked } as AIPersona)}
              />
              <Label htmlFor="persona-active">启用此角色</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPersonaDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSavePersona}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 话术模板对话框 */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? '编辑话术模板' : '添加话术模板'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="template-category">分类</Label>
              <Input
                id="template-category"
                value={selectedTemplate?.category || ''}
                onChange={(e) => setSelectedTemplate({ ...selectedTemplate, category: e.target.value } as MessageTemplate)}
                placeholder="分类代码"
              />
            </div>
            <div>
              <Label htmlFor="template-name">模板名称</Label>
              <Input
                id="template-name"
                value={selectedTemplate?.name || ''}
                onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value } as MessageTemplate)}
                placeholder="模板名称"
              />
            </div>
            <div>
              <Label htmlFor="template-description">描述</Label>
              <Textarea
                id="template-description"
                value={selectedTemplate?.description || ''}
                onChange={(e) => setSelectedTemplate({ ...selectedTemplate, description: e.target.value } as MessageTemplate)}
                placeholder="模板描述"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="template-content">模板内容</Label>
              <Textarea
                id="template-content"
                value={selectedTemplate?.template || ''}
                onChange={(e) => setSelectedTemplate({ ...selectedTemplate, template: e.target.value } as MessageTemplate)}
                placeholder="模板内容，可以使用 {变量名} 格式"
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="template-variables">变量（逗号分隔）</Label>
              <Input
                id="template-variables"
                value={selectedTemplate?.variables?.join(', ') || ''}
                onChange={(e) => setSelectedTemplate({ ...selectedTemplate, variables: e.target.value.split(',').map(v => v.trim()) } as MessageTemplate)}
                placeholder="变量1, 变量2, 变量3"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="template-active"
                checked={selectedTemplate?.isActive ?? true}
                onCheckedChange={(checked) => setSelectedTemplate({ ...selectedTemplate, isActive: checked } as MessageTemplate)}
              />
              <Label htmlFor="template-active">启用此模板</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
