/**
 * 创建测试会话数据脚本
 */

require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { sessionMessages } = require('../database/schema');
const { sql } = require('drizzle-orm');

async function createTestSessions() {
  console.log('[测试数据] 开始创建测试会话数据...');

  const db = await getDb();

  // 获取现有机器人数据
  const robots = await db
    .select()
    .from(sql`robots`)
    .limit(5);

  console.log('[测试数据] 现有机器人数量:', robots.length);

  if (robots.length === 0) {
    console.log('[测试数据] 没有找到机器人，先创建一个默认机器人');
    await db.execute(sql`
      INSERT INTO robots (robot_id, robot_name, nickname, status, current_session_count)
      VALUES ('test_robot_001', '测试机器人', '小助手', 'online', 0)
      ON CONFLICT (robot_id) DO NOTHING
    `);
  }

  const testRobot = robots[0] || { robot_id: 'test_robot_001', robot_name: '测试机器人', nickname: '小助手' };

  // 创建测试会话数据
  const testSessions = [
    {
      sessionId: 'session_测试公司A',
      userId: 'user001',
      userName: '张三',
      groupId: 'group_测试公司A',
      groupName: '测试公司A',
      robotId: testRobot.robot_id,
      robotName: testRobot.robot_name,
      robotNickname: testRobot.nickname,
    },
    {
      sessionId: 'session_测试公司B',
      userId: 'user002',
      userName: '李四',
      groupId: 'group_测试公司B',
      groupName: '测试公司B',
      robotId: testRobot.robot_id,
      robotName: testRobot.robot_name,
      robotNickname: testRobot.nickname,
    },
    {
      sessionId: 'session_福州市广优农商贸有限公司',
      userId: '王五',
      userName: '王五',
      groupId: '福州市广优农商贸有限公司',
      groupName: '福州市广优农商贸有限公司',
      robotId: 'wt22phhjpt2xboerspxsote472xdnyq2',
      robotName: '潘语欣',
      robotNickname: null,
    }
  ];

  // 创建测试消息
  const testMessages = [
    // 会话 1 - 张三
    {
      sessionId: testSessions[0].sessionId,
      userId: testSessions[0].userId,
      userName: testSessions[0].userName,
      groupId: testSessions[0].groupId,
      groupName: testSessions[0].groupName,
      robotId: testSessions[0].robotId,
      robotName: testSessions[0].robotName,
      content: '你好，我想咨询一下产品价格',
      isFromUser: true,
      isFromBot: false,
      isHuman: false,
      intent: '价格咨询'
    },
    {
      sessionId: testSessions[0].sessionId,
      userId: testSessions[0].userId,
      userName: testSessions[0].userName,
      groupId: testSessions[0].groupId,
      groupName: testSessions[0].groupName,
      robotId: testSessions[0].robotId,
      robotName: testSessions[0].robotName,
      content: '您好！我们的产品价格如下：标准版 999 元/年，专业版 1999 元/年',
      isFromUser: false,
      isFromBot: true,
      isHuman: false,
      intent: '价格咨询'
    },
    {
      sessionId: testSessions[0].sessionId,
      userId: testSessions[0].userId,
      userName: testSessions[0].userName,
      groupId: testSessions[0].groupId,
      groupName: testSessions[0].groupName,
      robotId: testSessions[0].robotId,
      robotName: testSessions[0].robotName,
      content: '专业版有什么额外功能吗？',
      isFromUser: true,
      isFromBot: false,
      isHuman: false,
      intent: '功能咨询'
    },

    // 会话 2 - 李四
    {
      sessionId: testSessions[1].sessionId,
      userId: testSessions[1].userId,
      userName: testSessions[1].userName,
      groupId: testSessions[1].groupId,
      groupName: testSessions[1].groupName,
      robotId: testSessions[1].robotId,
      robotName: testSessions[1].robotName,
      content: '我的账户无法登录',
      isFromUser: true,
      isFromBot: false,
      isHuman: false,
      intent: '登录问题'
    },
    {
      sessionId: testSessions[1].sessionId,
      userId: testSessions[1].userId,
      userName: testSessions[1].userName,
      groupId: testSessions[1].groupId,
      groupName: testSessions[1].groupName,
      robotId: testSessions[1].robotId,
      robotName: testSessions[1].robotName,
      content: '抱歉给您带来不便。请检查用户名和密码是否正确，或者尝试使用手机号登录',
      isFromUser: false,
      isFromBot: true,
      isHuman: false,
      intent: '登录问题'
    },

    // 会话 3 - 王五（人工接管）
    {
      sessionId: testSessions[2].sessionId,
      userId: testSessions[2].userId,
      userName: testSessions[2].userName,
      groupId: testSessions[2].groupId,
      groupName: testSessions[2].groupName,
      robotId: testSessions[2].robotId,
      robotName: testSessions[2].robotName,
      content: '这是一条端到端测试消息_前端',
      isFromUser: true,
      isFromBot: false,
      isHuman: false,
      intent: null
    }
  ];

  // 插入测试消息
  let insertedCount = 0;
  for (const message of testMessages) {
    try {
      await db.insert(sessionMessages).values({
        sessionId: message.sessionId,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: message.userId,
        userName: message.userName,
        groupId: message.groupId,
        groupName: message.groupName,
        robotId: message.robotId,
        robotName: message.robotName,
        content: message.content,
        isFromUser: message.isFromUser,
        isFromBot: message.isFromBot,
        isHuman: message.isHuman,
        intent: message.intent,
        timestamp: new Date(Date.now() - Math.random() * 86400000), // 最近 24 小时内
      });

      insertedCount++;
      console.log(`[测试数据] 插入消息: ${message.content.substring(0, 20)}...`);
    } catch (error) {
      console.error('[测试数据] 插入消息失败:', error.message);
    }
  }

  console.log(`[测试数据] 测试数据创建完成，共插入 ${insertedCount} 条消息`);

  // 查询当前会话数量
  const sessionCount = await db.execute(sql`
    SELECT COUNT(DISTINCT session_id) as count
    FROM session_messages
  `);

  console.log('[测试数据] 当前活跃会话数量:', sessionCount.rows[0].count);

  process.exit(0);
}

createTestSessions().catch(error => {
  console.error('[测试数据] 创建失败:', error);
  process.exit(1);
});
