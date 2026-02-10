/**
 * SSE测试路由 - 简化版本
 */

async function sseTestRoutes(fastify, options) {
  console.log('[SSE-TEST] SSE测试路由正在注册...');

  // 测试路由
  fastify.get('/sse/test2', async (request, reply) => {
    console.log('[SSE-TEST] 测试路由被调用');
    return reply.send({ success: true, message: 'SSE测试路由正常工作' });
  });

  console.log('[SSE-TEST] SSE测试路由注册完成');
}

module.exports = sseTestRoutes;
