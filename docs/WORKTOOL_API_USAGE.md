# WorkTool API 使用说明

## 概述

WorkTool AI 中枢系统已经完全实现了 WorkTool 的所有回调地址和 API 调用功能。本文档说明如何使用这些功能。

---

## 一、回调地址（机器人上报消息给我们）

### 1.1 消息回调

**地址**: `POST /api/worktool/callback/message?robotId=xxx`

**功能**: 接收 WorkTool 机器人上报的 QA 问答消息

**请求示例**:
```bash
curl -X POST \
  'http://localhost:5000/api/worktool/callback/message?robotId=your_robot_id' \
  -H 'Content-Type: application/json' \
  -d '{
    "spoken": "你好",
    "rawSpoken": "你好",
    "receivedName": "张三",
    "groupName": "测试群",
    "groupRemark": "测试群备注",
    "roomType": 3,
    "atMe": true,
    "textType": 1,
    "fileBase64": ""
  }'
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

---

### 1.2 执行结果回调

**地址**: `POST /api/worktool/callback/result?robotId=xxx`

**功能**: 接收 WorkTool 机器人上报的指令执行结果

**请求示例**:
```bash
curl -X POST \
  'http://localhost:5000/api/worktool/callback/result?robotId=your_robot_id' \
  -H 'Content-Type: application/json' \
  -d '{
    "messageId": "msg_123456",
    "command": "发送消息",
    "status": "success",
    "result": {
      "success": true
    }
  }'
```

---

### 1.3 群二维码回调

**地址**: `POST /api/worktool/callback/qrcode?robotId=xxx`

**功能**: 接收 WorkTool 机器人上报的群二维码信息

**请求示例**:
```bash
curl -X POST \
  'http://localhost:5000/api/worktool/callback/qrcode?robotId=your_robot_id' \
  -H 'Content-Type: application/json' \
  -d '{
    "qrcodeUrl": "https://example.com/qrcode/xxx",
    "groupId": "group_123456"
  }'
```

---

### 1.4 机器人状态回调（推荐使用）

**地址**: `POST /api/worktool/callback/status?robotId=xxx`

**功能**: 接收 WorkTool 机器人上报的上线/下线状态

**机器人上线请求示例**:
```bash
curl -X POST \
  'http://localhost:5000/api/worktool/callback/status?robotId=your_robot_id' \
  -H 'Content-Type: application/json' \
  -d '{
    "status": 5,
    "timestamp": "2025-01-14T10:00:00Z"
  }'
```

**机器人下线请求示例**:
```bash
curl -X POST \
  'http://localhost:5000/api/worktool/callback/status?robotId=your_robot_id' \
  -H 'Content-Type: application/json' \
  -d '{
    "status": 6,
    "timestamp": "2025-01-14T10:00:00Z"
  }'
```

**兼容性路由**（仍可用，但不推荐）:
- `POST /api/worktool/callback/robot-online?robotId=xxx` - 机器人上线
- `POST /api/worktool/callback/robot-offline?robotId=xxx` - 机器人下线
- `POST /api/worktool/callback/robot-status?robotId=xxx` - 机器人状态

---

## 二、WorkTool API 调用（我们调用他们的 API）

### 2.1 发送消息

**地址**: `POST /api/worktool/robot/send-message`

**功能**: 主动发送消息给企业微信用户

**请求示例**:
```bash
curl -X POST \
  'http://localhost:5000/api/worktool/robot/send-message' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "robotId": "your_robot_id",
    "toName": "张三",
    "content": "你好，这是一条测试消息",
    "messageType": 1
  }'
```

**响应示例**:
```json
{
  "code": 0,
  "message": "消息发送成功",
  "data": {
    "messageId": "msg_123456",
    "success": true
  }
}
```

**使用场景**:
- 机器人主动推送通知
- 定时发送消息
- 触发式消息发送

---

### 2.2 获取机器人信息

**地址**: `GET /api/worktool/robot/info?robotId=xxx`

**功能**: 获取机器人配置信息

**请求示例**:
```bash
curl -X GET \
  'http://localhost:5000/api/worktool/robot/info?robotId=your_robot_id' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**响应示例**:
