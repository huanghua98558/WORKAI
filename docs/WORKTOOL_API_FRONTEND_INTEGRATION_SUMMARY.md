# WorkTool API 前端对接方案总结

## 核心结论

**前端对接率**: 0% (0/8)

所有 WorkTool 机器人管理 API 都没有对接到前端。

---

## 一、后端 API 清单（8 个）

| # | API | 功能 | 前端对接状态 |
|---|-----|------|------------|
| 1 | `POST /api/worktool/robot/send-message` | 发送消息 | ❌ 未对接 |
| 2 | `GET /api/worktool/robot/info` | 获取机器人信息 | ❌ 未对接 |
| 3 | `GET /api/worktool/robot/online-status` | 查询在线状态 | ❌ 未对接 |
| 4 | `GET /api/worktool/robot/login-logs` | 查询登录日志 | ❌ 未对接 |
| 5 | `GET /api/worktool/robot/command-messages` | 查询指令消息 | ❌ 未对接 |
| 6 | `GET /api/worktool/robot/command-results` | 查询指令执行结果 | ❌ 未对接 |
| 7 | `GET /api/worktool/robot/message-logs` | 查询消息日志 | ❌ 未对接 |
| 8 | `POST /api/worktool/robot/update-info` | 更新机器人信息 | ❌ 未对接 |

---

## 二、对接方案总览

### 2.1 需要修改的现有组件（2 个）

| # | 组件 | 文件 | 修改内容 |
|---|------|------|---------|
| 1 | 机器人管理 | `robot-management.tsx` | 增加 3 个标签页（消息管理、日志管理、WorkTool 配置） |
| 2 | 指令发送 | `command-sender.tsx` | 增加 2 个标签页（WorkTool 消息、WorkTool 指令） |

---

### 2.2 需要新增的组件（9 个）

#### 消息相关组件（3 个）

| # | 组件 | 文件 | 功能 | 关联 API |
|---|------|------|------|---------|
| 1 | WorkTool 消息发送 | `worktool-message-sender.tsx` | 发送消息表单 | `POST /send-message` |
| 2 | WorkTool 消息面板 | `worktool-message-panel.tsx` | 消息管理面板 | `POST /send-message`, `GET /message-logs` |
| 3 | WorkTool 在线状态 | `worktool-online-status.tsx` | 在线状态徽章 | `GET /online-status` |

#### 日志相关组件（3 个）

| # | 组件 | 文件 | 功能 | 关联 API |
|---|------|------|------|---------|
| 4 | WorkTool 登录日志 | `worktool-login-logs.tsx` | 登录日志表格 | `GET /login-logs` |
| 5 | WorkTool 消息日志 | `worktool-message-logs.tsx` | 消息日志表格 | `GET /message-logs` |
| 6 | WorkTool 指令结果 | `worktool-command-results.tsx` | 指令执行结果表格 | `GET /command-results` |

#### 信息相关组件（3 个）

| # | 组件 | 文件 | 功能 | 关联 API |
|---|------|------|------|---------|
| 7 | WorkTool 机器人信息 | `worktool-robot-info.tsx` | 机器人信息卡片 | `GET /info` |
| 8 | WorkTool 指令消息 | `worktool-command-messages.tsx` | 指令消息表格 | `GET /command-messages` |
| 9 | WorkTool 机器人配置 | `worktool-robot-config.tsx` | 配置编辑表单 | `POST /update-info` |

---

## 三、详细对接方案

### 3.1 发送消息功能

**后端 API**: `POST /api/worktool/robot/send-message`

**现有功能**: 有指令发送功能，但不是 WorkTool API

**对接方案**:
- **修改组件**: `robot-management.tsx`
- **新增组件**: `worktool-message-panel.tsx`
- **实现位置**: 机器人详情对话框 → 新增"消息管理"标签页

