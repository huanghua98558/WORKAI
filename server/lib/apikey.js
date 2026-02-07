/**
 * API Key 认证工具
 * 用于生成和验证 API Key
 */

const crypto = require('crypto');

// API Key 前缀
const API_KEY_PREFIX = 'wt_';

// API Key 长度（不包括前缀）
const API_KEY_LENGTH = 32;

/**
 * 生成随机 API Key
 * @returns {string} API Key
 */
function generateApiKey() {
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH);
  const apiKey = randomBytes.toString('hex');
  return `${API_KEY_PREFIX}${apiKey}`;
}

/**
 * 生成带名称的 API Key
 * @param {string} name - API Key 名称
 * @returns {Object} API Key 对象
 */
function generateApiKeyWithName(name) {
  const apiKey = generateApiKey();
  const hashedApiKey = hashApiKey(apiKey);

  return {
    id: crypto.randomUUID(),
    name: name || 'Unnamed API Key',
    apiKey: apiKey, // 仅在创建时返回一次
    hashedApiKey: hashedApiKey,
    createdAt: new Date().toISOString(),
    lastUsedAt: null
  };
}

/**
 * 对 API Key 进行哈希（用于存储）
 * @param {string} apiKey - API Key
 * @returns {string} 哈希后的 API Key
 */
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * 验证 API Key 格式
 * @param {string} apiKey - API Key
 * @returns {boolean} 是否有效
 */
function validateApiKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // 检查前缀
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return false;
  }

  // 检查长度
  const keyPart = apiKey.substring(API_KEY_PREFIX.length);
  if (keyPart.length !== API_KEY_LENGTH * 2) { // hex 编码，每个字节 2 个字符
    return false;
  }

  // 检查是否为有效的十六进制
  const hexRegex = /^[0-9a-f]+$/;
  return hexRegex.test(keyPart);
}

/**
 * 比较 API Key（安全比较）
 * @param {string} providedApiKey - 提供的 API Key
 * @param {string} hashedApiKey - 存储的哈希值
 * @returns {boolean} 是否匹配
 */
function compareApiKey(providedApiKey, hashedApiKey) {
  if (!validateApiKeyFormat(providedApiKey)) {
    return false;
  }

  const providedHashed = hashApiKey(providedApiKey);
  return crypto.timingSafeEqual(
    Buffer.from(providedHashed),
    Buffer.from(hashedApiKey)
  );
}

/**
 * 提取 API Key 中的信息
 * @param {string} apiKey - API Key
 * @returns {Object|null} 提取的信息
 */
function extractApiKeyInfo(apiKey) {
  if (!validateApiKeyFormat(apiKey)) {
    return null;
  }

  return {
    prefix: API_KEY_PREFIX,
    length: apiKey.length,
    format: 'hex'
  };
}

module.exports = {
  generateApiKey,
  generateApiKeyWithName,
  hashApiKey,
  validateApiKeyFormat,
  compareApiKey,
  extractApiKeyInfo,
  API_KEY_PREFIX
};
