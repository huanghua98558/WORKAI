import { eq, and, SQL, like, or } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { users, insertUserSchema, updateUserSchema } from "./shared/schema";
import type { User, InsertUser, UpdateUser } from "./shared/schema";

export class UserManager {
  async createUser(data: InsertUser): Promise<User> {
    const db = await getDb();
    const validated = insertUserSchema.parse(data);
    const [user] = await db.insert(users).values(validated).returning();
    return user;
  }

  /**
   * 获取用户列表（类型安全的条件查询）
   */
  async getUsers(options: { 
    skip?: number; 
    limit?: number; 
    filters?: Partial<Pick<User, 'id' | 'username' | 'email' | 'role' | 'isActive'>> 
  } = {}): Promise<User[]> {
    const { skip = 0, limit = 100, filters = {} } = options;
    const db = await getDb();

    const conditions: SQL[] = [];
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

  async getUserById(id: string): Promise<User | null> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }

  async updateUser(id: string, data: UpdateUser): Promise<User | null> {
    const db = await getDb();
    const validated = updateUserSchema.parse(data);
    const [user] = await db
      .update(users)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * 验证用户密码
   */
  async validatePassword(username: string, password: string): Promise<User | null> {
    const db = await getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), eq(users.isActive, true)));
    
    if (!user) {
      return null;
    }

    // 这里应该使用密码哈希比较，暂时简单比较
    if (user.password === password) {
      return user;
    }
    
    return null;
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(id: string): Promise<void> {
    const db = await getDb();
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  /**
   * 部分字段查询（如下拉选项）
   */
  async getUserOptions(): Promise<{ id: string; username: string; email: string | null }[]> {
    const db = await getDb();
    return db.select({
      id: users.id,
      username: users.username,
      email: users.email
    }).from(users).orderBy(users.username);
  }
}

export const userManager = new UserManager();
