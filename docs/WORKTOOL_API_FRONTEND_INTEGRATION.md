# WorkTool API 前端对接情况分析

## 执行日期
2025-01-14

## 分析范围
检查后端提供的 WorkTool API 是否有前端对接

---

## 一、后端提供的 WorkTool API

### 1. WorkTool 机器人管理 API（需要前端对接）

| API | 方法 | 路径 | 功能 | 前端对接状态 |
|-----|------|------|------|------------|
| 发送消息 | POST | `/api/worktool/robot/send-message` | 主动发送消息给企业微信用户 | ❌ **未对接** |
| 获取机器人信息 | GET | `/api/worktool/robot/info` | 获取机器人配置信息 | ❌ **未对接** |
| 查询机器人在线状态 | GET | `/api/worktool/robot/online-status` | 查询机器人是否在线 | ❌ **未对接** |
| 查询登录日志 | GET | `/api/worktool/robot/login-logs` | 查询机器人登录历史日志 | ❌ **未对接** |
| 查询指令消息 | GET | `/api/worktool/robot/command-messages` | 查询指令消息列表 | ❌ **未对接** |
| 查询指令执行结果 | GET | `/api/worktool/robot/command-results` | 查询指令执行结果 | ❌ **未对接** |
| 查询消息回调日志 | GET | `/api/worktool/robot/message-logs` | 查询机器人消息回调日志 | ❌ **未对接** |
| 更新机器人信息 | POST | `/api/worktool/robot/update-info` | 更新机器人后端通讯加密地址等信息 | ❌ **未对接** |

**对接率**: 0% (0/8)

---

### 2. 回调地址（不需要前端对接）

| API | 方法 | 路径 | 功能 | 前端对接状态 |
|-----|------|------|------|------------|
| 消息回调 | POST | `/api/worktool/callback/message` | 接收 WorkTool 机器人上报的 QA 问答消息 | ✅ 不需要 |
| 执行结果回调 | POST | `/api/worktool/callback/result` | 接收 WorkTool 机器人上报的指令执行结果 | ✅ 不需要 |
| 群二维码回调 | POST | `/api/worktool/callback/qrcode` | 接收 WorkTool 机器人上报的群二维码信息 | ✅ 不需要 |
| 机器人状态回调 | POST | `/api/worktool/callback/status` | 接收 WorkTool 机器人上报的上线/下线状态 | ✅ 不需要 |

---

## 二、前端现状分析

### 2.1 现有的机器人管理功能

前端目前已实现的功能：
- ✅ 机器人列表管理（`/api/admin/robots`）
- ✅ 机器人验证（`/api/admin/robots/validate`）
- ✅ 机器人状态检查（`/api/proxy/admin/robots/check-status`）
- ✅ 回调 URL 管理（`/api/admin/robots/{id}/callback-url`）
- ✅ 指令发送（`/api/admin/robot-commands`）
- ✅ 消息历史查询（`/api/admin/message-history`）

### 2.2 缺失的 WorkTool 特定功能

前端目前没有对接的 WorkTool 特定功能：
- ❌ 直接发送消息给企业微信用户
- ❌ 查询 WorkTool 机器人详细信息
- ❌ 查询 WorkTool 机器人在线状态
- ❌ 查看 WorkTool 机器人登录日志
- ❌ 查看 WorkTool 指令消息
- ❌ 查看 WorkTool 指令执行结果
- ❌ 查看 WorkTool 消息回调日志
- ❌ 更新 WorkTool 机器人配置

---

## 三、建议对接的功能

### 优先级 P0（高优先级）

#### 1. 发送消息功能
**API**: `POST /api/worktool/robot/send-message`

**建议实现位置**:
- 机器人管理页面（`robot-management.tsx`）
- 或创建独立的消息发送组件

**功能描述**:
- 支持主动发送消息给企业微信用户
- 支持文本、图片、视频等多种消息类型
- 支持批量发送

