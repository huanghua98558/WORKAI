# 图片识别功能优化方案

## 📊 需求概述

### 业务场景
1. **开通视频号截图** - 识别开通状态，给出开通指导
2. **账号违规/封禁截图** - 识别违规情况，提供解封方法
3. **产品截图** - 识别产品信息，推荐相关产品
4. **订单截图** - 识别订单状态，提供帮助
5. **付款截图** - 确认付款，更新订单

### 技术需求
- 图片接收和存储
- OCR文字识别
- 场景识别（视频号/违规/产品/订单等）
- 内容理解
- 基于图片内容的智能决策

---

## 🎯 流程优化设计

### 智能客服流程（增强版）

```
MESSAGE_ENTRY → IMAGE_DETECT → DECISION
    ↓
DECISION_NODE
    ├→ 包含图片 → IMAGE_RECOGNITION → CONTENT_ANALYSIS → SCENARIO_DECISION
    │   ↓
    │   SCENARIO_DECISION
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
  // OCR识别
  async recognizeImage(imageUrl) {
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

  // 保存图片
  async saveImage(imageUrl) {
    // 下载并保存到对象存储
    // 返回：存储URL
  }
}
```

### 2. 新增图片识别规则配置

**文件**：`server/config/image-recognition.json`

```json
{
  "videoAccountRules": {
    "statusMap": {
      "未开通": ["未开始", "尚未开通"],
      "进行中": ["认证中", "审核中", "绑定中"],
      "已完成": ["已开通", "认证成功", "已绑定"],
      "失败": ["认证失败", "审核不通过"]
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
      "轻微": ["警告", "提醒"],
      "严重": ["封禁", "冻结", "处罚"],
      "永久": ["永久封禁", "永久冻结"]
    },
    "replyTemplates": {
      "轻微": "您好，我看到您的账号收到违规警告。这是{{reason}}导致的。建议您：1. 检查内容是否违规 2. 修改相关内容 3. 避免再次发生。",
      "严重": "您好，您的账号已被封禁{{days}}天。原因是{{reason}}。解封方法：{{solution}}。如果需要申诉，请准备相关材料。",
      "永久": "您好，您的账号已被永久封禁。原因是{{reason}}。如需申诉，请：1. 收集证据 2. 提交申诉材料 3. 等待审核（通常7-15个工作日）。"
    }
  }
}
```

### 3. 新增节点类型

**图片识别节点**：
```json
{
  "type": "IMAGE_RECOGNITION",
  "config": {
    "enableOCR": true,
    "ocrEngine": "tencent_ocr",
    "saveToStorage": true,
    "storageBucket": "worktool-images"
  }
}
```

**内容分析节点**：
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

### 需要新增的功能

| 功能 | 文件 | 优先级 |
|-----|------|--------|
| 图片识别服务 | `server/services/image-recognition.service.js` | ⭐⭐⭐⭐⭐ |
| 对象存储集成 | 使用storage技能 | ⭐⭐⭐⭐⭐ |
| 图片识别规则配置 | `server/config/image-recognition.json` | ⭐⭐⭐⭐ |
| 图片识别节点 | 节点类型定义 | ⭐⭐⭐⭐⭐ |
| 内容分析节点 | 节点类型定义 | ⭐⭐⭐⭐ |

### 需要修改的功能

| 功能 | 修改内容 | 优先级 |
|-----|---------|--------|
| 消息接收节点 | 增加图片URL提取和图片下载 | ⭐⭐⭐⭐⭐ |
| 智能客服流程 | 增加图片识别分支 | ⭐⭐⭐⭐⭐ |
| 转化客服流程 | 增加图片识别分支 | ⭐⭐⭐⭐ |
| AI回复节点 | 支持基于图片内容的回复模板 | ⭐⭐⭐⭐ |

---

## 🚀 实施步骤

### 阶段一：基础能力建设（3-4天）
1. 集成对象存储
2. 开发图片识别服务
3. 创建识别规则配置

### 阶段二：流程节点开发（2-3天）
1. 开发图片识别节点
2. 开发内容分析节点
3. 修改消息接收节点

### 阶段三：流程集成（2-3天）
1. 更新智能客服流程
2. 更新转化客服流程
3. 配置回复模板

### 阶段四：测试验证（2-3天）
1. 功能测试
2. 性能测试
3. 用户验收测试

**总周期**：9-13天

---

## 💰 成本预估

| 服务 | 费用 | 说明 |
|-----|------|------|
| 腾讯云OCR | 0.01元/次 | 通用印刷体识别 |
| 腾讯云COS存储 | 0.12元/GB/月 | 图片存储 |
| 腾讯云COS流量 | 0.5元/GB | 图片访问 |
| GPT-4V Vision | 0.03元/次 | 高级内容理解 |

**预估成本**：
- 每天100张图片：约4元/天
- 每月成本：约120元
