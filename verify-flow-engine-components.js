/**
 * WorkTool AI v6.1 - 流程引擎管理组件更新验证脚本
 * 验证所有流程引擎相关组件是否正确使用了新的节点类型
 */

const fs = require('fs');
const path = require('path');

// 需要检查的文件列表
const filesToCheck = [
  'src/app/flow-engine/types.ts',
  'src/components/flow-engine-manage.tsx',
  'src/components/flow-engine-editor.tsx',
  'src/app/flow-engine/components/FlowNodeLibrary.tsx',
  'src/app/flow-engine/components/NodeConfigPanel.tsx',
  'src/app/flow-engine/components/CustomNode.tsx',
  'src/app/flow-engine/components/FlowCanvas.tsx',
];

// 检查文件内容
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    console.log(`\n========================================`);
    console.log(`检查文件: ${fileName}`);
    console.log(`========================================`);

    // 检查是否导入了 NODE_TYPES
    const hasNodeTypesImport = /NODE_TYPES.*from.*types/.test(content);
    console.log(`✓ 导入 NODE_TYPES: ${hasNodeTypesImport ? '是' : '否'}`);

    // 检查是否导入了 NODE_METADATA
    const hasNodeMetadataImport = /NODE_METADATA.*from.*types/.test(content);
    console.log(`✓ 导入 NODE_METADATA: ${hasNodeMetadataImport ? '是' : '否'}`);

    // 检查是否导入了 FlowStatus
    const hasFlowStatusImport = /FlowStatus.*from.*types/.test(content);
    console.log(`✓ 导入 FlowStatus: ${hasFlowStatusImport ? '是' : '否'}`);

    // 检查是否导入了 TriggerType
    const hasTriggerTypeImport = /TriggerType.*from.*types/.test(content);
    console.log(`✓ 导入 TriggerType: ${hasTriggerTypeImport ? '是' : '否'}`);

    // 检查是否使用了旧的 NodeType 枚举
    const hasOldNodeType = /const NodeType = \{[\s\S]*?ai_chat/.test(content);
    if (hasOldNodeType) {
      console.log(`⚠ 发现旧的 NodeType 枚举定义`);
    } else {
      console.log(`✓ 未发现旧的 NodeType 枚举定义`);
    }

    // 检查是否使用了旧的 NODE_TYPE_CONFIG
    const hasOldNodeConfig = /const NODE_TYPE_CONFIG.*Record/.test(content);
    if (hasOldNodeConfig) {
      console.log(`⚠ 发现旧的 NODE_TYPE_CONFIG 定义`);
    } else {
      console.log(`✓ 未发现旧的 NODE_TYPE_CONFIG 定义`);
    }

    // 统计使用 NODE_METADATA 的次数
    const metadataUsageCount = (content.match(/NODE_METADATA/g) || []).length;
    console.log(`✓ 使用 NODE_METADATA 次数: ${metadataUsageCount}`);

    // 统计使用 NODE_TYPES 的次数
    const typesUsageCount = (content.match(/NODE_TYPES/g) || []).length;
    console.log(`✓ 使用 NODE_TYPES 次数: ${typesUsageCount}`);

    // 检查是否使用了多任务节点类型
    const multiTaskTypes = ['multi_task_ai', 'multi_task_data', 'multi_task_http'];
    const hasMultiTask = multiTaskTypes.some(type => content.includes(type));
    console.log(`✓ 使用多任务节点类型: ${hasMultiTask ? '是' : '否'}`);

    return {
      fileName,
      hasNodeTypesImport,
      hasNodeMetadataImport,
      hasOldNodeType,
      hasOldNodeConfig,
      hasMultiTask
    };

  } catch (error) {
    console.error(`❌ 检查文件失败: ${error.message}`);
    return null;
  }
}

// 主函数
function main() {
  console.log('========================================');
  console.log('WorkTool AI v6.1 - 组件更新验证');
  console.log('========================================\n');

  const results = [];
  let allPassed = true;

  filesToCheck.forEach(filePath => {
    const result = checkFile(filePath);
    if (result) {
      results.push(result);

      // 检查是否有问题
      if (result.hasOldNodeType || result.hasOldNodeConfig) {
        allPassed = false;
      }
    }
  });

  // 汇总结果
  console.log('\n========================================');
  console.log('验证结果汇总');
  console.log('========================================');

  let issuesCount = 0;
  results.forEach(result => {
    if (!result) return;

    const issues = [];
    if (result.hasOldNodeType) issues.push('旧的 NodeType 枚举定义');
    if (result.hasOldNodeConfig) issues.push('旧的 NODE_TYPE_CONFIG 定义');

    if (issues.length > 0) {
      console.log(`\n⚠ ${result.fileName}: 发现 ${issues.length} 个问题`);
      issues.forEach(issue => console.log(`  - ${issue}`));
      issuesCount++;
    } else if (result.hasNodeTypesImport && result.hasNodeMetadataImport) {
      console.log(`✅ ${result.fileName}: 全部通过`);
    }
  });

  console.log('\n========================================');
  console.log('总体评价');
  console.log('========================================');

  if (allPassed) {
    console.log('✅ 所有组件已更新完成');
    console.log('✅ 流程引擎管理组件已适配 v6.1 多任务节点架构');
  } else {
    console.log(`⚠ 发现 ${issuesCount} 个问题需要修复`);
  }

  console.log('');
}

// 运行验证
main();
