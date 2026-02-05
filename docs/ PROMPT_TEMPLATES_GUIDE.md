# 话术模板功能说明文档

## 概述

话术模板是WorkTool AI 2.1企业级机器人运营平台中的核心功能，用于预定义和管理不同场景下的AI回复话术。通过话术模板，可以统一回复风格、提高回复质量、降低运营成本。

---

## 1. 话术模板的类型

系统中有**两类话术模板**：

### 1.1 Prompt 模板表 (`prompt_templates`)

**用途**：定义不同AI操作类型的系统提示词（System Prompt）

**字段结构**：
```javascript
{
  id: varchar(255),              // 模板ID（主键）
  name: varchar(255),            // 模板名称
  type: varchar(50),             // 类型：intentRecognition, serviceReply, report
  description: text,             // 描述
  systemPrompt: text,            // 系统提示词（核心内容）
  variables: json,               // 支持的变量列表
  version: varchar(50),          // 版本号
  isActive: boolean,             // 是否启用
  createdAt: timestamp,          // 创建时间
  updatedAt: timestamp           // 更新时间
}
```

**类型说明**：
- `intentRecognition`：意图识别提示词 - 用于识别用户消息的意图类型
- `serviceReply`：服务回复提示词 - 用于生成客服回复
- `report`：报告生成提示词 - 用于生成日终总结报告

**当前使用情况**：
- ❌ **未直接使用**：目前系统使用 `server/config/default-prompts.js` 中的硬编码提示词
- ✅ **预留扩展**：数据库表已创建，可用于后续的自定义提示词管理

---

### 1.2 话术分类模板表 (`prompt_category_templates`)

**用途**：定义24类场景的回复话术模板

**字段结构**：
```javascript
{
  id: varchar(36),               // 模板ID（主键）
  category: varchar(50),         // 分类：24类场景之一
  categoryName: varchar(255),    // 分类名称
  template: text,                // 话术模板（核心内容）
  variables: json,               // 支持的变量列表
  examples: json,                // 示例列表
  isActive: boolean,             // 是否启用
  priority: integer,             // 优先级
  description: text,             // 描述
  createdAt: timestamp,          // 创建时间
  updatedAt: timestamp           // 更新时间
}
```

**当前数据示例**：
| category | category_name | description |
|----------|---------------|-------------|
| general | 其他通用 | 温馨提示 |
| after_sales | 售后咨询 | 售后完成通知 |
| faq | 常见问题 | FAQ分层次回答 |
| chatbot | 智能客服 | 查询结果回复 |
| welcome | 欢迎语 | 温馨型欢迎语 |
| welcome | 欢迎语 | 使命型欢迎语 |

**当前使用情况**：
- ❌ **未直接使用**：话术分类模板表有数据，但代码中未引用
- ✅ **预留扩展**：可用于后续的精细化话术管理

---

### 1.3 AI角色的systemPrompt字段

**用途**：AI角色配置中的系统提示词，用于定义角色的回复风格和能力

**字段位置**：`ai_roles.system_prompt`

**当前使用情况**：
- ❌ **未在AI服务中引用**：虽然字段存在，但AI服务（AIService）使用的是配置文件中的默认提示词
- ✅ **预留扩展**：可用于角色级别的个性化提示词

---

## 2. 话术模板的联动关系

### 2.1 当前系统中的提示词使用流程

```
用户发送消息
    ↓
消息处理服务 (message-processing.service.js)
    ↓
AI服务 (ai.service.js)
    ↓
默认提示词配置 (default-prompts.js)  ← 实际使用
    ↓
LLM API调用
```

**关键点**：
- ❌ **数据库中的话术模板表未被使用**
- ✅ **使用硬编码的提示词配置文件**

---

### 2.2 数据库表关系

```
ai_models (AI模型配置)
    ↓ modelId (关联)
ai_roles (AI角色配置)
    ↓ promptTemplateId (预留关联)
prompt_templates (Prompt模板)
    ↓
prompt_category_templates (话术分类模板)
```

**说明**：
- `ai_roles.prompt_template_id` 字段预留了与 `prompt_templates` 的关联
- `prompt_templates` 和 `prompt_category_templates` 是两个独立的模板系统
- 目前 `ai_roles` 中的 `prompt_template_id` 字段未被使用

