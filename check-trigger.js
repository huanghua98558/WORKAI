/**
 * 检查触发器状态
 */

const { getDb } = require('coze-coding-dev-sdk');

async function checkTrigger() {
  const db = await getDb();
  const sql = db.session.client;

  console.log('检查触发器状态...\n');

  // 1. 检查触发器函数是否存在
  const funcResult = await sql.query(`
    SELECT proname, prosrc
    FROM pg_proc
    WHERE proname = 'notify_new_message'
  `);

  if (funcResult.rows.length > 0) {
    console.log('✓ 触发器函数存在');
  } else {
    console.log('✗ 触发器函数不存在');
  }

  // 2. 检查触发器是否存在
  const triggerResult = await sql.query(`
    SELECT tgname, tgrelid::regclass AS table_name
    FROM pg_trigger
    WHERE tgname = 'trigger_notify_new_message'
  `);

  if (triggerResult.rows.length > 0) {
    console.log('✓ 触发器存在，表名:', triggerResult.rows[0].table_name);
  } else {
    console.log('✗ 触发器不存在');
  }

  // 3. 检查messages表上的所有触发器
  const tableTriggerResult = await sql.query(`
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'messages'::regclass
  `);

  console.log('\nmessages表上的触发器:');
  if (tableTriggerResult.rows.length > 0) {
    tableTriggerResult.rows.forEach(row => {
      console.log('  -', row.tgname);
    });
  } else {
    console.log('  (无)');
  }

  process.exit(0);
}

checkTrigger().catch(err => {
  console.error('检查失败:', err);
  process.exit(1);
});
