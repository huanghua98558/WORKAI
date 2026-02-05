/**
 * 用户助理关联管理 API 路由
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

const userAssistantsApiRoutes = async function (fastify, options) {
  console.log('[user-assistants.api.js] 用户助理关联管理 API 路由已加载');

  // 获取用户的助理列表
  fastify.get('/admin/users/:userId/assistants', async (request, reply) => {
    try {
      const { userId } = request.params;
      const db = await getDb();
      
      const result = await db.execute(sql`
        SELECT 
          ua.id,
          ua.user_id,
          ua.robot_id,
          ua.assistant_type,
          ua.priority,
          ua.is_active,
          ua.max_concurrent_sessions,
          ua.routing_config,
          ua.created_at,
          ua.updated_at,
          r.name as robot_name,
          r.api_base_url,
          r.status as robot_status,
          r.is_active as robot_is_active,
          rg.name as group_name,
          rg.color as group_color,
          rg.icon as group_icon,
          ro.name as role_name,
          COUNT(sa.id) as session_count
        FROM user_assistants ua
        LEFT JOIN robots r ON ua.robot_id = r.robot_id
        LEFT JOIN robot_groups rg ON r.group_id = rg.id
        LEFT JOIN robot_roles ro ON r.role_id = ro.id
        LEFT JOIN session_assignments sa ON sa.assigned_robot_id = ua.robot_id AND sa.status = 'active'
        WHERE ua.user_id = ${userId}
        GROUP BY ua.id, r.id, rg.id, ro.id
        ORDER BY ua.priority DESC, ua.created_at ASC
      `);

      const assistants = result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        robot_id: row.robot_id,
        robot_name: row.robot_name,
        assistant_type: row.assistant_type,
        priority: row.priority,
        is_active: row.is_active,
        max_concurrent_sessions: row.max_concurrent_sessions,
        routing_config: typeof row.routing_config === 'string' 
          ? JSON.parse(row.routing_config) 
          : (row.routing_config || {}),
        created_at: row.created_at,
        updated_at: row.updated_at,
        robot_info: {
          name: row.robot_name,
          api_base_url: row.api_base_url,
          status: row.robot_status,
          is_active: row.robot_is_active,
          group_name: row.group_name,
          group_color: row.group_color,
          group_icon: row.group_icon,
          role_name: row.role_name
        },
        session_count: parseInt(row.session_count) || 0
      }));

      return reply.send({
        success: true,
        message: 'success',
        data: assistants
      });
    } catch (error) {
      console.error('获取用户助理列表失败:', error);
      return reply.status(500).send({
        success: false,
        message: '获取用户助理列表失败',
        error: error.message
      });
    }
  });

  // 为用户添加助理
  fastify.post('/admin/users/:userId/assistants', async (request, reply) => {
    try {
      const { userId } = request.params;
      const data = request.body;
      const db = await getDb();
      
      console.log('[user-assistants.api] 为用户添加助理:', userId, data);

      // 检查机器人是否存在
      const robotCheck = await db.execute(sql`
        SELECT robot_id, name, is_active FROM robots WHERE robot_id = ${data.robot_id}
      `);

      if (robotCheck.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          message: '机器人不存在'
        });
      }

      const id = `ua-${Date.now()}`;
      const now = new Date();

      await db.execute(sql`
        INSERT INTO user_assistants (
          id, user_id, robot_id, assistant_type, priority, is_active, 
          max_concurrent_sessions, routing_config, created_at, updated_at
        ) VALUES (
          ${id}, ${userId}, ${data.robot_id}, ${data.assistant_type || 'primary'}, 
          ${data.priority || 10}, ${data.is_active !== undefined ? data.is_active : true}, 
          ${data.max_concurrent_sessions || 10}, 
          ${JSON.stringify(data.routing_config || {})}, ${now}, ${now}
        )
      `);

      const newAssistant = {
        id,
        user_id: userId,
        robot_id: data.robot_id,
        robot_name: robotCheck.rows[0].name,
        assistant_type: data.assistant_type || 'primary',
        priority: data.priority || 10,
        is_active: data.is_active !== undefined ? data.is_active : true,
        max_concurrent_sessions: data.max_concurrent_sessions || 10,
        routing_config: data.routing_config || {},
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        session_count: 0
      };

      console.log('[user-assistants.api] 添加成功:', newAssistant);

      return reply.send({
        success: true,
        message: '添加成功',
        data: newAssistant
      });
    } catch (error) {
      console.error('添加用户助理失败:', error);
      return reply.status(500).send({
        success: false,
        message: '添加用户助理失败',
        error: error.message
      });
    }
  });

  // 更新用户助理配置
  fastify.put('/admin/users/:userId/assistants/:id', async (request, reply) => {
    try {
      const { userId, id } = request.params;
      const data = request.body;
      const db = await getDb();
      
      console.log('[user-assistants.api] 更新用户助理:', userId, id, data);

      const now = new Date();

      await db.execute(sql`
        UPDATE user_assistants
        SET 
          assistant_type = ${data.assistant_type},
          priority = ${data.priority},
          is_active = ${data.is_active},
          max_concurrent_sessions = ${data.max_concurrent_sessions},
          routing_config = ${JSON.stringify(data.routing_config || {})},
          updated_at = ${now}
        WHERE id = ${id} AND user_id = ${userId}
      `);

      const updatedAssistant = {
        id,
        user_id: userId,
        ...data,
        updated_at: now.toISOString()
      };

      console.log('[user-assistants.api] 更新成功:', updatedAssistant);

      return reply.send({
        success: true,
        message: '更新成功',
        data: updatedAssistant
      });
    } catch (error) {
      console.error('更新用户助理失败:', error);
      return reply.status(500).send({
        success: false,
        message: '更新用户助理失败',
        error: error.message
      });
    }
  });

  // 删除用户助理
  fastify.delete('/admin/users/:userId/assistants/:id', async (request, reply) => {
    try {
      const { userId, id } = request.params;
      const db = await getDb();
      
      console.log('[user-assistants.api] 删除用户助理:', userId, id);

      await db.execute(sql`
        DELETE FROM user_assistants 
        WHERE id = ${id} AND user_id = ${userId}
      `);

      console.log('[user-assistants.api] 删除成功');

      return reply.send({
        success: true,
        message: '删除成功'
      });
    } catch (error) {
      console.error('删除用户助理失败:', error);
      return reply.status(500).send({
        success: false,
        message: '删除用户助理失败',
        error: error.message
      });
    }
  });

  // 批量为用户分配助理
  fastify.post('/admin/users/:userId/assistants/batch', async (request, reply) => {
    try {
      const { userId } = request.params;
      const { assistant_configs } = request.body;
      const db = await getDb();
      
      console.log('[user-assistants.api] 批量分配助理:', userId, assistant_configs);

      const now = new Date();
      const results = [];

      for (const config of assistant_configs) {
        try {
          const id = `ua-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          await db.execute(sql`
            INSERT INTO user_assistants (
              id, user_id, robot_id, assistant_type, priority, is_active, 
              max_concurrent_sessions, routing_config, created_at, updated_at
            ) VALUES (
              ${id}, ${userId}, ${config.robot_id}, ${config.assistant_type || 'primary'}, 
              ${config.priority || 10}, ${config.is_active !== undefined ? config.is_active : true}, 
              ${config.max_concurrent_sessions || 10}, 
              ${JSON.stringify(config.routing_config || {})}, ${now}, ${now}
            )
            ON CONFLICT (user_id, robot_id, assistant_type) 
            DO UPDATE SET
              priority = ${config.priority || 10},
              is_active = ${config.is_active !== undefined ? config.is_active : true},
              max_concurrent_sessions = ${config.max_concurrent_sessions || 10},
              routing_config = ${JSON.stringify(config.routing_config || {})},
              updated_at = ${now}
          `);

          results.push({
            success: true,
            robot_id: config.robot_id,
            id
          });
        } catch (err) {
          console.error('分配助理失败:', config.robot_id, err);
          results.push({
            success: false,
            robot_id: config.robot_id,
            error: err.message
          });
        }
      }

      return reply.send({
        success: true,
        message: '批量分配完成',
        data: results
      });
    } catch (error) {
      console.error('批量分配助理失败:', error);
      return reply.status(500).send({
        success: false,
        message: '批量分配助理失败',
        error: error.message
      });
    }
  });

  // 获取用户可用的助理列表（用于前端选择）
  fastify.get('/admin/users/:userId/available-assistants', async (request, reply) => {
    try {
      const { userId } = request.params;
      const { type, include_assigned = 'true' } = request.query;
      const db = await getDb();
      
      let query = sql`
        SELECT 
          r.robot_id as id,
          r.name,
          r.api_base_url,
          r.is_active,
          r.status,
          r.priority,
          r.group_id,
          r.role_id,
          rg.name as group_name,
          rg.color as group_color,
          rg.icon as group_icon,
          ro.name as role_name,
          ua.id as assistant_id,
          ua.assistant_type,
          ua.priority as user_priority,
          ua.is_active as user_is_active
        FROM robots r
        LEFT JOIN robot_groups rg ON r.group_id = rg.id
        LEFT JOIN robot_roles ro ON r.role_id = ro.id
        LEFT JOIN user_assistants ua ON ua.robot_id = r.robot_id AND ua.user_id = ${userId}
        WHERE r.is_active = true
      `;

      if (include_assigned === 'false') {
        query = sql`${query} AND ua.id IS NULL`;
      }

      if (type) {
        query = sql`${query} AND (ua.assistant_type = ${type} OR ua.id IS NULL)`;
      }

      query = sql`${query} ORDER BY r.priority DESC, r.name ASC`;

      const result = await db.execute(query);

      const assistants = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        api_base_url: row.api_base_url,
        is_active: row.is_active,
        status: row.status,
        priority: row.priority,
        group_name: row.group_name,
        group_color: row.group_color,
        group_icon: row.group_icon,
        role_name: row.role_name,
        is_assigned: row.assistant_id !== null,
        assistant_id: row.assistant_id,
        assistant_type: row.assistant_type,
        user_priority: row.user_priority,
        user_is_active: row.user_is_active
      }));

      return reply.send({
        success: true,
        message: 'success',
        data: assistants
      });
    } catch (error) {
      console.error('获取可用助理列表失败:', error);
      return reply.status(500).send({
        success: false,
        message: '获取可用助理列表失败',
        error: error.message
      });
    }
  });
};

module.exports = userAssistantsApiRoutes;
