/**
 * 导入默认流程定义
 *
 * 用途：
 * 将6个默认流程导入到流程引擎数据库中
 *
 * 运行方式：
 * node server/scripts/import-default-flows.js
 */

const path = require('path');
const fs = require('fs');
const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions } = require('../database/schema');
const { getLogger } = require('../lib/logger');

const logger = getLogger('IMPORT_DEFAULT_FLOWS');

// 默认流程列表
const DEFAULT_FLOWS = [
  {
    file: 'standard-customer-service.json',
    name: '标准客服流程'
  },
  {
    file: 'risk-monitoring.json',
    name: '风险监控流程'
  },
  {
    file: 'alert-escalation.json',
    name: '告警处理流程'
  },
  {
    file: 'group-collaboration.json',
    name: '群组协作流程'
  },
  {
    file: 'data-sync.json',
    name: '数据同步流程'
  },
  {
    file: 'satisfaction-survey.json',
    name: '满意度调查流程'
  }
];

/**
 * 读取流程定义文件
 */
function readFlowDefinition(filename) {
  const filePath = path.join(__dirname, '../flows/default', filename);

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
    .where(flowDefinitions.id === flowId)
    .limit(1);

  return existing.length > 0;
}

/**
 * 导入单个流程
 */
async function importFlow(flowConfig) {
  const db = await getDb();

  try {
    // 读取流程定义
    const flowData = readFlowDefinition(flowConfig.file);

    logger.info(`开始导入流程: ${flowConfig.name}`, { id: flowData.id });

    // 检查是否已存在
    const exists = await flowExists(db, flowData.id);

    if (exists) {
      logger.warn(`流程已存在，跳过导入: ${flowConfig.name}`, { id: flowData.id });
      return {
        success: false,
        skipped: true,
        message: '流程已存在'
      };
    }

    // 添加创建时间
    flowData.createdAt = new Date();
    flowData.updatedAt = new Date();

    // 插入数据库
    await db.insert(flowDefinitions).values(flowData);

    logger.info(`流程导入成功: ${flowConfig.name}`, {
      id: flowData.id,
      nodes: flowData.nodes.length,
      edges: flowData.edges.length
    });

    return {
      success: true,
      message: '导入成功'
    };
  } catch (error) {
    logger.error(`流程导入失败: ${flowConfig.name}`, {
      error: error.message,
      file: flowConfig.file
    });

    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 导入所有默认流程
 */
async function importAllFlows() {
  logger.info('开始导入默认流程定义...');

  const results = [];

  for (const flowConfig of DEFAULT_FLOWS) {
    const result = await importFlow(flowConfig);
    results.push({
      flow: flowConfig.name,
      ...result
    });
  }

  // 统计结果
  const successCount = results.filter(r => r.success).length;
  const skippedCount = results.filter(r => r.skipped).length;
  const failedCount = results.filter(r => !r.success && !r.skipped).length;

  logger.info('默认流程导入完成', {
    total: DEFAULT_FLOWS.length,
    success: successCount,
    skipped: skippedCount,
    failed: failedCount
  });

  // 打印详细结果
  console.log('\n=== 导入结果 ===');
  results.forEach(result => {
    const status = result.success ? '✅' : result.skipped ? '⏭️' : '❌';
    console.log(`${status} ${result.flow}: ${result.message}`);
  });
  console.log('================\n');

  return {
    total: DEFAULT_FLOWS.length,
    success: successCount,
    skipped: skippedCount,
    failed: failedCount,
    results
  };
}

/**
 * 主函数
 */
async function main() {
  try {
    await importAllFlows();
    process.exit(0);
  } catch (error) {
    logger.error('导入默认流程失败', { error: error.message });
    console.error(error);
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
  DEFAULT_FLOWS
};
