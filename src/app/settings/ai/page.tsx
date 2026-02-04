'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Bot, 
  Brain, 
  MessageSquare, 
  Target, 
  MemoryStick, 
  User, 
  History,
  Database,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface BuiltinModel {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  description: string;
  category: string[];
  maxTokens: number;
  supportStream: boolean;
}

interface AIConfig {
  useBuiltin: boolean;
  builtinModelId?: string;
  useCustom?: boolean;
  customModel?: {
    provider: string;
    model: string;
    apiKey: string;
    apiBase: string;
  };
  systemPrompt?: string;
}

interface MemoryConfig {
  enabled: boolean;
  retentionDays: number;
  maxContextMessages: number;
  summaryEnabled: boolean;
  userProfileEnabled: boolean;
  rememberUserPreferences: boolean;
  rememberUserHistory: boolean;
  rememberUserQuestions: boolean;
  rememberUserFeedback: boolean;
}

interface SystemConfig {
  ai: {
    builtinModels: BuiltinModel[];
    intentRecognition: AIConfig;
    serviceReply: AIConfig;
    conversion: AIConfig;
    memory: MemoryConfig;
  };
}

export default function AISettingsPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('models');
  const [fineTuneModels, setFineTuneModels] = useState<FineTuneModel[]>([]);

  const getBackendUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin.replace(':5000', ':5001');
    }
    return 'http://localhost:5001';
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/admin/config`);
      if (!response.ok) throw new Error('获取配置失败');

      const data = await response.json();
      setConfig(data.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchFineTuneModels = async () => {
    try {
      const response = await fetch('/api/fine-tune/models/available');
      if (!response.ok) throw new Error('获取微调模型失败');

      const data = await response.json();
      if (data.success) {
        setFineTuneModels(data.data);
      }
    } catch (error) {
      console.error('获取微调模型失败:', error);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/admin/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai: config.ai })
      });
      
      if (!response.ok) throw new Error('保存配置失败');
      
      const data = await response.json();
      if (data.success) {
        toast.success('配置已保存');
      } else {
        throw new Error(data.error || '保存失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const updateModelConfig = (key: 'intentRecognition' | 'serviceReply' | 'conversion', updates: Partial<AIConfig>) => {
    if (!config) return;
    
    setConfig({
      ...config,
      ai: {
        ...config.ai,
        [key]: {
          ...config.ai[key],
          ...updates
        }
      }
    });
  };

  const updateMemoryConfig = (updates: Partial<MemoryConfig>) => {
    if (!config) return;
    
    setConfig({
      ...config,
      ai: {
        ...config.ai,
        memory: {
          ...config.ai.memory,
          ...updates
        }
      }
    });
  };

  const getAvailableModels = (category: string[]): BuiltinModel[] => {
    if (!config) return [];
    
    return config.ai.builtinModels.filter(model =>
      category.some(cat => model.category.includes(cat))
    );
  };

  useEffect(() => {
    fetchConfig();
    fetchFineTuneModels();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">AI 配置管理</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            配置AI模型和长期记忆功能
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchConfig} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                保存配置
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 配置内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">
            <Bot className="h-4 w-4 mr-2" />
            AI 模型
          </TabsTrigger>
          <TabsTrigger value="memory">
            <MemoryStick className="h-4 w-4 mr-2" />
            长期记忆
          </TabsTrigger>
        </TabsList>

        {/* AI 模型配置 */}
        <TabsContent value="models" className="space-y-4">
          {/* 意图识别 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                意图识别模型
              </CardTitle>
              <CardDescription>
                配置用于识别用户消息意图的AI模型
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ModelConfigSection
                config={config.ai.intentRecognition}
                availableModels={getAvailableModels(['intent'])}
                fineTuneModels={fineTuneModels}
                onChange={(updates) => updateModelConfig('intentRecognition', updates)}
                label="意图识别"
              />
            </CardContent>
          </Card>

          {/* 服务回复 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                服务回复模型
              </CardTitle>
              <CardDescription>
                配置用于生成客服回复的AI模型
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ModelConfigSection
                config={config.ai.serviceReply}
                availableModels={getAvailableModels(['service'])}
                fineTuneModels={fineTuneModels}
                onChange={(updates) => updateModelConfig('serviceReply', updates)}
                label="服务回复"
              />
            </CardContent>
          </Card>

          {/* 转化客服 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                转化客服模型
              </CardTitle>
              <CardDescription>
                配置用于引导用户转化的AI模型
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ModelConfigSection
                config={config.ai.conversion}
                availableModels={getAvailableModels(['service', 'conversion'])}
                fineTuneModels={fineTuneModels}
                onChange={(updates) => updateModelConfig('conversion', updates)}
                label="转化客服"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 长期记忆配置 */}
        <TabsContent value="memory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MemoryStick className="h-5 w-5 text-indigo-500" />
                长期记忆配置
              </CardTitle>
              <CardDescription>
                配置AI如何记忆和使用用户的历史信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 总开关 */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-indigo-500" />
                  <div>
                    <div className="font-semibold">启用长期记忆</div>
                    <div className="text-sm text-muted-foreground">
                      开启后，AI将记住用户的历史对话和偏好
                    </div>
                  </div>
                </div>
                <Switch
                  checked={config.ai.memory.enabled}
                  onCheckedChange={(checked) => updateMemoryConfig({ enabled: checked })}
                />
              </div>

              {!config.ai.memory.enabled && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    长期记忆已禁用，AI将不会记住用户的历史对话和偏好信息
                  </AlertDescription>
                </Alert>
              )}

              <div className={`space-y-4 ${!config.ai.memory.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* 记忆保留天数 */}
                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <History className="h-4 w-4" />
                    记忆保留天数
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={config.ai.memory.retentionDays}
                      onChange={(e) => updateMemoryConfig({ retentionDays: parseInt(e.target.value) || 30 })}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">
                      超过此天数的历史记录将被自动清理
                    </span>
                  </div>
                </div>

                {/* 最大上下文消息数 */}
                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    最大上下文消息数
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={config.ai.memory.maxContextMessages}
                      onChange={(e) => updateMemoryConfig({ maxContextMessages: parseInt(e.target.value) || 20 })}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">
                      每次AI调用时携带的历史消息数量（值越大消耗token越多）
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    记忆选项
                  </h3>

                  {/* 对话摘要 */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">对话摘要</div>
                      <div className="text-sm text-muted-foreground">
                        自动生成长对话的摘要，节省token消耗
                      </div>
                    </div>
                    <Switch
                      checked={config.ai.memory.summaryEnabled}
                      onCheckedChange={(checked) => updateMemoryConfig({ summaryEnabled: checked })}
                    />
                  </div>

                  {/* 用户画像 */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">用户画像</div>
                      <div className="text-sm text-muted-foreground">
                        分析用户特征，生成个性化用户画像
                      </div>
                    </div>
                    <Switch
                      checked={config.ai.memory.userProfileEnabled}
                      onCheckedChange={(checked) => updateMemoryConfig({ userProfileEnabled: checked })}
                    />
                  </div>

                  {/* 用户偏好 */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">记住用户偏好</div>
                      <div className="text-sm text-muted-foreground">
                        记住用户的语言风格、沟通偏好等
                      </div>
                    </div>
                    <Switch
                      checked={config.ai.memory.rememberUserPreferences}
                      onCheckedChange={(checked) => updateMemoryConfig({ rememberUserPreferences: checked })}
                    />
                  </div>

                  {/* 用户历史 */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">记住用户历史</div>
                      <div className="text-sm text-muted-foreground">
                        保存用户的历史对话记录
                      </div>
                    </div>
                    <Switch
                      checked={config.ai.memory.rememberUserHistory}
                      onCheckedChange={(checked) => updateMemoryConfig({ rememberUserHistory: checked })}
                    />
                  </div>

                  {/* 用户问题 */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">记住用户问题</div>
                      <div className="text-sm text-muted-foreground">
                        记住用户经常询问的问题，用于优化回复
                      </div>
                    </div>
                    <Switch
                      checked={config.ai.memory.rememberUserQuestions}
                      onCheckedChange={(checked) => updateMemoryConfig({ rememberUserQuestions: checked })}
                    />
                  </div>

                  {/* 用户反馈 */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">记住用户反馈</div>
                      <div className="text-sm text-muted-foreground">
                        记住用户对回复的反馈，用于改进AI表现
                      </div>
                    </div>
                    <Switch
                      checked={config.ai.memory.rememberUserFeedback}
                      onCheckedChange={(checked) => updateMemoryConfig({ rememberUserFeedback: checked })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ModelConfigSectionProps {
  config: AIConfig;
  availableModels: BuiltinModel[];
  fineTuneModels: FineTuneModel[];
  onChange: (updates: Partial<AIConfig>) => void;
  label: string;
}

function ModelConfigSection({ config, availableModels, fineTuneModels, onChange, label }: ModelConfigSectionProps) {
  return (
    <div className="space-y-4">
      {/* 模型类型选择 */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-3">
          <Bot className="h-5 w-5" />
          <div>
            <div className="font-semibold">使用内置模型</div>
            <div className="text-sm text-muted-foreground">
              推荐使用内置模型，无需配置API密钥
            </div>
          </div>
        </div>
        <Switch
          checked={config.useBuiltin}
          onCheckedChange={(checked) => onChange({ useBuiltin: checked, useCustom: !checked })}
        />
      </div>

      {config.useBuiltin ? (
        /* 内置模型选择 */
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>选择模型</Label>
            <Select
              value={config.builtinModelId}
              onValueChange={(value) => onChange({ builtinModelId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {/* 内置模型组 */}
                {availableModels.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      内置模型
                    </div>
                    {availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {model.description} - 最大{model.maxTokens} tokens
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}

                {/* 微调模型组 */}
                {fineTuneModels.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-blue-600 flex items-center gap-2">
                      <Bot className="h-3 w-3" />
                      微调模型
                    </div>
                    {fineTuneModels.map((model) => (
                      <SelectItem key={model.id} value={`finetune:${model.modelId}`}>
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center gap-2">
                            <Bot className="h-3 w-3 text-blue-500" />
                            {model.modelName}
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              {model.fineTuneType.toUpperCase()}
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            基于 {model.baseModel} - {new Date(model.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}

                {availableModels.length === 0 && fineTuneModels.length === 0 && (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    暂无可用模型
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 提示词配置 */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <Label className="text-base font-medium">系统提示词</Label>
              </div>
              {!config.systemPrompt && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  使用默认提示词
                </span>
              )}
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                系统提示词定义了AI的行为和角色。留空则使用经过优化的默认提示词。
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">自定义提示词（留空使用默认）</span>
                {config.systemPrompt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ systemPrompt: undefined })}
                    className="h-6 text-xs"
                  >
                    恢复默认
                  </Button>
                )}
              </div>
              <Textarea
                value={config.systemPrompt || ''}
                onChange={(e) => onChange({ systemPrompt: e.target.value })}
                placeholder="留空使用系统默认提示词..."
                className="min-h-[150px] font-mono text-sm"
              />
              {config.systemPrompt && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>已配置自定义提示词</span>
                  <span>•</span>
                  <span>{config.systemPrompt.length} 字符</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 自定义模型配置 */
        <div className="space-y-4 p-4 border rounded-lg">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              自定义模型需要配置API密钥和API地址
            </AlertDescription>
          </Alert>
          
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>提供商</Label>
              <Select
                value={config.customModel?.provider}
                onValueChange={(value) => onChange({
                  customModel: { ...config.customModel!, provider: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>模型名称</Label>
              <Input
                value={config.customModel?.model || ''}
                onChange={(e) => onChange({
                  customModel: { ...config.customModel!, model: e.target.value }
                })}
                placeholder="gpt-4o"
              />
            </div>
            
            <div className="space-y-2">
              <Label>API密钥</Label>
              <Input
                type="password"
                value={config.customModel?.apiKey || ''}
                onChange={(e) => onChange({
                  customModel: { ...config.customModel!, apiKey: e.target.value }
                })}
                placeholder="sk-..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>API地址</Label>
              <Input
                value={config.customModel?.apiBase || ''}
                onChange={(e) => onChange({
                  customModel: { ...config.customModel!, apiBase: e.target.value }
                })}
                placeholder="https://api.openai.com/v1"
              />
            </div>
          </div>

          {/* 提示词配置 */}
          <div className="space-y-3 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <Label className="text-base font-medium">系统提示词</Label>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                系统提示词定义了AI的行为和角色。留空则使用经过优化的默认提示词。
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">自定义提示词（留空使用默认）</span>
                {config.systemPrompt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ systemPrompt: undefined })}
                    className="h-6 text-xs"
                  >
                    恢复默认
                  </Button>
                )}
              </div>
              <Textarea
                value={config.systemPrompt || ''}
                onChange={(e) => onChange({ systemPrompt: e.target.value })}
                placeholder="留空使用系统默认提示词..."
                className="min-h-[150px] font-mono text-sm"
              />
              {config.systemPrompt && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>已配置自定义提示词</span>
                  <span>•</span>
                  <span>{config.systemPrompt.length} 字符</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
