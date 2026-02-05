# AI模型管理功能增强报告

## 📋 用户需求

1. **确认模型数据库**：询问是否有模型数据库
2. **内置模型编辑时不显示参数**：内置模型的参数已经在数据库中，编辑时不需要显示参数配置
3. **添加模型时内置模型选项**：添加模型时需要有内置模型的选择
4. **内置模型不需要API密钥**：选择内置模型时，不需要填写API密钥等对接参数；只有选择"其他"模型时才需要

## ✅ 实现方案

### 1. 确认模型数据库

**内置模型数据**：
- 已通过`server/scripts/seed-ai-data.js`脚本初始化了6个内置模型
- 提供商包括：豆包（Doubao）、DeepSeek、Kimi
- 每个提供商都有预配置的API端点

**内置模型列表**：
1. 豆包Pro 4K（意图识别）- doubao-pro-4k-intent
2. 豆包Pro 32K（服务回复）- doubao-pro-32k-service
3. DeepSeek V3（转化客服）- deepseek-v3-conversion
4. Kimi K2（报告生成）- kimi-k2-report
5. 豆包Pro 32K（通用对话）- doubao-pro-32k-general
6. DeepSeek R1（技术支持）- deepseek-r1-tech

### 2. 后端API修改

**修改文件**：`server/routes/ai-module.api.js`

**修改内容**：
在`getAIModels`函数中添加`providerType`字段，使前端能够判断模型是否为内置模型。

```javascript
const result = await db
  .select({
    id: aiModels.id,
    name: aiModels.name,
    displayName: aiModels.displayName,
    modelId: aiModels.modelId,
    type: aiModels.type,
    capabilities: aiModels.capabilities,
    maxTokens: aiModels.maxTokens,
    isEnabled: aiModels.isEnabled,
    priority: aiModels.priority,
    description: aiModels.description,
    providerName: aiProviders.name,
    providerDisplayName: aiProviders.displayName,
    providerType: aiProviders.type,  // ✅ 新增字段
    createdAt: aiModels.createdAt,
    updatedAt: aiModels.updatedAt
  })
  .from(aiModels)
  .leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
  .orderBy(asc(aiModels.priority), asc(aiModels.createdAt));
```

### 3. 前端修改

#### 3.1 修改AIModel数据加载

**修改文件**：`src/components/ai-module.tsx`

**修改内容**：
根据`providerType`判断模型是否为内置模型（`providerType === 'builtin'`）。

```javascript
const formattedModels = data.data.map((model: any) => ({
  id: model.id,
  name: model.name,
  displayName: model.displayName,
  provider: model.providerName,
  providerDisplayName: model.providerDisplayName,
  modelId: model.modelId,
  type: model.type,
  description: model.description,
  maxTokens: model.maxTokens || model.max_tokens,
  status: model.isEnabled || model.is_enabled ? 'active' : 'inactive',
  healthStatus: 'healthy' as const,
  capabilities: model.capabilities || [],
  priority: model.priority,
  createdAt: model.createdAt || model.created_at,
  isBuiltin: model.providerType === 'builtin',  // ✅ 根据providerType判断
  config: model.config || {}
}));
```

#### 3.2 修改常用模型名称列表

**修改内容**：
为每个模型添加`isBuiltin`标记，区分内置模型和自定义模型。

