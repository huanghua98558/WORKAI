/**
 * CORS 配置管理
 * 用于控制跨域请求的访问权限
 */

// 允许的域名白名单
const allowedOrigins = {
  // 生产环境域名
  production: [
    'https://worktool.yourdomain.com',
    'https://app.worktool.yourdomain.com',
    'https://admin.worktool.yourdomain.com'
  ],
  // 开发环境域名
  development: [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    // 扣子开发环境（支持通配符）
    '*.dev.coze.site',
    '*.coze.site'
  ],
  // 测试环境域名
  test: [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://test.worktool.yourdomain.com'
  ]
};

/**
 * 获取当前环境的白名单
 */
function getAllowedOrigins() {
  const env = process.env.NODE_ENV || 'development';
  return allowedOrigins[env] || allowedOrigins.development;
}

/**
 * 验证域名是否在白名单中
 */
function isOriginAllowed(origin) {
  // 同源请求（origin 为空字符串）允许
  if (!origin) {
    return true;
  }

  const allowed = getAllowedOrigins();

  // 检查是否在白名单中
  for (const allowedOrigin of allowed) {
    // 支持通配符匹配
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(origin)) {
        return true;
      }
    } else if (allowedOrigin === origin) {
      // 精确匹配
      return true;
    }
  }

  return false;
}

/**
 * CORS 配置
 */
const corsConfig = {
  origin: (origin, callback) => {
    // 同源请求直接允许
    if (!origin) {
      return callback(null, true);
    }

    // 验证域名
    if (isOriginAllowed(origin)) {
      console.log(`[CORS] 允许访问: ${origin}`);
      return callback(null, true);
    } else {
      console.warn(`[CORS] 阻止访问: ${origin} (不在白名单中)`);
      return callback(new Error('Origin not allowed by CORS'), false);
    }
  },
  credentials: true, // 允许携带凭证
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // 允许的方法
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'], // 允许的请求头
  exposedHeaders: ['Content-Disposition'], // 暴露的响应头
  maxAge: 86400 // 预检请求缓存时间（24小时）
};

module.exports = {
  corsConfig,
  getAllowedOrigins,
  isOriginAllowed
};
