const { eq, and, like, sql } = require("drizzle-orm");
const { getDb } = require("coze-coding-dev-sdk");
const { users, insertUserSchema, updateUserSchema } = require("./schema");
const { getLogger } = require("../lib/logger");
const { hashPassword, verifyPassword, checkPasswordStrength } = require("../lib/password");

// 模块加载时诊断日志
console.log('[userManager] module init diagnostics:', {
  insertUserSchemaType: typeof insertUserSchema,
  insertUserSchemaKeys: insertUserSchema ? Object.keys(insertUserSchema).slice(0, 5) : [],
  parseType: typeof insertUserSchema?.parse
});

class UserManager {
  constructor() {
    this.logger = getLogger('DB_USER');
    this.logger.info('UserManager 初始化', {
      insertUserSchema: typeof insertUserSchema,
      updateUserSchema: typeof updateUserSchema,
      parse: typeof insertUserSchema?.parse
    });
  }

  async createUser(data) {
    const db = await getDb();

    // 检查用户名是否已存在
    const existingUser = await this.getUserByUsername(data.username);
    if (existingUser) {
      throw new Error('用户名已存在');
    }

    // 检查邮箱是否已存在
    if (data.email) {
      const existingEmail = await this.getUserByEmail(data.email);
      if (existingEmail) {
        throw new Error('邮箱已被使用');
      }
    }

    // 检查密码强度
    const strength = checkPasswordStrength(data.password);
    if (!strength.isValid) {
      throw new Error('密码强度不足: ' + strength.issues.join(', '));
    }

    // 加密密码
    const hashedPassword = await hashPassword(data.password);

    // 创建用户
    const userData = {
      ...data,
      password: hashedPassword,
      passwordChangedAt: new Date(), // 记录密码修改时间
    };

    try {
      this.logger.info('开始验证用户数据', { insertUserSchema: typeof insertUserSchema, parse: typeof insertUserSchema?.parse });
      const validated = insertUserSchema.parse(userData);
      this.logger.info('验证成功', { validated });
      const [user] = await db.insert(users).values(validated).returning();

      this.logger.info('创建用户成功', { userId: user.id, username: user.username });
      return user;
    } catch (error) {
      this.logger.error('创建用户失败', {
        error: error.message,
        stack: error.stack,
        insertUserSchema: typeof insertUserSchema,
        parse: typeof insertUserSchema?.parse,
        userData: JSON.stringify(userData)
      });
      throw error;
    }
  }

  /**
   * 获取用户列表（类型安全的条件查询）
   */
  async getUsers(options = {}) {
    const { skip = 0, limit = 100, filters = {} } = options;
    const db = await getDb();

    const conditions = [];
    if (filters.id !== undefined) {
      conditions.push(eq(users.id, filters.id));
    }
    if (filters.username !== undefined) {
      conditions.push(like(users.username, `%${filters.username}%`));
    }
    if (filters.email !== undefined) {
      conditions.push(like(users.email, `%${filters.email}%`));
    }
    if (filters.role !== undefined) {
      conditions.push(eq(users.role, filters.role));
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(users.isActive, filters.isActive));
    }

    if (conditions.length > 0) {
      return db.select().from(users).where(and(...conditions)).limit(limit).offset(skip);
    }

