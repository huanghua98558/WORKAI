# AI模型管理 - 内置模型使用指南

## 📦 内置模型列表

系统已预置6个AI模型，涵盖不同的应用场景：

| 模型名称 | 提供商 | 模型ID | 类型 | 说明 |
|---------|--------|--------|------|------|
| 豆包Pro 4K（意图识别） | doubao | ep-20241201163431-5bwhr | intent | 轻量快速，专门用于用户意图识别 |
| 豆包Pro 32K（服务回复） | doubao | ep-20250110120711-kn9p6 | chat | 大上下文，用于智能回复生成 |
| DeepSeek V3（转化客服） | deepseek | deepseek-v3 | chat | 强推理能力，用于转化客服场景 |
| Kimi K2（报告生成） | kimi | moonshot-v1-128k | chat | 长文本处理，用于报告生成 |
| DeepSeek R1（技术支持） | deepseek | deepseek-r1 | reasoning | 推理能力强，用于技术支持 |
| 测试模型V3 | doubao | test-model-v3-001 | chat | 测试用模型 |

## 🚀 使用内置模型

### 方式1：根据模型ID/名称创建服务（推荐）

```javascript
const AIServiceFactory = require('./services/ai/AIServiceFactory');

// 方式A：使用数据库中的模型ID
const service1 = await AIServiceFactory.createServiceByModelId('45d2b7c7-40ef-4f1e-bed8-c133168f8255');

// 方式B：使用模型名称
const service2 = await AIServiceFactory.createServiceByModelId('doubao-pro-4k-intent');

// 使用服务
const result = await service1.recognizeIntent('用户输入文本', { sessionId: 'xxx' });
```

### 方式2：根据类型自动选择最佳模型

```javascript
const AIServiceFactory = require('./services/ai/AIServiceFactory');

// 意图识别 - 自动选择豆包Pro 4K
const intentService = await AIServiceFactory.createServiceByType('intent');
const intent = await intentService.recognizeIntent('用户输入', { sessionId: 'xxx' });

// 智能回复 - 自动选择豆包Pro 32K
const chatService = await AIServiceFactory.createServiceByType('chat');
const reply = await chatService.generateReply('用户输入', {
  sessionId: 'xxx',
  operationType: 'service'
});
```

### 方式3：手动指定完整配置（原有方式）

```javascript
const AIServiceFactory = require('./services/ai/AIServiceFactory');

const service = AIServiceFactory.createService({
  provider: 'doubao',
  modelId: 'ep-20241201163431-5bwhr',
  modelIdStr: '45d2b7c7-40ef-4f1e-bed8-c133168f8255',
  providerId: 'xxx',
  apiKey: 'your-api-key',
  apiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
  temperature: 0.7,
  maxTokens: 2000
});
```

## ⚙️ 配置提供商API Key

内置模型已预置，但需要配置提供商的API Key才能正常使用。

### 方式1：通过前端界面配置

1. 访问 AI 模块 → API Key 管理
2. 选择要配置的提供商（豆包、DeepSeek、Kimi）
3. 输入 API Key 和 API Endpoint
4. 点击"测试验证"
5. 保存配置

### 方式2：通过API配置

```bash
# 配置豆包API Key
curl -X PUT http://localhost:5001/api/ai/providers/{provider-id} \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-doubao-api-key",
    "apiEndpoint": "https://ark.cn-beijing.volces.com/api/v3"
  }'

# 配置DeepSeek API Key
curl -X PUT http://localhost:5001/api/ai/providers/{provider-id} \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-deepseek-api-key",
    "apiEndpoint": "https://api.deepseek.com"
  }'

# 配置Kimi API Key
curl -X PUT http://localhost:5001/api/ai/providers/{provider-id} \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-kimi-api-key",
    "apiEndpoint": "https://api.moonshot.cn"
  }'
```

### 方式3：使用快速配置脚本

```bash
# 运行配置脚本
bash scripts/config-api-key.sh
```

## 🧪 测试模型配置

### 健康检查API

```bash
# 检查指定模型的健康状态
curl -X POST http://localhost:5001/api/ai/models/{model-id}/health-check
```

### 测试AI调用

```bash
# 测试意图识别
curl -X POST http://localhost:5001/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "45d2b7c7-40ef-4f1e-bed8-c133168f8255",
    "input": "我想查询订单状态",
    "type": "intent"
  }'

# 测试智能回复
curl -X POST http://localhost:5001/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "f038886b-d042-4aca-9a6f-d1b3049290cc",
    "input": "你好，请帮我查询订单",
    "type": "chat"
  }'
```

## 📊 模型选择建议

| 场景 | 推荐模型 | 理由 |
|------|---------|------|
| 意图识别 | 豆包Pro 4K | 轻量快速，响应速度快 |
| 智能回复 | 豆包Pro 32K | 大上下文，支持长对话 |
| 转化客服 | DeepSeek V3 | 强推理能力，理解复杂需求 |
| 技术支持 | DeepSeek R1 | 推理能力强，适合技术问题 |
| 报告生成 | Kimi K2 | 128K上下文，支持超长文本 |

## 🔍 查看内置模型

```bash
# 获取所有模型列表
curl http://localhost:5001/api/ai/models

# 获取指定模型详情
curl http://localhost:5001/api/ai/models/{model-id}
```

## ❓ 常见问题

**Q: 为什么内置模型无法使用？**
A: 内置模型数据已存在，但需要配置提供商的API Key才能调用。请按照上述方法配置API Key。

**Q: 如何查看某个模型对应的提供商？**
A: 调用 `/api/ai/models` API，返回数据中包含 `providerName` 和 `providerId`。

**Q: 可以添加新的模型吗？**
A: 可以，通过 `/api/ai/models` POST 接口创建新模型，或通过前端界面添加。

**Q: 如何修改内置模型的配置？**
A: 通过 `/api/ai/models/{id}` PUT 接口修改，或通过前端界面编辑。

**Q: 模型的优先级是什么？**
A: 优先级用于自动选择模型时决定顺序。数字越小优先级越高。意图识别模型优先级最高（1-10），聊天模型次之（11-20），推理模型（21-30），报告生成模型（31-40）。
