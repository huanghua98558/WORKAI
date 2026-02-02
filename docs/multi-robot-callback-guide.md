# 多机器人回调配置指南

## 📋 问题说明

当您需要在 WorkTool 平台配置多个机器人使用同一个 AI 中枢系统时，每个机器人都需要配置回调地址。本指南将详细说明如何正确配置。

## 🎯 配置原理

### 当前架构
- **统一回调基础地址**：所有机器人共享同一个回调基础地址
- **通过 robotId 参数区分**：每个机器人的回调地址通过 URL 参数 `robotId` 来区分
- **服务器端路由**：服务器根据 `robotId` 参数识别是哪个机器人发送的消息

## 🔧 配置步骤

### 1. 在系统中配置回调基础地址

在 WorkTool AI 中枢系统的"回调中心"页面，配置基础回调地址：

```
https://n2hsd37kxc.coze.site
```

系统会自动生成以下回调地址：

```
消息回调: https://n2hsd37kxc.coze.site/api/worktool/callback/message
指令结果: https://n2hsd37kxc.coze.site/api/worktool/callback/action-result
群二维码: https://n2hsd37kxc.coze.site/api/worktool/callback/group-qrcode
机器人状态: https://n2hsd37kxc.coze.site/api/worktool/callback/robot-status
```

### 2. 为每个机器人配置回调地址

在 WorkTool 平台上，为每个机器人配置回调时，**必须**在回调地址后添加 `?robotId=xxx` 参数：

#### 机器人 A（robotId: wt22phhjpt2xboerspxsote472xdnyq2）

```
消息回调: https://n2hsd37kxc.coze.site/api/worktool/callback/message?robotId=wt22phhjpt2xboerspxsote472xdnyq2
指令结果: https://n2hsd37kxc.coze.site/api/worktool/callback/action-result?robotId=wt22phhjpt2xboerspxsote472xdnyq2
群二维码: https://n2hsd37kxc.coze.site/api/worktool/callback/group-qrcode?robotId=wt22phhjpt2xboerspxsote472xdnyq2
机器人状态: https://n2hsd37kxc.coze.site/api/worktool/callback/robot-status?robotId=wt22phhjpt2xboerspxsote472xdnyq2
```

#### 机器人 B（robotId: abc123xyz456）

```
消息回调: https://n2hsd37kxc.coze.site/api/worktool/callback/message?robotId=abc123xyz456
指令结果: https://n2hsd37kxc.coze.site/api/worktool/callback/action-result?robotId=abc123xyz456
群二维码: https://n2hsd37kxc.coze.site/api/worktool/callback/group-qrcode?robotId=abc123xyz456
机器人状态: https://n2hsd37kxc.coze.site/api/worktool/callback/robot-status?robotId=abc123xyz456
```

### 3. 在系统中添加机器人

在 WorkTool AI 中枢系统的"机器人管理"页面，添加所有机器人：

1. 点击"添加机器人"
2. 填写机器人信息：
   - **机器人名称**：自定义（如"客服机器人"、"销售机器人"）
   - **Robot ID**：从 WorkTool 平台获取（必须与回调URL中的robotId一致）
   - **API Base URL**：从 WorkTool 平台获取
   - **描述**：可选
3. 保存后系统会自动验证机器人配置

## ⚠️ 重要注意事项

### 1. robotId 必须匹配
- 回调URL中的 `robotId` 参数必须与系统中配置的 Robot ID 完全一致
- 如果不匹配，系统将无法识别该机器人，会返回 404 错误

### 2. 所有回调类型都需要配置
WorkTool 有多种回调类型，每种都需要配置：
- **消息回调**（必需）：处理用户消息
- **指令结果回调**（可选）：接收指令执行结果
- **群二维码回调**（可选）：接收群二维码事件
- **机器人状态回调**（可选）：接收机器人上下线状态

### 3. 回调地址变更时同步更新
如果您修改了回调基础地址，所有机器人的回调地址都需要更新。