---

## 3. 话术模板的使用场景

### 3.1 当前系统使用的提示词场景

#### 场景1：意图识别 (`intentRecognition`)

**使用位置**：
- 文件：`server/services/ai.service.js`
- 方法：`recognizeIntent()`
- 提示词来源：`server/config/default-prompts.js`

**提示词内容**：
- 定义7种意图类型：chat, service, help, risk, spam, welcome, admin
- 每种意图的判断标准和特征关键词
- 返回JSON格式：`{ intent, needReply, needHuman, confidence, reason }`

**调用流程**：
```
用户消息 → recognizeIntent() → 豆包/DeepSeek模型 → 返回意图类型
```

---

#### 场景2：服务回复 (`serviceReply`)

**使用位置**：
- 文件：`server/services/ai.service.js`
- 方法：`generateServiceReply()`
- 提示词来源：`server/config/default-prompts.js`

**提示词内容**：
- 定义专业客服的回复策略
- 根据意图类型调整风格（service/help/welcome/chat）
- 回复长度控制、表情符号使用、回复结构

**调用流程**：
```
用户问题 + 意图 → generateServiceReply() → 豆包模型 → 生成回复
```

**特殊用途**：
- **风险内容回复**（risk）：使用风险提示词
- **垃圾信息回复**（spam）：使用垃圾信息提示词

---

#### 场景3：转化客服回复 (`conversion`)

**使用位置**：
- 文件：`server/services/ai.service.js`
- 方法：`generateConversionReply()`
- 提示词来源：`server/config/default-prompts.js`

**提示词内容**：
- 定义转化客服专员的核心能力
- 转化目标：购买、表单填写、活动报名、咨询详情、充值
- 需求挖掘、价值展示、信任建立、行动引导策略

**调用流程**：
```
用户消息 + 转化模式 → generateConversionReply() → DeepSeek模型 → 生成转化回复
```

**触发条件**：
- 机器人开启 `conversionMode`
- 机器人分组为"营销"
- 机器人类型为"角色"

---

#### 场景4：报告生成 (`report`)

**使用位置**：
- 文件：`server/services/ai.service.js`
- 方法：`generateDailyReport()`
- 提示词来源：`server/config/default-prompts.js`

**提示词内容**：
- 定义日终总结报告的生成规则
- 数据分析、趋势总结、关键指标

**调用流程**：
```
日终数据 → generateDailyReport() → Kimi模型 → 生成报告
```

---

#### 场景5：特殊场景的提示词（代码中硬编码）

**使用位置**：
- 文件：`server/services/message-processing.service.js`
- 方法：`generateReplyWithPrompt()`

**硬编码的提示词类型**：

##### (1) 转化客服提示词 (`conversion`)
```javascript
`你是一个专业的转化客服专员，擅长通过对话引导用户完成转化目标。

核心目标：
- 引导用户购买产品/服务
- 引导用户填写表单/注册账号
- 引导用户参加活动/预约
- 引导用户咨询详情

回复策略：
1. 先了解用户需求和痛点
2. 针对性地介绍产品/服务的价值
3. 用利益点而非功能点打动用户
4. 适时提出行动号召（CTA）
5. 语气热情、专业、有说服力
6. 适度使用表情符号增加亲和力
7. 控制在 300 字以内，保持简洁有力`
```

##### (2) 风险内容提示词 (`risk`)
```javascript
`你是一个社群客服机器人。检测到用户发送了风险内容，需要：
1. 严肃提醒用户注意言辞
2. 说明社群规则
3. 告知已将此情况转交人工处理
请用专业、礼貌但坚定的语气回复。`
```

##### (3) 垃圾信息提示词 (`spam`)
```javascript
`你是一个社群客服机器人。检测到用户发送了垃圾信息或广告，需要：
1. 温和提醒用户遵守社群规则
2. 简要说明社群的核心价值
3. 引导用户进行有意义的交流
请用友好、引导性的语气回复。`
```

---

### 3.2 需要调用话术模板的板块

#### 板块1：消息处理主流程

**文件**：`server/services/message-processing.service.js`

