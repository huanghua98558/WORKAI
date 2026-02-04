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
      // TODO: 从API加载AI模型
      // const response = await fetch('/api/ai/models');
      // const data = await response.json();
      // setModels(data.data);

      // 模拟数据
      setModels([
        {
          id: '1',
          name: '豆包 Pro 32K',
          provider: 'doubao',
          modelId: 'doubao-pro-32k',
          status: 'active',
          healthStatus: 'healthy',
          responseTime: 1200,
          capabilities: ['intent_recognition', 'service_reply', 'chat', 'report'],
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          name: '豆包 Pro 4K',
          provider: 'doubao',
          modelId: 'doubao-pro-4k',
          status: 'active',
          healthStatus: 'healthy',
          responseTime: 800,
          capabilities: ['intent_recognition', 'service_reply', 'chat'],
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (error) {
      toast.error('加载AI模型失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAIPersonas = async () => {
    try {
      // TODO: 从API加载AI角色
      // const response = await fetch('/api/ai/personas');
      // const data = await response.json();
      // setPersonas(data.data);

      // 模拟数据 - 7个预设角色
      setPersonas([
        {
          id: 'persona-1',
          name: '社群运营机器人',
          roleType: 'community',
          description: '负责社群管理、用户互动、活动推广',
          systemPrompt: '你是一个专业的社群运营助手，负责：1. 热情欢迎新成员加入 2. 引导用户了解社群规则和价值 3. 组织和推广社群活动 4. 回答社群相关问题 5. 维护社群良好氛围',
          temperature: 0.8,
          maxTokens: 2000,
          isActive: true
        },
        {
          id: 'persona-2',
          name: '售后处理机器人',
          roleType: 'service',
          description: '负责售后咨询、问题处理、投诉建议',
          systemPrompt: '你是一个专业的售后客服，负责：1. 耐心倾听用户问题 2. 提供专业的解决方案 3. 跟进问题处理进度 4. 收集用户反馈 5. 提升用户满意度',
          temperature: 0.7,
          maxTokens: 2000,
          isActive: true
        },
        {
          id: 'persona-3',
          name: '转化客服机器人',
          roleType: 'conversion',
          description: '负责用户转化、营销推广、引导下单',
          systemPrompt: '你是一个专业的转化客服，负责：1. 了解用户需求和痛点 2. 介绍产品优势和价值 3. 引导用户下单购买 4. 解答购买相关疑问 5. 提升转化率',
          temperature: 0.9,
          maxTokens: 2000,
          isActive: true
        },
        {
          id: 'persona-4',
          name: '技术支持机器人',
          roleType: 'tech_support',
          description: '负责技术咨询、故障排查、使用指导',
          systemPrompt: '你是一个专业的技术支持工程师，负责：1. 解答技术问题 2. 排查故障原因 3. 提供解决方案 4. 指导正确使用方法 5. 持续优化技术文档',
          temperature: 0.5,
          maxTokens: 2000,
          isActive: true
        },
        {
          id: 'persona-5',
          name: '产品咨询机器人',
          roleType: 'product_info',
          description: '负责产品介绍、功能说明、对比分析',
          systemPrompt: '你是一个专业的产品顾问，负责：1. 介绍产品功能 2. 说明产品优势 3. 对比产品差异 4. 推荐合适产品 5. 解答产品疑问',
          temperature: 0.6,
          maxTokens: 2000,
          isActive: true
        },
        {
          id: 'persona-6',
          name: '客户关系机器人',
          roleType: 'customer_relation',
          description: '负责客户维护、满意度调查、回访',
          systemPrompt: '你是一个专业的客户关系管理专员，负责：1. 维护客户关系 2. 进行满意度调查 3. 定期客户回访 4. 收集客户反馈 5. 提升客户满意度',
          temperature: 0.7,
          maxTokens: 2000,
          isActive: true
        },
        {
          id: 'persona-7',
          name: '智能助手机器人',
          roleType: 'assistant',
          description: '负责通用问答、任务处理、日程管理',
          systemPrompt: '你是一个智能助手，负责：1. 回答通用问题 2. 处理日常任务 3. 管理日程安排 4. 提供信息查询 5. 辅助用户决策',
          temperature: 0.7,
          maxTokens: 2000,
          isActive: true
        }
      ]);
    } catch (error) {
      toast.error('加载AI角色失败');
    }
  };

  const loadMessageTemplates = async () => {
    try {
      // TODO: 从API加载话术模板
      // const response = await fetch('/api/ai/templates');
      // const data = await response.json();
      // setTemplates(data.data);

      // 模拟数据 - 24类场景的模板（这里只展示几个示例）
      setTemplates([
        {
          id: 'template-1',
          category: '欢迎语',
          name: '新用户欢迎',
          description: '新用户加入时的欢迎语',
          template: '欢迎 {{userName}} 加入我们的社群！🎉\n\n我是{{botName}}，很高兴认识你。\n\n这里是{{groupName}}，我们的宗旨是{{groupPurpose}}。\n\n请先阅读群规，遵守社群礼仪，共同维护良好的交流环境。',
          variables: ['userName', 'botName', 'groupName', 'groupPurpose'],
          isActive: true
        },
        {
          id: 'template-2',
          category: '售后咨询',
          name: '问题处理',
          description: '用户提出问题后的处理回复',
          template: '收到您的问题：{{userQuestion}}\n\n我们会尽快为您处理，预计在{{estimatedTime}}内回复。\n\n如有紧急问题，请联系客服热线：{{phone}}',
          variables: ['userQuestion', 'estimatedTime', 'phone'],
          isActive: true
        },
        {
          id: 'template-3',
          category: '转化引导',
          name: '引导下单',
          description: '引导用户下单购买',
          template: '根据您的需求，我推荐您购买 {{productName}}。\n\n🎁 限时优惠：原价 {{originalPrice}}，现价仅 {{discountPrice}}！\n\n👉 立即下单：{{orderUrl}}\n\n如有疑问，随时咨询我！',
          variables: ['productName', 'originalPrice', 'discountPrice', 'orderUrl'],
          isActive: true
        }
      ]);
    } catch (error) {
      toast.error('加载话术模板失败');
    }
  };

  const handleTestAI = async () => {
    if (!testInput.trim()) {
      toast.error('请输入测试内容');
      return;
    }

    setIsTesting(true);
    try {
      // TODO: 调用AI测试API
      // const response = await fetch('/api/ai/test', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     input: testInput,
      //     model: testModel
      //   })
      // });
      // const data = await response.json();
      // setTestResult(data.data);

      // 模拟响应
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestResult({
        intent: '咨询',
        confidence: 0.95,
        reply: '您好！很高兴为您服务，请问有什么可以帮助您的？',
        latency: 850
      });
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
