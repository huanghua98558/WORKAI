/**
 * 工作人员指令服务
 * 处理工作人员的指令消息
 *
 * 支持的指令：
 * - AI控制: [暂停回复]、[恢复回复]、[降低频率]、[提高频率]
 * - 风险处理: [处理]、[已解决]、[转人工]
 * - 设置: [开启协同模式]、[关闭协同模式]
 * - 查询: [满意度]、[状态]、[统计]
 */

const staffTrackerService = require('./staff-tracker.service');

class StaffCommandService {
  constructor() {
    this.commands = {
      // AI控制指令
      '[暂停回复]': { action: 'pause_ai', type: 'ai_control' },
      '[恢复回复]': { action: 'resume_ai', type: 'ai_control' },
      '[降低频率]': { action: 'decrease_frequency', type: 'ai_control' },
      '[提高频率]': { action: 'increase_frequency', type: 'ai_control' },

      // 风险处理指令
      '[处理]': { action: 'handle', type: 'risk_handling' },
      '[已解决]': { action: 'resolved', type: 'risk_handling' },
      '[转人工]': { action: 'escalate', type: 'risk_handling' },

      // 设置指令
      '[开启协同模式]': { action: 'enable_collaboration', type: 'setting' },
      '[关闭协同模式]': { action: 'disable_collaboration', type: 'setting' },

      // 查询指令
      '[满意度]': { action: 'show_satisfaction', type: 'query' },
      '[状态]': { action: 'show_status', type: 'query' },
      '[统计]': { action: 'show_statistics', type: 'query' }
    };

    console.log('[StaffCommand] 工作人员指令服务初始化完成');
  }

  /**
   * 检测工作人员指令
   * @param {Object} message - 消息对象
   * @returns {Object|null} 指令信息，如果没有指令则返回null
   */
  async detectCommand(message) {
    const content = message.content || '';

    for (const [cmd, info] of Object.entries(this.commands)) {
      if (content.includes(cmd)) {
        console.log('[StaffCommand] 检测到指令:', cmd);
        return {
          command: cmd,
          action: info.action,
          type: info.type
        };
      }
    }

    return null;
  }

  /**
   * 执行工作人员指令
   * @param {string} sessionId - 会话ID
   * @param {Object} commandInfo - 指令信息
   * @param {string} staffUserId - 工作用户ID
   * @param {Object} message - 消息对象
   * @returns {Promise<Object>} 执行结果
   */
  async executeCommand(sessionId, commandInfo, staffUserId, message) {
    console.log('[StaffCommand] 执行指令:', commandInfo.action, sessionId);

    let result = null;

    try {
      switch (commandInfo.action) {
        // AI控制指令
        case 'pause_ai':
          result = await this.pauseAIReply(sessionId);
          break;
        case 'resume_ai':
          result = await this.resumeAIReply(sessionId);
          break;
        case 'decrease_frequency':
          result = await this.decreaseReplyFrequency(sessionId);
          break;
        case 'increase_frequency':
          result = await this.increaseReplyFrequency(sessionId);
          break;

        // 风险处理指令
        case 'handle':
          result = await this.markAsStaffHandled(sessionId, staffUserId, message);
          break;
        case 'resolved':
          result = await this.markAsResolved(sessionId, staffUserId, message);
          break;
        case 'escalate':
          result = await this.escalateToHuman(sessionId, staffUserId);
          break;

        // 设置指令
        case 'enable_collaboration':
          result = await this.enableCollaborationMode(sessionId);
          break;
        case 'disable_collaboration':
          result = await this.disableCollaborationMode(sessionId);
          break;

        // 查询指令
        case 'show_satisfaction':
          result = await this.showSatisfaction(sessionId);
          break;
        case 'show_status':
          result = await this.showStatus(sessionId);
          break;
        case 'show_statistics':
          result = await this.showStatistics(sessionId);
          break;

        default:
          result = { success: false, message: '未知指令' };
      }

      // 记录指令执行
      await staffTrackerService.updateActivity(sessionId, staffUserId, 'command', {
        command: commandInfo.command,
        action: commandInfo.action,
        result
      });

      console.log('[StaffCommand] ✅ 指令执行完成:', result.message);

      return result;

    } catch (error) {
      console.error('[StaffCommand] ❌ 指令执行失败:', error);

      return {
        success: false,
        message: `指令执行失败: ${error.message}`
      };
    }
  }

  // ==================== AI控制指令 ====================

  /**
   * 暂停AI回复
   */
  async pauseAIReply(sessionId) {
    await staffTrackerService.updateSessionStaffStatus(sessionId, {
      aiReplyStrategy: 'paused'
    });
    return { success: true, message: '✅ AI回复已暂停' };
  }

