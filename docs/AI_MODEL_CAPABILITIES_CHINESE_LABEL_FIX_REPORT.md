# 能力标签显示英文问题修复报告

## 修改日期
2025年1月X日

## 问题描述

用户反馈能力标签显示为英文，而不是中文。

## 问题原因

后端API返回的能力标签值与前端映射表不完全匹配：

### 后端返回的能力标签值
从API返回的数据中发现以下能力标签：
- `intent_recognition` - 意图识别 ✅
- `text_generation` - 文本生成 ✅
- `conversation` - 对话 ✅
- `code_generation` - 代码生成 ✅
- `reasoning` - 推理 ❌（前端未映射）
- `long_context` - 长上下文 ❌（前端未映射）
- `document_analysis` - 文档分析 ❌（前端未映射）

### 前端映射表（修复前）
```typescript
const getCapabilityText = (cap: string) => {
  const map: Record<string, string> = {
    intent_recognition: '意图识别',
    text_generation: '文本生成',
    conversation: '对话',
    code_generation: '代码生成',
    image_recognition: '图像识别',
    embedding: '向量化'
  };
  return map[cap] || cap; // 未匹配到时返回原始值（英文）
};
```

## 解决方案

### 1. 扩展 `getCapabilityText` 映射表

添加新的能力标签映射：

```typescript
const getCapabilityText = (cap: string) => {
  const map: Record<string, string> = {
    intent_recognition: '意图识别',
    text_generation: '文本生成',
    conversation: '对话',
    code_generation: '代码生成',
    image_recognition: '图像识别',
    embedding: '向量化',
    reasoning: '推理',
    long_context: '长上下文',
    document_analysis: '文档分析'
  };
  return map[cap] || cap;
};
```

### 2. 添加新能力的图标

导入所需的图标组件：

```typescript
import {
  // ... 其他图标
  FileJson,      // 长上下文图标
  FileSearch     // 文档分析图标
} from 'lucide-react';
```

### 3. 更新能力选择器配置

在能力选择器中添加新能力的选项：

```typescript
{[
  { key: 'intent_recognition', label: '意图识别', icon: <Target />, color: 'bg-blue-500', listColor: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'text_generation', label: '文本生成', icon: <FileText />, color: 'bg-purple-500', listColor: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'conversation', label: '对话', icon: <MessageSquare />, color: 'bg-green-500', listColor: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'code_generation', label: '代码生成', icon: <Code2 />, color: 'bg-orange-500', listColor: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'image_recognition', label: '图像识别', icon: <ImageIcon />, color: 'bg-pink-500', listColor: 'bg-pink-100 text-pink-700 border-pink-200' },
  { key: 'embedding', label: '向量化', icon: <Database />, color: 'bg-cyan-500', listColor: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { key: 'reasoning', label: '推理', icon: <Brain />, color: 'bg-indigo-500', listColor: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { key: 'long_context', label: '长上下文', icon: <FileJson />, color: 'bg-rose-500', listColor: 'bg-rose-100 text-rose-700 border-rose-200' },
  { key: 'document_analysis', label: '文档分析', icon: <FileSearch />, color: 'bg-amber-500', listColor: 'bg-amber-100 text-amber-700 border-amber-200' }
].map((cap) => {
  // ...
})}
```

### 4. 更新模型列表能力标签配置

```typescript
const capConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  intent_recognition: { icon: <Target />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  text_generation: { icon: <FileText />, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  conversation: { icon: <MessageSquare />, color: 'bg-green-100 text-green-700 border-green-200' },
  code_generation: { icon: <Code2 />, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  image_recognition: { icon: <ImageIcon />, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  embedding: { icon: <Database />, color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  reasoning: { icon: <Brain />, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  long_context: { icon: <FileJson />, color: 'bg-rose-100 text-rose-700 border-rose-200' },
  document_analysis: { icon: <FileSearch />, color: 'bg-amber-100 text-amber-700 border-amber-200' }
};
```

### 5. 更新模型详情对话框能力标签配置

使用与模型列表相同的配置。

## 能力标签完整列表

| 英文键值 | 中文显示 | 图标 | 颜色 |
|---------|---------|------|------|
| intent_recognition | 意图识别 | Target | 蓝色 |
| text_generation | 文本生成 | FileText | 紫色 |
| conversation | 对话 | MessageSquare | 绿色 |
| code_generation | 代码生成 | Code2 | 橙色 |
| image_recognition | 图像识别 | ImageIcon | 粉色 |
| embedding | 向量化 | Database | 青色 |
| reasoning | 推理 | Brain | 靛蓝 |
| long_context | 长上下文 | FileJson | 玫瑰 |
| document_analysis | 文档分析 | FileSearch | 琥珀 |

## 修改文件

- `src/components/ai-module.tsx`
  - 第73-80行：扩展 `getCapabilityText` 映射表
  - 第19-21行：添加 `FileJson` 和 `FileSearch` 图标导入
  - 第1292-1295行：更新能力选择器配置（添加3个新能力）
  - 第728-736行：更新模型列表能力标签配置（添加3个新能力）
  - 第1810-1816行：更新模型详情对话框能力标签配置（添加3个新能力）

## 验证步骤

1. 打开浏览器访问 http://localhost:5000
2. 查看AI模型列表
3. 验证：
   - ✅ 所有能力标签都显示中文
   - ✅ 包括新添加的"推理"、"长上下文"、"文档分析"
   - ✅ 每个能力都有正确的图标和颜色
4. 点击"添加模型"按钮
5. 验证：
   - ✅ 能力选择按钮显示中文标签
   - ✅ 新增的能力选项（推理、长上下文、文档分析）正常显示
   - ✅ 点击按钮时有正确的视觉反馈

## 技术要点

1. **完整映射**：确保所有后端返回的能力标签都有对应的中文映射
2. **统一配置**：能力选择器、模型列表、模型详情三个地方使用相同的配置
3. **图标选择**：为新能力选择合适的图标（Brain、FileJson、FileSearch）
4. **颜色区分**：为新能力选择独特的颜色（indigo、rose、amber）

## 后续优化建议

1. 可以考虑将能力配置提取为常量，避免重复定义
2. 可以考虑添加能力标签的国际化支持（i18n）
3. 可以考虑添加能力标签的工具提示（Tooltip），显示更详细的说明
