'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Bot,
  Plus,
  Edit2,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Star,
  Save,
  X,
  RefreshCw,
  FileText,
  TestTube,
  Settings,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';

// 类型定义
interface PromptTemplate {
  id: string;
  name: string;
  type: 'intentRecognition' | 'serviceReply' | 'report';
  description?: string;
  systemPrompt: string;
  variables: string[];
  version: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PromptTest {
  id: number;
  templateId: string;
  testName: string;
  inputMessage: string;
  variables: Record<string, any>;
  aiOutput?: string;
  expectedOutput?: string;
  expectedIntent?: string;
  actualIntent?: string;
  isCorrect?: boolean;
  rating?: number;
  feedback?: string;
  modelId: string;
  temperature: number;
  requestDuration: number;
  status: 'success' | 'error';
  errorMessage?: string;
  createdAt: string;
}

interface TestStatistics {
  total: number;
  success: number;
  error: number;
  correct: number;
  incorrect: number;
  avgRating: string;
  avgDuration: number;
  byType: {
    intentRecognition: { total: number; correct: number };
    serviceReply: { total: number };
    report: { total: number };
  };
}

export default function PromptTraining() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [tests, setTests] = useState<PromptTest[]>([]);
  const [statistics, setStatistics] = useState<TestStatistics | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // 对话框状态
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // 表单状态
  const [templateForm, setTemplateForm] = useState<Partial<PromptTemplate>>({
    name: '',
    type: 'intentRecognition',
    description: '',
    systemPrompt: '',
    variables: [],
    version: '1.0',
    isActive: true,
  });

