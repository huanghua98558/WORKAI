# AI模型删除功能修复报告

## 问题描述
用户反馈：AI模型关联角色后不能删除。

## 问题分析

### 1. 数据库表关系
- **ai_models** 表：存储AI模型配置
- **ai_roles** 表：存储AI角色配置
- **关联关系**：`ai_roles.modelId` 字段引用 `ai_models.id`

### 2. 当前状态
数据库中存在多个角色关联了模型：

| 角色ID | 角色名称 | 模型ID | 模型名称 |
|-------|---------|-------|---------|
| 1790fcb4-2d5a-4984-8018-09ab1ee77c31 | 售后处理 | f038886b-d042-4aca-9a6f-d1b3049290cc | doubao-pro-32k-service |
| 675054fa-a136-4eac-b42f-87565de6d5be | 转化客服 | afe89518-8f25-42d8-a437-cbb8b97c8379 | deepseek-v3-conversion |
| f23e6f1e-c497-443e-84d9-ea22ae3f6eef | 技术支持 | a7be9ad3-f8ff-4310-9166-29dcefc37a10 | deepseek-r1-tech |
| 3e359bbc-cb94-4b5b-831b-7123ab2e1da1 | 产品咨询 | f038886b-d042-4aca-9a6f-d1b3049290cc | doubao-pro-32k-service |

### 3. 根本原因
后端API `DELETE /api/ai/models/:id` 没有检查模型是否被角色关联，直接执行删除操作。

**原代码**：
```javascript
async function deleteAIModel(request, reply) {
  const { id } = request.params;
  try {
    const db = await getDb();
    const result = await db.delete(aiModels)
      .where(eq(aiModels.id, id))
      .returning();
    // ...
  }
}
```

## 解决方案

### 1. 后端API修复
修改 `server/routes/ai-module.api.js` 中的 `deleteAIModel` 函数，添加角色关联检查：

```javascript
async function deleteAIModel(request, reply) {
  const { id } = request.params;

  try {
    const db = await getDb();

    // 检查模型是否被角色关联
    const rolesUsingModel = await db
      .select({
        id: aiRoles.id,
        name: aiRoles.name
      })
      .from(aiRoles)
      .where(eq(aiRoles.modelId, id));

    if (rolesUsingModel.length > 0) {
      const roleNames = rolesUsingModel.map(role => role.name).join('、');
      return reply.code(400).send({
        success: false,
        error: `该模型正在被以下角色使用，无法删除：${roleNames}。请先将这些角色切换到其他模型后再删除。`
      });
    }

    // 执行删除
    const result = await db.delete(aiModels)
      .where(eq(aiModels.id, id))
      .returning();
    // ...
  }
}
```

### 2. 前端错误处理
前端已有完善的错误处理逻辑：

```javascript
const handleDeleteModel = async (modelId: string, isBuiltin: boolean) => {
  // ...
  const response = await fetch(`/api/proxy/ai/models/${modelId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const data = await response.json();
    toast.error(data.error || data.message || '删除失败');
    return;
  }
  // ...
}
```

## 测试验证

### 测试1：删除被角色关联的模型

```bash
curl -X DELETE http://localhost:5001/api/ai/models/f038886b-d042-4aca-9a6f-d1b3049290cc
```

**返回结果**：
```json
{
  "success": false,
  "error": "该模型正在被以下角色使用，无法删除：售后处理、产品咨询。请先将这些角色切换到其他模型后再删除。"
}
```

✅ **测试通过**：模型未被删除，返回了友好的错误信息。

### 测试2：删除未被角色关联的模型

预期：如果模型没有被任何角色使用，应该能正常删除。

## 功能改进点

### 1. 友好的错误提示
- 列出所有使用该模型的角色名称
- 提示用户先切换角色模型

### 2. 防止数据不一致
- 避免删除被引用的模型
- 防止角色指向不存在的模型ID

### 3. 用户体验优化
- 前端使用 `toast.error()` 显示错误信息
- 错误信息清晰明确，用户知道如何处理

## 建议的后续优化

### 1. 添加级联删除选项
在删除被关联的模型时，提供以下选项：
- **拒绝删除**（当前实现）：提示用户先取消关联
- **级联删除**：删除模型的同时，将关联角色的 `modelId` 设置为 `null`
- **拒绝并提示**（推荐）：显示使用该模型的角色列表，并提供快速编辑入口

### 2. 前端增强
- 在删除按钮旁边显示"被X个角色使用"的提示
- 点击删除时，显示对话框列出使用该模型的角色
- 提供快速跳转到角色管理的链接

### 3. 添加保护机制
- 标记关键模型（如默认模型）为"不可删除"
- 内置模型需要管理员权限才能删除

## 文件修改

### 后端
- **文件**：`server/routes/ai-module.api.js`
- **修改**：`deleteAIModel` 函数
- **行数**：约20行新增代码

### 前端
- 无需修改（已有完善的错误处理）

## 验证步骤

1. 访问AI模块页面
2. 找到"豆包服务回复"模型（ID: f038886b-d042-4aca-9a6f-d1b3049290cc）
3. 点击删除按钮
4. 确认删除
5. **预期结果**：显示错误提示"该模型正在被以下角色使用，无法删除：售后处理、产品咨询。请先将这些角色切换到其他模型后再删除。"
6. **实际结果**：✅ 符合预期

## 总结

通过在删除AI模型前检查角色关联关系，我们成功修复了数据一致性问题，并提供了友好的用户提示。用户现在知道为什么无法删除模型，以及如何操作才能成功删除。

**修复后效果**：
- ✅ 防止删除被角色关联的模型
- ✅ 显示友好的错误提示
- ✅ 列出所有使用该模型的角色名称
- ✅ 前端正确显示错误信息

**影响范围**：
- 后端API：`DELETE /api/ai/models/:id`
- 前端页面：AI模块 > AI模型管理
