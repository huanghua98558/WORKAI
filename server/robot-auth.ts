/**
 * 机器人验证服务
 * 提供 robotId 发放和验证功能
 */

import crypto from 'crypto';

// API Key 前缀
const API_KEY_PREFIX = 'rk_';

// API Key 长度
const API_KEY_LENGTH = 32;

/**
 * 生成机器人 API Key
 * 格式: rk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
export function generateApiKey(): string {
  const buffer = crypto.randomBytes(API_KEY_LENGTH);
  const key = buffer.toString('base64url').slice(0, API_KEY_LENGTH);
  return `${API_KEY_PREFIX}${key}`;
}

/**
 * 哈希 API Key（用于安全存储）
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * 验证 API Key 格式
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  // 格式: rk_ + 32字符
  const pattern = new RegExp(`^${API_KEY_PREFIX}[A-Za-z0-9_-]{${API_KEY_LENGTH}}$`);
  return pattern.test(apiKey);
}

/**
 * 生成设备绑定 Token
 */
export function generateDeviceToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 验证机器人连接凭据
 */
export interface RobotCredentials {
  robotId: string;
  apiKey: string;
  deviceToken?: string;
}

export interface RobotInfo {
  id: string;
  robotId: string;
  name: string;
  apiKeyHash: string;
  deviceToken?: string;
  isActive: boolean;
  isValid: boolean;
  expiresAt?: Date;
}

/**
 * 机器人验证结果
 */
export interface ValidationResult {
  success: boolean;
  robot?: RobotInfo;
  error?: string;
  code?: 'INVALID_FORMAT' | 'NOT_FOUND' | 'INACTIVE' | 'EXPIRED' | 'DEVICE_MISMATCH' | 'INVALID_KEY';
}

// 模拟数据库（实际应从数据库获取）
// 在生产环境中，这个应该替换为真实的数据库查询
const robotCache = new Map<string, RobotInfo>();

/**
 * 设置机器人缓存（用于测试或初始化）
 */
export function setRobotCache(robotId: string, info: RobotInfo): void {
  robotCache.set(robotId, info);
}

/**
 * 获取机器人信息
 * 实际实现应该从数据库查询
 */
export async function getRobotInfo(robotId: string): Promise<RobotInfo | null> {
  // 先检查缓存
  if (robotCache.has(robotId)) {
    return robotCache.get(robotId) || null;
  }

  // TODO: 从数据库查询
  // const db = await getDb();
  // const robot = await db.select().from(robots).where(eq(robots.robotId, robotId)).limit(1);
  
  return null;
}

/**
 * 验证机器人凭据
 */
export async function validateRobotCredentials(credentials: RobotCredentials): Promise<ValidationResult> {
  const { robotId, apiKey, deviceToken } = credentials;

  // 1. 验证格式
  if (!robotId || typeof robotId !== 'string') {
    return {
      success: false,
      code: 'INVALID_FORMAT',
      error: 'robotId 格式无效',
    };
  }

  if (!isValidApiKeyFormat(apiKey)) {
    return {
      success: false,
      code: 'INVALID_FORMAT',
      error: 'API Key 格式无效',
    };
  }

  // 2. 查询机器人信息
  const robot = await getRobotInfo(robotId);
  if (!robot) {
    return {
      success: false,
      code: 'NOT_FOUND',
      error: '机器人不存在',
    };
  }

  // 3. 检查是否激活
  if (!robot.isActive) {
    return {
      success: false,
      code: 'INACTIVE',
      error: '机器人已停用',
    };
  }

  // 4. 检查是否有效
  if (!robot.isValid) {
    return {
      success: false,
      code: 'INACTIVE',
      error: '机器人已失效',
    };
  }

  // 5. 检查是否过期
  if (robot.expiresAt && new Date() > robot.expiresAt) {
    return {
      success: false,
      code: 'EXPIRED',
      error: '机器人已过期',
    };
  }

  // 6. 验证 API Key
  const apiKeyHash = hashApiKey(apiKey);
  if (apiKeyHash !== robot.apiKeyHash) {
    return {
      success: false,
      code: 'INVALID_KEY',
      error: 'API Key 无效',
    };
  }

  // 7. 验证设备绑定（如果启用了设备绑定）
  if (robot.deviceToken && deviceToken !== robot.deviceToken) {
    return {
      success: false,
      code: 'DEVICE_MISMATCH',
      error: '设备不匹配',
    };
  }

  // 验证成功
  return {
    success: true,
    robot,
  };
}

/**
 * 更新机器人设备绑定
 */
export async function bindDeviceToRobot(robotId: string, deviceToken: string): Promise<boolean> {
  // TODO: 实现数据库更新
  // const db = await getDb();
  // await db.update(robots).set({ deviceToken }).where(eq(robots.robotId, robotId));
  
  const robot = robotCache.get(robotId);
  if (robot) {
    robot.deviceToken = deviceToken;
    robotCache.set(robotId, robot);
  }
  
  return true;
}

/**
 * 重新生成 API Key
 */
export async function regenerateApiKey(robotId: string): Promise<string | null> {
  // TODO: 实现数据库更新
  // const newApiKey = generateApiKey();
  // const apiKeyHash = hashApiKey(newApiKey);
  // const db = await getDb();
  // await db.update(robots).set({ apiKeyHash }).where(eq(robots.robotId, robotId));
  
  const robot = robotCache.get(robotId);
  if (robot) {
    const newApiKey = generateApiKey();
    robot.apiKeyHash = hashApiKey(newApiKey);
    robotCache.set(robotId, robot);
    return newApiKey;
  }
  
  return null;
}

export default {
  generateApiKey,
  hashApiKey,
  isValidApiKeyFormat,
  generateDeviceToken,
  validateRobotCredentials,
  getRobotInfo,
  setRobotCache,
  bindDeviceToRobot,
  regenerateApiKey,
};
