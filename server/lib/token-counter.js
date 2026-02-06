/**
 * Token计数工具
 * 用于准确计算文本的token数量
 */

const { Tiktoken } = require('tiktoken');

// 模型到编码器的映射
const MODEL_TO_ENCODING = {
  // GPT-4
  'gpt-4': 'cl100k_base',
  'gpt-4-0314': 'cl100k_base',
  'gpt-4-32k': 'cl100k_base',
  'gpt-4-32k-0314': 'cl100k_base',
  'gpt-4-0613': 'cl100k_base',
  'gpt-4-32k-0613': 'cl100k_base',
  
  // GPT-3.5
  'gpt-3.5-turbo': 'cl100k_base',
  'gpt-3.5-turbo-0301': 'cl100k_base',
  'gpt-3.5-turbo-0613': 'cl100k_base',
  'gpt-3.5-turbo-16k': 'cl100k_base',
  'gpt-3.5-turbo-16k-0613': 'cl100k_base',
  
  // 豆包 (使用 cl100k_base 作为通用编码器)
  'doubao': 'cl100k_base',
  'doubao-seed-1-8-251228': 'cl100k_base',
  'doubao-seed-1-6-251015': 'cl100k_base',
  'doubao-seed-1-6-flash-250615': 'cl100k_base',
  'doubao-seed-1-6-thinking-250715': 'cl100k_base',
  'doubao-seed-1-6-vision-250815': 'cl100k_base',
  'doubao-seed-1-6-lite-251015': 'cl100k_base',
  'doubao-pro-4k-241515': 'cl100k_base',
  'doubao-pro-32k-241515': 'cl100k_base',
  
  // DeepSeek (使用 cl100k_base)
  'deepseek': 'cl100k_base',
  'deepseek-v3': 'cl100k_base',
  'deepseek-v3-2-251201': 'cl100k_base',
  'deepseek-r1': 'cl100k_base',
  'deepseek-r1-250528': 'cl100k_base',
  
  // Kimi (使用 cl100k_base)
  'kimi': 'cl100k_base',
  'kimi-k2-250905': 'cl100k_base',
  'moonshot-v1-128k': 'cl100k_base',
  
  // 默认使用 cl100k_base
  'default': 'cl100k_base'
};

// 缓存编码器实例
const encoderCache = new Map();

/**
 * 获取编码器实例
 * @param {string} modelName - 模型名称
 * @returns {Tiktoken} 编码器实例
 */
function getEncoder(modelName = 'default') {
  const encodingName = MODEL_TO_ENCODING[modelName] || MODEL_TO_ENCODING['default'];
  
  // 检查缓存
  if (encoderCache.has(encodingName)) {
    return encoderCache.get(encodingName);
  }
  
  // 创建新的编码器
  const encoder = new Tiktoken(encodingName);
  encoderCache.set(encodingName, encoder);
  
  return encoder;
}

/**
 * 计算文本的token数量
 * @param {string} text - 要计算的文本
 * @param {string} modelName - 模型名称
 * @returns {number} token数量
 */
function countTokens(text, modelName = 'default') {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  
  try {
    const encoder = getEncoder(modelName);
    const tokens = encoder.encode(text);
    return tokens.length;
  } catch (error) {
    console.error('Token计算失败:', error);
    // 如果token计算失败，使用字符数作为fallback
    return Math.ceil(text.length / 4); // 大约每个token对应4个字符
  }
}

/**
 * 计算消息数组的token数量
 * @param {Array} messages - 消息数组 [{role: 'user', content: '...'}, ...]
 * @param {string} modelName - 模型名称
 * @returns {number} 总token数量
 */
function countMessageTokens(messages, modelName = 'default') {
  if (!Array.isArray(messages)) {
    return 0;
  }
  
  let totalTokens = 0;
  
  // 每条消息的开销（通常每条消息有4个token的元数据）
  const tokensPerMessage = 4;
  
  for (const message of messages) {
    // 角色和名称的token数
    if (message.role) {
      totalTokens += countTokens(message.role, modelName);
    }
    if (message.name) {
      totalTokens += countTokens(message.name, modelName);
    }
    
    // 内容的token数
    if (message.content) {
      if (typeof message.content === 'string') {
        totalTokens += countTokens(message.content, modelName);
      } else if (Array.isArray(message.content)) {
        // 多模态消息（包含图片、视频等）
        for (const part of message.content) {
          if (part.type === 'text' && part.text) {
            totalTokens += countTokens(part.text, modelName);
          }
          // 图片和视频的token数通常有固定值，这里简化处理
          if (part.type === 'image_url' || part.type === 'video_url') {
            totalTokens += 85; // OpenAI中一张图片大约85个token
          }
        }
      }
    }
    
    // 每条消息的开销
    totalTokens += tokensPerMessage;
  }
  
  return totalTokens;
}

/**
 * 从API响应中提取真实的token使用情况
 * @param {Object} response - API响应
 * @returns {Object} token使用情况
 */
function extractUsageFromResponse(response) {
  const usage = response.usage || {};
  
  return {
    inputTokens: usage.inputTokens || usage.prompt_tokens || 0,
    outputTokens: usage.outputTokens || usage.completion_tokens || 0,
    totalTokens: usage.totalTokens || usage.total_tokens || 0
  };
}

/**
 * 清理缓存（用于测试或内存管理）
 */
function clearCache() {
  for (const encoder of encoderCache.values()) {
    encoder.free();
  }
  encoderCache.clear();
}

module.exports = {
  countTokens,
  countMessageTokens,
  extractUsageFromResponse,
  getEncoder,
  clearCache
};
