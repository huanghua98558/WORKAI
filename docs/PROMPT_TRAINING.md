# Prompt 训练和测试流程

## 概述

WorkTool AI 中枢系统提供完整的 Prompt 训练和测试平台，支持：

- **Prompt 模板管理**：创建、编辑、复制、导入导出 Prompt 模板
- **实时测试**：在编辑器中实时测试 Prompt 效果
- **多模型对比**：同时测试多个 AI 模型的输出效果
- **测试用例管理**：创建和管理测试用例
- **批量测试**：批量运行测试用例并分析结果
- **效果评估**：查看测试统计和效果分析

## Prompt 模板分类

系统支持以下类型的 Prompt 模板：

| 类型 | 说明 | 使用场景 |
|-----|------|---------|
| `intentRecognition` | 意图识别 | 识别用户消息的意图类型 |
| `serviceReply` | 服务回复 | 回答服务类问题 |
| `chat` | 闲聊 | 处理闲聊对话 |
| `report` | 报告生成 | 生成报告 |
| `conversion` | 转化客服 | 营销转化场景 |
| `risk` | 风险回复 | 风险内容处理 |
| `spam` | 垃圾信息 | 垃圾信息处理 |

## 界面布局

### 四栏布局

1. **左侧 - Prompt 模板列表**
   - 显示所有已创建的模板
   - 支持创建、复制、导出、删除模板
   - 支持导入外部模板

2. **中间左 - Prompt 编辑器**
   - 编辑模板名称、分类
   - 编辑系统提示词
   - 编辑用户提示词模板
   - 设置温度和最大 Token 数

3. **中间右 - 实时测试**
   - 选择要测试的 AI 模型（支持多选）
   - 实时对话测试
   - 查看模型响应

4. **右侧 - 测试用例 & 对比**
   - 管理测试用例
   - 查看模型响应对比
   - 查看对话历史

## 快速开始

### 1. 创建 Prompt 模板

1. 点击模板列表右上角的 `+` 按钮
2. 在编辑器中填写模板信息：
   - 模板名称
   - 分类
   - 系统提示词
   - 用户提示词模板
   - 温度 (0-1)
   - 最大 Token 数
3. 点击 `保存模板` 按钮

### 2. 编辑 Prompt 模板

1. 在模板列表中选择要编辑的模板
2. 在编辑器中修改模板内容
3. 点击 `保存模板` 按钮保存修改

### 3. 实时测试 Prompt

1. 在编辑器中选择要测试的模板
2. 在实时测试区域选择要测试的 AI 模型（支持多选）
3. 在输入框中输入测试内容
4. 点击 `播放` 按钮或按 `Enter` 发送消息
5. 查看各模型的响应结果

### 4. 创建测试用例

1. 切换到 `测试用例` 标签页
2. 点击 `新建` 按钮
3. 填写用例名称和输入内容
4. 点击 `运行测试` 按钮测试该用例

## Prompt 变量

系统支持在提示词中使用以下变量：

### 系统提示词变量

- `{{sessionId}}` - 会话 ID
- `{{userName}}` - 用户名称
- `{{groupName}}` - 群组名称
- `{{context}}` - 上下文对话历史

### 用户提示词变量

- `{{input}}` - 用户输入内容（必需）
- `{{intent}}` - 意图类型
- `{{confidence}}` - 意图置信度

## 使用示例

### 示例 1：服务回复 Prompt

**系统提示词**：
```
你是一个专业的客服助手，负责回答用户的问题。

请遵循以下原则：
1. 语气友好、专业
2. 回答简洁、准确
3. 如果不确定，请如实说明

会话信息：
- 用户名称：{{userName}}
- 群组名称：{{groupName}}
```

**用户提示词**：
```
用户问题：{{input}}

请提供专业的回答。
```

### 示例 2：转化客服 Prompt

**系统提示词**：
```
你是一个专业的营销转化客服，目标是引导用户完成转化。

请遵循以下原则：
1. 主动了解用户需求
2. 突出产品/服务价值
3. 引导用户采取行动（如：咨询、购买、体验等）

当前场景：
- 用户名称：{{userName}}
- 群组名称：{{groupName}}
```

**用户提示词**：
```
用户咨询：{{input}}

请提供专业的转化回复，引导用户完成转化。
```

### 示例 3：意图识别 Prompt

**系统提示词**：
```
你是一个意图识别助手，负责识别用户消息的意图类型。

请将用户消息分类为以下意图类型之一：
- service: 服务请求
- help: 帮助请求
- chat: 闲聊
- welcome: 欢迎
- risk: 风险内容
- spam: 垃圾信息
- admin: 管理指令

请以 JSON 格式返回：
```json
{
  "intent": "意图类型",
  "confidence": 0-100的置信度
}
```
```

**用户提示词**：
```
用户消息：{{input}}

请识别该消息的意图。
```

## API 接口

### Prompt 模板管理

#### 获取模板列表
```bash
GET /api/prompt-templates
Query Params:
  - type: 模板类型（可选）
  - isActive: 是否激活（可选）
```

#### 获取单个模板
```bash
GET /api/prompt-templates/:id
```

#### 创建模板
```bash
POST /api/prompt-templates
Content-Type: application/json

{
  "name": "模板名称",
  "type": "serviceReply",
  "description": "描述",
  "systemPrompt": "系统提示词",
  "userPrompt": "{{input}}",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

#### 更新模板
```bash
PUT /api/prompt-templates/:id
Content-Type: application/json

