# 图片识别功能优化方案（基于图片URL）

## 📊 需求概述

### 图片来源
- 图片由WorkTool机器人上传到WorkTool服务器
- 系统接收到的是图片URL（WorkTool服务器链接）
- 不需要上传图片，只需通过URL访问

### 业务场景
1. **开通视频号截图** - 识别开通状态，给出开通指导
2. **账号违规/封禁截图** - 识别违规情况，提供解封方法
3. **产品截图** - 识别产品信息，推荐相关产品
4. **订单截图** - 识别订单状态，提供帮助
5. **付款截图** - 确认付款，更新订单

---

## 🎯 流程优化设计

### 智能客服流程（增强版）

```
MESSAGE_ENTRY → IMAGE_DETECT → DECISION
    ↓
DECISION_NODE
    ├→ 包含图片 → IMAGE_DOWNLOAD → IMAGE_RECOGNITION → CONTENT_ANALYSIS → SCENARIO_DECISION
    │   ↓
    │   SCENARIO_DECISION（基于图片内容）
    │       ├→ 视频号截图 → VIDEO_ACCOUNT_STATUS → AI_REPLY → FLOW_END
    │       ├→ 违规截图 → ACCOUNT_VIOLATION → AI_REPLY → FLOW_END
    │       ├→ 产品截图 → PRODUCT_INFO → AI_REPLY → FLOW_END
    │       └→ 其他图片 → GENERAL_IMAGE → AI_REPLY → FLOW_END
    │
    └→ 不含图片 → SESSION_CREATE → INTENT_RECOGNITION → 原有流程...
```

---

## 🔧 系统功能调整

### 1. 新增图片识别服务

**文件**：`server/services/image-recognition.service.js`

```javascript
class ImageRecognitionService {
  // 下载图片
  async downloadImage(imageUrl) {
    // 从WorkTool服务器下载图片
    // 返回：图片Buffer或临时路径
  }

  // OCR识别
  async recognizeImage(imageBuffer, imageUrl) {
    // 调用腾讯云OCR
    // 返回识别的文字内容
  }

  // 场景识别
  async detectScene(ocrText, imageUrl) {
    // 基于OCR内容识别场景
    // 返回：video_account, account_violation, product, order等
  }

  // 内容分析
  async analyzeContent(ocrText, scene) {
    // 基于场景提取关键信息
    // 返回：结构化的业务数据
  }
}
```

### 2. 新增图片识别规则配置

**文件**：`server/config/image-recognition.json`

```json
{
  "videoAccountRules": {
    "statusMap": {
      "未开通": ["未开始", "尚未开通", "未认证"],
      "进行中": ["认证中", "审核中", "绑定中", "提交资料"],
      "已完成": ["已开通", "认证成功", "已绑定"],
      "失败": ["认证失败", "审核不通过", "被拒绝"]
    },
    "replyTemplates": {
      "未开通": "您好，我看到您还没有开通视频号。开通视频号需要以下步骤：1. 进入微信 → 2. 点击发现 → 3. 视频号 → 4. 发起创建。如果您遇到问题，可以随时问我。",
      "进行中": "您好，我看到您的视频号正在{{step}}。这一步通常需要{{estimatedTime}}。请耐心等待，如果超过时间仍未完成，可以联系客服。",
      "已完成": "恭喜您！视频号已开通成功。接下来您可以开始创作内容了。需要我帮您了解视频号的使用方法吗？",
      "失败": "您好，很抱歉您的视频号开通失败了。失败原因：{{error}}。您可以尝试重新开通，或者联系客服协助处理。"
    }
  },
  "accountViolationRules": {
    "severityMap": {
      "轻微": ["警告", "提醒", "违规通知"],
      "严重": ["封禁", "冻结", "处罚", "禁言"],
      "永久": ["永久封禁", "永久冻结", "永久禁言"]
    },
    "replyTemplates": {
      "轻微": "您好，我看到您的账号收到违规警告。这是{{reason}}导致的。建议您：1. 检查内容是否违规 2. 修改相关内容 3. 避免再次发生。",
      "严重": "您好，您的账号已被封禁{{days}}天。原因是{{reason}}。解封方法：{{solution}}。如果需要申诉，请准备相关材料。",
      "永久": "您好，您的账号已被永久封禁。原因是{{reason}}。如需申诉，请：1. 收集证据 2. 提交申诉材料 3. 等待审核（通常7-15个工作日）。"
    }
  },
  "imageProcessing": {
    "maxFileSize": 10485760,
    "supportedFormats": ["jpg", "jpeg", "png", "bmp"],
    "downloadTimeout": 30000,
    "ocrTimeout": 10000
  }
}
```

