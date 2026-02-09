/**
 * WorkTool API 测试脚本
 * 用于测试 WorkTool 回调地址和 API 调用
 */

const { getDb } = require('coze-coding-dev-sdk');
const { robots } = require('./database/schema');
const { eq } = require('drizzle-orm');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const TEST_ROBOT_ID = process.env.TEST_ROBOT_ID || '';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 测试结果
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, message = '') {
  testResults.tests.push({ name, passed, message });
  if (passed) {
    testResults.passed++;
    success(`${name}`);
  } else {
    testResults.failed++;
    error(`${name}: ${message}`);
  }
}

// 获取测试 Token
async function getTestToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const result = await response.json();

    if (result.code === 0 && result.data?.token) {
      info(`测试 Token: ${result.data.token.substring(0, 20)}...`);
      return result.data.token;
    } else {
      warning('无法获取测试 Token，使用无认证测试');
      return '';
    }
  } catch (error) {
    warning(`获取测试 Token 失败: ${error.message}`);
    return '';
  }
}

// 测试回调地址
async function testCallbacks() {
  log('\n=== 测试回调地址 ===', 'blue');

  // 测试机器人状态回调（上线）
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/worktool/callback/status?robotId=${TEST_ROBOT_ID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 5,
          timestamp: new Date().toISOString()
        })
      }
    );

    const result = await response.json();
    recordTest(
      '机器人状态回调（上线）',
      response.ok && result.code === 0,
      result.message || ''
    );
  } catch (error) {
    recordTest('机器人状态回调（上线）', false, error.message);
  }

  // 测试机器人状态回调（下线）
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/worktool/callback/status?robotId=${TEST_ROBOT_ID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 6,
          timestamp: new Date().toISOString()
        })
      }
    );

    const result = await response.json();
    recordTest(
      '机器人状态回调（下线）',
      response.ok && result.code === 0,
      result.message || ''
    );
  } catch (error) {
    recordTest('机器人状态回调（下线）', false, error.message);
  }

  // 测试机器人上线回调（兼容性路由）
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/worktool/callback/robot-online?robotId=${TEST_ROBOT_ID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 5,
          timestamp: new Date().toISOString()
        })
      }
    );

    const result = await response.json();
    recordTest(
      '机器人上线回调（兼容性路由）',
      response.ok && result.code === 0,
      result.message || ''
    );
  } catch (error) {
    recordTest('机器人上线回调（兼容性路由）', false, error.message);
  }

  // 测试机器人下线回调（兼容性路由）
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/worktool/callback/robot-offline?robotId=${TEST_ROBOT_ID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 6,
          timestamp: new Date().toISOString()
        })
      }
    );

    const result = await response.json();
    recordTest(
      '机器人下线回调（兼容性路由）',
      response.ok && result.code === 0,
      result.message || ''
    );
  } catch (error) {
    recordTest('机器人下线回调（兼容性路由）', false, error.message);
  }
}