{
  "name": "新名称",
  "systemPrompt": "新系统提示词"
}
```

#### 删除模板
```bash
DELETE /api/prompt-templates/:id
```

#### 复制模板
```bash
POST /api/prompt-templates/:id/duplicate
Content-Type: application/json

{
  "name": "副本名称"
}
```

#### 导出模板
```bash
GET /api/prompt-templates/:id/export
```

#### 导入模板
```bash
POST /api/prompt-templates/import
Content-Type: application/json

{
  "name": "模板名称",
  "type": "serviceReply",
  "systemPrompt": "系统提示词",
  "userPrompt": "{{input}}"
}
```

### Prompt 测试管理

#### 运行测试
```bash
POST /api/prompt-tests/run
Content-Type: application/json

{
  "model": "doubao-seed-1-8-251228",
  "systemPrompt": "系统提示词",
  "userPrompt": "用户输入",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

#### 批量测试
```bash
POST /api/prompt-tests/batch
Content-Type: application/json

{
  "templateId": "模板ID",
  "testCases": [
    { "name": "测试用例1", "input": "输入内容1" },
    { "name": "测试用例2", "input": "输入内容2" }
  ],
  "aiConfig": {
    "model": "doubao-seed-1-8-251228",
    "temperature": 0.7
  }
}
```

#### 获取测试记录
```bash
GET /api/prompt-tests
Query Params:
  - templateId: 模板ID（可选）
  - status: 状态（可选）
  - limit: 限制数量（默认50）
  - offset: 偏移量（默认0）
```

#### 获取测试统计
```bash
GET /api/prompt-tests/statistics
Query Params:
  - templateId: 模板ID（可选）
```

## 支持的 AI 模型

系统内置以下 AI 模型用于测试：

| 模型 ID | 名称 | 特点 |
|---------|------|------|
| `doubao-seed-1-8-251228` | 豆包 Seed 1.8 | 综合能力强 |
| `doubao-seed-1-6-251015` | 豆包 Seed 1.6 | 平衡性能 |
| `doubao-seed-1-6-flash-250615` | 豆包 Flash | 快速响应 |
| `doubao-seed-1-6-thinking-250715` | 豆包 Thinking | 深度思考 |
| `doubao-seed-1-6-lite-251015` | 豆包 Lite | 轻量级 |
| `deepseek-v3-2-251201` | DeepSeek V3 | 强大推理能力 |
| `deepseek-r1-250528` | DeepSeek R1 | 推理能力强 |
| `kimi-k2-250905` | Kimi K2 | 长文本处理 |

## 最佳实践

### 1. Prompt 设计原则

- **清晰明确**：清晰地描述任务和要求
- **提供示例**：提供输入输出示例，帮助模型理解
- **控制长度**：避免提示词过长，影响响应速度
- **使用变量**：合理使用变量，使 Prompt 更灵活

### 2. 温度设置

- **0.0-0.3**：确定性输出，适合需要精确答案的场景
- **0.4-0.7**：平衡输出，适合通用场景
- **0.8-1.0**：创造性输出，适合需要多样性的场景

### 3. Token 控制

- **500-1000**：简短回复，适合快速响应
- **1000-2000**：标准回复，适合通用场景
- **2000-4000**：长回复，适合详细说明

### 4. 测试流程

1. **创建模板**：先创建基础 Prompt 模板
2. **单次测试**：使用实时测试功能快速验证
3. **创建用例**：创建多个典型测试用例
4. **批量测试**：批量运行测试用例
5. **分析结果**：分析各模型的表现
6. **迭代优化**：根据测试结果优化 Prompt

### 5. 多模型对比

- 同时选择多个模型进行测试
- 对比不同模型的输出质量
- 根据场景选择最合适的模型
- 记录各模型的特点和适用场景

## 常见问题

### Q: 如何快速复制一个模板？
**A**: 在模板列表中点击模板卡片上的 `复制` 按钮。

### Q: 如何导出模板分享给他人？
**A**: 在模板列表中点击模板卡片上的 `导出` 按钮，将导出 JSON 文件。

### Q: 如何导入别人分享的模板？
**A**: 点击模板列表右上角的导入按钮（复制图标），选择 JSON 文件导入。

### Q: 测试时如何查看所有模型的响应？
**A**: 切换到右侧的 `对话历史` 标签页，可以看到所有模型的响应对比。

### Q: 如何批量测试多个用例？
**A**: 在 `测试用例` 标签页中创建多个测试用例，然后逐个运行测试，或使用批量测试 API。

### Q: 变量不生效怎么办？
**A**: 确保变量格式正确，如 `{{input}}`，注意使用双花括号。

## 性能优化

1. **减少不必要的变量**：只使用必要的变量
2. **控制提示词长度**：避免过长的提示词
3. **合理设置最大 Token**：根据需求设置合适的最大 Token 数
4. **选择合适的模型**：根据场景选择合适的模型，平衡性能和效果

## 安全注意事项

1. **不要在提示词中包含敏感信息**
2. **定期检查和更新提示词**
3. **测试各种输入场景，确保安全性**
4. **记录测试结果，便于追踪和优化**

## 相关文档

- [机器人角色设计](./ROBOT_ROLE_DESIGN.md)
- [系统配置指南](./SYSTEM_CONFIG.md)
- [API 文档](./API.md)