**使用场景**：
- ✅ 意图识别
- ✅ 服务回复
- ✅ 风险内容回复（风险提示词）
- ✅ 垃圾信息回复（垃圾信息提示词）
- ✅ 转化客服回复（转化提示词）

**当前实现**：
- 使用硬编码提示词 + 默认配置文件

---

#### 板块2：AI服务层

**文件**：`server/services/ai.service.js`

**使用场景**：
- ✅ 意图识别（`intentRecognition`）
- ✅ 服务回复（`serviceReply`）
- ✅ 转化客服（`conversion`）
- ✅ 报告生成（`report`）

**当前实现**：
- 使用 `server/config/default-prompts.js` 中的默认提示词

---

#### 板块3：流程引擎（Flow Engine）

**文件**：`server/services/flow-engine.service.js`

**使用场景**：
- ⚠️ AI对话节点（可能需要自定义提示词）
- ⚠️ 意图识别节点（可能需要自定义提示词）

**当前实现**：
- 未明确引用话术模板
- 可扩展支持

---

#### 板块4：AI模块管理界面

**文件**：`src/components/ai-module.tsx`

**使用场景**：
- ✅ 话术模板管理（UI已实现）
- ✅ 模板创建、编辑、删除
- ✅ 模板分类和优先级管理

**当前实现**：
- UI功能完整
- 但与后端数据库表关联未完全激活

---

## 4. 话术模板与各板块的详细联动

### 4.1 与机器人管理的联动

```
机器人配置 (robots表)
    ↓
消息回调处理
    ↓
消息处理服务 (message-processing.service.js)
    ↓
判断机器人模式（转化客服/常规客服）
    ↓
选择对应的提示词
    ↓
生成回复
```

**关键逻辑**：
```javascript
// 检查是否为转化客服模式
const isConversionMode = robot && (
  robot.conversionMode ||
  robot.robotGroup === '营销' ||
  robot.robotType === '角色'
);

if (isConversionMode) {
  // 使用转化客服提示词
  const conversionReply = await this.generateReplyWithPrompt(
    intentResult, session, messageContext, processingId, robot, 'conversion'
  );
}
```

---

### 4.2 与AI角色的联动

**数据库关联**：
```javascript
// ai_roles 表
{
  id: 'role-id',
  name: '售后处理',
  systemPrompt: '...',  // 角色的系统提示词（未使用）
  promptTemplateId: 'template-id',  // 预留关联（未使用）
  modelId: 'model-id'
}

// prompt_templates 表（未使用）
{
  id: 'template-id',
  type: 'serviceReply',
  systemPrompt: '...'
}

// prompt_category_templates 表（未使用）
{
  id: 'template-id',
  category: 'after_sales',
  template: '...'
}
```

**当前问题**：
- `ai_roles.system_prompt` 字段存在但未被使用
- `ai_roles.prompt_template_id` 字段预留但未使用
- AI服务使用的是配置文件中的默认提示词

---

### 4.3 与意图配置的联动

```
意图配置 (intent_configs表)
    ↓
意图识别 (ai.service.js - recognizeIntent())
    ↓
返回意图类型 + 是否需要回复
    ↓
根据意图选择回复策略
    ↓
调用对应的服务回复方法
```

**意图与回复策略映射**：

| 意图类型 | 是否回复 | 回复策略 | 提示词类型 |
|---------|---------|---------|-----------|
| chat | ✅ 是 | 使用闲聊风格提示词 | serviceReply |
| service | ✅ 是 | 使用服务咨询风格提示词 | serviceReply |
| help | ✅ 是 | 使用帮助请求风格提示词 | serviceReply |
| risk | ❌ 否 | 先发送风险回复，再转人工 | risk（硬编码） |
| spam | ❌ 否 | 发送社群规矩回复 | spam（硬编码） |
| welcome | ✅ 是 | 使用欢迎风格提示词 | serviceReply |
| admin | ❌ 否 | 转人工处理 | - |

---

### 4.4 与告警系统的联动

```
消息处理
    ↓
意图识别
    ↓
触发告警检查 (alert-trigger.service.js)
    ↓
根据意图类型判断是否需要告警
    ↓
发送告警通知
    ↓
（可选）生成告警回复（使用风险提示词）
```

