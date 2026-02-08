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

  // 权限钩子
  const { requireAdmin, requireSuperAdmin } = require('../hooks/auth.hook');
  const { getLogger } = require('../lib/logger');
  const logger = getLogger('ADMIN_API');

  // 机器人服务
  const robotService = require('../services/robot.service');
  const permissionService = require('../services/permission.service');
  const { verifyAuth } = require('../hooks/auth.hook');

  /**
   * 获取机器人列表（智能权限判断）
   * - 管理员：可以看到所有机器人
   * - 普通用户：只能看到自己创建或被授权的机器人
   */
  fastify.get('/robots', {
    onRequest: [verifyAuth],
  }, async (request, reply) => {
    try {
      const { isActive, status, search } = request.query;
      const { user } = request;

      logger.info('[ADMIN_ROBOT] 获取机器人列表', {
        userId: user.id,
        role: user.role
      });

      // 检查 robotService 是否存在
      if (!robotService || typeof robotService.getAllRobots !== 'function') {
        logger.error('[ADMIN_ROBOT] robotService 未正确加载');
        return reply.status(500).send({
          code: -1,
          message: '机器人服务未正确加载'
        });
      }

      // 判断用户角色
      const isAdmin = user.role === 'admin' || user.role === 'superAdmin';

      if (isAdmin) {
        // 管理员：返回所有机器人，不进行权限过滤
        logger.info('[ADMIN_ROBOT] 管理员请求，返回所有机器人');
        const robotList = await robotService.getAllRobots({
          isActive,
          status,
          search
        });

        return reply.send({
          code: 0,
          message: 'success',
          data: robotList
        });
      } else {
        // 普通用户：获取用户可访问的机器人列表
        const accessibleRobotIds = await permissionService.getAccessibleRobotIds(user.id);

        logger.info('[ADMIN_ROBOT] 普通用户请求，返回可访问的机器人', {
          userId: user.id,
          accessibleCount: accessibleRobotIds.length
        });

        // 传入 accessibleRobotIds 进行过滤
        const robotList = await robotService.getAllRobots({
          isActive,
          status,
          search,
          accessibleRobotIds
        });

        return reply.send({
          code: 0,
          message: 'success',
          data: robotList
        });
      }
    } catch (error) {
      logger.error('[ADMIN_ROBOT] 获取机器人列表失败', {
        userId: request.user?.id,
        error: error.message,
        stack: error.stack
      });

      return reply.status(500).send({
        code: -1,
        message: '获取机器人列表失败',
        error: error.message
      });
    }
  });

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
        },
        // 转化客服配置
        conversion: aiConfig?.conversion || {
          useBuiltin: true,
          builtinModelId: 'doubao-seed-1-8-251228',
          useCustom: false,
          customModel: null
        },
        // 长期记忆配置
        memory: aiConfig?.memory || {
          enabled: true,
          retentionDays: 30,
          maxContextMessages: 20,
          summaryEnabled: true,
          userProfileEnabled: true,
          rememberUserPreferences: true,
          rememberUserHistory: true,
          rememberUserQuestions: true,
          rememberUserFeedback: true
        }
      },
      autoReply: config.get('autoReply'),
      monitor: config.get('monitor'),
      alert: config.get('alert'),
      humanHandover: config.get('humanHandover'),
      tencentDoc: config.get('tencentDoc'),
      // 流程引擎配置
      flow: config.get('flow') || {
        enabled: false,
        defaultFlowId: null,
        autoSave: true
      },
      // 工作人员识别配置
      staff: config.get('staff') || {
        enabled: false,
        enterpriseNames: [],
        userRemarks: [],
        nicknames: [],
        specialPatterns: [],
        userIds: []
      },
      // 风险处理模式
      riskMode: config.get('riskMode') || 'ai_alert',
      // 通知配置
      notification: config.get('notification') || {
        websocket: true,
        email: false,
        enterpriseWechat: false,
        emailRecipients: [],
        enterpriseWechatWebhook: ''
      }
    };

    return { success: true, data: safeConfig };
  });

  /**
   * 更新系统配置
   */
  fastify.post('/config', async (request, reply) => {
    console.log('📥 POST /api/admin/config 被调用，请求体:', JSON.stringify(request.body));
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

      if (updateData.alert) {
        // 更新告警配置
        Object.keys(updateData.alert).forEach(key => {
          const existing = config.get(`alert.${key}`);
          // 对于嵌套对象（如 alert.recipients），直接更新
          if (existing !== undefined) {
            config.set(`alert.${key}`, updateData.alert[key]);
          }
        });
      }

      if (updateData.tencentDoc) {
        // 更新腾讯文档配置
        Object.keys(updateData.tencentDoc).forEach(key => {
          if (config.get(`tencentDoc.${key}`) !== undefined) {
            config.set(`tencentDoc.${key}`, updateData.tencentDoc[key]);
          }
        });
      }

      if (updateData.flow) {
        // 更新流程引擎配置
        const currentFlow = config.get('flow') || {};
        Object.keys(updateData.flow).forEach(key => {
          currentFlow[key] = updateData.flow[key];
        });
        config.set('flow', currentFlow);
      }

      if (updateData.staff) {
        // 更新工作人员识别配置
        const currentStaff = config.get('staff') || {
          enabled: false,
          enterpriseNames: [],
          userRemarks: [],
          nicknames: [],
          specialPatterns: [],
          userIds: []
        };
        Object.keys(updateData.staff).forEach(key => {
          currentStaff[key] = updateData.staff[key];
        });
        config.set('staff', currentStaff);
      }

      if (updateData.riskMode) {
        // 更新风险处理模式配置
        config.set('riskMode', updateData.riskMode);
      }

      if (updateData.notification) {
        // 更新通知配置
        const currentNotification = config.get('notification') || {
          websocket: true,
          email: false,
          enterpriseWechat: false,
          emailRecipients: [],
          enterpriseWechatWebhook: ''
        };
        Object.keys(updateData.notification).forEach(key => {
          currentNotification[key] = updateData.notification[key];
        });
        config.set('notification', currentNotification);
      }

      if (updateData.humanHandover) {
        // 更新人工转接配置
        config.set('humanHandover', updateData.humanHandover);
      }

      if (updateData.deployment) {
        // 更新部署配置
        Object.keys(updateData.deployment).forEach(key => {
          if (config.get(`deployment.${key}`) !== undefined) {
            config.set(`deployment.${key}`, updateData.deployment[key]);

            // 如果是 callbackBaseUrl，同步更新数据库
            if (key === 'callbackBaseUrl') {
              console.log('📝 检测到 callbackBaseUrl 更新，开始同步到数据库...');
              try {
                const db = require('../database/index.js');
                console.log('📝 数据库模块加载成功');
                const existingSetting = db.systemSettings.getByKey('deployment.callbackBaseUrl');
                console.log('📝 查找现有设置:', existingSetting);

                if (existingSetting) {
                  const updated = db.systemSettings.update(existingSetting.id, { value: updateData.deployment[key] });
                  console.log('📝 数据库更新成功:', updated);
                } else {
                  const created = db.systemSettings.create({
                    key: 'deployment.callbackBaseUrl',
                    value: updateData.deployment[key],
                    category: 'deployment',
                    description: '回调基础地址'
                  });
                  console.log('📝 数据库创建成功:', created);
                }
              } catch (error) {
                console.error('❌ 更新数据库回调地址失败:', error);
              }
            }
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
    // 优先使用环境变量或配置文件中的 CALLBACK_BASE_URL（推荐用于生产环境）
    let baseUrl = config.getCallbackBaseUrl();
    
    // 检查是否来自自动检测的地址（如果 baseUrl 包含 localhost，说明可能需要自动检测）
    const isLocalhost = baseUrl && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'));
    
    // 如果当前是 localhost 环境，尝试从请求头中自动检测真实的外网地址
    if (isLocalhost) {
      const forwardedHost = request.headers['x-forwarded-host'];
      const forwardedProto = request.headers['x-forwarded-proto'];
      
      // 如果存在反向代理头，说明在生产环境，使用自动检测的地址
      if (forwardedHost && forwardedProto) {
        const detectedBaseUrl = `${forwardedProto}://${forwardedHost}`;
        
        // 如果检测到的地址与配置不同，更新配置（用于调试，不持久化到文件）
        if (detectedBaseUrl !== baseUrl) {
          console.log(`检测到部署地址变更: ${baseUrl} -> ${detectedBaseUrl}`);
          baseUrl = detectedBaseUrl;
        }
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
    const { type } = request.body;

    try {
      const callbacks = config.getAllCallbackUrls();
      const callbackUrl = callbacks[type];

      if (!callbackUrl) {
        return reply.status(400).send({
          success: false,
          error: '未知的回调类型'
        });
      }

      // 尝试实际连接回调地址
      const axios = require('axios');
      const testStartTime = Date.now();

      try {
        // 发送一个测试请求（使用 HEAD 方法快速检查）
        const response = await axios.head(callbackUrl, {
          timeout: 5000, // 5秒超时
          validateStatus: () => true // 接受任何状态码
        });

        const testDuration = Date.now() - testStartTime;

        // 检查响应状态
        if (response.status === 404) {
          return {
            success: false,
            message: '回调路由不存在（404）',
            data: {
              type,
              callbackUrl,
              status: response.status,
              duration: testDuration
            }
          };
        } else if (response.status >= 500) {
          return {
            success: false,
            message: `服务器错误（${response.status}）`,
            data: {
              type,
              callbackUrl,
              status: response.status,
              duration: testDuration
            }
          };
        } else {
          return {
            success: true,
            message: `连接成功 (${testDuration}ms)`,
            data: {
              type,
              callbackUrl,
              status: response.status,
              duration: testDuration
            }
          };
        }
      } catch (error) {
        // 网络错误
        const errorMessage = error.code === 'ECONNREFUSED' 
          ? '无法连接到服务器'
          : error.code === 'ETIMEDOUT'
          ? '连接超时'
          : error.code === 'ENOTFOUND'
          ? '域名解析失败'
          : error.message;

        return {
          success: false,
          message: errorMessage,
          data: {
            type,
            callbackUrl,
            error: error.message
          }
        };
      }
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
   * 获取单个会话详情
   */
  fastify.get('/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params;

    try {
      let session = await sessionService.getSession(sessionId);

      // 如果Redis中没有会话数据，从数据库中查询
      if (!session) {
        const { getDb } = require('coze-coding-dev-sdk');
        const { sql } = require('drizzle-orm');
        const { sessionMessages } = require('../database/schema');
        const db = await getDb();

        // 查询该会话的基本信息
        const result = await db.execute(sql`
          SELECT 
            session_id as "sessionId",
            robot_id as "robotId",
            robot_name as "robotName",
            MAX(created_at) as "lastActiveTime"
          FROM session_messages
          WHERE session_id = ${sessionId}
          GROUP BY session_id, robot_id, robot_name
          LIMIT 1
        `);

        if (result.rows && result.rows.length > 0) {
          session = {
            sessionId: result.rows[0].sessionId,
            robotId: result.rows[0].robotId,
            robotName: result.rows[0].robotName || '未知机器人',
            lastActiveTime: result.rows[0].lastActiveTime,
            status: 'auto', // 默认为自动模式
            messageCount: 0,
            aiReplyCount: 0,
            humanReplyCount: 0
          };

          // 统计消息数量
          const stats = await db.execute(sql`
            SELECT 
              COUNT(*) as "messageCount",
              SUM(CASE WHEN is_from_bot = true THEN 1 ELSE 0 END) as "aiReplyCount",
              SUM(CASE WHEN is_human = true THEN 1 ELSE 0 END) as "humanReplyCount"
            FROM session_messages
            WHERE session_id = ${sessionId}
          `);

          if (stats.rows && stats.rows.length > 0) {
            session.messageCount = parseInt(stats.rows[0].messageCount) || 0;
            session.aiReplyCount = parseInt(stats.rows[0].aiReplyCount) || 0;
            session.humanReplyCount = parseInt(stats.rows[0].humanReplyCount) || 0;
          }

          // 获取用户信息
          const userInfo = await db.execute(sql`
            SELECT user_name as "userName", group_name as "groupName"
            FROM session_messages
            WHERE session_id = ${sessionId}
            ORDER BY created_at ASC
            LIMIT 1
          `);

          if (userInfo.rows && userInfo.rows.length > 0) {
            session.userName = userInfo.rows[0].userName;
            session.groupName = userInfo.rows[0].groupName;
            session.userInfo = {
              userName: userInfo.rows[0].userName,
              groupName: userInfo.rows[0].groupName
            };
          }
        }
      }

      if (!session) {
        return reply.status(404).send({
          success: false,
          error: '会话不存在'
        });
      }

      // 填充机器人信息
      await sessionService.enrichSessionWithRobotInfo(session);

      return { success: true, data: session };
    } catch (error) {
      console.error('获取会话详情失败:', error);
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
   * 获取会话消息记录
   */
  fastify.get('/sessions/:sessionId/messages', async (request, reply) => {
    const { sessionId } = request.params;

    try {
      const sessionMessageService = require('../services/session-message.service');
      const messages = await sessionMessageService.getSessionMessages(sessionId);
      return { success: true, data: messages };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 搜索会话（通过消息内容搜索）
   */
  fastify.get('/sessions/search', async (request, reply) => {
    const { q, limit = 50 } = request.query;

    try {
      const sessionMessageService = require('../services/session-message.service');
      const messages = await sessionMessageService.searchMessages(q, parseInt(limit));
      return { success: true, data: messages };
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

  /**
   * 获取可用的日志文件列表
   */
  fastify.get('/logs', async (request, reply) => {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      const logDir = '/app/work/logs/bypass';
      const logFiles = [
        'app.log',
        'dev.log',
        'console.log'
      ];

      const logs = [];

      for (const filename of logFiles) {
        const filepath = path.join(logDir, filename);
        try {
          const stats = await fs.stat(filepath);
          logs.push({
            filename,
            path: filepath,
            size: stats.size,
            modified: stats.mtime,
            sizeFormatted: formatFileSize(stats.size)
          });
        } catch (err) {
          console.error(`无法读取日志文件 ${filename}:`, err);
          logs.push({
            filename,
            path: filepath,
            error: '文件不存在或无法读取'
          });
        }
      }

      return { success: true, data: logs };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 下载日志文件
   */
  fastify.get('/logs/:filename', async (request, reply) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const { filename } = request.params;
      const { lines } = request.query;

      // 验证文件名，防止路径遍历攻击
      const allowedFiles = ['app.log', 'dev.log', 'console.log'];
      if (!allowedFiles.includes(filename)) {
        return reply.status(400).send({
          success: false,
          error: '无效的日志文件名'
        });
      }

      const logDir = '/app/work/logs/bypass';
      const filepath = path.join(logDir, filename);

      try {
        // 检查文件是否存在
        const stats = fs.statSync(filepath);
        if (!stats.isFile()) {
          return reply.status(404).send({
            success: false,
            error: '日志文件不存在'
          });
        }

        let content;

        // 如果指定了行数，只读取最后几行
        if (lines && !isNaN(parseInt(lines))) {
          const lineCount = parseInt(lines);
          content = fs.readFileSync(filepath, 'utf-8');
          const linesArray = content.split('\n');
          content = linesArray.slice(-lineCount).join('\n');
        } else {
          // 读取整个文件
          content = fs.readFileSync(filepath, 'utf-8');
        }

        // 设置响应头，提示浏览器下载文件
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const downloadFilename = `${filename}_${timestamp}.log`;

        reply.header('Content-Type', 'text/plain; charset=utf-8');
        reply.header('Content-Disposition', `attachment; filename="${downloadFilename}"`);
        reply.header('Content-Length', Buffer.byteLength(content));

        return reply.send(content);
      } catch (err) {
        if (err.code === 'ENOENT') {
          return reply.status(404).send({
            success: false,
            error: '日志文件不存在'
          });
        }
        throw err;
      }
    } catch (error) {
      console.error('下载日志文件失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 获取日志文件内容（预览）
   */
  fastify.get('/logs/:filename/preview', async (request, reply) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const { filename } = request.params;
      const { lines = 100 } = request.query;

      // 验证文件名
      const allowedFiles = ['app.log', 'dev.log', 'console.log'];
      if (!allowedFiles.includes(filename)) {
        return reply.status(400).send({
          success: false,
          error: '无效的日志文件名'
        });
      }

      const logDir = '/app/work/logs/bypass';
      const filepath = path.join(logDir, filename);

      try {
        const content = fs.readFileSync(filepath, 'utf-8');
        const linesArray = content.split('\n');
        const lineCount = parseInt(lines);
        const previewLines = linesArray.slice(-lineCount);

        return {
          success: true,
          data: {
            filename,
            totalLines: linesArray.length,
            previewLines: previewLines.length,
            lines: previewLines,
            truncated: linesArray.length > lineCount
          }
        };
      } catch (err) {
        if (err.code === 'ENOENT') {
          return reply.status(404).send({
            success: false,
            error: '日志文件不存在'
          });
        }
        throw err;
      }
    } catch (error) {
      console.error('获取日志预览失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * 创建测试消息（用于测试监控页面显示）
   */
  fastify.post('/create-test-message', async (request, reply) => {
    try {
      const { getDb } = require('coze-coding-dev-sdk');
      const { sql } = require('drizzle-orm');
      
      const db = await getDb();
      const testId = `process:${Date.now()}:test001`;
      const timestamp = new Date().toISOString();
      
      const testSteps = {
        user_message: {
          content: "你好，我想咨询一下产品价格",
          userId: "测试用户",
          groupId: "测试群组",
          messageId: "msg_test_001",
          timestamp: timestamp
        },
        intent_recognition: {
          result: "service",
          confidence: 0.95,
          timestamp: timestamp
        },
        ai_response: {
          response: "您好！我们的产品价格如下：基础版99元/月，专业版199元/月，企业版399元/月。请问您对哪个版本感兴趣？",
          model: "doubao-1.8",
          timestamp: timestamp
        }
      };
      
      await db.execute(sql`
        INSERT INTO execution_tracking
        (id, processing_id, robot_id, robot_name, session_id, user_id, group_id, status, steps, decision, start_time, end_time, processing_time, created_at)
        VALUES (
          ${testId},
          ${testId},
          ${'test-robot-001'},
          ${'测试机器人'},
          ${'session-test-001'},
          ${'测试用户'},
          ${'测试群组'},
          ${'completed'},
          ${JSON.stringify(testSteps)}::jsonb,
          ${JSON.stringify({action: 'auto_reply', reason: '测试数据'})}::jsonb,
          ${timestamp},
          ${timestamp},
          ${1000},
          ${timestamp}
        )
      `);
      
      return reply.send({
        success: true,
        message: '测试消息已创建',
        data: {
          processingId: testId,
          content: testSteps.user_message.content
        }
      });
    } catch (error) {
      console.error('创建测试消息失败:', error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
};

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

module.exports = adminApiRoutes;
