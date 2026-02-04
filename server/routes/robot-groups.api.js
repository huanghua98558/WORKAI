/**
 * 机器人分组管理 API 路由
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

const robotGroupsApiRoutes = async function (fastify, options) {
  console.log('[robot-groups.api.js] 机器人分组管理 API 路由已加载');

  // 获取所有机器人分组
  fastify.get('/admin/robot-groups', async (request, reply) => {
    try {
      const db = await getDb();
      
      // 从数据库查询所有分组，并统计每个分组的机器人数量
      const result = await db.execute(sql`
        SELECT 
          rg.id,
          rg.name,
          rg.description,
          rg.color,
          rg.icon,
          rg.priority,
          rg.is_enabled,
          rg.created_at,
          rg.updated_at,
          COUNT(r.id) as robot_count
        FROM robot_groups rg
        LEFT JOIN robots r ON r.group_id = rg.id
        GROUP BY rg.id, rg.name, rg.description, rg.color, rg.icon, rg.priority, rg.is_enabled, rg.created_at, rg.updated_at
        ORDER BY rg.priority DESC, rg.created_at DESC
      `);

      const groups = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color,
        icon: row.icon,
        priority: row.priority,
        is_enabled: row.is_enabled,
        created_at: row.created_at,
        updated_at: row.updated_at,
        robot_count: parseInt(row.robot_count) || 0
      }));

      return reply.send({
        success: true,
        message: 'success',
        data: groups
      });
    } catch (error) {
      console.error('获取机器人分组失败:', error);
      return reply.status(500).send({
        success: false,
        message: '获取机器人分组失败',
        error: error.message
      });
    }
  });

  // 获取单个机器人分组
  fastify.get('/admin/robot-groups/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const db = await getDb();

      const result = await db.execute(sql`
        SELECT 
          rg.id,
          rg.name,
          rg.description,
          rg.color,
          rg.icon,
          rg.priority,
          rg.is_enabled,
          rg.created_at,
          rg.updated_at,
          COUNT(r.id) as robot_count
        FROM robot_groups rg
        LEFT JOIN robots r ON r.group_id = rg.id
        WHERE rg.id = ${id}
        GROUP BY rg.id, rg.name, rg.description, rg.color, rg.icon, rg.priority, rg.is_enabled, rg.created_at, rg.updated_at
      `);

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          message: '分组不存在'
        });
      }

      const row = result.rows[0];
      const group = {
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color,
        icon: row.icon,
        priority: row.priority,
        is_enabled: row.is_enabled,
        created_at: row.created_at,
        updated_at: row.updated_at,
        robot_count: parseInt(row.robot_count) || 0
      };

      return reply.send({
        success: true,
        message: 'success',
        data: group
      });
    } catch (error) {
      console.error('获取机器人分组失败:', error);
      return reply.status(500).send({
        success: false,
        message: '获取机器人分组失败',
        error: error.message
      });
    }
  });

  // 创建机器人分组
  fastify.post('/admin/robot-groups', async (request, reply) => {
    try {
      const data = request.body;
      const db = await getDb();
      
      console.log('[robot-groups.api] 创建分组:', data);

      const id = `group-${Date.now()}`;
      const now = new Date();

      await db.execute(sql`
        INSERT INTO robot_groups (
          id, name, description, color, icon, priority, is_enabled, created_at, updated_at
        ) VALUES (${id}, ${data.name}, ${data.description || null}, ${data.color || '#3b82f6'}, ${data.icon || '🤖'}, ${data.priority || 10}, ${data.is_enabled !== undefined ? data.is_enabled : true}, ${now}, ${now})
      `);

      const newGroup = {
        id,
        name: data.name,
        description: data.description || null,
        color: data.color || '#3b82f6',
        icon: data.icon || '🤖',
        priority: data.priority || 10,
        is_enabled: data.is_enabled !== undefined ? data.is_enabled : true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        robot_count: 0
      };

      console.log('[robot-groups.api] 创建成功:', newGroup);

      return reply.send({
        success: true,
        message: '创建成功',
        data: newGroup
      });
    } catch (error) {
      console.error('创建机器人分组失败:', error);
      return reply.status(500).send({
        success: false,
        message: '创建机器人分组失败',
        error: error.message
      });
    }
  });

  // 更新机器人分组
  fastify.put('/admin/robot-groups/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;
      const db = await getDb();
      
      console.log('[robot-groups.api] 更新分组:', id, data);

      const now = new Date();

      await db.execute(sql`
        UPDATE robot_groups
        SET 
          name = ${data.name},
          description = ${data.description || null},
          color = ${data.color || '#3b82f6'},
          icon = ${data.icon || '🤖'},
          priority = ${data.priority || 10},
          is_enabled = ${data.is_enabled !== undefined ? data.is_enabled : true},
          updated_at = ${now}
        WHERE id = ${id}
      `);

      const updatedGroup = {
        id,
        name: data.name,
        description: data.description || null,
        color: data.color || '#3b82f6',
        icon: data.icon || '🤖',
        priority: data.priority || 10,
        is_enabled: data.is_enabled !== undefined ? data.is_enabled : true,
        updated_at: now.toISOString()
      };

      console.log('[robot-groups.api] 更新成功:', updatedGroup);

      return reply.send({
        success: true,
        message: '更新成功',
        data: updatedGroup
      });
    } catch (error) {
      console.error('更新机器人分组失败:', error);
      return reply.status(500).send({
        success: false,
        message: '更新机器人分组失败',
        error: error.message
      });
    }
  });

  // 删除机器人分组
  fastify.delete('/admin/robot-groups/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const db = await getDb();
      
      console.log('[robot-groups.api] 删除分组:', id);

      // 先将该分组下的机器人的 group_id 设置为 null
      await db.execute(sql`
        UPDATE robots SET group_id = NULL WHERE group_id = ${id}
      `);

      // 删除分组
      await db.execute(sql`
        DELETE FROM robot_groups WHERE id = ${id}
      `);

      return reply.send({
        success: true,
        message: '删除成功'
      });
    } catch (error) {
      console.error('删除机器人分组失败:', error);
      return reply.status(500).send({
        success: false,
        message: '删除机器人分组失败',
        error: error.message
      });
    }
  });
};

module.exports = robotGroupsApiRoutes;
