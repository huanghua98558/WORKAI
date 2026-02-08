/**
 * 权限管理服务
 * 管理用户对机器人的访问权限
 */

const { eq, and, or, inArray, sql } = require('drizzle-orm');
const { getDb } = require('coze-coding-dev-sdk');
const { robots, users, robotPermissions } = require('../database/schema');
const { getLogger } = require('../lib/logger');

class PermissionService {
  constructor() {
    this.logger = getLogger('PERMISSION');
  }

  /**
   * 检查用户是否为超级管理员
   */
  isSuperAdmin(user) {
    return user && user.role === 'admin';
  }

  /**
   * 获取用户有权限访问的机器人ID列表
   */
  async getAccessibleRobotIds(userId) {
    const db = await getDb();

    // 获取用户信息
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('用户不存在');
    }

    // 超级管理员可以访问所有机器人
    if (this.isSuperAdmin(user)) {
      const allRobots = await db.select({ id: robots.id }).from(robots);
      return allRobots.map(r => r.id);
    }

    // 普通用户只能访问：
    // 1. 自己创建的机器人
    // 2. 被分配权限的机器人
    const ownedRobots = await db
      .select({ id: robots.id })
      .from(robots)
      .where(eq(robots.ownerId, userId));

    const assignedRobots = await db
      .select({ robotId: robotPermissions.robotId })
      .from(robotPermissions)
      .where(
        and(
          eq(robotPermissions.userId, userId),
          eq(robotPermissions.isActive, true)
        )
      );

    const robotIds = [
      ...ownedRobots.map(r => r.id),
      ...assignedRobots.map(r => r.robotId)
    ];

