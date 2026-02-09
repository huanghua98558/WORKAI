/**
 * 数据验证脚本
 * 用于查询和显示数据库中的模拟数据，验证监控面板的数据源
 */

require('dotenv').config();

const { getDb } = require('coze-coding-dev-sdk');
const {
  robots,
  sessions,
  sessionMessages,
  flowDefinitions,
  ai_io_logs,
  alertHistory,
  execution_tracking,
  systemLogs
} = require('../database/schema');
const { desc, eq } = require('drizzle-orm');

async function main() {
  try {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║           数据验证工具 - 查询模拟数据                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const db = await getDb();
    console.log('✅ 数据库连接成功\n');

    // 1. 查询机器人数据
    console.log('📦 1. 机器人数据');
    console.log('─'.repeat(60));
    const robotsData = await db.select().from(robots);
    console.log(`总数: ${robotsData.length}个`);
    robotsData.forEach(robot => {
      console.log(`  - ${robot.name} (${robot.robotId})`);
      console.log(`    类型: ${robot.robotType} | 分组: ${robot.robotGroup} | 状态: ${robot.status} | 活跃: ${robot.isActive}`);
    });
    console.log('');

    // 2. 查询会话数据
    console.log('💬 2. 会话数据');
    console.log('─'.repeat(60));
    const sessionsData = await db.select().from(sessions).limit(10);
    console.log(`总数: ${sessionsData.length}个 (显示前10个)`);
    sessionsData.forEach(session => {
      console.log(`  - ${session.sessionId}`);
      console.log(`    用户: ${session.userName} (${session.userId})`);
      console.log(`    群组: ${session.groupName} (${session.groupId})`);
      console.log(`    状态: ${session.status} | 消息数: ${session.messageCount} | 意图: ${session.lastIntent}`);
      console.log(`    最后活动: ${session.lastMessageAt || '无'}`);
    });
    console.log('');

    // 3. 会话状态统计
    console.log('📊 3. 会话状态统计');
    console.log('─'.repeat(60));
    const statusCount = await db
      .select({ status: sessions.status })
      .from(sessions);

    const statusSummary = statusCount.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    Object.entries(statusSummary).forEach(([status, count]) => {
      const percentage = ((count / statusCount.length) * 100).toFixed(1);
      console.log(`  ${status}: ${count} (${percentage}%)`);
    });
    console.log('');

    // 4. 查询会话消息
    console.log('📨 4. 会话消息数据');
    console.log('─'.repeat(60));
    const messagesData = await db.select().from(sessionMessages).limit(10);
    console.log(`总数: ${messagesData.length}条 (显示前10条)`);
    messagesData.forEach(msg => {
      console.log(`  - ${msg.id.substring(0, 8)}...`);
      console.log(`    会话: ${msg.sessionId.substring(0, 8)}...`);
      console.log(`    发送者: ${msg.userName} (${msg.fromType})`);
      console.log(`    内容: ${msg.content.substring(0, 30)}...`);
      console.log(`    意图: ${msg.intent} | 时间: ${msg.createdAt}`);
    });
    console.log('');

    // 5. 意图分布统计
    console.log('🎯 5. 意图分布统计');
    console.log('─'.repeat(60));
    const intentCount = await db
      .select({ intent: sessionMessages.intent })
      .from(sessionMessages);

    const intentSummary = intentCount.reduce((acc, curr) => {
      acc[curr.intent] = (acc[curr.intent] || 0) + 1;
      return acc;
    }, {});

    Object.entries(intentSummary).forEach(([intent, count]) => {
      const percentage = ((count / intentCount.length) * 100).toFixed(1);
      console.log(`  ${intent}: ${count} (${percentage}%)`);
    });
    console.log('');

    // 6. 查询流程定义
    console.log('⚙️  6. 流程定义数据');
    console.log('─'.repeat(60));
    const flowData = await db.select().from(flowDefinitions);
    console.log(`总数: ${flowData.length}个`);
    flowData.forEach(flow => {
      let nodes = [];
      try {
        nodes = typeof flow.nodes === 'string' ? JSON.parse(flow.nodes) : flow.nodes;
      } catch (e) {
        nodes = [];
      }
      console.log(`  - ${flow.name} (${flow.id.substring(0, 8)}...)`);
      console.log(`    触发类型: ${flow.triggerType} | 状态: ${flow.isActive ? '活跃' : '非活跃'}`);
      console.log(`    节点数: ${Array.isArray(nodes) ? nodes.length : 0} | 版本: ${flow.version}`);
    });
    console.log('');

    // 7. 查询AI日志（如果表存在）
    try {
      const aiLogsData = await db.select().from(ai_io_logs).limit(10);
      console.log('🤖 7. AI日志数据');
      console.log('─'.repeat(60));
      console.log(`总数: ${aiLogsData.length}条 (显示前10条)`);
      aiLogsData.forEach(log => {
        console.log(`  - ${log.id.substring(0, 8)}...`);
        console.log(`    操作类型: ${log.operationType} | 状态: ${log.status}`);
        console.log(`    Token: ${log.totalTokens} | 响应时间: ${log.responseTime}ms`);
        console.log(`    时间: ${log.createdAt}`);
      });
      console.log('');
    } catch (error) {
      console.log('⚠️  AI日志表不存在或查询失败\n');
    }

    // 8. 查询告警历史（如果表存在）
    try {
      const alertData = await db.select().from(alertHistory).limit(10);
      console.log('🚨 8. 告警历史数据');
      console.log('─'.repeat(60));
      console.log(`总数: ${alertData.length}条 (显示前10条)`);
      alertData.forEach(alert => {
        console.log(`  - ${alert.id.substring(0, 8)}...`);
        console.log(`    级别: ${alert.alertLevel} | 意图: ${alert.intentType} | 状态: ${alert.status}`);
        console.log(`    用户: ${alert.userName} | 群组: ${alert.groupName}`);
        console.log(`    时间: ${alert.createdAt}`);
      });
      console.log('');
    } catch (error) {
      console.log('⚠️  告警历史表不存在或查询失败\n');
    }

    // 9. 查询执行追踪（如果表存在）
    try {
      const executionData = await db.select().from(execution_tracking).limit(10);
      console.log('📋 9. 执行追踪数据');
      console.log('─'.repeat(60));
      console.log(`总数: ${executionData.length}条 (显示前10条)`);
      executionData.forEach(exec => {
        let decision = {};
        try {
          decision = typeof exec.decision === 'string' ? JSON.parse(exec.decision) : exec.decision;
        } catch (e) {
          decision = {};
        }
        console.log(`  - ${exec.id.substring(0, 8)}...`);
        console.log(`    状态: ${exec.status} | 决策: ${decision.action || '无'}`);
        console.log(`    用户: ${exec.userName} | 处理时间: ${exec.processingTime}ms`);
        console.log(`    时间: ${exec.createdAt}`);
      });
      console.log('');
    } catch (error) {
      console.log('⚠️  执行追踪表不存在或查询失败\n');
    }

    // 10. 查询系统日志（如果表存在）
    try {
      const systemLogData = await db.select().from(systemLogs).limit(10);
      console.log('📝 10. 系统日志数据');
      console.log('─'.repeat(60));
      console.log(`总数: ${systemLogData.length}条 (显示前10条)`);
      systemLogData.forEach(log => {
        console.log(`  - ${log.id.substring(0, 8)}...`);
        console.log(`    级别: ${log.level} | 模块: ${log.module}`);
        console.log(`    消息: ${log.message.substring(0, 50)}...`);
        console.log(`    时间: ${log.timestamp}`);
      });
      console.log('');
    } catch (error) {
      console.log('⚠️  系统日志表不存在或查询失败\n');
    }

    // 11. 数据汇总
    console.log('📈 11. 数据汇总');
    console.log('─'.repeat(60));
    console.log('  机器人:        ', robotsData.length, '个');
    console.log('  会话:          ', sessionsData.length, '个');
    console.log('  会话消息:      ', messagesData.length, '条');
    console.log('  流程定义:      ', flowData.length, '个');
    console.log('  AI日志:        ', typeof aiLogsData !== 'undefined' ? aiLogsData.length : 0, '条');
    console.log('  告警历史:      ', typeof alertData !== 'undefined' ? alertData.length : 0, '条');
    console.log('  执行追踪:      ', typeof executionData !== 'undefined' ? executionData.length : 0, '条');
    console.log('  系统日志:      ', typeof systemLogData !== 'undefined' ? systemLogData.length : 0, '条');
    console.log('');

    console.log('✅ 数据验证完成！');
    console.log('💡 请刷新监控面板查看数据\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 数据验证失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('未捕获的错误:', error);
    process.exit(1);
  });
}