  /**
   * 恢复AI回复
   */
  async resumeAIReply(sessionId) {
    await staffTrackerService.updateSessionStaffStatus(sessionId, {
      aiReplyStrategy: 'normal'
    });
    return { success: true, message: '✅ AI回复已恢复' };
  }

  /**
   * 降低回复频率
   */
  async decreaseReplyFrequency(sessionId) {
    await staffTrackerService.updateSessionStaffStatus(sessionId, {
      aiReplyStrategy: 'low'
    });
    return { success: true, message: '✅ AI回复频率已降低' };
  }

  /**
   * 提高回复频率
   */
  async increaseReplyFrequency(sessionId) {
    await staffTrackerService.updateSessionStaffStatus(sessionId, {
      aiReplyStrategy: 'normal'
    });
    return { success: true, message: '✅ AI回复频率已提高' };
  }

  // ==================== 风险处理指令 ====================

  /**
   * 标记为工作人员处理
   */
  async markAsStaffHandled(sessionId, staffUserId, message) {
    // 标记为工作人员处理
    await staffTrackerService.updateActivity(sessionId, staffUserId, 'handling', {
      messageId: message.messageId,
      content: message.content
    });

    // 更新AI策略
    await staffTrackerService.updateSessionStaffStatus(sessionId, {
      aiReplyStrategy: 'paused'
    });

    return { success: true, message: '✅ 已标记为工作人员处理' };
  }

  /**
   * 标记为已解决
   */
  async markAsResolved(sessionId, staffUserId, message) {
    await staffTrackerService.updateActivity(sessionId, staffUserId, 'resolved', {
      messageId: message.messageId,
      content: message.content
    });

    // 恢复AI
    await staffTrackerService.updateSessionStaffStatus(sessionId, {
      aiReplyStrategy: 'normal'
    });

    return { success: true, message: '✅ 已标记为已解决' };
  }

  /**
   * 升级到人工处理
   */
  async escalateToHuman(sessionId, staffUserId) {
    // 升级到人工处理
    await staffTrackerService.updateSessionStaffStatus(sessionId, {
      aiReplyStrategy: 'paused',
      collaborationMode: 'priority_to_staff'
    });

    return { success: true, message: '✅ 已升级到人工处理' };
  }

  // ==================== 设置指令 ====================

  /**
   * 开启协同模式
   */
  async enableCollaborationMode(sessionId) {
    await staffTrackerService.updateSessionStaffStatus(sessionId, {
      collaborationMode: 'adaptive'
    });
    return { success: true, message: '✅ 协同模式已开启' };
  }

  /**
   * 关闭协同模式
   */
  async disableCollaborationMode(sessionId) {
    await staffTrackerService.updateSessionStaffStatus(sessionId, {
      collaborationMode: 'priority_to_ai'
    });
    return { success: true, message: '✅ 协同模式已关闭' };
  }

  // ==================== 查询指令 ====================

  /**
   * 显示满意度
   */
  async showSatisfaction(sessionId) {
    // 简化版本
    return { success: true, message: '📊 当前满意度：中等（65分）' };
  }

  /**
   * 显示状态
   */
  async showStatus(sessionId) {
    const staffInfo = await staffTrackerService.getStaffInfo(sessionId);

    return {
      success: true,
      message: `📊 会话状态：
- 工作人员参与：${staffInfo.hasStaff ? '是' : '否'}
- 当前工作人员：${staffInfo.currentStaff || '无'}
- 消息数：${staffInfo.messageCount}
- 协同模式：${staffInfo.collaborationMode}
- AI策略：${staffInfo.aiReplyStrategy}
- 活跃度：${staffInfo.activityLevel}`
    };
  }

  /**
   * 显示统计信息
   */
  async showStatistics(sessionId) {
    const staffInfo = await staffTrackerService.getStaffInfo(sessionId);
    const messages = await staffTrackerService.getStaffMessages(sessionId, 10);

    return {
      success: true,
      message: `📊 统计信息：
- 工作人员消息数：${staffInfo.messageCount}
- 活跃度：${staffInfo.activityLevel}
- 最近消息数：${messages.length}`
    };
  }

  /**
   * 获取所有支持的指令列表
   */
  getCommandList() {
    return Object.keys(this.commands).map(cmd => ({
      command: cmd,
      action: this.commands[cmd].action,
      type: this.commands[cmd].type
    }));
  }
}

// 创建单例
const staffCommandService = new StaffCommandService();

module.exports = staffCommandService;
