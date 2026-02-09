# WorkTool API 前端对接方案修正版

## 修正说明

根据用户反馈，发送消息功能应该放在**会话管理**页面，而不是机器人管理页面。

---

## 一、前端页面结构重新分析

### 1.1 现有页面/组件清单

| # | 页面/组件 | 路径 | 功能 | 相关 API |
|---|---------|------|------|---------|
| 1 | `robot-management.tsx` | `/robots` | 机器人管理 | 机器人配置和状态 |
| 2 | `business-message-monitor.tsx` | `/monitor` | 会话管理/对话监控 | 会话消息、对话历史 |
| 3 | `command-sender.tsx` | - | 指令发送组件 | 系统指令 |
| 4 | `monitoring-dashboard.tsx` | - | 监控仪表盘 | 系统监控 |
| 5 | 其他机器人相关组件 | - | 机器人分组、角色等 | 机器人管理 |

---

## 二、WorkTool API 对接方案修正

### 2.1 发送消息给企业微信用户

**后端 API**: `POST /api/worktool/robot/send-message`

**功能**: 主动发送消息给企业微信用户

**现有前端功能**:
- ✅ 有会话管理页面（`business-message-monitor.tsx`），显示用户与机器人的对话会话

**对接方案（修正）**:

#### 方案：在会话管理页面中增加消息发送功能

**修改文件**: `src/components/business-message-monitor.tsx`

**修改内容**:
```typescript
// 在会话详情对话框或消息区域中添加消息发送功能
<Card>
  <CardHeader>
    <CardTitle>发送消息</CardTitle>
    <CardDescription>向用户发送消息</CardDescription>
  </CardHeader>
  <CardContent>
    <WorkToolMessageSender
      robotId={session.robotId}
      toName={session.userName}
      groupName={session.groupName}
    /> {/* 新增组件 */}
  </CardContent>
</Card>
```

**新增组件**: `src/components/robot/worktool-message-sender.tsx`

**功能**:
- 自动填充接收者姓名（从会话信息中获取）
- 选择消息类型（文本/图片/视频）
- 输入消息内容
- 发送消息

**理由**:
1. 发送消息是针对特定用户或特定会话的操作
2. 会话管理页面已经有用户信息和对话历史
3. 更符合用户的操作流程

---

### 2.2 查询机器人在线状态

**后端 API**: `GET /api/worktool/robot/online-status`

**功能**: 查询 WorkTool 机器人是否在线

**对接方案（保持不变）**:

#### 方案：在机器人管理页面中显示在线状态

**修改文件**: `src/components/robot-management.tsx`

**修改内容**:
```typescript
// 在机器人列表表格的状态列中添加 WorkTool 在线状态
<TableCell>
  <div className="flex items-center gap-2">
    <WorkToolOnlineStatus robotId={robot.robotId} /> {/* 新增组件 */}
    <Badge>{robot.status}</Badge>
  </div>
</TableCell>
```

---

### 2.3 获取机器人信息

**后端 API**: `GET /api/worktool/robot/info`

**功能**: 获取 WorkTool 机器人配置信息

**对接方案（保持不变）**:

#### 方案：在机器人详情页面中显示 WorkTool 机器人信息

**修改文件**: `src/components/robot-management.tsx`

**修改内容**:
```typescript
// 在机器人详情对话框中添加 WorkTool 机器人信息卡片
<Card>
  <CardHeader>
    <CardTitle>WorkTool 机器人信息</CardTitle>
  </CardHeader>
  <CardContent>
    <WorkToolRobotInfo robotId={robot.robotId} /> {/* 新增组件 */}
  </CardContent>
</Card>
```

---

### 2.4 查询登录日志

**后端 API**: `GET /api/worktool/robot/login-logs`

**功能**: 查询 WorkTool 机器人登录历史日志

**对接方案（保持不变）**:

#### 方案：在机器人详情页面中增加登录日志查看功能

**修改文件**: `src/components/robot-management.tsx`

**修改内容**:
```typescript
// 在机器人详情对话框中添加"日志管理"标签页
<TabsContent value="login-logs">
  <WorkToolLoginLogs robotId={robot.robotId} /> {/* 新增组件 */}
</TabsContent>
```

---

### 2.5 查询消息回调日志

**后端 API**: `GET /api/worktool/robot/message-logs`

