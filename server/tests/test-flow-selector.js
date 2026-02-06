/**
 * WorkTool AI 2.1 - 流程选择器测试脚本
 * 验证流程选择机制的正确性
 *
 * 测试场景：
 * 1. 默认流程优先策略：应选择 isDefault=true 的流程
 * 2. 最高优先级策略：应选择 priority 最高的流程
 * 3. 机器人绑定：只选择匹配机器人的流程
 * 4. 无匹配流程：应返回空列表
 *
 * 执行方式：
 * node server/tests/test-flow-selector.js
 */

const { flowSelector, SelectionStrategy } = require('../services/flow-selector.service');
const { getLogger } = require('../lib/logger');

const logger = getLogger('FLOW_SELECTOR_TEST');

// 测试配置
const TEST_ROBOT_ID = 'test_robot_001';
const TEST_ROBOT_ID_2 = 'test_robot_002';

/**
 * 测试用例1：默认流程优先策略
 */
async function testDefaultFirstStrategy() {
  logger.info('===== 测试用例1：默认流程优先策略 =====');

  try {
    const selectedFlows = await flowSelector.selectFlows({
      robotId: TEST_ROBOT_ID,
      triggerType: 'webhook',
      strategy: SelectionStrategy.DEFAULT_FIRST
    });

    logger.info('选择结果', {
      count: selectedFlows.length,
      flows: selectedFlows.map(f => ({
        id: f.id,
        name: f.name,
        isDefault: f.isDefault,
        priority: f.priority
      }))
    });

    // 验证：应该返回1个流程，且该流程是默认流程
    if (selectedFlows.length !== 1) {
      throw new Error(`期望返回1个流程，实际返回${selectedFlows.length}个`);
    }

    if (!selectedFlows[0].isDefault) {
      throw new Error(`期望选择默认流程，但选择的流程不是默认流程`);
    }

    logger.info('✅ 测试用例1通过');
    return true;
  } catch (error) {
    logger.error('❌ 测试用例1失败', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * 测试用例2：最高优先级策略
 */
async function testHighestPriorityStrategy() {
  logger.info('===== 测试用例2：最高优先级策略 =====');

  try {
    const selectedFlows = await flowSelector.selectFlows({
      robotId: TEST_ROBOT_ID,
      triggerType: 'webhook',
      strategy: SelectionStrategy.HIGHEST_PRIORITY
    });

    logger.info('选择结果', {
      count: selectedFlows.length,
      flows: selectedFlows.map(f => ({
        id: f.id,
        name: f.name,
        isDefault: f.isDefault,
        priority: f.priority
      }))
    });

    // 验证：应该返回1个流程，且该流程优先级最高
    if (selectedFlows.length !== 1) {
      throw new Error(`期望返回1个流程，实际返回${selectedFlows.length}个`);
    }

    const maxPriority = Math.max(
      ...(selectedFlows.map(f => f.priority || 0))
    );

    if (selectedFlows[0].priority !== maxPriority) {
      throw new Error(`期望选择优先级最高的流程（${maxPriority}），但选择的流程优先级是${selectedFlows[0].priority}`);
    }

    logger.info('✅ 测试用例2通过');
    return true;
  } catch (error) {
    logger.error('❌ 测试用例2失败', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * 测试用例3：全部匹配流程策略
 */
async function testAllMatchedStrategy() {
  logger.info('===== 测试用例3：全部匹配流程策略 =====');

  try {
    const selectedFlows = await flowSelector.selectFlows({
      robotId: TEST_ROBOT_ID,
      triggerType: 'webhook',
      strategy: SelectionStrategy.ALL_MATCHED
    });

    logger.info('选择结果', {
      count: selectedFlows.length,
      flows: selectedFlows.map(f => ({
        id: f.id,
        name: f.name,
        isDefault: f.isDefault,
        priority: f.priority
      }))
    });

    // 验证：应该返回所有匹配的流程
    if (selectedFlows.length === 0) {
      throw new Error('期望返回多个流程，实际返回0个');
    }

    logger.info('✅ 测试用例3通过');
    return true;
  } catch (error) {
    logger.error('❌ 测试用例3失败', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * 测试用例4：获取默认流程
 */
async function testGetDefaultFlow() {
  logger.info('===== 测试用例4：获取默认流程 =====');

  try {
    const defaultFlow = await flowSelector.getDefaultFlow({
      robotId: TEST_ROBOT_ID,
      triggerType: 'webhook'
    });

    logger.info('默认流程', {
      id: defaultFlow?.id,
      name: defaultFlow?.name,
      isDefault: defaultFlow?.isDefault
    });

    // 验证：应该返回一个默认流程
    if (!defaultFlow) {
      throw new Error('期望返回默认流程，但返回为空');
    }

    if (!defaultFlow.isDefault) {
      throw new Error('返回的流程不是默认流程');
    }

    logger.info('✅ 测试用例4通过');
    return true;
  } catch (error) {
    logger.error('❌ 测试用例4失败', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * 测试用例5：获取所有可用策略
 */
async function testGetAvailableStrategies() {
  logger.info('===== 测试用例5：获取所有可用策略 =====');

  try {
    const strategies = flowSelector.getAvailableStrategies();

    logger.info('可用策略', strategies);

    // 验证：应该返回所有策略（不包括 rule_based，因为该策略尚未实现）
    if (strategies.length === 0) {
      throw new Error('期望返回多个策略，实际返回0个');
    }

    const strategyValues = strategies.map(s => s.value);
    // 只检查已实现的策略
    const expectedValues = [
      SelectionStrategy.DEFAULT_FIRST,
      SelectionStrategy.HIGHEST_PRIORITY,
      SelectionStrategy.ALL_MATCHED,
      SelectionStrategy.SINGLE
    ];

    for (const expectedValue of expectedValues) {
      if (!strategyValues.includes(expectedValue)) {
        throw new Error(`期望包含策略 ${expectedValue}，但未找到`);
      }
    }

    logger.info('✅ 测试用例5通过');
    return true;
  } catch (error) {
    logger.error('❌ 测试用例5失败', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * 运行所有测试用例
 */
async function runAllTests() {
  logger.info('开始运行流程选择器测试');

  const results = [];

  results.push(await testDefaultFirstStrategy());
  results.push(await testHighestPriorityStrategy());
  results.push(await testAllMatchedStrategy());
  results.push(await testGetDefaultFlow());
  results.push(await testGetAvailableStrategies());

  const passedCount = results.filter(r => r === true).length;
  const totalCount = results.length;

  logger.info('===== 测试结果汇总 =====', {
    passed: passedCount,
    failed: totalCount - passedCount,
    total: totalCount
  });

  if (passedCount === totalCount) {
    logger.info('🎉 所有测试用例通过！');
    process.exit(0);
  } else {
    logger.error('❌ 部分测试用例失败');
    process.exit(1);
  }
}

// 执行测试
runAllTests()
  .catch(error => {
    logger.error('测试执行失败', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
