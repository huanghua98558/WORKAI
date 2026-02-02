/**
 * WorkTool API 服务封装
 * 负责与 WorkTool 官方 API 交互
 *
 * 官方文档: https://doc.worktool.ymdyes.cn/
 * Base URL: https://api.worktool.ymdyes.cn/wework/
 * 认证方式: robotId (Query 参数)
 */

console.log('[worktool.service.js] Loading WorkToolService...');

const axios = require('axios');
const config = require('../lib/config');
const redisClient = require('../lib/redis');

class WorkToolService {
  constructor() {
    // 从配置读取 WorkTool API 配置
    this.apiBaseUrl = config.get('worktool.apiBaseUrl') || 'https://api.worktool.ymdyes.cn/wework/';
    this.robotId = config.get('worktool.robotId') || 'worktool1';

    // 创建 axios 实例
    this.axios = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 构建请求 URL（自动添加 robotId 参数）
   */
  buildUrl(endpoint) {
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${endpoint}${separator}robotId=${this.robotId}`;
  }

  /**
   * 发送请求到 WorkTool API
   */
  async sendRequest(endpoint, data) {
    try {
      const url = this.buildUrl(endpoint);
      const response = await this.axios.post(url, data);

      // WorkTool API 响应格式: { code, message, data }
      if (response.data.code === 0) {
        return { success: true, data: response.data.data, message: response.data.message };
      } else {
        return { success: false, code: response.data.code, message: response.data.message };
      }
    } catch (error) {
      console.error('WorkTool API 请求失败:', error.message);
      throw error;
    }
  }

  /**
   * 发送文本消息 (type: 206)
   *
   * @param {string} receiverType - 接收者类型: "user"(私聊) 或 "group"(群聊)
   * @param {string} receiver - 接收者: 私聊填昵称/用户ID，群聊填群名或备注名
   * @param {string} content - 消息内容（长度≤2000字）
   * @param {string} messageTitle - 消息标题（仅群聊生效，可选）
   */
  async sendTextMessage(receiverType, receiver, content, messageTitle = '') {
    const data = {
      socketType: 2,
      list: [{
        type: 206,
        receiverType,
        receiver,
        content,
        ...(messageTitle && { messageTitle })
      }]
    };

    return await this.sendRequest('sendRawMessage', data);
  }

  /**
   * 修改群信息 (type: 207)
   * 支持修改群名、群公告、群备注、拉人、踢人等
   *
   * @param {Object} options - 群信息配置
   * @param {string} options.groupName - 目标群名（改过备注则用备注名）
   * @param {string} options.newGroupName - 新群名（可选）
   * @param {string} options.newGroupAnnouncement - 新群公告（可选）
   * @param {string} options.groupRemark - 群备注（可选）
   * @param {string} options.groupTemplate - 群模板名称（可选）
   * @param {string[]} options.selectList - 待添加成员列表（可选）
   * @param {boolean} options.showMessageHistory - 拉人是否附带历史消息（可选）
   * @param {string[]} options.removeList - 待移除成员列表（可选）
   */
  async modifyGroupInfo(options) {
    const {
      groupName,
      newGroupName,
      newGroupAnnouncement,
      groupRemark,
      groupTemplate,
      selectList,
      showMessageHistory,
      removeList
    } = options;

    const data = {
      socketType: 2,
      list: [{
        type: 207,
        groupName,
        ...(newGroupName && { newGroupName }),
        ...(newGroupAnnouncement && { newGroupAnnouncement }),
        ...(groupRemark && { groupRemark }),
        ...(groupTemplate && { groupTemplate }),
        ...(selectList && { selectList }),
        ...(showMessageHistory !== undefined && { showMessageHistory }),
        ...(removeList && { removeList })
      }]
    };

    return await this.sendRequest('sendRawMessage', data);
  }

  /**
   * 转发消息 (type: 208)
   *
   * @param {Object} options - 转发配置
   * @param {string} options.sourceMessageId - 原消息唯一ID
   * @param {string} options.sourceReceiverType - 原消息来源类型: "user" 或 "group"
   * @param {string} options.sourceReceiver - 原消息来源标识
   * @param {string} options.forwardType - 转发类型: "current"(当前) / "previous"(上一条) / "next"(下一条)
   * @param {string} options.targetReceiverType - 目标接收者类型: "user" 或 "group"
   * @param {string} options.targetReceiver - 目标接收者标识
   */
  async forwardMessage(options) {
    const {
      sourceMessageId,
      sourceReceiverType,
      sourceReceiver,
      forwardType,
      targetReceiverType,
      targetReceiver
    } = options;

    const data = {
      socketType: 2,
      list: [{
        type: 208,
        sourceMessageId,
        sourceReceiverType,
        sourceReceiver,
        forwardType,
        targetReceiverType,
        targetReceiver
      }]
    };

    return await this.sendRequest('sendRawMessage', data);
  }

  /**
   * 创建外部群 (type: 209)
   *
   * @param {Object} options - 群创建配置
   * @param {string} options.groupName - 群名（长度≤30字）
   * @param {string[]} options.memberList - 初始成员列表（可选，最多200人）
   * @param {string} options.groupTemplate - 群模板名称（可选）
   * @param {string} options.groupRemark - 群备注（可选）
   */
  async createExternalGroup(options) {
    const {
      groupName,
      memberList,
      groupTemplate,
      groupRemark
    } = options;

    const data = {
      socketType: 2,
      list: [{
        type: 209,
        groupType: 'external',
        groupName,
        ...(memberList && { memberList }),
        ...(groupTemplate && { groupTemplate }),
        ...(groupRemark && { groupRemark })
      }]
    };

    return await this.sendRequest('sendRawMessage', data);
  }

  /**
   * 解散群 (type: 210)
   *
   * @param {string} groupName - 群名（改过备注则用备注名）
   * @param {string} groupType - 群类型: "external"(外部群) 或 "internal"(内部群)，默认external
   */
  async dissolveGroup(groupName, groupType = 'external') {
    const data = {
      socketType: 2,
      list: [{
        type: 210,
        groupName,
        groupType
      }]
    };

    return await this.sendRequest('sendRawMessage', data);
  }

  /**
   * 获取机器人状态
   */
  async getRobotStatus() {
    try {
      const url = this.buildUrl('getRobotStatus');
      const response = await this.axios.get(url);
      
      return response.data;
    } catch (error) {
      console.error('获取机器人状态失败:', error.message);
      throw error;
    }
  }

  /**
   * 根据消息上下文判断接收者类型
   * @param {string} roomType - 房间类型（1=外部群 2=外部联系人 3=内部群 4=内部联系人）
   * @returns {string} "user" 或 "group"
   */
  getReceiverType(roomType) {
    // 1=外部群, 3=内部群 -> group
    // 2=外部联系人, 4=内部联系人 -> user
    return ['1', '3'].includes(String(roomType)) ? 'group' : 'user';
  }
}

module.exports = new WorkToolService();
