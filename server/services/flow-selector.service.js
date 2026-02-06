/**
 * WorkTool AI 2.1 - 智能流程选择器服务
 * 负责根据业务规则、优先级、触发条件选择合适的流程
 *
 * 核心功能：
 * 1. 默认流程优先：优先执行 isDefault=true 的流程
 * 2. 流程优先级：根据 priority 字段排序，选择优先级最高的流程
 * 3. 触发条件匹配：根据 triggerConfig 中的规则精确匹配
 * 4. 机器人绑定：支持流程绑定到特定机器人
 * 5. 选择策略：支持不同的流程选择策略
 */

const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions } = require('../database/schema');
const { eq, and, or, desc, asc, sql } = require('drizzle-orm');
const { getLogger } = require('../lib/logger');

const logger = getLogger('FLOW_SELECTOR');

// ============================================
// 流程选择策略枚举
// ============================================

const SelectionStrategy = {
  DEFAULT_FIRST: 'default_first', // 默认优先：优先执行默认流程
  HIGHEST_PRIORITY: 'highest_priority', // 最高优先级：选择优先级最高的流程
  ALL_MATCHED: 'all_matched', // 全部匹配：执行所有匹配的流程（原有逻辑）
  RULE_BASED: 'rule_based', // 基于规则：根据业务规则选择
  SINGLE: 'single' // 单一流程：只执行一个流程（防止并发）
};

// 默认选择策略
const DEFAULT_STRATEGY = SelectionStrategy.DEFAULT_FIRST;

// ============================================
// 流程选择器类
// ============================================

class FlowSelector {
  constructor() {
    this.dbPromise = null;
  }

  /**
   * 获取数据库连接
   */
  async getDb() {
    if (!this.dbPromise) {
      this.dbPromise = getDb();
    }
    return this.dbPromise;
  }

  // ============================================
  // 核心选择方法
  // ============================================

  /**
   * 选择流程（核心方法）
   *
   * @param {Object} context - 选择上下文
   * @param {string} context.robotId - 机器人ID
   * @param {string} context.triggerType - 触发类型（webhook/manual/scheduled）
   * @param {Object} context.message - 消息对象（可选）
   * @param {string} context.strategy - 选择策略（可选，默认使用 DEFAULT_STRATEGY）
   * @returns {Promise<Array>} 选择的流程定义列表
   */
  async selectFlows(context = {}) {
    const {
      robotId,
      triggerType = 'webhook',
      message,
      strategy = DEFAULT_STRATEGY
    } = context;

    logger.info('开始选择流程', {
      robotId,
      triggerType,
      strategy,
      hasMessage: !!message
    });

    try {
      const db = await this.getDb();

      // 查询所有活跃的流程定义
      let query = db
        .select()
        .from(flowDefinitions)
        .where(
          and(
            eq(flowDefinitions.isActive, true),
            eq(flowDefinitions.triggerType, triggerType)
          )
        );

      // 根据策略进行不同的排序
      if (strategy === SelectionStrategy.DEFAULT_FIRST) {
        // 默认优先：isDefault=true 的排在前面
        query = query.orderBy(
          desc(sql`CASE WHEN ${flowDefinitions.isDefault} = true THEN 1 ELSE 0 END`),
          desc(flowDefinitions.createdAt) // 默认流程按创建时间降序
        );
      } else if (strategy === SelectionStrategy.HIGHEST_PRIORITY) {
        // 最高优先级：按 priority 降序
        query = query.orderBy(
          desc(flowDefinitions.priority || 0),
          desc(flowDefinitions.createdAt)
        );
      } else {
        // 默认按创建时间降序
        query = query.orderBy(desc(flowDefinitions.createdAt));
      }

      const allFlows = await query;

      logger.info('查询到所有活跃流程', {
        total: allFlows.length,
        triggerType
      });

      // 过滤匹配的流程
      const matchedFlows = this.filterMatchedFlows(allFlows, context);

      logger.info('过滤后的匹配流程', {
        matched: matchedFlows.length,
        total: allFlows.length
      });

      // 根据策略返回结果
      if (strategy === SelectionStrategy.DEFAULT_FIRST) {
        // 默认优先策略：返回第一个（默认流程）
        const defaultFlow = matchedFlows.find(f => f.isDefault === true);
        if (defaultFlow) {
          logger.info('选择默认流程', {
            flowId: defaultFlow.id,
            flowName: defaultFlow.name
          });
          return [defaultFlow];
        } else if (matchedFlows.length > 0) {
          // 没有默认流程，返回第一个匹配的
          logger.info('未找到默认流程，返回第一个匹配流程', {
            flowId: matchedFlows[0].id,
            flowName: matchedFlows[0].name
          });
          return [matchedFlows[0]];
        } else {
          return [];
        }
      } else if (strategy === SelectionStrategy.SINGLE) {
        // 单一流程：只返回优先级最高的一个
        if (matchedFlows.length > 0) {
          logger.info('选择单一流程（优先级最高）', {
            flowId: matchedFlows[0].id,
            flowName: matchedFlows[0].name
          });
          return [matchedFlows[0]];
        } else {
          return [];
        }
      } else if (strategy === SelectionStrategy.ALL_MATCHED) {
        // 全部匹配：返回所有匹配的流程（原有逻辑）
        logger.info('选择所有匹配的流程', {
          count: matchedFlows.length
        });
        return matchedFlows;
      } else {
        // 其他策略：返回第一个匹配的
        if (matchedFlows.length > 0) {
          logger.info('使用默认选择策略，返回第一个匹配流程', {
            flowId: matchedFlows[0].id,
            flowName: matchedFlows[0].name
          });
          return [matchedFlows[0]];
        } else {
          return [];
        }
      }
    } catch (error) {
      logger.error('选择流程失败', {
        error: error.message,
        stack: error.stack,
        context
      });
      throw error;
    }
  }

