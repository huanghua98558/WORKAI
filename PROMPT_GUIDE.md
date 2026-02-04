# AI 服务提示词配置文档

## 📋 概述

本系统为每个AI服务类型提供了专业的默认提示词，确保AI能够准确识别意图、生成高质量回复、引导转化和生成报告。

---

## 🎯 AI服务类型及默认提示词

### 1. 意图识别 (intentRecognition)

**用途：** 识别用户消息的意图类型

**支持的意图类型：**
- `chat` - 闲聊/问候
- `service` - 服务咨询/问题求助
- `help` - 帮助请求/使用说明
- `risk` - 风险内容/敏感话题
- `spam` - 垃圾信息/广告/刷屏
- `welcome` - 欢迎语/新人打招呼
- `admin` - 管理指令/系统配置

**返回格式：**
```json
{
  "intent": "意图类型",
  "needReply": true/false,
  "needHuman": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}
```

**关键特性：**
- ✅ 详细的判断标准和特征关键词
- ✅ 判断优先级（risk > spam > admin > service > help > welcome > chat）
- ✅ 支持历史对话上下文
- ✅ 提供置信度和判断理由

**适用模型：** 豆包 Seed 1.6、DeepSeek R1 等

---

### 2. 服务回复 (serviceReply)

**用途：** 根据用户问题生成专业、友好、自然的客服回复

**回复风格：**
- **service/help/welcome** - 专业、详细、有耐心
- **chat** - 轻松、友好、简短
- **其他意图** - 礼貌、得体

**关键要求：**
- ✅ 适度使用表情符号（1-2个）
- ✅ 控制回复长度（闲聊50字以内，复杂问题200字以内）
- ✅ 根据意图类型调整回复风格
- ✅ 避免敏感词汇和不当内容

**适用模型：** 豆包 Seed 1.8、DeepSeek V3.2、Kimi K2 等

---

### 3. 转化客服 (conversion)

**用途：** 引导用户完成转化目标（购买、注册、咨询等）

**转化目标：**
- 产品/服务购买
- 表单填写/账号注册
- 活动报名/预约
- 咨询详情

**对话策略：**
1. **建立信任** - 友好开场，了解用户
2. **挖掘需求** - 开放性提问，深入挖掘
3. **价值展示** - 突出产品价值而非功能
4. **异议处理** - 理解疑虑，提供解决方案
5. **行动引导** - 适时提出明确的CTA

**关键要求：**
- ✅ 语气热情、专业、有说服力
- ✅ 控制在300字以内
- ✅ 不要过于强势或推销感太强
- ✅ 建立信任，避免引起反感

**适用模型：** 豆包 Seed 1.8、DeepSeek V3.2 等

---

### 4. 报告生成 (report)

**用途：** 根据数据分析生成日终总结报告

**报告结构：**
1. **标题** - 报告类型和时间范围
2. **概述** - 关键发现和整体评价
3. **关键指标** - 运营、用户、质量指标
4. **数据分析** - 趋势、问题、异常
5. **洞察和建议** - 关键洞察、改进建议、风险提示
6. **下一步行动** - 短期、中期、长期计划

**关键要求：**
- ✅ 数据驱动，客观准确
- ✅ 有洞察力，不只是描述数据
- ✅ 提供具体可行的建议
- ✅ 语言专业简洁

**适用模型：** DeepSeek V3.2、DeepSeek R1、Kimi K2 等

---

## 🔧 提示词配置方式

### 方式 1：使用默认提示词（推荐）

系统自动加载默认提示词，无需任何配置。

**优点：**
- ✅ 经过精心设计和测试
- ✅ 适应大多数场景
- ✅ 持续优化更新

**配置方法：**
在 `server/config/system.json` 中，确保不设置 `systemPrompt` 字段，或设置为空。

```json
{
  "ai": {
    "intentRecognition": {
      "useBuiltin": true,
      "builtinModelId": "doubao-seed-1-6-251015"
      // 不设置 systemPrompt，使用默认提示词
    }
  }
}
```

---

### 方式 2：自定义提示词

如果你需要针对特定场景优化提示词，可以在配置文件中自定义。

**配置方法：**
在 `server/config/system.json` 中添加 `systemPrompt` 字段。

