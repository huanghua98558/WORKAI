/**
 * 密码加密和验证工具
 * 使用bcrypt进行密码哈希和验证
 */

const bcrypt = require('bcrypt');
const { getLogger } = require('./logger');

const logger = getLogger('PASSWORD');

// 加密强度（salt rounds）
const SALT_ROUNDS = 12;

/**
 * 加密密码
 * @param {string} plainPassword 明文密码
 * @returns {Promise<string>} 加密后的密码哈希
 */
async function hashPassword(plainPassword) {
  try {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('密码必须是字符串');
    }

    // 检查密码强度
    const strength = checkPasswordStrength(plainPassword);
    if (strength.score < 2) {
      logger.warn('密码强度较低', { score: strength.score, issues: strength.issues });
    }

    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    logger.info('密码加密成功', { length: hashedPassword.length });
    return hashedPassword;
  } catch (error) {
    logger.error('密码加密失败', { error: error.message });
    throw new Error('密码加密失败');
  }
}

/**
 * 验证密码
 * @param {string} plainPassword 明文密码
 * @param {string} hashedPassword 加密后的密码
 * @returns {Promise<boolean>} 密码是否匹配
 */
async function verifyPassword(plainPassword, hashedPassword) {
  try {
    if (!plainPassword || !hashedPassword) {
      return false;
    }

    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    logger.info('密码验证完成', { isMatch });
    return isMatch;
  } catch (error) {
    logger.error('密码验证失败', { error: error.message });
    return false;
  }
}

/**
 * 检查密码强度
 * @param {string} password 密码
 * @returns {object} 强度信息
 */
function checkPasswordStrength(password) {
  const issues = [];
  let score = 0;

  // 长度检查
  if (password.length < 8) {
    issues.push('密码长度至少8位');
  } else {
    score += 1;
  }

  // 包含大写字母
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    issues.push('建议包含大写字母');
  }

  // 包含小写字母
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    issues.push('建议包含小写字母');
  }

  // 包含数字
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    issues.push('建议包含数字');
  }

  // 包含特殊字符
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    issues.push('建议包含特殊字符');
  }

  // 计算强度等级
  let level = 'weak';
  if (score >= 4) {
    level = 'strong';
  } else if (score >= 2) {
    level = 'medium';
  }

  return {
    score, // 0-5
    level, // weak, medium, strong
    issues,
    isValid: score >= 2
  };
}

/**
 * 生成随机密码
 * @param {number} length 密码长度（默认12）
 * @returns {string} 随机密码
 */
function generateRandomPassword(length = 12) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
}

/**
 * 检查密码是否需要更新（升级加密强度）
 * @param {string} hashedPassword 加密后的密码
 * @returns {Promise<boolean>} 是否需要更新
 */
async function needsPasswordUpdate(hashedPassword) {
  try {
    // 检查salt rounds是否低于当前配置
    const saltRounds = bcrypt.getRounds(hashedPassword);
    return saltRounds < SALT_ROUNDS;
  } catch (error) {
    logger.error('检查密码更新失败', { error: error.message });
    return false;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  checkPasswordStrength,
  generateRandomPassword,
  needsPasswordUpdate,
  SALT_ROUNDS
};
