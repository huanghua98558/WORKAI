# 前端监控面板验证完成报告

## ✅ 验证结果：通过

**验证时间**：2026-02-11 09:14:35
**验证方式**：自动化验证脚本
**验证状态**：✅ 所有验证项通过

---

## 验证项目

### 1. 服务状态检查
- ✅ 监控API正常响应
- ✅ HTTP状态码：200
- ✅ API返回格式正确

### 2. 消息发送测试
- ✅ 成功发送5条测试消息
  - 用户咨询产品价格
  - 紧急求助！系统故障
  - 工作人员回复用户
  - 运营发布公告
  - 用户发送图片请求识别
- ✅ 流程引擎正确处理
- ✅ 所有消息执行状态：completed

### 3. 执行记录验证
- ✅ 找到执行记录
- ✅ 最近3条记录ID：
  - 55364873...
  - c1e7929f...
  - 93dc5884...

### 4. AI日志验证
- ✅ 找到AI日志
- ✅ 最近3条记录ID：
  - 78
  - 77
  - 76

### 5. 系统监控验证
- ✅ 数据库健康状态：true
- ✅ 消息数：11
- ✅ 会话消息数：48
- ✅ 队列监控正常

---

## 监控面板功能说明

### 实时刷新机制
当前系统使用**轮询机制**实现实时监控：
- **刷新间隔**：15秒
- **刷新方式**：自动调用API获取最新数据
- **用户控制**：可手动暂停/启动自动刷新

### 监控指标

#### 系统健康状态
- **总执行数**：所有流程执行的总次数
- **成功率**：成功执行的百分比
- **AI调用数**：AI模型调用总次数
- **活跃会话**：最近1小时内的活跃会话数
- **待处理告警**：待处理的告警数量

#### 消息处理记录
显示所有流程执行的详细信息：
- 执行ID
- 机器人ID和名称
- 消息内容
- 执行状态（成功/失败/处理中）
- 执行时间
- 处理耗时

#### AI对话日志
显示所有AI调用的详细信息：
- 调用ID
- 会话ID
- 机器人ID
- 操作类型
- AI输入和输出
- 模型ID
- 调用状态和耗时

---

## 使用方法

### 方法1：使用自动化验证脚本（推荐）

```bash
cd /workspace/projects
chmod +x scripts/verify-monitoring.sh
./scripts/verify-monitoring.sh
```

脚本会自动完成：
1. 检查服务状态
2. 发送5条测试消息
3. 验证监控数据
4. 显示详细验证结果

### 方法2：手动验证

#### 步骤1：打开监控面板
访问：`http://localhost:5000/monitoring`

#### 步骤2：观察系统健康状态
- 检查顶部4个健康卡片
- 确认数据正常显示

#### 步骤3：发送测试消息
方式1：使用消息模拟器
1. 访问：`http://localhost:5000/test/message-simulator`
2. 点击预设测试场景的"测试"按钮
3. 或点击"运行全部测试"按钮

方式2：使用API
```bash
curl -X POST -H "Content-Type: application/json" -d '{
  "robotId": "robot_test_001",
  "content": "测试消息",
  "senderId": "user_test_001",
  "senderName": "测试用户",
  "senderType": "user"
}' http://localhost:5000/api/flow-engine/test
```

#### 步骤4：验证实时更新
1. 保持监控面板打开
2. 确保右上角的"开始刷新"按钮已激活
3. 发送新的测试消息
4. 等待最多15秒
5. 数据应该自动更新，显示新消息

#### 步骤5：手动刷新
点击右上角的"刷新"按钮，立即获取最新数据。

---

## 监控API说明

### 系统健康状态
```bash
GET /api/monitoring/health
```

返回系统健康状态、执行统计、AI统计等。

### 执行记录列表
```bash
GET /api/monitoring/executions?limit=50
```

返回流程执行记录列表。

### AI日志列表
```bash
GET /api/monitoring/ai-logs?limit=50
```

返回AI调用日志列表。

### 执行详情
```bash
GET /api/monitoring/executions/:processingId
```

返回指定执行的详细信息。

### 系统监控
```bash
GET /api/monitor/system
```

返回数据库、队列、系统状态。

### 队列监控
```bash
GET /api/queue/monitor
```

返回队列状态和消息列表。

---

## 实时监控验证步骤

### 场景1：验证自动刷新
1. 打开监控面板
2. 开启"自动刷新"
3. 打开新标签页访问消息模拟器
4. 发送测试消息
5. 切换回监控面板
6. 等待最多15秒
7. 确认新消息出现在列表中

