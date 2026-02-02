/**
 * QA 问答库服务
 * 负责 QA 问答的匹配、添加、修改、删除等操作
 *
 * QA 匹配优先级：
 * 1. 精确匹配（isExactMatch=true）
 * 2. 模糊匹配（包含关键词或关联关键词）
 * 3. 优先级排序（priority 越小优先级越高）
 */

const { getDb } = require('coze-coding-dev-sdk');
const { qaDatabase } = require('../database/schema');
const { eq, and, or, like, sql } = require('drizzle-orm');

class QAService {
  constructor() {
    // 缓存 QA 数据（可选）
    this.qaCache = null;
    this.cacheTime = 0;
    this.cacheExpire = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 匹配 QA 问答
   * @param {string} message - 用户消息
   * @param {string} groupName - 群名
   * @param {string} receiverType - 接收者类型: "user" 或 "group"
   * @returns {Object} 匹配结果
   */
  async matchQA(message, groupName = '', receiverType = 'group') {
    try {
      // 1. 先尝试精确匹配
      const exactMatch = await this.matchExactQA(message, groupName, receiverType);
      if (exactMatch) {
        return {
          matched: true,
          qaId: exactMatch.id,
          reply: exactMatch.reply,
          type: 'exact',
          keyword: exactMatch.keyword
        };
      }

      // 2. 尝试模糊匹配
      const fuzzyMatch = await this.matchFuzzyQA(message, groupName, receiverType);
      if (fuzzyMatch) {
        return {
          matched: true,
          qaId: fuzzyMatch.id,
          reply: fuzzyMatch.reply,
          type: 'fuzzy',
          keyword: fuzzyMatch.keyword
        };
      }

      // 3. 未匹配到
      return {
        matched: false,
        message: '未匹配到 QA 问答'
      };
    } catch (error) {
      console.error('QA 匹配失败:', error);
      return {
        matched: false,
        message: 'QA 匹配失败'
      };
    }
  }

  /**
   * 精确匹配 QA
   */
  async matchExactQA(message, groupName, receiverType) {
    const db = await getDb();
    const results = await db
      .select()
      .from(qaDatabase)
      .where(
        and(
          eq(qaDatabase.isActive, true),
          eq(qaDatabase.isExactMatch, true),
          or(
            eq(qaDatabase.receiverType, 'all'),
            eq(qaDatabase.receiverType, receiverType)
          ),
          or(
            eq(qaDatabase.groupName, ''),
            eq(qaDatabase.groupName, groupName),
            sql`${qaDatabase.groupName} IS NULL`
          ),
          eq(qaDatabase.keyword, message.trim())
        )
      )
      .orderBy(qaDatabase.priority)
      .limit(1);

    return results[0] || null;
  }

  /**
   * 模糊匹配 QA
   */
  async matchFuzzyQA(message, groupName, receiverType) {
    const db = await getDb();
    const messageLower = message.trim().toLowerCase();

    // 查询所有可能的 QA 记录
    const allQAs = await db
      .select()
      .from(qaDatabase)
      .where(
        and(
          eq(qaDatabase.isActive, true),
          eq(qaDatabase.isExactMatch, false),
          or(
            eq(qaDatabase.receiverType, 'all'),
            eq(qaDatabase.receiverType, receiverType)
          ),
          or(
            eq(qaDatabase.groupName, ''),
            eq(qaDatabase.groupName, groupName),
            sql`${qaDatabase.groupName} IS NULL`
          )
        )
      )
      .orderBy(qaDatabase.priority);

    // 逐个匹配关键词
    for (const qa of allQAs) {
      const keyword = qa.keyword.toLowerCase();
      const relatedKeywords = qa.relatedKeywords ? qa.relatedKeywords.split(',').map(k => k.trim().toLowerCase()) : [];

      // 检查是否包含主关键词
      if (messageLower.includes(keyword)) {
        return qa;
      }

      // 检查是否包含关联关键词
      for (const relatedKeyword of relatedKeywords) {
        if (relatedKeyword && messageLower.includes(relatedKeyword)) {
          return qa;
        }
      }
    }

    return null;
  }

  /**
   * 获取所有 QA 问答
   */
  async getAllQAs(options = {}) {
    const db = await getDb();
    const { groupName, isActive, receiverType } = options;
    
    let whereConditions = [];
    
    if (isActive !== undefined) {
      whereConditions.push(eq(qaDatabase.isActive, isActive));
    }
    
    if (groupName) {
      whereConditions.push(eq(qaDatabase.groupName, groupName));
    }
    
    if (receiverType) {
      whereConditions.push(eq(qaDatabase.receiverType, receiverType));
    }

    const results = await db
      .select()
      .from(qaDatabase)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(qaDatabase.priority, qaDatabase.createdAt);

    return results;
  }

  /**
   * 根据 ID 获取 QA 问答
   */
  async getQAById(id) {
    const db = await getDb();
    const results = await db
      .select()
      .from(qaDatabase)
      .where(eq(qaDatabase.id, id))
      .limit(1);

    return results[0] || null;
  }

  /**
   * 添加 QA 问答
   */
  async addQA(data) {
    const db = await getDb();
    const result = await db
      .insert(qaDatabase)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return result[0];
  }

  /**
   * 更新 QA 问答
   */
  async updateQA(id, data) {
    const db = await getDb();
    const result = await db
      .update(qaDatabase)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(qaDatabase.id, id))
      .returning();

    return result[0];
  }

  /**
   * 删除 QA 问答
   */
  async deleteQA(id) {
    const db = await getDb();
    const result = await db
      .delete(qaDatabase)
      .where(eq(qaDatabase.id, id))
      .returning();

    return result[0];
  }

  /**
   * 批量导入 QA 问答
   */
  async batchImportQAs(qaList) {
    const results = [];
    
    for (const qa of qaList) {
      try {
        const result = await this.addQA(qa);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message, data: qa });
      }
    }
    
    return results;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.qaCache = null;
    this.cacheTime = 0;
  }
}

module.exports = new QAService();
