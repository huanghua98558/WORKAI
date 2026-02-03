/**
 * 数据库连接池配置
 * 使用 pg-promise 管理数据库连接池
 */

import pg from 'pg';

const { Pool } = pg;

// 创建连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000, // 空闲超时时间
  connectionTimeoutMillis: 2000, // 连接超时时间
});

// 连接池错误处理
pool.on('error', (err) => {
  console.error('数据库连接池错误:', err);
});

/**
 * 执行 SQL 查询
 * @param query SQL 查询语句
 * @param params 查询参数
 * @returns 查询结果
 */
export async function query<T = any>(query: string, params: any[] = []): Promise<pg.QueryResult<T>> {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * 执行事务
 * @param callback 事务回调函数
 * @returns 事务执行结果
 */
export async function transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 获取连接池统计信息
 * @returns 连接池统计
 */
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/**
 * 关闭连接池
 */
export async function closePool() {
  await pool.end();
}

export default pool;
