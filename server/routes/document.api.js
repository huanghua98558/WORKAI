/**
 * 文档管理 API 路由
 */

const documentService = require('../services/document.service');

const documentApiRoutes = async function (fastify, options) {
  console.log('[document.api.js] 文档管理 API 路由已加载');

  // 获取所有文档
  fastify.get('/documents', async (request, reply) => {
    try {
      const { category, isActive, source } = request.query;
      const documents = await documentService.getAllDocuments({ category, isActive, source });
      
      return reply.send({
        code: 0,
        message: 'success',
        data: documents
      });
    } catch (error) {
      console.error('获取文档列表失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取文档列表失败',
        error: error.message
      });
    }
  });

  // 搜索文档
  fastify.get('/documents/search', async (request, reply) => {
    try {
      const { keyword, category, isActive } = request.query;
      
      if (!keyword) {
        return reply.status(400).send({
          code: -1,
          message: '请提供搜索关键词'
        });
      }
      
      const documents = await documentService.searchDocuments(keyword, { category, isActive });
      
      return reply.send({
        code: 0,
        message: 'success',
        data: documents
      });
    } catch (error) {
      console.error('搜索文档失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '搜索文档失败',
        error: error.message
      });
    }
  });

  // 根据 ID 获取文档
  fastify.get('/documents/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const document = await documentService.getDocumentById(id);
      
      if (!document) {
        return reply.status(404).send({
          code: -1,
          message: '文档不存在'
        });
      }

      return reply.send({
        code: 0,
        message: 'success',
        data: document
      });
    } catch (error) {
      console.error('获取文档信息失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取文档信息失败',
        error: error.message
      });
    }
  });

  // 获取文档统计信息
  fastify.get('/documents/stats', async (request, reply) => {
    try {
      const stats = await documentService.getDocumentStats();
      
      return reply.send({
        code: 0,
        message: 'success',
        data: stats
      });
    } catch (error) {
      console.error('获取文档统计失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '获取文档统计失败',
        error: error.message
      });
    }
  });

  // 上传文件
  fastify.post('/documents/upload', async (request, reply) => {
    try {
      // 检查是否有文件上传
      const multipartData = await request.file();
      
      if (!multipartData) {
        return reply.status(400).send({
          code: -1,
          message: '请选择要上传的文件'
        });
      }
      
      const fields = multipartData.fields;
      const category = fields?.category?.value || null;
      const uploadedBy = fields?.uploadedBy?.value || null;
      
      const uploadedDocs = [];
      
      // 处理单个文件
      const file = multipartData;
      const fileData = await file.toBuffer();
      const fileName = file.filename;
      const fileType = path.extname(fileName).replace('.', '');
      const fileSize = fileData.length;
      
      // 保存文件到公共目录
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
      await fs.mkdir(uploadDir, { recursive: true });
      
      const fileUrl = `/uploads/documents/${Date.now()}_${fileName}`;
      const filePath = path.join(process.cwd(), 'public', fileUrl);
      await fs.writeFile(filePath, fileData);
      
      const doc = await documentService.createFileDocument({
        fileName,
        fileType,
        fileSize,
        fileUrl,
        category,
        uploadedBy
      });
      
      uploadedDocs.push(doc);
      
      return reply.send({
        code: 0,
        message: '上传成功',
        data: uploadedDocs
      });
    } catch (error) {
      console.error('上传文件失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '上传文件失败',
        error: error.message
      });
    }
  });

  // 上传文本
  fastify.post('/documents/upload-text', async (request, reply) => {
    try {
      const { title, content, category, uploadedBy } = request.body;
      
      if (!title || !content) {
        return reply.status(400).send({
          code: -1,
          message: '请提供标题和内容'
        });
      }
      
      const doc = await documentService.createTextDocument({
        title,
        content,
        category,
        uploadedBy
      });
      
      return reply.send({
        code: 0,
        message: '添加成功',
        data: doc
      });
    } catch (error) {
      console.error('添加文本文档失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '添加文本文档失败',
        error: error.message
      });
    }
  });

  // 更新文档
  fastify.put('/documents/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;
      
      const document = await documentService.getDocumentById(id);
      if (!document) {
        return reply.status(404).send({
          code: -1,
          message: '文档不存在'
        });
      }
      
      const updatedDoc = await documentService.updateDocument(id, data);
      
      return reply.send({
        code: 0,
        message: '更新成功',
        data: updatedDoc
      });
    } catch (error) {
      console.error('更新文档失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '更新文档失败',
        error: error.message
      });
    }
  });

  // 删除文档
  fastify.delete('/documents/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      await documentService.deleteDocument(id);
      
      return reply.send({
        code: 0,
        message: '删除成功'
      });
    } catch (error) {
      console.error('删除文档失败:', error);
      return reply.status(500).send({
        code: -1,
        message: '删除文档失败',
        error: error.message
      });
    }
  });
};

module.exports = documentApiRoutes;