```json
{
  "code": 0,
  "message": "获取机器人信息成功",
  "data": {
    "robotId": "your_robot_id",
    "name": "测试机器人",
    "status": "online",
    "config": {}
  }
}
```

**使用场景**:
- 显示机器人配置
- 获取机器人状态
- 查询机器人详情

---

### 2.3 查询机器人在线状态

**地址**: `GET /api/worktool/robot/online-status?robotId=xxx`

**功能**: 查询机器人是否在线

**请求示例**:
```bash
curl -X GET \
  'http://localhost:5000/api/worktool/robot/online-status?robotId=your_robot_id' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**响应示例**:
```json
{
  "code": 0,
  "message": "查询机器人在线状态成功",
  "data": {
    "isOnline": true
  }
}
```

**使用场景**:
- 监控机器人在线状态
- 显示机器人状态
- 机器人健康检查

---

### 2.4 查询登录日志

**地址**: `GET /api/worktool/robot/login-logs?robotId=xxx&page=1&pageSize=10`

**功能**: 查询机器人登录历史日志

**请求示例**:
```bash
curl -X GET \
  'http://localhost:5000/api/worktool/robot/login-logs?robotId=your_robot_id&page=1&pageSize=10' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**响应示例**:
```json
{
  "code": 0,
  "message": "查询登录日志成功",
  "data": {
    "list": [
      {
        "loginTime": "2025-01-14T10:00:00Z",
        "ip": "192.168.1.1",
        "status": "success"
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 10
  }
}
```

**使用场景**:
- 显示机器人登录历史
- 排查登录问题
- 审计机器人使用情况

---

### 2.5 查询指令消息

**地址**: `GET /api/worktool/robot/command-messages?robotId=xxx&page=1&pageSize=10`

**功能**: 查询指令消息列表

**请求示例**:
```bash
curl -X GET \
  'http://localhost:5000/api/worktool/robot/command-messages?robotId=your_robot_id&page=1&pageSize=10' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**响应示例**:
```json
{
  "code": 0,
  "message": "查询指令消息成功",
  "data": {
    "list": [
      {
        "messageId": "msg_123456",
        "command": "发送消息",
        "createTime": "2025-01-14T10:00:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 10
  }
}
```

**使用场景**:
- 查看指令历史
- 分析指令执行情况
- 调试指令问题

---

### 2.6 查询指令执行结果

**地址**: `GET /api/worktool/robot/command-results?robotId=xxx&page=1&pageSize=10`

**功能**: 查询指令执行结果

**请求示例**:
```bash
curl -X GET \
  'http://localhost:5000/api/worktool/robot/command-results?robotId=your_robot_id&page=1&pageSize=10' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**响应示例**:
```json
{
  "code": 0,
  "message": "查询指令执行结果成功",
  "data": {
    "list": [
      {
        "messageId": "msg_123456",
        "command": "发送消息",
        "status": "success",
        "result": {
          "success": true
        },
        "createTime": "2025-01-14T10:00:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 10
  }
}
```

**使用场景**:
- 查看指令执行历史
- 分析指令执行成功率
- 调试指令执行问题

---

### 2.7 查询消息回调日志

**地址**: `GET /api/worktool/robot/message-logs?robotId=xxx&page=1&pageSize=10`

**功能**: 查询机器人消息回调日志

**请求示例**:
```bash
curl -X GET \
  'http://localhost:5000/api/worktool/robot/message-logs?robotId=your_robot_id&page=1&pageSize=10' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**响应示例**:
```json
{
  "code": 0,
  "message": "查询消息回调日志成功",
  "data": {
    "list": [
      {
        "messageId": "msg_123456",
        "spoken": "你好",
        "receivedName": "张三",
        "groupName": "测试群",
        "createTime": "2025-01-14T10:00:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 10
  }
}
```

**使用场景**:
- 查看消息回调历史
- 分析消息处理情况
- 调试消息回调问题

---

### 2.8 更新机器人信息

**地址**: `POST /api/worktool/robot/update-info`

**功能**: 更新机器人后端通讯加密地址等信息

**请求示例**:
```bash
curl -X POST \
  'http://localhost:5000/api/worktool/robot/update-info' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "robotId": "your_robot_id",
    "robotInfo": {
      "name": "测试机器人",
      "callbackUrl": "https://your-domain.com/api/worktool/callback",
      "apiBaseUrl": "https://api.worktool.ymdyes.cn"
    }
  }'
```

**响应示例**:
```json
{
  "code": 0,
  "message": "更新机器人信息成功",
  "data": {
    "success": true
  }
}
```

---

## 三、配置说明

### 3.1 环境变量

在 `.env` 文件中配置以下变量：

```env
# WorkTool API 配置
WORKTOOL_API_BASE_URL=https://api.worktool.ymdyes.cn

# 回调签名密钥（可选，用于验证回调请求）
CALLBACK_SIGNATURE_SECRET=your_secret_key_here
```

### 3.2 机器人配置

在数据库 `robots` 表中配置机器人信息：

```sql
INSERT INTO robots (
  robot_id,
  name,
  is_active,
  config
) VALUES (
  'your_robot_id',
  '测试机器人',
  true,
  '{"worktool": {
    "apiBaseUrl": "https://api.worktool.ymdyes.cn",
    "callbackUrl": "https://your-domain.com/api/worktool/callback",
    "signatureSecret": "your_secret_key_here"
  }}'
);
```

---

## 四、认证说明

### 4.1 获取 Token

使用以下 API 获取认证 Token：

```bash
curl -X POST \
  'http://localhost:5000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**响应示例**:
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "your_token_here",
    "user": {
      "id": 1,
      "username": "admin"
    }
  }
}
```

### 4.2 使用 Token

在请求头中添加 Authorization 字段：

```bash
curl -X GET \
  'http://localhost:5000/api/worktool/robot/info?robotId=your_robot_id' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

