# 图片识别功能加入后的完整影响分析

## 📊 总览

### 影响6个方面：
1. **流程修改**：5个流程中2个需要大幅修改，1个需要小幅修改
2. **系统功能**：4个模块需要新增/修改
3. **节点类型**：新增4个节点类型
4. **数据库**：新增3张表，修改2张表
5. **集成服务**：集成2个外部服务
6. **联动性**：4个主要联动点

---

## 🔄 第一部分：流程修改分析

### 流程1：智能客服流程 ⭐⭐⭐⭐⭐（需要大幅修改）

#### 原流程
```
MESSAGE_ENTRY → SESSION_CREATE → INTENT_RECOGNITION → EMOTION_ANALYZE → DECISION
    ↓
DECISION_NODE
    ├→ 群组消息 → GROUP_DISPATCH → MULTI_ROBOT → MESSAGE_SYNC → MESSAGE_EXIT
    ├→ 转化意图 → 触发转化客服流程
    ├→ 负面情绪/投诉 → STAFF_INTERVENTION → TASK_ASSIGN → SEND_COMMAND
    ├→ 风险内容 → RISK_HANDLER → ALERT_SAVE → ALERT_NOTIFY
    ├→ 正常咨询 → AI_REPLY → MESSAGE_DISPATCH → MESSAGE_EXIT
    └→ 会话结束 → SATISFACTION_INFER → SATISFACTION_DECISION
```

#### 修改后流程
```
MESSAGE_ENTRY → IMAGE_DETECT → DECISION
    ↓
DECISION_NODE（第一层：是否包含图片）
    ├→ 包含图片 → IMAGE_DOWNLOAD → IMAGE_RECOGNITION → CONTENT_ANALYSIS → SCENARIO_DECISION
    │   ↓
    │   SCENARIO_DECISION（第二层：基于图片场景）
    │       ├→ 视频号截图 → VIDEO_ACCOUNT_STATUS → AI_REPLY → MESSAGE_EXIT → FLOW_END
    │       ├→ 违规截图 → ACCOUNT_VIOLATION → AI_REPLY → MESSAGE_EXIT → FLOW_END
    │       ├→ 产品截图 → 识别产品 → 触发转化客服流程 → FLOW_END
    │       ├→ 订单截图 → ORDER_STATUS → AI_REPLY → MESSAGE_EXIT → FLOW_END
    │       └→ 其他图片 → GENERAL_IMAGE → AI_REPLY → MESSAGE_EXIT → FLOW_END
    │
    └→ 不含图片 → SESSION_CREATE → INTENT_RECOGNITION → 原有流程...
```

#### 需要修改的地方

**1. 消息接收节点修改**
```javascript
// 原有逻辑
const message = extractMessage(payload);
context.message = message;
context.hasImage = false;

// 修改后
const message = extractMessage(payload);
context.message = message;
context.hasImage = message.image ? true : false;
context.imageUrl = message.image?.url || null;
```

**2. 新增图片检测节点**
```json
{
  "type": "IMAGE_DETECT",
  "config": {
    "checkImage": true,
    "imageTypes": ["image", "picture", "photo"],
    "extractImageUrl": true
  }
}
```

**3. 新增决策节点（第一层）**
```json
{
  "type": "DECISION",
  "name": "图片检测决策",
  "config": {
    "conditions": [
      {
        "expression": "context.hasImage === true",
        "label": "包含图片",
        "targetNodeId": "node_image_download",
        "priority": 0
      },
      {
        "expression": "context.hasImage === false",
        "label": "不含图片",
        "targetNodeId": "node_session_create",
        "priority": 1
      }
    ]
  }
}
```

**4. 新增图片下载节点**
```json
{
  "type": "IMAGE_DOWNLOAD",
  "config": {
    "timeout": 30000,
    "maxFileSize": 10485760,
    "supportedFormats": ["jpg", "jpeg", "png", "bmp"],
    "retryCount": 3,
    "saveToStorage": true,
    "storageDuration": 604800000
  }
}
```

**5. 新增图片识别节点**
```json
{
  "type": "IMAGE_RECOGNITION",
  "config": {
    "enableGPT4V": true,
    "enableOCR": true,
    "ocrEngine": "aliyun_ocr",
    "gpt4vModel": "gpt-4-vision-preview",
    "mixedMode": true
  }
}
```

