/**
 * TaskAssignmentService - 任务分配服务
 * 
 * 功能：
 * - 基于 AI 分析结果自动创建任务
 * - 智能分配任务给工作人员
 * - 根据意图和情感确定任务优先级
 * - 支持任务状态跟踪
 */

const { getDb } = require('coze-coding-dev-sdk');
const { tasks } = require('../database/schema');
const { sql } = require('drizzle-orm');

class TaskAssignmentService {
  constructor() {
    console.log('[TaskAssignmentService] 任务分配服务初始化完成');
  }

  /**
   * 基于 AI 分析结果创建任务
   * @param {Object} analysisResult - AI 分析结果
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 创建的任务
   */
  async createTaskFromAnalysis(analysisResult, context) {
    const {
      sessionId,
      message,
      robot,
    } = context;

    try {
      // 检查是否需要创建任务
      const taskConfig = this.determineTaskConfig(analysisResult);

      if (!taskConfig.shouldCreate) {
        console.log('[TaskAssignment] 不需要创建任务');
        return null;
      }

      console.log('[TaskAssignment] 开始创建任务...', {
        taskType: taskConfig.type,
        priority: taskConfig.priority,
      });

      // 生成任务 ID（使用数据库的 gen_random_uuid()）
      const db = await getDb();
      const [{ task_id: taskId }] = await db
        .select({ task_id: sql`gen_random_uuid()` })
        .from(sql`(SELECT 1) as dummy`);

      // 构建任务标题
      const taskTitle = this.generateTaskTitle(taskConfig, analysisResult, context);

      // 构建任务描述
      const taskDescription = this.generateTaskDescription(taskConfig, analysisResult, context);

      // 创建任务记录
      const [newTask] = await db.insert(tasks).values({
        taskId,
        alertId: null, // 如果关联告警，可以传入 alertId
        taskTitle,
        taskDescription,
        status: 'pending',
        priority: taskConfig.priority,
        assignedStaff: null, // 稍后分配
        createdBy: context.message?.senderId || 'system',
        dueDate: this.calculateDueDate(taskConfig.priority),
        metadata: {
          sessionId,
          robotId: robot.robotId,
          intent: analysisResult.intent?.intent,
          sentiment: analysisResult.sentiment?.sentiment,
          messageId: message?.messageId,
          analysisTime: analysisResult.analysis_time,
          triggerReason: taskConfig.reason,
        }
      }).returning();

      console.log('[TaskAssignment] ✅ 任务创建成功:', taskId);

      return newTask;

    } catch (error) {
      console.error('[TaskAssignment] ❌ 任务创建失败:', error);
      throw error;
    }
  }

  /**
   * 确定任务配置
   */
  determineTaskConfig(analysisResult) {
    const { intent, sentiment, alert_trigger } = analysisResult;

    // 告警触发时创建任务
    if (alert_trigger?.should_trigger) {
      return {
        shouldCreate: true,
        type: 'alert_response',
        priority: alert_trigger.alert_level === 'critical' ? 'critical' : 'high',
        reason: '告警触发',
        dueHours: 2,
      };
    }

    // 基于意图创建任务
    if (intent?.intent) {
      switch (intent.intent) {
        case 'complaint':
          return {
            shouldCreate: true,
            type: 'complaint_handling',
            priority: 'critical',
            reason: '用户投诉',
            dueHours: 2,
          };

        case 'technical':
          return {
            shouldCreate: true,
            type: 'technical_support',
            priority: 'high',
            reason: '技术支持请求',
            dueHours: 4,
          };

        case 'appointment':
          return {
            shouldCreate: true,
            type: 'appointment_scheduling',
            priority: 'medium',
            reason: '用户预约',
            dueHours: 24,
          };

        case 'administrative':
          return {
            shouldCreate: true,
            type: 'administrative_request',
            priority: 'medium',
            reason: '行政请求',
            dueHours: 8,
          };

        default:
          // 其他意图不自动创建任务
          return {
            shouldCreate: false,
          };
      }
    }

    // 基于情感创建任务（负面情绪）
    if (sentiment?.sentiment === 'negative' && sentiment?.emotional_intensity >= 4) {
      return {
        shouldCreate: true,
        type: 'emotion_soothing',
        priority: 'high',
        reason: '用户情绪消极',
        dueHours: 4,
      };
    }

    return {
      shouldCreate: false,
    };
  }

