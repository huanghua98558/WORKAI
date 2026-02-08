/**
 * 机器人和机器人角色初始化脚本
 * 插入默认的机器人配置和机器人角色
 */

require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { robots } = require('../database/schema');
const { eq } = require('drizzle-orm');
const { v4: uuidv4 } = require('uuid');

async function seedRobotAndRoleData() {
  console.log('🌱 开始初始化机器人和机器人角色数据...\n');

  try {
    const db = await getDb();

    // ============================================
    // 1. 初始化机器人
    // ============================================
    console.log('1️⃣ 检查并插入机器人配置...');

    // 获取回调基础地址
    const callbackBaseUrl = process.env.DEPLOYMENT_CALLBACK_BASE_URL || 'https://n2hsd37kxc.coze.site';

    const robotsData = [
      {
        name: '默认客服机器人',
        robotId: 'default-service-robot',
        nickname: '小助手',
        apiBaseUrl: 'https://www.worktool.com',
        description: '默认的客服机器人，处理日常的服务请求和咨询',
        robotType: 'service',
        company: 'WorkTool',
        is_active: true,
        status: 'online',
        is_valid: true,
        messageCallbackEnabled: true,
        messageCallbackUrl: `${callbackBaseUrl}/api/worktool/callback/message?robotId=default-service-robot`,
        online_callback_url: `${callbackBaseUrl}/api/worktool/callback/online?robotId=default-service-robot`,
        offline_callback_url: `${callbackBaseUrl}/api/worktool/callback/offline?robotId=default-service-robot`,
        result_callback_url: `${callbackBaseUrl}/api/worktool/callback/result?robotId=default-service-robot`,
        capabilities: ['chat', 'service_reply', 'intent_recognition', 'risk_detection'],
        priority: 100,
        maxConcurrentSessions: 100,
        currentSessionCount: 0,
        loadBalancingWeight: 100,
        enabledIntents: ['service', 'help', 'chat', 'welcome'],
        ai_model_config: {
          intentModel: 'doubao-pro-4k-intent',
          replyModel: 'doubao-pro-32k-reply',
          generalModel: 'doubao-pro-32k-general'
        },
        response_config: {
          autoReply: true,
          replyDelay: 0,
          maxReplyLength: 500,
          enableMultiTurn: true
        },
        tags: ['default', 'service', 'primary']
      },
      {
        name: '技术支持机器人',
        robotId: 'tech-support-robot',
        nickname: '技术专家',
        apiBaseUrl: 'https://www.worktool.com',
        description: '专业的技术支持机器人，处理技术问题和故障排查',
        robotType: 'support',
        company: 'WorkTool',
        is_active: true,
        status: 'online',
        is_valid: true,
        messageCallbackEnabled: true,
        messageCallbackUrl: `${callbackBaseUrl}/api/worktool/callback/message?robotId=tech-support-robot`,
        online_callback_url: `${callbackBaseUrl}/api/worktool/callback/online?robotId=tech-support-robot`,
        offline_callback_url: `${callbackBaseUrl}/api/worktool/callback/offline?robotId=tech-support-robot`,
        result_callback_url: `${callbackBaseUrl}/api/worktool/callback/result?robotId=tech-support-robot`,
        capabilities: ['technical_support', 'problem_solving', 'coding'],
        priority: 90,
        maxConcurrentSessions: 50,
        currentSessionCount: 0,
        loadBalancingWeight: 80,
        enabledIntents: ['service', 'help'],
        ai_model_config: {
          intentModel: 'doubao-pro-4k-intent',
          replyModel: 'deepseek-r1-tech',
          generalModel: 'deepseek-r1-tech'
        },
        response_config: {
          autoReply: true,
          replyDelay: 0,
          maxReplyLength: 1000,
          enableMultiTurn: true
        },
        tags: ['support', 'technical', 'specialist']
      },
      {
        name: '转化客服机器人',
        robotId: 'conversion-robot',
        nickname: '转化专员',
        apiBaseUrl: 'https://www.worktool.com',
        description: '专门负责转化任务的机器人，具备强大的说服和分析能力',
        robotType: 'conversion',
        company: 'WorkTool',
        is_active: true,
        status: 'online',
        is_valid: true,
        messageCallbackEnabled: true,
        messageCallbackUrl: `${callbackBaseUrl}/api/worktool/callback/message?robotId=conversion-robot`,
        online_callback_url: `${callbackBaseUrl}/api/worktool/callback/online?robotId=conversion-robot`,
        offline_callback_url: `${callbackBaseUrl}/api/worktool/callback/offline?robotId=conversion-robot`,
        result_callback_url: `${callbackBaseUrl}/api/worktool/callback/result?robotId=conversion-robot`,
        capabilities: ['conversion', 'reasoning', 'persuasion', 'analysis'],
        priority: 95,
        maxConcurrentSessions: 30,
        currentSessionCount: 0,
        loadBalancingWeight: 90,
        enabledIntents: ['service', 'help', 'chat'],
        ai_model_config: {
          intentModel: 'doubao-pro-4k-intent',
          replyModel: 'deepseek-v3-conversion',
          generalModel: 'deepseek-v3-conversion'
        },
        response_config: {
          autoReply: true,
          replyDelay: 0,
          maxReplyLength: 800,
          enableMultiTurn: true
        },
        tags: ['conversion', 'sales', 'specialist']
      }
    ];

    let insertedRobots = 0;
    for (const robot of robotsData) {
      // 检查是否已存在
      const existing = await db.select()
        .from(robots)
        .where(eq(robots.robotId, robot.robotId))
        .limit(1);

      if (existing.length === 0) {
        console.log(`   ✨ 插入机器人配置: ${robot.name} (${robot.robotId})`);
        await db.insert(robots).values({
          ...robot,
          id: uuidv4(),
          activatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          lastCheckAt: new Date(),
          lastHeartbeatAt: new Date()
        });
        insertedRobots++;
      } else {
        // 如果已存在，更新配置（确保消息回调启用）
        console.log(`   🔧 更新机器人配置: ${robot.name} (${robot.robotId})`);
        await db.update(robots)
          .set({
            ...robot,
            messageCallbackEnabled: true,
            status: 'online',
            updatedAt: new Date()
          })
          .where(eq(robots.robotId, robot.robotId));
        insertedRobots++;
      }
    }
    console.log(`   ✅ 机器人配置初始化完成，共处理 ${insertedRobots} 个机器人`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 机器人和机器人角色初始化完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 初始化统计：');
    console.log(`   - 机器人配置: ${insertedRobots} 个`);
    console.log(`   - 回调地址: ${callbackBaseUrl}`);
    console.log('\n💡 提示：');
    console.log('   1. 所有机器人已启用消息回调');
    console.log('   2. 机器人状态设置为 online');
    console.log('   3. 默认机器人可用于接收和处理消息');
    console.log('\n');

  } catch (error) {
    console.error('❌ 机器人和机器人角色初始化失败:', error);
    throw error;
  }
}

// 导出函数
module.exports = { seedRobotAndRoleData };

// 如果直接运行此脚本
if (require.main === module) {
  seedRobotAndRoleData()
    .then(() => {
      console.log('✅ 机器人和机器人角色初始化成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 机器人和机器人角色初始化失败:', error);
      process.exit(1);
    });
}
