/**
 * 用户管理 API 路由
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

const usersApiRoutes = async function (fastify, options) {
  console.log('[users.api.js] 用户管理 API 路由已加载');

  // 获取所有用户
  fastify.get('/admin/users', async (request, reply) => {
    try {
      const db = await getDb();
      const { page = 1, limit = 20, role_id, is_active, search } = request.query;
      
      let query = sql`
        SELECT 
          u.id,
          u.user_id,
          u.name,
          u.nickname,
          u.avatar_url,
          u.email,
          u.phone,
          u.role_id,
          ur.display_name as role_name,
          ur.name as role_code,
          u.tags,
          u.preferences,
          u.is_active,
          u.is_blocked,
          u.created_at,
          u.updated_at,
          u.last_login_at,
          COUNT(DISTINCT ua.id) as assistant_count
        FROM users u
        LEFT JOIN user_roles ur ON u.role_id = ur.id
        LEFT JOIN user_assistants ua ON u.id = ua.user_id
      `;

      // 添加筛选条件
      const conditions = [];
      if (role_id) {
        conditions.push(sql`u.role_id = ${role_id}`);
      }
      if (is_active !== undefined) {
        conditions.push(sql`u.is_active = ${is_active === 'true'}`);
      }
      if (search) {
        conditions.push(sql`(
          u.name ILIKE ${'%' + search + '%'} OR 
          u.nickname ILIKE ${'%' + search + '%'} OR 
          u.email ILIKE ${'%' + search + '%'}
        )`);
      }

      if (conditions.length > 0) {
        query = sql`${query} WHERE ${sql.join(conditions, sql` AND `)}`;
      }

      // 分页
      const offset = (page - 1) * limit;
      query = sql`
        ${query}
        GROUP BY u.id, ur.id
        ORDER BY u.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const result = await db.execute(query);

      // 获取总数
      let countQuery = sql`SELECT COUNT(DISTINCT u.id) as total FROM users u`;
      if (conditions.length > 0) {
        countQuery = sql`
          ${countQuery}
          LEFT JOIN user_roles ur ON u.role_id = ur.id
          WHERE ${sql.join(conditions, sql` AND `)}
        `;
      }
      const countResult = await db.execute(countQuery);
      const total = parseInt(countResult.rows[0]?.total || 0);

      const users = result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        nickname: row.nickname,
        avatar_url: row.avatar_url,
        email: row.email,
        phone: row.phone,
        role_id: row.role_id,
        role_name: row.role_name,
        role_code: row.role_code,
        tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
        preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : (row.preferences || {}),
        is_active: row.is_active,
        is_blocked: row.is_blocked,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_login_at: row.last_login_at,
        assistant_count: parseInt(row.assistant_count) || 0
      }));

      return reply.send({
        success: true,
        message: 'success',
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return reply.status(500).send({
        success: false,
        message: '获取用户列表失败',
        error: error.message
      });
    }
  });

  // 获取单个用户
  fastify.get('/admin/users/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const db = await getDb();

      const result = await db.execute(sql`
        SELECT 
          u.*,
          ur.display_name as role_name,
          ur.name as role_code,
          ur.permissions as role_permissions
        FROM users u
        LEFT JOIN user_roles ur ON u.role_id = ur.id
        WHERE u.id = ${id}
      `);

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          message: '用户不存在'
        });
      }

      const row = result.rows[0];
      const user = {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        nickname: row.nickname,
        avatar_url: row.avatar_url,
        email: row.email,
        phone: row.phone,
        role_id: row.role_id,
        role_name: row.role_name,
        role_code: row.role_code,
        role_permissions: typeof row.role_permissions === 'string' 
          ? JSON.parse(row.role_permissions) 
          : (row.role_permissions || {}),
        tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
        preferences: typeof row.preferences === 'string' 
          ? JSON.parse(row.preferences) 
          : (row.preferences || {}),
        is_active: row.is_active,
        is_blocked: row.is_blocked,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_login_at: row.last_login_at
      };

      return reply.send({
        success: true,
        message: 'success',
        data: user
      });
    } catch (error) {
      console.error('获取用户失败:', error);
      return reply.status(500).send({
        success: false,
        message: '获取用户失败',
        error: error.message
      });
    }
  });

  // 创建用户
  fastify.post('/admin/users', async (request, reply) => {
    try {
      const data = request.body;
      const db = await getDb();
      
      console.log('[users.api] 创建用户:', data);

      const id = `user-${Date.now()}`;
      const now = new Date();

      await db.execute(sql`
        INSERT INTO users (
          id, user_id, name, nickname, avatar_url, email, phone, role_id, 
          tags, preferences, is_active, is_blocked, created_at, updated_at
        ) VALUES (
          ${id}, ${data.user_id}, ${data.name || null}, ${data.nickname || null}, 
          ${data.avatar_url || null}, ${data.email || null}, ${data.phone || null}, 
          ${data.role_id || null}, 
          ${JSON.stringify(Array.isArray(data.tags) ? data.tags : [])}, 
          ${JSON.stringify(data.preferences || {})}, 
          ${data.is_active !== undefined ? data.is_active : true}, 
          ${data.is_blocked || false}, ${now}, ${now}
        )
      `);

      const newUser = {
        id,
        user_id: data.user_id,
        name: data.name,
        nickname: data.nickname,
        avatar_url: data.avatar_url,
        email: data.email,
        phone: data.phone,
        role_id: data.role_id,
        tags: Array.isArray(data.tags) ? data.tags : [],
        preferences: data.preferences || {},
        is_active: data.is_active !== undefined ? data.is_active : true,
        is_blocked: data.is_blocked || false,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        assistant_count: 0
      };

      console.log('[users.api] 创建成功:', newUser);

      return reply.send({
        success: true,
        message: '创建成功',
        data: newUser
      });
    } catch (error) {
      console.error('创建用户失败:', error);
      return reply.status(500).send({
        success: false,
        message: '创建用户失败',
        error: error.message
      });
    }
  });

  // 更新用户
  fastify.put('/admin/users/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;
      const db = await getDb();
      
      console.log('[users.api] 更新用户:', id, data);

      const now = new Date();

      await db.execute(sql`
        UPDATE users
        SET 
          name = ${data.name},
          nickname = ${data.nickname},
          avatar_url = ${data.avatar_url || null},
          email = ${data.email || null},
          phone = ${data.phone || null},
          role_id = ${data.role_id || null},
          tags = ${JSON.stringify(Array.isArray(data.tags) ? data.tags : [])},
          preferences = ${JSON.stringify(data.preferences || {})},
          is_active = ${data.is_active},
          is_blocked = ${data.is_blocked},
          updated_at = ${now}
        WHERE id = ${id}
      `);

      const updatedUser = {
        id,
        ...data,
        updated_at: now.toISOString()
      };

      console.log('[users.api] 更新成功:', updatedUser);

      return reply.send({
        success: true,
        message: '更新成功',
        data: updatedUser
      });
    } catch (error) {
      console.error('更新用户失败:', error);
      return reply.status(500).send({
        success: false,
        message: '更新用户失败',
        error: error.message
      });
    }
  });

  // 删除用户
  fastify.delete('/admin/users/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const db = await getDb();
      
      console.log('[users.api] 删除用户:', id);

      await db.execute(sql`DELETE FROM users WHERE id = ${id}`);

      console.log('[users.api] 删除成功');

      return reply.send({
        success: true,
        message: '删除成功'
      });
    } catch (error) {
      console.error('删除用户失败:', error);
      return reply.status(500).send({
        success: false,
        message: '删除用户失败',
        error: error.message
      });
    }
  });

  // 获取用户角色列表
  fastify.get('/admin/user-roles', async (request, reply) => {
    try {
      const db = await getDb();
      
      const result = await db.execute(sql`
        SELECT 
          ur.*,
          COUNT(u.id) as user_count
        FROM user_roles ur
        LEFT JOIN users u ON u.role_id = ur.id
        GROUP BY ur.id
        ORDER BY ur.priority DESC, ur.created_at ASC
      `);

      const roles = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        description: row.description,
        permissions: typeof row.permissions === 'string' 
          ? JSON.parse(row.permissions) 
          : (row.permissions || {}),
        priority: row.priority,
        is_system: row.is_system,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user_count: parseInt(row.user_count) || 0
      }));

      return reply.send({
        success: true,
        message: 'success',
        data: roles
      });
    } catch (error) {
      console.error('获取用户角色列表失败:', error);
      return reply.status(500).send({
        success: false,
        message: '获取用户角色列表失败',
        error: error.message
      });
    }
  });
};

module.exports = usersApiRoutes;
