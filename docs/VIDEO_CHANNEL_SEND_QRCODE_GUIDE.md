# 视频号二维码发送到企业微信功能

## 📋 功能概述

实现了将视频号登录二维码自动发送到企业微信的功能，使用系统中的**转化客服机器人**进行发送。

---

## 🎯 功能特点

1. **自动使用转化客服机器人**
   - 系统自动从数据库中查找转化客服机器人（`role = 'conversion'`）
   - 无需手动输入机器人ID
   - 确保使用正确的机器人发送消息

2. **阿里云OSS集成**
   - 二维码自动上传到阿里云OSS
   - 生成可访问的网络URL
   - 支持Base64和本地文件上传

3. **WorkTool API集成**
   - 调用WorkTool的`sendRawMessage`接口（type=218）
   - 支持发送图片消息
   - 支持附加留言

---

## 🔧 配置步骤

### 1. 安装依赖

```bash
pnpm add ali-oss
```

### 2. 配置阿里云OSS环境变量

在 `.env` 文件中添加：

```bash
# 阿里云OSS配置
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_ACCESS_KEY_ID=your_access_key_id
ALIYUN_OSS_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_OSS_BUCKET=your_bucket_name
ALIYUN_OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
```

### 3. 配置转化客服机器人

在数据库的 `robots` 表中，确保有一个机器人配置如下：

```json
{
  "name": "转化客服机器人",
  "robotType": "wechat",
  "status": "active",
  "config": {
    "role": "conversion",
    "worktool": {
      "apiBaseUrl": "https://api.worktool.ymdyes.cn",
      "robotId": "your_robot_id",
      "defaultGroupName": "视频号转化群"
    }
  }
}
```

**关键配置说明**：
- `config.role`: 必须设置为 `"conversion"`
- `config.worktool.apiBaseUrl`: WorkTool API基础地址
- `config.worktool.robotId`: WorkTool机器人ID
- `config.worktool.defaultGroupName`: 默认发送的群名（可选）

---

## 🚀 使用方法

### 前端操作

1. 进入视频号转化页面 (`/video-channel`)
2. 点击"生成二维码"按钮
3. 系统生成二维码并显示
4. 点击"发送到企业微信"展开发送区域
5. 系统自动加载转化客服机器人
6. 输入接收者名称（群名或好友昵称）
7. （可选）输入附加留言
8. 点击"发送二维码"按钮
9. 二维码自动发送到企业微信

### 发送流程

```
1. 用户点击"发送二维码"
   ↓
2. 前端调用 GET /api/video-channel/conversion-robot
   ↓
3. 后端查询转化客服机器人
   ↓
4. 前端调用 POST /api/video-channel/send-qrcode
   ↓
5. 后端读取本地二维码文件
   ↓
6. 后端调用 POST /api/worktool/send-oss-image
   ↓
7. OSS服务上传图片到阿里云OSS
   ↓
8. WorkTool服务调用 sendImage 方法
   ↓
9. 调用 WorkTool API 发送图片消息
   ↓
10. 企业微信接收二维码图片
```

---

## 📁 新增文件

### 后端文件

1. **`server/services/oss.service.js`**
   - 阿里云OSS服务封装
   - 支持上传文件、Base64图片
   - 支持删除文件、生成签名URL

2. **`server/routes/worktool-send-oss-image.api.js`**
   - 上传图片到OSS并发送到WorkTool的API路由
   - `/api/worktool/send-oss-image`

3. **`server/routes/worktool-conversion-robot.api.js`**
   - 获取转化客服机器人的API路由
   - `/api/worktool/conversion-robot`

### 前端文件

1. **`src/app/api/video-channel/send-qrcode/route.ts`**
   - 前端代理API，调用后端服务
   - `/api/video-channel/send-qrcode`

2. **`src/app/api/video-channel/conversion-robot/route.ts`**
   - 前端代理API，获取转化客服机器人
   - `/api/video-channel/conversion-robot`

### 修改的文件

1. **`server/services/worktool.service.js`**
   - 新增 `sendImage()` 方法
   - 支持发送图片消息（type=218）

2. **`src/lib/services/video-channel-automation.service.ts`**
   - 新增 `sendQrcodeToWorkTool()` 方法
   - 集成OSS上传和发送功能

3. **`src/app/video-channel/page.tsx`**
   - 新增发送到企业微信的UI组件
   - 自动加载转化客服机器人
   - 支持配置接收者和附加留言

---

## 🔌 API接口

### 1. 获取转化客服机器人

**请求**：
```
GET /api/video-channel/conversion-robot
```

