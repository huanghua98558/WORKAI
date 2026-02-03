/**
 * 消息保存失败时的详细诊断和错误处理
 */

const DatabaseDiagnostics = require('../lib/database-diagnostics');

async function diagnoseAndHandleSaveError(error, context) {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    errorType: error.constructor.name,
    errorMessage: error.message,
    errorCode: error.code,
    errorConstraint: error.constraint,
    errorTable: error.table,
    errorDetail: error.detail,
    errorSchema: error.schema,
    errorColumn: error.column,
    context: context,
    suggestions: []
  };

  console.error('\n[诊断] ===== 消息保存失败诊断 =====');
  console.error('[诊断] 错误类型:', diagnosis.errorType);
  console.error('[诊断] 错误消息:', diagnosis.errorMessage);
  
  // 根据错误类型提供诊断建议
  if (error.constraint) {
    console.error('[诊断] 违反约束:', error.constraint);
    diagnosis.suggestions.push({
      type: 'constraint',
      constraint: error.constraint,
      suggestion: getConstraintSuggestion(error.constraint)
    });
  }

  if (error.table) {
    console.error('[诊断] 表名:', error.table);
  }

  if (error.code === '23502') {
    // NOT NULL 违反
    console.error('[诊断] 非空约束违反');
    diagnosis.suggestions.push({
      type: 'not_null',
      suggestion: '检查必填字段：content, sessionId, timestamp'
    });
  }

  if (error.code === '22001') {
    // 字符串长度超限
    console.error('[诊断] 字符串长度超限');
    diagnosis.suggestions.push({
      type: 'length_exceeded',
      suggestion: '检查字段长度：sessionId(255), robotId(64), robotName(255)'
    });
  }

  if (error.code === '23505') {
    // 唯一约束违反
    console.error('[诊断] 唯一约束违反');
    diagnosis.suggestions.push({
      type: 'unique',
      suggestion: '检查是否有重复的 ID'
    });
  }

  // 打印上下文信息
  console.error('[诊断] 上下文信息:');
  console.error('  sessionId:', context.sessionId, '(长度:', context.sessionId?.length, ')');
  console.error('  robotId:', context.robotId, '(长度:', context.robotId?.length, ')');
  console.error('  robotName:', context.robotName, '(长度:', context.robotName?.length, ')');
  console.error('  content:', context.content?.substring(0, 50), '(长度:', context.content?.length, ')');
  console.error('  timestamp:', context.timestamp);
  console.error('  timestampType:', typeof context.timestamp);

  // 运行数据库诊断
  console.error('\n[诊断] 运行数据库诊断...');
  try {
    const dbResults = await DatabaseDiagnostics.diagnose();
    diagnosis.databaseDiagnostics = dbResults;
  } catch (diagError) {
    console.error('[诊断] 数据库诊断失败:', diagError.message);
    diagnosis.databaseDiagnosticsError = diagError.message;
  }

  console.error('[诊断] ===== 诊断完成 =====\n');

  return diagnosis;
}

function getConstraintSuggestion(constraint) {
  const suggestions = {
    'session_messages_session_id_idx': 'sessionId 已存在，可能重复',
    'session_messages_pkey': '主键冲突，可能重复的 ID',
    'session_messages_robot_id_idx': 'robotId 已存在',
    'not_null_constraint': '必填字段为空'
  };
  
  // 查找匹配的建议
  for (const [key, value] of Object.entries(suggestions)) {
    if (constraint.includes(key)) {
      return value;
    }
  }
  
  return '未知约束，检查字段值';
}

module.exports = {
  diagnoseAndHandleSaveError,
  getConstraintSuggestion
};
