/**
 * 测试 aiModels 表查询
 */

const { getDb } = require('coze-coding-dev-sdk');
const { aiModels } = require('../database/schema');
const { eq } = require('drizzle-orm');

async function testAiModelsQuery() {
  try {
    const db = await getDb();

    console.log('测试 1: 查询所有模型');
    const allModels = await db.select().from(aiModels);
    console.log(`✓ 找到 ${allModels.length} 个模型`);
    allModels.forEach(m => {
      console.log(`  - ${m.name}: ${m.displayName}`);
    });

    console.log('\n测试 2: 按名称查询模型');
    const model = await db
      .select()
      .from(aiModels)
      .where(eq(aiModels.name, 'doubao-pro-4k-intent'))
      .limit(1);

    if (model.length > 0) {
      console.log('✓ 找到模型:', model[0]);
    } else {
      console.log('✗ 未找到模型');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

testAiModelsQuery()
  .then(() => {
    console.log('\n✓ 所有测试通过');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 测试执行失败:', error);
    process.exit(1);
  });
