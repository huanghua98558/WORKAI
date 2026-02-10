/**
 * 测试 AI 分析查询服务
 */

const { getDb } = require('coze-coding-dev-sdk');
const { robotAIAnalysisHistory } = require('./server/database/schema');
const { getLatestAIAnalysis, getBatchLatestAIAnalysis } = require('./server/services/ai-analysis-query.service');

async function test() {
  try {
    const db = await getDb();

    // 1. 检查数据库中是否有 AI 分析记录
    console.log('=== 检查 AI 分析历史表 ===');
    const allRecords = await db.select().from(robotAIAnalysisHistory).limit(5);
    console.log(`总记录数（前5条）: ${allRecords.length}`);

    // 2. 显示最新的几条记录
    console.log('\n=== 最新的记录 ===');
    allRecords.forEach((row, idx) => {
      console.log(`${idx + 1}. Session: ${row.sessionId}, Intent: ${row.intent}, Sentiment: ${row.sentiment}, Time: ${row.analysisTime}`);
    });

    // 3. 测试 getLatestAIAnalysis 服务
    if (allRecords.length > 0) {
      const sessionId = allRecords[0].sessionId;
      console.log(`\n=== 测试 getLatestAIAnalysis (sessionId: ${sessionId}) ===`);
      const analysis = await getLatestAIAnalysis(sessionId);
      console.log('结果:', JSON.stringify(analysis, null, 2));
    }

    // 4. 测试 getBatchLatestAIAnalysis 服务
    if (allRecords.length > 0) {
      const sessionIds = allRecords.map(r => r.sessionId);
      console.log(`\n=== 测试 getBatchLatestAIAnalysis (${sessionIds.length} 个会话) ===`);
      const analysisMap = await getBatchLatestAIAnalysis(sessionIds);
      console.log(`返回 ${analysisMap.size} 条分析记录`);
      analysisMap.forEach((analysis, sessionId) => {
        console.log(`  ${sessionId}: ${analysis.intent} / ${analysis.sentiment}`);
      });
    }

    console.log('\n=== 测试完成 ===');
    process.exit(0);
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

test();