**6. 新增内容分析节点**
```json
{
  "type": "CONTENT_ANALYSIS",
  "config": {
    "scenarios": ["video_account", "account_violation", "product", "order", "payment"],
    "extractionRules": "config/image-recognition.json",
    "accuracy": "high"
  }
}
```

**7. 新增场景决策节点（第二层）**
```json
{
  "type": "DECISION",
  "name": "场景决策",
  "config": {
    "conditions": [
      {
        "expression": "context.scene === 'video_account'",
        "label": "视频号截图",
        "targetNodeId": "node_video_account_status"
      },
      {
        "expression": "context.scene === 'account_violation'",
        "label": "违规截图",
        "targetNodeId": "node_account_violation"
      },
      {
        "expression": "context.scene === 'product'",
        "label": "产品截图",
        "action": "trigger_flow",
        "flowId": "flow_conversion_service",
        "flowData": {
          "imageContext": "{{context.imageAnalysis}}"
        }
      },
      {
        "expression": "context.scene === 'order'",
        "label": "订单截图",
        "targetNodeId": "node_order_status"
      }
    ]
  }
}
```

**8. 新增视频号状态节点**
```json
{
  "type": "VIDEO_ACCOUNT_STATUS",
  "config": {
    "extractStatus": true,
    "extractStep": true,
    "extractError": true
  }
}
```

**9. 新增违规处理节点**
```json
{
  "type": "ACCOUNT_VIOLATION",
  "config": {
    "extractSeverity": true,
    "extractReason": true,
    "extractBanDays": true
  }
}
```

**10. 修改AI回复节点**
```javascript
// 原有逻辑
const reply = await generateAIReply(context.message, context.history);

// 修改后
const reply = await generateAIReply({
  message: context.message,
  imageContext: context.imageAnalysis,  // 新增：图片上下文
  scene: context.scene,                  // 新增：场景
  history: context.history
});
```

#### 影响程度：⭐⭐⭐⭐⭐（最大）

---

### 流程2：转化客服流程 ⭐⭐⭐⭐（需要大幅修改）

#### 原流程
```
START → CONVERSION_INTENT_DETECT → INTENT_SCORE_CALC → DECISION
    ↓
DECISION_NODE
    ├→ HIGH_INTENT → PRODUCT_RECOMMEND → LEAD_RECORD → SALES_ASSIGN → AI_REPLY → FLOW_END
    ├→ MEDIUM_INTENT → PRODUCT_INFO → AI_REPLY → LEAD_RECORD → FLOW_END
    └→ LOW_INTENT → AI_REPLY → FLOW_END
```

#### 修改后流程
```
START → INPUT_TYPE_DETECT → DECISION
    ↓
DECISION_NODE（第一层：输入类型）
    ├→ 包含图片 → IMAGE_DOWNLOAD → IMAGE_RECOGNITION → PRODUCT_ANALYSIS → INTENT_SCORE_CALC → 原有流程...
    │
    └→ 不含图片 → CONVERSION_INTENT_DETECT → INTENT_SCORE_CALC → 原有流程...
```

#### 需要修改的地方

**1. 新增输入类型检测节点**
```json
{
  "type": "INPUT_TYPE_DETECT",
  "config": {
    "checkImage": true,
    "checkText": true
  }
}
```

**2. 新增产品分析节点**
```json
{
  "type": "PRODUCT_ANALYSIS",
  "config": {
    "enableProductRecognition": true,
    "extractProductName": true,
    "extractSpecs": true,
    "extractPrice": true
  }
}
```

**3. 修改产品推荐节点**
```javascript
// 原有逻辑
const products = await recommendProducts(context.userHistory, context.intent);

// 修改后
const products = await recommendProducts({
  userHistory: context.userHistory,
  intent: context.intent,
  imageProduct: context.imageProduct  // 新增：图片识别的产品
});
```

**4. 修改商机记录节点**
```javascript
// 原有逻辑
await saveLead({
  userId: context.userId,
  intent: context.intent,
  score: context.leadScore
});

// 修改后
await saveLead({
  userId: context.userId,
  intent: context.intent,
  score: context.leadScore,
  imageProduct: context.imageProduct,  // 新增：图片识别的产品
  imageUrl: context.imageUrl          // 新增：原始图片URL
});
```

