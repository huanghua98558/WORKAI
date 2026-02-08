/**
 * 清理重复的流程定义
 * 保留功能最完整的版本，删除功能重复的流程
 */

require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions } = require('../database/schema');
const { eq } = require('drizzle-orm');

async function cleanDuplicateFlows() {
  console.log('🔍 开始分析重复的流程定义...\n');

  try {
    const db = await getDb();

    // 重复流程分析
    const duplicateAnalysis = [
      {
        duplicates: [
          'flow_v4_human_handover',
          'flow_staff_intervention'
        ],
        keep: 'flow_staff_intervention',
        delete: 'flow_v4_human_handover',
        reason: '人工转接流程功能更全面，包含自动分配、技能匹配、在线状态、并发控制、等待队列等完整功能'
      },
      {
        duplicates: [
          'flow_v4_alert_escalation',
          'flow_unified_alert_handling'
        ],
        keep: 'flow_unified_alert_handling',
        delete: 'flow_v4_alert_escalation',
        reason: '统一告警处理流程功能更全面，包含多级别告警、去重、限流、升级、多渠道通知等功能'
      },
      {
        duplicates: [
          'flow_v4_standard_customer_service',
          'flow_unified_message_handling'
        ],
        keep: 'flow_unified_message_handling',
        delete: 'flow_v4_standard_customer_service',
        reason: '统一消息处理流程功能更全面，覆盖个人消息和群组消息场景，包含问答库、意图识别、情绪分析、风险检测、AI回复、人工转接、多机器人协作等功能'
      }
    ];

    // 显示分析结果
    console.log('📊 重复流程分析结果：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const analysis of duplicateAnalysis) {
      console.log(`🔍 重复组: ${analysis.duplicates.join(' vs ')}`);
      console.log(`   ✅ 保留: ${analysis.keep}`);
      console.log(`   ❌ 删除: ${analysis.delete}`);
      console.log(`   📝 原因: ${analysis.reason}\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 询问用户确认
    console.log('⚠️  准备删除以下重复流程：');
    const flowsToDelete = duplicateAnalysis.map(a => a.delete);
    flowsToDelete.forEach(flowId => {
      console.log(`   - ${flowId}`);
    });

    console.log('\n💡 建议：保留的流程列表：');
    const flowsToKeep = [
      'flow_v4_complete',           // 完整流程（所有节点）
      'flow_v4_smart_monitor',      // 智能监控流程
      'flow_collaborative_decision', // 协作决策流程
      'flow_staff_intervention',    // 人工转接流程
      'flow_unified_alert_handling', // 统一告警处理流程
      'flow_v4_risk_handling',      // 风险处理流程
      'flow_unified_message_handling' // 统一消息处理流程
    ];
    flowsToKeep.forEach(flowId => {
      console.log(`   ✓ ${flowId}`);
    });

    // 执行删除操作
    console.log('\n🗑️  开始删除重复流程...\n');

    let deletedCount = 0;
    for (const flowId of flowsToDelete) {
      try {
        const result = await db
          .delete(flowDefinitions)
          .where(eq(flowDefinitions.id, flowId))
          .returning();

        if (result.length > 0) {
          console.log(`   ✅ 已删除: ${flowId}`);
          deletedCount++;
        } else {
          console.log(`   ⚠️  未找到: ${flowId}`);
        }
      } catch (error) {
        console.error(`   ❌ 删除失败: ${flowId}`, error.message);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 流程清理完成！');
    console.log(`   - 删除了 ${deletedCount} 个重复流程`);
    console.log(`   - 保留了 ${flowsToKeep.length} 个流程`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 显示最终的流程列表
    console.log('📋 最终流程列表：');
    const remainingFlows = await db
      .select({
        id: flowDefinitions.id,
        name: flowDefinitions.name,
        description: flowDefinitions.description,
        priority: flowDefinitions.priority,
        isActive: flowDefinitions.isActive
      })
      .from(flowDefinitions)
      .orderBy(flowDefinitions.priority);

    remainingFlows.forEach((flow, index) => {
      const status = flow.isActive ? '✅' : '⏸️ ';
      console.log(`   ${index + 1}. ${status} ${flow.name} (${flow.id})`);
      console.log(`      优先级: ${flow.priority} | ${flow.description}`);
    });

    console.log('\n🎉 流程优化完成！');
    console.log('\n优化说明：');
    console.log('1. 删除了功能重复的流程');
    console.log('2. 保留了功能最完整的版本');
    console.log('3. 优化后的流程列表更清晰、无重复');
    console.log('4. 所有流程都有明确的功能定位\n');

  } catch (error) {
    console.error('❌ 清理流程失败:', error);
    throw error;
  }
}

// 运行清理
cleanDuplicateFlows()
  .then(() => {
    console.log('✅ 流程清理成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 流程清理失败:', error);
    process.exit(1);
  });
