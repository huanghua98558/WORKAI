/**
 * WorkTool API 服务封装
 * 负责与 WorkTool 官方 API 交互
 */

console.log('[worktool.service.js] Loading WorkToolService...');

const axios = require('axios');
const config = require('../lib/config');
const redisClient = require('../lib/redis');

class WorkToolService {
  constructor() {
    this.apiBaseUrl = config.get('worktool.apiBaseUrl');
    this.apiKey = config.get('worktool.apiKey');
    this.apiSecret = config.get('worktool.apiSecret');
    this.robotId = config.get('worktool.robotId');
    
    this.axios = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    });
  }

  /**
   * 发送文本消息
   */
  async sendTextMessage(toType, toId, content) {
    try {
      const response = await this.axios.post('/api/v1/message/send', {
        robot_id: this.robotId,
        to_type: toType, // group | private
        to_id: toId,
        message_type: 'text',
        content: content
      });
      
      return response.data;
    } catch (error) {
      console.error('发送文本消息失败:', error.message);
      throw error;
    }
  }

  /**
   * 发送图片消息
   */
  async sendImageMessage(toType, toId, mediaUrl) {
    try {
      const response = await this.axios.post('/api/v1/message/send', {
        robot_id: this.robotId,
        to_type: toType,
        to_id: toId,
        message_type: 'image',
        content: mediaUrl
      });
      
      return response.data;
    } catch (error) {
      console.error('发送图片消息失败:', error.message);
      throw error;
    }
  }

  /**
   * 发送卡片消息
   */
  async sendCardMessage(toType, toId, cardData) {
    try {
      const response = await this.axios.post('/api/v1/message/send', {
        robot_id: this.robotId,
        to_type: toType,
        to_id: toId,
        message_type: 'card',
        content: cardData
      });
      
      return response.data;
    } catch (error) {
      console.error('发送卡片消息失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取群信息
   */
  async getGroupInfo(groupId) {
    try {
      const response = await this.axios.get(`/api/v1/group/${groupId}`, {
        params: { robot_id: this.robotId }
      });
      
      return response.data;
    } catch (error) {
      console.error('获取群信息失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取群成员列表
   */
  async getGroupMembers(groupId) {
    try {
      const response = await this.axios.get(`/api/v1/group/${groupId}/members`, {
        params: { robot_id: this.robotId }
      });
      
      return response.data;
    } catch (error) {
      console.error('获取群成员列表失败:', error.message);
      throw error;
    }
  }

  /**
   * 拉人进群
   */
  async addGroupMember(groupId, userIds) {
    try {
      const response = await this.axios.post(`/api/v1/group/${groupId}/members/add`, {
        robot_id: this.robotId,
        user_ids: userIds
      });
      
      return response.data;
    } catch (error) {
      console.error('拉人进群失败:', error.message);
      throw error;
    }
  }

  /**
   * 踢人出群
   */
  async removeGroupMember(groupId, userIds) {
    try {
      const response = await this.axios.post(`/api/v1/group/${groupId}/members/remove`, {
        robot_id: this.robotId,
        user_ids: userIds
      });
      
      return response.data;
    } catch (error) {
      console.error('踢人出群失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建群
   */
  async createGroup(name, userIds) {
    try {
      const response = await this.axios.post('/api/v1/group/create', {
        robot_id: this.robotId,
        group_name: name,
        user_ids: userIds
      });
      
      return response.data;
    } catch (error) {
      console.error('创建群失败:', error.message);
      throw error;
    }
  }

  /**
   * 解散群
   */
  async dissolveGroup(groupId) {
    try {
      const response = await this.axios.post(`/api/v1/group/${groupId}/dissolve`, {
        robot_id: this.robotId
      });
      
      return response.data;
    } catch (error) {
      console.error('解散群失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取群二维码
   */
  async getGroupQrcode(groupId) {
    try {
      const response = await this.axios.get(`/api/v1/group/${groupId}/qrcode`, {
        params: { robot_id: this.robotId }
      });
      
      return response.data;
    } catch (error) {
      console.error('获取群二维码失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userId) {
    try {
      const response = await this.axios.get(`/api/v1/user/${userId}`, {
        params: { robot_id: this.robotId }
      });
      
      return response.data;
    } catch (error) {
      console.error('获取用户信息失败:', error.message);
      throw error;
    }
  }

  /**
   * 设置回调地址
   */
  async setCallbackUrl(callbackUrls) {
    try {
      const response = await this.axios.post('/api/v1/callback/set', {
        robot_id: this.robotId,
        ...callbackUrls
      });
      
      return response.data;
    } catch (error) {
      console.error('设置回调地址失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取机器人状态
   */
  async getRobotStatus() {
    try {
      const response = await this.axios.get(`/api/v1/robot/${this.robotId}/status`);
      return response.data;
    } catch (error) {
      console.error('获取机器人状态失败:', error.message);
      throw error;
    }
  }
}

module.exports = new WorkToolService();