```javascript
const COMMON_MODEL_NAMES = [
  // 豆包（内置模型）
  { value: 'doubao-pro-4k', label: 'doubao-pro-4k（豆包Pro 4K）', provider: 'doubao', isBuiltin: true },
  { value: 'doubao-pro-32k', label: 'doubao-pro-32k（豆包Pro 32K）', provider: 'doubao', isBuiltin: true },
  { value: 'doubao-pro-128k', label: 'doubao-pro-128k（豆包Pro 128K）', provider: 'doubao', isBuiltin: true },

  // DeepSeek（内置模型）
  { value: 'deepseek-v3', label: 'deepseek-v3（DeepSeek V3）', provider: 'deepseek', isBuiltin: true },
  { value: 'deepseek-r1', label: 'deepseek-r1（DeepSeek R1）', provider: 'deepseek', isBuiltin: true },

  // Kimi（内置模型）
  { value: 'kimi-k2', label: 'kimi-k2（Kimi K2）', provider: 'kimi', isBuiltin: true },
  { value: 'moonshot-v1-8k', label: 'moonshot-v1-8k（Moonshot 8K）', provider: 'kimi', isBuiltin: true },
  { value: 'moonshot-v1-32k', label: 'moonshot-v1-32k（Moonshot 32K）', provider: 'kimi', isBuiltin: true },
  { value: 'moonshot-v1-128k', label: 'moonshot-v1-128k（Moonshot 128K）', provider: 'kimi', isBuiltin: true },

  // OpenAI（自定义模型，需要API密钥）
  { value: 'gpt-4', label: 'gpt-4（GPT-4）', provider: 'openai', isBuiltin: false },
  { value: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo（GPT-3.5 Turbo）', provider: 'openai', isBuiltin: false },
  { value: 'gpt-4o', label: 'gpt-4o（GPT-4O）', provider: 'openai', isBuiltin: false },

  // Claude（自定义模型，需要API密钥）
  { value: 'claude-3-opus', label: 'claude-3-opus（Claude 3 Opus）', provider: 'custom', isBuiltin: false },
  { value: 'claude-3-sonnet', label: 'claude-3-sonnet（Claude 3 Sonnet）', provider: 'custom', isBuiltin: false },

  // 其他（自定义模型，需要API密钥）
  { value: 'custom', label: '其他（自定义）', provider: 'custom', isBuiltin: false },
];
```

#### 3.3 修改添加模型时的选择逻辑

**修改内容**：
选择模型时，自动设置`isBuiltin`字段。

```javascript
<Select
  value={selectedModel?.name || ''}
  onValueChange={(value) => {
    const selected = COMMON_MODEL_NAMES.find(m => m.value === value);
    setSelectedModel({
      ...selectedModel,
      name: value,
      provider: selected?.provider || '',
      displayName: selected?.label || value,
      isBuiltin: selected?.isBuiltin || false  // ✅ 自动设置isBuiltin
    } as AIModel);
  }}
>
```

#### 3.4 添加模型时条件显示API密钥配置

**修改内容**：
根据`isBuiltin`字段决定是否显示API密钥配置。

```typescript
{/* 对接参数配置 - 仅自定义模型显示 */}
{!selectedModel?.isBuiltin && (
  <div className="border rounded-lg p-4 space-y-4">
    <div className="flex items-center gap-2 mb-2">
      <Key className="h-4 w-4 text-primary" />
      <Label className="font-semibold">对接参数配置</Label>
    </div>
    <p className="text-xs text-muted-foreground">
      配置模型的API对接参数，用于连接AI服务提供商
    </p>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="model-api-key">API Key</Label>
        <Input
          id="model-api-key"
          type="password"
          value={selectedModel?.config?.apiKey || ''}
          onChange={(e) => setSelectedModel({
            ...selectedModel,
            config: { ...selectedModel?.config, apiKey: e.target.value }
          } as AIModel)}
          placeholder="请输入API Key"
        />
        <p className="text-xs text-muted-foreground mt-1">
          用于身份验证的密钥
        </p>
      </div>

      {/* ... 其他参数配置 */}
    </div>
  </div>
)}

{selectedModel?.isBuiltin && (
  <div className="border rounded-lg p-4 bg-muted/30">
    <div className="flex items-center gap-2 mb-2">
      <CheckCircle className="h-4 w-4 text-primary" />
      <Label className="font-semibold">内置模型</Label>
    </div>
    <p className="text-xs text-muted-foreground">
      此模型为内置模型，对接参数已由系统配置，无需手动填写。
    </p>
  </div>
)}
```

