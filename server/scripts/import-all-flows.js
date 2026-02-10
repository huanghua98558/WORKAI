/**
 * 导入所有流程定义
 *
 * 用途：
 * 将 server/flows/default/ 目录下的所有流程导入到数据库中
 *
 * 运行方式：
 * node server/scripts/import-all-flows.js
 */

const path = require('path');
const fs = require('fs');
const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions } = require('../database/schema');
const { eq } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

const logger = getLogger('IMPORT_ALL_FLOWS');

// 流程文件目录
const FLOWS_DIR = path.join(__dirname, '../flows/default');

// 排除的文件
const EXCLUDE_FILES = [
  'README.md',
  '更新总结.md',
  '流程路由机制说明.md'
];

/**
 * 获取所有流程文件
 */
function getFlowFiles() {
  const files = fs.readdirSync(FLOWS_DIR);
  return files
    .filter(file => file.endsWith('.json'))
    .filter(file => !EXCLUDE_FILES.includes(file));
}

/**
 * 读取流程定义文件
 */
function readFlowDefinition(filename) {
  const filePath = path.join(FLOWS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`流程文件不存在: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContent);
}

/**
 * 检查流程是否已存在
 */
async function flowExists(db, flowId) {
  const existing = await db
    .select()
    .from(flowDefinitions)
    .where(eq(flowDefinitions.id, flowId))
    .limit(1);

  return existing.length > 0;
}

/**
 * 导入单个流程
 */
async function importFlow(filename, options = {}) {
  const db = await getDb();
  const { overwrite = false } = options;

  try {
    // 读取流程定义
    const flowData = readFlowDefinition(filename);

    const flowName = flowData.name || path.basename(filename, '.json');
    logger.info(`开始导入流程: ${flowName}`, { id: flowData.id, filename });

    // 检查是否已存在
    const exists = await flowExists(db, flowData.id);

    if (exists && !overwrite) {
      logger.info(`流程已存在，跳过: ${flowName}`, { id: flowData.id });
      return {
        success: true,
        skipped: true,
        message: '流程已存在，跳过导入',
        flowName,
        flowId: flowData.id
      };
    }

    if (exists && overwrite) {
      logger.warn(`流程已存在，覆盖更新: ${flowName}`, { id: flowData.id });
      await db.delete(flowDefinitions).where(eq(flowDefinitions.id, flowData.id));
    }

    // 确保必需字段存在
    if (!flowData.version) {
      flowData.version = '1.0';
    }
    if (!flowData.isActive) {
      flowData.isActive = true;
    }
    if (!flowData.triggerType) {
      flowData.triggerType = 'webhook';
    }

    // 添加创建/更新时间
    flowData.createdAt = new Date();
    flowData.updatedAt = new Date();

    // 插入数据库
    await db.insert(flowDefinitions).values(flowData);

    logger.info(`流程导入成功: ${flowName}`, {
      id: flowData.id,
      nodes: flowData.nodes?.length || 0,
      edges: flowData.edges?.length || 0
    });

    return {
      success: true,
      message: '导入成功',
      flowName,
      flowId: flowData.id,
      nodes: flowData.nodes?.length || 0,
      edges: flowData.edges?.length || 0
    };
  } catch (error) {
    logger.error(`流程导入失败: ${filename}`, {
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      message: error.message,
      filename,
      error: error.message
    };
  }
}

/**
 * 导入所有流程
 */
async function importAllFlows(options = {}) {
  const { overwrite = false } = options;

  logger.info('开始导入所有流程定义...', { overwrite });

  const flowFiles = getFlowFiles();
  logger.info(`找到 ${flowFiles.length} 个流程文件`, {
    files: flowFiles
  });

  const results = [];

  for (const filename of flowFiles) {
    const result = await importFlow(filename, { overwrite });
    results.push(result);
  }

  // 统计结果
  const successCount = results.filter(r => r.success && !r.skipped).length;
  const skippedCount = results.filter(r => r.skipped).length;
  const failedCount = results.filter(r => !r.success).length;

  logger.info('所有流程导入完成', {
    total: flowFiles.length,
    success: successCount,
    skipped: skippedCount,
    failed: failedCount
  });

  // 打印详细结果
  console.log('\n=== 流程导入结果 ===');
  results.forEach(result => {
    if (result.skipped) {
      console.log(`⏭️  ${result.flowName} (${result.filename}): ${result.message}`);
    } else if (result.success) {
      console.log(`✅ ${result.flowName} (${result.filename}): ${result.message} [${result.nodes} 节点, ${result.edges} 边]`);
    } else {
      console.log(`❌ ${result.filename}: ${result.message}`);
    }
  });
  console.log('==================\n');

  return {
    total: flowFiles.length,
    success: successCount,
    skipped: skippedCount,
    failed: failedCount,
    results
  };
}

/**
 * 主函数（仅当直接运行此脚本时执行）
 */
async function main() {
  const args = process.argv.slice(2);
  const overwrite = args.includes('--overwrite') || args.includes('-o');

  try {
    const result = await importAllFlows({ overwrite });
    console.log('✅ 流程导入完成');
    console.log(`  - 总数: ${result.total}`);
    console.log(`  - 成功: ${result.success}`);
    console.log(`  - 跳过: ${result.skipped}`);
    console.log(`  - 失败: ${result.failed}`);
    process.exit(0);
  } catch (error) {
    logger.error('导入流程失败', { error: error.message, stack: error.stack });
    console.error('❌ 导入流程失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，执行导入
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = {
  importFlow,
  importAllFlows,
  getFlowFiles
};
