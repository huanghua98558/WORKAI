import { KnowledgeClient, Config } from 'coze-coding-dev-sdk';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.query) {
      return Response.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
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
      return Response.json({
        success: true,
        data: {
          chunks: response.chunks || [],
          message: `Found ${response.chunks?.length || 0} results`
        }
      });
    } else {
      return Response.json(
        { success: false, error: response.msg || 'Search failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Knowledge search error:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