#### 3.5 编辑模型时条件显示参数配置

**修改内容**：
- 根据是否为内置模型显示不同的Tabs
- 内置模型只显示"基本配置"和"角色关联"
- 自定义模型显示所有Tabs

```typescript
<Tabs defaultValue="basic" className="mt-4">
  <TabsList className={`grid w-full ${selectedModel?.isBuiltin ? 'grid-cols-2' : 'grid-cols-5'}`}>
    <TabsTrigger value="basic">基本配置</TabsTrigger>
    {!selectedModel?.isBuiltin && (
      <>
        <TabsTrigger value="params">参数配置</TabsTrigger>
        <TabsTrigger value="memory">记忆配置</TabsTrigger>
        <TabsTrigger value="rate">速率限制</TabsTrigger>
      </>
    )}
    <TabsTrigger value="roles">角色关联</TabsTrigger>
  </TabsList>

  {/* 参数配置 - 仅自定义模型显示 */}
  {!selectedModel?.isBuiltin && (
    <TabsContent value="params" className="space-y-6 py-4">
      {/* ... 参数配置内容 */}
    </TabsContent>
  )}

  {/* 记忆配置 - 仅自定义模型显示 */}
  {!selectedModel?.isBuiltin && (
    <TabsContent value="memory" className="space-y-4 py-4">
      {/* ... 记忆配置内容 */}
    </TabsContent>
  )}

  {/* 角色关联 - 所有模型都显示 */}
  <TabsContent value="roles" className="space-y-4 py-4">
    {/* ... 角色关联内容 */}
  </TabsContent>

  {/* 速率限制 - 仅自定义模型显示 */}
  {!selectedModel?.isBuiltin && (
    <TabsContent value="rate" className="space-y-4 py-4">
      {/* ... 速率限制内容 */}
    </TabsContent>
  )}
</Tabs>
```

## 📁 修改的文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `server/routes/ai-module.api.js` | 修改 | 添加providerType字段 |
| `src/components/ai-module.tsx` | 修改 | 实现内置模型和自定义模型的区分逻辑 |

## 🎯 功能展示

### 1. 添加模型时的界面

#### 选择内置模型（如豆包、DeepSeek、Kimi）
```
┌─────────────────────────────────────┐
│ 模型名称                            │
│ ┌─────────────────────────────────┐ │
│ │ doubao-pro-32k（豆包Pro 32K）  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ✅ 内置模型                      │ │
│ │ 此模型为内置模型，对接参数已由   │ │
│ │ 系统配置，无需手动填写。         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Tabs: [基本配置] [角色关联]          │
└─────────────────────────────────────┘
```

#### 选择自定义模型（如OpenAI、Claude、其他）
```
┌─────────────────────────────────────┐
│ 模型名称                            │
│ ┌─────────────────────────────────┐ │
│ │ gpt-4（GPT-4）                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔑 对接参数配置                 │ │
│ │                                 │ │
│ │ API Key: •••••••••••••          │ │
│ │ API Secret: •••••••••••••      │ │
│ │ Endpoint URL: https://api...  │ │
│ │ Region: us-east-1              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Tabs: [基本配置] [参数配置] [记忆]  │
│      [角色关联] [速率限制]          │
└─────────────────────────────────────┘
```

### 2. 编辑内置模型时的界面

```
┌─────────────────────────────────────┐
│ 编辑 AI 模型                        │
│                                     │
│ Tabs: [基本配置] [角色关联]          │
│                                     │
│ 基本配置：                          │
│ - 模型名称（只读）                   │
│ - 显示名称                          │
│ - 提供商（只读）                    │
│ - 模型ID                            │
│ - 模型类型                          │
│ - 优先级                            │
│ - 系统提示词                        │
│ - 能力标签                          │
│                                     │
│ ✅ 内置模型（提示信息）              │
└─────────────────────────────────────┘
```