### 3. 新增节点类型

#### 图片下载节点
```json
{
  "type": "IMAGE_DOWNLOAD",
  "config": {
    "timeout": 30000,
    "maxFileSize": 10485760,
    "supportedFormats": ["jpg", "jpeg", "png", "bmp"],
    "retryCount": 3
  }
}
```

#### 图片识别节点
```json
{
  "type": "IMAGE_RECOGNITION",
  "config": {
    "enableOCR": true,
    "ocrEngine": "tencent_ocr",
    "saveToStorage": false  // 默认不保存到对象存储
  }
}
```

#### 内容分析节点
```json
{
  "type": "CONTENT_ANALYSIS",
  "config": {
    "scenarios": ["video_account", "account_violation", "product", "order"],
    "extractionRules": "config/image-recognition.json"
  }
}
```

---

## 📋 功能调整清单

### 需要新增的功能（4项）

| 功能 | 文件 | 优先级 |
|-----|------|--------|
| 图片识别服务 | `server/services/image-recognition.service.js` | ⭐⭐⭐⭐⭐ |
| 图片识别规则配置 | `server/config/image-recognition.json` | ⭐⭐⭐⭐ |
| 图片下载节点 | 节点类型定义 | ⭐⭐⭐⭐⭐ |
| 内容分析节点 | 节点类型定义 | ⭐⭐⭐⭐ |

### 需要修改的功能（4项）

| 功能 | 修改内容 | 优先级 |
|-----|---------|--------|
| 消息接收节点 | 提取图片URL | ⭐⭐⭐⭐⭐ |
| 智能客服流程 | 增加图片识别分支 | ⭐⭐⭐⭐⭐ |
| 转化客服流程 | 增加图片识别分支 | ⭐⭐⭐⭐ |
| AI回复节点 | 支持基于图片内容的回复模板 | ⭐⭐⭐⭐ |

### 不需要的功能（1项）

| 功能 | 原因 |
|-----|------|
| 对象存储集成 | 图片已在WorkTool服务器，无需上传存储 |

---

## 🔧 详细实现

### 1. 消息接收节点（修改）

**原有功能**：
- 文本消息接收
- 消息保存
- 消息解析

**新增功能**：
- 图片URL提取
- 图片类型检测

**实现逻辑**：
```javascript
// 在消息接收节点中
if (message.image) {
  context.imageUrl = message.image.url;
  context.hasImage = true;
  context.imageType = message.image.type;
}
```

### 2. 图片下载节点（新增）

**功能**：
- 从WorkTool服务器下载图片
- 验证图片格式和大小
- 转换为Buffer供OCR使用
- 下载失败重试

**实现逻辑**：
```javascript
async handleImageDownloadNode(context) {
  const imageUrl = context.imageUrl;

  // 下载图片
  const imageBuffer = await this.downloadImage(imageUrl);

  // 验证图片
  const validation = await this.validateImage(imageBuffer);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 保存到上下文
  context.imageBuffer = imageBuffer;
  context.imageFormat = validation.format;

  return context;
}

async downloadImage(imageUrl) {
  const response = await fetch(imageUrl, {
    timeout: 30000
  });

  if (!response.ok) {
    throw new Error('图片下载失败');
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

async validateImage(buffer) {
  // 验证文件大小
  if (buffer.length > 10485760) {  // 10MB
    return { valid: false, error: '图片大小超过限制' };
  }

  // 验证文件格式
  const format = this.detectImageFormat(buffer);
  if (!['jpg', 'jpeg', 'png', 'bmp'].includes(format)) {
    return { valid: false, error: '不支持的图片格式' };
  }

  return { valid: true, format };
}
```

### 3. 图片识别节点（新增）

**功能**：
- 调用腾讯云OCR识别图片文字
- 返回识别结果

**实现逻辑**：
```javascript
async handleImageRecognitionNode(context) {
  const imageBuffer = context.imageBuffer;
  const imageUrl = context.imageUrl;

  // 调用OCR识别
  const ocrResult = await this.imageRecognitionService.recognizeImage(
    imageBuffer,
    imageUrl
  );

  // 保存识别结果
  context.ocrText = ocrResult.text;
  context.ocrConfidence = ocrResult.confidence;

  return context;
}
```

