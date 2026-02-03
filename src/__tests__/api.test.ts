/**
 * API 测试示例
 * 使用 Jest 和 Node.js 内置的 http/https 模块进行测试
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// 测试工具函数
function createTestRequest(method: string, url: string, body?: any): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'test-token'}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// 测试数据
const TEST_ROBOT = {
  robotId: `test-robot-${Date.now()}`,
  name: '测试机器人',
  apiBaseUrl: 'https://api.worktool.ymdyes.cn/wework/',
  description: '这是一个测试机器人',
  isActive: true,
};

describe('机器人管理 API 测试', () => {
  let createdRobotId: string | null = null;

  describe('POST /api/admin/robots - 创建机器人', () => {
    it('应该成功创建机器人', async () => {
      const request = createTestRequest('POST', 'http://localhost:5000/api/admin/robots', TEST_ROBOT);
      
      // 这里需要实际调用 API 路由
      // 在真实测试中，可以使用 nextjs 的测试工具或者模拟 request/response
      
      const response = await fetch('http://localhost:5000/api/admin/robots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(TEST_ROBOT),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.robot_id).toBe(TEST_ROBOT.robotId);
      expect(data.data.name).toBe(TEST_ROBOT.name);
      
      createdRobotId = data.data.robot_id;
    });

    it('应该拒绝缺少必填字段的请求', async () => {
      const invalidData = {
        name: '测试机器人',
        // 缺少 robotId
      };

      const response = await fetch('http://localhost:5000/api/admin/robots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('不能为空');
    });

    it('应该拒绝重复的 robotId', async () => {
      const response = await fetch('http://localhost:5000/api/admin/robots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(TEST_ROBOT),
      });

      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.message).toContain('已存在');
    });
  });

  describe('GET /api/admin/robots - 获取机器人列表', () => {
    it('应该返回机器人列表', async () => {
      const response = await fetch('http://localhost:5000/api/admin/robots');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('应该支持按状态筛选', async () => {
      const response = await fetch('http://localhost:5000/api/admin/robots?isActive=true');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      data.data.forEach((robot: any) => {
        expect(robot.is_active).toBe(true);
      });
    });
  });

  describe('GET /api/admin/robots/:robotId - 获取机器人详情', () => {
    it('应该返回机器人详情', async () => {
      if (!createdRobotId) {
        console.warn('跳过测试：没有创建的机器人 ID');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/admin/robots/${createdRobotId}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.robot_id).toBe(createdRobotId);
      expect(data.data.name).toBe(TEST_ROBOT.name);
    });

    it('应该返回 404 当机器人不存在时', async () => {
      const response = await fetch('http://localhost:5000/api/admin/robots/non-existent-id');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toContain('不存在');
    });
  });

  describe('PUT /api/admin/robots/:robotId - 更新机器人', () => {
    it('应该成功更新机器人', async () => {
      if (!createdRobotId) {
        console.warn('跳过测试：没有创建的机器人 ID');
        return;
      }

      const updateData = {
        name: '更新后的测试机器人',
        description: '更新后的描述',
      };

      const response = await fetch(`http://localhost:5000/api/admin/robots/${createdRobotId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(updateData.name);
      expect(data.data.description).toBe(updateData.description);
    });
  });

  describe('DELETE /api/admin/robots/:robotId - 删除机器人', () => {
    it('应该成功删除机器人', async () => {
      if (!createdRobotId) {
        console.warn('跳过测试：没有创建的机器人 ID');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/admin/robots/${createdRobotId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('删除成功');
    });
  });
});

describe('机器人分组管理 API 测试', () => {
  let createdGroupId: string | null = null;

  describe('POST /api/admin/robot-groups - 创建分组', () => {
    it('应该成功创建分组', async () => {
      const groupData = {
        name: '测试分组',
        description: '这是一个测试分组',
        color: '#3b82f6',
        icon: '🤖',
        priority: 10,
      };

      const response = await fetch('http://localhost:5000/api/admin/robot-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(groupData.name);
      
      createdGroupId = data.data.id;
    });
  });

  describe('GET /api/admin/robot-groups - 获取分组列表', () => {
    it('应该返回分组列表', async () => {
      const response = await fetch('http://localhost:5000/api/admin/robot-groups');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });
});

describe('指令队列 API 测试', () => {
  describe('GET /api/admin/robot-commands - 获取指令列表', () => {
    it('应该返回指令列表', async () => {
      const response = await fetch('http://localhost:5000/api/admin/robot-commands');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });
});

describe('负载均衡 API 测试', () => {
  describe('GET /api/admin/robot-loadbalancing - 获取负载均衡状态', () => {
    it('应该返回负载均衡状态', async () => {
      const response = await fetch('http://localhost:5000/api/admin/robot-loadbalancing');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.stats).toBeDefined();
    });
  });

  describe('POST /api/admin/robot-loadbalancing/select - 选择最佳机器人', () => {
    it('应该返回最佳机器人', async () => {
      const response = await fetch('http://localhost:5000/api/admin/robot-loadbalancing/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priority: 'health',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

describe('性能监控 API 测试', () => {
  describe('GET /api/admin/robot-monitoring - 获取监控数据', () => {
    it('应该返回监控数据', async () => {
      const response = await fetch('http://localhost:5000/api/admin/robot-monitoring');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.stats).toBeDefined();
    });
  });
});
