import { eq, and, SQL, like, or } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { systemSettings } from "./shared/schema";

export type SystemSetting = typeof systemSettings.$inferSelect;

export class SystemSettingManager {
  async createSetting(data: Omit<Partial<SystemSetting>, 'id' | 'updatedAt' | 'createdAt'> & { key: string; value: string }): Promise<SystemSetting> {
    const db = await getDb();
    const [setting] = await db.insert(systemSettings).values(data).returning();
    return setting;
  }

  /**
   * 获取设置列表（类型安全的条件查询）
   */
  async getSettings(options: { 
    skip?: number; 
    limit?: number; 
    filters?: Partial<Pick<SystemSetting, 'id' | 'key' | 'category'>> 
  } = {}): Promise<SystemSetting[]> {
    const { skip = 0, limit = 100, filters = {} } = options;
    const db = await getDb();

    const conditions: SQL[] = [];
    if (filters.id !== undefined) {
      conditions.push(eq(systemSettings.id, filters.id));
    }
    if (filters.key !== undefined) {
      conditions.push(like(systemSettings.key, `%${filters.key}%`));
    }
    if (filters.category !== undefined) {
      conditions.push(eq(systemSettings.category, filters.category!));
    }

    if (conditions.length > 0) {
      return db.select().from(systemSettings).where(and(...conditions)).limit(limit).offset(skip);
    }

    return db.select().from(systemSettings).limit(limit).offset(skip);
  }

  async getSettingById(id: string): Promise<SystemSetting | null> {
    const db = await getDb();
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.id, id));
    return setting || null;
  }

  async getSettingByKey(key: string): Promise<SystemSetting | null> {
    const db = await getDb();
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting || null;
  }

  async getSettingValue(key: string, defaultValue: string = ""): Promise<string> {
    const setting = await this.getSettingByKey(key);
    return setting?.value || defaultValue;
  }

  async updateSetting(id: string, data: Partial<SystemSetting>): Promise<SystemSetting | null> {
    const db = await getDb();
    const [setting] = await db
      .update(systemSettings)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(systemSettings.id, id))
      .returning();
    return setting || null;
  }

  async upsertSetting(key: string, value: string, category?: string, description?: string, updatedBy?: string): Promise<SystemSetting> {
    const db = await getDb();
    const existing = await this.getSettingByKey(key);
    
    if (existing) {
      const [setting] = await db
        .update(systemSettings)
        .set({
          value,
          category: category || existing.category,
          description: description || existing.description,
          updatedAtBy: updatedBy,
          updatedAt: new Date().toISOString()
        })
        .where(eq(systemSettings.id, existing.id))
        .returning();
      return setting;
    } else {
      const [setting] = await db.insert(systemSettings).values({
        key,
        value,
        category: category || "general",
        description,
        updatedAtBy: updatedBy
      }).returning();
      return setting;
    }
  }

  async deleteSetting(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(systemSettings).where(eq(systemSettings.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * 按类别获取设置
   */
  async getSettingsByCategory(category: string): Promise<SystemSetting[]> {
    const db = await getDb();
    return db.select().from(systemSettings).where(eq(systemSettings.category, category));
  }

  /**
   * 部分字段查询（如下拉选项）
   */
  async getSettingOptions(): Promise<{ id: string; key: string; category: string | null }[]> {
    const db = await getDb();
    return db.select({
      id: systemSettings.id,
      key: systemSettings.key,
      category: systemSettings.category
    }).from(systemSettings).orderBy(systemSettings.key);
  }
}

export const systemSettingManager = new SystemSettingManager();