**UI 示例**:
```tsx
<DialogContent>
  <Tabs>
    <TabsList>
      <TabsTrigger value="basic">基本信息</TabsTrigger>
      <TabsTrigger value="messages">消息管理</TabsTrigger> {/* 新增 */}
    </TabsList>

    <TabsContent value="messages">
      <WorkToolMessagePanel robotId={robot.robotId} /> {/* 新增组件 */}
    </TabsContent>
  </Tabs>
</DialogContent>
```

---

### 3.2 在线状态功能

**后端 API**: `GET /api/worktool/robot/online-status`

**现有功能**: 有机器人状态显示，但不是 WorkTool API

**对接方案**:
- **修改组件**: `robot-management.tsx`
- **新增组件**: `worktool-online-status.tsx`
- **实现位置**: 机器人列表表格 → 状态列

**UI 示例**:
```tsx
<TableCell>
  <div className="flex items-center gap-2">
    <WorkToolOnlineStatus robotId={robot.robotId} /> {/* 新增组件 */}
    <Badge>{robot.status}</Badge>
  </div>
</TableCell>
```

---

### 3.3 登录日志功能

**后端 API**: `GET /api/worktool/robot/login-logs`

**现有功能**: 有操作日志，但不是 WorkTool 登录日志

**对接方案**:
- **修改组件**: `robot-management.tsx`
- **新增组件**: `worktool-login-logs.tsx`
- **实现位置**: 机器人详情对话框 → 新增"日志管理"标签页 → "登录日志"子标签页

**UI 示例**:
```tsx
<DialogContent>
  <Tabs>
    <TabsList>
      <TabsTrigger value="logs">日志管理</TabsTrigger> {/* 新增 */}
    </TabsList>

    <TabsContent value="logs">
      <Tabs>
        <TabsList>
          <TabsTrigger value="login-logs">登录日志</TabsTrigger> {/* 新增 */}
          <TabsTrigger value="message-logs">消息日志</TabsTrigger>
        </TabsList>

        <TabsContent value="login-logs">
          <WorkToolLoginLogs robotId={robot.robotId} /> {/* 新增组件 */}
        </TabsContent>
      </Tabs>
    </TabsContent>
  </Tabs>
</DialogContent>
```

---

### 3.4 消息日志功能

**后端 API**: `GET /api/worktool/robot/message-logs`

**现有功能**: 有消息历史，但不是 WorkTool 消息日志

**对接方案**:
- **修改组件**: `robot-management.tsx`
- **新增组件**: `worktool-message-logs.tsx`
- **实现位置**: 机器人详情对话框 → "日志管理"标签页 → "消息日志"子标签页

**UI 示例**:
```tsx
<TabsContent value="message-logs">
  <WorkToolMessageLogs robotId={robot.robotId} /> {/* 新增组件 */}
</TabsContent>
```

---

### 3.5 机器人信息功能

**后端 API**: `GET /api/worktool/robot/info`

**现有功能**: 有机器人信息显示，但不是 WorkTool API

**对接方案**:
- **修改组件**: `robot-management.tsx`
- **新增组件**: `worktool-robot-info.tsx`
- **实现位置**: 机器人详情对话框 → "基本信息"标签页 → WorkTool 机器人信息卡片

**UI 示例**:
```tsx
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

### 3.6 指令消息功能

**后端 API**: `GET /api/worktool/robot/command-messages`

**现有功能**: 有指令查询，但不是 WorkTool API

**对接方案**:
- **修改组件**: `command-sender.tsx`
- **新增组件**: `worktool-command-messages.tsx`
- **实现位置**: 指令发送组件 → 新增"WorkTool 指令"标签页

**UI 示例**:
```tsx
<TabsList>
  <TabsTrigger value="system-command">系统指令</TabsTrigger>
  <TabsTrigger value="worktool-commands">WorkTool 指令</TabsTrigger> {/* 新增 */}
</TabsList>

<TabsContent value="worktool-commands">
  <WorkToolCommandMessages /> {/* 新增组件 */}
