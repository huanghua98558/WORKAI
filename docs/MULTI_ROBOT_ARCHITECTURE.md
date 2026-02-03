# 多机器人指挥平台架构优化方案

## 一、架构设计目标

本系统定位为**几十个机器人的指挥大脑/指挥平台**，需要具备以下核心能力：

1. **机器人管理**：统一管理多个机器人，支持分组、角色、能力配置
2. **会话路由**：智能分配会话到合适的机器人
3. **指令发送**：向指定机器人发送指令，支持优先级和队列管理
4. **回调处理**：统一处理来自不同机器人的回调，支持路由和分发
5. **监控追踪**：实时监控机器人状态、性能和健康度
6. **负载均衡**：根据机器人负载自动分配会话和指令

## 二、数据库架构优化

### 2.1 机器人分组和角色管理（004_multi_robot_support.sql）

#### 新增表结构

**robot_groups（机器人分组表）**
```sql
- id: 分组ID
- name: 分组名称（客服机器人、营销机器人、管理机器人、测试机器人）
- description: 分组描述
- color: 分组颜色（前端展示）
- icon: 分组图标
- priority: 分组优先级
- is_enabled: 是否启用
```

**robot_roles（机器人角色表）**
```sql
- id: 角色ID
- name: 角色名称（管理员、客服、营销、观察员、测试员）
- description: 角色描述
- permissions: 角色权限配置 JSON
- is_system: 是否系统角色
```

#### 扩展 robots 表字段

```sql
- group_id: 所属分组ID
- role_id: 角色ID
- capabilities: 机器人能力配置 JSON
- priority: 优先级
- max_concurrent_sessions: 最大并发会话数
- current_session_count: 当前会话数
- enabled_intents: 启用的意图类型
- ai_model_config: AI模型配置（覆盖全局配置）
- response_config: 响应配置
- load_balancing_weight: 负载均衡权重
- health_check_interval: 健康检查间隔（秒）
- last_heartbeat_at: 最后心跳时间
- performance_metrics: 性能指标
- tags: 机器人标签
- metadata: 机器人元数据
```

#### 默认数据

**默认机器人分组**：
1. 客服机器人（蓝色，MessageSquare图标，优先级10）
2. 营销机器人（绿色，TrendingUp图标，优先级9）
3. 管理机器人（橙色，Shield图标，优先级8）
4. 测试机器人（紫色，TestTube图标，优先级1）

**默认机器人角色**：
1. 管理员（所有权限）
2. 客服（回复、查看、聊天权限）
3. 营销（营销、查看、广播权限）
4. 观察员（只读权限）
5. 测试员（测试、查看、调试权限）

### 2.2 指令发送和会话管理（005_robot_commands.sql）

#### 新增表结构

**robot_commands（机器人指令表）**
```sql
- id: 指令ID
- robot_id: 机器人ID
- command_type: 指令类型（send_message, broadcast, set_config, get_status）
- command_data: 指令数据 JSON
- priority: 指令优先级
- status: 状态（pending, sent, failed, cancelled）
- retry_count: 重试次数
- max_retries: 最大重试次数
- error_message: 错误信息
- sent_at: 发送时间
- completed_at: 完成时间
- created_by: 创建者
```

**robot_command_queue（指令队列表）**
```sql
- id: 队列项ID
- command_id: 关联的指令ID
- robot_id: 机器人ID
- queue_position: 队列位置
- scheduled_at: 计划执行时间
- processing_started_at: 开始处理时间
- is_locked: 是否锁定
- locked_at: 锁定时间
```

#### 扩展 sessions 表字段

```sql
- robot_group_id: 机器人分组ID
- robot_role: 机器人角色
- robot_capabilities: 机器人能力快照
- assigned_at: 分配时间
- assigned_by: 分配者
- robot_switch_count: 机器人切换次数
- last_robot_switch_at: 最后切换时间
- session_context: 会话上下文（存储机器人级别的上下文）
- ai_model_used: 使用的AI模型
- performance_metrics: 会话性能指标
```

