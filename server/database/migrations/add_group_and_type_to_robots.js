/**
 * 数据库迁移：为 robots 表添加 robotGroup 和 robotType 字段
 * 支持机器人分组和类型配置
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');

async function up() {
  console.log('开始执行迁移：为 robots 表添加 robotGroup 和 robotType 字段...');

  const db = await getDb();

  try {
    // 检查 robotGroup 字段是否已存在
    const checkGroup = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'robots'
      AND column_name = 'robot_group'
    `);

    if (checkGroup.rows && checkGroup.rows.length > 0) {
      console.log('✅ robotGroup 字段已存在，跳过');
    } else {
      await db.execute(sql`
        ALTER TABLE robots
        ADD COLUMN robot_group VARCHAR(50) DEFAULT NULL
      `);
      console.log('✅ 成功添加 robot_group 字段');

      // 添加注释
      await db.execute(sql`
        COMMENT ON COLUMN robots.robot_group IS '机器人分组（如：营销、服务、技术支持等）'
      `);
    }

    // 检查 robotType 字段是否已存在
    const checkType = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'robots'
      AND column_name = 'robot_type'
    `);

    if (checkType.rows && checkType.rows.length > 0) {
      console.log('✅ robotType 字段已存在，跳过');
    } else {
      await db.execute(sql`
        ALTER TABLE robots
        ADD COLUMN robot_type VARCHAR(50) DEFAULT NULL
      `);
      console.log('✅ 成功添加 robot_type 字段');

      // 添加注释
      await db.execute(sql`
        COMMENT ON COLUMN robots.robot_type IS '机器人类型（如：角色、助手、客服等）'
      `);
    }

    console.log('\n🎉 迁移完成！');
    console.log('   - 当 robotGroup = "营销" 或 robotType = "角色" 时，强制使用转化客服 AI');

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  }
}

async function down() {
  console.log('开始回滚迁移：删除 robots 表的 robotGroup 和 robotType 字段...');

  const db = await getDb();

  try {
    await db.execute(sql`
      ALTER TABLE robots
      DROP COLUMN IF EXISTS robot_group
    `);
    console.log('✅ 成功删除 robot_group 字段');

    await db.execute(sql`
      ALTER TABLE robots
      DROP COLUMN IF EXISTS robot_type
    `);
    console.log('✅ 成功删除 robot_type 字段');

    console.log('\n✅ 回滚完成！');

  } catch (error) {
    console.error('❌ 回滚失败:', error);
    throw error;
  }
}

module.exports = { up, down };

// 如果直接运行此文件
if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    try {
      if (command === 'up') {
        await up();
        process.exit(0);
      } else if (command === 'down') {
        await down();
        process.exit(0);
      } else {
        console.log('用法: node add_group_and_type_to_robots.js [up|down]');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ 执行失败:', error);
      process.exit(1);
    }
  })();
}
