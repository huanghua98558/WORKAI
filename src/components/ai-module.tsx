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
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface AIModel {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  status: 'active' | 'inactive';
  healthStatus: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  capabilities: string[];
  createdAt: string;
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

export default function AIModule() {
  const [activeTab, setActiveTab] = useState('models');
  const [loading, setLoading] = useState(true);

  // AI模型管理
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [showModelDialog, setShowModelDialog] = useState(false);
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
          name: model.display_name,
          provider: model.provider_display_name || model.provider_name,
          modelId: model.model_id,
          status: model.is_enabled ? 'active' : 'inactive',
          healthStatus: 'healthy' as const,
          capabilities: model.capabilities || [],
          createdAt: model.created_at
        }));
        setModels(formattedModels);
      }
    } catch (error) {
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
          name: template.category_name,
          description: template.description || '',
          template: template.template,
          variables: template.variables || [],
          isActive: template.is_active
        }));
        setTemplates(formattedTemplates);
      }
    } catch (error) {
      toast.error('加载话术模板失败');
    }
  };

  const handleTestAI = async () => {
    if (!testInput.trim()) {
      toast.error('请输入测试内容');
      return;
    }

    if (!testModel) {
      toast.error('请选择测试模型');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/proxy/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: testInput,
          model_id: testModel,
          type: 'intent'
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setTestResult(data.data);
      } else {
        toast.error(data.error || 'AI测试失败');
      }
    } catch (error) {
      toast.error('AI测试失败');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            AI 模块
          </h2>
          <p className="text-muted-foreground mt-2">
            AI服务管理、角色配置、话术模板和调试工具
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* 主内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
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
                    管理AI模型配置、健康检查和性能监控
                  </CardDescription>
                </div>
                <Button onClick={() => setShowModelDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加模型
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.map((model) => (
                  <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{model.name}</h3>
                          <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
                            {model.status === 'active' ? '启用' : '禁用'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {model.provider} / {model.modelId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Badge
                            variant={
                              model.healthStatus === 'healthy' ? 'default' :
                              model.healthStatus === 'degraded' ? 'warning' : 'destructive'
                            }
                          >
                            {model.healthStatus === 'healthy' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {model.healthStatus === 'degraded' && <Zap className="h-3 w-3 mr-1" />}
                            {model.healthStatus === 'down' && <XCircle className="h-3 w-3 mr-1" />}
                            {model.healthStatus}
                          </Badge>
                          {model.responseTime && (
                            <span className="text-sm text-muted-foreground">
                              {model.responseTime}ms
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {model.capabilities.slice(0, 3).map((cap) => (
                            <Badge key={cap} variant="outline" className="text-xs">
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTestingModel(model.id)}
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
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
                    管理7个预设AI角色和自定义角色
                  </CardDescription>
                </div>
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
                          <Badge variant="outline">{persona.roleType}</Badge>
                          {persona.isActive && <Badge variant="default">启用</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {persona.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        查看
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-1" />
                        编辑
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
                    管理100+话术模板，覆盖24类场景
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
                  目前已加载 {templates.length} 个话术模板示例，完整版本包含100+模板，覆盖24类场景。
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
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        查看
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-1" />
                        编辑
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
                测试AI意图识别和回复生成能力
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="test-model">选择模型</Label>
                  <Select value={testModel} onValueChange={setTestModel}>
                    <SelectTrigger id="test-model">
                      <SelectValue placeholder="选择AI模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="test-input">测试内容</Label>
                  <Textarea
                    id="test-input"
                    placeholder="输入要测试的内容，例如：你好，请问这个产品多少钱？"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleTestAI}
                  disabled={isTesting || !testModel}
                  className="w-full"
                >
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

                {testResult && (
                  <div className="space-y-4 mt-6">
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h4 className="font-semibold mb-2">测试结果</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">意图：</span>
                          <span className="font-medium">{testResult.intent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">置信度：</span>
                          <span className="font-medium">{(testResult.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">耗时：</span>
                          <span className="font-medium">{testResult.latency}ms</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h4 className="font-semibold mb-2">AI回复</h4>
                      <p className="text-sm">{testResult.reply}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
