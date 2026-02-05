import { KnowledgeClient, Config, KnowledgeDocument, DataSourceType } from 'coze-coding-dev-sdk';
import { FastifyInstance } from 'fastify';

export async function knowledgeRoutes(fastify: FastifyInstance) {
  // 导入文档到知识库
  fastify.post('/api/knowledge/import', async (request, reply) => {
    try {
      const body = request.body as {
        documents?: Array<{ type: 'text' | 'url' | 'uri'; content: string }>;
        dataset?: string;
      };

      if (!body.documents || body.documents.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'No documents to import'
        });
      }

      const config = new Config();
      const client = new KnowledgeClient(config);

      // 转换文档格式
      const docs: KnowledgeDocument[] = body.documents.map(doc => {
        if (doc.type === 'text') {
          return {
            source: DataSourceType.TEXT,
            raw_data: doc.content
          };
        } else if (doc.type === 'url') {
          return {
            source: DataSourceType.URL,
            url: doc.content
          };
        } else {
          return {
            source: DataSourceType.URI,
            uri: doc.content
          };
        }
      });

      // 导入到知识库
      const response = await client.addDocuments(docs, body.dataset || 'coze_doc_knowledge');

      if (response.code === 0) {
        return reply.send({
          success: true,
          data: {
            docIds: response.doc_ids || [],
            message: `Successfully imported ${response.doc_ids?.length || 0} documents`
          }
        });
      } else {
        return reply.code(500).send({
          success: false,
          error: response.msg || 'Failed to import documents'
        });
      }
    } catch (error) {
      fastify.log.error(error, 'Knowledge import error');
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // 搜索知识库
  fastify.post('/api/knowledge/search', async (request, reply) => {
    try {
      const body = request.body as {
        query: string;
        dataset?: string;
        topK?: number;
        minScore?: number;
      };

      if (!body.query) {
        return reply.code(400).send({
          success: false,
          error: 'Query is required'
        });
      }

      const config = new Config();
      const client = new KnowledgeClient(config);

      const response = await client.search(
        body.query,
        body.dataset ? [body.dataset] : undefined,
        body.topK || 5,
        body.minScore || 0.0
      );

      if (response.code === 0) {
        return reply.send({
          success: true,
          data: {
            chunks: response.chunks || [],
            message: `Found ${response.chunks?.length || 0} results`
          }
        });
      } else {
        return reply.code(500).send({
          success: false,
          error: response.msg || 'Search failed'
        });
      }
    } catch (error) {
      fastify.log.error(error, 'Knowledge search error');
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
