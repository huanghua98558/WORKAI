/**
 * 数据库写入诊断工具
 * 用于诊断 session_messages 表写入问题
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sessionMessages } = require('../database/schema');
const { sql } = require('drizzle-orm');

class DatabaseDiagnostics {
  /**
   * 诊断数据库连接和表结构
   */
  async diagnose() {
    const results = {
      timestamp: new Date().toISOString(),
      databaseConnection: null,
      tableExists: false,
      tableStructure: null,
      testInsert: null,
      errors: []
    };

    try {
      // 1. 测试数据库连接
      console.log('[诊断] 1. 测试数据库连接...');
      const db = await getDb();
      
      // 执行简单查询
      const testQuery = await db.execute(sql`SELECT NOW() as current_time`);
      results.databaseConnection = {
        success: true,
        currentTime: testQuery.rows[0]?.current_time
      };
      console.log('[诊断] ✓ 数据库连接正常:', results.databaseConnection.currentTime);

    } catch (error) {
      results.databaseConnection = {
        success: false,
        error: error.message
      };
      results.errors.push({
        step: 'databaseConnection',
        error: error.message,
        stack: error.stack
      });
      console.error('[诊断] ✗ 数据库连接失败:', error.message);
      return results;
    }

    try {
      // 2. 检查表是否存在
      console.log('[诊断] 2. 检查 session_messages 表...');
      const db = await getDb();
      
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'session_messages'
        ) as exists
      `);
      
      results.tableExists = tableCheck.rows[0]?.exists === true;
      
      if (results.tableExists) {
        console.log('[诊断] ✓ session_messages 表存在');
      } else {
        console.error('[诊断] ✗ session_messages 表不存在');
        results.errors.push({
          step: 'tableExists',
          error: 'Table session_messages does not exist'
        });
      }

    } catch (error) {
      results.errors.push({
        step: 'tableExists',
        error: error.message,
        stack: error.stack
      });
      console.error('[诊断] ✗ 检查表失败:', error.message);
    }

    try {
      // 3. 获取表结构
      console.log('[诊断] 3. 获取表结构...');
      const db = await getDb();
      
      const columns = await db.execute(sql`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable
        FROM information_schema.columns
        WHERE table_name = 'session_messages'
        ORDER BY ordinal_position
      `);
      
      results.tableStructure = columns.rows || [];
      console.log('[诊断] ✓ 表结构:', columns.rows.length, '列');

      // 打印表结构
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}(${col.character_maximum_length || ''}) NULL=${col.is_nullable}`);
      });

    } catch (error) {
      results.errors.push({
        step: 'tableStructure',
        error: error.message,
        stack: error.stack
      });
      console.error('[诊断] ✗ 获取表结构失败:', error.message);
    }

    try {
      // 4. 测试插入
      console.log('[诊断] 4. 测试插入数据...');
      const db = await getDb();
      
      const testMessage = {
        sessionId: 'test_session_' + Date.now(),
        messageId: 'test_msg_' + Date.now(),
        userId: 'test_user',
        groupId: 'test_group',
        userName: '测试用户',
        groupName: '测试群组',
        content: '测试消息内容',
        isFromUser: true,
        isFromBot: false,
        isHuman: false,
        robotId: 'test_robot_123',
        robotName: '测试机器人',
        timestamp: new Date().toISOString(),
      };

      console.log('[诊断] 插入测试数据:', testMessage);
      
      const insertResult = await db.insert(sessionMessages).values(testMessage);
      
      results.testInsert = {
        success: true,
        messageId: testMessage.messageId
      };
      console.log('[诊断] ✓ 测试插入成功');

      // 删除测试数据
      await db.execute(sql`
        DELETE FROM session_messages 
        WHERE message_id = ${testMessage.messageId}
      `);
      console.log('[诊断] ✓ 测试数据已清理');

    } catch (error) {
      results.testInsert = {
        success: false,
        error: error.message,
        constraint: error.constraint,
        table: error.table
      };
      results.errors.push({
        step: 'testInsert',
        error: error.message,
        constraint: error.constraint,
        table: error.table,
        stack: error.stack
      });
      console.error('[诊断] ✗ 测试插入失败:', error.message);
      if (error.constraint) {
        console.error('[诊断] 约束错误:', error.constraint);
      }
    }

    // 5. 总结
    console.log('\n[诊断] ===== 诊断结果汇总 =====');
    console.log('数据库连接:', results.databaseConnection?.success ? '✓' : '✗');
    console.log('表存在:', results.tableExists ? '✓' : '✗');
    console.log('表结构:', results.tableStructure?.length ? '✓' : '✗');
    console.log('测试插入:', results.testInsert?.success ? '✓' : '✗');
    
    if (results.errors.length > 0) {
      console.log('\n[诊断] 错误列表:');
      results.errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err.step}: ${err.error}`);
        if (err.constraint) console.log(`   约束: ${err.constraint}`);
        if (err.table) console.log(`   表: ${err.table}`);
      });
    }

    return results;
  }

  /**
   * 检查最近的错误
   */
  async checkRecentErrors(limit = 10) {
    try {
      const db = await getDb();
      
      // 尝试从 system_logs 查询
      const logs = await db.execute(sql`
        SELECT id, level, module, message, error, error_constraint, error_table, timestamp
        FROM system_logs
        WHERE level = 'ERROR' 
          AND timestamp > NOW() - INTERVAL '1 hour'
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `);
      
      console.log('\n[诊断] ===== 最近的错误日志 =====');
      if (logs.rows && logs.rows.length > 0) {
        logs.rows.forEach((log, index) => {
          console.log(`${index + 1}. [${log.level}] ${log.module}`);
          console.log(`   时间: ${log.timestamp}`);
          console.log(`   消息: ${log.message}`);
          if (log.error) console.log(`   错误: ${log.error}`);
          if (log.error_constraint) console.log(`   约束: ${log.error_constraint}`);
          if (log.error_table) console.log(`   表: ${log.error_table}`);
          console.log('');
        });
      } else {
        console.log('没有找到最近的错误日志');
      }
      
      return logs.rows || [];
    } catch (error) {
      console.error('[诊断] 查询错误日志失败:', error.message);
      return [];
    }
  }
}

module.exports = new DatabaseDiagnostics();

// 如果直接运行此文件，执行诊断
if (require.main === module) {
  console.log('===== 数据库诊断开始 =====\n');
  
  DatabaseDiagnostics.diagnose()
    .then(() => {
      console.log('\n\n===== 检查最近的错误 =====');
      return DatabaseDiagnostics.checkRecentErrors();
    })
    .then(() => {
      console.log('\n===== 诊断完成 =====');
      process.exit(0);
    })
    .catch(error => {
      console.error('诊断过程出错:', error);
      process.exit(1);
    });
}
