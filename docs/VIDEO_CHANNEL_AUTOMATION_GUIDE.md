# 视频号兼职人员转化流程 - 实现文档

## 📋 项目概述

本项目实现了完整的视频号兼职人员转化流程，通过浏览器自动化（Puppeteer）技术实现以下功能：
1. 获取视频号小店登录二维码
2. 检测登录状态（支持轮询）
3. 提取和保存Cookie
4. 人工审核（页面截图）
5. 页面可访问性检测

## 🎯 技术方案

### 为什么选择 Puppeteer？
- ✅ 可以模拟真实浏览器操作
- ✅ 可以获取二维码（截图或提取图片元素）
- ✅ 可以检测登录状态（检查页面元素或Cookie）
- ✅ 可以检测页面可访问性（HTTP状态码）
- ✅ 可以提取Cookie
- ✅ 可以进行人工审核（截图展示）

### 核心技术栈
- **前端框架**: Next.js 16 (App Router)
- **UI组件**: shadcn/ui (基于 Radix UI)
- **样式**: Tailwind CSS 4
- **浏览器自动化**: Puppeteer 24.37.2
- **包管理器**: pnpm

## 📁 项目结构

```
src/
├── app/
│   ├── api/
│   │   └── video-channel/
│   │       ├── qrcode/
│   │       │   └── route.ts          # 获取二维码接口
│   │       ├── check-login/
│   │       │   └── route.ts          # 检测登录状态接口
│   │       ├── extract-cookies/
│   │       │   └── route.ts          # 提取Cookie接口
│   │       └── manual-audit/
│   │           └── route.ts          # 人工审核接口
│   └── video-channel/
│       └── page.tsx                  # 前端页面
└── lib/
    └── services/
        └── video-channel-automation.service.ts  # 核心服务模块
```

## 🔌 API 接口说明

### 1. 获取二维码

**接口**: `POST /api/video-channel/qrcode`

**请求**: 无需参数

**响应**:
```json
{
  "success": true,
  "qrcodeUrl": "/api/video-channel/qrcode/1770485085832.png",
  "qrcodeBase64": "data:image/png;base64,...",
  "expiresAt": "2026-02-07T17:29:45.833Z",
  "message": "二维码生成成功，请使用微信扫描登录"
}
```

**功能说明**:
- 访问视频号小店登录页面
- 查找二维码元素（支持多种选择器）
- 如果找不到特定二维码元素，会截取整个页面
- 返回二维码的base64编码和存储路径

### 2. 检测登录状态

**接口**: `POST /api/video-channel/check-login`

**请求**: 无需参数

**响应**:
```json
{
  "success": true,
  "isLoggedIn": false,
  "cookies": [],
  "message": "未登录"
}
```

**接口（轮询）**: `GET /api/video-channel/check-login?maxAttempts=20&interval=3000`

**参数**:
- `maxAttempts`: 最大检测次数（默认20次）
- `interval`: 检测间隔（默认3000毫秒）

**响应**:
```json
{
  "success": true,
  "isLoggedIn": true,
  "cookies": [...],
  "attempts": 15,
  "message": "登录成功，共检测 15 次"
}
```

**功能说明**:
- 访问视频号小店页面
- 检查页面元素判断是否已登录
- 支持单次检测和轮询检测
- 登录成功后返回所有Cookie

### 3. 提取Cookie

**接口**: `POST /api/video-channel/extract-cookies`

**请求**:
```json
{
  "userId": "user_123",
  "cookies": [...]
}
```

**响应**:
```json
{
  "success": true,
  "cookieCount": 5,
  "message": "成功提取 5 个关键Cookie"
}
```

**功能说明**:
- 提取关键Cookie（session、token、user等）
- 保存到本地文件（实际应用中应保存到数据库）
- 返回提取的Cookie数量

### 4. 人工审核

**接口**: `POST /api/video-channel/manual-audit`

**请求**:
```json
{
  "cookies": [...]
}
```

**响应**:
```json
{
  "success": true,
  "shopScreenshotBase64": "data:image/png;base64,...",
  "shopScreenshotUrl": "/api/video-channel/audit/shop_1770485085832.png",
  "assistantScreenshotBase64": "data:image/png;base64,...",
  "assistantScreenshotUrl": "/api/video-channel/audit/assistant_1770485085832.png",
  "message": "人工审核截图生成成功，请审核"
}
```

**功能说明**:
- 使用Cookie访问视频号小店和助手页面
- 生成页面截图供人工审核
- 返回截图的base64编码和存储路径

## 🎨 前端页面

### 访问地址
`http://localhost:5000/video-channel`

### 页面功能
1. **步骤引导**: 显示当前执行步骤（获取二维码 → 检测登录 → 提取Cookie → 人工审核）
2. **二维码展示**: 显示视频号小店登录二维码
3. **登录状态检测**: 实时显示登录状态
4. **Cookie管理**: 显示提取的Cookie列表
5. **截图审核**: 展示视频号小店和助手的页面截图
6. **API文档**: 内置完整的API接口文档

### UI组件
- 使用 shadcn/ui 组件库
- 响应式设计，支持移动端
- 实时状态更新
- 错误提示和加载状态

## 🔧 配置说明

### 环境要求
- Node.js 24+
- pnpm 9.0.0+
- Linux系统（已安装Chrome依赖）

### 系统依赖
```bash
apt-get install -y \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2t64 \
  libpango-1.0-0 \
  libcairo2 \
  libatspi2.0-0 \
  libgtk-3-0 \
  libgdk-pixbuf-2.0-0
```

