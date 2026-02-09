# WorkTool API 前端对接方案分析

## 执行日期
2025-01-14

## 分析方法

以**后端 API 为标准**，分析现有前端页面，给出对接方案。

**分析维度**:
1. 后端 API 功能
2. 前端现有页面/组件
3. 对接方案（已有/新增）

---

## 一、后端 WorkTool API 清单

### 1.1 回调地址（不需要前端对接）

| # | API 方法 | 路径 | 功能 | 前端对接状态 |
|---|---------|------|------|------------|
| 1 | POST | `/api/worktool/callback/message` | 接收消息回调 | ✅ 不需要对接 |
| 2 | POST | `/api/worktool/callback/result` | 接收执行结果回调 | ✅ 不需要对接 |
| 3 | POST | `/api/worktool/callback/qrcode` | 接收群二维码回调 | ✅ 不需要对接 |
| 4 | POST | `/api/worktool/callback/status` | 接收机器人状态回调 | ✅ 不需要对接 |

---

### 1.2 WorkTool 机器人管理 API（需要前端对接）

| # | API 方法 | 路径 | 功能 | 前端对接状态 |
|---|---------|------|------|------------|
| 1 | POST | `/api/worktool/robot/send-message` | 发送消息给企业微信用户 | ❌ 未对接 |
| 2 | GET | `/api/worktool/robot/info` | 获取机器人信息 | ❌ 未对接 |
| 3 | GET | `/api/worktool/robot/online-status` | 查询机器人在线状态 | ❌ 未对接 |
| 4 | GET | `/api/worktool/robot/login-logs` | 查询登录日志 | ❌ 未对接 |
| 5 | GET | `/api/worktool/robot/command-messages` | 查询指令消息 | ❌ 未对接 |
| 6 | GET | `/api/worktool/robot/command-results` | 查询指令执行结果 | ❌ 未对接 |
| 7 | GET | `/api/worktool/robot/message-logs` | 查询消息回调日志 | ❌ 未对接 |
| 8 | POST | `/api/worktool/robot/update-info` | 更新机器人信息 | ❌ 未对接 |

---

## 二、前端页面结构分析

### 2.1 现有页面/组件清单

| # | 页面/组件 | 路径 | 功能 | 相关 API |
|---|---------|------|------|---------|
| 1 | `robot-management.tsx` | `/robots` | 机器人管理 | 传统机器人管理 API |
| 2 | `enhanced-robot-management.tsx` | `/robots/enhanced` | 增强机器人管理 | 传统机器人管理 API |
| 3 | `robot-management-integrated.tsx` | `/robots/integrated` | 集成机器人管理 | 传统机器人管理 API |
| 4 | `command-sender.tsx` | - | 指令发送组件 | `/api/admin/robot-commands` |
| 5 | `monitoring-dashboard.tsx` | - | 监控仪表盘 | 传统机器人管理 API |
| 6 | `robot-group-manager.tsx` | - | 机器人分组管理 | 传统机器人管理 API |
| 7 | `robot-role-manager.tsx` | - | 机器人角色管理 | 传统机器人管理 API |
| 8 | `robot-business-role-manager.tsx` | - | 机器人业务角色管理 | 传统机器人管理 API |
| 9 | `callback-history-panel.tsx` | - | 回调历史面板 | 回调历史 API |

---

## 三、对接方案分析

### 3.1 发送消息给企业微信用户

**后端 API**: `POST /api/worktool/robot/send-message`

**功能**: 主动发送消息给企业微信用户

**现有前端功能**:
- ✅ 有指令发送功能（`command-sender.tsx`），但使用的是传统的机器人指令 API
- ✅ 有消息历史查询（`robot-management.tsx`），但查询的是系统内的消息历史

**对接方案**:

#### 方案 A：在指令发送组件中增加 WorkTool 消息发送功能

**修改文件**: `src/components/robot/command-sender.tsx`