### 4. 启用/禁用机器人
- 在系统中可以启用或禁用某个机器人
- 禁用的机器人不会处理消息，但回调地址仍然需要配置（WorkTool 要求）

## 🔍 验证配置

### 测试回调连接

在 WorkTool AI 中枢系统的"回调中心"页面，点击"测试所有回调"按钮，系统会测试所有配置的回调地址是否可访问。

### 查看机器人状态

在"机器人管理"页面，可以查看每个机器人的在线状态、最后检查时间等信息。

### 查看回调历史

在"监控告警"页面，可以查看所有回调的执行历史和错误日志。

## 📝 配置示例 JSON

如果您需要批量配置多个机器人，可以使用以下 JSON 格式：

```json
{
  "baseUrl": "https://n2hsd37kxc.coze.site",
  "robots": [
    {
      "name": "客服机器人",
      "robotId": "wt22phhjpt2xboerspxsote472xdnyq2",
      "apiBaseUrl": "https://api.worktool.ymdyes.cn/wework/",
      "callbacks": {
        "message": "https://n2hsd37kxc.coze.site/api/worktool/callback/message?robotId=wt22phhjpt2xboerspxsote472xdnyq2",
        "actionResult": "https://n2hsd37kxc.coze.site/api/worktool/callback/action-result?robotId=wt22phhjpt2xboerspxsote472xdnyq2",
        "groupQrcode": "https://n2hsd37kxc.coze.site/api/worktool/callback/group-qrcode?robotId=wt22phhjpt2xboerspxsote472xdnyq2",
        "robotStatus": "https://n2hsd37kxc.coze.site/api/worktool/callback/robot-status?robotId=wt22phhjpt2xboerspxsote472xdnyq2"
      }
    },
    {
      "name": "销售机器人",
      "robotId": "abc123xyz456",
      "apiBaseUrl": "https://api.worktool.ymdyes.cn/wework/",
      "callbacks": {
        "message": "https://n2hsd37kxc.coze.site/api/worktool/callback/message?robotId=abc123xyz456",
        "actionResult": "https://n2hsd37kxc.coze.site/api/worktool/callback/action-result?robotId=abc123xyz456",
        "groupQrcode": "https://n2hsd37kxc.coze.site/api/worktool/callback/group-qrcode?robotId=abc123xyz456",
        "robotStatus": "https://n2hsd37kxc.coze.site/api/worktool/callback/robot-status?robotId=abc123xyz456"
      }
    }
  ]
}
```

## ❓ 常见问题

### Q1: 为什么需要添加 robotId 参数？
A: 因为多个机器人共享同一个回调服务器，服务器需要通过 robotId 来区分是哪个机器人发送的消息，以便正确处理和回复。

### Q2: 可以不添加 robotId 参数吗？
A: 不可以。系统强制要求 robotId 参数，如果没有该参数，服务器会返回 400 错误。

### Q3: 修改基础回调地址后，所有机器人的回调都需要更新吗？
A: 是的。因为每个机器人的回调地址都是基于基础回调地址生成的。不过您可以使用 WorkTool 的批量更新功能来简化操作。

### Q4: 如何区分不同机器人的消息？
A: 系统会根据回调URL中的 robotId 参数自动识别，并在会话管理中记录每个消息的来源机器人。

### Q5: 一个机器人可以配置多个回调地址吗？
A: 不可以。每个机器人在 WorkTool 平台上只能配置一个回调地址。但一个回调地址可以处理多个机器人的消息（通过 robotId 参数区分）。

## 📞 技术支持

如果配置过程中遇到问题，请参考以下资源：
- 系统日志：查看 `/app/work/logs/bypass/backend.log`
- 回调历史：在"监控告警"页面查看
- 机器人状态：在"机器人管理"页面查看

或联系技术支持：
- 手机：13337289759
- 微信：xhy12040523
- QQ：1823985558