**响应**：
```json
{
  "success": true,
  "robot": {
    "id": "robot-uuid",
    "name": "转化客服机器人",
    "worktoolRobotId": "worktool_robot_id",
    "apiBaseUrl": "https://api.worktool.ymdyes.cn",
    "defaultGroupName": "视频号转化群"
  }
}
```

### 2. 发送二维码到WorkTool

**请求**：
```
POST /api/video-channel/send-qrcode
Content-Type: application/json

{
  "qrcodePath": "/tmp/qrcodes/qrcode_123456789.png",
  "robotId": "worktool_robot_id",
  "toName": "视频号转化群",
  "objectName": "qrcode_123456789.png",
  "extraText": "请使用微信扫描此二维码登录"
}
```

**响应**：
```json
{
  "success": true,
  "url": "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/video-channel/qrcode/qrcode_123456789.png",
  "message": "发送成功"
}
```

### 3. 上传图片到OSS并发送（内部API）

**请求**：
```
POST /api/worktool/send-oss-image
Content-Type: application/json

{
  "base64Data": "data:image/png;base64,iVBORw0KGgo...",
  "objectName": "qrcode_123456789.png",
  "robotId": "worktool_robot_id",
  "toName": "视频号转化群",
  "extraText": "请使用微信扫描此二维码登录",
  "folder": "video-channel/qrcode"
}
```

**响应**：
```json
{
  "success": true,
  "url": "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/video-channel/qrcode/qrcode_123456789.png",
  "objectName": "video-channel/qrcode/qrcode_123456789.png",
  "sendId": "send-1234567890-abc123",
  "processingTime": 1234
}
```

---

## ⚠️ 注意事项

### 1. 阿里云OSS配置

- 确保OSS Bucket已创建
- 确保Access Key有读写权限
- 确保Bucket配置了正确的CORS规则（如果需要）
- 建议使用私有Bucket，通过签名URL访问

### 2. WorkTool配置

- 确保WorkTool机器人已正确配置
- 确保机器人状态为活跃（`status = 'active'`）
- 确保机器人有发送图片权限
- 确保WorkTool APP已开启悬浮窗权限

### 3. 机器人配置

- 机器人的 `config.role` 必须设置为 `"conversion"`
- 机器人的 `config.worktool.robotId` 必须正确
- 如果配置了 `defaultGroupName`，会自动填充到接收者输入框

### 4. 文件命名

- 二维码文件使用时间戳命名，避免冲突
- OSS对象名使用 `video-channel/qrcode/` 前缀
- 建议定期清理过期文件（可以实现定时清理任务）

### 5. 错误处理

- 如果OSS上传失败，不会发送到WorkTool
- 如果WorkTool发送失败，会自动清理已上传的OSS文件
- 所有错误都会记录到日志中

---

## 🧪 测试

### 测试步骤

1. 配置好阿里云OSS和转化客服机器人
2. 进入视频号转化页面
3. 生成二维码
4. 点击"发送到企业微信"
5. 检查企业微信群是否收到二维码
6. 检查日志确认流程正常

### 预期结果

- ✅ 二维码成功上传到OSS
- ✅ 二维码成功发送到企业微信
- ✅ 日志记录完整
- ✅ 错误处理正常

---

## 📊 技术实现

### 核心技术栈

- **阿里云OSS**: `ali-oss` SDK
- **WorkTool API**: HTTP POST（type=218）
- **后端**: Fastify + Drizzle ORM
- **前端**: Next.js 16 + React 19

### 关键代码

**OSS上传**：
```javascript
const result = await ossService.uploadBase64Image(base64Data, objectName, folder);
```

**WorkTool发送**：
```javascript
const result = await worktoolService.sendImage(robotId, toName, fileUrl, objectName, extraText);
```

**请求体格式**：
```javascript
{
  socketType: 2,
  list: [{
    type: 218,
    titleList: [toName],
    objectName: objectName,
    fileUrl: fileUrl,
    fileType: 'image',
    extraText: extraText
  }]
}
```

---

## 🔮 后续优化

1. **批量发送**
   - 支持一次发送到多个群

2. **定时清理**
   - 定期清理OSS中的过期二维码

3. **发送记录**
   - 记录发送历史
   - 支持查看发送状态

4. **重试机制**
   - 失败自动重试
   - 支持手动重试

5. **更多文件类型**
   - 支持发送视频、文件等

---

## 📞 问题反馈

如有问题，请检查：
1. `.env` 文件配置是否正确
2. 阿里云OSS权限是否配置
3. 转化客服机器人配置是否正确
4. WorkTool机器人是否在线
5. 浏览器控制台和后端日志

---

**文档版本**: v1.0
**创建日期**: 2025-01-15
**最后更新**: 2025-01-15