**修改内容**:
```typescript
// 在 TabsList 中添加新的标签页
<TabsList>
  <TabsTrigger value="system-command">系统指令</TabsTrigger>
  <TabsTrigger value="worktool-message">WorkTool 消息</TabsTrigger> {/* 新增 */}
</TabsList>

// 添加 WorkTool 消息发送标签页
<TabsContent value="worktool-message">
  <WorkToolMessageSender /> {/* 新增组件 */}
</TabsContent>
```

**新增组件**: `src/components/robot/worktool-message-sender.tsx`

**功能**:
- 选择机器人
- 输入接收者姓名
- 选择消息类型（文本/图片/视频）
- 输入消息内容
- 发送消息

---

#### 方案 B：在机器人管理页面中增加消息发送功能

**修改文件**: `src/components/robot-management.tsx`

**修改内容**:
```typescript
// 在机器人详情对话框中添加新的标签页
<DialogContent>
  <Tabs>
    <TabsList>
      <TabsTrigger value="basic">基本信息</TabsTrigger>
      <TabsTrigger value="messages">消息管理</TabsTrigger> {/* 新增 */}
    </TabsList>

    <TabsContent value="messages">
      <WorkToolMessagePanel /> {/* 新增组件 */}
    </TabsContent>
  </Tabs>
</DialogContent>
```

**新增组件**: `src/components/robot/worktool-message-panel.tsx`

**功能**:
- 发送消息
- 查看消息历史
- 查看消息回调日志

---

**推荐方案**: 方案 B（在机器人管理页面中增加消息管理功能）

**理由**:
1. 机器人管理页面是用户常用的页面
2. 消息管理功能与机器人管理功能相关性高
3. 便于用户在一个页面完成所有机器人相关操作

---

### 3.2 获取机器人信息

**后端 API**: `GET /api/worktool/robot/info`

**功能**: 获取 WorkTool 机器人配置信息

**现有前端功能**:
- ✅ 有机器人基本信息显示（`robot-management.tsx`）
- ✅ 有机器人详细信息显示（`enhanced-robot-management.tsx`）

**对接方案**:

#### 方案：在机器人详情页面中增加 WorkTool 机器人信息显示

**修改文件**: `src/components/robot-management.tsx`

**修改内容**:
```typescript
// 在机器人详情对话框的基本信息区域中添加 WorkTool 机器人信息
<Card>
  <CardHeader>
    <CardTitle>WorkTool 机器人信息</CardTitle>
  </CardHeader>
  <CardContent>
    <WorkToolRobotInfo robotId={robot.robotId} /> {/* 新增组件 */}
  </CardContent>
</Card>
```

**新增组件**: `src/components/robot/worktool-robot-info.tsx`

**功能**:
- 显示 WorkTool 机器人 ID
- 显示机器人名称
- 显示机器人状态
- 显示 API 地址
- 显示回调地址

---

### 3.3 查询机器人在线状态

**后端 API**: `GET /api/worktool/robot/online-status`

**功能**: 查询 WorkTool 机器人是否在线

**现有前端功能**:
- ✅ 有机器人状态显示（`robot-management.tsx`），但使用的是传统的机器人状态 API
- ✅ 有机器人状态检查功能（`robot-management.tsx`），但使用的是传统的机器人状态检查 API

**对接方案**:

#### 方案：在机器人列表页面中增加 WorkTool 机器人在线状态显示

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

**新增组件**: `src/components/robot/worktool-online-status.tsx`

**功能**:
- 实时显示 WorkTool 机器人在线状态
- 定时刷新状态
- 显示在线/离线图标

---

### 3.4 查询登录日志

**后端 API**: `GET /api/worktool/robot/login-logs`

**功能**: 查询 WorkTool 机器人登录历史日志

**现有前端功能**:
- ✅ 有操作日志查询（`operation-logs.tsx`），但查询的是系统操作日志
- ✅ 有系统日志查询（`system-logs.tsx`），但查询的是系统日志

