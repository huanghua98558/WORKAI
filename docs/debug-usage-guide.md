# 调试功能使用指南

## 使用流程

### 1. 打开调试功能

点击页面右上角的"调试功能"按钮，打开调试对话框。

### 2. 选择机器人

**重要**：所有调试操作都必须先选择机器人！

1. 在机器人选择界面，你会看到所有已启用的机器人列表
2. 只能选择**在线**状态的机器人（蓝色边框）
3. 离线机器人无法选择（灰色边框，不可点击）
4. 点击你要调试的机器人卡片

### 3. 使用调试功能

选择机器人后，可以使用以下功能：

#### 发送消息测试
- 选择发送类型：私聊或群聊
- 输入接收方（好友昵称或群名称）
- 输入消息内容
- 点击"发送消息"按钮

#### 群操作
- 选择操作类型：创建群、修改群、解散群
- 填写相关参数
- 点击"执行操作"按钮

#### 推送文件
- 输入接收方
- 选择文件类型
- 输入文件 URL
- 点击"推送文件"按钮

#### 查看执行结果
- 查看当前机器人的执行记录
- 点击记录可以查看详细信息
- 支持搜索功能

### 4. 切换机器人

如需调试其他机器人：
1. 点击机器人信息旁边的"切换机器人"按钮
2. 返回机器人选择界面
3. 选择新的机器人

## 常见问题

### 问题1：提示"缺少必要参数：robotId"

**原因**：没有选择机器人或机器人选择失败

**解决方法**：
1. 确保打开了机器人选择界面
2. 选择一个在线的机器人
3. 确认选择后能看到机器人的名称和状态
4. 如果还是失败，刷新页面重试

### 问题2：没有可用的机器人

**原因**：没有添加或启用机器人

**解决方法**：
1. 关闭调试对话框
2. 进入"机器人管理"页面
3. 添加机器人并配置正确的 Robot ID 和 API 地址
4. 确保机器人状态为"在线"
5. 启用机器人（打开开关）
6. 重新打开调试功能

### 问题3：无法选择某个机器人

**原因**：机器人可能处于离线状态

**解决方法**：
1. 在"机器人管理"页面检查机器人状态
2. 点击"刷新"按钮更新机器人状态
3. 确保机器人在线后再进行调试

### 问题4：发送消息失败

**可能原因**：
- 机器人未正确连接
- 接收方名称错误
- 机器人被 WorkTool 限制

**解决方法**：
1. 检查机器人状态是否为"在线"
2. 确认接收方名称准确
3. 查看"执行结果"标签页的错误信息
4. 检查后端日志：`tail -f /app/work/logs/bypass/app.log`

## 调试日志

### 前端日志

打开浏览器开发者工具（F12），切换到 Console 标签，可以看到以下日志：

- `[debug-dialog] 选择机器人:` - 显示选择的机器人信息
- `[debug-dialog] 更新消息表单:` - 显示表单状态
- `[debug-dialog] 准备发送消息，当前表单状态:` - 显示发送前的表单数据
- `[debug-dialog] 发送请求到后端:` - 显示发送给后端的数据
- `[debug-dialog] 后端响应:` - 显示后端的响应

### 后端日志

查看后端日志：
```bash
tail -f /app/work/logs/bypass/app.log
```

关键日志：
- `[debug.api.js] 发送消息请求:` - 显示收到的请求参数
- `[debug.api.js] 缺少 robotId 参数` - 如果 robotId 缺失

## 技术说明

### 数据流程

```
用户选择机器人
    ↓
handleSelectRobot(robot)
    ↓
更新 messageForm.robotId = robot.robotId
    ↓
用户点击发送消息
    ↓
handleSendMessage()
    ↓
发送 POST /api/proxy/admin/debug/send-message
    ↓
包含参数：robotId, messageType, recipient, content
    ↓
后端验证并调用 WorkTool API
```

### 关键代码

**前端设置 robotId：**
```javascript
const handleSelectRobot = (robot: any) => {
  setSelectedRobot(robot);
  setShowRobotSelection(false);
  setMessageForm(prev => ({
    ...prev,
    robotId: robot.robotId  // ← 这里设置 robotId
  }));
};
```

**前端发送请求：**
```javascript
const payload = {
  robotId: messageForm.robotId,  // ← 这里传递 robotId
  messageType: messageForm.messageType,
  recipient: messageForm.recipient,
  content: messageForm.content
};
```

**后端验证：**
```javascript
const { robotId, messageType, recipient, content } = request.body;

if (!robotId) {
  return reply.status(400).send({
    code: -1,
    message: '缺少必要参数：robotId'
  });
}
```

## 注意事项

1. **必须先选择机器人**：所有调试操作都需要先选择机器人
2. **只能选择在线机器人**：离线机器人无法使用
3. **每个调试操作都使用选择的机器人**：不会自动切换
4. **切换机器人会清空表单**：需要重新填写表单数据
5. **执行结果只显示当前机器人**：查看其他机器人的记录需要切换机器人

## 获取帮助

如果遇到问题：
1. 查看前端 Console 日志
2. 查看后端日志文件
3. 检查机器人状态
4. 尝试刷新页面重试
