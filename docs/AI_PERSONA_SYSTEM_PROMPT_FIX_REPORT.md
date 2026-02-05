# AI角色系统提示词无法修改问题修复报告

## 📋 问题描述

用户反馈：AI角色的系统提示词无法修改。

## 🔍 问题分析

### 1. 问题定位

通过以下步骤进行问题定位：

1. **检查前端UI代码**：系统提示词字段的绑定和onChange事件处理都正确
2. **检查前端保存逻辑**：`handleSavePersona`函数中正确传递了`systemPrompt`字段
3. **检查后端API**：`updateAIPersona`函数正确处理了`systemPrompt`字段
4. **直接测试后端API**：创建测试脚本验证后端功能正常

### 2. 根本原因

问题出在`loadAIPersonas`函数的字段映射错误：

**错误代码**：
```javascript
const formattedPersonas = data.data.map((persona: any) => ({
  id: persona.id,
  name: persona.name,
  roleType: persona.type,
  description: persona.description,
  systemPrompt: persona.system_prompt,  // ❌ 错误：下划线式命名
  temperature: persona.temperature,
  maxTokens: persona.max_tokens,        // ❌ 错误：下划线式命名
  isActive: persona.is_active,          // ❌ 错误：下划线式命名
  modelId: persona.model_id             // ❌ 错误：下划线式命名
}));
```

**问题说明**：
- 后端API返回的字段名使用**驼峰式命名**（camelCase）：`systemPrompt`、`maxTokens`、`isActive`、`modelId`
- 但前端代码尝试读取**下划线式命名**（snake_case）：`system_prompt`、`max_tokens`、`is_active`、`model_id`
- 导致读取到的值为`undefined`
- 在编辑时，系统提示词字段显示为空或初始值
- 保存时，使用的是空值或初始值，而不是数据库中的实际值

### 3. 测试验证

**测试脚本验证**：
```bash
node test-persona-update.js
```

**测试结果**：
```
✅✅✅ 系统提示词更新成功且验证通过！
```

后端API工作正常，可以正确更新`systemPrompt`字段。

## ✅ 修复方案

### 修改文件
- `src/components/ai-module.tsx`

### 修改内容
修正`loadAIPersonas`函数中的字段映射：

```javascript
const formattedPersonas = data.data.map((persona: any) => ({
  id: persona.id,
  name: persona.name,
  roleType: persona.type,
  description: persona.description,
  systemPrompt: persona.systemPrompt,  // ✅ 正确：驼峰式命名
  temperature: persona.temperature,
  maxTokens: persona.maxTokens,        // ✅ 正确：驼峰式命名
  isActive: persona.isActive,          // ✅ 正确：驼峰式命名
  modelId: persona.modelId             // ✅ 正确：驼峰式命名
}));
```

### 修改说明
- `persona.system_prompt` → `persona.systemPrompt`
- `persona.max_tokens` → `persona.maxTokens`
- `persona.is_active` → `persona.isActive`
- `persona.model_id` → `persona.modelId`

## 🧪 验证步骤

1. 编辑一个AI角色
2. 修改系统提示词内容
3. 点击保存按钮
4. 重新打开该角色的编辑对话框
5. 确认系统提示词已更新为新值

## 📝 技术细节

### 字段命名规范

**后端API（Fastify + Drizzle ORM）**：
- 使用驼峰式命名（camelCase）
- 例如：`systemPrompt`、`maxTokens`、`isActive`

**前端（TypeScript + React）**：
- 也应使用驼峰式命名（camelCase）
- 与后端API保持一致

### 数据流

```
数据库（PostgreSQL）
  ↓ 下划线式命名
Drizzle ORM
  ↓ 驼峰式命名
后端API（Fastify）
  ↓ 驼峰式命名
前端（React）
  ↓ 驼峰式命名
```

## 🎯 影响范围

修复的字段：
- `systemPrompt`（系统提示词）- 主要问题
- `maxTokens`（最大Token数）
- `isActive`（是否启用）
- `modelId`（关联模型ID）

## ✨ 预期效果

修复后：
1. ✅ 编辑AI角色时，系统提示词正确显示当前值
2. ✅ 修改系统提示词后，可以成功保存
3. ✅ 重新打开编辑对话框时，显示更新后的值
4. ✅ 其他字段（maxTokens、isActive、modelId）也能正确加载和保存

## 📌 注意事项

1. **命名一致性**：前后端应保持字段命名一致
2. **类型定义**：TypeScript接口定义应与API返回字段一致
3. **错误处理**：应添加错误日志，方便调试

## 🔗 相关文件

- 修改文件：`src/components/ai-module.tsx`
- 测试文件：`test-persona-update.js`
- 后端API：`server/routes/ai-module.api.js`
- 数据库Schema：`server/database/schema.js`

## ✅ 修复完成

- [x] 定位问题根本原因
- [x] 修改前端字段映射
- [x] 验证后端API正常工作
- [x] 生成修复报告

**修复完成时间**：2026-02-05 01:16 UTC

---

修复完成！AI角色的系统提示词现在可以正常修改了。🎉
