# 视频号兼职人员转化流程 - 实现文档

## 📋 项目概述

本项目实现了完整的视频号兼职人员转化流程，通过浏览器自动化（Puppeteer）技术实现以下功能：
1. 获取视频号小店登录二维码
2. 检测二维码状态（过期检测）
3. 刷新二维码（过期后重新生成）
4. 检测登录状态（支持轮询，自动检测二维码过期）
5. 提取和保存Cookie
6. 人工审核（页面截图）
7. 页面可访问性检测

## 🎯 技术方案

### 为什么选择 Puppeteer？
- ✅ 可以模拟真实浏览器操作
- ✅ 可以获取二维码（截图或提取图片元素）
- ✅ 可以检测登录状态（检查页面元素或Cookie）
- ✅ 可以检测页面可访问性（HTTP状态码）
- ✅ 可以提取Cookie
- ✅ 可以进行人工审核（截图展示）
- ✅ 可以检测二维码过期状态

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
│   │       ├── refresh-qrcode/
│   │       │   └── route.ts          # 刷新二维码接口
│   │       ├── qrcode-status/
│   │       │   └── route.ts          # 检查二维码状态接口
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

## ⏰ 二维码过期处理

### 功能说明

视频号小店的登录二维码有5分钟的有效期，过期后需要重新扫描。系统实现了完整的二维码过期检测和刷新机制：

1. **二维码状态管理**
   - 每次生成二维码时，系统会记录二维码ID和过期时间
   - 二维码有效期为5分钟（300秒）
   - 系统可以实时检测二维码是否过期

2. **过期检测机制**
   - 前端显示二维码剩余有效时间（倒计时）
   - 检测登录状态时，自动检查二维码是否过期
   - 如果二维码过期，提前结束轮询检测并提示用户

3. **刷新机制**
   - 提供"刷新二维码"按钮，随时可以重新生成二维码
   - 刷新后会重新开始检测登录状态
   - 无需手动刷新页面，体验流畅

4. **用户界面优化**
   - 显示二维码剩余有效时间（实时倒计时）
   - 二维码过期时，显示灰色遮罩和提示
   - 自动区分"二维码过期"和"未登录"两种情况
   - 提供清晰的错误提示和操作指引

### 使用场景

**场景1：二维码过期**
1. 用户扫描二维码后，在等待过程中二维码过期
2. 系统自动检测到二维码过期
3. 显示"二维码已过期"提示
4. 用户点击"刷新二维码"按钮
5. 生成新的二维码，用户重新扫描

**场景2：用户主动刷新**
1. 用户等待时间过长，想重新获取二维码
2. 点击"刷新二维码"按钮
3. 生成新的二维码
4. 重新开始检测登录状态

## 🔌 API 接口说明

### 1. 获取二维码

**接口**: `POST /api/video-channel/qrcode`

**请求**: 无需参数

**响应**:
```json
{
  "success": true,
  "qrcodeId": "1770485085832",
  "qrcodeUrl": "/api/video-channel/qrcode/1770485085832.png",
  "qrcodeBase64": "data:image/png;base64,...",
  "expiresAt": "2026-02-07T17:29:45.833Z",
  "remainingTime": 299,
  "message": "二维码生成成功，请使用微信扫描登录"
}
```

**功能说明**:
- 访问视频号小店登录页面
- 查找二维码元素（支持多种选择器）
- 如果找不到特定二维码元素，会截取整个页面
- 返回二维码ID、过期时间和剩余有效时间
- 二维码有效期为5分钟（300秒）

### 2. 刷新二维码

**接口**: `POST /api/video-channel/refresh-qrcode`

**请求**: 无需参数

**响应**:
```json
{
  "success": true,
  "qrcodeId": "1770485469934",
  "qrcodeUrl": "/api/video-channel/qrcode/1770485469934.png",
  "qrcodeBase64": "data:image/png;base64,...",
  "expiresAt": "2026-02-07T17:36:09.935Z",
  "remainingTime": 299,
  "message": "二维码已刷新，请重新扫描"
}
```