#### 影响程度：⭐⭐⭐⭐（较大）

---

### 流程3：风险监控与告警流程 ⭐（无需修改）

**原因**：
- 风险监控主要基于文字内容（敏感词、异常行为）
- 图片场景较少，当前不支持

#### 可选增强（如果需要）
```
如果需要监控图片中的风险内容：
START → MONITOR_NODE → IMAGE_DETECT → DECISION
    ↓
DECISION_NODE
    ├→ 包含图片 → IMAGE_RISK_DETECT → RISK_DECISION
    └→ 不含图片 → 原有流程
```

#### 影响程度：⭐（可选）

---

### 流程4：数据同步流程 ⭐（无需修改）

**原因**：
- 数据同步是后端数据流程
- 不涉及图片处理

#### 影响程度：⭐（无需修改）

---

### 流程5：监控与统计流程 ⭐⭐⭐（需要小幅修改）

#### 原流程
```
START → SYSTEM_MONITOR → STAFF_MONITOR → STATISTICS_CALC → DECISION
    ↓
DECISION_NODE
    ├→ NORMAL → LOG_SAVE → FLOW_END
    └→ ABNORMAL → LOG_SAVE → ALERT_SAVE → FLOW_END
```

#### 修改后流程
```
START → SYSTEM_MONITOR → IMAGE_MONITOR → STAFF_MONITOR → STATISTICS_CALC → DECISION
    ↓
DECISION_NODE
    ├→ NORMAL → LOG_SAVE → FLOW_END
    └→ ABNORMAL → LOG_SAVE → ALERT_SAVE → FLOW_END
```

#### 需要修改的地方

**新增图片监控指标**
```json
{
  "imageMonitor": {
    "metrics": [
      "image_recognition_total",
      "image_recognition_success",
      "image_recognition_failed",
      "image_recognition_avg_time",
      "gpt4v_usage",
      "ocr_usage",
      "scenario_distribution"
    ],
    "alertThresholds": {
      "recognition_failure_rate": 0.1,
      "avg_recognition_time": 5000,
      "gpt4v_daily_limit": 100
    }
  }
}
```

#### 影响程度：⭐⭐⭐（较小）

---

## 🔧 第二部分：系统功能修改分析

### 需要新增的服务（4个）

#### 1. 图片识别服务 ⭐⭐⭐⭐⭐
**文件**：`server/services/image-recognition.service.js`

**功能**：
- 下载图片
- OCR识别（阿里云）
- 场景识别（GPT-4V）
- 内容分析

**代码结构**：
```javascript
class ImageRecognitionService {
  async downloadImage(imageUrl)
  async recognizeWithOCR(imageBuffer)
  async recognizeWithGPT4V(imageUrl, prompt)
  async detectScene(ocrText, imageUrl)
  async analyzeContent(ocrText, scene, imageUrl)
}
```

#### 2. GPT-4V Vision服务 ⭐⭐⭐⭐⭐
**文件**：`server/services/gpt4v-vision.service.js`

**功能**：
- 调用OpenAI GPT-4V API
- 场景识别
- 结构化数据提取

**代码结构**：
```javascript
class GPT4VisionService {
  async analyzeImage(imageUrl, prompt)
  async recognizeVideoAccountStatus(imageUrl)
  async recognizeAccountViolation(imageUrl)
  async recognizeProduct(imageUrl)
}
```

#### 3. 阿里云OCR服务 ⭐⭐⭐⭐
**文件**：`server/services/aliyun-ocr.service.js`

**功能**：
- 调用阿里云OCR API
- 通用文字识别

**代码结构**：
```javascript
class AliyunOCRService {
  async recognizeText(imageBuffer)
}
```

#### 4. 消息队列服务 ⭐⭐⭐
**文件**：`server/services/message-queue.service.js`

**功能**：
- 图片识别任务队列
- 并发处理控制

**代码结构**：
```javascript
class MessageQueueService {
  async enqueue(task)
  async dequeue()
  async processConcurrently()
}
```

---

### 需要修改的服务（2个）

