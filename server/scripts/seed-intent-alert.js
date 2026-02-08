/**
 * 意图配置和告警规则初始化脚本
 * 插入默认的意图配置、告警规则和通知方式
 */

require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { intentConfigs, alertRules, notificationMethods } = require('../database/schema');
const { eq } = require('drizzle-orm');
const { v4: uuidv4 } = require('uuid');

async function seedIntentAndAlertData() {
  console.log('🌱 开始初始化意图配置和告警规则数据...\n');

  try {
    const db = await getDb();

    // ============================================
    // 1. 初始化意图配置
    // ============================================
    console.log('1️⃣ 检查并插入意图配置...');

    const intentConfigsData = [
      {
        intentType: 'service',
        intentName: '服务请求',
        intentDescription: '用户提出服务请求、售后问题或咨询',
        systemPrompt: '用户需要服务支持、售后服务或相关咨询。识别用户的诉求类型（如：售后、咨询、投诉等），记录关键信息。',
        isEnabled: true
      },
      {
        intentType: 'help',
        intentName: '帮助请求',
        intentDescription: '用户寻求帮助、指导或问题解答',
        systemPrompt: '用户需要帮助或指导。识别用户的具体需求（如：使用指导、功能介绍、故障排查等），提供相应的帮助。',
        isEnabled: true
      },
      {
        intentType: 'chat',
        intentName: '日常对话',
        intentDescription: '用户进行日常聊天、闲聊或问候',
        systemPrompt: '用户进行日常对话。保持友好自然的回复，可以适当进行话题延伸。',
        isEnabled: true
      },
      {
        intentType: 'welcome',
        intentName: '欢迎/问候',
        intentDescription: '用户首次进入或发送问候语',
        systemPrompt: '用户首次进入或发送问候。提供友好的欢迎语，引导用户了解可用的服务。',
        isEnabled: true
      },
      {
        intentType: 'risk',
        intentName: '风险识别',
        intentDescription: '识别潜在风险、异常行为或违规内容',
        systemPrompt: '识别用户消息中的风险信号，如投诉升级、恶意言论、异常频率等。及时预警并记录。',
        isEnabled: true
      },
      {
        intentType: 'spam',
        intentName: '垃圾信息',
        intentDescription: '识别广告、推销或无关信息',
        systemPrompt: '识别垃圾信息、广告推广或无关内容。标记并过滤。',
        isEnabled: true
      },
      {
        intentType: 'admin',
        intentName: '管理员操作',
        intentDescription: '管理员或工作人员的操作指令',
        systemPrompt: '识别来自管理员或工作人员的操作指令。验证权限后执行相应操作。',
        isEnabled: true
      }
    ];

    let insertedIntentConfigs = 0;
    for (const config of intentConfigsData) {
      const existing = await db.select()
        .from(intentConfigs)
        .where(eq(intentConfigs.intentType, config.intentType))
        .limit(1);

      if (existing.length === 0) {
        console.log(`   ✨ 插入意图配置: ${config.intentName}`);
        await db.insert(intentConfigs).values(config);
        insertedIntentConfigs++;
      } else {
        console.log(`   ℹ️ 意图配置已存在: ${config.intentName}`);
      }
    }
    console.log(`   ✅ 意图配置初始化完成，共插入 ${insertedIntentConfigs} 个配置`);

    // ============================================
    // 2. 初始化告警规则
    // ============================================
    console.log('\n2️⃣ 检查并插入告警规则...');

    // 先获取意图配置ID映射
    const allIntents = await db.select({
      intentType: intentConfigs.intentType,
      id: intentConfigs.id
    }).from(intentConfigs);
    const intentMap = {};
    allIntents.forEach(intent => {
      intentMap[intent.intentType] = intent.id;
    });

    const alertRulesData = [
      {
        intentType: 'risk',
        ruleName: '风险告警-投诉升级',
        isEnabled: true,
        alertLevel: 'critical',
        threshold: 1,
        cooldownPeriod: 300,
        messageTemplate: '检测到风险信号：{content}，请及时处理。',
        keywords: '投诉,不满,愤怒,威胁,举报',
        groupId: null,
        enableEscalation: true,
        escalationLevel: 0,
        escalationThreshold: 3,
        escalationInterval: 1800,
        escalationConfig: JSON.stringify({
          levels: [
            { level: 1, notify: ['staff'], delay: 0 },
            { level: 2, notify: ['manager'], delay: 1800 },
            { level: 3, notify: ['admin'], delay: 3600 }
          ]
        })
      },
      {
        intentType: 'risk',
        ruleName: '风险告警-异常频率',
        isEnabled: true,
        alertLevel: 'warning',
        threshold: 3,
        cooldownPeriod: 600,
        messageTemplate: '用户在短时间内频繁发送消息，可能存在异常行为。',
        keywords: '',
        groupId: null,
        enableEscalation: false,
        escalationLevel: 0,
        escalationThreshold: 0,
        escalationInterval: 0,
        escalationConfig: JSON.stringify({})
      },
      {
        intentType: 'spam',
        ruleName: '垃圾信息过滤',
        isEnabled: true,
        alertLevel: 'info',
        threshold: 1,
        cooldownPeriod: 60,
        messageTemplate: '检测到垃圾信息：{content}，已自动过滤。',
        keywords: '广告,推销,代购,兼职,刷单,贷款,诈骗',
        groupId: null,
        enableEscalation: false,
        escalationLevel: 0,
        escalationThreshold: 0,
        escalationInterval: 0,
        escalationConfig: JSON.stringify({})
      },
      {
        intentType: 'service',
        ruleName: '服务请求提醒',
        isEnabled: true,
        alertLevel: 'info',
        threshold: 1,
        cooldownPeriod: 300,
        messageTemplate: '收到服务请求：{content}，请及时处理。',
        keywords: '',
        groupId: null,
        enableEscalation: false,
        escalationLevel: 0,
        escalationThreshold: 0,
        escalationInterval: 0,
        escalationConfig: JSON.stringify({})
      }
    ];

    let insertedAlertRules = 0;
    const alertRuleIds = [];
    for (const rule of alertRulesData) {
      const existing = await db.select()
        .from(alertRules)
        .where(eq(alertRules.ruleName, rule.ruleName))
        .limit(1);

      let ruleId;
      if (existing.length === 0) {
        console.log(`   ✨ 插入告警规则: ${rule.ruleName}`);
        const result = await db.insert(alertRules).values(rule).returning();
        ruleId = result[0].id;
        insertedAlertRules++;
      } else {
        ruleId = existing[0].id;
        console.log(`   ℹ️ 告警规则已存在: ${rule.ruleName}`);
      }
      alertRuleIds.push({ ruleName: rule.ruleName, ruleId: ruleId, intentType: rule.intentType });
    }
    console.log(`   ✅ 告警规则初始化完成，共插入 ${insertedAlertRules} 个规则`);

    // ============================================
    // 3. 初始化通知方式
    // ============================================
    console.log('\n3️⃣ 检查并插入通知方式...');

    const notificationMethodsData = [
      // 风险告警-投诉升级的通知方式
      {
        alertRuleId: alertRuleIds.find(r => r.ruleName === '风险告警-投诉升级')?.ruleId,
        methodType: 'robot',
        isEnabled: true,
        recipientConfig: JSON.stringify({
          targets: ['staff'],
          message: '⚠️ {message}'
        }),
        messageTemplate: '⚠️ 风险告警：{message}',
        priority: 1
      },
      // 风险告警-投诉升级的升级通知
      {
        alertRuleId: alertRuleIds.find(r => r.ruleName === '风险告警-投诉升级')?.ruleId,
        methodType: 'robot',
        isEnabled: true,
        recipientConfig: JSON.stringify({
          targets: ['manager'],
          message: '🔴 {message} (升级通知)'
        }),
        messageTemplate: '🔴 风险告警升级：{message}',
        priority: 2
      },
      // 垃圾信息过滤的通知方式
      {
        alertRuleId: alertRuleIds.find(r => r.ruleName === '垃圾信息过滤')?.ruleId,
        methodType: 'robot',
        isEnabled: true,
        recipientConfig: JSON.stringify({
          targets: ['admin'],
          message: '🚫 垃圾信息：{message}'
        }),
        messageTemplate: '🚫 垃圾信息过滤：{message}',
        priority: 10
      },
      // 服务请求提醒的通知方式
      {
        alertRuleId: alertRuleIds.find(r => r.ruleName === '服务请求提醒')?.ruleId,
        methodType: 'robot',
        isEnabled: true,
        recipientConfig: JSON.stringify({
          targets: ['staff'],
          message: '📋 {message}'
        }),
        messageTemplate: '📋 服务请求：{message}',
        priority: 5
      }
    ];

    let insertedNotificationMethods = 0;
    for (const method of notificationMethodsData) {
      if (!method.alertRuleId) {
        console.log(`   ⚠️ 跳过通知方式（关联的告警规则不存在）`);
        continue;
      }

      // 检查是否已存在相同的通知方式
      const existing = await db.select()
        .from(notificationMethods)
        .where(eq(notificationMethods.alertRuleId, method.alertRuleId))
        .where(eq(notificationMethods.methodType, method.methodType))
        .limit(1);

      if (existing.length === 0) {
        console.log(`   ✨ 插入通知方式: ${method.methodType} - ${method.alertRuleId}`);
        await db.insert(notificationMethods).values(method);
        insertedNotificationMethods++;
      } else {
        console.log(`   ℹ️ 通知方式已存在: ${method.methodType}`);
      }
    }
    console.log(`   ✅ 通知方式初始化完成，共插入 ${insertedNotificationMethods} 个方式`);

    console.log('\n🎉 意图配置和告警规则数据初始化完成！');
    console.log('\n数据统计:');
    console.log(`  - 意图配置: ${intentConfigsData.length}`);
    console.log(`  - 告警规则: ${alertRulesData.length}`);
    console.log(`  - 通知方式: ${insertedNotificationMethods}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 数据初始化失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行初始化
seedIntentAndAlertData();