**功能说明**:
- 重新生成二维码（覆盖之前的二维码）
- 更新二维码ID和过期时间
- 重置剩余有效时间为5分钟
- 返回新的二维码信息

### 3. 检查二维码状态

**接口**: `GET /api/video-channel/qrcode-status`

**请求**: 无需参数

**响应**:
```json
{
  "success": true,
  "expired": false,
  "remainingTime": 293,
  "message": "二维码有效，剩余 293 秒"
}
```

**功能说明**:
- 检查当前二维码是否过期
- 返回剩余有效时间（秒）
- 提供清晰的状态提示

### 4. 检测登录状态

**接口**: `POST /api/video-channel/check-login`

**请求**: 无需参数

**响应**:
```json
{
  "success": true,
  "isLoggedIn": false,
  "qrcodeExpired": false,
  "remainingTime": 295,
  "message": "未登录"
}
```

**功能说明**:
- 检测是否已登录视频号小店
- 返回二维码是否过期
- 返回剩余有效时间
- 区分"二维码过期"和"未登录"两种情况

**接口（轮询）**: `GET /api/video-channel/check-login?maxAttempts=20&interval=3000`

**参数**:
- `maxAttempts`: 最大检测次数（默认20次）
- `interval`: 检测间隔（默认3000毫秒）

**响应**:
```json
{
  "success": true,
  "isLoggedIn": true,
  "qrcodeExpired": false,
  "cookies": [...],
  "attempts": 15,
  "message": "登录成功，共检测 15 次"
}
```

**功能说明**:
- 轮询检测登录状态，maxAttempts为最大检测次数，interval为检测间隔（毫秒）
- 如果二维码过期，提前结束轮询并返回过期提示
- 登录成功后返回所有Cookie
- 返回实际检测次数

### 5. 提取Cookie

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

### 6. 人工审核
- 保存到本地文件（实际应用中应保存到数据库）
- 返回提取的Cookie数量

### 6. 人工审核（含权限检测）

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
  "shopAccessible": true,
  "shopStatusCode": 200,
  "assistantScreenshotBase64": "data:image/png;base64,...",
  "assistantScreenshotUrl": "/api/video-channel/audit/assistant_1770485085832.png",
  "assistantAccessible": false,
  "assistantStatusCode": 200,
  "message": "Cookie权限不完整，只能访问视频号小店，无法访问视频号助手"
}
```

**功能说明**:
- 使用Cookie访问视频号小店和助手页面
- 检测Cookie在两个页面的可访问性（HTTP状态码 + 页面内容验证）
- 生成页面截图供人工审核
- 返回截图的base64编码和存储路径
- 返回Cookie权限检测结果，明确说明Cookie可以访问哪些页面

**Cookie权限说明**:
- **完整权限**: 可访问视频号小店和视频号助手
- **部分权限**: 只能访问视频号小店或只能访问视频号助手
- **无效Cookie**: 无法访问任何页面

## 🎨 前端页面

### 访问地址
`http://localhost:5000/video-channel`

### 页面功能
1. **步骤引导**: 显示当前执行步骤（获取二维码 → 检测登录 → 提取Cookie → 人工审核）
2. **二维码展示**: 显示视频号小店登录二维码
3. **登录状态检测**: 实时显示登录状态
4. **Cookie管理**: 显示提取的Cookie列表（所有Cookie，不过滤）
5. **权限检测**: 显示Cookie在视频号小店和视频号助手的访问权限
6. **截图审核**: 展示视频号小店和助手的页面截图
7. **API文档**: 内置完整的API接口文档

### UI组件
- 使用 shadcn/ui 组件库
- 响应式设计，支持移动端
- 实时状态更新
- 错误提示和加载状态
- Cookie权限状态显示（可访问/不可访问）

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
