/**
 * 简单测试：检查 AI 分析历史表是否有数据
 */

const { getDb } = require('coze-coding-dev-sdk');

async function test() {
  try {
    const db = await getDb();

    // 使用原生 SQL 查询检查表是否存在
    console.log('=== 检查表是否存在 ===');
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'robot_ai_analysis_history'
      )
    `);
    console.log(`robot_ai_analysis_history 表存在: ${tableCheck.rows[0].exists}`);

    // 检查表中的记录数
    console.log('\n=== 检查记录数 ===');
    const countResult = await db.query('SELECT COUNT(*) as count FROM robot_ai_analysis_history');
    console.log(`总记录数: ${countResult.rows[0].count}`);

    // 查询最新的几条记录
    if (parseInt(countResult.rows[0].count) > 0) {
      console.log('\n=== 最新的 3 条记录 ===');
      const recentResult = await db.query(`
        SELECT session_id, robot_id, intent, sentiment, analysis_time
        FROM robot_ai_analysis_history
        ORDER BY analysis_time DESC
        LIMIT 3
      `);
      recentResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. Session: ${row.session_id}, Intent: ${row.intent}, Sentiment: ${row.sentiment}, Time: ${row.analysis_time}`);
      });
    }

    console.log('\n=== 测试完成 ===');
    process.exit(0);
  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('\n提示: robot_ai_analysis_history 表可能还没有创建。请运行迁移脚本创建表。');
    }
    process.exit(1);
  }
}

test();