</TabsContent>
```

---

### 3.7 指令执行结果功能

**后端 API**: `GET /api/worktool/robot/command-results`

**现有功能**: 有指令执行结果，但不是 WorkTool API

**对接方案**:
- **修改组件**: `command-sender.tsx`
- **新增组件**: `worktool-command-results.tsx`
- **实现位置**: 指令发送组件 → "WorkTool 指令"标签页 → 子标签页

**UI 示例**:
```tsx
<TabsContent value="worktool-commands">
  <Tabs>
    <TabsList>
      <TabsTrigger value="messages">指令消息</TabsTrigger>
      <TabsTrigger value="results">执行结果</TabsTrigger> {/* 新增 */}
    </TabsList>

    <TabsContent value="results">
      <WorkToolCommandResults /> {/* 新增组件 */}
    </TabsContent>
  </Tabs>
</TabsContent>
```

---

### 3.8 更新机器人信息功能

**后端 API**: `POST /api/worktool/robot/update-info`

**现有功能**: 有机器人编辑，但不是 WorkTool API

**对接方案**:
- **修改组件**: `robot-management.tsx`
- **新增组件**: `worktool-robot-config.tsx`
- **实现位置**: 机器人编辑对话框 → 新增"WorkTool 配置"标签页

**UI 示例**:
```tsx
<DialogContent>
  <Tabs>
    <TabsList>
      <TabsTrigger value="basic">基本信息</TabsTrigger>
      <TabsTrigger value="worktool">WorkTool 配置</TabsTrigger> {/* 新增 */}
    </TabsList>

    <TabsContent value="worktool">
      <WorkToolRobotConfig robotId={robot.robotId} /> {/* 新增组件 */}
    </TabsContent>
  </Tabs>
</DialogContent>
```

---

## 四、实施计划

### 第一阶段（P0 - 高优先级）

**目标**: 实现核心 WorkTool 功能

**任务**:
1. ✅ 修改 `robot-management.tsx`，增加"消息管理"标签页
2. ⏳ 创建 `worktool-message-panel.tsx`，实现消息发送和消息日志
3. ✅ 修改 `robot-management.tsx`，在列表中显示在线状态
4. ⏳ 创建 `worktool-online-status.tsx`，实现在线状态显示

**预计时间**: 3-5 小时

---

### 第二阶段（P1 - 中优先级）

**目标**: 实现日志查看功能

**任务**:
1. ✅ 修改 `robot-management.tsx`，增加"日志管理"标签页
2. ⏳ 创建 `worktool-login-logs.tsx`，实现登录日志查看
3. ⏳ 创建 `worktool-message-logs.tsx`，实现消息日志查看
4. ⏳ 创建 `worktool-robot-info.tsx`，实现机器人信息显示

**预计时间**: 3-5 小时

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

## 五、总结

### 对接方案总览

| 类型 | 数量 | 预计工作量 |
|-----|------|---------|
| 修改现有组件 | 2 个 | 2-3 小时 |
| 新增组件 | 9 个 | 7-12 小时 |
| **总计** | **11 个** | **9-15 小时** |

### 已创建的文件（帮助对接）

1. ✅ `src/services/worktool-api-service.ts` - WorkTool API 服务
2. ✅ `src/components/robot/worktool-robot-panel.tsx` - WorkTool 机器人功能面板（示例）

### 对接原则

1. **已有功能优先复用** - 在现有页面中增加功能
2. **新增功能优先集成** - 在现有组件中增加标签页
3. **用户体验优先** - 保持界面一致性和操作流畅性

---

## 六、下一步行动

1. ✅ 分析完成
2. ⏳ 开始第一阶段（P0 功能）开发
3. ⏳ 测试第一阶段功能
4. ⏳ 开始第二阶段（P1 功能）开发
5. ⏳ 测试第二阶段功能
6. ⏳ 开始第三阶段（P2 功能）开发
7. ⏳ 测试第三阶段功能
8. ⏳ 全功能测试和优化