## 五、测试说明

### 5.1 运行测试脚本

```bash
# 设置测试机器人 ID
export TEST_ROBOT_ID=your_robot_id

# 运行测试
node server/scripts/test-worktool-api.js
```

### 5.2 测试结果

测试脚本会检查以下内容：
- ✅ 机器人状态回调（上线）
- ✅ 机器人状态回调（下线）
- ✅ 机器人上线回调（兼容性路由）
- ✅ 机器人下线回调（兼容性路由）
- ✅ 获取机器人信息 API
- ✅ 查询机器人在线状态 API
- ✅ 查询登录日志 API
- ✅ 查询指令消息 API
- ✅ 查询指令执行结果 API
- ✅ 查询消息回调日志 API

---

## 六、常见问题

### 6.1 回调签名验证失败

**问题**: 回调请求返回 403 错误，提示签名验证失败

**解决方案**:
1. 检查 `CALLBACK_SIGNATURE_SECRET` 环境变量是否配置正确
2. 检查 WorkTool 机器人配置中的签名密钥是否与系统配置一致
3. 如果不需要签名验证，可以在代码中禁用（不推荐）

### 6.2 机器人不存在

**问题**: 回调请求返回 404 错误，提示机器人不存在

**解决方案**:
1. 检查数据库中是否存在对应的机器人记录
2. 检查请求 URL 中的 `robotId` 参数是否正确
3. 确认机器人的 `is_active` 字段为 `true`

### 6.3 API 调用失败

**问题**: 调用 WorkTool API 返回错误

**解决方案**:
1. 检查机器人配置中的 `apiBaseUrl` 是否正确
2. 检查机器人是否在线
3. 查看日志文件，获取详细错误信息

### 6.4 未授权访问

**问题**: 调用 API 返回 401 错误

**解决方案**:
1. 确保请求头中包含有效的 Token
2. 检查 Token 是否过期
3. 重新登录获取新的 Token

---

## 七、支持

如有问题，请联系技术支持或查看以下文档：
- [WorkTool API 检查报告](./WORKTOOL_API_CHECK_REPORT.md)
- [系统文档](../README.md)
