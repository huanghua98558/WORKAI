/**
 * 数据库连接池管理
 * 用于监控和管理数据库连接池状态
 */

import { db } from '@/lib/db';

// 导入 postgres 客户端类型
import postgres from 'postgres';

/**
 * 获取数据库连接池信息
 */
export async function getPoolInfo(): Promise<any> {
  try {
    // 检查是否有 postgres 客户端实例
    // 注意：这里我们无法直接访问内部连接池状态，但可以执行一些查询来了解状态
    
    // 执行简单的健康检查查询
    const result = await db.execute('SELECT version()');
    const dbVersion = result?.[0]?.version || 'unknown';

    return {
      connected: true,
      version: dbVersion,
      message: 'Database connection is active',
    };
  } catch (error: any) {
    console.error('[DB Pool] Failed to get pool info:', error);
    return {
      connected: false,
      error: error.message,
    };
  }
}

/**
 * 健康检查
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await db.execute('SELECT 1 as health_check');
    return result && result.length > 0;
  } catch (error) {
    console.error('[DB Pool] Health check failed:', error);
    return false;
  }
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(): Promise<any> {
  try {
    // 获取表行数
    const [messagesCount] = await db.execute('SELECT COUNT(*) as count FROM messages');
    const [sessionMessagesCount] = await db.execute('SELECT COUNT(*) as count FROM session_messages');
    const [sessionsCount] = await db.execute('SELECT COUNT(*) as count FROM sessions');
    const [flowInstancesCount] = await db.execute('SELECT COUNT(*) as count FROM flow_instances');

    const countToNumber = (obj: any): number => {
      return parseInt(obj?.count || '0', 10);
    };

    return {
      success: true,
      stats: {
        messages: countToNumber(messagesCount),
        sessionMessages: countToNumber(sessionMessagesCount),
        sessions: countToNumber(sessionsCount),
        flowInstances: countToNumber(flowInstancesCount),
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[DB Pool] Failed to get database stats:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 获取最近的数据库操作
 */
export async function getRecentOperations(limit: number = 10): Promise<any> {
  try {
    // 获取最近的消息
    const recentMessages = await db.execute(
      `SELECT id, session_id, robot_id, sender_id, sender_name, sender_type, content, created_at FROM messages ORDER BY created_at DESC LIMIT ${limit}`
    );

    return {
      success: true,
      operations: recentMessages,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[DB Pool] Failed to get recent operations:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