**示例 UI**:
```typescript
// 机器人详情页 - 消息发送卡片
<Card>
  <CardHeader>
    <CardTitle>发送消息</CardTitle>
    <CardDescription>主动向企业微信用户发送消息</CardDescription>
  </CardHeader>
  <CardContent>
    <Input placeholder="接收者姓名" />
    <Textarea placeholder="消息内容" />
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="消息类型" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">文本</SelectItem>
        <SelectItem value="2">图片</SelectItem>
        <SelectItem value="3">视频</SelectItem>
      </SelectContent>
    </Select>
    <Button>发送</Button>
  </CardContent>
</Card>
```

---

#### 2. 机器人在线状态查询
**API**: `GET /api/worktool/robot/online-status`

**建议实现位置**:
- 机器人管理页面（`robot-management.tsx`）
- 机器人详情页

**功能描述**:
- 实时显示机器人在线状态
- 定时刷新状态

**示例 UI**:
```typescript
// 机器人列表 - 在线状态徽章
<Badge variant={isOnline ? 'default' : 'secondary'}>
  {isOnline ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
  {isOnline ? '在线' : '离线'}
</Badge>
```

---

### 优先级 P1（中优先级）

#### 3. 机器人登录日志
**API**: `GET /api/worktool/robot/login-logs`

**建议实现位置**:
- 机器人详情页
- 新建"登录日志"标签页

**功能描述**:
- 显示机器人登录历史
- 支持分页查询
- 显示登录时间、IP、状态等信息

**示例 UI**:
```typescript
// 机器人详情页 - 登录日志标签页
<TabsContent value="login-logs">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>登录时间</TableHead>
        <TableHead>IP 地址</TableHead>
        <TableHead>状态</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {logs.map(log => (
        <TableRow key={log.id}>
          <TableCell>{log.loginTime}</TableCell>
          <TableCell>{log.ip}</TableCell>
          <TableCell>
            <Badge>{log.status}</Badge>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TabsContent>
```

---

#### 4. 消息回调日志
**API**: `GET /api/worktool/robot/message-logs`

**建议实现位置**:
- 机器人详情页
- 新建"消息日志"标签页

**功能描述**:
- 显示机器人接收的消息历史
- 支持分页查询
- 显示消息内容、发送者、群组等信息

---

### 优先级 P2（低优先级）

#### 5. WorkTool 机器人详细信息
**API**: `GET /api/worktool/robot/info`

**建议实现位置**:
- 机器人详情页

**功能描述**:
- 显示 WorkTool 机器人的详细配置信息
- 包括 API 地址、回调地址等

---

#### 6. 指令消息查询
**API**: `GET /api/worktool/robot/command-messages`

**建议实现位置**:
- 机器人详情页
- 指令管理页面

**功能描述**:
- 显示 WorkTool 指令消息列表
- 支持分页查询

---

#### 7. 指令执行结果查询
**API**: `GET /api/worktool/robot/command-results`

**建议实现位置**:
- 机器人详情页
- 指令管理页面

**功能描述**:
- 显示 WorkTool 指令执行结果
- 支持分页查询
- 显示执行状态和结果

---

#### 8. 更新机器人信息
**API**: `POST /api/worktool/robot/update-info`

**建议实现位置**:
- 机器人编辑页面
- 机器人配置页面

**功能描述**:
- 更新 WorkTool 机器人的配置信息
- 包括 API 地址、回调地址等

---

## 四、实现建议

### 4.1 创建 WorkTool API 服务

**文件**: `src/services/worktool-api-service.ts`

