/**
 * ContextHelper 工具类
 * 
 * 统一管理 Context 数据的访问、验证和更新
 * 解决多机器人环境下 robotId 获取不一致的问题
 */

const { getLogger } = require('./logger');

const logger = getLogger('CONTEXT_HELPER');

class ContextHelper {
  /**
   * 获取机器人 ID
   * 优先级：节点配置 > context.robotId > context.robot.robotId
   * 
   * @param {Object} context - Context 对象
   * @param {Object} node - 节点对象（可选）
   * @returns {string} 机器人 ID
   * @throws {Error} 如果无法获取 robotId
   */
  static getRobotId(context, node) {
    // 优先级 1: 节点配置
    if (node?.data?.robotId) {
      logger.info(`[ContextHelper] robotId 来源: 节点配置 (${node.id})`, {
        robotId: node.data.robotId,
        nodeId: node.id
      });
      return node.data.robotId;
    }
    
    // 优先级 2: Context 顶层
    if (context?.robotId) {
      logger.info('[ContextHelper] robotId 来源: context.robotId', {
        robotId: context.robotId
      });
      return context.robotId;
    }
    
    // 优先级 3: Robot 对象
    if (context?.robot?.robotId) {
      logger.info('[ContextHelper] robotId 来源: context.robot.robotId', {
        robotId: context.robot.robotId
      });
      return context.robot.robotId;
    }
    
    // 所有来源均无效，抛出错误
    const error = new Error('无法获取 robotId：context、context.robot 和 node.data 中均未找到有效 robotId');
    logger.error('[ContextHelper] getRobotId 失败', {
      contextKeys: Object.keys(context || {}),
      hasRobot: !!context?.robot,
      nodeId: node?.id,
      nodeDataKeys: Object.keys(node?.data || {})
    });
    throw error;
  }
  
  /**
   * 获取机器人名称
   * 优先级：节点配置 > context.robotName > context.robot.robotName
   * 
   * @param {Object} context - Context 对象
   * @param {Object} node - 节点对象（可选）
   * @returns {string} 机器人名称
   * @throws {Error} 如果无法获取 robotName
   */
  static getRobotName(context, node) {
    // 优先级 1: 节点配置
    if (node?.data?.robotName) {
      logger.info(`[ContextHelper] robotName 来源: 节点配置 (${node.id})`, {
        robotName: node.data.robotName,
        nodeId: node.id
      });
      return node.data.robotName;
    }
    
    // 优先级 2: Context 顶层
    if (context?.robotName) {
      logger.info('[ContextHelper] robotName 来源: context.robotName', {
        robotName: context.robotName
      });
      return context.robotName;
    }
    
    // 优先级 3: Robot 对象
    if (context?.robot?.robotName) {
      logger.info('[ContextHelper] robotName 来源: context.robot.robotName', {
        robotName: context.robot.robotName
      });
      return context.robot.robotName;
    }
    
    // 如果找不到，返回空字符串或默认值
    logger.warn('[ContextHelper] getRobotName 未找到有效值', {
      contextKeys: Object.keys(context || {}),
      hasRobot: !!context?.robot,
      nodeId: node?.id,
      nodeDataKeys: Object.keys(node?.data || {})
    });
    return 'Unknown Robot';
  }
  
  /**
   * 获取用户消息内容
   * 优先级：context.message.content > context.message.spoken > context.userMessage
   * 
   * @param {Object} context - Context 对象
   * @returns {string} 消息内容
   */
  static getMessageContent(context) {
    if (context?.message?.content) {
      return context.message.content;
    }
    
    if (context?.message?.spoken) {
      return context.message.spoken;
    }
    
    if (context?.userMessage) {
      return context.userMessage;
    }
    
    return '';
  }
  
  /**
   * 获取用户名称
   * 
   * @param {Object} context - Context 对象
   * @returns {string} 用户名称
   */
  static getUserName(context) {
    return context?.userName || 'Unknown User';
  }
  
  /**
   * 获取群组名称
   * 
   * @param {Object} context - Context 对象
   * @returns {string} 群组名称
   */
  static getGroupName(context) {
    return context?.groupName || 'Unknown Group';
  }
  
  /**
   * 获取会话 ID
   * 
   * @param {Object} context - Context 对象
   * @returns {string} 会话 ID
   */
  static getSessionId(context) {
    return context?.sessionId;
  }
  
  /**
   * 获取消息 ID
   * 
   * @param {Object} context - Context 对象
   * @returns {string} 消息 ID
   */
  static getMessageId(context) {
    return context?.messageId;
  }
  
  /**
   * 获取用户 ID
   * 
   * @param {Object} context - Context 对象
   * @returns {string} 用户 ID
   */
  static getUserId(context) {
    return context?.userId;
  }
  
  /**
   * 获取群组 ID
   * 
   * @param {Object} context - Context 对象
   * @returns {string} 群组 ID
   */
  static getGroupId(context) {
    return context?.groupId;
  }
  
  /**
   * 验证 Context 对象是否包含必需字段
   * 
   * @param {Object} context - Context 对象
   * @param {Array<string>} requiredFields - 必需字段数组
   * @returns {Object} { valid: boolean, missing: string[] }
   */
  static validate(context, requiredFields = ['sessionId', 'messageId', 'robotId']) {
    const missing = [];
    
    for (const field of requiredFields) {
      if (!context || context[field] === undefined || context[field] === null) {
        missing.push(field);
      }
    }
    
    const isValid = missing.length === 0;
    
    if (!isValid) {
      logger.warn('[ContextHelper] Context 验证失败', {
        missing,
        contextKeys: Object.keys(context || {})
      });
    }
    
    return { valid: isValid, missing };
  }
  
  /**
   * 安全获取嵌套属性
   * 
   * @param {Object} context - Context 对象
   * @param {string} path - 属性路径（使用点号分隔）
   * @param {*} defaultValue - 默认值（可选）
   * @returns {*} 属性值或默认值
   */
  static safeGet(context, path, defaultValue = null) {
    const keys = path.split('.');
    let value = context;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }
  
  /**
   * 更新 Context 对象
   * 
   * @param {Object} context - Context 对象
   * @param {Object} updates - 更新的字段
   * @returns {Object} 更新后的 Context 对象
   */
  static update(context, updates) {
    return {
      ...context,
      ...updates,
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * 检查 Context 是否包含机器人对象
   * 
   * @param {Object} context - Context 对象
   * @returns {boolean}
   */
  static hasRobotObject(context) {
    return !!(context?.robot && typeof context.robot === 'object');
  }
  
  /**
   * 检查 Context 是否包含消息对象
   * 
   * @param {Object} context - Context 对象
   * @returns {boolean}
   */
  static hasMessageObject(context) {
    return !!(context?.message && typeof context.message === 'object');
  }
  
  /**
   * 检查 Context 是否包含历史对话
   * 
   * @param {Object} context - Context 对象
   * @returns {boolean}
   */
  static hasHistory(context) {
    return !!(context?.history && Array.isArray(context.history));
  }
  
  /**
   * 提取 Context 关键信息用于日志记录
   * 
   * @param {Object} context - Context 对象
   * @returns {Object} 提取的关键信息
   */
  static extractKeyInfo(context) {
    return {
      sessionId: context?.sessionId,
      messageId: context?.messageId,
      robotId: context?.robotId,
      robotName: context?.robotName,
      userName: context?.userName,
      groupName: context?.groupName,
      hasRobot: !!context?.robot,
      hasMessage: !!context?.message,
      hasHistory: this.hasHistory(context),
      lastNodeType: context?.lastNodeType
    };
  }
}

module.exports = ContextHelper;