    // 去重
    return [...new Set(robotIds)];
  }

  /**
   * 检查用户是否有权限访问指定机器人
   */
  async hasRobotAccess(userId, robotId, permission = 'read') {
    const db = await getDb();

    // 获取用户信息
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return false;
    }

    // 超级管理员拥有所有权限
    if (this.isSuperAdmin(user)) {
      return true;
    }

    // 检查是否为机器人所有者
    const [robot] = await db.select().from(robots).where(eq(robots.id, robotId));
    if (!robot) {
      return false;
    }

    if (robot.ownerId === userId) {
      // 所有者拥有所有权限
      return true;
    }

    // 检查是否被分配权限
    const [permissionRecord] = await db
      .select()
      .from(robotPermissions)
      .where(
        and(
          eq(robotPermissions.userId, userId),
          eq(robotPermissions.robotId, robotId),
          eq(robotPermissions.isActive, true)
        )
      );

    if (!permissionRecord) {
      return false;
    }

    // 根据请求的权限类型检查
    switch (permission) {
      case 'read':
        return permissionRecord.canView;
      case 'write':
        return permissionRecord.canEdit;
      case 'delete':
        return permissionRecord.canDelete;
      case 'send_message':
        return permissionRecord.canSendMessage;
      case 'view_sessions':
        return permissionRecord.canViewSessions;
      case 'view_messages':
        return permissionRecord.canViewMessages;
      default:
        return permissionRecord.canView;
    }
  }

  /**
   * 检查用户是否可以删除指定机器人
   */
  async canDeleteRobot(userId, robotId) {
    const db = await getDb();

    // 获取用户信息
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return false;
    }

    // 超级管理员可以删除任何机器人
    if (this.isSuperAdmin(user)) {
      return true;
    }

    // 获取机器人信息
    const [robot] = await db.select().from(robots).where(eq(robots.id, robotId));
    if (!robot) {
      return false;
    }

    // 系统机器人不能删除（由超管分配）
    if (robot.isSystem) {
      this.logger.warn('尝试删除系统机器人', {
        userId,
        robotId,
        robotName: robot.name
      });
      return false;
    }

    // 只能删除自己创建的机器人
    if (robot.ownerId === userId) {
      return true;
    }

    // 检查是否有删除权限
    return this.hasRobotAccess(userId, robotId, 'delete');
  }

  /**
   * 获取用户对机器人的权限信息
   */
  async getRobotPermission(userId, robotId) {
    const db = await getDb();

    // 获取用户信息
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('用户不存在');
    }

    // 获取机器人信息
    const [robot] = await db.select().from(robots).where(eq(robots.id, robotId));
    if (!robot) {
      throw new Error('机器人不存在');
    }

    // 超级管理员拥有所有权限
    if (this.isSuperAdmin(user)) {
      return {
        robotId,
        robotName: robot.name,
        permissionType: 'admin',
        canView: true,
        canEdit: true,
        canDelete: true,
        canSendMessage: true,
        canViewSessions: true,
        canViewMessages: true,
        isOwner: false,
        isSystem: robot.isSystem,
        accessSource: 'admin'
      };
    }

    // 机器人所有者拥有所有权限
    if (robot.ownerId === userId) {
      return {
        robotId,
        robotName: robot.name,
        permissionType: 'owner',
        canView: true,
        canEdit: true,
        canDelete: true,
        canSendMessage: true,
        canViewSessions: true,
        canViewMessages: true,
        isOwner: true,
        isSystem: robot.isSystem,
        accessSource: 'owner'
      };
    }

    // 查找分配的权限
    const [permissionRecord] = await db
      .select()
      .from(robotPermissions)
      .where(
        and(
          eq(robotPermissions.userId, userId),
          eq(robotPermissions.robotId, robotId),
          eq(robotPermissions.isActive, true)
        )
      );

    if (permissionRecord) {
      return {
        robotId,
        robotName: robot.name,
        permissionType: permissionRecord.permissionType,
        canView: permissionRecord.canView,
        canEdit: permissionRecord.canEdit,
        canDelete: permissionRecord.canDelete,
        canSendMessage: permissionRecord.canSendMessage,
        canViewSessions: permissionRecord.canViewSessions,
        canViewMessages: permissionRecord.canViewMessages,
        isOwner: false,
        isSystem: robot.isSystem,
        accessSource: 'assigned',
        assignedBy: permissionRecord.assignedBy,
        assignedByName: permissionRecord.assignedByName,
        assignedAt: permissionRecord.assignedAt
      };
    }

    // 无权限
    return null;
  }

  /**
   * 为用户分配机器人权限
   */
  async assignRobotPermission(userId, robotId, permissionData, assignedBy) {
    const db = await getDb();

    // 检查用户和机器人是否存在
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('用户不存在');
    }

    const [robot] = await db.select().from(robots).where(eq(robots.id, robotId));
    if (!robot) {
      throw new Error('机器人不存在');
    }

    // 检查是否已存在权限记录
    const [existingPermission] = await db
      .select()
      .from(robotPermissions)
      .where(
        and(
          eq(robotPermissions.userId, userId),
          eq(robotPermissions.robotId, robotId)
        )
      );

    const { v4: uuidv4 } = require('uuid');
    const now = new Date();

    if (existingPermission) {
      // 更新现有权限
      const [updated] = await db
        .update(robotPermissions)
        .set({
          ...permissionData,
          updatedAt: now
        })
        .where(eq(robotPermissions.id, existingPermission.id))
        .returning();

      this.logger.info('更新机器人权限', {
        permissionId: updated.id,
        userId,
        robotId,
        permissionType: permissionData.permissionType
      });

      return updated;
    } else {
      // 创建新权限
      const [created] = await db
        .insert(robotPermissions)
        .values({
          id: uuidv4(),
          userId,
          robotId,
          robotName: robot.name,
          ...permissionData,
          assignedBy,
          assignedByName: assignedBy || user.username,
          assignedAt: now,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      this.logger.info('分配机器人权限', {
        permissionId: created.id,
        userId,
        robotId,
        permissionType: permissionData.permissionType
      });

      return created;
    }
  }

  /**
   * 撤销用户对机器人的权限
   */
  async revokeRobotPermission(userId, robotId) {
    const db = await getDb();

    const result = await db
      .update(robotPermissions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(robotPermissions.userId, userId),
          eq(robotPermissions.robotId, robotId)
        )
      );

    this.logger.info('撤销机器人权限', { userId, robotId });
    return result.rowCount > 0;
  }

  /**
   * 获取用户的所有机器人权限
   */
  async getUserRobotPermissions(userId) {
    const db = await getDb();

    const permissions = await db
      .select()
      .from(robotPermissions)
      .where(
        and(
          eq(robotPermissions.userId, userId),
          eq(robotPermissions.isActive, true)
        )
      )
      .orderBy(robotPermissions.createdAt);

    return permissions;
  }

  /**
   * 获取机器人的所有用户权限
   */
  async getRobotUserPermissions(robotId) {
    const db = await getDb();

    const permissions = await db
      .select()
      .from(robotPermissions)
      .where(
        and(
          eq(robotPermissions.robotId, robotId),
          eq(robotPermissions.isActive, true)
        )
      )
      .orderBy(robotPermissions.createdAt);

    return permissions;
  }
}

const permissionService = new PermissionService();

module.exports = permissionService;
