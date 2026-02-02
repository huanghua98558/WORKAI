/**
 * QA 问答匹配测试脚本（完整版）
 */

const { getDb } = require('coze-coding-dev-sdk');
const { qaDatabase } = require('./database/schema');
const qaService = require('./services/qa.service');

async function testQAMatching() {
  console.log('开始测试 QA 问答匹配...\n');

  // 先添加一条模糊匹配的测试数据
  const db = await getDb();
  console.log('添加测试数据...');
  await db.insert(qaDatabase).values({
    keyword: '产品',
    reply: '我们公司提供多种产品，请访问官网查看详情。',
    receiverType: 'all',
    priority: 6,
    isExactMatch: false,
    relatedKeywords: '商品,货物,服务',
    isActive: true
  });
  console.log('✅ 测试数据已添加\n');

  // 测试用例
  const testCases = [
    {
      message: '公司地址',
      groupName: '',
      receiverType: 'group',
      expected: '北京市朝阳区XX路XX号XX大厦15层'
    },
    {
      message: '联系电话',
      groupName: '',
      receiverType: 'group',
      expected: '400-123-4567'
    },
    {
      message: '你好',
      groupName: '',
      receiverType: 'group',
      expected: '您好'
    },
    {
      message: '产品',
      groupName: '',
      receiverType: 'group',
      expected: '我们公司提供多种产品'
    },
    {
      message: '商品',
      groupName: '',
      receiverType: 'group',
      expected: '我们公司提供多种产品'
    }
  ];

  for (const testCase of testCases) {
    console.log(`测试消息: "${testCase.message}"`);
    
    const result = await qaService.matchQA(
      testCase.message,
      testCase.groupName,
      testCase.receiverType
    );

    if (result.matched) {
      console.log(`✅ 匹配成功: ${result.reply}`);
      console.log(`   匹配类型: ${result.type}`);
      console.log(`   关键词: ${result.keyword}\n`);
    } else {
      console.log(`❌ 匹配失败: ${result.message}\n`);
    }
  }

  console.log('测试完成！');

  // 清理测试数据
  console.log('\n清理测试数据...');
  await db.delete(qaDatabase).where(eq(qaDatabase.keyword, '产品'));
  console.log('✅ 测试数据已清理');
}

testQAMatching();
