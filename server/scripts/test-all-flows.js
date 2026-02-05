/**
 * 批量测试所有流程
 */

const { execSync } = require('child_process');

const TEST_SCRIPTS = [
  {
    name: '群组协作流程',
    script: 'test-group-collaboration-flow.js'
  },
  {
    name: '数据同步流程',
    script: 'test-data-sync-flow.js'
  },
  {
    name: '满意度调查流程',
    script: 'test-satisfaction-survey-flow.js'
  }
];

async function runTests() {
  console.log('========================================');
  console.log('批量测试剩余流程');
  console.log('========================================\n');

  const results = [];

  for (const test of TEST_SCRIPTS) {
    console.log(`\n开始测试: ${test.name}`);
    console.log('='.repeat(40));

    try {
      // 检查脚本是否存在
      const fs = require('fs');
      if (!fs.existsSync(`server/scripts/${test.script}`)) {
        console.log(`⚠️  跳过：脚本不存在 (${test.script})`);
        results.push({
          name: test.name,
          status: 'skipped',
          reason: '脚本不存在'
        });
        continue;
      }

      // 运行测试
      execSync(`node server/scripts/${test.script}`, {
        stdio: 'inherit',
        timeout: 30000
      });

      console.log(`\n✅ ${test.name} 测试通过`);
      results.push({
        name: test.name,
        status: 'passed'
      });
    } catch (error) {
      console.log(`\n❌ ${test.name} 测试失败`);
      results.push({
        name: test.name,
        status: 'failed',
        error: error.message
      });
    }
  }

  // 打印汇总结果
  console.log('\n\n========================================');
  console.log('批量测试汇总');
  console.log('========================================\n');

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  results.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
    console.log(`${icon} ${result.name}: ${result.status}`);
    if (result.status === 'skipped') {
      console.log(`   原因: ${result.reason}`);
    }
  });

  console.log(`\n总计: ${results.length}个流程`);
  console.log(`通过: ${passed}个`);
  console.log(`失败: ${failed}个`);
  console.log(`跳过: ${skipped}个`);

  // 如果有失败的，返回非零退出码
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
