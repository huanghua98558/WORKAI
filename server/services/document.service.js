/**
 * 文档管理服务
 */

const { db } = require('../database');
const { documents } = require('../database/schema');
const { eq, desc, and, sql } = require('drizzle-orm');
const fs = require('fs').promises;
const path = require('path');

class DocumentService {
  /**
   * 获取所有文档
   */
  async getAllDocuments(filters = {}) {
    const { category, isActive, source } = filters;
    
    let query = db.select().from(documents).orderBy(desc(documents.createdAt));
    
    // 构建查询条件
    const conditions = [];
    
    if (category !== undefined) {
      conditions.push(eq(documents.category, category));
    }
    
    if (isActive !== undefined) {
      conditions.push(eq(documents.isActive, isActive === 'true'));
    }
    
    if (source !== undefined) {
      conditions.push(eq(documents.source, source));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query;
  }

  /**
   * 根据ID获取文档
   */
  async getDocumentById(id) {
    const docs = await db.select().from(documents).where(eq(documents.id, id));
    return docs[0] || null;
  }

  /**
   * 创建文档（文本类型）
   */
  async createTextDocument(data) {
    const { title, content, category, uploadedBy } = data;
    
    const [newDoc] = await db.insert(documents).values({
      title,
      content,
      category: category || null,
      source: 'text',
      uploadedBy: uploadedBy || null,
      fileSize: content ? Buffer.byteLength(content, 'utf8') : 0,
    }).returning();
    
    return newDoc;
  }

  /**
   * 创建文档（文件上传类型）
   */
  async createFileDocument(data) {
    const { title, fileName, fileType, fileSize, fileUrl, category, uploadedBy } = data;
    
    const [newDoc] = await db.insert(documents).values({
      title: title || fileName,
      fileName,
      fileType,
      fileSize,
      fileUrl,
      category: category || null,
      source: 'upload',
      uploadedBy: uploadedBy || null,
    }).returning();
    
    return newDoc;
  }

  /**
   * 更新文档
   */
  async updateDocument(id, data) {
    const updateData = { ...data };
    
    // 如果更新了内容，重新计算文件大小
    if (data.content !== undefined) {
      updateData.fileSize = Buffer.byteLength(data.content, 'utf8');
    }
    
    const [updatedDoc] = await db
      .update(documents)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    
    return updatedDoc;
  }

  /**
   * 删除文档
   */
  async deleteDocument(id) {
    const doc = await this.getDocumentById(id);
    
    if (!doc) {
      throw new Error('文档不存在');
    }
    
    // 删除数据库记录
    await db.delete(documents).where(eq(documents.id, id));
    
    // TODO: 如果需要，可以删除对象存储中的文件
    
    return { success: true };
  }

  /**
   * 搜索文档（根据标题和内容）
   */
  async searchDocuments(keyword, filters = {}) {
    const { category, isActive } = filters;
    
    let query = db.select().from(documents)
      .where(
        and(
          sql`${documents.title} ILIKE ${'%' + keyword + '%'}`,
          isActive !== undefined ? eq(documents.isActive, isActive === 'true') : sql`1=1`,
          category !== undefined ? eq(documents.category, category) : sql`1=1`
        )
      )
      .orderBy(desc(documents.createdAt));
    
    return await query;
  }

  /**
   * 获取文档统计信息
   */
  async getDocumentStats() {
    const stats = await db
      .select({
        total: sql`COUNT(*)::int`,
        active: sql`COUNT(CASE WHEN ${documents.isActive} = true THEN 1 END)::int`,
        bySource: sql`json_object_agg(${documents.source}, ${sql`COUNT(*)::int`})`,
      })
      .from(documents);
    
    return stats[0] || { total: 0, active: 0, bySource: {} };
  }
}

module.exports = new DocumentService();
