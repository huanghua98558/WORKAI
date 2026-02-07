/**
 * 阿里云OSS服务
 * 负责文件上传到阿里云OSS
 */

const OSS = require('ali-oss');
const logger = require('./system-logger.service');

class OSSService {
  constructor() {
    this.client = null;
    this.bucket = process.env.ALIYUN_OSS_BUCKET;
    this.region = process.env.ALIYUN_OSS_REGION;
    this.accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID;
    this.accessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
    this.endpoint = process.env.ALIYUN_OSS_ENDPOINT;

    this.init();
  }

  /**
   * 初始化OSS客户端
   */
  init() {
    try {
      if (!this.accessKeyId || !this.accessKeySecret || !this.bucket) {
        logger.warn('OSS', '阿里云OSS配置不完整，部分功能可能不可用', {
          hasAccessKeyId: !!this.accessKeyId,
          hasAccessKeySecret: !!this.accessKeySecret,
          hasBucket: !!this.bucket,
          hasRegion: !!this.region
        });
        return;
      }

      this.client = new OSS({
        region: this.region,
        accessKeyId: this.accessKeyId,
        accessKeySecret: this.accessKeySecret,
        bucket: this.bucket,
        endpoint: this.endpoint
      });

      logger.info('OSS', 'OSS客户端初始化成功', {
        bucket: this.bucket,
        region: this.region,
        endpoint: this.endpoint
      });
    } catch (error) {
      logger.error('OSS', 'OSS客户端初始化失败', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * 检查OSS是否可用
   */
  isAvailable() {
    return this.client !== null;
  }

  /**
   * 上传文件到OSS
   * @param {string} localPath - 本地文件路径
   * @param {string} objectName - OSS对象名称（可选，默认使用文件名）
   * @param {string} folder - 文件夹名称（可选，如：'qrcode'）
   * @returns {Promise<Object>} { success, url, objectName, error }
   */
  async uploadFile(localPath, objectName = null, folder = null) {
    const startTime = Date.now();

    try {
      if (!this.isAvailable()) {
        throw new Error('OSS客户端未初始化');
      }

      // 如果未指定objectName，使用文件名
      if (!objectName) {
        const path = require('path');
        objectName = path.basename(localPath);
      }

      // 添加文件夹前缀
      if (folder) {
        objectName = `${folder}/${objectName}`;
      }

      logger.info('OSS', '开始上传文件', {
        localPath,
        objectName,
        folder,
        timestamp: new Date().toISOString()
      });

      // 上传文件
      const result = await this.client.put(objectName, localPath);

      const processingTime = Date.now() - startTime;

      logger.info('OSS', '文件上传成功', {
        objectName,
        url: result.url,
        processingTime,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        url: result.url,
        objectName: result.name,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('OSS', '文件上传失败', {
        localPath,
        objectName,
        folder,
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
        stack: error.stack,
        processingTime,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        processingTime
      };
    }
  }

  /**
   * 上传Base64图片到OSS
   * @param {string} base64Data - Base64图片数据
   * @param {string} objectName - OSS对象名称
   * @param {string} folder - 文件夹名称（可选）
   * @returns {Promise<Object>} { success, url, objectName, error }
   */
  async uploadBase64Image(base64Data, objectName, folder = null) {
    const startTime = Date.now();

    try {
      if (!this.isAvailable()) {
        throw new Error('OSS客户端未初始化');
      }

      // 移除Base64前缀（如：data:image/png;base64,）
      const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Content, 'base64');

      // 添加文件夹前缀
      if (folder) {
        objectName = `${folder}/${objectName}`;
      }

      logger.info('OSS', '开始上传Base64图片', {
        objectName,
        folder,
        bufferSize: buffer.length,
        timestamp: new Date().toISOString()
      });

      // 上传文件
      const result = await this.client.put(objectName, buffer);

      const processingTime = Date.now() - startTime;

      logger.info('OSS', 'Base64图片上传成功', {
        objectName,
        url: result.url,
        bufferSize: buffer.length,
        processingTime,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        url: result.url,
        objectName: result.name,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('OSS', 'Base64图片上传失败', {
        objectName,
        folder,
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
        stack: error.stack,
        processingTime,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        processingTime
      };
    }
  }

  /**
   * 删除OSS文件
   * @param {string} objectName - OSS对象名称
   * @returns {Promise<Object>} { success, error }
   */
  async deleteFile(objectName) {
    const startTime = Date.now();

    try {
      if (!this.isAvailable()) {
        throw new Error('OSS客户端未初始化');
      }

      logger.info('OSS', '开始删除文件', {
        objectName,
        timestamp: new Date().toISOString()
      });

      await this.client.delete(objectName);

      const processingTime = Date.now() - startTime;

      logger.info('OSS', '文件删除成功', {
        objectName,
        processingTime,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('OSS', '文件删除失败', {
        objectName,
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
        stack: error.stack,
        processingTime,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        processingTime
      };
    }
  }

  /**
   * 获取文件访问URL
   * @param {string} objectName - OSS对象名称
   * @param {number} expires - 过期时间（秒），默认3600秒（1小时）
   * @returns {Promise<string>} 签名URL
   */
  async getSignedUrl(objectName, expires = 3600) {
    try {
      if (!this.isAvailable()) {
        throw new Error('OSS客户端未初始化');
      }

      const url = this.client.signatureUrl(objectName, { expires });

      logger.info('OSS', '生成签名URL成功', {
        objectName,
        expires,
        timestamp: new Date().toISOString()
      });

      return url;
    } catch (error) {
      logger.error('OSS', '生成签名URL失败', {
        objectName,
        expires,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * 批量删除文件
   * @param {string[]} objectNames - OSS对象名称数组
   * @returns {Promise<Object>} { success, deleted, failed, errors }
   */
  async deleteMultipleFiles(objectNames) {
    try {
      if (!this.isAvailable()) {
        throw new Error('OSS客户端未初始化');
      }

      logger.info('OSS', '开始批量删除文件', {
        count: objectNames.length,
        timestamp: new Date().toISOString()
      });

      const result = await this.client.deleteMulti(objectNames);

      logger.info('OSS', '批量删除完成', {
        deleted: result.deleted,
        failed: result.failed,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        deleted: result.deleted,
        failed: result.failed
      };
    } catch (error) {
      logger.error('OSS', '批量删除失败', {
        count: objectNames.length,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: error.message,
        deleted: [],
        failed: objectNames
      };
    }
  }
}

module.exports = new OSSService();