```typescript
export class WorkToolApiService {
  private baseUrl = '/api/worktool/robot';

  // 发送消息
  async sendMessage(robotId: string, toName: string, content: string, messageType: number) {
    const response = await fetch(`${this.baseUrl}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ robotId, toName, content, messageType }),
    });

    return ResponseHelper.handle(response);
  }

  // 获取机器人信息
  async getRobotInfo(robotId: string) {
    const response = await fetch(`${this.baseUrl}/info?robotId=${robotId}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    return ResponseHelper.handle(response);
  }

  // 查询机器人在线状态
  async getOnlineStatus(robotId: string) {
    const response = await fetch(`${this.baseUrl}/online-status?robotId=${robotId}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    return ResponseHelper.handle(response);
  }

  // 查询登录日志
  async getLoginLogs(robotId: string, page: number = 1, pageSize: number = 10) {
    const response = await fetch(
      `${this.baseUrl}/login-logs?robotId=${robotId}&page=${page}&pageSize=${pageSize}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );

    return ResponseHelper.handle(response);
  }

  // 查询指令消息
  async getCommandMessages(robotId: string, page: number = 1, pageSize: number = 10) {
    const response = await fetch(
      `${this.baseUrl}/command-messages?robotId=${robotId}&page=${page}&pageSize=${pageSize}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );

    return ResponseHelper.handle(response);
  }

  // 查询指令执行结果
  async getCommandResults(robotId: string, page: number = 1, pageSize: number = 10) {
    const response = await fetch(
      `${this.baseUrl}/command-results?robotId=${robotId}&page=${page}&pageSize=${pageSize}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );

    return ResponseHelper.handle(response);
  }

  // 查询消息回调日志
  async getMessageLogs(robotId: string, page: number = 1, pageSize: number = 10) {
    const response = await fetch(
      `${this.baseUrl}/message-logs?robotId=${robotId}&page=${page}&pageSize=${pageSize}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );

    return ResponseHelper.handle(response);
  }

  // 更新机器人信息
  async updateRobotInfo(robotId: string, robotInfo: any) {
    const response = await fetch(`${this.baseUrl}/update-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ robotId, robotInfo }),
    });

    return ResponseHelper.handle(response);
  }
}

export const workToolApi = new WorkToolApiService();
```

---

### 4.2 集成到现有页面

#### 机器人详情页（`robot-management.tsx`）

建议在机器人详情页添加以下功能：

1. **基本信息区域**
   - 显示 WorkTool 机器人详细信息（调用 `getRobotInfo`）
   - 显示在线状态（调用 `getOnlineStatus`）

2. **消息发送区域**
   - 提供发送消息表单（调用 `sendMessage`）

3. **日志查看区域**（使用 Tabs）
   - 登录日志（调用 `getLoginLogs`）
   - 消息日志（调用 `getMessageLogs`）
   - 指令消息（调用 `getCommandMessages`）
   - 指令结果（调用 `getCommandResults`）

4. **配置管理区域**
   - 更新机器人配置（调用 `updateRobotInfo`）

---

## 五、总结

### 当前状态

- **后端 API**: 8 个 WorkTool API 已实现 ✅
- **前端对接**: 0 个 WorkTool API 已对接 ❌
- **对接率**: 0%

### 需要对接的 API

| 优先级 | 功能 | API | 建议实现位置 |
|-------|------|-----|------------|
| P0 | 发送消息 | POST `/api/worktool/robot/send-message` | 机器人管理页面 |
| P0 | 在线状态查询 | GET `/api/worktool/robot/online-status` | 机器人列表/详情页 |
| P1 | 登录日志 | GET `/api/worktool/robot/login-logs` | 机器人详情页 |
| P1 | 消息日志 | GET `/api/worktool/robot/message-logs` | 机器人详情页 |
| P2 | 机器人详细信息 | GET `/api/worktool/robot/info` | 机器人详情页 |
| P2 | 指令消息 | GET `/api/worktool/robot/command-messages` | 机器人详情页 |
| P2 | 指令执行结果 | GET `/api/worktool/robot/command-results` | 机器人详情页 |
| P2 | 更新机器人信息 | POST `/api/worktool/robot/update-info` | 机器人配置页面 |

### 实施建议

1. **第一阶段（P0）**: 实现发送消息和在线状态查询功能
2. **第二阶段（P1）**: 实现日志查看功能（登录日志、消息日志）
3. **第三阶段（P2）**: 实现其他辅助功能（详细信息、指令管理等）

---

## 六、下一步行动

1. ✅ 创建 WorkTool API 服务（`src/services/worktool-api-service.ts`）
2. ⏳ 在机器人详情页集成 P0 功能
3. ⏳ 在机器人详情页集成 P1 功能
4. ⏳ 在机器人详情页集成 P2 功能
5. ⏳ 编写单元测试
6. ⏳ 编写用户文档
