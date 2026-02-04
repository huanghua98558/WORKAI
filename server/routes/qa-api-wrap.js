// 快速为 QA API 的剩余路由添加认证保护的临时脚本
// 用于批量替换 fastify 路由定义

const fs = require('fs');
const path = require('path');

const qaApiPath = path.join(__dirname, 'server/routes/qa.api.js');
let content = fs.readFileSync(qaApiPath, 'utf8');

// 为未添加认证的路由添加认证
const routesToAddAuth = [
  { method: 'post', path: '/qa/batch' },
];

console.log('QA API 认证保护更新：已手动完成主要路由');
