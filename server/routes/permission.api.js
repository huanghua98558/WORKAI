/**
 * 权限管理 API
 * 管理员为用户分配机器人权限
 */

const { getDb } = require('coze-coding-dev-sdk');
const { robotPermissions, robots, users } = require('../database/schema');
const { eq, and, sql, desc } = require('drizzle-orm');
const sessionService = require('../services/session.service');
const permissionConfigService = require('../services/permission-config.service');
const { auditLogService } = require('../services/audit-log.service');
const { getLogger } = require('../lib/logger');

const logger = getLogger('PERMISSION_API');

async function permissionRoutes(fastify, options) {
  /**
   * 获取机器人的权限列表
   */
  fastify.get('/robots/:robotId/permissions', {
    onRequest: [async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ code: 401, message: '未授权', error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const sessionData = await sessionService.verifySession(token);

      if (!sessionData) {
        return reply.status(401).send({ code: 401, message: '令牌无效或已过期', error: 'Unauthorized' });
      }

      request.user = sessionData.user;
      request.session = sessionData.session;
    }]
  }, async (request, reply) => {
    try {
      const { robotId } = request.params;
      const { user } = request;

      // 检查权限：只有管理员和超级管理员可以查看权限列表
      if (user.role !== 'admin' && user.role !== 'superadmin') {
        return reply.status(403).send({ code: 403, message: '权限不足', error: 'Forbidden' });
      }

      const db = await getDb();

      // 获取机器人的所有权限记录
      const permissions = await db
        .select()
        .from(robotPermissions)
        .where(
          and(
            eq(robotPermissions.robotId, robotId),
            eq(robotPermissions.isActive, true)
          )
        )
        .orderBy(desc(robotPermissions.assignedAt));

      // 获取用户详细信息
      const userIds = permissions.map(p => p.userId);
      const usersInfo = userIds.length > 0
        ? await db.select().from(users).where(sql`${users.id} IN ${userIds}`)
        : [];

      const usersMap = new Map(usersInfo.map(u => [u.id, u]));

      // 组装返回数据
      const result = permissions.map(p => ({
        id: p.id,
        userId: p.userId,
        username: usersMap.get(p.userId)?.username,
        fullName: usersMap.get(p.userId)?.fullName,
        permissions: p.permissions,
        assignedBy: p.assignedBy,
        assignedByName: usersMap.get(p.assignedBy)?.username,
        assignedAt: p.assignedAt,
        expiresAt: p.expiresAt,
      }));

      return reply.send({
        code: 0,
        message: '获取成功',
        data: result
      });
    } catch (error) {
      logger.error('[Permission] 获取权限列表失败', { error: error.message });
      return reply.status(500).send({ code: 500, message: '获取失败', error: error.message });
    }
  });

  /**
   * 为用户分配机器人权限
   */
  fastify.post('/robots/:robotId/permissions', {
    onRequest: [async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ code: 401, message: '未授权', error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const sessionData = await sessionService.verifySession(token);

      if (!sessionData) {
        return reply.status(401).send({ code: 401, message: '令牌无效或已过期', error: 'Unauthorized' });
      }

      request.user = sessionData.user;
      request.session = sessionData.session;
    }]
  }, async (request, reply) => {
    try {
      const { robotId } = request.params;
      const { userId, permissions, expiresAt } = request.body;
      const { user } = request;

      // 检查权限：只有管理员和超级管理员可以分配权限
      if (user.role !== 'admin' && user.role !== 'superadmin') {
        return reply.status(403).send({ code: 403, message: '权限不足', error: 'Forbidden' });
      }

      // 获取机器人信息
      const db = await getDb();
      const [robot] = await db
        .select()
        .from(robots)
        .where(eq(robots.id, robotId))
        .limit(1);

      if (!robot) {
        return reply.status(404).send({ code: 404, message: '机器人不存在', error: 'Not Found' });
      }

      // 管理员只能分配自己创建的机器人权限
      if (user.role === 'admin' && robot.ownerId !== user.id) {
        return reply.status(403).send({ code: 403, message: '无权分配此机器人的权限', error: 'Forbidden' });
      }

      // 验证权限
      const validPermissions = permissionConfigService.validatePermissions(permissions, 'robot');

      if (validPermissions.length === 0) {
        return reply.status(400).send({ code: 400, message: '无效的权限', error: 'Bad Request' });
      }

      // 创建权限记录
      const [permission] = await db
        .insert(robotPermissions)
        .values({
          userId,
          robotId,
          permissions: validPermissions,
          grantedBy: user.id,
          grantedAt: new Date(),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })
        .returning();

      // 记录审计日志
      await auditLogService.logAction({
        userId: user.id,
        action: 'assign_robot_permission',
        actionType: 'auth',
        resourceType: 'robot_permission',
        resourceId: permission.id,
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        details: {
          targetUserId: userId,
          robotId,
          permissions: validPermissions
        }
      });

      logger.info('[Permission] 分配权限成功', {
        operatorId: user.id,
        targetUserId: userId,
        robotId,
        permissions: validPermissions
      });

      return reply.send({
        code: 0,
        message: '分配成功',
        data: permission
      });
    } catch (error) {
      logger.error('[Permission] 分配权限失败', { error: error.message });
      return reply.status(500).send({ code: 500, message: '分配失败', error: error.message });
    }
  });

  /**
   * 更新权限
   */
  fastify.put('/robots/:robotId/permissions/:permissionId', {
    onRequest: [async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ code: 401, message: '未授权', error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const sessionData = await sessionService.verifySession(token);

      if (!sessionData) {
        return reply.status(401).send({ code: 401, message: '令牌无效或已过期', error: 'Unauthorized' });
      }

      request.user = sessionData.user;
      request.session = sessionData.session;
    }]
  }, async (request, reply) => {
    try {
      const { robotId, permissionId } = request.params;
      const { permissions, expiresAt, isActive } = request.body;
      const { user } = request;

      if (user.role !== 'admin' && user.role !== 'superadmin') {
        return reply.status(403).send({ code: 403, message: '权限不足', error: 'Forbidden' });
      }

      const db = await getDb();

      // 获取权限记录
      const [existingPermission] = await db
        .select()
        .from(robotPermissions)
        .where(eq(robotPermissions.id, permissionId))
        .limit(1);

      if (!existingPermission) {
        return reply.status(404).send({ code: 404, message: '权限记录不存在', error: 'Not Found' });
      }

      // 管理员只能修改自己创建的机器人权限
      const [robot] = await db
        .select()
        .from(robots)
        .where(eq(robots.id, robotId))
        .limit(1);

      if (user.role === 'admin' && robot.ownerId !== user.id) {
        return reply.status(403).send({ code: 403, message: '无权修改此权限', error: 'Forbidden' });
      }

      // 验证权限
      const validPermissions = permissions
        ? permissionConfigService.validatePermissions(permissions, 'robot')
        : existingPermission.permissions;

      // 更新权限
      const [updated] = await db
        .update(robotPermissions)
        .set({
          permissions: validPermissions,
          expiresAt: expiresAt ? new Date(expiresAt) : existingPermission.expiresAt,
          isActive: isActive !== undefined ? isActive : existingPermission.isActive,
          updatedAt: new Date(),
        })
        .where(eq(robotPermissions.id, permissionId))
        .returning();

      logger.info('[Permission] 更新权限成功', {
        operatorId: user.id,
        permissionId,
        permissions: validPermissions
      });

      return reply.send({
        code: 0,
        message: '更新成功',
        data: updated
      });
    } catch (error) {
      logger.error('[Permission] 更新权限失败', { error: error.message });
      return reply.status(500).send({ code: 500, message: '更新失败', error: error.message });
    }
  });

  /**
   * 撤销权限
   */
  fastify.delete('/robots/:robotId/permissions/:permissionId', {
    onRequest: [async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ code: 401, message: '未授权', error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const sessionData = await sessionService.verifySession(token);

      if (!sessionData) {
        return reply.status(401).send({ code: 401, message: '令牌无效或已过期', error: 'Unauthorized' });
      }

      request.user = sessionData.user;
      request.session = sessionData.session;
    }]
  }, async (request, reply) => {
    try {
      const { robotId, permissionId } = request.params;
      const { user } = request;

      if (user.role !== 'admin' && user.role !== 'superadmin') {
        return reply.status(403).send({ code: 403, message: '权限不足', error: 'Forbidden' });
      }

      const db = await getDb();

      // 获取权限记录
      const [existingPermission] = await db
        .select()
        .from(robotPermissions)
        .where(eq(robotPermissions.id, permissionId))
        .limit(1);

      if (!existingPermission) {
        return reply.status(404).send({ code: 404, message: '权限记录不存在', error: 'Not Found' });
      }

      // 管理员只能撤销自己创建的机器人权限
      const [robot] = await db
        .select()
        .from(robots)
        .where(eq(robots.id, robotId))
        .limit(1);

      if (user.role === 'admin' && robot.ownerId !== user.id) {
        return reply.status(403).send({ code: 403, message: '无权撤销此权限', error: 'Forbidden' });
      }

      // 删除或禁用权限
      await db
        .update(robotPermissions)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(robotPermissions.id, permissionId));

      logger.info('[Permission] 撤销权限成功', {
        operatorId: user.id,
        permissionId
      });

      return reply.send({
        code: 0,
        message: '撤销成功'
      });
    } catch (error) {
      logger.error('[Permission] 撤销权限失败', { error: error.message });
      return reply.status(500).send({ code: 500, message: '撤销失败', error: error.message });
    }
  });

  /**
   * 获取用户的权限列表
   */
  fastify.get('/users/:userId/permissions', {
    onRequest: [async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ code: 401, message: '未授权', error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const sessionData = await sessionService.verifySession(token);

      if (!sessionData) {
        return reply.status(401).send({ code: 401, message: '令牌无效或已过期', error: 'Unauthorized' });
      }

      request.user = sessionData.user;
      request.session = sessionData.session;
    }]
  }, async (request, reply) => {
    try {
      const { userId } = request.params;
      const { user } = request;

      // 只能查看自己的权限，或者管理员/超级管理员可以查看所有用户权限
      if (user.role !== 'admin' && user.role !== 'superadmin' && user.id !== userId) {
        return reply.status(403).send({ code: 403, message: '权限不足', error: 'Forbidden' });
      }

      const db = await getDb();

      // 获取用户的所有权限记录
      const permissions = await db
        .select()
        .from(robotPermissions)
        .where(
          and(
            eq(robotPermissions.userId, userId),
            eq(robotPermissions.isActive, true)
          )
        )
        .orderBy(desc(robotPermissions.assignedAt));

      // 获取机器人信息
      const robotIds = permissions.map(p => p.robotId);
      const robotsInfo = robotIds.length > 0
        ? await db.select().from(robots).where(sql`${robots.id} IN ${robotIds}`)
        : [];

      const robotsMap = new Map(robotsInfo.map(r => [r.id, r]));

      // 组装返回数据
      const result = permissions.map(p => ({
        id: p.id,
        robotId: p.robotId,
        robotName: robotsMap.get(p.robotId)?.name,
        robotIdCode: robotsMap.get(p.robotId)?.robotId,
        permissions: p.permissions,
        assignedBy: p.assignedBy,
        assignedAt: p.assignedAt,
        expiresAt: p.expiresAt,
      }));

      return reply.send({
        code: 0,
        message: '获取成功',
        data: result
      });
    } catch (error) {
      logger.error('[Permission] 获取用户权限失败', { error: error.message });
      return reply.status(500).send({ code: 500, message: '获取失败', error: error.message });
    }
  });

  /**
   * 获取权限类型定义
   */
  fastify.get('/types', {
    onRequest: [async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ code: 401, message: '未授权', error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      const sessionData = await sessionService.verifySession(token);

      if (!sessionData) {
        return reply.status(401).send({ code: 401, message: '令牌无效或已过期', error: 'Unauthorized' });
      }

      request.user = sessionData.user;
      request.session = sessionData.session;
    }]
  }, async (request, reply) => {
    try {
      const permissionTypes = permissionConfigService.getPermissionTypes();

      return reply.send({
        code: 0,
        message: '获取成功',
        data: permissionTypes
      });
    } catch (error) {
      logger.error('[Permission] 获取权限类型失败', { error: error.message });
      return reply.status(500).send({ code: 500, message: '获取失败', error: error.message });
    }
  });
}

module.exports = permissionRoutes;