#### 1. 流程引擎服务 ⭐⭐⭐⭐⭐
**文件**：`server/services/flow-engine.service.js`

**修改内容**：
- 新增4个节点处理器
- 修改节点类型枚举

**新增节点类型**：
```javascript
const NodeType = {
  // 原有节点...
  IMAGE_DOWNLOAD: 'image_download',
  IMAGE_RECOGNITION: 'image_recognition',
  CONTENT_ANALYSIS: 'content_analysis',
  SCENARIO_DECISION: 'scenario_decision',
  VIDEO_ACCOUNT_STATUS: 'video_account_status',
  ACCOUNT_VIOLATION: 'account_violation',
  PRODUCT_ANALYSIS: 'product_analysis'
};
```

**新增节点处理器**：
```javascript
this.nodeHandlers = {
  // 原有处理器...
  [NodeType.IMAGE_DOWNLOAD]: this.handleImageDownloadNode.bind(this),
  [NodeType.IMAGE_RECOGNITION]: this.handleImageRecognitionNode.bind(this),
  [NodeType.CONTENT_ANALYSIS]: this.handleContentAnalysisNode.bind(this),
  [NodeType.PRODUCT_ANALYSIS]: this.handleProductAnalysisNode.bind(this)
};
```

#### 2. AI服务 ⭐⭐⭐⭐
**文件**：`server/services/ai.service.js`

**修改内容**：
- AI回复生成支持图片上下文

**修改前**：
```javascript
async generateReply(prompt, history) {
  const response = await this.callAI({ prompt, history });
  return response;
}
```

**修改后**：
```javascript
async generateReply(options) {
  const { prompt, history, imageContext, scene } = options;

  let enhancedPrompt = prompt;
  if (imageContext) {
    enhancedPrompt = this.buildPromptWithContext(prompt, imageContext, scene);
  }

  const response = await this.callAI({ prompt: enhancedPrompt, history });
  return response;
}
```

---

### 需要新增的配置文件（2个）

#### 1. 图片识别规则配置 ⭐⭐⭐⭐⭐
**文件**：`server/config/image-recognition.json`

**内容**：
```json
{
  "videoAccountRules": {
    "statusMap": {},
    "replyTemplates": {}
  },
  "accountViolationRules": {
    "severityMap": {},
    "replyTemplates": {}
  },
  "imageProcessing": {
    "maxFileSize": 10485760,
    "supportedFormats": ["jpg", "jpeg", "png", "bmp"],
    "downloadTimeout": 30000
  }
}
```

#### 2. 环境变量配置 ⭐⭐⭐⭐⭐
**文件**：`server/.env`

**新增配置**：
```env
# 阿里云OCR配置
ALIYUN_OCR_ACCESS_KEY_ID=your_access_key_id
ALIYUN_OCR_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_OCR_ENDPOINT=ocr.cn-shanghai.aliyuncs.com

# OpenAI API配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ENDPOINT=https://api.openai.com/v1

# GPT-4V Vision配置
GPT4V_MODEL=gpt-4-vision-preview
GPT4V_MAX_TOKENS=1000
GPT4V_TEMPERATURE=0.3

# 图片处理配置
IMAGE_MAX_SIZE=10485760
IMAGE_SUPPORTED_FORMATS=jpg,jpeg,png,bmp
IMAGE_DOWNLOAD_TIMEOUT=30000

# 并发处理配置
ENABLE_CONCURRENT_PROCESSING=true
MESSAGE_QUEUE_REDIS_URL=redis://localhost:6379
MAX_CONCURRENT_IMAGES=10
```

---

## 🗄️ 第三部分：数据库修改分析

### 需要新增的表（3张）

#### 1. 图片识别记录表 ⭐⭐⭐⭐⭐
**文件**：`server/database/schema.js`

```javascript
exports.imageRecognitionRecords = pgTable(
  "image_recognition_records",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 255 }),
    imageUrl: text("image_url").notNull(),
    scene: varchar("scene", { length: 50 }),  // video_account, account_violation, product等
    ocrText: text("ocr_text"),
    gpt4vResult: jsonb("gpt4v_result"),
    analysisResult: jsonb("analysis_result"),
    recognitionStatus: varchar("recognition_status", { length: 20 }).notNull(),  // success, failed, pending
    errorMessage: text("error_message"),
    processingTime: integer("processing_time"),  // 处理耗时（毫秒）
    recognitionMethod: varchar("recognition_method", { length: 20 }),  // ocr, gpt4v, mixed
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  }
);
```

