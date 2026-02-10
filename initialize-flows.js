/**
 * WorkTool AI - 初始化 v6.1 流程文件
 * 将新的多任务节点架构流程加载到数据库
 */

const fs = require('fs');
const path = require('path');

// 模拟数据库操作（实际应该使用真实的数据库）
const flowDefinitions = [];

// 流程文件目录
const flowsDir = path.join(__dirname, 'server/flows/default');

// 读取流程文件
function loadFlowFiles() {
  const flowFiles = [
    'v6.1-auto-scheduling-flow.json',
    'v6.1-message-processing-flow.json',
    'v6.1-community-analysis-flow.json'
  ];

  flowFiles.forEach(fileName => {
    const filePath = path.join(process.cwd(), 'server/flows/default', fileName);
    
    if (fs.existsSync(filePath)) {
      const flowData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      flowDefinitions.push(flowData);
      console.log(`✅ 已加载流程: ${flowData.name} (${fileName})`);
    } else {
      console.log(`⚠️  流程文件不存在: ${fileName}`);
    }
  });

  console.log(`\n总计加载 ${flowDefinitions.length} 个流程\n`);

  // 输出流程信息
  flowDefinitions.forEach(flow => {
    console.log(`----------------------------------------`);
    console.log(`流程名称: ${flow.name}`);
    console.log(`流程ID: ${flow.id}`);
    console.log(`节点数量: ${flow.nodes.length}`);
    console.log(`连线数量: ${flow.edges.length}`);
    console.log(`版本: ${flow.version}`);
    console.log(`分类: ${flow.category}`);
    console.log(`标签: ${flow.tags.join(', ')}`);
    console.log(`触发类型: ${flow.triggerType}`);
    console.log(`----------------------------------------\n`);
  });
}

// 主函数
function main() {
  console.log('========================================');
  console.log('WorkTool AI v6.1 - 初始化流程');
  console.log('========================================\n');

  loadFlowFiles();

  console.log('========================================');
  console.log('流程加载完成');
  console.log('========================================\n');
  console.log('注意：这些流程需要通过 API 导入到数据库');
  console.log('API 接口: POST /api/flow-engine/definitions');
}

// 运行
main();
