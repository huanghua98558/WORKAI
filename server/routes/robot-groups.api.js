/**
 * 机器人分组管理 API 路由
 */

const robotGroupsApiRoutes = async function (fastify, options) {
  console.log('[robot-groups.api.js] 机器人分组管理 API 路由已加载');

  // 获取所有机器人分组
  fastify.get('/admin/robot-groups', async (request, reply) => {
    try {
      const groups = [
        {
          id: 'group-1',
          name: '营销',
          description: '负责营销推广的机器人',
          color: '#ef4444',
          icon: '🎯',
          priority: 10,
          routing_strategy: 'round_robin',
          load_balancing_config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          robot_count: 3
        },
        {
          id: 'group-2',
          name: '服务',
          description: '提供客户服务',
          color: '#3b82f6',
          icon: '💬',
          priority: 8,
          routing_strategy: 'least_loaded',
          load_balancing_config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          robot_count: 5
        },
        {
          id: 'group-3',
          name: '技术支持',
          description: '技术支持和问题排查',
          color: '#10b981',
          icon: '🔧',
          priority: 6,
          routing_strategy: 'priority_based',
          load_balancing_config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          robot_count: 2
        }
      ];

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

      const groups = [
        {
          id: 'group-1',
          name: '营销',
          description: '负责营销推广的机器人',
          color: '#ef4444',
          icon: '🎯',
          priority: 10,
          routing_strategy: 'round_robin',
          load_balancing_config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          robot_count: 3
        }
      ];

      const group = groups.find(g => g.id === id);

      if (!group) {
        return reply.status(404).send({
          success: false,
          message: '分组不存在'
        });
      }

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
      console.log('[robot-groups.api] 创建分组:', data);

      const newGroup = {
        id: `group-${Date.now()}`,
        name: data.name,
        description: data.description,
        color: data.color || '#3b82f6',
        icon: data.icon || '🤖',
        priority: data.priority || 10,
        routing_strategy: data.routing_strategy || 'round_robin',
        load_balancing_config: data.load_balancing_config ? JSON.parse(data.load_balancing_config) : {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
      console.log('[robot-groups.api] 更新分组:', id, data);

      const updatedGroup = {
        id,
        name: data.name,
        description: data.description,
        color: data.color || '#3b82f6',
        icon: data.icon || '🤖',
        priority: data.priority || 10,
        routing_strategy: data.routing_strategy || 'round_robin',
        load_balancing_config: data.load_balancing_config ? JSON.parse(data.load_balancing_config) : {},
        updated_at: new Date().toISOString()
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
      console.log('[robot-groups.api] 删除分组:', id);

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