#### 2. 商机记录表（扩展）⭐⭐⭐⭐
**修改**：增加图片相关字段

```javascript
exports.leads = pgTable(
  "leads",
  {
    // 原有字段...
    imageUrl: text("image_url"),  // 新增
    imageProductId: varchar("image_product_id", { length: 36 }),  // 新增
    imageProductName: varchar("image_product_name", { length: 255 })  // 新增
  }
);
```

#### 3. 图片存储记录表 ⭐⭐⭐
```javascript
exports.imageStorageRecords = pgTable(
  "image_storage_records",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    originalUrl: text("original_url").notNull(),
    storageUrl: text("storage_url"),
    storageBucket: varchar("storage_bucket", { length: 100 }),
    fileSize: integer("file_size"),
    fileFormat: varchar("file_format", { length: 10 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  }
);
```

---

## 🔗 第四部分：联动性分析

### 联动点1：消息接收 → 图片识别 → 场景决策 → AI回复

**联动流程**：
```
WorkTool消息 → 消息接收节点 → 检测到图片 → 图片下载 → 图片识别（GPT-4V + OCR）→ 内容分析 → 场景决策 → AI回复（基于图片上下文）
```

**关键数据流**：
```javascript
context.message = {
  type: 'image',
  url: 'https://worktool.com/image/xxx.jpg'
}
↓
context.imageUrl = 'https://worktool.com/image/xxx.jpg'
↓
context.ocrText = '视频号开通中...'
↓
context.scene = 'video_account'
↓
context.imageAnalysis = {
  status: '进行中',
  step: '身份认证',
  text: '视频号开通中...'
}
↓
context.aiReply = '您好，我看到您的视频号正在身份认证...'
```

**依赖关系**：
- 图片识别服务依赖：GPT-4V API、阿里云OCR API
- AI回复依赖：图片识别结果
- 场景决策依赖：内容分析结果

---

### 联动点2：智能客服 → 转化客服（产品图片）

**联动流程**：
```
智能客服流程 → 识别到产品截图 → 触发转化客服流程 → 产品分析 → 产品推荐 → 商机记录
```

**关键数据流**：
```javascript
// 智能客服流程
context.scene = 'product'
↓
context.imageAnalysis = {
  productName: 'iPhone 15 Pro',
  price: '7999元',
  specs: '256GB, 钛金属原色'
}
↓
// 触发转化客服流程
flowId: 'flow_conversion_service'
flowData: {
  imageContext: context.imageAnalysis
}
↓
// 转化客服流程接收
context.imageProduct = flowData.imageContext
↓
context.leadScore = 85  // 高意向
↓
context.products = recommendProducts(context.imageProduct)
```

**依赖关系**：
- 转化客服流程依赖：智能客服流程传递的图片上下文
- 产品推荐依赖：图片识别的产品信息

---

### 联动点3：图片识别 → 数据库 → 监控统计

**联动流程**：
```
图片识别完成 → 保存识别记录 → 监控流程读取统计 → 计算指标 → 生成报告
```

**关键数据流**：
```javascript
// 图片识别完成
const record = {
  sessionId: 'xxx',
  userId: 'user123',
  imageUrl: 'https://worktool.com/image/xxx.jpg',
  scene: 'video_account',
  recognitionStatus: 'success',
  processingTime: 3500
}
↓
// 保存到数据库
await db.insert(imageRecognitionRecords).values(record)
↓
// 监控流程读取
const stats = await db.select()
  .from(imageRecognitionRecords)
  .where(between(createdAt, startTime, endTime))
↓
// 计算指标
{
  total: 150,
  success: 142,
  failed: 8,
  successRate: 94.7%,
  avgTime: 3800
}
```

**依赖关系**：
- 监控流程依赖：图片识别记录表
- 统计分析依赖：识别记录数据

---

### 联动点4：图片识别 → 消息队列 → 并发处理

