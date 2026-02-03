/**
 * 机器人角色管理 API 路由
 */

const robotRolesApiRoutes = async function (fastify, options) {
  console.log('[robot-roles.api.js] 机器人角色管理 API 路由已加载');

  // 获取所有机器人角色
  fastify.get('/admin/robot-roles', async (request, reply) => {
    try {
      const roles = [
        {
          id: 'role-1',
          name: '客服机器人',
          description: '处理客户咨询和服务请求',
          priority: 10,
          permissions: ['message:send', 'message:receive', 'contact:read', 'room:read', 'session:manage', 'session:read'],
          allowed_operations: ['send_text', 'send_image', 'get_contacts', 'get_rooms'],
          rate_limits: { per_minute: 60, per_hour: 1000 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          robot_count: 5
        },
        {
          id: 'role-2',
          name: '营销机器人',
          description: '负责营销推广和用户转化',
          priority: 8,
          permissions: ['message:send', 'message:receive', 'contact:read', 'contact:write', 'room:read'],
          allowed_operations: ['send_text', 'send_image', 'forward_message', 'get_contacts'],
          rate_limits: { per_minute: 120, per_hour: 2000 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          robot_count: 3
        }
      ];

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

      const roles = [
        {
          id: 'role-1',
          name: '客服机器人',
          description: '处理客户咨询和服务请求',
          priority: 10,
          permissions: ['message:send', 'message:receive', 'contact:read', 'room:read', 'session:manage', 'session:read'],
          allowed_operations: ['send_text', 'send_image', 'get_contacts', 'get_rooms'],
          rate_limits: { per_minute: 60, per_hour: 1000 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          robot_count: 5
        }
      ];

      const role = roles.find(r => r.id === id);

      if (!role) {
        return reply.status(404).send({
          success: false,
          message: '角色不存在'
        });
      }

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
      console.log('[robot-roles.api] 创建角色:', data);

      const newRole = {
        id: `role-${Date.now()}`,
        name: data.name,
        description: data.description,
        priority: data.priority || 10,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        allowed_operations: Array.isArray(data.allowed_operations) ? data.allowed_operations : [],
        rate_limits: data.rate_limits ? JSON.parse(data.rate_limits) : { per_minute: 60, per_hour: 1000 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
      console.log('[robot-roles.api] 更新角色:', id, data);

      const updatedRole = {
        id,
        name: data.name,
        description: data.description,
        priority: data.priority || 10,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        allowed_operations: Array.isArray(data.allowed_operations) ? data.allowed_operations : [],
        rate_limits: data.rate_limits ? JSON.parse(data.rate_limits) : { per_minute: 60, per_hour: 1000 },
        updated_at: new Date().toISOString()
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
      console.log('[robot-roles.api] 删除角色:', id);

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
