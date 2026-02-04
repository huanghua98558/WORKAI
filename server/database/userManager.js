const { eq, and, like, sql } = require("drizzle-orm");
const { getDb } = require("coze-coding-dev-sdk");
const { users, insertUserSchema, updateUserSchema } = require("./schema");
const { getLogger } = require("../lib/logger");
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

class UserManager {
  constructor() {
    this.logger = getLogger('DB_USER');
  }

  /**
   * 加密密码
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * 验证密码
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async createUser(data) {
    const db = await getDb();
    const validated = insertUserSchema.parse(data);
    
    // 加密密码
    const hashedPassword = await this.hashPassword(validated.password);
    
    const [user] = await db.insert(users).values({
      ...validated,
      password: hashedPassword
    }).returning();
    this.logger.info('创建用户成功', { userId: user.id, username: user.username });
    return user;
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
    const updateData = { ...data };
    
    // 如果需要更新密码，进行加密
    if (updateData.password && updateData.password.trim()) {
      updateData.password = await this.hashPassword(updateData.password);
    } else {
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

    // 使用 bcrypt 验证密码
    const isValid = await this.verifyPassword(password, user.password);
    if (isValid) {
      return user;
    }
    
    return null;
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
}

exports.userManager = new UserManager();