  const [testForm, setTestForm] = useState({
    templateId: '',
    testName: '',
    inputMessage: '',
    expectedOutput: '',
    expectedIntent: '',
    aiConfig: {
      modelId: 'doubao-seed-1-8-251228',
      temperature: 0.7,
    },
  });

  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());

  // 加载模板列表
  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/prompt-templates');
      const data = await res.json();
      if (data.code === 0) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('加载模板失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载测试记录
  const loadTests = async (templateId?: string) => {
    try {
      const url = templateId
        ? `/api/prompt-tests?templateId=${templateId}`
        : '/api/prompt-tests?limit=50';
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 0) {
        setTests(data.data);
      }
    } catch (error) {
      console.error('加载测试记录失败:', error);
    }
  };

  // 加载统计数据
  const loadStatistics = async (templateId?: string) => {
    try {
      const url = templateId
        ? `/api/prompt-tests/statistics?templateId=${templateId}`
        : '/api/prompt-tests/statistics';
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 0) {
        setStatistics(data.data);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // 选择模板
  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    loadTests(template.id);
    loadStatistics(template.id);
  };

  // 创建/更新模板
  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
      const method = templateForm.id ? 'PUT' : 'POST';
      const url = templateForm.id
        ? `/api/prompt-templates/${templateForm.id}`
        : '/api/prompt-templates';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      });

      const data = await res.json();
      if (data.code === 0) {
        setShowTemplateDialog(false);
        loadTemplates();
      }
    } catch (error) {
      console.error('保存模板失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 删除模板
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      const res = await fetch(`/api/prompt-templates/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadTemplates();
        if (selectedTemplate?.id === id) {
          setSelectedTemplate(null);
          setTests([]);
          setStatistics(null);
        }
      }
    } catch (error) {
      console.error('删除模板失败:', error);
    }
  };

  // 切换模板状态
  const handleToggleTemplate = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/prompt-templates/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) {
        loadTemplates();
      }
    } catch (error) {
      console.error('切换模板状态失败:', error);
    }
  };

  // 运行测试
  const handleRunTest = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/prompt-tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testForm),
      });

      const data = await res.json();
      if (data.code === 0) {
        setShowTestDialog(false);
        loadTests(selectedTemplate?.id);
        loadStatistics(selectedTemplate?.id);
      }
    } catch (error) {
      console.error('运行测试失败:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // 打开编辑对话框
  const handleEditTemplate = (template?: PromptTemplate) => {
    if (template) {
      setTemplateForm(template);
    } else {
      setTemplateForm({
        name: '',
        type: 'intentRecognition',
        description: '',
        systemPrompt: '',
        variables: [],
        version: '1.0',
        isActive: true,
      });
    }
    setShowTemplateDialog(true);
  };

  // 打开测试对话框
  const handleOpenTestDialog = (templateId: string) => {
    setTestForm({ ...testForm, templateId });
    setShowTestDialog(true);
  };

  // 展开/折叠测试详情
  const toggleTestExpand = (testId: number) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }
    setExpandedTests(newExpanded);
  };

  // 获取类型名称
  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      intentRecognition: '意图识别',
      serviceReply: '客服回复',
      report: '报告生成',
    };
    return names[type] || type;
  };

  // 获取类型颜色
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      intentRecognition: 'bg-blue-500',
      serviceReply: 'bg-green-500',
      report: 'bg-purple-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* 顶部统计卡片 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">总测试数</CardTitle>
              <TestTube className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">成功率</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.total > 0
                  ? ((statistics.success / statistics.total) * 100).toFixed(1)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                {statistics.success} 成功 / {statistics.error} 失败
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">正确率</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.correct + statistics.incorrect > 0
                  ? ((statistics.correct / (statistics.correct + statistics.incorrect)) *
                      100).toFixed(1)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                {statistics.correct} 正确 / {statistics.incorrect} 错误
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">平均评分</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.avgRating}</div>
              <p className="text-xs text-muted-foreground">
                平均耗时 {statistics.avgDuration}ms
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 模板列表 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Prompt 模板</CardTitle>
                <CardDescription>
                  管理和配置 AI 提示词模板
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => handleEditTemplate()}>
                <Plus className="h-4 w-4 mr-1" />
                新建
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{template.name}</h4>
                        <Badge
                          className={`${getTypeColor(template.type)} text-white text-xs`}
                        >
                          {getTypeName(template.type)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description || '暂无描述'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Switch
                        checked={template.isActive}
                        onCheckedChange={(checked) =>
                          handleToggleTemplate(template.id, checked)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>v{template.version}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTestDialog(template.id);
                        }}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTemplate(template);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {templates.length === 0 && !isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无模板，点击"新建"创建第一个模板</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 测试记录 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>测试记录</CardTitle>
                <CardDescription>
                  {selectedTemplate
                    ? `模板"${selectedTemplate.name}"的测试记录`
                    : '选择一个模板查看测试记录'}
                </CardDescription>
              </div>
              {selectedTemplate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    loadTests(selectedTemplate.id);
                    loadStatistics(selectedTemplate.id);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  刷新
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedTemplate ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bot className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>请选择一个模板开始测试</p>
              </div>
            ) : tests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TestTube className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>暂无测试记录，点击模板列表中的"运行"按钮开始测试</p>
                <Button
                  className="mt-4"
                  onClick={() => handleOpenTestDialog(selectedTemplate.id)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  运行测试
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tests.map((test) => (
                  <Card
                    key={test.id}
                    className={`border-2 ${
                      test.status === 'error'
                        ? 'border-red-200 bg-red-50/50'
                        : test.isCorrect === false
                        ? 'border-yellow-200 bg-yellow-50/50'
                        : test.isCorrect === true
                        ? 'border-green-200 bg-green-50/50'
                        : 'border-border'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{test.testName}</h4>
                            <Badge
                              variant={
                                test.status === 'success'
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {test.status === 'success' ? '成功' : '失败'}
                            </Badge>
                            {test.isCorrect !== null && (
                              <Badge
                                variant={test.isCorrect ? 'default' : 'secondary'}
                              >
                                {test.isCorrect ? '正确' : '错误'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            输入: {test.inputMessage.substring(0, 100)}
                            {test.inputMessage.length > 100 ? '...' : ''}
                          </p>
                          {test.actualIntent && (
                            <p className="text-xs text-muted-foreground">
                              期望意图: {test.expectedIntent} | 实际意图:{' '}
                              {test.actualIntent}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {test.requestDuration}ms
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleTestExpand(test.id)}
                          >
                            {expandedTests.has(test.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {expandedTests.has(test.id) && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          {test.aiOutput && (
                            <div>
                              <Label className="text-sm font-medium">AI 输出:</Label>
                              <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                                {test.aiOutput}
                              </div>
                            </div>
                          )}
                          {test.expectedOutput && (
                            <div>
                              <Label className="text-sm font-medium">期望输出:</Label>
                              <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                                {test.expectedOutput}
                              </div>
                            </div>
                          )}
                          {test.errorMessage && (
                            <Alert variant="destructive">
                              <AlertDescription>{test.errorMessage}</AlertDescription>
                            </Alert>
                          )}
                          <div className="text-xs text-muted-foreground">
                            模型: {test.modelId} | 温度: {test.temperature}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 创建/编辑模板对话框 */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {templateForm.id ? '编辑模板' : '新建模板'}
            </DialogTitle>
            <DialogDescription>
              配置 AI 提示词模板，用于意图识别、客服回复或报告生成
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>模板名称 *</Label>
                <Input
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, name: e.target.value })
                  }
                  placeholder="输入模板名称"
                />
              </div>

              <div className="space-y-2">
                <Label>模板类型 *</Label>
                <Select
                  value={templateForm.type}
                  onValueChange={(value: any) =>
                    setTemplateForm({ ...templateForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intentRecognition">意图识别</SelectItem>
                    <SelectItem value="serviceReply">客服回复</SelectItem>
                    <SelectItem value="report">报告生成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={templateForm.description}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, description: e.target.value })
                }
                placeholder="输入模板描述"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>System Prompt *</Label>
              <Textarea
                value={templateForm.systemPrompt}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, systemPrompt: e.target.value })
                }
                placeholder="输入系统提示词"
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>版本</Label>
                <Input
                  value={templateForm.version}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, version: e.target.value })
                  }
                  placeholder="1.0"
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  checked={templateForm.isActive}
                  onCheckedChange={(checked) =>
                    setTemplateForm({ ...templateForm, isActive: checked })
                  }
                />
                <Label>启用此模板</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveTemplate} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  保存
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 运行测试对话框 */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>运行测试</DialogTitle>
            <DialogDescription>
              输入测试消息，验证 Prompt 模板的效果
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>测试名称 *</Label>
              <Input
                value={testForm.testName}
                onChange={(e) =>
                  setTestForm({ ...testForm, testName: e.target.value })
                }
                placeholder="输入测试名称"
              />
            </div>

            <div className="space-y-2">
              <Label>输入消息 *</Label>
              <Textarea
                value={testForm.inputMessage}
                onChange={(e) =>
                  setTestForm({ ...testForm, inputMessage: e.target.value })
                }
                placeholder="输入测试消息"
                rows={4}
              />
            </div>

            {selectedTemplate?.type === 'intentRecognition' && (
              <div className="space-y-2">
                <Label>期望意图</Label>
                <Input
                  value={testForm.expectedIntent}
                  onChange={(e) =>
                    setTestForm({ ...testForm, expectedIntent: e.target.value })
                  }
                  placeholder="输入期望的意图类型（如: service, chat, help）"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>期望输出（可选）</Label>
              <Textarea
                value={testForm.expectedOutput}
                onChange={(e) =>
                  setTestForm({ ...testForm, expectedOutput: e.target.value })
                }
                placeholder="输入期望的 AI 输出，用于对比验证"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>模型 ID</Label>
                <Input
                  value={testForm.aiConfig.modelId}
                  onChange={(e) =>
                    setTestForm({
                      ...testForm,
                      aiConfig: {
                        ...testForm.aiConfig,
                        modelId: e.target.value,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>温度</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={testForm.aiConfig.temperature}
                  onChange={(e) =>
                    setTestForm({
                      ...testForm,
                      aiConfig: {
                        ...testForm.aiConfig,
                        temperature: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              取消
            </Button>
            <Button onClick={handleRunTest} disabled={isTesting}>
              {isTesting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  测试中...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  运行测试
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
