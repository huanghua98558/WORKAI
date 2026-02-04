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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Info,
  Eye,
  X
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
    provider?: string;
    model?: string;
    apiKey?: string;
    apiBase?: string;
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

  const [viewingDefaultPrompt, setViewingDefaultPrompt] = useState<{
    title: string;
    prompt: string;
  } | null>(null);

  // 获取默认提示词
  const getDefaultPrompt = (label: string): string => {
    switch (label) {
      case '意图识别':
        return `# 角色
你是一个专业的意图识别专家，负责分析用户消息并判断用户的真实意图。

# 任务
分析用户的输入，判断用户的意图属于以下哪一类：

## 意图分类
1. **咨询** - 用户询问产品、服务、价格、功能等信息
2. **投诉** - 用户表达不满、抱怨、要求解决问题
3. **售后** - 用户提出退换货、维修、客服等需求
4. **互动** - 用户进行闲聊、点赞、评论等社交行为
5. **购买** - 用户表现出购买意向或直接下单
6. **其他** - 无法明确分类的其他意图

# 输出格式
请直接输出意图类型，不要添加任何额外说明。

# 示例
用户：这个产品多少钱？ → 意图：咨询
用户：我要退货！ → 意图：投诉
用户：今天天气真好 → 意图：互动`;

      case '服务回复':
        return `# 角色
你是一个专业的客服代表，负责为用户提供友好、专业、高效的回复。

# 任务
根据用户的提问和意图，提供准确、友好、有帮助的回复。

# 原则
1. **友好专业** - 使用礼貌用语，保持专业态度
2. **准确清晰** - 回答要准确、清晰，避免模糊
3. **简洁高效** - 回复要简洁，不啰嗦
4. **解决问题** - 以解决用户问题为目标
5. **引导转化** - 适时引导用户进行购买或进一步咨询

# 注意事项
- 避免使用过于复杂的术语
- 不要承诺无法兑现的内容
- 对于无法回答的问题，及时转接人工客服
- 保持积极正向的态度

# 回复格式
直接给出回复内容，无需添加额外说明。`;

      case '转化客服':
        return `# 角色
你是一个专业的转化客服专家，负责引导用户完成购买转化。

# 任务
通过有效的沟通技巧，引导用户从咨询、关注转化为实际购买。

# 转化策略
1. **建立信任** - 通过专业解答建立用户信任
2. **挖掘需求** - 了解用户的真实需求和痛点
3. **产品匹配** - 根据需求推荐最合适的产品
4. **消除疑虑** - 主动解答用户的疑虑和担忧
5. **促成交易** - 使用合适的技巧促成交易

# 沟通技巧
- **提问技巧** - 使用开放式问题了解需求
- **倾听技巧** - 认真倾听用户的需求和反馈
- **共情技巧** - 理解和认同用户的感受
- **紧迫感** - 适时制造购买紧迫感
- **社会认同** - 引用其他用户的成功案例

# 禁忌
- 不要过度推销
- 不要隐瞒产品信息
- 不要给用户施加过大的压力
- 不要承诺无法兑现的内容
- 不要使用误导性语言

# 回复格式
直接给出回复内容，重点在于引导用户完成转化。`;

      default:
        return '暂无默认提示词';
    }
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/proxy/admin/config');
      if (!response.ok) throw new Error('获取配置失败');

      const data = await response.json();
      setConfig(data.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取配置失败');
    } finally {
      setLoading(false);
    }
  };



  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch('/api/proxy/admin/config', {
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
                onChange={(updates) => updateModelConfig('intentRecognition', updates)}
                label="意图识别"
                onViewDefaultPrompt={(label) => setViewingDefaultPrompt({ title: label, prompt: getDefaultPrompt(label) })}
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
                onChange={(updates) => updateModelConfig('serviceReply', updates)}
                label="服务回复"
                onViewDefaultPrompt={(label) => setViewingDefaultPrompt({ title: label, prompt: getDefaultPrompt(label) })}
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
                onChange={(updates) => updateModelConfig('conversion', updates)}
                label="转化客服"
                onViewDefaultPrompt={(label) => setViewingDefaultPrompt({ title: label, prompt: getDefaultPrompt(label) })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 长期记忆配置 */}
        <TabsContent value="memory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MemoryStick className="h-5 w-5 text-primary" />
                长期记忆配置
              </CardTitle>
              <CardDescription>
                配置AI的长期记忆能力，记住用户偏好和历史
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 启用开关 */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5" />
                  <div>
                    <div className="font-semibold">启用长期记忆</div>
                    <div className="text-sm text-muted-foreground">
                      让AI记住用户偏好和历史对话
                    </div>
                  </div>
                </div>
                <Switch
                  checked={config.ai.memory.enabled}
                  onCheckedChange={(checked) => updateMemoryConfig({ enabled: checked })}
                />
              </div>

              {config.ai.memory.enabled && (
                <div className="space-y-4">
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

                  {/* 启用对话摘要 */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">启用对话摘要</div>
                      <div className="text-sm text-muted-foreground">
                        自动生成长对话的摘要，节省token消耗
                      </div>
                    </div>
                    <Switch
                      checked={config.ai.memory.summaryEnabled}
                      onCheckedChange={(checked) => updateMemoryConfig({ summaryEnabled: checked })}
                    />
                  </div>

                  {/* 记忆类型 */}
                  <div className="space-y-3 pt-2">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      记忆内容类型
                    </div>

                    {/* 用户画像 */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">用户画像</div>
                        <div className="text-sm text-muted-foreground">
                          记住用户的基本信息和偏好
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
                        <div className="font-medium">用户偏好</div>
                        <div className="text-sm text-muted-foreground">
                          记住用户的喜好和习惯
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
                        <div className="font-medium">对话历史</div>
                        <div className="text-sm text-muted-foreground">
                          记住用户的历史对话记录
                        </div>
                      </div>
                      <Switch
                        checked={config.ai.memory.rememberUserHistory}
                        onCheckedChange={(checked) => updateMemoryConfig({ rememberUserHistory: checked })}
                      />
                    </div>

                    {/* 常见问题 */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">常见问题</div>
                        <div className="text-sm text-muted-foreground">
                          记住用户经常询问的问题
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
                        <div className="font-medium">用户反馈</div>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 默认提示词查看对话框 */}
      <Dialog open={!!viewingDefaultPrompt} onOpenChange={(open) => !open && setViewingDefaultPrompt(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                {viewingDefaultPrompt?.title} - 默认提示词
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewingDefaultPrompt(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="mt-4">
            <Textarea
              value={viewingDefaultPrompt?.prompt || ''}
              readOnly
              className="min-h-[400px] font-mono text-sm bg-muted"
            />
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span>这是系统优化的默认提示词，留空将自动使用此提示词</span>
              </div>
              {viewingDefaultPrompt && (
                <span>{viewingDefaultPrompt.prompt.length} 字符</span>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ModelConfigSectionProps {
  config: AIConfig;
  availableModels: BuiltinModel[];
  onChange: (updates: Partial<AIConfig>) => void;
  label: string;
  onViewDefaultPrompt: (label: string) => void;
}

function ModelConfigSection({ config, availableModels, onChange, label, onViewDefaultPrompt }: ModelConfigSectionProps) {
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

                {availableModels.length === 0 && (
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDefaultPrompt(label)}
                    className="h-6 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    查看默认提示词
                  </Button>
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
                onValueChange={(value) => onChange({ customModel: { ...config.customModel, provider: value } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择提供商" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="coze">Coze</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>模型名称</Label>
              <Input
                value={config.customModel?.model || ''}
                onChange={(e) => onChange({ customModel: { ...config.customModel, model: e.target.value } })}
                placeholder="例如: gpt-4, claude-3-opus"
              />
            </div>

            <div className="space-y-2">
              <Label>API 密钥</Label>
              <Input
                type="password"
                value={config.customModel?.apiKey || ''}
                onChange={(e) => onChange({ customModel: { ...config.customModel, apiKey: e.target.value } })}
                placeholder="输入 API 密钥"
              />
            </div>

            <div className="space-y-2">
              <Label>API 地址</Label>
              <Input
                value={config.customModel?.apiBase || ''}
                onChange={(e) => onChange({ customModel: { ...config.customModel, apiBase: e.target.value } })}
                placeholder="例如: https://api.openai.com/v1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
