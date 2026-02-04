# 监控告警系统功能说明

## 系统概述

监控告警系统是一个全栈监控与通知解决方案，已集成到现有的企业微信社群智能运营平台中。

## 已完成功能

### 前端功能

#### 1. 告警规则管理页面
- **路径**: `/alerts/rules`
- **功能**:
  - 查看所有告警规则
  - 创建新规则
  - 编辑现有规则
  - 删除规则
  - 启用/禁用规则
- **特性**:
  - 支持多种监控类型（垃圾信息、风险内容、管理指令、关键词）
  - 支持三种告警级别（info、warning、critical）
  - 可配置告警阈值和冷却时间
  - 自定义消息模板

#### 2. 告警中心页面
- **路径**: `/alerts/center`
- **功能**:
  - 查看所有告警历史
  - 按级别和状态筛选告警
  - 查看告警详情
  - 处理告警（标记为已处理）
  - 实时刷新（每30秒）
- **特性**:
  - 统计卡片显示告警概况
  - 多维度筛选
  - 告警详情对话框
  - 处理时间线

#### 3. 告警统计页面
- **路径**: `/alerts/stats`
- **功能**:
  - 显示告警总数和各状态统计
  - 告警趋势图（最近7天）
  - 告警级别分布图
- **特性**:
  - 实时数据
  - 可视化图表
  - 百分比显示

#### 4. 通知设置页面
- **路径**: `/settings/notifications`
- **功能**:
  - 配置网页通知（Toast、Modal）
  - 配置声音通知
  - 调整音量
  - 按级别过滤通知
  - 测试通知效果
- **特性**:
  - WebSocket连接状态监控
  - 实时测试
  - 三级配置（通用、级别、测试）

#### 5. 监控页面集成
- **路径**: `/monitoring`
- **功能**:
  - 显示待处理告警卡片
  - 实时刷新（每10秒）
  - 快速跳转到告警中心
- **特性**:
  - 与监控大屏联动
  - 告警数量徽章
  - 告警级别图标

### 后端功能

#### 1. 现有API（已存在）
- `GET /api/alerts/rules` - 获取所有告警规则
- `POST /api/alerts/rules` - 创建/更新告警规则
- `GET /api/alerts/history` - 获取告警历史
- `PUT /api/alerts/history/:id/handle` - 处理告警
- `GET /api/alerts/stats` - 获取告警统计

#### 2. WebSocket服务
- **路径**: `/ws`
- **功能**:
  - 实时推送告警消息
  - 心跳机制（每30秒）
  - 自动重连
- **特性**:
  - 客户端管理
  - 连接状态监控

### 通知组件

#### 1. WebSocket客户端 (`src/lib/alert-websocket.ts`)
- 自动连接和重连
- 心跳保活
- 消息解析和分发

#### 2. 声音播放器 (`src/lib/sound-player.ts`)
- 支持Web Audio API
- 支持HTML Audio
- 浏览器内置语音合成（降级方案）

#### 3. 通知组件
- `NotificationProvider` - 通知上下文管理
- `ToastNotification` - 轻量级提示
- `ModalNotification` - 紧急告警弹窗
- `NotificationCenter` - 告警历史管理

## 数据库表结构

### 告警规则表 (alert_rules)
- 规则配置
- 监控类型和阈值
- 告警级别
- 冷却时间
- 消息模板

### 告警历史表 (alert_history)
- 告警记录
- 触发详情
- 处理状态
- 时间线

### 告警接收者表 (alert_recipients)
- 接收者配置
- 关联机器人
- 告警级别过滤

### 用户通知偏好表 (user_notification_preferences)
- 网页通知设置
- Toast/Modal配置
- 声音设置
- 级别过滤

## 系统联动

### 1. 与监控大屏联动
- 在监控页面显示告警卡片
- 实时显示待处理告警
- 快速跳转到告警中心

### 2. 与机器人管理模块联动
- 告警规则支持按机器人分组
- 接收者管理关联机器人
- 机器人状态监控

### 3. 与执行追踪模块联动
- 告警历史关联执行记录
- 支持按会话ID筛选
- 执行详情展示

## 技术栈

### 前端
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Shadcn UI
- Tailwind CSS 4

### 后端
- Fastify
- PostgreSQL
- Drizzle ORM
- WebSocket

## 使用说明

### 1. 查看告警规则
访问 `/alerts/rules` 查看和管理告警规则

### 2. 查看告警历史
访问 `/alerts/center` 查看所有告警和处理告警

### 3. 查看告警统计
访问 `/alerts/stats` 查看告警趋势和统计

### 4. 配置通知
访问 `/settings/notifications` 配置通知方式和偏好

### 5. 监控告警
访问 `/monitoring` 查看实时告警状态

## 注意事项

1. **WebSocket连接**: 需要后端服务（5001端口）正常运行
2. **声音文件**: 建议提供 `public/sounds/` 目录下的声音文件（info.mp3, warning.mp3, critical.mp3）
3. **API权限**: 所有API使用现有的认证机制
4. **数据刷新**: 前端页面会自动刷新数据，无需手动刷新

## 待完善功能

1. **告警接收者管理**: 前端页面已创建，需要完整的后端API支持
2. **用户通知偏好**: 需要基于实际用户ID进行管理
3. **告警升级**: 数据库表已存在，需要实现升级逻辑
4. **告警分组**: 数据库表已存在，需要实现分组功能
5. **通知方式扩展**: 需要支持更多通知方式（邮件、短信等）

## 文件清单

### 前端文件
- `src/app/alerts/rules/page.tsx` - 告警规则管理
- `src/app/alerts/center/page.tsx` - 告警中心
- `src/app/alerts/stats/page.tsx` - 告警统计
- `src/app/settings/notifications/page.tsx` - 通知设置
- `src/components/monitoring/MonitoringAlertCard.tsx` - 监控告警卡片
- `src/lib/alert-websocket.ts` - WebSocket客户端
- `src/lib/sound-player.ts` - 声音播放器
- `src/components/notifications/` - 通知组件

### 后端文件
- `server/app.js` - WebSocket服务集成
- `server/routes/alert-config.api.js` - 告警配置API
- `server/routes/alert-enhanced.api.js` - 告警增强API
- `server/routes/admin.api.js` - 告警统计和历史API

### 文档文件
- `ALERT_SYSTEM_GUIDE.md` - 系统使用指南
- `SOUND_FILES.md` - 声音文件说明
- `ALERT_SYSTEM_FEATURES.md` - 本文档

## 测试状态

- ✅ 前端页面可正常访问
- ✅ 后端API正常工作
- ✅ WebSocket连接正常
- ✅ 监控大屏集成正常
- ✅ 数据库表结构完整
- ✅ 通知组件功能完整

## 联系方式

如有问题或建议，请联系开发团队。