**对接方案**:

#### 方案：在机器人详情页面中增加登录日志查看功能

**修改文件**: `src/components/robot-management.tsx`

**修改内容**:
```typescript
// 在机器人详情对话框中添加新的标签页
<DialogContent>
  <Tabs>
    <TabsList>
      <TabsTrigger value="basic">基本信息</TabsTrigger>
      <TabsTrigger value="logs">日志管理</TabsTrigger> {/* 新增 */}
    </TabsList>

    <TabsContent value="logs">
      <Tabs>
        <TabsList>
          <TabsTrigger value="login-logs">登录日志</TabsTrigger> {/* 新增 */}
          <TabsTrigger value="message-logs">消息日志</TabsTrigger> {/* 新增 */}
          <TabsTrigger value="callback-logs">回调日志</TabsTrigger>
        </TabsList>

        <TabsContent value="login-logs">
          <WorkToolLoginLogs robotId={robot.robotId} /> {/* 新增组件 */}
        </TabsContent>
      </Tabs>
    </TabsContent>
  </Tabs>
</DialogContent>
```

**新增组件**: `src/components/robot/worktool-login-logs.tsx`

**功能**:
- 显示登录时间
- 显示 IP 地址
- 显示登录状态
- 支持分页查询
- 支持刷新

---

### 3.5 查询指令消息

**后端 API**: `GET /api/worktool/robot/command-messages`

**功能**: 查询 WorkTool 指令消息列表

**现有前端功能**:
- ✅ 有指令查询功能（`command-sender.tsx`），但查询的是系统内的指令
- ✅ 有指令历史查询（`robot-management.tsx`），但查询的是系统内的指令历史

**对接方案**:

#### 方案：在指令发送组件中增加 WorkTool 指令消息查询功能

**修改文件**: `src/components/robot/command-sender.tsx`

**修改内容**:
```typescript
// 在指令历史标签页中添加 WorkTool 指令消息
<TabsContent value="worktool-commands">
  <WorkToolCommandMessages /> {/* 新增组件 */}
</TabsContent>
```

**新增组件**: `src/components/robot/worktool-command-messages.tsx`

**功能**:
- 显示指令消息列表
- 显示指令内容
- 显示创建时间
- 支持分页查询
- 支持刷新

---

### 3.6 查询指令执行结果

**后端 API**: `GET /api/worktool/robot/command-results`

**功能**: 查询 WorkTool 指令执行结果

**现有前端功能**:
- ✅ 有指令执行结果查询（`command-sender.tsx`），但查询的是系统内的指令执行结果

**对接方案**:

#### 方案：在指令发送组件中增加 WorkTool 指令执行结果查询功能

**修改文件**: `src/components/robot/command-sender.tsx`

**修改内容**:
```typescript
// 在指令历史标签页中添加 WorkTool 指令执行结果
<TabsContent value="worktool-results">
  <WorkToolCommandResults /> {/* 新增组件 */}
</TabsContent>
```

**新增组件**: `src/components/robot/worktool-command-results.tsx`

**功能**:
- 显示指令执行结果列表
- 显示指令内容
- 显示执行状态
- 显示执行结果
- 显示执行时间
- 支持分页查询
- 支持刷新

---

### 3.7 查询消息回调日志

**后端 API**: `GET /api/worktool/robot/message-logs`

**功能**: 查询 WorkTool 机器人消息回调日志

**现有前端功能**:
- ✅ 有消息历史查询（`robot-management.tsx`），但查询的是系统内的消息历史
- ✅ 有回调历史查询（`callback-history-panel.tsx`），但查询的是系统内的回调历史

**对接方案**:

#### 方案：在机器人详情页面中增加消息回调日志查看功能

**修改文件**: `src/components/robot-management.tsx`

