const { getDb } = require('coze-coding-dev-sdk');
const { robots } = require('/workspace/projects/server/database/schema');
const { eq } = require('drizzle-orm');

async function getRobotConfig() {
  try {
    const db = await getDb();
    const robot = await db.select()
      .from(robots)
      .where(eq(robots.robotId, 'wt22phhjpt2xboerspxsote472xdnyq2'))
      .limit(1);

    if (robot.length === 0) {
      console.log('❌ 机器人不存在');
      return null;
    }

    console.log('✅ 机器人配置：');
    console.log(JSON.stringify(robot[0], null, 2));

    return robot[0];
  } catch (error) {
    console.error('❌ 查询失败:', error);
    return null;
  }
}

getRobotConfig().then(config => {
  process.exit(config ? 0 : 1);
});