### 4. 内容分析节点（新增）

**功能**：
- 基于OCR内容识别场景
- 提取关键信息
- 返回结构化数据

**实现逻辑**：
```javascript
async handleContentAnalysisNode(context) {
  const ocrText = context.ocrText;
  const imageUrl = context.imageUrl;

  // 识别场景
  const scene = await this.imageRecognitionService.detectScene(
    ocrText,
    imageUrl
  );

  // 分析内容
  const analysis = await this.imageRecognitionService.analyzeContent(
    ocrText,
    scene
  );

  // 保存结果
  context.scene = scene;
  context.imageAnalysis = analysis;

  return context;
}
```

### 5. 场景决策节点（修改）

**新增条件**：
```json
{
  "conditions": [
    {
      "expression": "context.hasImage === true",
      "label": "包含图片",
      "targetNodeId": "node_image_download",
      "priority": 0
    },
    {
      "expression": "context.scene === 'video_account'",
      "label": "视频号截图",
      "targetNodeId": "node_video_account"
    },
    {
      "expression": "context.scene === 'account_violation'",
      "label": "违规截图",
      "targetNodeId": "node_account_violation"
    },
    {
      "expression": "context.scene === 'product'",
      "label": "产品截图",
      "targetNodeId": "node_product"
    }
  ]
}
```

---

## 🚀 实施步骤

### 阶段一：基础能力建设（2-3天）
1. 开发图片识别服务（OCR + 场景识别 + 内容分析）
2. 创建识别规则配置文件
3. 测试OCR识别准确性

### 阶段二：流程节点开发（2-3天）
1. 开发图片下载节点
2. 开发图片识别节点
3. 开发内容分析节点
4. 修改消息接收节点（提取图片URL）

### 阶段三：流程集成（2-3天）
1. 更新智能客服流程（增加图片识别分支）
2. 更新转化客服流程（增加图片识别分支）
3. 配置各场景的回复模板

### 阶段四：测试验证（2-3天）
1. 功能测试（识别准确性）
2. 性能测试（处理速度）
3. 用户验收测试

**总周期**：**8-12天**

---

## 💰 成本预估

| 服务 | 费用 | 说明 |
|-----|------|------|
| 腾讯云OCR | 0.01元/次 | 通用印刷体识别 |
| GPT-4V Vision | 0.03元/次 | 高级内容理解（可选） |
| 下载流量 | ≈0元 | WorkTool服务器流量 |

**预估成本**：
- 每天100张图片识别：OCR 1元 + Vision 3元 = **4元/天**
- 每月成本：约 **120元**

**成本优化**：
- 如果不需要高级内容理解，只使用OCR，成本可降至 **30元/月**

---

## 📄 需要创建的文件

### 1. 图片识别服务
**文件**：`server/services/image-recognition.service.js`

```javascript
class ImageRecognitionService {
  // 下载图片
  async downloadImage(imageUrl)
  
  // OCR识别
  async recognizeImage(imageBuffer, imageUrl)
  
  // 场景识别
  async detectScene(ocrText, imageUrl)
  
  // 内容分析
  async analyzeContent(ocrText, scene)
}
```

### 2. 图片识别规则配置
**文件**：`server/config/image-recognition.json`

包含视频号、违规等场景的识别规则和回复模板。

### 3. 流程节点定义
在流程引擎服务中新增：
- `IMAGE_DOWNLOAD` - 图片下载节点
- `IMAGE_RECOGNITION` - 图片识别节点
- `CONTENT_ANALYSIS` - 内容分析节点

---

## 🎯 优化总结

### 简化点

| 原方案 | 新方案 | 优势 |
|-------|-------|------|
| 需要对象存储集成 | ❌ 不需要 | 减少系统复杂度 |
| 图片上传 | ❌ 不需要 | 减少上传时间和流量 |
| 图片存储成本 | ❌ 无存储成本 | 降低成本 |

### 流程简化

**原流程**：
```
消息接收 → 图片检测 → 图片上传 → OCR识别 → 内容分析
```

**新流程**：
```
消息接收 → 图片检测 → 图片下载 → OCR识别 → 内容分析
```

### 实施周期缩短

- 原方案：9-13天
- 新方案：8-12天（减少1天）