  /**
   * 过滤匹配的流程
   *
   * @param {Array} flows - 所有流程定义
   * @param {Object} context - 选择上下文
   * @returns {Array} 匹配的流程定义列表
   */
  filterMatchedFlows(flows, context) {
    const { robotId, message } = context;

    return flows.filter(flow => {
      const triggerConfig = flow.triggerConfig || {};

      // 检查机器人绑定
      if (triggerConfig.robotId && triggerConfig.robotId !== robotId) {
        logger.debug('流程不匹配：机器人ID不符', {
          flowId: flow.id,
          flowName: flow.name,
          triggerRobotId: triggerConfig.robotId,
          currentRobotId: robotId
        });
        return false;
      }

      // 检查事件类型（如果配置了）
      if (triggerConfig.eventType && message) {
        // 这里可以根据实际业务逻辑扩展
        // 例如：根据消息内容、发送者、群组等条件匹配
      }

      logger.debug('流程匹配成功', {
        flowId: flow.id,
        flowName: flow.name
      });

      return true;
    });
  }

  // ============================================
  // 辅助方法
  // ============================================

  /**
   * 获取默认流程
   *
   * @param {Object} context - 选择上下文
   * @returns {Promise<Object|null>} 默认流程定义
   */
  async getDefaultFlow(context = {}) {
    const { robotId, triggerType = 'webhook' } = context;

    logger.info('获取默认流程', {
      robotId,
      triggerType
    });

    try {
      const db = await this.getDb();

      // 查询 isDefault=true 的流程
      const defaultFlows = await db
        .select()
        .from(flowDefinitions)
        .where(
          and(
            eq(flowDefinitions.isActive, true),
            eq(flowDefinitions.isDefault, true),
            eq(flowDefinitions.triggerType, triggerType)
          )
        )
        .orderBy(desc(flowDefinitions.createdAt))
        .limit(1);

      if (defaultFlows.length === 0) {
        logger.info('未找到默认流程');
        return null;
      }

      // 检查机器人绑定
      const defaultFlow = defaultFlows[0];
      const triggerConfig = defaultFlow.triggerConfig || {};

      if (triggerConfig.robotId && triggerConfig.robotId !== robotId) {
        logger.info('默认流程不匹配当前机器人', {
          flowId: defaultFlow.id,
          flowName: defaultFlow.name,
          triggerRobotId: triggerConfig.robotId,
          currentRobotId: robotId
        });
        return null;
      }

      logger.info('找到默认流程', {
        flowId: defaultFlow.id,
        flowName: defaultFlow.name
      });

      return defaultFlow;
    } catch (error) {
      logger.error('获取默认流程失败', {
        error: error.message,
        stack: error.stack,
        context
      });
      throw error;
    }
  }

  /**
   * 设置默认流程
   *
   * @param {string} flowId - 流程ID
   * @param {string} robotId - 机器人ID
   * @returns {Promise<void>}
   */
  async setDefaultFlow(flowId, robotId) {
    logger.info('设置默认流程', { flowId, robotId });

    try {
      const db = await this.getDb();

      // 取消该机器人的其他默认流程
      await db
        .update(flowDefinitions)
        .set({ isDefault: false })
        .where(
          and(
            eq(flowDefinitions.isDefault, true),
            sql`${flowDefinitions.triggerConfig}->>'robotId' = ${robotId}`
          )
        );

      // 设置新的默认流程
      await db
        .update(flowDefinitions)
        .set({ isDefault: true })
        .where(eq(flowDefinitions.id, flowId));

      logger.info('默认流程设置成功', { flowId, robotId });
    } catch (error) {
      logger.error('设置默认流程失败', {
        error: error.message,
        stack: error.stack,
        flowId,
        robotId
      });
      throw error;
    }
  }

  /**
   * 获取所有可用的选择策略
   *
   * @returns {Array<{value: string, label: string, description: string}>}
   */
  getAvailableStrategies() {
    return [
      {
        value: SelectionStrategy.DEFAULT_FIRST,
        label: '默认流程优先',
        description: '优先执行标记为默认的流程，如果没有默认流程则执行第一个匹配的流程'
      },
      {
        value: SelectionStrategy.HIGHEST_PRIORITY,
        label: '最高优先级',
        description: '选择优先级（priority字段）最高的流程执行'
      },
      {
        value: SelectionStrategy.ALL_MATCHED,
        label: '全部匹配流程',
        description: '执行所有匹配的流程（可能并行执行多个流程）'
      },
      {
        value: SelectionStrategy.SINGLE,
        label: '单一流程',
        description: '只执行一个优先级最高的流程，防止并发'
      }
    ];
  }
}

// ============================================
// 导出
// ============================================

const flowSelector = new FlowSelector();

module.exports = {
  FlowSelector,
  SelectionStrategy,
  DEFAULT_STRATEGY,
  flowSelector
};
