# AI API Key 配置指南

本文档详细说明如何配置各个AI提供商的API Key，以启用WorkTool AI平台的真实AI功能。

## 📋 目录

- [快速开始](#快速开始)
- [豆包（火山引擎）配置](#豆包火山引擎配置)
- [DeepSeek配置](#deepseek配置)
- [Kimi配置](#kimi配置)
- [测试验证](#测试验证)
- [常见问题](#常见问题)

## 🚀 快速开始

### 前置要求

1. 已登录WorkTool AI管理后台
2. 拥有相应AI提供商的账号和API Key
3. 确保网络环境可以访问API端点

### 配置步骤

1. 访问 **AI模块** → **API Key管理**
2. 选择要配置的提供商
3. 点击 **配置** 按钮
4. 输入API Key（可选：自定义API端点）
5. 点击 **保存**
6. 点击 **测试** 验证配置

---

## 🔥 豆包（火山引擎）配置

### 获取API Key

1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 登录账号（如果没有，先注册）
3. 进入 **机器学习平台** → **模型推理**
4. 创建或选择应用
5. 在 **API Key管理** 中创建API Key
6. 复制生成的API Key

### 配置信息

```
提供商名称: doubao
显示名称: 豆包
API端点: https://ark.cn-beijing.volces.com/api/v3
速率限制: 60次/分钟
```

### 支持的模型

| 模型ID | 用途 | 最大Token |
|--------|------|-----------|
| ep-20241201163431-5bwhr | 意图识别 | 2000 |
| ep-20250110120711-kn9p6 | 服务回复 | 32000 |

### 配置示例

在API Key管理界面，选择 **豆包** 提供商：

```
API Key: 6b8c****-****-****-****-************
API端点: https://ark.cn-beijing.volces.com/api/v3 (可选)
```

---

## 🧠 DeepSeek配置

### 获取API Key

1. 访问 [DeepSeek官网](https://platform.deepseek.com/)
2. 注册并登录账号
3. 进入 **API Keys** 页面
4. 点击 **Create new key**
5. 设置API Key名称（如：WorkTool-AI）
6. 复制生成的API Key

### 配置信息

```
提供商名称: deepseek
显示名称: DeepSeek
API端点: https://api.deepseek.com/v1
速率限制: 60次/分钟
```

### 支持的模型

| 模型ID | 用途 | 最大Token |
|--------|------|-----------|
| deepseek-v3 | 转化客服 | 64000 |
| deepseek-r1 | 技术支持 | 64000 |

### 配置示例

在API Key管理界面，选择 **DeepSeek** 提供商：

```
API Key: sk-**********************
API端点: https://api.deepseek.com/v1 (可选)
```

### 计费说明

- 按实际Token使用量计费
- 意图识别：¥0.001/1K tokens
- 对话生成：¥0.002/1K tokens
- 详细价格请参考官方文档

---

## 🌙 Kimi配置

### 获取API Key

1. 访问 [Moonshot AI官网](https://platform.moonshot.cn/)
2. 注册并登录账号
3. 进入 **API Keys** 页面
4. 创建新的API Key
5. 复制生成的API Key

### 配置信息

```
提供商名称: kimi
显示名称: Kimi
API端点: https://api.moonshot.cn/v1
速率限制: 60次/分钟
```

### 支持的模型

| 模型ID | 用途 | 最大Token |
|--------|------|-----------|
| moonshot-v1-128k | 报告生成 | 128000 |

### 配置示例

在API Key管理界面，选择 **Kimi** 提供商：

```
API Key: sk-**********************
API端点: https://api.moonshot.cn/v1 (可选)
```

### 计费说明

- 按实际Token使用量计费
- 长文本模型：¥0.004/1K tokens
- 详细价格请参考官方文档

---

## ✅ 测试验证

### 自动测试

配置API Key后，点击 **测试** 按钮自动验证：

```
✅ 成功：API Key格式正确，可正常调用
❌ 失败：API Key无效或网络异常
```

### 手动测试

使用AI调试功能进行测试：

1. 进入 **AI模块** → **AI调试**
2. 选择配置好API Key的模型
3. 输入测试内容（如："你好"）
4. 点击 **开始测试**
5. 查看测试结果

### 测试命令示例

```bash
# 测试豆包API
curl -X POST http://localhost:5001/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{
    "input": "你好",
    "model_id": "豆包模型的ID",
    "type": "intent"
  }'

# 测试DeepSeek API
curl -X POST http://localhost:5001/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{
    "input": "请问这个产品多少钱？",
    "model_id": "deepseek-v3",
    "type": "intent"
  }'

# 测试Kimi API
curl -X POST http://localhost:5001/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{
    "input": "帮我生成一份月度报告",
    "model_id": "moonshot-v1-128k",
    "type": "intent"
  }'
```

---

## ❓ 常见问题

### Q1: API Key配置后仍然使用模拟结果？

**A**: 检查以下几点：
1. 确认API Key已正确保存
2. 点击测试按钮验证API Key有效性
3. 检查后端日志是否有错误信息
4. 确认网络可以访问API端点

### Q2: 测试失败提示"API Key未配置"？

**A**: 确保在配置时输入了完整的API Key，不要只输入部分字符。

### Q3: 如何查看API调用记录？

**A**:
1. 进入 **AI模块** → **使用统计**
2. 查看调用明细和成本统计
3. 可以按时间、模型、提供商筛选

### Q4: 如何更换API Key？

**A**:
1. 进入 **API Key管理**
2. 选择对应的提供商
3. 点击 **配置**
4. 输入新的API Key
5. 点击 **保存**
6. 点击 **测试** 验证

### Q5: API Key会被泄露吗？

**A**:
- API Key在数据库中加密存储
- 前端显示时会自动脱敏（只显示前4位和后4位）
- 建议定期更换API Key
- 不要将API Key暴露在公开代码仓库中

### Q6: 超过速率限制怎么办？

**A**:
系统内置了限流保护机制（默认60次/分钟）：
- 超过限制时会返回错误提示
- 系统会自动等待冷却时间
- 可以在提供商设置中调整速率限制
- 联系提供商提升配额

### Q7: 如何监控API调用成本？

**A**:
1. 进入 **AI模块** → **使用统计**
2. 查看总成本、平均响应时间
3. 进入 **成本预警** 设置预算和告警阈值
4. 成本达到阈值时会自动发送告警

### Q8: 支持自定义API端点吗？

**A**:
- 支持！在配置提供商时可以自定义API端点
- 适用于需要使用代理或自建API网关的场景
- 确保自定义端点与官方API兼容

---

## 🔒 安全建议

1. **定期更换API Key**：建议每3-6个月更换一次
2. **设置最小权限**：只授予必要的权限
3. **监控使用情况**：定期查看API调用记录
4. **启用告警**：设置成本和使用量告警
5. **备份API Key**：安全存储API Key备份

---

## 📞 技术支持

如果遇到配置问题，请联系：

- **技术文档**: [WorkTool AI文档中心](https://docs.worktool.ai)
- **在线支持**: support@worktool.ai
- **社区论坛**: [WorkTool AI社区](https://community.worktool.ai)

---

## 📝 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-02-04 | v1.0 | 初始版本，支持豆包、DeepSeek、Kimi |

---

**最后更新**: 2026-02-04
**文档版本**: v1.0