**功能**: 查询 WorkTool 机器人消息回调日志

**对接方案（修正）**:

#### 方案：在会话管理页面中增加消息日志查看功能

**修改文件**: `src/components/business-message-monitor.tsx`

**修改内容**:
```typescript
// 在会话详情对话框中添加"消息日志"标签页
<Tabs>
  <TabsList>
    <TabsTrigger value="messages">对话消息</TabsTrigger>
    <TabsTrigger value="logs">消息日志</TabsTrigger> {/* 新增 */}
  </TabsList>

  <TabsContent value="logs">
    <WorkToolMessageLogs robotId={session.robotId} /> {/* 新增组件 */}
  </TabsContent>
</Tabs>
```

**理由**:
1. 消息日志是针对机器人的消息接收历史
2. 在会话管理页面查看消息日志更符合用户的使用场景
3. 便于用户了解机器人的消息接收情况

---

### 2.6 查询指令消息

**后端 API**: `GET /api/worktool/robot/command-messages`

**功能**: 查询 WorkTool 指令消息列表

**对接方案（保持不变）**:

#### 方案：在指令发送组件中增加 WorkTool 指令消息查询功能

**修改文件**: `src/components/robot/command-sender.tsx`

**修改内容**:
```typescript
// 在指令历史标签页中添加 WorkTool 指令消息
<TabsContent value="worktool-commands">
  <WorkToolCommandMessages /> {/* 新增组件 */}
</TabsContent>
```

---

### 2.7 查询指令执行结果

**后端 API**: `GET /api/worktool/robot/command-results`

**功能**: 查询 WorkTool 指令执行结果

**对接方案（保持不变）**:

#### 方案：在指令发送组件中增加 WorkTool 指令执行结果查询功能

**修改文件**: `src/components/robot/command-sender.tsx`

**修改内容**:
```typescript
// 在指令历史标签页中添加 WorkTool 指令执行结果
<TabsContent value="worktool-results">
  <WorkToolCommandResults /> {/* 新增组件 */}
</TabsContent>
```

---

### 2.8 更新机器人信息

**后端 API**: `POST /api/worktool/robot/update-info`

**功能**: 更新 WorkTool 机器人后端通讯加密地址等信息

**对接方案（保持不变）**:

#### 方案：在机器人编辑对话框中增加 WorkTool 机器人配置编辑功能

**修改文件**: `src/components/robot-management.tsx`

**修改内容**:
```typescript
// 在机器人编辑对话框中添加 WorkTool 配置标签页
<TabsContent value="worktool">
  <WorkToolRobotConfig robotId={robot.robotId} /> {/* 新增组件 */}
</TabsContent>
```

---

## 三、对接方案修正总结

### 3.1 修正的内容

| 功能 | 原方案 | 修正方案 | 修改的组件 |
|-----|-------|---------|----------|
| 发送消息 | 机器人管理页面 | **会话管理页面** | `business-message-monitor.tsx` |
| 消息日志 | 机器人详情页面 | **会话管理页面** | `business-message-monitor.tsx` |

### 3.2 保持不变的内容

| 功能 | 对接位置 | 修改的组件 |
|-----|---------|----------|
| 在线状态 | 机器人管理页面 | `robot-management.tsx` |
| 机器人信息 | 机器人详情页面 | `robot-management.tsx` |
| 登录日志 | 机器人详情页面 | `robot-management.tsx` |
| 指令消息 | 指令发送组件 | `command-sender.tsx` |
| 指令执行结果 | 指令发送组件 | `command-sender.tsx` |
| 机器人配置 | 机器人编辑页面 | `robot-management.tsx` |

---

## 四、修正后的对接方案总览

### 4.1 需要修改的现有组件（3 个）

| # | 组件 | 文件 | 修改内容 |
|---|------|------|---------|
| 1 | 会话管理 | `business-message-monitor.tsx` | 增加消息发送和消息日志查看功能 |
| 2 | 机器人管理 | `robot-management.tsx` | 增加日志管理、WorkTool 配置标签页 |
| 3 | 指令发送 | `command-sender.tsx` | 增加 WorkTool 指令标签页 |

---

### 4.2 需要新增的组件（9 个）

