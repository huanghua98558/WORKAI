# 构建错误修复指南

## 概述

在执行 `pnpm tsc --noEmit` 后，发现了多个类型错误。本文档详细列出了这些错误并提供修复方案。

## 错误分类

### 1. Next.js 16 动态路由参数类型错误

**错误信息：**
```
Type '{ params: Promise<{ id: string; }>; }' is not assignable to type '{ params: { id: string; }; }'.
```

**原因：**
Next.js 16中，动态路由参数 `params` 改为了 `Promise` 类型。

**影响文件：**
- `src/app/api/after-sales/tasks/[id]/route.ts` - 所有路由函数
- `src/app/api/sessions/[id]/reply-status/route.ts` - GET路由

**修复方案：**

修改前：
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 直接使用 params.id
}
```

修改后：
```typescript
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  // 使用 params.id
}
```

**需要修改的函数：**
1. `src/app/api/after-sales/tasks/[id]/route.ts`:
   - `GET`
   - `PUT`
   - `POST` (assign)
   - `POST` (complete)
   - `POST` (cancel)
   - `POST` (escalate)
   - `DELETE`

2. `src/app/api/sessions/[id]/reply-status/route.ts`:
   - `GET`

### 2. 服务方法名称和类型不匹配错误

**错误信息：**
```
Property 'updateTask' does not exist on type 'AfterSalesTaskService'.
Property 'completeTask' does not exist on type 'AfterSalesTaskService'.
Property 'escalateTask' does not exist on type 'AfterSalesTaskService'.
Property 'deleteTask' does not exist on type 'AfterSalesTaskService'.
Property 'getTasks' does not exist on type 'AfterSalesTaskService'.
```

**原因：**
服务层实现的方法名称与API层调用的方法名称不一致。

**修复方案：**

需要检查 `src/services/after-sales-task-service.ts` 文件，确保实现了以下方法：
- `getTasks(params)` - 获取任务列表
- `getTaskById(id)` - 获取任务详情
- `createTask(data)` - 创建任务
- `updateTask(id, updates)` - 更新任务
- `assignTask(id, assignedTo)` - 分配任务
- `completeTask(id, completedBy, completionNote)` - 完成任务
- `cancelTask(id, cancelReason)` - 取消任务
- `escalateTask(id, priority, escalationReason)` - 升级任务
- `deleteTask(id)` - 删除任务

### 3. 类型导出缺失错误

**错误信息：**
```
Module '"@/services/after-sales-task-service"' has no exported member 'TaskPriority'.
Module '"@/services/after-sales-task-service"' has no exported member 'TaskStatus'.
```

**原因：**
类型定义没有导出。

**修复方案：**

在 `src/services/after-sales-task-service.ts` 文件顶部添加类型导出：

```typescript
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'waiting_response' | 'completed' | 'cancelled';
```

### 4. 协同决策服务方法缺失错误

**错误信息：**
```
Property 'getDecisionsBySession' does not exist on type 'CollaborationDecisionService'.
```

**原因：**
服务层没有实现 `getDecisionsBySession` 方法。

**修复方案：**

在 `src/lib/services/collaboration-decision-service.ts` 文件中添加：

```typescript
async getDecisionsBySession(sessionId: string): Promise<ServiceResult<CollaborationDecisionLog[]>> {
  try {
    const decisions = await db
      .select()
      .from(collaborationDecisionLogs)
      .where(eq(collaborationDecisionLogs.sessionId, sessionId))
      .orderBy(desc(collaborationDecisionLogs.createdAt));

    return {
      success: true,
      decisions,
    };
  } catch (error) {
    console.error('[CollaborationDecisionService] 获取决策失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      decisions: [],
    };
  }
}
```

### 5. 工作人员类型服务方法缺失错误

**错误信息：**
```
Property 'getStaffTypeByIdentifier' does not exist on type 'StaffTypeService'.
```

**原因：**
服务层没有实现 `getStaffTypeByIdentifier` 方法。

**修复方案：**

在 `src/services/staff-type-service.ts` 文件中添加：

```typescript
async getStaffTypeByIdentifier(staffUserId: string): Promise<ServiceResult<StaffType>> {
  try {
    const staffRecord = await db
      .select()
      .from(staff)
      .where(eq(staff.staffUserId, staffUserId))
      .limit(1);

    if (staffRecord.length === 0) {
      return {
        success: false,
        error: '工作人员不存在',
        staffType: null,
      };
    }

    return {
      success: true,
      staffType: staffRecord[0].staffType as StaffType,
    };
  } catch (error) {
    console.error('[StaffTypeService] 获取工作人员类型失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      staffType: null,
    };
  }
}
```

### 6. 工作人员消息上下文服务方法缺失错误

**错误信息：**
```
Property 'recordStaffMessage' does not exist on type 'StaffMessageContextService'.
```

**原因：**
服务层没有实现 `recordStaffMessage` 方法。

**修复方案：**

在 `src/services/staff-message-context-service.ts` 文件中添加：

```typescript
async recordStaffMessage(data: {
  messageId: string;
  sessionId: string;
  staffUserId: string;
  staffName: string;
  staffType: StaffType;
  content: string;
  relatedUserId?: string;
  isMention?: boolean;
  metadata?: any;
}): Promise<ServiceResult<void>> {
  try {
    await db.insert(staffMessageContexts).values({
      messageId: data.messageId,
      sessionId: data.sessionId,
      staffUserId: data.staffUserId,
      staffName: data.staffName,
      staffType: data.staffType,
      content: data.content,
      relatedUserId: data.relatedUserId,
      isMention: data.isMention || false,
      metadata: data.metadata || {},
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('[StaffMessageContextService] 记录工作人员消息失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
```

### 7. 组件导入缺失错误

**错误信息：**
```
Cannot find name 'Textarea'.
```

**原因：**
`Textarea` 组件没有从 `@/components/ui/textarea` 导入。

**修复方案：**

在 `src/components/staff-type-config.tsx` 文件顶部添加：

```typescript
import { Textarea } from '@/components/ui/textarea';
```

### 8. 数据库导入缺失错误

**错误信息：**
```
Module '"../storage/database"' has no exported member 'db'.
Module '"./schema"' has no exported member 'staff'.
```

**原因：**
数据库连接和Schema导出路径不正确。

**修复方案：**

检查 `src/storage/database` 目录，找到正确的导出路径，并更新import语句。

### 9. Schema类型名称不匹配错误

**错误信息：**
```
Cannot find name 'AfterSalesTask'. Did you mean 'NewAfterSalesTask'?
```

**原因：**
Schema中使用的类型名称与服务层不一致。

**修复方案：**

统一类型名称，确保服务层使用的类型名称与Schema中定义的一致。

### 10. 协同决策服务参数类型错误

**错误信息：**
```
Type 'null' is not assignable to type '"conversion" | "management" | "community" | "after_sales" | undefined'.
Type '"user_message"' is not assignable to type '"user" | "staff" | "system" | "notification" | undefined'.
```

**原因：**
传递给决策服务的参数类型与接口定义不匹配。

**修复方案：**

检查 `collaborationDecisionService.recordDecision` 和 `updateDecision` 方法的接口定义，确保传递的参数类型正确。

## 修复优先级

### 高优先级（必须修复）
1. Next.js 16 动态路由参数类型错误（影响所有API路由）
2. 服务方法名称和类型不匹配错误（影响核心功能）
3. 类型导出缺失错误（影响API编译）

### 中优先级（建议修复）
4. 协同决策服务方法缺失错误（影响回复状态查询）
5. 工作人员类型服务方法缺失错误（影响工作人员识别）
6. 工作人员消息上下文服务方法缺失错误（影响消息记录）

### 低优先级（可选修复）
7. 组件导入缺失错误（仅影响开发体验）
8. 数据库导入缺失错误（需要确认正确的导入路径）
9. Schema类型名称不匹配错误（需要统一命名规范）
10. 协同决策服务参数类型错误（需要确认正确的接口定义）

## 修复步骤

1. **修复动态路由参数类型**（高优先级）
   - 修改所有动态路由的参数类型
   - 使用 `await context.params` 替代直接使用 `params`

2. **修复服务层方法**（高优先级）
   - 确保所有服务方法都已实现
   - 确保方法名称与API层调用一致

3. **添加类型导出**（高优先级）
   - 导出所有需要的类型定义
   - 确保类型名称一致

4. **修复组件导入**（中优先级）
   - 添加缺失的组件导入
   - 确保所有组件都正确导入

5. **验证构建**（所有修复后）
   - 运行 `pnpm tsc --noEmit` 验证类型错误是否修复
   - 运行 `pnpm build` 验证构建是否成功

## 注意事项

1. **向后兼容性**：修复动态路由参数类型时，确保不破坏现有功能
2. **测试覆盖**：修复后需要充分测试所有API接口
3. **文档更新**：修复后需要更新API文档
4. **代码审查**：修复后需要进行代码审查，确保没有引入新的问题

## 联系方式

如有问题或需要帮助，请联系开发团队。