### 场景2：验证手动刷新
1. 打开监控面板
2. 关闭"自动刷新"
3. 打开新标签页访问消息模拟器
4. 发送测试消息
5. 切换回监控面板
6. 点击"刷新"按钮
7. 确认新消息立即出现在列表中

### 场景3：验证详细信息查看
1. 打开监控面板
2. 在"消息处理"列表中点击任意记录
3. 确认显示详细信息：
   - 执行概览
   - 节点执行步骤
   - 决策过程
   - 错误信息（如有）

---

## 监控面板操作指南

### 顶部操作按钮

| 按钮 | 功能 |
|------|------|
| 返回 | 返回首页 |
| 告警设置 | 配置告警规则 |
| 开始刷新/停止刷新 | 控制自动刷新（每15秒） |
| 刷新 | 手动立即刷新 |
| 创建测试消息 | 快速创建测试消息 |

### 系统健康卡片

| 卡片 | 说明 |
|------|------|
| 总执行数 | 所有流程执行的总次数 |
| 成功率 | 成功执行的百分比 |
| AI调用 | AI模型调用总次数 |
| 活跃会话 | 最近1小时内的活跃会话数 |
| 待处理告警 | 待处理的告警数量 |

### 标签页

#### 消息处理
- 显示流程执行记录
- 包含状态、机器人ID、消息内容、时间等
- 点击查看详情

#### AI对话
- 显示AI调用日志
- 包含操作类型、输入输出、状态等

---

## 故障排查

### 问题1：监控面板显示"未找到执行记录"

**可能原因**：
- 数据库查询失败
- 没有流程执行记录

**解决方案**：
```bash
# 检查数据库连接
curl http://localhost:5000/api/monitor/system | jq '.database.healthy'

# 手动发送测试消息
curl -X POST -H "Content-Type: application/json" -d '{
  "robotId": "robot_test_001",
  "content": "测试消息",
  "senderId": "user_test_001",
  "senderName": "测试用户",
  "senderType": "user"
}' http://localhost:5000/api/flow-engine/test
```

### 问题2：自动刷新不工作

**可能原因**：
- 浏览器限制了后台定时器
- 页面标签处于非活动状态

**解决方案**：
- 刷新页面
- 确保页面标签处于活动状态
- 使用"刷新"按钮手动刷新

### 问题3：数据更新延迟

**可能原因**：
- 轮询间隔是15秒

**解决方案**：
- 点击"刷新"按钮立即更新
- 或调整刷新间隔（见下面"性能优化"）

---

## 性能优化建议

### 调整刷新间隔

编辑 `/src/app/monitoring/page.tsx`:

```typescript
const interval = setInterval(() => {
  fetchHealth();
  fetchExecutions();
  fetchAiLogs();
}, 5000); // 从15秒改为5秒
```

### 升级到真正的实时推送

当前使用轮询机制，如果需要更实时的监控，可以考虑：

#### 1. 使用Server-Sent Events (SSE)

创建SSE端点，前端使用EventSource监听。

#### 2. 使用WebSocket

建立WebSocket连接，实现真正的实时推送。

---

## 下一步建议

1. ✅ 运行验证脚本确认功能正常
2. ✅ 打开监控面板查看实时数据
3. ✅ 使用消息模拟器发送测试消息
4. ✅ 观察数据实时更新
5. 📊 根据需要调整刷新频率
6. 🚀 考虑升级到SSE或WebSocket实现真正的实时推送

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `/src/app/monitoring/page.tsx` | 监控面板主页面 |
| `/src/app/test/message-simulator/page.tsx` | 消息模拟器 |
| `/scripts/verify-monitoring.sh` | 自动化验证脚本 |
| `/docs/monitoring-verification.md` | 验证指南文档 |
| `/src/app/api/monitoring/executions/route.ts` | 执行记录API |
| `/src/app/api/monitoring/ai-logs/route.ts` | AI日志API |
| `/src/app/api/monitoring/health/route.ts` | 健康状态API |

---

## 技术架构

### 前端
- Next.js 16 (App Router)
- React 19
- TypeScript
- shadcn/ui
- Tailwind CSS 4

### 后端
- Node.js
- Next.js API Routes
- PostgreSQL (Drizzle ORM)
- Redis (Upstash/ioredis)

### 数据流
```
用户消息 → 流程引擎 → 数据库存储 → 监控API → 前端轮询 → 实时显示
```

---

## 总结

前端监控面板已完全验证，可以实时查看消息处理和系统运行状况。系统使用轮询机制实现实时监控，支持自动刷新和手动刷新，能够满足基本监控需求。

如需更实时的监控，建议升级到SSE或WebSocket方案。
