# 监控告警系统使用指南

## 系统概述

监控告警系统是一个全栈监控与通知解决方案，支持：
- ✅ 数据库监控（慢查询、连接数、事务死锁）
- ✅ 服务器监控（CPU、内存、磁盘）
- ✅ 接口监控（响应时间、成功率）
- ✅ 业务监控（订单量、错误率）
- 🤖 机器人私发消息通知
- 🔔 网页弹窗+声音提醒
- 📊 接收者管理与去重限流
- 🔄 WebSocket 实时推送

## 技术架构

### 后端（5001端口）
- Fastify 框架
- PostgreSQL 数据库
- Drizzle ORM
- WebSocket 服务器
- 规则引擎（每分钟检查）

### 前端（5000端口）
- Next.js 16
- React 19
- TypeScript
- Shadcn UI
- WebSocket 客户端

## 数据库表结构

### 核心表
1. **alertRecipients** - 告警接收者
2. **alertRules** - 告警规则
3. **alertHistory** - 告警历史
4. **alertDedupRecords** - 去重记录
5. **alertNotifications** - 通知记录
6. **userNotificationPreferences** - 用户通知偏好

## 页面导航

### 1. 告警接收者管理
- **路径**：`/alerts/recipients`
- **功能**：
  - 添加接收者（关联用户和机器人）
  - 配置告警级别过滤
  - 管理机器人列表
  - 编辑和删除接收者

### 2. 告警规则管理
- **路径**：`/alerts/rules`
- **功能**：
  - 创建监控规则
  - 配置阈值和条件
  - 设置告警级别
  - 启用/禁用规则
  - 查看规则执行历史

### 3. 告警中心
- **路径**：`/alerts/center`
- **功能**：
  - 查看所有告警历史
  - 按级别、时间、规则筛选
  - 确认和关闭告警
  - 查看告警详情和通知状态

### 4. 通知设置
- **路径**：`/settings/notifications`
- **功能**：
  - 启用/禁用网页通知
  - 配置 Toast/Modal 弹窗
  - 调整声音音量
  - 按级别过滤通知
  - 测试通知效果

## 使用流程

### 1. 添加接收者
```
1. 进入"告警接收者"页面
2. 点击"添加接收者"
3. 输入用户ID和接收者名称
4. 选择关联的机器人（可多选）
5. 配置告警级别过滤（Critical/Warning/Info）
6. 保存
```

### 2. 创建告警规则
```
1. 进入"告警规则"页面
2. 点击"创建规则"
3. 填写规则名称和描述
4. 选择监控类型（数据库/服务器/接口/业务）
5. 配置监控指标和阈值
6. 设置告警级别
7. 选择关联的接收者
8. 保存并启用规则
```

### 3. 配置通知偏好
```
1. 进入"通知设置"页面
2. 启用网页通知和声音
3. 选择通知方式（Toast/Modal）
4. 配置不同级别的通知偏好
5. 测试通知效果
```

### 4. 监控和处理告警
```
1. 进入"告警中心"页面
2. 查看实时告警列表
3. 点击"查看详情"查看完整信息
4. 点击"确认"标记已读
5. 点击"关闭"归档告警
6. 使用筛选器快速查找
```

## 告警级别说明

### Info（信息）
- **图标**：ℹ️
- **颜色**：蓝色
- **用途**：一般性提示
- **通知方式**：Toast + 声音（可配置）
- **示例**：系统状态变更

### Warning（警告）
- **图标**：⚠️
- **颜色**：黄色
- **用途**：需要关注的异常
- **通知方式**：Toast + 声音（可配置）
- **示例**：CPU 使用率超过 80%

### Critical（紧急）
- **图标**：🚨
- **颜色**：红色
- **用途**：需要立即处理的问题
- **通知方式**：Modal 强制弹窗 + 声音
- **示例**：数据库连接失败

## 去重与限流

### 去重机制
- **冷却时间**：默认 5 分钟
- **去重 Key**：规则ID + 监控类型 + 指标名称
- **效果**：相同告警在冷却期内不会重复发送

### 限流机制
- **限制**：单用户针对单规则最多 3 次通知
- **效果**：避免告警风暴
- **重置**：规则编辑或停用后重置

## 通知方式

### 机器人私发消息
- 通过 WorkTool API 的 `send_private_message` 指令
- 接收者配置的机器人会发送私聊消息
- 包含告警详情和处理建议

### 网页弹窗
- **Toast**：右上角轻量提示，可自动关闭
- **Modal**：紧急告警强制弹窗，需手动关闭
- 支持声音提醒

### 浏览器系统通知
- 页面最小化时可用
- 请求通知权限后启用

## WebSocket 实时推送

### 连接
- **地址**：`ws://localhost:5001/ws`
- **自动重连**：失败后自动重连（最多 5 次）
- **心跳机制**：每 30 秒发送 ping

### 消息格式
```typescript
{
  type: 'alert' | 'pong',
  data: {
    id: string,
    ruleId: string,
    level: 'info' | 'warning' | 'critical',
    message: string,
    details: object,
    timestamp: string
  }
}
```

## 声音文件

### 必需文件
- `public/sounds/info.mp3` - Info 提示音
- `public/sounds/warning.mp3` - Warning 提示音
- `public/sounds/critical.mp3` - Critical 提示音

### 降级方案
如果声音文件不存在，系统会使用浏览器内置的语音合成功能。

详见 [SOUND_FILES.md](./SOUND_FILES.md)

## API 接口

### 接收者管理
- `POST /api/alerts/recipients` - 创建接收者
- `GET /api/alerts/recipients` - 获取接收者列表
- `PUT /api/alerts/recipients/:id` - 更新接收者
- `DELETE /api/alerts/recipients/:id` - 删除接收者

### 规则管理
- `POST /api/alerts/rules` - 创建规则
- `GET /api/alerts/rules` - 获取规则列表
- `PUT /api/alerts/rules/:id` - 更新规则
- `DELETE /api/alerts/rules/:id` - 删除规则
- `GET /api/alerts/rules/:id/history` - 获取规则执行历史

### 告警中心
- `GET /api/alerts/history` - 获取告警历史
- `POST /api/alerts/:id/acknowledge` - 确认告警
- `POST /api/alerts/:id/close` - 关闭告警

### 通知偏好
- `GET /api/user/notification-preferences` - 获取用户偏好
- `PUT /api/user/notification-preferences` - 更新用户偏好

## 故障排查

### WebSocket 连接失败
1. 检查后端服务是否运行（5001端口）
2. 查看浏览器控制台错误信息
3. 检查网络连接

### 通知不显示
1. 检查通知设置是否启用
2. 检查告警级别过滤
3. 查看浏览器通知权限

### 声音不播放
1. 检查声音文件是否存在
2. 检查浏览器音频权限
3. 检查系统音量设置

### 机器人消息未发送
1. 检查机器人是否正确配置
2. 检查 WorkTool API 连接
3. 查看后端日志

## 开发建议

### 添加新的监控类型
1. 在 `server/services/alert-rule-engine.service.js` 中添加检测逻辑
2. 在 `src/app/alerts/rules/page.tsx` 中添加表单选项
3. 更新数据库 schema（如需要）

### 自定义通知模板
1. 修改 `server/services/alert-trigger-enhanced.service.js` 中的消息模板
2. 支持使用变量：`{level}`, `{message}`, `{details}`, `{timestamp}`

### 扩展告警级别
1. 更新 `server/database/schema.js` 中的枚举类型
2. 更新前端组件中的级别配置
3. 添加对应的声音文件和图标

## 许可证

MIT License