**告警触发条件**：
- 风险内容（risk）
- 垃圾信息（spam）
- 特定意图达到阈值

---

### 4.5 与会话管理的联动

```
消息处理
    ↓
会话管理 (session.service.js)
    ↓
保存对话历史
    ↓
AI服务使用历史上下文生成回复
    ↓
更新会话状态
```

**会话上下文作用**：
- 提高回复的连贯性
- 记忆用户的需求
- 支持多轮对话

---

## 5. 当前问题与改进建议

### 5.1 当前存在的问题

#### 问题1：话术模板表未被使用
- `prompt_templates` 和 `prompt_category_templates` 表有数据但未被引用
- AI服务使用硬编码的配置文件

#### 问题2：AI角色的提示词未被使用
- `ai_roles.system_prompt` 字段存在但未被使用
- 无法实现角色级别的个性化提示词

#### 问题3：缺少动态提示词加载机制
- 修改提示词需要重启服务
- 无法通过UI界面实时更新提示词

#### 问题4：提示词版本管理缺失
- 虽然有 `ai_role_versions` 表，但未实现版本管理
- 无法追溯提示词变更历史

---

### 5.2 改进建议

#### 建议1：激活数据库话术模板

**实现方案**：

1. **修改 AI 服务初始化逻辑**
```javascript
// 修改前
clientConfig.systemPrompt = this.getDefaultSystemPrompt(provider);

// 修改后
const role = await db.select().from(aiRoles).where(eq(aiRoles.id, roleId));
clientConfig.systemPrompt = role?.systemPrompt || this.getDefaultSystemPrompt(provider);
```

2. **支持话术分类模板引用**
```javascript
// 根据场景选择话术模板
const template = await db.select().from(promptCategoryTemplates)
  .where(eq(promptCategoryTemplates.category, intentType));

const systemPrompt = template?.template || defaultPrompt;
```

---

#### 建议2：实现提示词热更新

**实现方案**：
1. 添加提示词缓存机制（Redis）
2. 提供提示词刷新接口
3. 定期从数据库加载最新提示词

```javascript
class PromptCache {
  constructor() {
    this.cache = new Map();
  }

  async getPrompt(type, roleId) {
    const cacheKey = `${type}:${roleId}`;

    // 先从缓存获取
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 从数据库加载
    const role = await db.select().from(aiRoles).where(eq(aiRoles.id, roleId));
    const prompt = role?.systemPrompt || defaultPrompts[type];

    // 缓存
    this.cache.set(cacheKey, prompt);
    return prompt;
  }

  async refresh(type, roleId) {
    this.cache.delete(`${type}:${roleId}`);
    return this.getPrompt(type, roleId);
  }
}
```

---

#### 建议3：实现提示词版本管理

**实现方案**：
1. 在修改 `ai_roles` 时自动创建版本记录
2. 支持版本回滚
3. 支持版本对比

```javascript
async updateRolePrompt(roleId, newPrompt, changeReason) {
  const db = await getDb();

  // 1. 保存当前版本
  const currentRole = await db.select().from(aiRoles).where(eq(aiRoles.id, roleId)).limit(1);
  await db.insert(aiRoleVersions).values({
    roleId,
    version: currentRole.currentVersion,
    systemPrompt: currentRole.systemPrompt,
    temperature: currentRole.temperature,
    maxTokens: currentRole.maxTokens,
    modelId: currentRole.modelId,
    changeReason
  });

  // 2. 更新角色
  const newVersion = incrementVersion(currentRole.currentVersion);
  await db.update(aiRoles)
    .set({
      systemPrompt: newPrompt,
      currentVersion: newVersion,
      updatedAt: new Date()
    })
    .where(eq(aiRoles.id, roleId));

  // 3. 清除缓存
  await promptCache.refresh('serviceReply', roleId);
}
```

---

#### 建议4：支持变量替换

**实现方案**：
```javascript
function renderTemplate(template, variables) {
  let result = template;

  // 替换变量 {{variableName}}
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return result;
}

// 使用示例
const template = "你好，{{userName}}！欢迎来到{{groupName}}。";
const rendered = renderTemplate(template, {
  userName: "张三",
  groupName: "产品交流群"
});
// 结果："你好，张三！欢迎来到产品交流群。"
```

---

