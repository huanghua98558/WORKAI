/**
 * 管理后台 API 路由
 */

const adminApiRoutes = async function (fastify, options) {
  const config = require('../lib/config');
  const monitorService = require('../services/monitor.service');
  const reportService = require('../services/report.service');
  const sessionService = require('../services/session.service');
  const alertService = require('../services/alert.service');
  const tencentDocService = require('../services/tencentdoc.service');
  const aiService = require('../services/ai.service');
  const worktoolService = require('../services/worktool.service');

  // 数据库管理器
  const { userManager, systemSettingManager } = require('../database');

  /**
   * 获取系统配置
   */
  fastify.get('/config', async (request, reply) => {
    const aiConfig = config.get('ai');
    
    const safeConfig = {
      version: config.get('version'),
      systemName: config.get('systemName'),
      callback: config.get('callback'),
      ai: {
        // 内置模型列表
        builtinModels: aiConfig?.builtinModels || [],
        // 意图识别配置
        intentRecognition: aiConfig?.intentRecognition || {
          useBuiltin: true,
          builtinModelId: 'doubao-pro-4k',
          useCustom: false,
          customModel: null
        },
        // 服务回复配置
        serviceReply: aiConfig?.serviceReply || {
          useBuiltin: true,
          builtinModelId: 'doubao-pro-32k',
          useCustom: false,
          customModel: null
        },
        // 闲聊配置
        chat: aiConfig?.chat || {
          useBuiltin: true,
          builtinModelId: 'doubao-pro-4k',
          useCustom: false,
          customModel: null
        },
        // 报告配置
        report: aiConfig?.report || {
          useBuiltin: true,
          builtinModelId: 'doubao-pro-32k',
          useCustom: false,
          customModel: null
        }
      },
      autoReply: config.get('autoReply'),
      monitor: config.get('monitor'),
      alert: {
        rules: config.get('alert.rules')
      },
      humanHandover: config.get('humanHandover'),
      tencentDoc: {
        enabled: config.get('tencentDoc.enabled')
      }
    };

    return { success: true, data: safeConfig };
  });

  /**
   * 更新系统配置
   */
  fastify.post('/config', async (request, reply) => {
    try {
      const updateData = request.body;
      
      // 支持多种更新方式
      if (updateData.ai) {
        // 更新 AI 配置
        Object.keys(updateData.ai).forEach(key => {
          if (config.get(`ai.${key}`) !== undefined) {
            config.set(`ai.${key}`, updateData.ai[key]);
          }
        });
        
        // 重新初始化 AI 服务
        aiService.reinitialize();
      }
      
      if (updateData.autoReply) {
        // 更新自动回复配置
        Object.keys(updateData.autoReply).forEach(key => {
          if (config.get(`autoReply.${key}`) !== undefined) {
            config.set(`autoReply.${key}`, updateData.autoReply[key]);
          }
        });
      }
      
      if (updateData.monitor) {
        // 更新监控配置
        Object.keys(updateData.monitor).forEach(key => {
          if (config.get(`monitor.${key}`) !== undefined) {
            config.set(`monitor.${key}`, updateData.monitor[key]);
          }
        });
      }
      
      if (updateData.deployment) {
        // 更新部署配置
        Object.keys(updateData.deployment).forEach(key => {
          if (config.get(`deployment.${key}`) !== undefined) {
            config.set(`deployment.${key}`, updateData.deployment[key]);
          }
        });
      }
      
      return { success: true, message: '配置已更新' };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取回调地址
   */
  fastify.get('/callbacks', async (request, reply) => {
    // 优先使用 x-backend-url 头（来自前端代理），这是后端的真实地址
    const backendUrl = request.headers['x-backend-url'];
    
    // 其次从环境变量或配置文件获取
    let baseUrl = config.getCallbackBaseUrl();
    
    // 如果存在 backendUrl 头，使用它作为回调基础地址
    if (backendUrl) {
      baseUrl = backendUrl;
    } else {
      // 如果没有 backendUrl，尝试从 x-forwarded-host 获取（生产环境自动检测）
      const forwardedHost = request.headers['x-forwarded-host'];
      const forwardedProto = request.headers['x-forwarded-proto'];
      const host = request.headers['host'];
      
      // 如果存在反向代理头，说明在生产环境
      if (forwardedHost && forwardedProto) {
        const detectedBaseUrl = `${forwardedProto}://${forwardedHost}`;
        
        // 如果检测到的地址与配置不同，自动更新配置
        if (detectedBaseUrl !== baseUrl) {
          console.log(`检测到部署地址变更: ${baseUrl} -> ${detectedBaseUrl}`);
          config.set('deployment.callbackBaseUrl', detectedBaseUrl);
          baseUrl = detectedBaseUrl;
        }
      }
      
      // 如果没有配置 baseUrl 且没有代理头，尝试从 host 获取
      if (!baseUrl) {
        const detectedHost = host || 'localhost:5001';
        const detectedProto = (host && host.includes('localhost')) ? 'http' : 'https';
        baseUrl = `${detectedProto}://${detectedHost}`;
        
        // 更新配置文件
        config.set('deployment.callbackBaseUrl', baseUrl);
      }
    }
    
    return {
      success: true,
      data: {
        baseUrl: baseUrl,
        message: baseUrl + '/api/worktool/callback/message',
        actionResult: baseUrl + '/api/worktool/callback/action-result',
        groupQrcode: baseUrl + '/api/worktool/callback/group-qrcode',
        robotStatus: baseUrl + '/api/worktool/callback/robot-status'
      }
    };
  });

  /**
   * 测试回调
   */
  fastify.post('/callbacks/test', async (request, reply) => {
    const { type, payload } = request.body;

    try {
      const callbacks = config.getAllCallbackUrls();
      const callbackUrl = callbacks[type];

      if (!callbackUrl) {
        return reply.status(400).send({
          success: false,
          error: '未知的回调类型'
        });
      }

      const axios = require('axios');
      const response = await axios.post(callbackUrl, payload || {
        message_id: 'test_' + Date.now(),
        from_type: 'user',
        from_id: 'test_user',
        from_name: '测试用户',
        to_type: 'group',
        to_id: 'test_group',
        content: '这是一个测试消息',
        message_type: 'text',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: '回调测试成功',
        response: response.data
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取监控摘要
   */
  fastify.get('/monitor/summary', async (request, reply) => {
    try {
      const summary = await monitorService.getTodaySummary();
      return { success: true, data: summary };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取群活跃度排行
   */
  fastify.get('/monitor/top-groups', async (request, reply) => {
    const { date, limit = 10 } = request.query;

    try {
      const topGroups = await monitorService.getTopActiveGroups(
        date,
        parseInt(limit)
      );
      return { success: true, data: topGroups };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取用户活跃度排行
   */
  fastify.get('/monitor/top-users', async (request, reply) => {
    const { date, limit = 10 } = request.query;

    try {
      const topUsers = await monitorService.getTopActiveUsers(
        date,
        parseInt(limit)
      );
      return { success: true, data: topUsers };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取活跃会话
   */
  fastify.get('/sessions/active', async (request, reply) => {
    const { limit = 50 } = request.query;

    try {
      const sessions = await sessionService.getActiveSessions(parseInt(limit));
      return { success: true, data: sessions };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 人工接管会话
   */
  fastify.post('/sessions/:sessionId/takeover', async (request, reply) => {
    const { sessionId } = request.params;
    const { operator } = request.body;

    try {
      const session = await sessionService.takeOverByHuman(sessionId, operator);
      return { success: true, data: session };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 切换回自动模式
   */
  fastify.post('/sessions/:sessionId/auto', async (request, reply) => {
    const { sessionId } = request.params;

    try {
      const session = await sessionService.switchToAuto(sessionId);
      return { success: true, data: session };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取日终报告
   */
  fastify.get('/reports/:date', async (request, reply) => {
    const { date } = request.params;

    try {
      const report = await reportService.getReport(date);
      if (!report) {
        return reply.status(404).send({
          success: false,
          error: '报告不存在'
        });
      }
      return { success: true, data: report };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 生成日终报告
   */
  fastify.post('/reports/generate', async (request, reply) => {
    const { date } = request.body;

    try {
      const report = await reportService.generateDailyReport(date);
      return { success: true, data: report };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 导出记录为 CSV
   */
  fastify.get('/reports/:date/export', async (request, reply) => {
    const { date } = request.params;
    const filters = request.query;

    try {
      const csv = await reportService.exportToCSV(date, filters);
      
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="records_${date}.csv"`);
      
      return reply.send(csv);
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 写入报告到腾讯文档
   */
  fastify.post('/reports/:date/tencentdoc', async (request, reply) => {
    const { date } = request.params;

    try {
      const docId = await tencentDocService.writeDailyReport(date);
      return { success: true, data: { docId } };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取告警统计
   */
  fastify.get('/alerts/stats', async (request, reply) => {
    const { days = 7 } = request.query;

    try {
      const stats = await alertService.getAlertStats(parseInt(days));
      return { success: true, data: stats };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取告警历史
   */
  fastify.get('/alerts/history', async (request, reply) => {
    const { limit = 50 } = request.query;

    try {
      const alerts = await alertService.getAlertHistory(parseInt(limit));
      return { success: true, data: alerts };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 手动触发告警检查
   */
  fastify.post('/alerts/check', async (request, reply) => {
    try {
      const results = await alertService.checkAllRules();
      return { success: true, data: results };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 检查熔断状态
   */
  fastify.get('/circuit-breaker/status', async (request, reply) => {
    try {
      const isOpen = await alertService.isCircuitBreakerOpen();
      return { success: true, data: { isOpen } };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 重置熔断器
   */
  fastify.post('/circuit-breaker/reset', async (request, reply) => {
    try {
      await alertService.resetCircuitBreaker();
      return { success: true, message: '熔断器已重置' };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 测试腾讯文档连接
   */
  fastify.post('/tencentdoc/test', async (request, reply) => {
    try {
      const result = await tencentDocService.testConnection();
      return { success: true, data: result };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 健康检查
   */
  fastify.get('/health', async (request, reply) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        redis: 'ok',
        ai: 'ok',
        tencentDoc: config.get('tencentDoc.enabled') ? 'ok' : 'disabled'
      }
    };

    return { success: true, data: health };
  });

  /**
   * 系统信息
   */
  fastify.get('/system/info', async (request, reply) => {
    const info = {
      version: config.get('version'),
      systemName: config.get('systemName'),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version
    };

    return { success: true, data: info };
  });

  /**
   * 获取人工告警配置
   */
  fastify.get('/human-handover/config', async (request, reply) => {
    try {
      console.log('[GET /api/admin/human-handover/config] Loading humanHandoverService...');
      const humanHandoverService = require('../services/human-handover.service');
      console.log('[GET /api/admin/human-handover/config] humanHandoverService loaded:', typeof humanHandoverService);
      console.log('[GET /api/admin/human-handover/config] Getting config...');
      
      const config = humanHandoverService.getConfig();
      console.log('[GET /api/admin/human-handover/config] Config:', JSON.stringify(config));
      
      return { success: true, data: config };
    } catch (error) {
      console.error('[GET /api/admin/human-handover/config] ERROR:', error);
      console.error('[GET /api/admin/human-handover/config] ERROR stack:', error.stack);
      return reply.status(500).send({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  });

  /**
   * 更新人工告警配置
   */
  fastify.post('/human-handover/config', async (request, reply) => {
    try {
      const humanHandoverService = require('../services/human-handover.service');
      
      const result = humanHandoverService.updateConfig(request.body);
      return { success: true, data: result };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 添加告警接收者
   */
  fastify.post('/human-handover/recipients', async (request, reply) => {
    try {
      const humanHandoverService = require('../services/human-handover.service');
      const service = humanHandoverService;
      
      const result = service.addRecipient(request.body);
      
      if (!result.success) {
        return reply.status(400).send(result);
      }
      
      return { success: true, data: result };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 更新告警接收者
   */
  fastify.put('/human-handover/recipients/:id', async (request, reply) => {
    try {
      const humanHandoverService = require('../services/human-handover.service');
      const service = humanHandoverService;
      
      const result = service.updateRecipient(request.params.id, request.body);
      
      if (!result.success) {
        return reply.status(400).send(result);
      }
      
      return { success: true, data: result };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 删除告警接收者
   */
  fastify.delete('/human-handover/recipients/:id', async (request, reply) => {
    try {
      const humanHandoverService = require('../services/human-handover.service');
      const service = humanHandoverService;
      
      const result = service.deleteRecipient(request.params.id);
      
      if (!result.success) {
        return reply.status(400).send(result);
      }
      
      return { success: true, data: result };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 手动发送告警
   */
  fastify.post('/human-handover/alert', async (request, reply) => {
    try {
      const humanHandoverService = require('../services/human-handover.service');
      const service = humanHandoverService;
      
      const result = await service.sendManualAlert(request.body);
      
      if (!result.success) {
        return reply.status(400).send(result);
      }
      
      return { success: true, data: result };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取系统用户列表
   */
  fastify.get('/users', async (request, reply) => {
    try {
      const { skip, limit, filters } = request.query;
      const users = await userManager.getUsers({
        skip: parseInt(skip) || 0,
        limit: parseInt(limit) || 100,
        filters: filters ? JSON.parse(filters) : undefined
      });
      return { success: true, data: users };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 添加系统用户
   */
  fastify.post('/users', async (request, reply) => {
    try {
      const { username, password, role, email, isActive } = request.body;
      
      if (!username || !password || !role) {
        return reply.status(400).send({
          success: false,
          error: '用户名、密码和角色不能为空'
        });
      }
      
      if (!['admin', 'operator'].includes(role)) {
        return reply.status(400).send({
          success: false,
          error: '角色必须是 admin 或 operator'
        });
      }
      
      // 检查用户名是否已存在
      const existingUser = await userManager.getUserByUsername(username);
      if (existingUser) {
        return reply.status(400).send({
          success: false,
          error: '用户名已存在'
        });
      }
      
      // 检查邮箱是否已存在
      if (email) {
        const existingEmail = await userManager.getUserByEmail(email);
        if (existingEmail) {
          return reply.status(400).send({
            success: false,
            error: '邮箱已存在'
          });
        }
      }
      
      const newUser = await userManager.createUser({
        username,
        password, // 实际项目中应该加密存储
        role,
        email: email || null,
        isActive: isActive !== undefined ? isActive : true
      });
      
      return { success: true, data: newUser };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 更新系统用户
   */
  fastify.put('/users/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { password, role, email, isActive } = request.body;
      
      // 检查用户是否存在
      const existingUser = await userManager.getUserById(id);
      if (!existingUser) {
        return reply.status(404).send({
          success: false,
          error: '用户不存在'
        });
      }
      
      // 检查邮箱是否已被其他用户使用
      if (email && email !== existingUser.email) {
        const existingEmail = await userManager.getUserByEmail(email);
        if (existingEmail) {
          return reply.status(400).send({
            success: false,
            error: '邮箱已被其他用户使用'
          });
        }
      }
      
      // 检查角色是否有效
      if (role !== undefined && !['admin', 'operator'].includes(role)) {
        return reply.status(400).send({
          success: false,
          error: '角色必须是 admin 或 operator'
        });
      }
      
      const updateData = {};
      // 只有在 password 存在且非空时才更新密码
      if (password && password.trim()) {
        updateData.password = password;
      }
      if (role !== undefined) {
        updateData.role = role;
      }
      if (email !== undefined) {
        updateData.email = email;
      }
      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }
      
      const updatedUser = await userManager.updateUser(id, updateData);
      
      return { success: true, data: updatedUser };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 删除系统用户
   */
  fastify.delete('/users/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const existingUser = await userManager.getUserById(id);
      if (!existingUser) {
        return reply.status(404).send({
          success: false,
          error: '用户不存在'
        });
      }
      
      const success = await userManager.deleteUser(id);
      
      if (!success) {
        return reply.status(500).send({
          success: false,
          error: '删除用户失败'
        });
      }
      
      return { success: true, data: existingUser };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // ============ 系统设置管理 API ============

  /**
   * 获取系统设置列表
   */
  fastify.get('/settings', async (request, reply) => {
    try {
      const { skip, limit, filters } = request.query;
      const settings = await systemSettingManager.getSettings({
        skip: parseInt(skip) || 0,
        limit: parseInt(limit) || 100,
        filters: filters ? JSON.parse(filters) : undefined
      });
      return { success: true, data: settings };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取系统设置（按 Key）
   */
  fastify.get('/settings/:key', async (request, reply) => {
    try {
      const { key } = request.params;
      const setting = await systemSettingManager.getSettingByKey(key);
      
      if (!setting) {
        return reply.status(404).send({
          success: false,
          error: '设置不存在'
        });
      }
      
      return { success: true, data: setting };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 创建或更新系统设置
   */
  fastify.post('/settings', async (request, reply) => {
    try {
      const { key, value, category, description, updatedBy } = request.body;
      
      if (!key || value === undefined) {
        return reply.status(400).send({
          success: false,
          error: 'key 和 value 不能为空'
        });
      }
      
      const setting = await systemSettingManager.upsertSetting(
        key,
        value,
        category || 'general',
        description,
        updatedBy
      );
      
      return { success: true, data: setting };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 更新系统设置
   */
  fastify.put('/settings/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { value, description, updatedBy } = request.body;
      
      const existingSetting = await systemSettingManager.getSettingById(id);
      if (!existingSetting) {
        return reply.status(404).send({
          success: false,
          error: '设置不存在'
        });
      }
      
      const updatedSetting = await systemSettingManager.updateSetting(id, {
        value: value !== undefined ? value : existingSetting.value,
        description: description !== undefined ? description : existingSetting.description,
        updatedAtBy: updatedBy
      });
      
      return { success: true, data: updatedSetting };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 删除系统设置
   */
  fastify.delete('/settings/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const existingSetting = await systemSettingManager.getSettingById(id);
      if (!existingSetting) {
        return reply.status(404).send({
          success: false,
          error: '设置不存在'
        });
      }
      
      const success = await systemSettingManager.deleteSetting(id);
      
      if (!success) {
        return reply.status(500).send({
          success: false,
          error: '删除设置失败'
        });
      }
      
      return { success: true, data: existingSetting };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 按类别获取设置
   */
  fastify.get('/settings/category/:category', async (request, reply) => {
    try {
      const { category } = request.params;
      const settings = await systemSettingManager.getSettingsByCategory(category);
      return { success: true, data: settings };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
};

module.exports = adminApiRoutes;
