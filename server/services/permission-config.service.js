/**
 * 权限配置服务
 * 提供动态权限策略配置和查询
 */

class PermissionConfigService {
  constructor() {
    // 权限类型定义
    this.permissionTypes = {
      read: {
        label: '查看',
        description: '可以查看资源详情',
        priority: 1
      },
      view_sessions: {
        label: '查看会话',
        description: '可以查看会话记录',
        priority: 2
      },
      view_messages: {
        label: '查看消息',
        description: '可以查看消息记录',
        priority: 3
      },
      write: {
        label: '编辑',
        description: '可以编辑资源配置',
        priority: 4
      },
      delete: {
        label: '删除',
        description: '可以删除资源',
        priority: 5
      },
      manage: {
        label: '管理',
        description: '完全控制资源，包括分配权限',
        priority: 6
      }
    };

    // 角色默认权限
    this.roleDefaults = {
      superadmin: ['read', 'write', 'delete', 'manage', 'view_sessions', 'view_messages'],
      admin: ['read', 'write', 'delete', 'view_sessions', 'view_messages'],
      operator: ['read', 'view_sessions', 'view_messages']
    };

    // 资源类型定义
    this.resourceTypes = {
      robot: {
        label: '机器人',
        permissions: ['read', 'write', 'delete', 'view_sessions', 'view_messages']
      },
      session: {
        label: '会话',
        permissions: ['read']
      },
      message: {
        label: '消息',
        permissions: ['read']
      },
      flow: {
        label: '流程',
        permissions: ['read', 'write', 'delete']
      },
      prompt: {
        label: '提示词',
        permissions: ['read', 'write', 'delete']
      }
    };
  }

  /**
   * 获取所有权限类型
   */
  getPermissionTypes() {
    return this.permissionTypes;
  }

  /**
   * 获取指定资源的可用权限
   */
  getResourcePermissions(resourceType) {
    const resource = this.resourceTypes[resourceType];
    if (!resource) {
      return [];
    }

    return resource.permissions.map(perm => ({
      key: perm,
      ...this.permissionTypes[perm]
    }));
  }

  /**
   * 获取角色的默认权限
   */
  getRoleDefaultPermissions(role) {
    return this.roleDefaults[role] || [];
  }

  /**
   * 检查权限是否有效
   */
  isValidPermission(permKey) {
    return Object.keys(this.permissionTypes).includes(permKey);
  }

  /**
   * 验证权限数组
   */
  validatePermissions(permissions, resourceType) {
    const resourcePerms = this.resourceTypes[resourceType]?.permissions || [];

    return permissions.filter(perm =>
      this.isValidPermission(perm) && resourcePerms.includes(perm)
    );
  }

  /**
   * 计算权限级别
   */
  getPermissionLevel(permKey) {
    return this.permissionTypes[permKey]?.priority || 0;
  }

  /**
   * 检查是否拥有足够的权限
   */
  hasSufficientPermission(requiredPerm, ownedPerms) {
    if (!requiredPerm || !ownedPerms || ownedPerms.length === 0) {
      return false;
    }

    // 如果拥有 manage 权限，拥有所有权限
    if (ownedPerms.includes('manage')) {
      return true;
    }

    return ownedPerms.includes(requiredPerm);
  }

  /**
   * 检查是否可以执行操作
   */
  canPerformAction(action, ownedPerms) {
    const actionToPerm = {
      'read': 'read',
      'view_sessions': 'view_sessions',
      'view_messages': 'view_messages',
      'create': 'write',
      'update': 'write',
      'delete': 'delete',
      'assign': 'manage',
      'revoke': 'manage'
    };

    const requiredPerm = actionToPerm[action];
    if (!requiredPerm) {
      return false;
    }

    return this.hasSufficientPermission(requiredPerm, ownedPerms);
  }

  /**
   * 获取权限的显示标签
   */
  getPermissionLabel(permKey) {
    return this.permissionTypes[permKey]?.label || permKey;
  }

  /**
   * 获取权限的描述
   */
  getPermissionDescription(permKey) {
    return this.permissionTypes[permKey]?.description || '';
  }

  /**
   * 格式化权限数组为对象
   */
  formatPermissionsToObj(permissions) {
    const result = {};
    permissions.forEach(perm => {
      result[perm] = true;
    });
    return result;
  }

  /**
   * 从权限对象转换为数组
   */
  formatPermissionsToArray(permObj) {
    return Object.keys(permObj).filter(key => permObj[key]);
  }

  /**
   * 比较两组权限的差异
   */
  comparePermissions(oldPerms, newPerms) {
    const added = newPerms.filter(p => !oldPerms.includes(p));
    const removed = oldPerms.filter(p => !newPerms.includes(p));

    return {
      added,
      removed,
      changed: added.length > 0 || removed.length > 0
    };
  }

  /**
   * 资源访问权限检查规则
   */
  getResourceAccessRules() {
    return {
      robot: {
        read: (user, resource) => {
          // superadmin: 全部
          // admin/operator: owner_id = 自己 或在 robot_permissions 中
          return user.role === 'superadmin' ||
                 resource.ownerId === user.id ||
                 this.hasPermissionFromTable(user.id, resource.id);
        },
        update: (user, resource) => {
          // superadmin: 全部
          // admin/operator: 只能编辑 owner_id = 自己 的
          return user.role === 'superadmin' ||
                 resource.ownerId === user.id;
        },
        delete: (user, resource) => {
          // superadmin: 全部
          // admin/operator: 只能删除 owner_id = 自己 且 is_system = false 的
          return user.role === 'superadmin' ||
                 (resource.ownerId === user.id && !resource.isSystem);
        },
        assign: (user, resource) => {
          // superadmin: 全部
          // admin: 只能分配 owner_id = 自己 的
          return user.role === 'superadmin' ||
                 (user.role === 'admin' && resource.ownerId === user.id);
        }
      }
    };
  }

  /**
   * 检查是否在权限表中有记录
   * （此方法需要与数据库集成）
   */
  async hasPermissionFromTable(userId, resourceId) {
    // TODO: 查询 robot_permissions 表
    return false;
  }
}

const permissionConfigService = new PermissionConfigService();

module.exports = permissionConfigService;