    return db.select().from(users).limit(limit).offset(skip);
  }

  async getUserById(id) {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async getUserByUsername(username) {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || null;
  }

  async getUserByEmail(email) {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }

  async updateUser(id, data) {
    const db = await getDb();

    // 如果包含密码，需要加密
    const updateData = { ...data };
    if (updateData.password && updateData.password.trim() !== '') {
      // 检查密码强度
      const strength = checkPasswordStrength(updateData.password);
      if (!strength.isValid) {
        throw new Error('密码强度不足: ' + strength.issues.join(', '));
      }

      // 加密新密码
      updateData.password = await hashPassword(updateData.password);
      updateData.passwordChangedAt = new Date(); // 更新密码修改时间

      // 重置失败登录次数
      updateData.failedLoginAttempts = 0;
      updateData.lockedUntil = null;
    } else {
      // 过滤掉空字符串的 password 字段
      delete updateData.password;
    }

    const validated = updateUserSchema.parse(updateData);
    const [user] = await db
      .update(users)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  }

  async deleteUser(id) {
    const db = await getDb();
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * 验证用户密码
   */
  async validatePassword(username, password) {
    const db = await getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), eq(users.isActive, true)));

    if (!user) {
      return null;
    }

    // 检查账户是否被锁定
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      this.logger.warn('账户已被锁定', {
        userId: user.id,
        username: user.username,
        lockedUntil: user.lockedUntil
      });
      throw new Error('账户已被锁定，请稍后再试');
    }

    // 使用bcrypt验证密码
    const isMatch = await verifyPassword(password, user.password);

    if (isMatch) {
      // 登录成功，重置失败次数
      if (user.failedLoginAttempts > 0) {
        await db
          .update(users)
          .set({
            failedLoginAttempts: 0,
            lockedUntil: null
          })
          .where(eq(users.id, user.id));
      }

      return user;
    } else {
      // 登录失败，增加失败次数
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxFailedAttempts = 5;

      if (newFailedAttempts >= maxFailedAttempts) {
        // 锁定账户30分钟
        const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        await db
          .update(users)
          .set({
            failedLoginAttempts: newFailedAttempts,
            lockedUntil: lockedUntil
          })
          .where(eq(users.id, user.id));

        this.logger.warn('账户因多次登录失败被锁定', {
          userId: user.id,
          username: user.username,
          failedAttempts: newFailedAttempts,
          lockedUntil: lockedUntil
        });

        throw new Error('密码错误次数过多，账户已被锁定30分钟');
      } else {
        // 更新失败次数
        await db
          .update(users)
          .set({ failedLoginAttempts: newFailedAttempts })
          .where(eq(users.id, user.id));

        this.logger.warn('登录密码错误', {
          userId: user.id,
          username: user.username,
          failedAttempts: newFailedAttempts
        });
      }

      return null;
    }
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(id) {
    const db = await getDb();
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  /**
   * 部分字段查询（如下拉选项）
   */
  async getUserOptions() {
    const db = await getDb();
    return db.select({
      id: users.id,
      username: users.username,
      email: users.email
    }).from(users).orderBy(users.username);
  }

  /**
   * 根据邮箱获取用户
   */
  async getUserByEmail(email) {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user || null;
  }

  /**
   * 创建密码重置令牌
   */
  async createPasswordResetToken(userId) {
    const db = await getDb();
    const { passwordResetTokens } = require('./schema');
    const crypto = require('crypto');

    // 生成随机令牌
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1小时后过期

    // 删除该用户的旧令牌
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

    // 创建新令牌
    const [resetToken] = await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt
    }).returning();

    this.logger.info('创建密码重置令牌', { userId, token: token.substring(0, 8) + '...' });
    return token;
  }

  /**
   * 验证密码重置令牌
   */
  async verifyPasswordResetToken(token) {
    const db = await getDb();
    const { passwordResetTokens } = require('./schema');

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    if (!resetToken) {
      return null;
    }

    // 检查是否过期
    if (new Date(resetToken.expiresAt) < new Date()) {
      // 删除过期的令牌
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
      return null;
    }

    this.logger.info('密码重置令牌验证成功', { userId: resetToken.userId });
    return resetToken.userId;
  }

  /**
   * 重置用户密码
   */
  async resetPassword(userId, newPassword) {
    const db = await getDb();

    // 检查密码强度
    const strength = checkPasswordStrength(newPassword);
    if (!strength.isValid) {
      throw new Error('密码强度不足: ' + strength.issues.join(', '));
    }

    // 加密新密码
    const hashedPassword = await hashPassword(newPassword);

    // 更新密码
    const [user] = await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null
      })
      .where(eq(users.id, userId))
      .returning();

    // 删除该用户的密码重置令牌
    const { passwordResetTokens } = require('./schema');
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

    this.logger.info('密码重置成功', { userId, username: user.username });
    return user;
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId, data) {
    const db = await getDb();

    // 如果更新邮箱，检查邮箱是否已被使用
    if (data.email) {
      const existingUser = await this.getUserByEmail(data.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('邮箱已被使用');
      }
    }

    // 如果包含密码，需要加密
    const updateData = { ...data };
    if (updateData.password && updateData.password.trim() !== '') {
      // 检查密码强度
      const strength = checkPasswordStrength(updateData.password);
      if (!strength.isValid) {
        throw new Error('密码强度不足: ' + strength.issues.join(', '));
      }

      // 加密新密码
      updateData.password = await hashPassword(updateData.password);
      updateData.passwordChangedAt = new Date(); // 更新密码修改时间

      // 重置失败登录次数
      updateData.failedLoginAttempts = 0;
      updateData.lockedUntil = null;
    } else {
      // 过滤掉空字符串的 password 字段
      delete updateData.password;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    this.logger.info('更新用户信息', { userId, username: user.username });
    return user;
  }
}

exports.userManager = new UserManager();