### NPM依赖
```bash
pnpm add puppeteer
```

## 🚀 使用指南

### 1. 启动服务
```bash
cd /workspace/projects
pnpm install
pnpm run dev
```

服务将在 `http://localhost:5000` 启动

### 2. 访问前端页面
打开浏览器访问 `http://localhost:5000/video-channel`

### 3. 执行转化流程
1. 点击"生成二维码"按钮
2. 使用微信扫描二维码登录视频号小店
3. 等待系统自动检测登录状态（最多60秒）
4. 登录成功后，点击"提取Cookie"
5. 点击"生成审核截图"
6. 检查截图，确认页面正常

### 4. API调用示例

```javascript
// 获取二维码
const response = await fetch('/api/video-channel/qrcode', {
  method: 'POST'
});
const data = await response.json();

// 检测登录状态（轮询）
const loginResponse = await fetch('/api/video-channel/check-login?maxAttempts=20&interval=3000');
const loginData = await loginResponse.json();

// 提取Cookie
const extractResponse = await fetch('/api/video-channel/extract-cookies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_123',
    cookies: loginData.cookies
  })
});
const extractData = await extractResponse.json();

// 人工审核
const auditResponse = await fetch('/api/video-channel/manual-audit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cookies: loginData.cookies
  })
});
const auditData = await auditResponse.json();
```

## 📊 流程引擎集成

### 节点配置示例

```json
{
  "name": "视频号兼职人员转化流程",
  "nodes": [
    {
      "id": "node_get_qrcode",
      "type": "HTTP_REQUEST",
      "name": "获取二维码",
      "data": {
        "config": {
          "url": "http://localhost:5000/api/video-channel/qrcode",
          "method": "POST"
        }
      },
      "nextNodeId": "node_send_qrcode"
    },
    {
      "id": "node_send_qrcode",
      "type": "SEND_COMMAND",
      "name": "发送二维码",
      "data": {
        "config": {
          "commandType": "message",
          "messageType": "image",
          "imageUrl": "{{context.qrcodeBase64}}",
          "messageContent": "请扫描上方二维码登录视频号小店"
        }
      },
      "nextNodeId": "node_check_login"
    },
    {
      "id": "node_check_login",
      "type": "HTTP_REQUEST",
      "name": "检测登录状态",
      "data": {
        "config": {
          "url": "http://localhost:5000/api/video-channel/check-login?maxAttempts=20&interval=3000",
          "method": "GET"
        }
      },
      "nextNodeId": "node_extract_cookies"
    },
    {
      "id": "node_extract_cookies",
      "type": "HTTP_REQUEST",
      "name": "提取CK",
      "data": {
        "config": {
          "url": "http://localhost:5000/api/video-channel/extract-cookies",
          "method": "POST",
          "body": {
            "userId": "{{context.userId}}",
            "cookies": "{{context.cookies}}"
          }
        }
      },
      "nextNodeId": "node_manual_audit"
    },
    {
      "id": "node_manual_audit",
      "type": "HTTP_REQUEST",
      "name": "人工审核",
      "data": {
        "config": {
          "url": "http://localhost:5000/api/video-channel/manual-audit",
          "method": "POST",
          "body": {
            "cookies": "{{context.cookies}}"
          }
        }
      },
      "nextNodeId": "node_end"
    }
  ]
}
```

## ⚠️ 注意事项

### 1. 反爬虫风险
- 频繁访问可能触发微信反爬虫机制
- 建议使用代理IP池
- 设置合理的请求间隔

### 2. 资源消耗
- Puppeteer会消耗大量内存和CPU
- 建议使用独立服务器运行
- 定期清理临时文件

### 3. Cookie有效期
- Cookie通常有有效期限制
- 需要定期更新Cookie
- 建议使用数据库存储Cookie

### 4. 页面结构变化
- 微信可能随时更新页面结构
- 需要定期维护选择器
- 建议添加日志记录

## 🔒 安全建议

1. **Cookie存储**: 不要将Cookie明文存储，建议加密
2. **访问控制**: 添加API访问权限验证
3. **日志记录**: 记录所有操作日志，便于审计
4. **敏感信息**: 不要在前端暴露完整的Cookie信息

## 📈 优化建议

1. **性能优化**
   - 使用浏览器连接池
   - 限制并发访问数
   - 使用缓存减少重复请求

2. **稳定性优化**
   - 添加重试机制
   - 实现健康检查
   - 添加监控告警

3. **功能扩展**
   - 支持多账号管理
   - 添加自动化测试
   - 实现Cookie自动更新

## 📝 总结

本项目成功实现了视频号兼职人员转化流程的完整自动化解决方案，通过Puppeteer浏览器自动化技术，实现了二维码获取、登录检测、Cookie提取和人工审核等功能。方案稳定可靠，易于集成到现有的流程引擎中。

### 优点
- ✅ 不依赖官方API
- ✅ 可以模拟真实用户操作
- ✅ 可以获取截图用于人工审核
- ✅ 可以提取完整的Cookie
- ✅ 支持轮询检测登录状态

### 缺点
- ⚠️ 需要服务器安装Chrome/Chromium
- ⚠️ 资源消耗较大（内存、CPU）
- ⚠️ 可能被微信反爬虫机制限制

### 适用场景
- 需要获取视频号小店登录凭证
- 需要自动化管理多个视频号账号
- 需要进行页面截图审核
- 需要提取Cookie用于后续操作