**session_messages_v2（增强版会话消息表）**
```sql
- id: 消息ID
- session_id: 会话ID
- robot_id: 发送/接收消息的机器人ID
- robot_group_id: 机器人分组ID
- message_sequence: 消息序号（保证顺序）
- is_from_user: 是否来自用户
- is_human: 是否人工
- message_type: 消息类型（text, image, file, voice, video）
- intent: 意图
- ai_confidence: AI置信度
- response_time: 响应时间（毫秒）
- command_id: 关联的指令ID
```

### 2.3 回调处理和性能监控（006_robot_callbacks_and_metrics.sql）

#### 新增表结构

**robot_callback_logs（回调日志表）**
```sql
- id: 日志ID
- robot_id: 机器人ID
- robot_group_id: 机器人分组ID
- callback_type: 回调类型（message, event, status, heartbeat）
- event_type: 事件类型（text, image, voice, enter, exit, mention）
- source_ip: 来源IP
- request_id: 请求ID
- request_headers: 请求头 JSON
- request_body: 请求体 JSON
- response_status: 响应状态码
- response_body: 响应体 JSON
- processing_time: 处理时间（毫秒）
- is_success: 是否成功
- error_message: 错误信息
```

**robot_performance_metrics（性能指标表）**
```sql
- id: 指标ID
- robot_id: 机器人ID
- metric_type: 指标类型（response_time, success_rate, error_rate, throughput）
- metric_value: 指标值
- metric_unit: 单位（ms, %, count）
- time_window: 时间窗口（1m, 5m, 15m, 1h, 1d）
- recorded_at: 记录时间
```

**robot_status_history（状态历史表）**
```sql
- id: 历史ID
- robot_id: 机器人ID
- old_status: 旧状态
- new_status: 新状态
- change_reason: 变更原因
- changed_by: 变更者
```

**robot_error_logs（错误日志表）**
```sql
- id: 错误ID
- robot_id: 机器人ID
- error_type: 错误类型（callback_error, api_error, system_error）
- error_code: 错误代码
- error_message: 错误信息
- error_stack: 错误堆栈
- request_id: 关联的请求ID
- command_id: 关联的指令ID
- session_id: 关联的会话ID
- is_resolved: 是否已解决
- resolved_at: 解决时间
```

**robot_load_balancing（负载均衡表）**
```sql
- id: 负载ID
- robot_id: 机器人ID
- current_sessions: 当前会话数
- max_sessions: 最大会话数
- cpu_usage: CPU使用率
- memory_usage: 内存使用率
- avg_response_time: 平均响应时间
- success_rate: 成功率
- error_count: 错误次数
- health_score: 健康评分（0-100）
- is_available: 是否可用
```

**robot_capabilities（能力表）**
```sql
- id: 能力ID
- robot_id: 机器人ID
- capabilities: 能力列表 JSON
- enabled_abilities: 启用的能力 JSON
- disabled_abilities: 禁用的能力 JSON
- version: 能力版本
```

## 三、核心功能设计

### 3.1 机器人分组和角色管理

#### 功能特性

1. **分组管理**
   - 创建、编辑、删除机器人分组
   - 设置分组的颜色和图标
   - 设置分组优先级
   - 启用/禁用分组

2. **角色管理**
   - 创建、编辑、删除机器人角色
   - 配置角色权限
   - 区分系统角色和自定义角色

3. **机器人配置**
   - 分配机器人到分组
   - 分配角色给机器人
   - 配置机器人能力
   - 设置机器人优先级
   - 配置负载均衡权重
   - 设置会话数限制

#### 使用场景

- **客服机器人分组**：处理客户服务咨询，优先级最高
- **营销机器人分组**：负责营销活动，支持广播功能
- **管理机器人分组**：系统管理和运维，拥有管理员权限
- **测试机器人分组**：测试和实验，不影响生产环境

### 3.2 会话路由和分配

#### 路由策略

1. **基于分组的路由**
   - 根据会话类型选择合适的分组
   - 客服会话 → 客服机器人分组
   - 营销会话 → 营销机器人分组

