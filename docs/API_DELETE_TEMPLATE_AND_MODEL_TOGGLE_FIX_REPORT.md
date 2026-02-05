# 话术模板删除和AI模型启用/禁用功能修复报告

## 修改日期
2025年1月X日

## 问题描述

用户反馈两个功能失败：
1. 话术模板删除失败
2. AI模型启用/禁用失败

## 问题分析

### 1. 话术模板删除问题

**分析结果**：话术模板删除功能**正常工作**

测试结果：
```bash
curl -X DELETE http://localhost:5001/api/ai/templates/57e4d9c5-95be-436d-917d-e54b82c18b42
```

返回：
```json
{"success":true,"message":"话术模板删除成功"}
```

**结论**：话术模板删除API（`DELETE /api/ai/templates/:id`）已正确实现并正常工作。

### 2. AI模型启用/禁用问题

**根本原因**：后端缺少启用/禁用的API路由

前端调用：
```typescript
const handleToggleModelStatus = async (modelId: string, currentStatus: string) => {
  const newStatus = currentStatus === 'active' ? 'disable' : 'enable';
  const response = await fetch(`/api/proxy/ai/models/${modelId}/${newStatus}`, {
    method: 'POST'
  });
};
```

前端期望的API路径：
- `POST /api/ai/models/:id/enable` - 启用AI模型
- `POST /api/ai/models/:id/disable` - 禁用AI模型

后端实际路由（修复前）：
```javascript
// AI模型管理
fastify.get('/models', getAIModels);
fastify.post('/models', createAIModel);
fastify.put('/models/:id', updateAIModel);
fastify.delete('/models/:id', deleteAIModel);
fastify.post('/models/:id/health-check', healthCheckAIModel);
// ❌ 缺少 enable 和 disable 路由
```

## 解决方案

### 1. 添加启用AI模型API

```javascript
/**
 * POST /api/ai/models/:id/enable - 启用AI模型
 */
async function enableAIModel(request, reply) {
  const { id } = request.params;

  try {
    const db = await getDb();

    const result = await db.update(aiModels)
      .set({ isEnabled: true, updatedAt: new Date() })
      .where(eq(aiModels.id, id))
      .returning();

    if (result.length === 0) {
      return reply.code(404).send({
        success: false,
        error: 'AI模型不存在'
      });
    }

    return reply.send({
      success: true,
      data: result[0],
      message: 'AI模型启用成功'
    });
  } catch (error) {
    logger.error('启用AI模型失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}
```

### 2. 添加禁用AI模型API

```javascript
/**
 * POST /api/ai/models/:id/disable - 禁用AI模型
 */
async function disableAIModel(request, reply) {
  const { id } = request.params;

  try {
    const db = await getDb();

    const result = await db.update(aiModels)
      .set({ isEnabled: false, updatedAt: new Date() })
      .where(eq(aiModels.id, id))
      .returning();

    if (result.length === 0) {
      return reply.code(404).send({
        success: false,
        error: 'AI模型不存在'
      });
    }

    return reply.send({
      success: true,
      data: result[0],
      message: 'AI模型禁用成功'
    });
  } catch (error) {
    logger.error('禁用AI模型失败:', error);
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
}
```

### 3. 注册新的路由

```javascript
module.exports = async function (fastify, options) {
  // AI模型管理
  fastify.get('/models', getAIModels);
  fastify.post('/models', createAIModel);
  fastify.put('/models/:id', updateAIModel);
  fastify.delete('/models/:id', deleteAIModel);
  fastify.post('/models/:id/health-check', healthCheckAIModel);
  fastify.post('/models/:id/enable', enableAIModel);      // ✅ 新增
  fastify.post('/models/:id/disable', disableAIModel);    // ✅ 新增

  // ... 其他路由
};
```

### 4. 重启后端服务

```bash
# 停止旧服务
kill 13309

# 启动新服务
cd server && PORT=5001 node app.js > /app/work/logs/bypass/server.log 2>&1 &
```

## 验证测试

### 测试1：禁用AI模型

```bash
curl -X POST http://localhost:5001/api/ai/models/45d2b7c7-40ef-4f1e-bed8-c133168f8255/disable
```

返回：
```json
{
  "success": true,
  "data": {
    "id": "45d2b7c7-40ef-4f1e-bed8-c133168f8255",
    "name": "doubao-pro-4k-intent",
    "displayName": "豆包Pro 4K（意图识别）",
    "isEnabled": false,
    "updatedAt": "2026-02-05T02:22:21.440Z"
  },
  "message": "AI模型禁用成功"
}
```

### 测试2：启用AI模型

```bash
curl -X POST http://localhost:5001/api/ai/models/45d2b7c7-40ef-4f1e-bed8-c133168f8255/enable
```

返回：
```json
{
  "success": true,
  "data": {
    "id": "45d2b7c7-40ef-4f1e-bed8-c133168f8255",
    "name": "doubao-pro-4k-intent",
    "displayName": "豆包Pro 4K（意图识别）",
    "isEnabled": true,
    "updatedAt": "2026-02-05T02:22:23.953Z"
  },
  "message": "AI模型启用成功"
}
```

## API规范

### 启用AI模型

**请求**：
- 方法：`POST`
- 路径：`/api/ai/models/:id/enable`
- 参数：
  - `id` (路径参数): AI模型ID

**响应**：
- 成功 (200)：
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "isEnabled": true,
      "updatedAt": "ISO 8601"
    },
    "message": "AI模型启用成功"
  }
  ```
- 失败 (404)：
  ```json
  {
    "success": false,
    "error": "AI模型不存在"
  }
  ```
- 失败 (500)：
  ```json
  {
    "success": false,
    "error": "错误消息"
  }
  ```

### 禁用AI模型

**请求**：
- 方法：`POST`
- 路径：`/api/ai/models/:id/disable`
- 参数：
  - `id` (路径参数): AI模型ID

**响应**：
- 成功 (200)：
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "isEnabled": false,
      "updatedAt": "ISO 8601"
    },
    "message": "AI模型禁用成功"
  }
  ```
- 失败 (404)：
  ```json
  {
    "success": false,
    "error": "AI模型不存在"
  }
  ```
- 失败 (500)：
  ```json
  {
    "success": false,
    "error": "错误消息"
  }
  ```

## 修改文件

- `server/routes/ai-module.api.js`
  - 第217-247行：添加 `enableAIModel` 函数
  - 第249-279行：添加 `disableAIModel` 函数
  - 第1128-1129行：注册启用和禁用路由

## 注意事项

1. **数据库字段**：AI模型表中的 `isEnabled` 字段用于存储启用/禁用状态
2. **时间戳**：每次更新状态时会自动更新 `updatedAt` 字段
3. **错误处理**：包含完整的错误处理和日志记录
4. **返回值**：成功时返回更新后的模型数据，方便前端刷新状态

## 技术要点

1. **路由设计**：使用RESTful风格的URL路径
2. **数据库操作**：使用Drizzle ORM进行数据库更新
3. **条件更新**：仅更新 `isEnabled` 和 `updatedAt` 字段
4. **返回值处理**：使用 `.returning()` 获取更新后的数据
5. **错误处理**：完善的错误处理和日志记录

## 后续优化建议

1. 可以考虑添加批量启用/禁用功能
2. 可以考虑添加启用/禁用操作的历史记录
3. 可以考虑添加权限控制，限制只有管理员可以启用/禁用模型
4. 可以考虑添加软删除功能，而不是硬删除
