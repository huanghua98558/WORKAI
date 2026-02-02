const { eq, and, like } = require("drizzle-orm");
const { getDb } = require("coze-coding-dev-sdk");
const { systemSettings, insertSystemSettingSchema, updateSystemSettingSchema } = require("./schema");

class SystemSettingManager {
  async createSetting(data) {
    const db = await getDb();
    const validated = insertSystemSettingSchema.parse(data);
    const [setting] = await db.insert(systemSettings).values(validated).returning();
    return setting;
  }

  /**
   * 获取设置列表（类型安全的条件查询）
   */
  async getSettings(options = {}) {
    const { skip = 0, limit = 100, filters = {} } = options;
    const db = await getDb();

    const conditions = [];
    if (filters.id !== undefined) {
      conditions.push(eq(systemSettings.id, filters.id));
    }
    if (filters.key !== undefined) {
      conditions.push(like(systemSettings.key, `%${filters.key}%`));
    }
    if (filters.category !== undefined) {
      conditions.push(eq(systemSettings.category, filters.category));
    }

    if (conditions.length > 0) {
      return db.select().from(systemSettings).where(and(...conditions)).limit(limit).offset(skip);
    }

    return db.select().from(systemSettings).limit(limit).offset(skip);
  }

  async getSettingById(id) {
    const db = await getDb();
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.id, id));
    return setting || null;
  }

  async getSettingByKey(key) {
    const db = await getDb();
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting || null;
  }

  async getSettingValue(key, defaultValue = "") {
    const setting = await this.getSettingByKey(key);
    return setting?.value || defaultValue;
  }

  async updateSetting(id, data) {
    const db = await getDb();
    const validated = updateSystemSettingSchema.parse(data);
    const [setting] = await db
      .update(systemSettings)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(systemSettings.id, id))
      .returning();
    return setting || null;
  }

  async upsertSetting(key, value, category, description, updatedBy) {
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
          updatedAt: new Date() 
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

  async deleteSetting(id) {
    const db = await getDb();
    const result = await db.delete(systemSettings).where(eq(systemSettings.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * 按类别获取设置
   */
  async getSettingsByCategory(category) {
    const db = await getDb();
    return db.select().from(systemSettings).where(eq(systemSettings.category, category));
  }

  /**
   * 部分字段查询（如下拉选项）
   */
  async getSettingOptions() {
    const db = await getDb();
    return db.select({
      id: systemSettings.id,
      key: systemSettings.key,
      category: systemSettings.category
    }).from(systemSettings).orderBy(systemSettings.key);
  }
}

exports.systemSettingManager = new SystemSettingManager();
