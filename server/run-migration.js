/**
 * 数据库迁移执行脚本
 * 执行工作人员协同功能的数据库迁移
 */

require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'worktool_ai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runMigration() {
  const pool = new Pool(dbConfig);

  try {
    await pool.connect();
    log('✅ 数据库连接成功', colors.green);
    log('🚀 开始执行迁移...\n', colors.cyan);

    // 1. 工作人员消息表
    log('创建 staff_messages 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_messages (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        message_id VARCHAR(255) NOT NULL UNIQUE,
        staff_user_id VARCHAR(255) NOT NULL,
        staff_name VARCHAR(255),
        content TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'reply',
        is_handling_command BOOLEAN DEFAULT FALSE,
        linked_risk_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT NOW(),
        timestamp TIMESTAMP
      )
    `);
    log('✅ staff_messages 表创建成功', colors.green);

    // 2. 工作人员活动记录表
    log('创建 staff_activities 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_activities (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        staff_user_id VARCHAR(255) NOT NULL,
        staff_name VARCHAR(255),
        activity_type VARCHAR(50) NOT NULL,
        activity_detail TEXT,
        message_id VARCHAR(255),
        risk_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    log('✅ staff_activities 表创建成功', colors.green);

    // 3. 会话工作人员状态表
    log('创建 session_staff_status 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_staff_status (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL UNIQUE,
        has_staff_participated BOOLEAN DEFAULT FALSE,
        current_staff_user_id VARCHAR(255),
        staff_join_time TIMESTAMP,
        staff_leave_time TIMESTAMP,
        staff_message_count INTEGER DEFAULT 0,
        last_staff_activity TIMESTAMP,
        collaboration_mode VARCHAR(50) DEFAULT 'adaptive',
        ai_reply_strategy VARCHAR(50) DEFAULT 'normal',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    log('✅ session_staff_status 表创建成功', colors.green);

    // 4. 信息检测历史表
    log('创建 info_detection_history 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS info_detection_history (
        id VARCHAR(36) PRIMARY KEY,
        message_id VARCHAR(255) NOT NULL UNIQUE,
        session_id VARCHAR(255) NOT NULL,
        has_risk BOOLEAN DEFAULT FALSE,
        risk_level VARCHAR(20),
        risk_score DECIMAL(3,2),
        satisfaction_level VARCHAR(20),
        satisfaction_score DECIMAL(3,2),
        sentiment VARCHAR(20),
        sentiment_confidence DECIMAL(3,2),
        urgency_level VARCHAR(20),
        urgency_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    log('✅ info_detection_history 表创建成功', colors.green);

    // 5. 协同决策日志表
    log('创建 collaboration_decision_logs 表...', colors.yellow);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collaboration_decision_logs (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        message_id VARCHAR(255),
        robot_id VARCHAR(255),
        should_ai_reply BOOLEAN,
        ai_action VARCHAR(50),
        staff_action VARCHAR(50),
        priority VARCHAR(20),
        reason VARCHAR(255),
        staff_context TEXT,
        info_context TEXT,
        strategy TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    log('✅ collaboration_decision_logs 表创建成功', colors.green);

    // 创建索引
    log('\n创建索引...', colors.yellow);

    // staff_messages 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_messages_session_id ON staff_messages(session_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_messages_staff_user_id ON staff_messages(staff_user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_messages_created_at ON staff_messages(created_at)`);

    // staff_activities 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_activities_session_id ON staff_activities(session_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_activities_staff_user_id ON staff_activities(staff_user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_activities_activity_type ON staff_activities(activity_type)`);

    // session_staff_status 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_staff_status_session_id ON session_staff_status(session_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_staff_status_current_staff ON session_staff_status(current_staff_user_id)`);

    // info_detection_history 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_info_detection_message_id ON info_detection_history(message_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_info_detection_session_id ON info_detection_history(session_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_info_detection_risk_level ON info_detection_history(risk_level)`);

    // collaboration_decision_logs 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_collab_decision_session_id ON collaboration_decision_logs(session_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_collab_decision_created_at ON collaboration_decision_logs(created_at)`);

    log('✅ 索引创建完成', colors.green);

    log('\n🎉 数据库迁移完成！', colors.green);
    log('📊 已创建 5 个新表和 13 个索引', colors.cyan);
    process.exit(0);

  } catch (error) {
    log('\n❌ 迁移失败:', colors.red);
    log(error.message, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 运行迁移
runMigration();