**修改内容**:
```typescript
// 在机器人详情对话框的日志管理标签页中添加消息回调日志
<TabsContent value="message-logs">
  <WorkToolMessageLogs robotId={robot.robotId} /> {/* 新增组件 */}
</TabsContent>
```

**新增组件**: `src/components/robot/worktool-message-logs.tsx`

**功能**:
- 显示消息回调日志列表
- 显示消息内容
- 显示发送者
- 显示群组
- 显示接收时间
- 支持分页查询
- 支持刷新

---

### 3.8 更新机器人信息

**后端 API**: `POST /api/worktool/robot/update-info`

**功能**: 更新 WorkTool 机器人后端通讯加密地址等信息

**现有前端功能**:
- ✅ 有机器人编辑功能（`robot-management.tsx`），但使用的是传统的机器人编辑 API

**对接方案**:

#### 方案：在机器人编辑对话框中增加 WorkTool 机器人配置编辑功能

**修改文件**: `src/components/robot-management.tsx`

**修改内容**:
```typescript
// 在机器人编辑对话框中添加 WorkTool 配置编辑区域
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

**新增组件**: `src/components/robot/worktool-robot-config.tsx`

**功能**:
- 编辑 API 地址
- 编辑回调地址
- 编辑签名密钥
- 保存配置

---

## 四、对接方案总结

### 4.1 需要修改的现有组件

| # | 组件 | 文件 | 修改内容 |
|---|------|------|---------|
| 1 | 机器人管理 | `robot-management.tsx` | 增加消息管理、日志管理、WorkTool 配置标签页 |
| 2 | 指令发送 | `command-sender.tsx` | 增加 WorkTool 消息、指令消息、指令结果标签页 |

---

### 4.2 需要新增的组件

| # | 组件 | 文件 | 功能 | 关联 API |
|---|------|------|------|---------|
| 1 | WorkTool 消息发送 | `worktool-message-sender.tsx` | 发送消息给企业微信用户 | `POST /send-message` |
| 2 | WorkTool 消息面板 | `worktool-message-panel.tsx` | 消息管理面板 | `POST /send-message`, `GET /message-logs` |
| 3 | WorkTool 机器人信息 | `worktool-robot-info.tsx` | 显示 WorkTool 机器人信息 | `GET /info` |
| 4 | WorkTool 在线状态 | `worktool-online-status.tsx` | 显示机器人在线状态 | `GET /online-status` |
| 5 | WorkTool 登录日志 | `worktool-login-logs.tsx` | 查询登录日志 | `GET /login-logs` |
| 6 | WorkTool 指令消息 | `worktool-command-messages.tsx` | 查询指令消息 | `GET /command-messages` |
| 7 | WorkTool 指令结果 | `worktool-command-results.tsx` | 查询指令执行结果 | `GET /command-results` |
| 8 | WorkTool 消息日志 | `worktool-message-logs.tsx` | 查询消息回调日志 | `GET /message-logs` |
| 9 | WorkTool 机器人配置 | `worktool-robot-config.tsx` | 更新机器人配置 | `POST /update-info` |

---

### 4.3 对接优先级

#### P0（高优先级）

| 功能 | 修改/新增组件 | 预计工作量 |
|-----|------------|---------|
| 发送消息 | 修改 `robot-management.tsx` + 新增 `worktool-message-panel.tsx` | 2-3 小时 |
| 在线状态 | 修改 `robot-management.tsx` + 新增 `worktool-online-status.tsx` | 1-2 小时 |

#### P1（中优先级）

| 功能 | 修改/新增组件 | 预计工作量 |
|-----|------------|---------|
| 登录日志 | 修改 `robot-management.tsx` + 新增 `worktool-login-logs.tsx` | 1-2 小时 |
| 消息日志 | 修改 `robot-management.tsx` + 新增 `worktool-message-logs.tsx` | 1-2 小时 |
| 机器人信息 | 修改 `robot-management.tsx` + 新增 `worktool-robot-info.tsx` | 1 小时 |

#### P2（低优先级）

| 功能 | 修改/新增组件 | 预计工作量 |
|-----|------------|---------|
| 指令消息 | 修改 `command-sender.tsx` + 新增 `worktool-command-messages.tsx` | 1 小时 |
| 指令结果 | 修改 `command-sender.tsx` + 新增 `worktool-command-results.tsx` | 1 小时 |
| 机器人配置 | 修改 `robot-management.tsx` + 新增 `worktool-robot-config.tsx` | 1-2 小时 |

---

## 五、实施计划

### 第一阶段（P0 功能）

**目标**: 实现核心 WorkTool 功能

**任务**:
1. 修改 `robot-management.tsx`，增加消息管理标签页
2. 创建 `worktool-message-panel.tsx`，实现消息发送和消息日志功能
3. 修改 `robot-management.tsx`，在机器人列表中显示在线状态
4. 创建 `worktool-online-status.tsx`，实现在线状态显示功能

**预计时间**: 3-5 小时

---

### 第二阶段（P1 功能）

**目标**: 实现日志查看功能

**任务**:
1. 修改 `robot-management.tsx`，增加日志管理标签页
2. 创建 `worktool-login-logs.tsx`，实现登录日志查看功能
3. 创建 `worktool-message-logs.tsx`，实现消息日志查看功能
4. 创建 `worktool-robot-info.tsx`，实现机器人信息显示功能

**预计时间**: 3-5 小时

---

### 第三阶段（P2 功能）

**目标**: 实现辅助功能

**任务**:
1. 修改 `command-sender.tsx`，增加 WorkTool 指令查询功能
2. 创建 `worktool-command-messages.tsx`，实现指令消息查询功能
3. 创建 `worktool-command-results.tsx`，实现指令执行结果查询功能
4. 修改 `robot-management.tsx`，增加 WorkTool 配置标签页
5. 创建 `worktool-robot-config.tsx`，实现机器人配置编辑功能

**预计时间**: 3-5 小时

---

## 六、总结

### 6.1 对接方案总览

**需要修改的组件**: 2 个
- `robot-management.tsx`（主要修改）
- `command-sender.tsx`（次要修改）

**需要新增的组件**: 9 个
- WorkTool 消息相关组件: 3 个
- WorkTool 日志相关组件: 3 个
- WorkTool 信息相关组件: 3 个

**预计总工作量**: 9-15 小时

---

### 6.2 对接原则

1. **已有功能优先复用**
   - 复用现有的机器人管理页面
   - 复用现有的指令发送组件

2. **新增功能优先集成**
   - 在现有页面中增加标签页
   - 在现有组件中增加新功能

3. **用户体验优先**
   - 保持界面一致性
   - 保持操作流畅性
   - 提供清晰的反馈

---

### 6.3 下一步行动

1. ✅ 分析完成
2. ⏳ 开始第一阶段（P0 功能）开发
3. ⏳ 测试第一阶段功能
4. ⏳ 开始第二阶段（P1 功能）开发
5. ⏳ 测试第二阶段功能
6. ⏳ 开始第三阶段（P2 功能）开发
7. ⏳ 测试第三阶段功能
8. ⏳ 全功能测试和优化

---

## 七、附录

### 7.1 已创建的文件

为方便对接，已创建以下文件：

1. `src/services/worktool-api-service.ts` - WorkTool API 服务
2. `src/components/robot/worktool-robot-panel.tsx` - WorkTool 机器人功能面板（示例）

### 7.2 相关文档

1. `docs/WORKTOOL_API_CHECK_REPORT.md` - WorkTool API 检查报告
2. `docs/WORKTOOL_API_USAGE.md` - WorkTool API 使用说明
3. `docs/WORKTOOL_API_FRONTEND_INTEGRATION.md` - WorkTool API 前端对接分析
4. `docs/WORKTOOL_API_FRONTEND_STATUS.md` - WorkTool API 前端对接总结
