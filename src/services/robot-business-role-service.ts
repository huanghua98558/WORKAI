import { db } from '@/lib/db';
import { robots } from '@/storage/database/new-schemas';
import { businessRoles, type AIBehavior } from '@/storage/database/new-schemas/business-roles';
import { eq, sql } from 'drizzle-orm';
import type { BusinessRole } from '@/storage/database/new-schemas/business-roles';

/**
 * 业务角色配置接口
 */
export interface RobotBusinessConfig {
  businessRole: string;
  businessConfig: {
    aiBehavior: 'full_auto' | 'semi_auto' | 'record_only';
    staffEnabled: boolean;
    staffTypeFilter?: string[];
    keywords: string[];
    defaultTaskPriority?: 'low' | 'normal' | 'high';
    enableTaskCreation: boolean;
  };
}

/**
 * 业务角色服务
 * 负责管理和查询机器人的业务角色配置
 */
export class RobotBusinessRoleService {
  /**
   * 缓存配置（内存缓存，避免每次查询数据库）
   */
  private configCache: Map<string, { config: RobotBusinessConfig; role: BusinessRole; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 根据机器人ID获取业务角色配置
   */
  async getBusinessConfigByRobotId(robotId: string): Promise<{
    success: boolean;
    businessConfig?: RobotBusinessConfig;
    businessRole?: BusinessRole;
    error?: string;
  }> {
    try {
      // 1. 尝试从缓存读取
      const cached = this.configCache.get(robotId);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return {
          success: true,
          businessConfig: cached.config,
          businessRole: cached.role,
        };
      }

      // 2. 读取机器人配置
      const robotList = await db
        .select()
        .from(robots)
        .where(eq(robots.id, robotId))
        .limit(1);

      const robot = robotList[0];
      if (!robot) {
        return {
          success: false,
          error: 'Robot not found',
        };
      }

      const config = robot.config as any;
      const businessRoleCode = config?.businessRole;
      const businessConfig = config?.businessConfig;

      if (!businessRoleCode) {
        return {
          success: false,
          error: 'Robot has no business role configured',
        };
      }

      // 3. 读取业务角色定义
      const businessRoleList = await db
        .select()
        .from(businessRoles)
        .where(eq(businessRoles.code, businessRoleCode))
        .limit(1);

      const businessRole = businessRoleList[0];
      if (!businessRole) {
        return {
          success: false,
          error: `Business role ${businessRoleCode} not found`,
        };
      }

      // 4. 合并配置（机器人个性化配置覆盖默认配置）
      const finalConfig: RobotBusinessConfig = {
        businessRole: businessRoleCode,
        businessConfig: {
          aiBehavior: (businessConfig?.aiBehavior || businessRole.aiBehavior) as 'full_auto' | 'semi_auto' | 'record_only',
          staffEnabled: businessConfig?.staffEnabled ?? businessRole.staffEnabled,
          staffTypeFilter: businessConfig?.staffTypeFilter || (businessRole.staffTypeFilter as any) || [],
          keywords: businessConfig?.keywords || (businessRole.keywords as any) || [],
          defaultTaskPriority: (businessConfig?.defaultTaskPriority || businessRole.defaultTaskPriority) as 'low' | 'normal' | 'high',
          enableTaskCreation: businessConfig?.enableTaskCreation ?? businessRole.enableTaskCreation,
        },
      };

      // 5. 缓存配置
      this.configCache.set(robotId, {
        config: finalConfig,
        role: businessRole as BusinessRole,
        timestamp: Date.now(),
      });

      return {
        success: true,
        businessConfig: finalConfig,
        businessRole: businessRole as BusinessRole,
      };
    } catch (error) {
      console.error('[RobotBusinessRoleService] 获取业务配置失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 判断AI是否应该回复
   */
  async shouldAiReply(robotId: string, senderType: 'user' | 'staff'): Promise<{
    success: boolean;
    shouldReply: boolean;
    reason?: string;
    error?: string;
  }> {
    try {
      const result = await this.getBusinessConfigByRobotId(robotId);

      if (!result.success || !result.businessConfig) {
        // 配置读取失败，返回默认行为（AI回复）
        console.warn('[RobotBusinessRoleService] 获取业务配置失败，使用默认行为:', result.error);
        return {
          success: true,
          shouldReply: senderType === 'user', // 默认：回复用户消息，不回复工作人员消息
          reason: `默认行为：${senderType === 'user' ? 'AI回复用户消息' : 'AI不回复工作人员消息'}`,
        };
      }

      const { businessConfig, businessRole } = result;
      const aiBehavior = businessConfig.businessConfig.aiBehavior;

      // 转化客服：全自动，总是回复
      if (aiBehavior === 'full_auto') {
        return {
          success: true,
          shouldReply: true,
          reason: `${businessRole?.name}：全自动模式，AI总是回复`,
        };
      }

      // 仅记录模式：从不回复
      if (aiBehavior === 'record_only') {
        return {
          success: true,
          shouldReply: false,
          reason: `${businessRole?.name}：仅记录模式，AI不回复`,
        };
      }

      // 半自动模式：用户消息回复，工作人员消息不回复
      if (aiBehavior === 'semi_auto') {
        if (senderType === 'user') {
          return {
            success: true,
            shouldReply: true,
            reason: `${businessRole?.name}：半自动模式，AI回复用户消息`,
          };
        } else {
          return {
            success: true,
            shouldReply: false,
            reason: `${businessRole?.name}：半自动模式，AI不回复工作人员消息`,
          };
        }
      }

      return {
        success: true,
        shouldReply: false,
        reason: `未知AI行为模式：${aiBehavior}`,
      };
    } catch (error) {
      console.error('[RobotBusinessRoleService] 判断AI回复失败:', error);
      return {
        success: false,
        shouldReply: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 判断是否识别工作人员
   */
  async shouldIdentifyStaff(robotId: string, staffType: string): Promise<{
    success: boolean;
    shouldIdentify: boolean;
    reason?: string;
    error?: string;
  }> {
    try {
      const result = await this.getBusinessConfigByRobotId(robotId);

      if (!result.success || !result.businessConfig) {
        // 配置读取失败，返回默认行为（识别所有工作人员）
        console.warn('[RobotBusinessRoleService] 获取业务配置失败，使用默认行为:', result.error);
        return {
          success: true,
          shouldIdentify: true,
          reason: `默认行为：识别所有工作人员`,
        };
      }

      const { businessConfig, businessRole } = result;
      const { staffEnabled, staffTypeFilter } = businessConfig.businessConfig;
      const roleCode = businessConfig.businessRole;

      // 转化客服：不识别工作人员
      if (roleCode === 'conversion_staff') {
        return {
          success: true,
          shouldIdentify: false,
          reason: '转化客服：不识别工作人员，视为普通用户',
        };
      }

      // 未启用工作人员识别
      if (!staffEnabled) {
        return {
          success: true,
          shouldIdentify: false,
          reason: `${businessRole?.name}：未启用工作人员识别`,
        };
      }

      // 有类型过滤，检查是否匹配
      if (staffTypeFilter && staffTypeFilter.length > 0) {
        if (staffTypeFilter.includes(staffType)) {
          return {
            success: true,
            shouldIdentify: true,
            reason: `${businessRole?.name}：识别匹配的工作人员类型 ${staffType}`,
          };
        } else {
          return {
            success: true,
            shouldIdentify: false,
            reason: `${businessRole?.name}：工作人员类型 ${staffType} 不在允许列表中`,
          };
        }
      }

      // 无类型过滤，识别所有工作人员
      return {
        success: true,
        shouldIdentify: true,
        reason: `${businessRole?.name}：识别所有工作人员`,
      };
    } catch (error) {
      console.error('[RobotBusinessRoleService] 判断工作人员识别失败:', error);
      return {
        success: false,
        shouldIdentify: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 清除缓存
   */
  clearCache(robotId?: string): void {
    if (robotId) {
      this.configCache.delete(robotId);
    } else {
      this.configCache.clear();
    }
  }
}

// 导出单例
export const robotBusinessRoleService = new RobotBusinessRoleService();