| # | 组件 | 文件 | 功能 | 关联 API | 放置位置 |
|---|------|------|------|---------|---------|
| 1 | WorkTool 消息发送 | `worktool-message-sender.tsx` | 发送消息表单 | `POST /send-message` | 会话管理页面 |
| 2 | WorkTool 在线状态 | `worktool-online-status.tsx` | 在线状态徽章 | `GET /online-status` | 机器人管理页面 |
| 3 | WorkTool 机器人信息 | `worktool-robot-info.tsx` | 机器人信息卡片 | `GET /info` | 机器人详情页面 |
| 4 | WorkTool 登录日志 | `worktool-login-logs.tsx` | 登录日志表格 | `GET /login-logs` | 机器人详情页面 |
| 5 | WorkTool 指令消息 | `worktool-command-messages.tsx` | 指令消息表格 | `GET /command-messages` | 指令发送组件 |
| 6 | WorkTool 指令结果 | `worktool-command-results.tsx` | 指令执行结果表格 | `GET /command-results` | 指令发送组件 |
| 7 | WorkTool 消息日志 | `worktool-message-logs.tsx` | 消息日志表格 | `GET /message-logs` | 会话管理页面 |
| 8 | WorkTool 机器人配置 | `worktool-robot-config.tsx` | 配置编辑表单 | `POST /update-info` | 机器人编辑页面 |
| 9 | WorkTool 消息面板 | `worktool-message-panel.tsx` | 消息管理面板（可选） | `POST /send-message`, `GET /message-logs` | 会话管理页面 |

---

## 五、修正后的实施计划

### 第一阶段（P0 - 高优先级）

**目标**: 实现核心 WorkTool 功能

**任务**:
1. ⏳ 修改 `business-message-monitor.tsx`，在会话详情中添加消息发送功能
2. ⏳ 创建 `worktool-message-sender.tsx`，实现消息发送表单
3. ✅ 修改 `robot-management.tsx`，在列表中显示在线状态
4. ⏳ 创建 `worktool-online-status.tsx`，实现在线状态显示

**预计时间**: 3-5 小时

---

### 第二阶段（P1 - 中优先级）

**目标**: 实现日志查看功能

**任务**:
1. ✅ 修改 `business-message-monitor.tsx`，在会话详情中添加消息日志查看
2. ⏳ 创建 `worktool-message-logs.tsx`，实现消息日志查看
3. ✅ 修改 `robot-management.tsx`，增加"日志管理"标签页
4. ⏳ 创建 `worktool-login-logs.tsx`，实现登录日志查看
5. ⏳ 创建 `worktool-robot-info.tsx`，实现机器人信息显示

**预计时间**: 4-6 小时

---

### 第三阶段（P2 - 低优先级）

**目标**: 实现辅助功能

**任务**:
1. ✅ 修改 `command-sender.tsx`，增加"WorkTool 指令"标签页
2. ⏳ 创建 `worktool-command-messages.tsx`，实现指令消息查询
3. ⏳ 创建 `worktool-command-results.tsx`，实现指令执行结果查询
4. ✅ 修改 `robot-management.tsx`，增加"WorkTool 配置"标签页
5. ⏳ 创建 `worktool-robot-config.tsx`，实现配置编辑

**预计时间**: 3-5 小时

---

## 六、修正后的总结

### 对接方案总览

| 类型 | 数量 | 预计工作量 |
|-----|------|---------|
| 修改现有组件 | 3 个 | 2-4 小时 |
| 新增组件 | 9 个 | 7-12 小时 |
| **总计** | **12 个** | **9-16 小时** |

### 对接原则

1. **功能位置合理**
   - 发送消息放在会话管理页面（针对特定用户发送）
   - 消息日志放在会话管理页面（查看消息接收历史）
   - 机器人相关功能放在机器人管理页面

2. **已有功能优先复用**
   - 复用现有的会话管理页面
   - 复用现有的机器人管理页面

3. **用户体验优先**
   - 保持界面一致性
   - 保持操作流畅性
   - 提供清晰的反馈

---

## 七、下一步行动

1. ✅ 分析完成
2. ✅ 方案修正完成
3. ⏳ 开始第一阶段（P0 功能）开发
4. ⏳ 测试第一阶段功能
5. ⏳ 开始第二阶段（P1 功能）开发
6. ⏳ 测试第二阶段功能
7. ⏳ 开始第三阶段（P2 功能）开发
8. ⏳ 测试第三阶段功能
9. ⏳ 全功能测试和优化