```json
{
  "ai": {
    "serviceReply": {
      "useBuiltin": true,
      "builtinModelId": "doubao-seed-1-8-251228",
      "systemPrompt": "你是一个专业的客服助手，请用简洁、友好的语言回复用户..."
    }
  }
}
```

**注意事项：**
- ⚠️ 自定义提示词会影响所有使用该服务的对话
- ⚠️ 建议先在测试环境验证效果
- ⚠️ 保留原始提示词的副本，以便回退

---

### 方式 3：动态切换（高级）

通过代码动态为不同场景设置不同的提示词。

**示例：**
```javascript
// 获取AI服务实例
const aiService = new AIService();

// 获取客户端配置
const clientConfig = aiService.getClient('serviceReply');

// 临时修改提示词（仅当前会话有效）
clientConfig.systemPrompt = "你的自定义提示词...";

// 进行AI调用
const response = await clientConfig.client.invoke(messages, {
  model: clientConfig.modelId,
  temperature: clientConfig.temperature
});
```

---

## 📝 默认提示词文件

所有默认提示词存储在：`server/config/default-prompts.js`

**文件结构：**
```javascript
const DEFAULT_PROMPTS = {
  intentRecognition: `...`, // 意图识别提示词
  serviceReply: `...`,      // 服务回复提示词
  conversion: `...`,        // 转化客服提示词
  report: `...`             // 报告生成提示词
};

module.exports = DEFAULT_PROMPTS;
```

---

## 🎨 提示词设计原则

### 1. 意图识别
- ✅ 明确的定义和判断标准
- ✅ 特征关键词列表
- ✅ 优先级规则
- ✅ 示例和反例
- ✅ 严格的输出格式

### 2. 服务回复
- ✅ 明确的角色定位
- ✅ 不同场景的回复风格
- ✅ 长度和格式要求
- ✅ 禁止事项
- ✅ 情感表达

### 3. 转化客服
- ✅ 分阶段对话策略
- ✅ 转化目标明确
- ✅ 信任建立技巧
- ✅ 异议处理方法
- ✅ CTA引导技巧

### 4. 报告生成
- ✅ 标准报告结构
- ✅ 数据分析原则
- ✅ 洞察和建议要求
- ✅ 写作规范
- ✅ 可执行性标准

---

## 🧪 测试和验证

### 测试意图识别

```bash
curl -X POST http://localhost:5001/api/test/intent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "你好，请问怎么使用这个功能？"
  }'
```

### 测试服务回复

```bash
curl -X POST http://localhost:5001/api/test/reply \
  -H "Content-Type: application/json" \
  -d '{
    "message": "这个产品多少钱？",
    "intent": "service"
  }'
```

---

## 🚀 优化建议

### 意图识别优化

1. **添加历史对话** - 提高上下文理解能力
2. **调整置信度阈值** - 根据实际准确率调整
3. **扩展意图类型** - 根据业务需求添加新意图

### 服务回复优化

1. **个性化回复** - 根据用户画像调整风格
2. **多轮对话** - 支持连续对话和上下文
3. **知识库集成** - 结合FAQ知识库提供更准确的回复

### 转化客服优化

1. **用户分群** - 针对不同用户群体使用不同策略
2. **A/B测试** - 测试不同话术的转化效果
3. **数据分析** - 分析转化漏斗，优化关键节点

---

## 📚 参考资料

- [提示词工程指南](https://www.promptingguide.ai/)
- [OpenAI Prompt Engineering](https://platform.openai.com/docs/guides/prompt-engineering)
- [LangChain Prompts](https://python.langchain.com/docs/modules/model_io/prompts/)

---

## ❓ 常见问题

### Q1: 如何查看当前使用的提示词？

A: 查看 `server/config/system.json` 中的 `ai` 配置部分。

### Q2: 如何回退到默认提示词？

A: 删除或清空配置文件中的 `systemPrompt` 字段，系统将自动使用默认提示词。

### Q3: 如何为不同用户使用不同的提示词？

A: 可以通过代码动态修改 `clientConfig.systemPrompt`，实现个性化配置。

### Q4: 提示词太长会影响性能吗？

A: 会有一定影响，但现代大模型都能很好地处理长提示词。如果性能成为问题，可以考虑精简提示词。

---

## 📞 技术支持

如有问题或建议，请联系技术团队。
