/**
 * QA 问答匹配测试脚本
 */

const qaService = require('./services/qa.service');

async function testQAMatching() {
  console.log('开始测试 QA 问答匹配...\n');

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
      message: '地址',
      groupName: '',
      receiverType: 'group',
      expected: '北京市朝阳区XX路XX号XX大厦15层'
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
}

testQAMatching();