2. **基于能力的路由**
   - 根据会话需求匹配机器人能力
   - 需要文件传输 → 支持文件传输的机器人
   - 需要语音 → 支持语音的机器人

3. **基于负载的路由**
   - 选择当前会话数最少的机器人
   - 选择响应时间最快的机器人
   - 选择成功率最高的机器人

4. **基于优先级的路由**
   - 高优先级会话 → 优先级高的机器人
   - 紧急会话 → 健康评分高的机器人

#### 分配算法

```typescript
interface SessionAllocation {
  // 1. 筛选可用机器人
  availableRobots = robots.filter(r => 
    r.isActive && 
    r.status === 'online' && 
    r.current_session_count < r.max_concurrent_sessions &&
    r.load_balancing.is_available
  );

  // 2. 根据分组筛选
  groupRobots = availableRobots.filter(r => r.group_id === session.expectedGroup);

  // 3. 根据能力筛选
  capableRobots = groupRobots.filter(r => 
    hasRequiredCapabilities(r, session.requiredCapabilities)
  );

  // 4. 根据负载排序
  sortedRobots = capableRobots.sort((a, b) => 
    calculateLoadScore(a) - calculateLoadScore(b)
  );

  // 5. 选择最佳机器人
  bestRobot = sortedRobots[0];

  // 6. 更新会话和机器人状态
  assignSessionToRobot(session, bestRobot);
}
```

### 3.3 指令发送和管理

#### 指令类型

1. **send_message**：发送单条消息
2. **broadcast**：广播消息到多个用户/群组
3. **set_config**：设置机器人配置
4. **get_status**：获取机器人状态
5. **heartbeat**：心跳检测
6. **restart**：重启机器人
7. **update_capability**：更新机器人能力

#### 指令发送流程

```typescript
async function sendRobotCommand(
  robotId: string,
  commandType: string,
  commandData: any,
  priority: number = 10
): Promise<CommandResult> {
  // 1. 创建指令记录
  const command = await createCommand({
    robot_id: robotId,
    command_type: commandType,
    command_data: commandData,
    priority: priority,
    status: 'pending'
  });

  // 2. 添加到队列
  await addToQueue(command);

  // 3. 检查机器人状态
  const robot = await getRobot(robotId);
  if (!robot.isActive || robot.status !== 'online') {
    return { success: false, error: 'Robot not available' };
  }

  // 4. 发送指令
  try {
    const response = await callWorkToolAPI(robotId, commandType, commandData);
    
    // 5. 更新指令状态
    await updateCommandStatus(command.id, 'sent', response);
    
    // 6. 记录日志
    await logCommandResult(command, response);
    
    return { success: true, data: response };
  } catch (error) {
    // 7. 处理失败和重试
    await handleCommandError(command, error);
    return { success: false, error: error.message };
  }
}
```

#### 指令队列管理

- 优先级队列：高优先级指令优先执行
- 定时队列：支持延迟发送
- 批量队列：支持批量指令发送
- 失败重试：自动重试失败的指令

### 3.4 回调处理和路由

#### 回调处理流程

```typescript
async function handleRobotCallback(
  robotId: string,
  callbackType: string,
  eventData: any
): Promise<void> {
  // 1. 验证机器人
  const robot = await validateRobot(robotId);
  if (!robot) {
    return; // 无效机器人，忽略回调
  }

  // 2. 记录回调日志
  const logId = await logCallback({
    robot_id: robotId,
    robot_group_id: robot.group_id,
    callback_type: callbackType,
    request_body: eventData,
    created_at: new Date()
  });

  // 3. 更新机器人状态
  await updateRobotHeartbeat(robotId);

  // 4. 根据回调类型处理
  switch (callbackType) {
    case 'message':
      await handleMessageCallback(robot, eventData, logId);
      break;
    case 'event':
      await handleEventCallback(robot, eventData, logId);
      break;
    case 'status':
      await handleStatusCallback(robot, eventData, logId);
      break;
  }

  // 5. 更新回调日志
  await updateCallbackLog(logId, { is_success: true });
}
```

#### 消息回调处理

