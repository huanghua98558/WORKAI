/**
 * 工作人员协同功能迁移
 * 创建5个新表支持工作人员识别、追踪和协同决策
 */

async function up(db) {
  console.log('[Migration] 开始添加工作人员协同表...');

  try {
    // 1. 工作人员消息表
    await db.execute(`
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
    console.log('[Migration] ✅ staff_messages 表创建成功');

    // 2. 工作人员活动记录表
    await db.execute(`
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
    console.log('[Migration] ✅ staff_activities 表创建成功');

    // 3. 会话工作人员状态表
    await db.execute(`
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
    console.log('[Migration] ✅ session_staff_status 表创建成功');

    // 4. 信息检测历史表
    await db.execute(`
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
    console.log('[Migration] ✅ info_detection_history 表创建成功');

    // 5. 协同决策日志表
    await db.execute(`
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
    console.log('[Migration] ✅ collaboration_decision_logs 表创建成功');

    // 创建索引
    console.log('[Migration] 开始创建索引...');

    // staff_messages 索引
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_staff_messages_session_id ON staff_messages(session_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_staff_messages_staff_user_id ON staff_messages(staff_user_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_staff_messages_created_at ON staff_messages(created_at)`);

    // staff_activities 索引
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_staff_activities_session_id ON staff_activities(session_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_staff_activities_staff_user_id ON staff_activities(staff_user_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_staff_activities_activity_type ON staff_activities(activity_type)`);

    // session_staff_status 索引
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_session_staff_status_session_id ON session_staff_status(session_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_session_staff_status_current_staff ON session_staff_status(current_staff_user_id)`);

    // info_detection_history 索引
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_info_detection_message_id ON info_detection_history(message_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_info_detection_session_id ON info_detection_history(session_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_info_detection_risk_level ON info_detection_history(risk_level)`);

    // collaboration_decision_logs 索引
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_collab_decision_session_id ON collaboration_decision_logs(session_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_collab_decision_created_at ON collaboration_decision_logs(created_at)`);

    console.log('[Migration] ✅ 索引创建完成');
    console.log('[Migration] 🎉 工作人员协同表创建完成');

  } catch (error) {
    console.error('[Migration] ❌ 迁移失败:', error);
    throw error;
  }
}

async function down(db) {
  console.log('[Migration] 开始回滚工作人员协同表...');

  try {
    // 删除表
    await db.execute('DROP TABLE IF EXISTS collaboration_decision_logs CASCADE');
    await db.execute('DROP TABLE IF EXISTS info_detection_history CASCADE');
    await db.execute('DROP TABLE IF EXISTS session_staff_status CASCADE');
    await db.execute('DROP TABLE IF EXISTS staff_activities CASCADE');
    await db.execute('DROP TABLE IF EXISTS staff_messages CASCADE');

    console.log('[Migration] ✅ 回滚完成');
  } catch (error) {
    console.error('[Migration] ❌ 回滚失败:', error);
    throw error;
  }
}

module.exports = { up, down };
