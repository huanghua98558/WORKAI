# 机器人系统实施指南

## 📋 实施步骤

### Step 1: 执行数据库迁移

首先需要创建缺失的数据库表，确保数据库结构与Schema定义一致。

```bash
# 在 server/database/migrations/ 目录下执行迁移
psql $DATABASE_URL -f server/database/migrations/004_multi_robot_support.sql
psql $DATABASE_URL -f server/database/migrations/005_robot_commands.sql
psql $DATABASE_URL -f server/database/migrations/006_robot_callbacks_and_metrics.sql
```

### Step 2: 更新 robots 表结构

添加缺失的字段（如果迁移未自动添加）：

```sql
-- 更新现有robots表，添加新字段
ALTER TABLE robots
ADD COLUMN IF NOT EXISTS group_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS role_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_concurrent_sessions INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS current_session_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enabled_intents JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS ai_model_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS response_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS load_balancing_weight INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS health_check_interval INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 添加外键约束
ALTER TABLE robots
ADD CONSTRAINT fk_robots_group_id
FOREIGN KEY (group_id) REFERENCES robot_groups(id) ON DELETE SET NULL;

ALTER TABLE robots
ADD CONSTRAINT fk_robots_role_id
FOREIGN KEY (role_id) REFERENCES robot_roles(id) ON DELETE SET NULL;
```

### Step 3: 插入默认数据

```sql
-- 插入默认分组
INSERT INTO robot_groups (name, description, color, icon, priority) VALUES
('客服机器人', '处理客户服务咨询', '#3B82F6', 'MessageSquare', 10),
('营销机器人', '负责营销活动和推广', '#10B981', 'TrendingUp', 9),
('管理机器人', '系统管理和运维', '#F59E0B', 'Shield', 8),
('测试机器人', '测试和实验用途', '#8B5CF6', 'TestTube', 1)
ON CONFLICT (name) DO NOTHING;

-- 插入默认角色
INSERT INTO robot_roles (name, description, permissions, is_system) VALUES
('管理员', '拥有所有权限', '{"all": true, "admin": true}', true),
('客服', '客服权限，可以回复消息', '{"reply": true, "view": true, "chat": true}', false),
('营销', '营销权限，可以发送营销消息', '{"marketing": true, "view": true, "broadcast": true}', false),
('观察员', '只读权限，只能查看消息', '{"view": true}', false)
ON CONFLICT (name) DO NOTHING;
```

### Step 4: 更新 Schema 定义

在 `server/database/schema.js` 中确保 robots 表定义完整，或者创建新的 Schema 文件。

### Step 5: 创建后端路由文件

#### 创建 `server/routes/robot-groups.api.js`
```javascript
const robotGroupsService = require('../services/robot-groups.service');

const robotGroupsApiRoutes = async function (fastify, options) {
  console.log('[robot-groups.api.js] 机器人分组 API 路由已加载');

  // GET - 获取所有分组
  fastify.get('/robot-groups', async (request, reply) => {
    try {
      const groups = await robotGroupsService.getAllGroups();
      return reply.send({
        code: 0,
        message: 'success',
        data: groups
      });
    } catch (error) {
      return reply.status(500).send({
        code: -1,
        message: '获取分组列表失败',
        error: error.message
      });
    }
  });

  // GET - 获取分组详情
  fastify.get('/robot-groups/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const group = await robotGroupsService.getGroupById(id);

      if (!group) {
        return reply.status(404).send({
          code: 2001,
          message: '分组不存在'
        });
      }

      return reply.send({
        code: 0,
        message: 'success',
        data: group
      });
    } catch (error) {
      return reply.status(500).send({
        code: -1,
        message: '获取分组详情失败',
        error: error.message
      });
    }
  });

  // POST - 创建分组
  fastify.post('/robot-groups', async (request, reply) => {
    try {
      const data = request.body;
      const group = await robotGroupsService.createGroup(data);

      return reply.send({
        code: 0,
        message: '创建成功',
        data: group
      });
    } catch (error) {
      return reply.status(500).send({
        code: -1,
        message: '创建分组失败',
        error: error.message
      });
    }
  });

  // PUT - 更新分组
  fastify.put('/robot-groups/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;
      const group = await robotGroupsService.updateGroup(id, data);

      return reply.send({
        code: 0,
        message: '更新成功',
        data: group
      });
    } catch (error) {
      return reply.status(500).send({
        code: -1,
        message: '更新分组失败',
        error: error.message
      });
    }
  });

  // DELETE - 删除分组
  fastify.delete('/robot-groups/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      await robotGroupsService.deleteGroup(id);

      return reply.send({
        code: 0,
        message: '删除成功'
      });
    } catch (error) {
      return reply.status(500).send({
        code: -1,
        message: '删除分组失败',
        error: error.message
      });
    }
  });

  // GET - 获取分组的机器人
  fastify.get('/robot-groups/:id/robots', async (request, reply) => {
    try {
      const { id } = request.params;
      const robots = await robotGroupsService.getGroupRobots(id);

      return reply.send({
        code: 0,
        message: 'success',
        data: robots
      });
    } catch (error) {
      return reply.status(500).send({
        code: -1,
        message: '获取分组机器人失败',
        error: error.message
      });
    }
  });
};

module.exports = robotGroupsApiRoutes;
```

