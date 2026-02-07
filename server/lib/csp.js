/**
 * CSP (Content Security Policy) 配置管理
 * 用于防护 XSS、点击劫持等安全威胁
 */

const cspConfig = {
  contentSecurityPolicy: {
    directives: {
      // 默认策略：只允许同源资源
      defaultSrc: ["'self'"],

      // 基础 URI：只允许同源
      baseUri: ["'self'"],

      // 表单提交：只允许同源
      formAction: ["'self'"],

      // 框架祖先：禁止嵌入 iframe（防护点击劫持）
      frameAncestors: ["'none'"],

      // 图片资源：允许 data:, https:, 和阿里云 OSS
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "*.aliyuncs.com",
        "*.worktool.com",
        "blob:"
      ],

      // 对象资源：禁止嵌入对象（防护攻击）
      objectSrc: ["'none'"],

      // 脚本资源：允许 'self', unsafe-inline（用于开发）, unsafe-eval（用于开发）
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // 用于 Tailwind CSS 和动态脚本
        "'unsafe-eval'",   // 用于某些第三方库
        "*.worktool.com"
      ],

      // 样式资源：允许 'self' 和 unsafe-inline（用于 Tailwind CSS）
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "*.worktool.com"
      ],

      // 连接资源：允许同源、backend URL、WebSocket、worktool.com
      connectSrc: [
        "'self'",
        process.env.BACKEND_URL || 'http://localhost:5001',
        "ws:",
        "wss:",
        "*.worktool.com"
      ],

      // 字体资源：只允许同源和 data:
      fontSrc: [
        "'self'",
        "data:"
      ],

      // 媒体资源：只允许同源
      mediaSrc: ["'self'"],

      // 框架资源：禁止嵌入 iframe
      frameSrc: ["'none'"],

      // Worker 脚本：允许同源和 blob:
      workerSrc: [
        "'self'",
        "blob:"
      ],

      // Manifest：只允许同源
      manifestSrc: ["'self'"],

      // 升级不安全请求：强制 HTTPS
      upgradeInsecureRequests: []
    }
  },

  // HSTS (HTTP Strict Transport Security) - 强制 HTTPS
  hsts: {
    maxAge: 31536000,           // 1年
    includeSubDomains: true,     // 包含子域名
    preload: true                // 允许预加载
  },

  // Referrer Policy
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin"
  },

  // 其他安全头
  crossOriginEmbedderPolicy: { policy: "credentialless" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-site" },
  originAgentCluster: true,
  permissionsPolicy: {
    features: {
      geolocation: ["'self'"],
      microphone: ["'none'"],
      camera: ["'none'"]
    }
  }
};

/**
 * 获取开发环境的 CSP 配置（宽松一些）
 */
function getDevCspConfig() {
  return {
    contentSecurityPolicy: false // 开发环境完全关闭 CSP
  };
}

/**
 * 获取生产环境的 CSP 配置
 */
function getProdCspConfig() {
  return cspConfig;
}

/**
 * 根据 NODE_ENV 获取对应的 CSP 配置
 */
function getCspConfig() {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    console.log('[CSP] 使用生产环境配置');
    return getProdCspConfig();
  } else {
    console.log('[CSP] 使用开发环境配置（CSP已关闭）');
    return getDevCspConfig();
  }
}

module.exports = {
  getCspConfig,
  getProdCspConfig,
  getDevCspConfig,
  cspConfig
};
