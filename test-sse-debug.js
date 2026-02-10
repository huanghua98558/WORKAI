const fastify = require('fastify');
const sseApiRoutes = require('./server/routes/sse.api');

const app = fastify();

// 注册SSE路由
app.register(sseApiRoutes, { prefix: '/api' });

// 打印所有路由
app.ready((err) => {
  if (err) throw err;

  console.log('\n所有路由:');
  app.printRoutes();
});