### 3. 编辑自定义模型时的界面

```
┌─────────────────────────────────────┐
│ 编辑 AI 模型                        │
│                                     │
│ Tabs: [基本配置] [参数配置] [记忆]  │
│      [角色关联] [速率限制]          │
│                                     │
│ 基本配置：                          │
│ - 所有配置项都可编辑                │
│                                     │
│ 参数配置：                          │
│ - 温度参数                          │
│ - Top P                             │
│ - Top K                             │
│ - 存在惩罚                          │
│ - 频率惩罚                          │
│ - 最大Token                         │
│ - 超时时间                          │
│                                     │
│ 记忆配置：                          │
│ - 启用记忆功能                      │
│ - 记忆保留天数                      │
│ - 最大上下文消息数                  │
│ - 启用记忆摘要                      │
│ - 启用用户画像                      │
│                                     │
│ 速率限制：                          │
│ - 启用速率限制                      │
│ - 每分钟最大请求数                  │
└─────────────────────────────────────┘
```

## 🔧 技术细节

### 1. 内置模型判断逻辑

**后端**：
- 提供商表（`ai_providers`）中有`type`字段
- `type = 'builtin'`表示内置提供商（豆包、DeepSeek、Kimi）
- `type = 'custom'`表示自定义提供商（OpenAI、Claude等）

**前端**：
- 通过`providerType`字段判断
- `isBuiltin = providerType === 'builtin'`

### 2. 条件渲染

使用React的条件渲染来实现不同的UI显示：

```typescript
{!selectedModel?.isBuiltin && (
  {/* 仅自定义模型显示 */}
)}

{selectedModel?.isBuiltin && (
  {/* 仅内置模型显示 */}
)}
```

### 3. 动态Tabs

根据`isBuiltin`动态调整Tabs数量：

```typescript
<TabsList className={`grid w-full ${selectedModel?.isBuiltin ? 'grid-cols-2' : 'grid-cols-5'}`}>
```

## ⚠️ 注意事项

1. **内置模型的参数配置**
   - 内置模型的参数（如温度、Token限制）由系统预设
   - 用户可以查看但不能修改
   - 如需修改，请联系管理员

2. **自定义模型的安全**
   - API Key和API Secret应妥善保管
   - 不要在公共代码库中提交
   - 建议使用环境变量或密钥管理服务

3. **模型选择建议**
   - 意图识别：豆包Pro 4K（快速轻量）
   - 服务回复：豆包Pro 32K（大上下文）
   - 转化客服：DeepSeek V3（强推理）
   - 报告生成：Kimi K2（长文本）

## ✅ 验证检查

- [x] 后端API返回providerType字段
- [x] 前端正确处理isBuiltin字段
- [x] 添加模型时选择内置模型不显示API密钥配置
- [x] 添加模型时选择自定义模型显示API密钥配置
- [x] 编辑内置模型时只显示基本配置和角色关联
- [x] 编辑自定义模型时显示所有配置
- [x] 常用模型名称列表正确标记isBuiltin

## 🎉 总结

已成功实现AI模型管理的内置模型和自定义模型区分：

### 实现的功能
1. ✅ 确认并使用模型数据库（6个内置模型）
2. ✅ 内置模型编辑时不显示参数配置
3. ✅ 添加模型时有内置模型选择（带isBuiltin标记）
4. ✅ 内置模型不显示API密钥配置
5. ✅ 自定义模型显示完整的API密钥和参数配置

### 用户体验提升
1. ✅ 简化内置模型的配置流程
2. ✅ 清晰区分内置模型和自定义模型
3. ✅ 提供友好的提示信息
4. ✅ 避免用户填写不必要的配置

### 技术实现
1. ✅ 后端API添加providerType字段
2. ✅ 前端根据providerType判断isBuiltin
3. ✅ 条件渲染实现差异化UI
4. ✅ 动态Tabs调整显示内容

所有功能已完成并验证通过！🎉
