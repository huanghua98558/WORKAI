/**
 * 腾讯文档服务
 * 负责将数据写入腾讯文档
 */

const axios = require('axios');
const config = require('../lib/config');

class TencentDocService {
  constructor() {
    this.enabled = config.get('tencentDoc.enabled');
    this.apiBaseUrl = config.get('tencentDoc.apiBaseUrl');
    this.appId = config.get('tencentDoc.appId');
    this.appSecret = config.get('tencentDoc.appSecret');
    this.templateDocId = config.get('tencentDoc.templateDocId');
    
    this.accessToken = null;
    this.tokenExpireTime = 0;
  }

  /**
   * 获取访问令牌
   */
  async getAccessToken() {
    if (!this.enabled) {
      throw new Error('腾讯文档功能未启用');
    }

    // 检查 token 是否有效
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${this.apiBaseUrl}/oauth2/access_token`, {
        app_id: this.appId,
        app_secret: this.appSecret,
        grant_type: 'client_credentials'
      });

      this.accessToken = response.data.access_token;
      this.tokenExpireTime = Date.now() + (response.data.expires_in - 300) * 1000; // 提前5分钟过期

      return this.accessToken;
    } catch (error) {
      console.error('获取访问令牌失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建文档
   */
  async createDocument(title, data) {
    if (!this.enabled) {
      console.warn('腾讯文档功能未启用，跳过创建文档');
      return null;
    }

    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.apiBaseUrl}/api/spreadsheet/create`,
        {
          title: title,
          content: this.formatDataToSheet(data)
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ 腾讯文档创建成功:', response.data.doc_id);
      return response.data;
    } catch (error) {
      console.error('创建腾讯文档失败:', error.message);
      throw error;
    }
  }

  /**
   * 写入数据到文档
   */
  async writeData(docId, data, sheetName = 'Sheet1') {
    if (!this.enabled) {
      console.warn('腾讯文档功能未启用，跳过写入数据');
      return null;
    }

    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.apiBaseUrl}/api/spreadsheet/${docId}/write`,
        {
          sheetName,
          data: this.formatDataToSheet(data)
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ 腾讯文档写入成功');
      return response.data;
    } catch (error) {
      console.error('写入腾讯文档失败:', error.message);
      throw error;
    }
  }

  /**
   * 从模板复制文档
   */
  async copyFromTemplate(title) {
    if (!this.enabled || !this.templateDocId) {
      console.warn('腾讯文档功能或模板未配置，跳过复制文档');
      return null;
    }

    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.apiBaseUrl}/api/spreadsheet/${this.templateDocId}/copy`,
        {
          title: title
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ 从模板复制文档成功:', response.data.doc_id);
      return response.data;
    } catch (error) {
      console.error('从模板复制文档失败:', error.message);
      throw error;
    }
  }

  /**
   * 写入日终报告到腾讯文档
   */
  async writeDailyReport(date, reportData) {
    if (!this.enabled) {
      console.log('腾讯文档功能未启用，跳过写入日终报告');
      return null;
    }

    try {
      const title = `社群运营日报 - ${date}`;
      
      // 如果有模板，从模板复制
      let docId;
      if (this.templateDocId) {
        const copyResult = await this.copyFromTemplate(title);
        docId = copyResult.doc_id;
      } else {
        // 否则创建新文档
        const createResult = await this.createDocument(title, []);
        docId = createResult.doc_id;
      }

      // 准备数据
      const sheetData = this.formatReportToSheet(reportData);

      // 写入数据
      await this.writeData(docId, sheetData, '概览');

      console.log(`✅ 日终报告已写入腾讯文档: ${title}`);
      return docId;
    } catch (error) {
      console.error('写入日终报告到腾讯文档失败:', error.message);
      throw error;
    }
  }

  /**
   * 格式化数据为表格格式
   */
  formatDataToSheet(data) {
    if (!data || data.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = Object.keys(data[0]);
    const rows = data.map(item => 
      headers.map(header => String(item[header] || ''))
    );

    return {
      headers,
      rows
    };
  }

  /**
   * 格式化报告数据为表格
   */
  formatReportToSheet(report) {
    // 概览 Sheet
    const overviewData = [
      {
        指标: '日期',
        数值: report.date
      },
      {
        指标: '总记录数',
        数值: report.totalRecords
      },
      {
        指标: 'AI 自动回复',
        数值: report.byStatus.auto
      },
      {
        指标: '人工接管',
        数值: report.byStatus.human
      },
      {
        指标: 'AI 总结',
        数值: report.aiSummary || '无'
      }
    ];

    // 群分布 Sheet
    const groupData = Object.entries(report.byGroup).map(([groupName, info]) => ({
      群名: groupName,
      消息数: info.count
    }));

    // 意图分布 Sheet
    const intentData = Object.entries(report.byIntent).map(([intent, count]) => ({
      意图: intent,
      数量: count
    }));

    return {
      overview: overviewData,
      groups: groupData,
      intents: intentData
    };
  }

  /**
   * 批量写入多个数据集
   */
  async batchWrite(docId, dataSets) {
    if (!this.enabled) {
      console.warn('腾讯文档功能未启用，跳过批量写入');
      return null;
    }

    const accessToken = await this.getAccessToken();
    const results = [];

    for (const [sheetName, data] of Object.entries(dataSets)) {
      try {
        const result = await this.writeData(docId, data, sheetName);
        results.push({ sheetName, success: true, result });
      } catch (error) {
        results.push({ sheetName, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 测试连接
   */
  async testConnection() {
    try {
      const accessToken = await this.getAccessToken();
      console.log('✅ 腾讯文档连接测试成功');
      return {
        success: true,
        message: '连接成功',
        accessToken: `${accessToken.substring(0, 10)}...`
      };
    } catch (error) {
      console.error('❌ 腾讯文档连接测试失败:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new TencentDocService();
