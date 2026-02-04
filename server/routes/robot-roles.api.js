/**
 * 机器人角色管理 API 路由
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

const robotRolesApiRoutes = async function (fastify, options) {
  console.log('[robot-roles.api.js] 机器人角色管理 API 路由已加载');

  // 获取所有机器人角色
  fastify.get('/admin/robot-roles', async (request, reply) => {
    try {
      const db = await getDb();
      
      // 从数据库查询所有角色，并统计每个角色的机器人数量
      const result = await db.execute(sql`
        SELECT 
          rr.id,
          rr.name,
          rr.description,
          rr.permissions,
          rr.is_system,
          rr.created_at,
          rr.updated_at,
          COUNT(r.id) as robot_count
        FROM robot_roles rr
        LEFT JOIN robots r ON r.role_id = rr.id
        GROUP BY rr.id, rr.name, rr.description, rr.permissions, rr.is_system, rr.created_at, rr.updated_at
        ORDER BY rr.is_system DESC, rr.created_at ASC
      `);

      const roles = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        priority: 10, // 默认优先级
        permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || []),
        is_system: row.is_system,
        created_at: row.created_at,
        updated_at: row.updated_at,
        robot_count: parseInt(row.robot_count) || 0
      }));

      return reply.send({
        success: true,
        message: 'success',
        data: roles
      });
    } catch (error) {
      console.error('获取机器人角色失败:', error);
      return reply.status(500).send({
        success: false,
        message: '获取机器人角色失败',
        error: error.message
      });
    }
  });

  // 获取单个机器人角色
  fastify.get('/admin/robot-roles/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const db = await getDb();

      const result = await db.execute(sql`
        SELECT 
          rr.id,
          rr.name,
          rr.description,
          rr.permissions,
          rr.is_system,
          rr.created_at,
          rr.updated_at,
          COUNT(r.id) as robot_count
        FROM robot_roles rr
        LEFT JOIN robots r ON r.role_id = rr.id
        WHERE rr.id = ${id}
        GROUP BY rr.id, rr.name, rr.description, rr.permissions, rr.is_system, rr.created_at, rr.updated_at
      `);

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          message: '角色不存在'
        });
      }

      const row = result.rows[0];
      const role = {
        id: row.id,
        name: row.name,
        description: row.description,
        priority: 10, // 默认优先级
        permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || []),
        is_system: row.is_system,
        created_at: row.created_at,
        updated_at: row.updated_at,
        robot_count: parseInt(row.robot_count) || 0
      };

      return reply.send({
        success: true,
        message: 'success',
        data: role
      });
    } catch (error) {
      console.error('获取机器人角色失败:', error);
      return reply.status(500).send({
        success: false,
        message: '获取机器人角色失败',
        error: error.message
      });
    }
  });

  // 创建机器人角色
  fastify.post('/admin/robot-roles', async (request, reply) => {
    try {
      const data = request.body;
      const db = await getDb();
      
      console.log('[robot-roles.api] 创建角色:', data);

      const id = `role-${Date.now()}`;
      const now = new Date();

      await db.execute(sql`
        INSERT INTO robot_roles (
          id, name, description, permissions, is_system, created_at, updated_at
        ) VALUES (${id}, ${data.name}, ${data.description || null}, ${JSON.stringify(Array.isArray(data.permissions) ? data.permissions : [])}, ${data.is_system || false}, ${now}, ${now})
      `);

      const newRole = {
        id,
        name: data.name,
        description: data.description || null,
        priority: data.priority || 10,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        is_system: data.is_system || false,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        robot_count: 0
      };

      console.log('[robot-roles.api] 创建成功:', newRole);

      return reply.send({
        success: true,
        message: '创建成功',
        data: newRole
      });
    } catch (error) {
      console.error('创建机器人角色失败:', error);
      return reply.status(500).send({
        success: false,
        message: '创建机器人角色失败',
        error: error.message
      });
    }
  });

  // 更新机器人角色
  fastify.put('/admin/robot-roles/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;
      const db = await getDb();
      
      console.log('[robot-roles.api] 更新角色:', id, data);

      const now = new Date();

      await db.execute(sql`
        UPDATE robot_roles
        SET 
          name = ${data.name},
          description = ${data.description || null},
          permissions = ${JSON.stringify(Array.isArray(data.permissions) ? data.permissions : [])},
          updated_at = ${now}
        WHERE id = ${id}
      `);

      const updatedRole = {
        id,
        name: data.name,
        description: data.description || null,
        priority: data.priority || 10,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        updated_at: now.toISOString()
      };

      console.log('[robot-roles.api] 更新成功:', updatedRole);

      return reply.send({
        success: true,
        message: '更新成功',
        data: updatedRole
      });
    } catch (error) {
      console.error('更新机器人角色失败:', error);
      return reply.status(500).send({
        success: false,
        message: '更新机器人角色失败',
        error: error.message
      });
    }
  });

  // 删除机器人角色
  fastify.delete('/admin/robot-roles/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const db = await getDb();
      
      console.log('[robot-roles.api] 删除角色:', id);

      // 先将该角色下的机器人的 role_id 设置为 null
      await db.execute(sql`
        UPDATE robots SET role_id = NULL WHERE role_id = ${id}
      `);

      // 删除角色
      await db.execute(sql`
        DELETE FROM robot_roles WHERE id = ${id} AND is_system = false
      `);

      return reply.send({
        success: true,
        message: '删除成功'
      });
    } catch (error) {
      console.error('删除机器人角色失败:', error);
      return reply.status(500).send({
        success: false,
        message: '删除机器人角色失败',
        error: error.message
      });
    }
  });
};

module.exports = robotRolesApiRoutes;
