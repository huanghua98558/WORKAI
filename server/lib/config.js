/**
 * 配置管理工具
 * 支持热更新
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = path.join(__dirname, '../config/system.json');
    this.load();
  }

  load() {
    try {
      const data = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(data);
      console.log('✅ 系统配置已加载');
      return this.config;
    } catch (error) {
      console.error('❌ 加载配置失败:', error);
      throw error;
    }
  }

  get(key, defaultValue = null) {
    if (!key) return this.config;
    
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  set(key, value) {
    if (!this.config) this.load();
    
    const keys = key.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
    this.save();
  }

  save() {
    try {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf8'
      );
      console.log('✅ 配置已保存');
    } catch (error) {
      console.error('❌ 保存配置失败:', error);
      throw error;
    }
  }

  reload() {
    return this.load();
  }

  getCallbackBaseUrl() {
    // 1. 优先使用环境变量（推荐用于生产环境）
    if (process.env.CALLBACK_BASE_URL) {
      return process.env.CALLBACK_BASE_URL;
    }
    
    // 2. 使用配置文件
    return this.get('deployment.callbackBaseUrl', 'http://localhost:5001');
  }

  getCallbackUrl(type) {
    const baseUrl = this.getCallbackBaseUrl();
    const paths = {
      message: this.get('callback.message'),
      actionResult: this.get('callback.actionResult'),
      groupQrcode: this.get('callback.groupQrcode'),
      robotStatus: this.get('callback.robotStatus')
    };
    
    return `${baseUrl}${paths[type] || ''}`;
  }

  getAllCallbackUrls() {
    return {
      message: this.getCallbackUrl('message'),
      actionResult: this.getCallbackUrl('actionResult'),
      groupQrcode: this.getCallbackUrl('groupQrcode'),
      robotStatus: this.getCallbackUrl('robotStatus')
    };
  }
}

module.exports = new ConfigManager();