**联动流程**：
```
多个图片识别请求 → 加入消息队列 → 并发处理 → 返回结果
```

**关键数据流**：
```javascript
// 用户A发送图片
queue.enqueue({
  taskId: 'task_001',
  imageUrl: 'https://worktool.com/image/001.jpg',
  sessionId: 'session_001'
})

// 用户B发送图片
queue.enqueue({
  taskId: 'task_002',
  imageUrl: 'https://worktool.com/image/002.jpg',
  sessionId: 'session_002'
})

// 用户C发送图片
queue.enqueue({
  taskId: 'task_003',
  imageUrl: 'https://worktool.com/image/003.jpg',
  sessionId: 'session_003'
})

// 并发处理（最多10个同时进行）
queue.processConcurrently({ maxConcurrent: 10 })

// 结果返回
{
  task_001: { success: true, result: {...} },
  task_002: { success: true, result: {...} },
  task_003: { success: true, result: {...} }
}
```

**依赖关系**：
- 并发处理依赖：Redis消息队列
- 负载均衡依赖：队列处理器

---

## 📊 第五部分：完整影响矩阵

| 流程/功能 | 修改类型 | 影响程度 | 新增节点 | 修改节点 | 工作量 |
|---------|---------|---------|---------|---------|--------|
| 智能客服流程 | 大幅修改 | ⭐⭐⭐⭐⭐ | +7 | +3 | 2-3天 |
| 转化客服流程 | 大幅修改 | ⭐⭐⭐⭐ | +2 | +3 | 1-2天 |
| 风险监控流程 | 无需修改 | ⭐ | 0 | 0 | 0天 |
| 数据同步流程 | 无需修改 | ⭐ | 0 | 0 | 0天 |
| 监控统计流程 | 小幅修改 | ⭐⭐⭐ | +1 | 0 | 0.5天 |
| 图片识别服务 | 新增 | ⭐⭐⭐⭐⭐ | N/A | N/A | 1-2天 |
| GPT-4V服务 | 新增 | ⭐⭐⭐⭐⭐ | N/A | N/A | 1天 |
| 阿里云OCR服务 | 新增 | ⭐⭐⭐⭐ | N/A | N/A | 0.5天 |
| 消息队列服务 | 新增 | ⭐⭐⭐ | N/A | N/A | 0.5天 |
| 流程引擎服务 | 修改 | ⭐⭐⭐⭐⭐ | +4 | +1 | 1天 |
| AI服务 | 修改 | ⭐⭐⭐⭐ | 0 | +1 | 0.5天 |
| 数据库 | 新增/修改 | ⭐⭐⭐⭐⭐ | +3表 | +2表 | 0.5天 |
| 配置文件 | 新增 | ⭐⭐⭐⭐⭐ | +2文件 | +1文件 | 0.5天 |

---

## 🎯 总结

### 需要修改的流程
- **智能客服流程**：⭐⭐⭐⭐⭐（大幅修改，新增7个节点）
- **转化客服流程**：⭐⭐⭐⭐（大幅修改，新增2个节点）
- **监控统计流程**：⭐⭐⭐（小幅修改，新增图片监控指标）

### 需要新增的功能
- 图片识别服务
- GPT-4V Vision服务
- 阿里云OCR服务
- 消息队列服务

### 需要修改的功能
- 流程引擎服务（新增4个节点处理器）
- AI服务（支持图片上下文）

### 需要新增的节点类型（4个）
- IMAGE_DOWNLOAD
- IMAGE_RECOGNITION
- CONTENT_ANALYSIS
- PRODUCT_ANALYSIS

### 需要新增的数据库表（3张）
- image_recognition_records
- image_storage_records
- leads（扩展）

### 联动点（4个）
1. 消息接收 → 图片识别 → AI回复
2. 智能客服 → 转化客服（产品图片）
3. 图片识别 → 数据库 → 监控统计
4. 图片识别 → 消息队列 → 并发处理

### 总工作量
- **流程修改**：3.5-5.5天
- **服务开发**：3-4天
- **数据库修改**：0.5天
- **测试验证**：3-4天
- **总计**：10-14天

### 依赖的外部服务
- OpenAI GPT-4V API
- 阿里云OCR API
- Redis（消息队列）
