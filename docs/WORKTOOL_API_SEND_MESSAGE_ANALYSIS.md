# 会话管理发送消息功能分析

## 执行日期
2025-01-14

## 分析目的

分析会话管理页面是否已经有发送消息功能，以及与 WorkTool API 的关系。

---

## 一、现有发送消息功能分析

### 1.1 调试 API

**API 路径**: `POST /api/admin/debug/send-message`

**文件**: `server/routes/debug.api.js`

**功能**: 发送消息给企业微信用户

**支持的消息类型**:
- `private`: 私聊消息
- `group`: 群聊消息

**请求参数**:
```javascript
{
  robotId: "机器人ID",
  messageType: "private" | "group",
  recipient: "接收者姓名或群组名",
  content: "消息内容"
}
```

---

### 1.2 实现方式

**调用服务**: `server/services/worktool.service.js`

**方法**:
- `sendPrivateMessage(robotId, userName, content)` - 发送私聊消息
- `sendGroupMessage(robotId, groupName, content, atList)` - 发送群消息
- `sendBatchMessages(robotId, messages)` - 批量发送消息

**底层实现**:
```javascript
// 调用 WorkTool 的 /wework/sendRawMessage API
const baseUrl = robot.apiBaseUrl.replace(/\/wework\/?$/, '').replace(/\/$/, '');
const apiUrl = `${baseUrl}/wework/sendRawMessage`;

const response = await axios.post(apiUrl, requestBody, {
  headers: {
    'Content-Type': 'application/json'
  },
  params: {
    robotId: robotId
  }
});
```

**请求格式**:
```javascript
{
  socketType: 2,
  list: [
    {
      type: 203,
      titleList: [接收者姓名],
      receivedContent: 消息内容,
      atList: [] // 可选
    }
  ]
}
```

---

## 二、与新建 WorkTool API 的对比

### 2.1 现有实现

| 特性 | 现有实现 |
|-----|---------|
| API 路径 | `/api/admin/debug/send-message` |
| 调用服务 | `worktool.service.js` |
| 底层 API | `/wework/sendRawMessage` |
| 请求格式 | WorkTool 特定格式（socketType, list, type: 203） |
| 支持消息类型 | 私聊、群聊、批量 |
| 前端调用 | 未知（未找到前端调用示例） |
| 认证 | 可能需要 admin 权限 |

### 2.2 新建 API

| 特性 | 新建 API |
|-----|---------|
| API 路径 | `/api/worktool/robot/send-message` |
| 调用服务 | `worktool-api.service.js` |
| 底层 API | `/wework/sendRawMessage` |
| 请求格式 | WorkTool 标准格式（toName, content, messageType） |
| 支持消息类型 | 文本、图片、视频等 |
| 前端调用 | 计划在会话管理页面调用 |
| 认证 | 需要 JWT 认证 |

---

## 三、差异分析

### 3.1 请求格式差异

**现有实现**:
```javascript
{
  robotId: "xxx",
  messageType: "private",
  recipient: "张三",
  content: "你好"
}
```

**转换为 WorkTool 格式**:
```javascript
{
  socketType: 2,
  list: [
    {
      type: 203,
      titleList: ["张三"],
      receivedContent: "你好"
    }
  ]
}
```

**新建 API**:
```javascript
{
  robotId: "xxx",
  toName: "张三",
  content: "你好",
  messageType: 1  // 1=文本
}
```

**转换为 WorkTool 格式**:
```javascript
{
  socketType: 2,
  list: [
    {
      type: 203,
      titleList: ["张三"],
      receivedContent: "你好"
    }
  ]
}
```

### 3.2 功能差异

| 功能 | 现有实现 | 新建 API |
|-----|---------|---------|
| 发送私聊消息 | ✅ | ✅ |
| 发送群聊消息 | ✅ | ✅ |
| 批量发送消息 | ✅ | ❌ |
| @功能 | ✅ | ❌ |
| 图片消息 | ❓ | ✅ |
| 视频消息 | ❓ | ✅ |
| 调试用途 | ✅ | ❌ |
| 生产用途 | ❌ | ✅ |

---

## 四、建议方案

### 方案 A：使用现有 API

**优点**:
- ✅ 已经实现，无需开发
- ✅ 支持批量发送
- ✅ 支持 @ 功能

**缺点**:
- ❌ API 路径不清晰（debug 路径）
- ❌ 请求格式特殊
- ❌ 不支持图片、视频等
- ❌ 可能需要 admin 权限
- ❌ 不符合 WorkTool 标准格式

**适用场景**:
- 调试和测试
- 批量发送消息

---

### 方案 B：使用新建 API

**优点**:
- ✅ API 路径清晰（worktool/robot/send-message）
- ✅ 符合 WorkTool 标准格式
- ✅ 支持图片、视频等
- ✅ 使用 JWT 认证
- ✅ 适合生产环境

**缺点**:
- ❌ 需要开发
- ❌ 不支持批量发送
- ❌ 不支持 @ 功能

**适用场景**:
- 会话管理页面发送消息
- 用户主动发送消息

---

### 方案 C：保留两者，分工明确

**现有 API**: 用于调试和批量发送
- 路径: `/api/admin/debug/send-message`
- 用途: 调试、批量发送、@ 功能

**新建 API**: 用于会话管理
- 路径: `/api/worktool/robot/send-message`
- 用途: 会话管理页面、用户发送消息

---

## 五、推荐方案

**推荐方案 C：保留两者，分工明确**

**理由**:
1. **功能互补**: 现有 API 支持批量发送和 @ 功能，新建 API 支持图片视频
2. **用途明确**: 现有 API 用于调试，新建 API 用于生产环境
3. **避免重复**: 两个 API 各有侧重，不会完全重复

---

## 六、前端对接方案修正

### 6.1 会话管理页面发送消息

**推荐使用**: 新建 API (`/api/worktool/robot/send-message`)

**理由**:
- 符合 WorkTool 标准格式
- 支持图片、视频等
- 使用 JWT 认证
- 适合生产环境

**实现位置**: `src/components/business-message-monitor.tsx`

**新增组件**: `src/components/robot/worktool-message-sender.tsx`

**使用场景**:
- 用户在会话管理页面发送消息
- 支持文本、图片、视频

---

### 6.2 批量发送功能

**推荐使用**: 现有 API (`/api/admin/debug/send-message`)

**理由**:
- 已实现批量发送功能
- 支持 @ 功能
- 适合批量操作

**实现位置**: 可以在机器人管理页面或单独的批量发送页面

**使用场景**:
- 管理员批量发送消息
- 支持 @ 功能

---

## 七、总结

### 7.1 现有情况

系统中已经有一个发送消息功能，但它：
- 使用调试 API 路径 (`/api/admin/debug/send-message`)
- 调用的是 `worktool.service.js`
- 使用的是特殊的请求格式
- 主要用于调试和批量发送

### 7.2 新建 API 的价值

新建 API 的价值在于：
- 符合 WorkTool 标准格式
- 支持图片、视频等
- 使用 JWT 认证
- 适合会话管理页面

### 7.3 建议保留两者

两个 API 各有侧重，应该保留：
- 现有 API：调试、批量发送
- 新建 API：会话管理、用户发送

### 7.4 前端对接方案

**会话管理页面**: 使用新建 API
**批量发送功能**: 使用现有 API

---

## 八、后续行动

1. ✅ 分析完成
2. ⏳ 实现新建 API 的前端对接（会话管理页面）
3. ⏳ 保留现有 API，用于调试和批量发送
4. ⏳ 在文档中说明两个 API 的用途