#### 创建 `server/services/robot-groups.service.js`
```javascript
const { getDb } = require('coze-coding-dev-sdk');
const { robotGroups, robots } = require('../database/schema');
const { eq, desc } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

class RobotGroupsService {
  constructor() {
    this.logger = getLogger('ROBOT_GROUPS');
  }

  async getAllGroups() {
    const db = await getDb();
    const groups = await db.select().from(robotGroups).orderBy(desc(robotGroups.priority));
    return groups;
  }

  async getGroupById(id) {
    const db = await getDb();
    const results = await db.select().from(robotGroups).where(eq(robotGroups.id, id)).limit(1);
    return results[0] || null;
  }

  async createGroup(data) {
    const db = await getDb();
    const result = await db.insert(robotGroups).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateGroup(id, data) {
    const db = await getDb();
    const result = await db.update(robotGroups).set({
      ...data,
      updatedAt: new Date()
    }).where(eq(robotGroups.id, id)).returning();
    return result[0];
  }

  async deleteGroup(id) {
    const db = await getDb();
    const result = await db.delete(robotGroups).where(eq(robotGroups.id, id)).returning();
    return result[0];
  }

  async getGroupRobots(groupId) {
    const db = await getDb();
    const robots = await db.select().from(robots).where(eq(robots.groupId, groupId));
    return robots;
  }
}

module.exports = new RobotGroupsService();
```

### Step 6: 更新 robot.service.js

确保 `robot.service.js` 中的 `addRobot` 和 `updateRobot` 方法支持 `group_id` 和 `role_id`：

```javascript
async addRobot(data) {
  const db = await getDb();

  // 生成回调地址和通讯地址
  const urls = this.generateRobotUrls(
    data.robotId,
    data.apiBaseUrl,
    data.callbackBaseUrl || process.env.CALLBACK_BASE_URL || 'http://localhost:5000'
  );

  const result = await db.insert(robots).values({
    ...data,
    ...urls,
    groupId: data.groupId || null,
    roleId: data.roleId || null,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  return result[0];
}
```

### Step 7: 注册新路由

在 `server/app.js` 中注册新的路由：

```javascript
const robotGroupsApiRoutes = require('./routes/robot-groups.api');
const robotRolesApiRoutes = require('./routes/robot-roles.api');

fastify.register(robotGroupsApiRoutes, { prefix: '/api/admin' });
fastify.register(robotRolesApiRoutes, { prefix: '/api/admin' });
```

### Step 8: 更新前端 API

修改 `src/app/api/admin/robot-groups/route.ts`，确保正确处理响应：

```typescript
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = new URL('/api/admin/robot-groups', BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();

    if (!text) {
      return NextResponse.json(
        { success: false, message: '后端返回空响应' },
        { status: 500 }
      );
    }

    const data = JSON.parse(text);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('获取机器人分组失败:', error);
    return NextResponse.json(
      { success: false, message: '获取机器人分组失败', error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = new URL('/api/admin/robot-groups', BACKEND_URL);

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();

    if (!text) {
      return NextResponse.json(
        { success: false, message: '后端返回空响应' },
        { status: 500 }
      );
    }

    const data = JSON.parse(text);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('创建机器人分组失败:', error);
    return NextResponse.json(
      { success: false, message: '创建机器人分组失败', error: String(error) },
      { status: 500 }
    );
  }
}
```

### Step 9: 测试API

```bash
# 测试分组列表
curl http://localhost:5001/api/admin/robot-groups

# 测试创建分组
curl -X POST http://localhost:5001/api/admin/robot-groups \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试分组",
    "description": "这是一个测试分组",
    "color": "#FF0000",
    "icon": "Test"
  }'

# 测试机器人列表
curl http://localhost:5001/api/admin/robots

# 测试创建机器人
curl -X POST http://localhost:5001/api/admin/robots \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试机器人",
    "robotId": "test-robot-001",
    "apiBaseUrl": "https://worktool.example.com/wework",
    "description": "这是一个测试机器人",
    "groupId": "xxx",
    "roleId": "xxx"
  }'
```

### Step 10: 重启服务

```bash
# 停止现有服务
kill $(cat /workspace/projects/logs/backend.pid 2>/dev/null) 2>/dev/null

# 重新启动
coze dev
```

---

## ✅ 验证清单

- [ ] 数据库迁移执行成功
- [ ] robot_groups 表存在
- [ ] robot_roles 表存在
- [ ] robots 表包含所有字段
- [ ] 后端服务启动正常
- [ ] 分组管理API可访问
- [ ] 角色管理API可访问
- [ ] 机器人管理API可访问
- [ ] 前端能正常显示数据
- [ ] 添加机器人功能正常

---

## 🔍 故障排查

### 问题1: 后端返回空响应
**原因**: 后端API出错或数据库查询失败
**解决**: 检查后端日志 `tail -f logs/backend.log`

### 问题2: 表不存在错误
**原因**: 数据库迁移未执行
**解决**: 重新执行迁移脚本

### 问题3: 字段不存在错误
**原因**: robots表缺少字段
**解决**: 执行ALTER TABLE语句添加字段

---

**文档版本**: v1.0
**最后更新**: 2026-02-06
