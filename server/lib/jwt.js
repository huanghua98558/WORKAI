/**
 * JWT (JSON Web Token) 认证工具
 * 用于生成和验证用户身份令牌
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT 密钥（从环境变量获取，如果没有则生成一个随机的）
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// Token 有效期
const JWT_ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h';  // 访问令牌：1小时
const JWT_REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d'; // 刷新令牌：7天

if (!process.env.JWT_SECRET) {
  console.warn('[JWT] 警告: JWT_SECRET 未设置，使用随机生成的密钥（仅开发环境）');
  console.warn('[JWT] 生产环境必须设置 JWT_SECRET 环境变量！');
}

/**
 * 生成访问令牌
 * @param {Object} payload - 令牌负载
 * @returns {string} JWT Token
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_TOKEN_EXPIRES_IN,
    issuer: 'worktool-ai',
    audience: 'worktool-users'
  });
}

/**
 * 生成刷新令牌
 * @param {Object} payload - 令牌负载
 * @param {string} expiresIn - 过期时间（可选，默认使用 JWT_REFRESH_TOKEN_EXPIRES_IN）
 * @returns {string} JWT Token
 */
function generateRefreshToken(payload, expiresIn) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiresIn || JWT_REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'worktool-ai',
    audience: 'worktool-users'
  });
}

/**
 * 验证令牌
 * @param {string} token - JWT Token
 * @returns {Object|null} 解码后的负载，验证失败返回 null
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'worktool-ai',
      audience: 'worktool-users'
    });
    return decoded;
  } catch (error) {
    console.warn('[JWT] Token 验证失败:', error.message);
    return null;
  }
}

/**
 * 解码令牌（不验证签名）
 * 用于调试和查看令牌内容
 * @param {string} token - JWT Token
 * @returns {Object|null} 解码后的负载
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('[JWT] Token 解码失败:', error.message);
    return null;
  }
}

/**
 * 刷新令牌
 * @param {string} refreshToken - 刷新令牌
 * @returns {Object|null} 新的令牌对，验证失败返回 null
 */
function refreshToken(refreshToken) {
  try {
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return null;
    }

    // 生成新的令牌对
    const payload = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
      expiresIn: JWT_ACCESS_TOKEN_EXPIRES_IN
    };
  } catch (error) {
    console.error('[JWT] 刷新令牌失败:', error.message);
    return null;
  }
}

/**
 * 生成用户令牌对（访问令牌 + 刷新令牌）
 * @param {Object} user - 用户信息
 * @param {string} user.userId - 用户ID
 * @param {string} user.username - 用户名
 * @param {string} user.role - 用户角色
 * @param {Object} options - 可选参数
 * @param {boolean} options.rememberMe - 是否记住登录（延长 refresh token 过期时间）
 * @returns {Object} 令牌对
 */
function generateTokenPair(user, options = {}) {
  const { rememberMe = false } = options;
  const payload = {
    userId: user.userId,
    username: user.username,
    role: user.role || 'user'
  };

  // 计算刷新令牌的过期时间
  const refreshTokenExpiresIn = rememberMe ? '30d' : JWT_REFRESH_TOKEN_EXPIRES_IN;

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload, refreshTokenExpiresIn),
    expiresIn: JWT_ACCESS_TOKEN_EXPIRES_IN
  };
}

/**
 * 获取令牌过期时间（秒）
 * @returns {number}
 */
function getTokenExpiresIn() {
  const match = JWT_ACCESS_TOKEN_EXPIRES_IN.match(/^(\d+)([shd])$/);
  if (!match) return 3600; // 默认1小时

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 3600;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  refreshToken,
  generateTokenPair,
  getTokenExpiresIn,
  JWT_SECRET
};