#### 建议5：支持A/B测试

**实现方案**：
1. 为同一场景配置多个提示词版本
2. 根据用户ID或会话ID选择不同版本
3. 记录各版本的效果数据

```javascript
class PromptABTest {
  async getPrompt(type, context) {
    const userId = context.userId;
    const hash = hashString(userId);

    // 根据hash值选择版本
    const variants = await db.select().from(promptTemplates)
      .where(eq(promptTemplates.type, type));

    const variantIndex = hash % variants.length;
    return variants[variantIndex].systemPrompt;
  }
}
```

---

## 6. 话术模板的最佳实践

### 6.1 提示词编写原则

1. **明确角色定位**
```
❌ 坏示例：
"回答用户问题"

✅ 好示例：
"你是一个专业的企业微信群客服助手。你的职责是根据用户的问题和意图，生成专业、友好、自然的回复。"
```

2. **提供具体示例**
```
❌ 坏示例：
"回复要友好"

✅ 好示例：
"示例回复：
用户：请问怎么使用这个功能？
回复：您好！这个功能的使用方法很简单：
1. 点击右上角的【设置】按钮
2. 选择【功能管理】
3. 找到该功能点击【开启】即可
如有其他问题，随时问我哦！😊"
```

3. **明确边界条件**
```
❌ 坏示例：
"回答用户的问题"

✅ 好示例：
"回答用户的问题，但注意：
- 不确定的问题请诚实表示
- 需要人工介入时请引导用户联系人工客服
- 敏感话题请礼貌转移"
```

4. **控制回复长度**
```
❌ 坏示例：
"生成回复"

✅ 好示例：
"回复长度控制：
- 闲聊：50字以内
- 简单问题：100字以内
- 复杂问题：200字以内，分点说明"
```

---

### 6.2 变量命名规范

```
用户相关：
{{userName}} - 用户名称
{{userId}} - 用户ID

群组相关：
{{groupName}} - 群组名称
{{groupId}} - 群组ID

机器人相关：
{{robotName}} - 机器人名称
{{robotId}} - 机器人ID

业务相关：
{{productName}} - 产品名称
{{orderNumber}} - 订单号
{{price}} - 价格
```

---

### 6.3 模板分类建议

```
按场景分类：
- 欢迎语（welcome）
- 常见问题（faq）
- 售后咨询（after_sales）
- 转化客服（conversion）
- 风险处理（risk）
- 垃圾信息（spam）

按风格分类：
- 温馨型（warm）
- 专业型（professional）
- 简洁型（concise）
- 幽默型（humorous）
```

---

## 7. 总结

### 话术模板的核心作用

1. **统一回复风格**：确保所有回复保持一致的专业性和友好性
2. **提高回复质量**：通过精心设计的提示词提高AI回复的准确性和针对性
3. **降低运营成本**：减少人工客服的工作量，提高自动化水平
4. **支持快速迭代**：通过修改提示词快速调整回复策略
5. **实现个性化**：根据不同场景和角色使用不同的话术

### 联动关系总结

```
机器人配置 → 消息处理 → 意图识别 → 选择提示词 → AI生成回复
     ↓            ↓            ↓            ↓            ↓
   转化模式     告警触发    7种意图    5种提示词    豆包/DeepSeek/Kimi
```

### 需要调用话术模板的板块

1. ✅ **消息处理服务**：意图识别、服务回复、风险回复、垃圾回复
2. ✅ **AI服务层**：intentRecognition, serviceReply, conversion, report
3. ⚠️ **流程引擎**：AI对话节点、意图识别节点（待扩展）
4. ✅ **AI模块界面**：话术模板管理（UI已实现）

### 当前状态

- ✅ **提示词功能完整**：支持5种核心场景
- ❌ **数据库模板未使用**：提示词存储在配置文件中
- ⚠️ **角色个性化未实现**：`ai_roles.system_prompt` 未被使用
- ⚠️ **版本管理未实现**：虽有表但未实现版本控制

### 改进优先级

1. **高优先级**：激活数据库话术模板，支持动态加载
2. **中优先级**：实现提示词热更新和缓存机制
3. **中优先级**：支持变量替换和模板渲染
4. **低优先级**：实现A/B测试和版本管理