  /**
   * 生成任务标题
   */
  generateTaskTitle(taskConfig, analysisResult, context) {
    const userName = context.message?.receivedName || '用户';
    const groupName = context.message?.groupName || '群组';

    const titles = {
      alert_response: `[告警处理] ${userName} 在 ${groupName} 需要处理`,
      complaint_handling: `[投诉处理] ${userName} 投诉问题需要跟进`,
      technical_support: `[技术支持] ${userName} 技术问题需要解决`,
      appointment_scheduling: `[预约安排] ${userName} 需要安排预约`,
      administrative_request: `[行政处理] ${userName} 行政请求需要处理`,
      emotion_soothing: `[情绪安抚] ${userName} 情绪需要安抚`,
    };

    return titles[taskConfig.type] || `[任务] ${userName} 请求需要处理`;
  }

  /**
   * 生成任务描述
   */
  generateTaskDescription(taskConfig, analysisResult, context) {
    const { intent, sentiment, user_profile_summary } = analysisResult;
    const message = context.message;

    let description = `## 任务原因\n${taskConfig.reason}\n\n`;

    // 添加用户信息
    description += `## 用户信息\n`;
    description += `- 用户: ${message?.receivedName || '未知'}\n`;
    description += `- 群组: ${message?.groupName || '未知'}\n`;
    if (user_profile_summary?.user_id) {
      description += `- 满意度: ${user_profile_summary.satisfaction_score || 'N/A'}\n`;
      description += `- 历史消息数: ${user_profile_summary.message_count || 0}\n`;
    }
    description += `\n`;

    // 添加分析结果
    description += `## AI 分析结果\n`;
    if (intent) {
      description += `- 意图: ${intent.intent} (置信度: ${Math.round(intent.confidence * 100)}%)\n`;
      if (intent.reasoning) {
        description += `- 识别理由: ${intent.reasoning}\n`;
      }
    }
    if (sentiment) {
      description += `- 情感: ${sentiment.sentiment} (强度: ${sentiment.emotional_intensity || 'N/A'})\n`;
      if (sentiment.reasoning) {
        description += `- 分析理由: ${sentiment.reasoning}\n`;
      }
    }
    description += `\n`;

    // 添加消息内容
    if (message?.content) {
      description += `## 用户消息\n`;
      description += `> ${message.content}\n\n`;
    }

    // 添加行动建议
    if (analysisResult.action_suggestions && analysisResult.action_suggestions.length > 0) {
      description += `## 行动建议\n`;
      analysisResult.action_suggestions.forEach((suggestion, idx) => {
        description += `${idx + 1}. ${suggestion.action} - ${suggestion.description}\n`;
      });
      description += `\n`;
    }

    return description;
  }

  /**
   * 计算截止时间
   */
  calculateDueDate(priority) {
    const now = new Date();
    const hoursMap = {
      critical: 2,
      high: 4,
      medium: 8,
      low: 24,
    };
    const hours = hoursMap[priority] || 8;
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  /**
   * 分配任务给工作人员
   * @param {string} taskId - 任务 ID
   * @param {string} staffId - 工作人员 ID
   * @returns {Promise<Object>} 更新后的任务
   */
  async assignTask(taskId, staffId) {
    const db = await getDb();

    try {
      const [updatedTask] = await db
        .update(tasks)
        .set({
          assignedStaff: staffId,
          updatedAt: new Date(),
        })
        .where(eq(tasks.taskId, taskId))
        .returning();

      console.log('[TaskAssignment] ✅ 任务分配成功:', taskId, '->', staffId);
      return updatedTask;
    } catch (error) {
      console.error('[TaskAssignment] ❌ 任务分配失败:', error);
      throw error;
    }
  }

  /**
   * 更新任务状态
   * @param {string} taskId - 任务 ID
   * @param {string} status - 新状态
   * @returns {Promise<Object>} 更新后的任务
   */
  async updateTaskStatus(taskId, status) {
    const db = await getDb();

    try {
      const updates = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'completed') {
        updates.completedAt = new Date();
      }

      const [updatedTask] = await db
        .update(tasks)
        .set(updates)
        .where(eq(tasks.taskId, taskId))
        .returning();

      console.log('[TaskAssignment] ✅ 任务状态更新成功:', taskId, '->', status);
      return updatedTask;
    } catch (error) {
      console.error('[TaskAssignment] ❌ 任务状态更新失败:', error);
      throw error;
    }
  }
}

// 导出单例
module.exports = new TaskAssignmentService();
