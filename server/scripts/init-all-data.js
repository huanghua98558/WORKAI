#!/usr/bin/env node
/**
 * 统一数据初始化脚本
 * 在部署时自动初始化所有必要的种子数据
 * 包括：AI模型/提供商/角色、意图配置、告警规则、流程定义等
 */

require('dotenv').config();

async function runAllSeedScripts() {
  console.log('🚀 开始执行数据初始化...\n');

  try {
    const scripts = [
      { 
        name: 'AI模块数据', 
        file: './seed-ai-data.js', 
        functionName: 'seedData'
      },
      { 
        name: '意图配置和告警规则', 
        file: './seed-intent-alert.js', 
        functionName: 'seedIntentAndAlertData'
      },
      { 
        name: '默认流程定义', 
        file: './import-default-flows.js', 
        functionName: 'importAllFlows'
      }
    ];

    for (const script of scripts) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📋 执行脚本: ${script.name}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      try {
        // 动态导入并执行脚本
        const seedModule = require(script.file);
        
        // 获取初始化函数
        const initFunction = seedModule[script.functionName];
        
        if (typeof initFunction !== 'function') {
          throw new Error(`未找到函数: ${script.functionName}`);
        }

        // 执行初始化函数
        await initFunction();

        console.log(`✅ ${script.name} 初始化完成`);
      } catch (error) {
        // 检查是否是"已存在"类型的错误
        const errorMessage = error.message || '';
        
        // 如果是致命错误（如数据库连接失败），抛出异常
        if (errorMessage.includes('ECONNREFUSED') || 
            errorMessage.includes('Connection') ||
            errorMessage.includes('connect')) {
          console.error(`❌ 数据库连接失败: ${errorMessage}`);
          throw error;
        }
        
        // 如果是"已存在"类型的错误，继续执行
        if (errorMessage.includes('已存在') || 
            errorMessage.includes('already exists') ||
            errorMessage.includes('duplicate')) {
          console.log(`⚠️  ${script.name}: 数据已存在，跳过初始化`);
        } else {
          console.error(`❌ ${script.name} 初始化失败:`, error.message);
          console.error('   但将继续执行其他脚本...');
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 所有数据初始化脚本执行完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 数据初始化过程发生严重错误:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllSeedScripts();
}

module.exports = { runAllSeedScripts };
