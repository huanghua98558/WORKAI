import { db } from '../storage/database';
import { staff } from '../storage/database/shared/schema';

/**
 * 工作人员类型枚举
 */
export enum StaffType {
  MANAGEMENT = 'management',       // 管理人员
  COMMUNITY = 'community',         // 社群运维
  AFTER_SALES = 'after_sales',     // 售后客服
  CONVERSION = 'conversion',       // 转化客服
}

/**
 * 工作人员类型配置
 */
export const STAFF_TYPE_CONFIG = {
  [StaffType.MANAGEMENT]: {
    name: '管理人员',
    description: '系统管理人员，具有最高权限',
    color: '#ef4444',
  },
  [StaffType.COMMUNITY]: {
    name: '社群运维',
    description: '负责社群运营和日常维护',
    color: '#3b82f6',
  },
  [StaffType.AFTER_SALES]: {
    name: '售后客服',
    description: '负责售后问题处理',
    color: '#f59e0b',
  },
  [StaffType.CONVERSION]: {
    name: '转化客服',
    description: '负责用户转化和销售',
    color: '#10b981',
  },
};

/**
 * 工作人员类型服务
 */
export class StaffTypeService {
  /**
   * 获取工作人员类型
   */
  async getStaffType(staffUserId: string): Promise<StaffType | null> {
    try {
      const result = await db
        .select({ staffType: staff.staffType })
        .from(staff)
        .where(eq(staff.userId, staffUserId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return result[0].staffType as StaffType;
    } catch (error) {
      console.error('[StaffTypeService] 获取工作人员类型失败:', error);
      return null;
    }
  }

  /**
   * 设置工作人员类型
   */
  async setStaffType(staffUserId: string, staffType: StaffType): Promise<boolean> {
    try {
      await db
        .update(staff)
        .set({ staffType, updatedAt: new Date() })
        .where(eq(staff.userId, staffUserId));

      return true;
    } catch (error) {
      console.error('[StaffTypeService] 设置工作人员类型失败:', error);
      return false;
    }
  }

  /**
   * 批量设置工作人员类型
   */
  async batchSetStaffType(updates: Array<{ staffUserId: string; staffType: StaffType }>): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const update of updates) {
      const result = await this.setStaffType(update.staffUserId, update.staffType);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * 获取所有工作人员及其类型
   */
  async getAllStaffWithTypes(): Promise<Array<{ userId: string; name: string; staffType: StaffType }>> {
    try {
      const results = await db
        .select({
          userId: staff.userId,
          name: staff.name,
          staffType: staff.staffType,
        })
        .from(staff)
        .orderBy(staff.name);

      return results.map(r => ({
        userId: r.userId,
        name: r.name,
        staffType: r.staffType as StaffType,
      }));
    } catch (error) {
      console.error('[StaffTypeService] 获取工作人员列表失败:', error);
      return [];
    }
  }

  /**
   * 根据类型获取工作人员列表
   */
  async getStaffByType(staffType: StaffType): Promise<Array<{ userId: string; name: string }>> {
    try {
      const results = await db
        .select({
          userId: staff.userId,
          name: staff.name,
        })
        .from(staff)
        .where(eq(staff.staffType, staffType))
        .orderBy(staff.name);

      return results;
    } catch (error) {
      console.error('[StaffTypeService] 获取工作人员列表失败:', error);
      return [];
    }
  }

  /**
   * 初始化工作人员类型（用于迁移）
   */
  async initializeStaffTypes(): Promise<void> {
    try {
      // 将所有没有类型的工作人员设置为默认的管理类型
      await db
        .update(staff)
        .set({ staffType: StaffType.MANAGEMENT, updatedAt: new Date() })
        .where(isNull(staff.staffType));

      console.log('[StaffTypeService] 工作人员类型初始化完成');
    } catch (error) {
      console.error('[StaffTypeService] 初始化工作人员类型失败:', error);
    }
  }

  /**
   * 检查是否为特定类型的工作人员
   */
  async isStaffType(staffUserId: string, staffType: StaffType): Promise<boolean> {
    const type = await this.getStaffType(staffUserId);
    return type === staffType;
  }
}

// 导出单例
export const staffTypeService = new StaffTypeService();
