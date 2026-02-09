# WorkTool API 规范对比分析

## 📋 概述

本文档对比了当前系统的API结构与WorkTool标准API规范，分析是否符合要求。

---

## 🔗 第一部分：WorkTool主动推送给我们（回调地址）

### 1. 消息回调

**标准格式：**
```
POST https://n2hsd37kxc.coze.site/api/worktool/callback/message?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
POST /api/worktool/callback/message
```

**✅ 符合规范**

---

### 2. 执行结果回调

**标准格式：**
```
POST https://n2hsd37kxc.coze.site/api/worktool/callback/result?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
POST /api/worktool/callback/result
```

**✅ 符合规范**

---

### 3. 群二维码回调

**标准格式：**
```
POST https://n2hsd37kxc.coze.site/api/worktool/callback/qrcode?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
POST /api/worktool/callback/qrcode
```

**✅ 符合规范**

---

### 4. 机器人上线回调

**标准格式：**
```
POST https://n2hsd37kxc.coze.site/api/worktool/callback/status?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
POST /api/worktool/callback/robot-online
POST /api/worktool/callback/robot-offline
POST /api/worktool/callback/robot-status
```

**⚠️ 部分符合**
- 当前系统有3个独立的端点：`robot-online`, `robot-offline`, `robot-status`
- 标准规范可能使用统一的 `status` 端点，通过参数区分上线/下线

---

### 回调地址总结

| 功能 | 标准格式 | 当前系统 | 状态 |
|------|---------|---------|------|
| 消息回调 | `/api/worktool/callback/message` | `/api/worktool/callback/message` | ✅ 符合 |
| 执行结果回调 | `/api/worktool/callback/result` | `/api/worktool/callback/result` | ✅ 符合 |
| 群二维码回调 | `/api/worktool/callback/qrcode` | `/api/worktool/callback/qrcode` | ✅ 符合 |
| 机器人状态回调 | `/api/worktool/callback/status` | `/api/worktool/callback/robot-*` | ⚠️ 部分符合 |

---

## 🔗 第二部分：我们主动调用WorkTool（发送地址）

### 1. 发送消息

**标准格式：**
```
POST https://api.worktool.ymdyes.cn/wework/sendRawMessage?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
需要查看 worktool-conversion-robot.api.js 或 worktool-send-oss-image.api.js
```

---

### 2. 机器人后端通讯加密地址

**标准格式：**
```
POST https://api.worktool.ymdyes.cn/robot/robotInfo/update?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
需要查看 robot-protected.api.js
```

---

### 3. 获取机器人信息

**标准格式：**
```
GET https://api.worktool.ymdyes.cn/robot/robotInfo/get?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
需要查看 robot-protected.api.js
```

---

### 4. 查询机器人是否在线

**标准格式：**
```
GET https://api.worktool.ymdyes.cn/robot/robotInfo/online?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
需要查看 robot-protected.api.js
```

---

### 5. 查询机器人登录日志

**标准格式：**
```
GET https://api.worktool.ymdyes.cn/robot/robotInfo/onlineInfos?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
需要查看 robot-protected.api.js
```

---

### 6. 指令消息API调用查询

**标准格式：**
```
GET https://api.worktool.ymdyes.cn/wework/listRawMessage?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
需要查看相关API
```

---

### 7. 指令执行结果查询

**标准格式：**
```
GET https://api.worktool.ymdyes.cn/robot/rawMsg/list?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
需要查看 robot-command.api.js
```

---

### 8. 机器人消息回调日志列表查询

**标准格式：**
```
GET https://api.worktool.ymdyes.cn/robot/qaLog/list?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

**当前系统：**
```
需要查看 qa.api.js
```

---

## 📊 API 对比总结

### ✅ 已符合规范的API

| API | 路径 | 状态 |
|-----|------|------|
| 消息回调 | `/api/worktool/callback/message` | ✅ 完全符合 |
| 执行结果回调 | `/api/worktool/callback/result` | ✅ 完全符合 |
| 群二维码回调 | `/api/worktool/callback/qrcode` | ✅ 完全符合 |

### ⚠️ 部分符合规范的API

| API | 标准路径 | 当前路径 | 问题 |
|-----|---------|---------|------|
| 机器人状态回调 | `/api/worktool/callback/status` | `/api/worktool/callback/robot-*` | 路径不一致 |

### ❓ 待确认的API

| 功能 | 标准路径 | 需要检查的文件 |
|------|---------|---------------|
| 发送消息 | `/wework/sendRawMessage` | `worktool-conversion-robot.api.js` |
| 机器人信息更新 | `/robot/robotInfo/update` | `robot-protected.api.js` |
| 获取机器人信息 | `/robot/robotInfo/get` | `robot-protected.api.js` |
| 查询机器人在线状态 | `/robot/robotInfo/online` | `robot-protected.api.js` |
| 查询登录日志 | `/robot/robotInfo/onlineInfos` | `robot-protected.api.js` |
| 指令消息查询 | `/wework/listRawMessage` | 待确认 |
| 指令执行结果查询 | `/robot/rawMsg/list` | `robot-command.api.js` |
| 消息回调日志查询 | `/robot/qaLog/list` | `qa.api.js` |

---

## 🔧 建议的调整方案

### 1. 机器人状态回调统一

**当前实现：**
```javascript
POST /api/worktool/callback/robot-online
POST /api/worktool/callback/robot-offline
POST /api/worktool/callback/robot-status
```

**建议改为：**
```javascript
POST /api/worktool/callback/status?robotId={robotId}
```

通过请求体中的 `status` 字段区分上线/下线：
```json
{
  "status": "online|offline",
  "timestamp": "..."
}
```

### 2. 验证发送地址API

需要检查以下文件，确保API路径符合规范：

1. `worktool-conversion-robot.api.js` - 发送消息
2. `robot-protected.api.js` - 机器人信息相关
3. `robot-command.api.js` - 指令执行结果
4. `qa.api.js` - 消息回调日志

### 3. 统一参数传递方式

标准规范使用查询参数 `robotId`：
```
?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

需要确认当前系统是否也使用相同的参数传递方式。

---

## 🎯 下一步行动

### 立即执行

1. ✅ 检查当前系统的API路由结构
2. ✅ 对比WorkTool标准规范
3. ⏳ 生成详细的API对比报告

### 待确认

1. 查看所有API文件的详细实现
2. 确认发送地址的API是否完整
3. 验证参数传递方式是否一致

### 需要调整

1. 统一机器人状态回调的API路径
2. 确保所有发送地址API符合规范
3. 验证所有参数名称和传递方式

---

## 📝 结论

当前系统的回调地址（接收WorkTool推送）**基本符合**WorkTool标准规范，只有机器人状态回调需要微调。

发送地址（主动调用WorkTool）的API需要进一步确认，确保路径、参数、返回值格式完全符合规范。

---

**生成时间**: 2026年2月9日
**文档版本**: v1.0