```typescript
async function handleMessageCallback(
  robot: Robot,
  messageData: any,
  logId: string
): Promise<void> {
  // 1. 识别会话
  const sessionId = extractSessionId(messageData);
  
  // 2. 检查会话是否存在
  let session = await getSession(sessionId);
  
  if (!session) {
    // 3. 创建新会话
    session = await createSession({
      session_id: sessionId,
      robot_id: robot.id,
      robot_group_id: robot.group_id,
      robot_role: robot.role,
      robot_capabilities: robot.capabilities,
      assigned_at: new Date(),
      assigned_by: 'system'
    });
  } else if (session.robot_id !== robot.id) {
    // 4. 处理机器人切换
    await handleRobotSwitch(session, robot);
  }

  // 5. 保存消息
  await saveMessage({
    session_id: sessionId,
    robot_id: robot.id,
    robot_group_id: robot.group_id,
    message_sequence: session.message_count + 1,
    is_from_user: messageData.isFromUser,
    content: messageData.content,
    message_type: messageData.messageType,
    created_at: new Date()
  });

  // 6. 意图识别
  const intent = await recognizeIntent(messageData.content, robot);

  // 7. AI 回复
  if (intent.needReply && !intent.needHuman) {
    const reply = await generateAIReply(messageData.content, intent, robot);
    
    // 8. 发送回复
    await sendRobotCommand(
      robot.robot_id,
      'send_message',
      {
        target: messageData.userId,
        message: reply
      }
    );
  }
}
```

### 3.5 性能监控和负载均衡

#### 健康评分计算

```typescript
function calculateHealthScore(robot: Robot): number {
  const metrics = robot.load_balancing;
  
  // 1. CPU 使用率（0-30%最佳）
  const cpuScore = metrics.cpu_usage <= 30 ? 100 : 
                   metrics.cpu_usage <= 60 ? 70 : 
                   metrics.cpu_usage <= 90 ? 40 : 10;
  
  // 2. 内存使用率（0-70%最佳）
  const memoryScore = metrics.memory_usage <= 70 ? 100 :
                      metrics.memory_usage <= 85 ? 70 :
                      metrics.memory_usage <= 95 ? 40 : 10;
  
  // 3. 响应时间（<500ms最佳）
  const responseScore = metrics.avg_response_time <= 500 ? 100 :
                        metrics.avg_response_time <= 1000 ? 70 :
                        metrics.avg_response_time <= 2000 ? 40 : 10;
  
  // 4. 成功率（>95%最佳）
  const successScore = metrics.success_rate >= 0.95 ? 100 :
                       metrics.success_rate >= 0.90 ? 70 :
                       metrics.success_rate >= 0.80 ? 40 : 10;
  
  // 5. 会话负载（<80%最佳）
  const loadScore = metrics.current_sessions / metrics.max_sessions <= 0.8 ? 100 :
                    metrics.current_sessions / metrics.max_sessions <= 0.9 ? 70 :
                    metrics.current_sessions / metrics.max_sessions <= 1.0 ? 40 : 10;
  
  // 6. 错误率（<1%最佳）
  const errorScore = metrics.error_count / 1000 <= 0.01 ? 100 :
                     metrics.error_count / 1000 <= 0.05 ? 70 :
                     metrics.error_count / 1000 <= 0.1 ? 40 : 10;
  
  // 综合评分（加权平均）
  const healthScore = (
    cpuScore * 0.15 +
    memoryScore * 0.15 +
    responseScore * 0.25 +
    successScore * 0.2 +
    loadScore * 0.15 +
    errorScore * 0.1
  );
  
  return Math.round(healthScore);
}
```

#### 负载均衡策略

1. **最小连接数**：选择当前会话数最少的机器人
2. **最快响应**：选择平均响应时间最短的机器人
3. **最高可用性**：选择健康评分最高的机器人
4. **加权轮询**：根据负载均衡权重分配会话
5. **亲和性路由**：同一用户的会话尽量分配到同一机器人

## 四、前端界面优化

### 4.1 机器人管理页面

**新增功能**：

