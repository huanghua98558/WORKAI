#!/usr/bin/env node

/**
 * 消息保存测试脚本
 * 用于测试和诊断消息保存功能
 */

const DatabaseDiagnostics = require('./server/lib/database-diagnostics');
const sessionMessageService = require('./server/services/session-message.service');
const robotService = require('./server/services/robot.service');

async function testMessageSave() {
  console.log('===== 消息保存测试开始 =====\n');

  try {
    // 1. 运行数据库诊断
    console.log('1. 运行数据库诊断...\n');
    const dbResults = await DatabaseDiagnostics.diagnose();
    console.log('\n');

    // 2. 获取机器人列表
    console.log('2. 获取机器人列表...\n');
    const robots = await robotService.getAllRobots();
    console.log(`找到 ${robots.length} 个机器人:`);
    robots.forEach((robot, index) => {
      console.log(`  ${index + 1}. ${robot.name} (${robot.robotId})`);
    });
    console.log('');

    if (robots.length === 0) {
      console.error('错误: 没有可用的机器人');
      console.log('请先在系统中添加机器人');
      return;
    }

    // 3. 测试保存用户消息
    console.log('3. 测试保存用户消息...\n');
    const testRobot = robots[0];
    const testSessionId = 'test_session_' + Date.now();
    const testMessageId = 'test_msg_' + Date.now();

    try {
      await sessionMessageService.saveUserMessage(
        testSessionId,
        {
          userId: 'test_user_001',
          groupId: 'test_group_001',
          userName: '测试用户',
          groupName: '测试群组',
          content: '这是一条测试消息，用于验证消息保存功能',
          timestamp: new Date().toISOString()
        },
        testMessageId,
        testRobot
      );

      console.log('✓ 用户消息保存成功');
      console.log(`  sessionId: ${testSessionId}`);
      console.log(`  messageId: ${testMessageId}`);
      console.log(`  robotId: ${testRobot.robotId}`);
      console.log(`  robotName: ${testRobot.nickname || testRobot.name}`);
      console.log('');

    } catch (error) {
      console.error('✗ 用户消息保存失败:', error.message);
      console.error('  错误类型:', error.constructor.name);
      console.error('  错误代码:', error.code);
      if (error.constraint) {
        console.error('  违反约束:', error.constraint);
      }
      console.log('');
    }

    // 4. 测试保存机器人消息
    console.log('4. 测试保存机器人消息...\n');
    const botMessageId = 'bot_msg_' + Date.now();

    try {
      await sessionMessageService.saveBotMessage(
        testSessionId,
        '这是机器人的测试回复',
        {
          userId: 'test_user_001',
          groupId: 'test_group_001',
          userName: '测试用户',
          groupName: '测试群组',
        },
        'chat',
        testRobot
      );

      console.log('✓ 机器人消息保存成功');
      console.log(`  sessionId: ${testSessionId}`);
      console.log(`  messageId: ${botMessageId}`);
      console.log('');

    } catch (error) {
      console.error('✗ 机器人消息保存失败:', error.message);
      console.error('  错误类型:', error.constructor.name);
      console.error('  错误代码:', error.code);
      console.log('');
    }

    // 5. 测试验证
    console.log('5. 验证消息是否已保存...\n');
    const { getDb } = require('coze-coding-dev-sdk');
    const { sql } = require('drizzle-orm');
    const db = await getDb();

    const savedMessages = await db.execute(sql`
      SELECT 
        message_id,
        session_id,
        robot_id,
        robot_name,
        content,
        is_from_user,
        is_from_bot,
        timestamp
      FROM session_messages
      WHERE session_id = ${testSessionId}
      ORDER BY created_at DESC
    `);

    console.log(`找到 ${savedMessages.rows.length} 条消息:`);
    savedMessages.rows.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg.message_id}`);
      console.log(`     类型: ${msg.is_from_user ? '用户' : msg.is_from_bot ? '机器人' : '其他'}`);
      console.log(`     robotId: ${msg.robot_id}`);
      console.log(`     robotName: ${msg.robot_name}`);
      console.log(`     内容: ${msg.content.substring(0, 50)}...`);
      console.log(`     时间: ${msg.timestamp}`);
      console.log('');
    });

    // 6. 清理测试数据
    console.log('6. 清理测试数据...\n');
    await db.execute(sql`
      DELETE FROM session_messages 
      WHERE session_id = ${testSessionId}
    `);
    console.log('✓ 测试数据已清理\n');

    // 7. 总结
    console.log('===== 测试总结 =====');
    console.log('数据库连接:', dbResults.databaseConnection?.success ? '✓' : '✗');
    console.log('表存在:', dbResults.tableExists ? '✓' : '✗');
    console.log('表结构:', dbResults.tableStructure?.length ? '✓' : '✗');
    console.log('测试插入:', dbResults.testInsert?.success ? '✓' : '✗');
    console.log('用户消息保存:', savedMessages.rows.some(m => m.is_from_user) ? '✓' : '✗');
    console.log('机器人消息保存:', savedMessages.rows.some(m => m.is_from_bot) ? '✓' : '✗');
    console.log('数据验证:', savedMessages.rows.length >= 2 ? '✓' : '✗');
    console.log('数据清理:', '✓');
    console.log('\n===== 测试完成 =====');

  } catch (error) {
    console.error('\n测试过程出错:', error);
    console.error('错误类型:', error.constructor.name);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

// 运行测试
testMessageSave()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });
