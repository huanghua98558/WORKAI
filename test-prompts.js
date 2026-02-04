/**
 * AI服务提示词测试脚本
 * 用于验证默认提示词是否正确加载
 */

const DEFAULT_PROMPTS = require('./server/config/default-prompts');

console.log('='.repeat(80));
console.log('AI 服务默认提示词测试');
console.log('='.repeat(80));
console.log();

// 测试每个服务类型的提示词
const serviceTypes = ['intentRecognition', 'serviceReply', 'conversion', 'report'];

serviceTypes.forEach(serviceType => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`服务类型: ${serviceType}`);
  console.log('='.repeat(80));
  console.log();

  const prompt = DEFAULT_PROMPTS[serviceType];

  if (!prompt) {
    console.log('❌ 错误: 未找到提示词');
    return;
  }

  // 检查提示词长度
  const lines = prompt.split('\n');
  const wordCount = prompt.split(/\s+/).length;
  const charCount = prompt.length;

  console.log(`✅ 提示词长度:`);
  console.log(`   - 字符数: ${charCount}`);
  console.log(`   - 词数: ${wordCount}`);
  console.log(`   - 行数: ${lines.length}`);
  console.log();

  // 检查关键内容
  console.log(`📝 内容摘要:`);
  console.log(`   - 前100字符: ${prompt.substring(0, 100)}...`);
  console.log(`   - 后100字符: ...${prompt.substring(prompt.length - 100)}`);
  console.log();

  // 检查特定关键词
  const keywords = {
    intentRecognition: ['意图类型', 'JSON', 'intent', 'needReply', 'needHuman'],
    serviceReply: ['客服', '回复', '表情', '专业', '友好'],
    conversion: ['转化', '目标', '引导', 'CTA', '信任'],
    report: ['报告', '数据分析', '指标', '建议', '洞察']
  };

  const expectedKeywords = keywords[serviceType] || [];
  const foundKeywords = expectedKeywords.filter(keyword => prompt.includes(keyword));

  console.log(`🔍 关键词检查:`);
  expectedKeywords.forEach(keyword => {
    const found = prompt.includes(keyword);
    console.log(`   ${found ? '✅' : '❌'} ${keyword}`);
  });
  console.log();

  // 统计Markdown标记
  const hashCount = (prompt.match(/#+\s/g) || []).length;
  const codeBlockCount = (prompt.match(/```/g) || []).length / 2;
  const listCount = (prompt.match(/^[-*]\s/gm) || []).length;

  console.log(`📊 格式统计:`);
  console.log(`   - 标题 (#): ${hashCount}`);
  console.log(`   - 代码块 (\`\`\`): ${codeBlockCount}`);
  console.log(`   - 列表 (-): ${listCount}`);
  console.log();
});

console.log('\n' + '='.repeat(80));
console.log('✅ 所有提示词测试完成');
console.log('='.repeat(80));
console.log();
console.log('💡 提示词文件位置: server/config/default-prompts.js');
console.log('💡 配置文件位置: server/config/system.json');
console.log('💡 使用文档: PROMPT_GUIDE.md');
console.log();
