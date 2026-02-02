const { getDb } = require('coze-coding-dev-sdk');
const { robots } = require('../server/database/schema');
const { eq } = require('drizzle-orm');
const robotService = require('../server/services/robot.service');

async function testRobotService() {
  const robotId = 'wt22phhjpt2xboerspxsote472xdnyq2';

  console.log('=================================================');
  console.log('测试 Robot Service - 从 API 获取机器人信息');
  console.log('=================================================\n');

  try {
    // 1. 从数据库获取机器人记录
    console.log('步骤 1: 从数据库获取机器人记录...');
    const robot = await robotService.getRobotByRobotId(robotId);
    
    if (!robot) {
      console.error('❌ 机器人不存在！');
      return;
    }

    console.log('✅ 找到机器人记录');
    console.log(`   Robot ID: ${robot.robotId}`);
    console.log(`   API Base URL: ${robot.apiBaseUrl}\n`);

    // 2. 调用 testRobotConnection 获取机器人信息
    console.log('步骤 2: 从 WorkTool API 获取机器人详细信息...');
    const result = await robotService.testRobotConnection(robot.robotId, robot.apiBaseUrl);

    console.log(`   成功: ${result.success}`);
    console.log(`   消息: ${result.message}\n`);

    if (!result.success) {
      console.error('❌ 获取机器人信息失败！');
      console.error(`   错误: ${result.error || '未知错误'}`);
      return;
    }

    // 3. 显示获取到的详细信息
    console.log('步骤 3: 获取到的详细信息:');
    const details = result.robotDetails;
    console.log('   --- 基本信息 ---');
    console.log(`   昵称: ${details.nickname || '未知'}`);
    console.log(`   企业: ${details.company || '未知'}`);
    console.log(`   IP 地址: ${details.ipAddress || '未知'}`);
    console.log(`   有效性: ${details.isValid ? '有效' : '无效'}`);
    console.log('   --- 时间信息 ---');
    console.log(`   启用时间: ${details.activatedAt || '未知'}`);
    console.log(`   到期时间: ${details.expiresAt || '未知'}`);
    console.log('   --- 回调信息 ---');
    console.log(`   消息回调: ${details.messageCallbackEnabled ? '开启' : '关闭'}\n`);

    // 4. 计算运行时间和剩余时间
    console.log('步骤 4: 计算运行时间和剩余时间...');
    const now = new Date();
    const calculateRunTime = (activatedAt) => {
      if (!activatedAt) return '未知';
      const diff = now - new Date(activatedAt);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${days}天${hours}小时${minutes}分钟`;
    };

    const calculateRemainingTime = (expiresAt) => {
      if (!expiresAt) return '未知';
      const diff = new Date(expiresAt) - now;
      if (diff <= 0) return '已过期';
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${days}天${hours}小时${minutes}分钟`;
    };

    console.log(`   已运行时间: ${calculateRunTime(details.activatedAt)}`);
    console.log(`   剩余时间: ${calculateRemainingTime(details.expiresAt)}\n`);

    // 5. 询问是否更新数据库
    console.log('步骤 5: 准备更新数据库...');
    console.log(`   将要更新以下字段:`);
    console.log(`   - nickname: "${details.nickname}"`);
    console.log(`   - company: "${details.company}"`);
    console.log(`   - ipAddress: "${details.ipAddress}"`);
    console.log(`   - isValid: ${details.isValid}`);
    console.log(`   - activatedAt: ${details.activatedAt}`);
    console.log(`   - expiresAt: ${details.expiresAt}`);
    console.log(`   - messageCallbackEnabled: ${details.messageCallbackEnabled}\n`);

    // 更新数据库
    console.log('正在更新数据库...');
    const db = await getDb();
    const updated = await db
      .update(robots)
      .set({
        nickname: details.nickname,
        company: details.company,
        ipAddress: details.ipAddress,
        isValid: details.isValid,
        activatedAt: details.activatedAt,
        expiresAt: details.expiresAt,
        messageCallbackEnabled: details.messageCallbackEnabled,
        extraData: details.extraData,
        updatedAt: new Date()
      })
      .where(eq(robots.robotId, robotId))
      .returning();

    console.log(`✅ 数据库更新成功！`);
    console.log(`   更新记录: ${JSON.stringify(updated[0], null, 2)}\n`);

    console.log('=================================================');
    console.log('✅ 测试完成！机器人信息已从 API 获取并更新到数据库。');
    console.log('=================================================');

  } catch (error) {
    console.error('❌ 测试失败！');
    console.error(`错误: ${error.message}`);
    console.error(error);
  }
}

testRobotService();
