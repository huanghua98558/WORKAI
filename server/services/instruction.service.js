/**
 * 指令识别服务
 * 负责识别和处理 WorkTool 机器人指令
 *
 * 支持的指令类型：
 * - 转发指令：消息到XXX、转发上一条消息到XXX、转发下一条消息到XXX
 * - 建群指令：创建外部群、立窝、解散群
 * - @触发指令：@机器人名 + 内容
 */

const worktoolService = require('./worktool.service');
const config = require('../lib/config');

class InstructionService {
  constructor() {
    // 转发指令正则表达式
    this.forwardPatterns = [
      // 匹配：消息到XXX
      /^消息到(.+)$/,
      // 匹配：转发消息到XXX
      /^转发消息到(.+)$/,
      // 匹配：转发上一条消息到XXX
      /^转发上一条消息到(.+)$/,
      // 匹配：转发下一条消息到XXX
      /^转发下一条消息到(.+)$/,
      // 匹配：消息到XXX，转发上一条消息到XXX
      /^消息到(.+?)，转发上一条消息到(.+)$/,
      // 匹配：消息到XXX，转发下一条消息到XXX
      /^消息到(.+?)，转发下一条消息到(.+)$/,
      // 匹配：消息到XXX，转发消息到XXX
      /^消息到(.+?)，转发消息到(.+)$/
    ];

    // 建群指令正则表达式
    this.groupPatterns = [
      // 匹配：创建外部群
      /^创建外部群$/,
      // 匹配：立窝
      /^立窝$/,
      // 匹配：解散群XXX
      /^解散群(.+)$/
    ];

    // @触发指令正则表达式
    this.atPatterns = [
      // 匹配：@机器人名
      /^@(.+)$/i
    ];
  }

  /**
   * 识别指令
   * @param {string} message - 用户消息
   * @param {Object} context - 上下文信息
   * @returns {Object} 指令识别结果
   */
  recognizeInstruction(message, context = {}) {
    const result = {
      type: null,
      params: {},
      matched: false
    };

    // 1. 检查转发指令
    for (const pattern of this.forwardPatterns) {
      const match = message.match(pattern);
      if (match) {
        result.type = 'forward';
        result.matched = true;
        
        // 解析转发参数
        if (match.length === 2) {
          // 简单转发：消息到XXX
          result.params.target = match[1].trim();
          result.params.forwardType = 'current';
        } else if (match.length === 3) {
          // 组合转发：消息到XXX，转发上一条消息到XXX
          result.params.source = match[1].trim();
          result.params.target = match[2].trim();
          
          if (message.includes('上一条')) {
            result.params.forwardType = 'previous';
          } else if (message.includes('下一条')) {
            result.params.forwardType = 'next';
          } else {
            result.params.forwardType = 'current';
          }
        }
        
        return result;
      }
    }

    // 2. 检查建群指令
    for (const pattern of this.groupPatterns) {
      const match = message.match(pattern);
      if (match) {
        result.type = 'group';
        result.matched = true;
        
        if (match[0] === '创建外部群' || match[0] === '立窝') {
          result.params.action = 'create';
        } else if (message.includes('解散群')) {
          result.params.action = 'dissolve';
          result.params.groupName = match[1].trim();
        }
        
        return result;
      }
    }

    // 3. 检查@触发指令
    if (context.atMe) {
      const atMatch = message.match(/^@(.+)$/i);
      if (atMatch) {
        result.type = 'at_trigger';
        result.matched = true;
        result.params.atName = atMatch[1].trim();
        result.params.content = message;
        return result;
      }
    }

    return result;
  }

  /**
   * 执行转发指令
   * @param {Object} instruction - 指令对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 执行结果
   */
  async executeForwardInstruction(instruction, context) {
    try {
      const { params } = instruction;
      const { groupName, message, roomType } = context;

      // 判断来源类型
      const sourceReceiverType = worktoolService.getReceiverType(roomType);
      const sourceReceiver = groupName;

      // 判断目标类型
      let targetReceiverType = 'group';
      let targetReceiver = params.target;

      // 简单判断：如果目标看起来像用户名，则认为是私聊
      if (!params.target.includes('群') && params.target.length < 20) {
        targetReceiverType = 'user';
      }

      // 执行转发
      const result = await worktoolService.forwardMessage({
        sourceMessageId: message.messageId || '',
        sourceReceiverType,
        sourceReceiver,
        forwardType: params.forwardType,
        targetReceiverType,
        targetReceiver
      });

      return {
        success: result.success,
        message: result.success ? '转发成功' : result.message,
        result
      };
    } catch (error) {
      console.error('执行转发指令失败:', error);
      return {
        success: false,
        message: `转发失败: ${error.message}`
      };
    }
  }

  /**
   * 执行建群指令
   * @param {Object} instruction - 指令对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 执行结果
   */
  async executeGroupInstruction(instruction, context) {
    try {
      const { params } = instruction;

      if (params.action === 'create') {
        // 创建外部群
        const result = await worktoolService.createExternalGroup({
          groupName: `客户交流群-${Date.now()}`,
          memberList: [],
          groupRemark: 'WorkTool 机器人自动创建'
        });

        return {
          success: result.success,
          message: result.success ? '创建外部群成功' : result.message,
          result
        };
      } else if (params.action === 'dissolve') {
        // 解散群
        const result = await worktoolService.dissolveGroup(params.groupName);

        return {
          success: result.success,
          message: result.success ? '解散群成功' : result.message,
          result
        };
      }

      return {
        success: false,
        message: '未知的建群指令'
      };
    } catch (error) {
      console.error('执行建群指令失败:', error);
      return {
        success: false,
        message: `建群失败: ${error.message}`
      };
    }
  }

  /**
   * 执行指令
   * @param {string} message - 用户消息
   * @param {Object} context - 上下文信息
   * @returns {Object} 执行结果
   */
  async executeInstruction(message, context) {
    // 识别指令
    const instruction = this.recognizeInstruction(message, context);

    if (!instruction.matched) {
      return {
        matched: false,
        message: '未识别到指令'
      };
    }

    // 根据指令类型执行
    let result;
    switch (instruction.type) {
      case 'forward':
        result = await this.executeForwardInstruction(instruction, context);
        break;
      case 'group':
        result = await this.executeGroupInstruction(instruction, context);
        break;
      case 'at_trigger':
        result = {
          matched: true,
          type: 'at_trigger',
          message: '触发@指令',
          instruction
        };
        break;
      default:
        result = {
          matched: true,
          message: '未知的指令类型'
        };
    }

    return {
      ...result,
      instruction
    };
  }

  /**
   * 判断是否需要回复（针对@触发指令）
   * @param {Object} instruction - 指令对象
   * @returns {boolean}
   */
  shouldReply(instruction) {
    return instruction.type === 'at_trigger' || instruction.type === 'forward';
  }
}

module.exports = new InstructionService();
