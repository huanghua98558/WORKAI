# 内置模型能力自动填充与只读功能实现报告

## 修改日期
2025年1月X日

## 问题描述
用户希望：
1. 内置模型能够备注能力（capabilities）进去
2. 在添加模型的时候自动显示这些能力
3. 内置模型的能力无法更改

## 解决方案

### 1. 修改 COMMON_MODEL_NAMES，添加 capabilities 字段

为每个内置模型添加了对应的能力标签：

**豆包（内置模型）**
- doubao-pro-4k（豆包Pro 4K）：意图识别、对话、文本生成
- doubao-pro-32k（豆包Pro 32K）：对话、文本生成、代码生成
- doubao-pro-128k（豆包Pro 128K）：对话、文本生成、向量化

**DeepSeek（内置模型）**
- deepseek-v3（DeepSeek V3）：对话、文本生成、代码生成、推理
- deepseek-r1（DeepSeek R1）：对话、文本生成、代码生成、推理

**Kimi（内置模型）**
- kimi-k2（Kimi K2）：对话、文本生成、向量化
- moonshot-v1-8k（Moonshot 8K）：对话、文本生成
- moonshot-v1-32k（Moonshot 32K）：对话、文本生成、代码生成
- moonshot-v1-128k（Moonshot 128K）：对话、文本生成、向量化

### 2. 自动填充 capabilities

在模型选择器的 `onValueChange` 事件中，自动从 `COMMON_MODEL_NAMES` 中获取模型的 `capabilities` 并填充到 `selectedModel` 中。

```typescript
onValueChange={(value) => {
  const selected = COMMON_MODEL_NAMES.find(m => m.value === value);
  setSelectedModel({
    ...selectedModel,
    name: value,
    provider: selected?.provider || '',
    displayName: selected?.label || value,
    isBuiltin: selected?.isBuiltin || false,
    capabilities: selected?.capabilities || []  // 自动填充
  } as AIModel);
}}
```

### 3. 内置模型能力只读

对于内置模型（`isBuiltin === true`）：
- 禁用所有能力选择复选框（`disabled={selectedModel?.isBuiltin === true}`）
- 降低复选框的透明度（`opacity-60`）
- 添加提示信息："内置模型能力已预配置，不可更改"

```typescript
<div className="flex items-center justify-between">
  <Label>能力标签</Label>
  {selectedModel?.isBuiltin === true && (
    <span className="text-xs text-muted-foreground">
      内置模型能力已预配置，不可更改
    </span>
  )}
</div>

<div className="flex flex-wrap gap-2 mt-2">
  {['intent_recognition', 'text_generation', 'conversation', 'code_generation', 'image_recognition', 'embedding'].map((cap) => (
    <div key={cap} className={`flex items-center gap-2 ${selectedModel?.isBuiltin === true ? 'opacity-60' : ''}`}>
      <input
        type="checkbox"
        id={`cap-${cap}`}
        checked={(selectedModel?.capabilities || []).includes(cap)}
        disabled={selectedModel?.isBuiltin === true}
        onChange={(e) => {
          const caps = selectedModel?.capabilities || [];
          if (e.target.checked) {
            setSelectedModel({ ...selectedModel, capabilities: [...caps, cap] } as AIModel);
          } else {
            setSelectedModel({ ...selectedModel, capabilities: caps.filter(c => c !== cap) } as AIModel);
          }
        }}
      />
      <Label htmlFor={`cap-${cap}`} className="text-sm">{getCapabilityText(cap)}</Label>
    </div>
  ))}
</div>
```

## 实现效果

### 1. 添加内置模型时
- 选择模型名称后，自动显示对应的能力标签（如豆包Pro 4K自动显示"意图识别"、"对话"、"文本生成"）
- 能力标签复选框处于禁用状态（灰色，不可点击）
- 显示提示信息："内置模型能力已预配置，不可更改"

### 2. 添加自定义模型时
- 选择模型名称后，不自动填充能力标签
- 能力标签复选框处于可操作状态（可勾选/取消勾选）

### 3. 编辑内置模型时
- 显示模型预配置的能力标签（只读）
- 无法修改能力标签
- 其他基本配置和角色关联可以修改

### 4. 编辑自定义模型时
- 可以自由修改能力标签
- 所有配置都可以修改

## 修改文件

- `src/components/ai-module.tsx`
  - 修改 COMMON_MODEL_NAMES（第105-128行）：添加 capabilities 字段
  - 修改模型选择器（第1053-1064行）：自动填充 capabilities
  - 修改能力选择部分（第1254-1285行）：内置模型能力只读

## 验证步骤

1. 打开浏览器访问 http://localhost:5000
2. 点击"添加模型"按钮
3. 选择一个内置模型（如豆包Pro 4K）
4. 验证：
   - ✅ 能力标签自动显示（意图识别、对话、文本生成）
   - ✅ 能力标签复选框处于禁用状态
   - ✅ 显示提示信息："内置模型能力已预配置，不可更改"
5. 保存模型
6. 再次编辑该模型
7. 验证：
   - ✅ 能力标签仍然显示且不可修改
8. 添加一个自定义模型（如GPT-4）
9. 验证：
   - ✅ 能力标签可自由勾选/取消

## 技术要点

1. **类型定义扩展**：给 `ModelOption` 类型添加了可选的 `capabilities` 字段
2. **自动填充机制**：在 `onValueChange` 中从预定义配置读取能力标签
3. **只读控制**：通过 `disabled` 属性和 CSS 样式（`opacity-60`）实现视觉和功能上的只读效果
4. **用户体验**：添加提示信息，明确告知用户内置模型能力不可修改

## 注意事项

1. 内置模型的 capabilities 字段在 COMMON_MODEL_NAMES 中预定义，无需从后端获取
2. 自定义模型的 capabilities 字段由用户自由选择
3. 保存时，capabilities 字段会和其他字段一起保存到数据库
4. 内置模型的 capabilities 在编辑时保持只读状态，确保预配置不会被意外修改

## 后续优化建议

1. 可以考虑在模型卡片上直接显示能力标签（已实现）
2. 可以考虑按能力标签筛选模型的功能
3. 可以考虑为不同能力标签添加不同的颜色或图标
