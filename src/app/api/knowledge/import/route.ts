import { KnowledgeClient, Config, KnowledgeDocument, DataSourceType } from 'coze-coding-dev-sdk';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.documents || body.documents.length === 0) {
      return Response.json(
        { success: false, error: 'No documents to import' },
        { status: 400 }
      );
    }

    const config = new Config();
    const client = new KnowledgeClient(config);

    // 转换文档格式
    const docs: KnowledgeDocument[] = body.documents.map((doc: { type: 'text' | 'url' | 'uri'; content: string }) => {
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
    const response = await client.addDocuments(docs, body.dataset || 'worktool_knowledge');

    if (response.code === 0) {
      return Response.json({
        success: true,
        data: {
          docIds: response.doc_ids || [],
          message: `Successfully imported ${response.doc_ids?.length || 0} documents`
        }
      });
    } else {
      return Response.json(
        { success: false, error: response.msg || 'Failed to import documents' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Knowledge import error:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
