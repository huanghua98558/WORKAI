/**
 * 工作人员类型缓存
 * 用于缓存工作人员类型信息，减少数据库查询
 */

import { StaffType } from '@/services/staff-type-service';

export interface StaffTypeCacheItem {
  staffUserId: string;
  staffType: StaffType;
  cachedAt: number;
  ttl: number; // 缓存有效期（毫秒）
}

export class StaffTypeCache {
  private cache: Map<string, StaffTypeCacheItem>;
  private defaultTTL: number; // 默认缓存1小时

  constructor(defaultTTL: number = 60 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.startCleanup();
  }

  /**
   * 获取工作人员类型
   */
  get(staffUserId: string): StaffType | null {
    const item = this.cache.get(staffUserId);
    
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.cachedAt > item.ttl) {
      this.cache.delete(staffUserId);
      return null;
    }

    return item.staffType;
  }

  /**
   * 设置工作人员类型
   */
  set(staffUserId: string, staffType: StaffType, ttl?: number): void {
    this.cache.set(staffUserId, {
      staffUserId,
      staffType,
      cachedAt: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * 删除缓存
   */
  delete(staffUserId: string): void {
    this.cache.delete(staffUserId);
  }

  /**
   * 批量设置
   */
  setBatch(items: Array<{ staffUserId: string; staffType: StaffType; ttl?: number }>): void {
    items.forEach(item => {
      this.set(item.staffUserId, item.staffType, item.ttl);
    });
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((item, key) => {
      if (now - item.cachedAt > item.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`[StaffTypeCache] 清理了 ${expiredKeys.length} 个过期缓存项`);
    }
  }

  /**
   * 启动定时清理
   */
  private startCleanup(): void {
    // 每10分钟清理一次过期缓存
    setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    validCount: number;
    expiredCount: number;
  } {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;

    this.cache.forEach(item => {
      if (now - item.cachedAt > item.ttl) {
        expiredCount++;
      } else {
        validCount++;
      }
    });

    return {
      size: this.cache.size,
      validCount,
      expiredCount,
    };
  }

  /**
   * 预热缓存（从数据库批量加载）
   */
  async warmup(staffUserIds: string[]): Promise<void> {
    try {
      // 这里应该调用 staffTypeService 批量获取
      // 暂时先预留接口
      console.log(`[StaffTypeCache] 预热缓存，需要加载 ${staffUserIds.length} 个工作人员类型`);
    } catch (error) {
      console.error('[StaffTypeCache] 预热缓存失败:', error);
    }
  }
}

// 导出单例
export const staffTypeCache = new StaffTypeCache();

/**
 * 工作人员类型缓存装饰器
 */
export function withStaffTypeCache<T extends (...args: any[]) => Promise<any>>(
  fetchFn: T,
  cacheKeyFn: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const key = cacheKeyFn(...args);
    
    // 尝试从缓存获取
    const cached = staffTypeCache.get(key);
    if (cached !== null) {
      return cached;
    }

    // 从数据库获取
    const result = await fetchFn(...args);
    
    // 存入缓存
    if (result !== null) {
      staffTypeCache.set(key, result);
    }

    return result;
  }) as T;
}