// 测试 WorkTool API 调用
async function testWorkToolApi(token) {
  log('\n=== 测试 WorkTool API 调用 ===', 'blue');

  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 测试获取机器人信息
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/worktool/robot/info?robotId=${TEST_ROBOT_ID}`,
      { headers }
    );

    const result = await response.json();

    // 如果机器人不存在，也算测试通过（只是业务逻辑错误）
    recordTest(
      '获取机器人信息 API',
      response.ok,
      result.message || ''
    );
  } catch (error) {
    recordTest('获取机器人信息 API', false, error.message);
  }

  // 测试查询机器人在线状态
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/worktool/robot/online-status?robotId=${TEST_ROBOT_ID}`,
      { headers }
    );

    const result = await response.json();
    recordTest(
      '查询机器人在线状态 API',
      response.ok,
      result.message || ''
    );
  } catch (error) {
    recordTest('查询机器人在线状态 API', false, error.message);
  }

  // 测试查询登录日志
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/worktool/robot/login-logs?robotId=${TEST_ROBOT_ID}&page=1&pageSize=10`,
      { headers }
    );

    const result = await response.json();
    recordTest(
      '查询登录日志 API',
      response.ok,
      result.message || ''
    );
  } catch (error) {
    recordTest('查询登录日志 API', false, error.message);
  }

  // 测试查询指令消息
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/worktool/robot/command-messages?robotId=${TEST_ROBOT_ID}&page=1&pageSize=10`,
      { headers }
    );

    const result = await response.json();
    recordTest(
      '查询指令消息 API',
      response.ok,
      result.message || ''
    );
  } catch (error) {
    recordTest('查询指令消息 API', false, error.message);
  }

  // 测试查询指令执行结果
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/worktool/robot/command-results?robotId=${TEST_ROBOT_ID}&page=1&pageSize=10`,
      { headers }
    );

    const result = await response.json();
    recordTest(
      '查询指令执行结果 API',
      response.ok,
      result.message || ''
    );
  } catch (error) {
    recordTest('查询指令执行结果 API', false, error.message);
  }

  // 测试查询消息回调日志
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/worktool/robot/message-logs?robotId=${TEST_ROBOT_ID}&page=1&pageSize=10`,
      { headers }
    );

    const result = await response.json();
    recordTest(
      '查询消息回调日志 API',
      response.ok,
      result.message || ''
    );
  } catch (error) {
    recordTest('查询消息回调日志 API', false, error.message);
  }
}

// 测试机器人配置
async function testRobotConfig() {
  log('\n=== 测试机器人配置 ===', 'blue');

  try {
    const db = await getDb();
    const robot = await db.select()
      .from(robots)
      .where(eq(robots.robotId, TEST_ROBOT_ID))
      .limit(1);

    if (robot.length > 0) {
      success(`机器人配置已找到: ${robot[0].name}`);
      info(`  - 机器人 ID: ${robot[0].robotId}`);
      info(`  - 是否启用: ${robot[0].isActive}`);
      info(`  - 配置: ${JSON.stringify(robot[0].config)}`);

      // 检查 WorkTool 配置
      const worktoolConfig = robot[0].config?.worktool || {};
      if (worktoolConfig.apiBaseUrl) {
        success(`  - API Base URL: ${worktoolConfig.apiBaseUrl}`);
      } else {
        warning('  - API Base URL: 未配置');
      }

      if (worktoolConfig.callbackUrl) {
        success(`  - 回调 URL: ${worktoolConfig.callbackUrl}`);
      } else {
        warning('  - 回调 URL: 未配置');
      }
    } else {
      warning(`未找到机器人配置: ${TEST_ROBOT_ID}`);
    }
  } catch (error) {
    error(`查询机器人配置失败: ${error.message}`);
  }
}

// 打印测试结果摘要
function printSummary() {
  log('\n=== 测试结果摘要 ===', 'blue');
  log(`总测试数: ${testResults.tests.length}`, 'reset');
  success(`通过: ${testResults.passed}`);
  if (testResults.failed > 0) {
    error(`失败: ${testResults.failed}`);
  } else {
    log(`失败: ${testResults.failed}`, 'reset');
  }

  const passRate = ((testResults.passed / testResults.tests.length) * 100).toFixed(2);
  log(`通过率: ${passRate}%`, 'reset');

  if (testResults.failed === 0) {
    success('\n🎉 所有测试通过！');
  } else {
    warning('\n⚠️  部分测试失败，请检查失败项');
  }
}

// 主函数
async function main() {
  log('WorkTool API 测试脚本', 'blue');
  log('==================', 'blue');

  if (!TEST_ROBOT_ID) {
    warning('未设置 TEST_ROBOT_ID 环境变量');
    warning('使用默认测试机器人 ID: test_robot_001');
    process.env.TEST_ROBOT_ID = 'test_robot_001';
  }

  info(`API Base URL: ${API_BASE_URL}`);
  info(`测试机器人 ID: ${TEST_ROBOT_ID}`);

  // 测试机器人配置
  await testRobotConfig();

  // 测试回调地址
  await testCallbacks();

  // 获取测试 Token
  const token = await getTestToken();

  // 测试 WorkTool API 调用
  await testWorkToolApi(token);

  // 打印测试结果摘要
  printSummary();

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 运行测试
main().catch(error => {
  error(`测试运行失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
