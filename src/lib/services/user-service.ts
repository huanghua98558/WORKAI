import { getDb } from 'coze-coding-dev-sdk';
import { users } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';

interface User {
  id: string;
  userId: string;
  platform: string;
  platformUserId: string;
  name: string;
  status: string;
  roles: string[];
  tags: string[];
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

class UserService {
  /**
   * 根据ID获取用户
   * @param id - 用户ID
   * @returns 用户信息
   */
  async getUserById(id: string) {
    try {
      const db = await getDb();
      const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
      
      if (user.length === 0) {
        return {
          success: false,
          error: 'User not found',
          user: null
        };
      }

      return {
        success: true,
        user: user[0],
        error: null
      };
    } catch (error) {
      console.error('[UserService] getUserById error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
        user: null
      };
    }
  }

  /**
   * 根据平台用户ID获取用户
   * @param platform - 平台名称
   * @param platformUserId - 平台用户ID
   * @returns 用户信息
   */
  async getUserByPlatformId(platform: string, platformUserId: string) {
    try {
      const db = await getDb();
      const user = await db
        .select()
        .from(users)
        .where(eq(users.username, platformUserId))
        .limit(1);
      
      if (user.length === 0) {
        return {
          success: false,
          error: 'User not found',
          user: null
        };
      }

      return {
        success: true,
        user: user[0],
        error: null
      };
    } catch (error) {
      console.error('[UserService] getUserByPlatformId error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
        user: null
      };
    }
  }

  /**
   * 创建或更新用户
   * @param userData - 用户数据
   * @returns 创建或更新后的用户
   */
  async createOrUpdateUser(userData: Partial<User>) {
    try {
      const db = await getDb();
      
      // 如果用户已存在，更新用户
      if (userData.platformUserId) {
        const existing = await this.getUserByPlatformId(
          userData.platform || 'wecom',
          userData.platformUserId
        );
        
        if (existing.success && existing.user) {
          // 更新用户
          const updated = await db
            .update(users)
            .set({
              username: userData.name || userData.platformUserId,
              email: userData.email,
              updatedAt: new Date().toISOString() as any
            })
            .where(eq(users.id, existing.user.id))
            .returning();
          
          return {
            success: true,
            user: updated[0],
            error: null
          };
        }
      }

      // 创建新用户
      const newUser = await db
        .insert(users)
        .values({
          username: userData.name || userData.platformUserId || 'unknown',
          email: userData.email || 'unknown@example.com',
          password: 'default',
          createdAt: new Date().toISOString() as any,
          updatedAt: new Date().toISOString() as any
        })
        .returning();
      
      return {
        success: true,
        user: newUser[0],
        error: null
      };
    } catch (error) {
      console.error('[UserService] createOrUpdateUser error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create or update user',
        user: null
      };
    }
  }
}

export const userService = new UserService();