1. **分组标签页**
   - 按分组查看机器人
   - 分组统计（在线数、总数）
   - 快速切换分组

2. **机器人卡片**
   - 显示分组标签和颜色
   - 显示角色徽章
   - 显示健康评分
   - 显示当前会话数/最大会话数
   - 显示性能指标（响应时间、成功率）

3. **机器人详情**
   - 基本信息（分组、角色、能力）
   - 配置信息（AI模型、响应配置）
   - 性能图表（CPU、内存、响应时间）
   - 会话列表
   - 指令历史
   - 错误日志

4. **批量操作**
   - 批量启用/禁用
   - 批量分配分组
   - 批量分配角色
   - 批量发送指令

### 4.2 会话管理页面

**新增功能**：

1. **机器人筛选**
   - 按机器人筛选会话
   - 按分组筛选会话
   - 按角色筛选会话

2. **会话详情**
   - 显示机器人信息（分组、角色、能力）
   - 显示会话上下文
   - 显示机器人切换历史
   - 显示性能指标

3. **会话转移**
   - 将会话转移到其他机器人
   - 选择目标机器人
   - 自动迁移会话上下文

### 4.3 指令发送页面

**新增功能**：

1. **指令发送表单**
   - 选择机器人（支持多选）
   - 选择指令类型
   - 填写指令参数
   - 设置优先级
   - 设置执行时间

2. **指令队列**
   - 查看待发送指令
   - 取消指令
   - 调整优先级

3. **指令历史**
   - 查看已发送指令
   - 查看执行结果
   - 重试失败指令

### 4.4 监控大屏

**新增功能**：

1. **机器人概览**
   - 总机器人数
   - 在线机器人数
   - 按分组统计
   - 按角色统计

2. **性能指标**
   - 平均响应时间
   - 成功率
   - 错误率
   - 会话数

3. **实时告警**
   - 机器人离线告警
   - 性能下降告警
   - 错误率上升告警
   - 会话超载告警

## 五、实施计划

### 第一阶段：数据库迁移（已完成）
- ✅ 创建机器人分组和角色表
- ✅ 扩展 robots 表字段
- ✅ 创建指令相关表
- ✅ 扩展 sessions 表
- ✅ 创建回调日志和监控表

### 第二阶段：后端 API 开发（待实施）
1. 机器人分组管理 API
2. 机器人角色管理 API
3. 机器人配置 API
4. 指令发送 API
5. 会话路由 API
6. 回调处理优化
7. 性能监控 API
8. 负载均衡服务

### 第三阶段：前端界面开发（待实施）
1. 机器人管理页面优化
2. 会话管理页面优化
3. 指令发送页面
4. 监控大屏
5. 机器人详情页面
6. 性能图表组件

### 第四阶段：测试和优化（待实施）
1. 功能测试
2. 性能测试
3. 压力测试
4. 用户体验优化
5. 文档完善

## 六、技术要点

### 6.1 数据库设计
- 使用 JSONB 存储灵活的配置数据
- 创建合适的索引提升查询性能
- 使用外键保证数据完整性
- 定期归档历史数据

### 6.2 性能优化
- 使用连接池管理数据库连接
- 使用缓存减少重复查询
- 使用异步处理提高并发能力
- 使用队列削峰填谷

### 6.3 安全性
- API 认证和授权
- 数据加密传输
- 敏感信息脱敏
- 操作日志记录

### 6.4 可扩展性
- 模块化设计
- 插件化架构
- 支持水平扩展
- 微服务架构

## 七、总结

本架构优化方案全面支持几十个机器人的统一管理、智能路由、指令发送、回调处理和性能监控，为机器人指挥平台提供了坚实的技术基础。

**核心优势**：
1. **统一管理**：所有机器人在一个平台统一管理
2. **智能路由**：根据多种策略自动分配会话
3. **灵活配置**：支持机器人级别的个性化配置
4. **实时监控**：全方位监控机器人状态和性能
5. **负载均衡**：自动分配和调整负载
6. **可扩展性**：支持未来功能扩展和性能提升
