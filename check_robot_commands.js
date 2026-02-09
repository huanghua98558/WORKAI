const { getDb } = require('coze-coding-dev-sdk');
const { robotCommands } = require('./server/database/schema');
const { gt } = require('drizzle-orm');

async function checkRobotCommands() {
  try {
    const db = await getDb();
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    
    const commands = await db.select()
      .from(robotCommands)
      .where(
        gt(robotCommands.createdAt, oneMinuteAgo)
      )
      .orderBy(robotCommands.createdAt);

    console.log('\n========================================');
    console.log('📊 最近1分钟的机器人指令记录');
    console.log('========================================');
    
    if (commands.length === 0) {
      console.log('❌ 没有找到最近1分钟的机器人指令记录');
    } else {
      console.log(`✅ 找到 ${commands.length} 条机器人指令记录：\n`);
      commands.forEach((cmd, index) => {
        console.log(`${index + 1}. 指令 ID: ${cmd.id}`);
        console.log(`   机器人 ID: ${cmd.robotId}`);
        console.log(`   指令类型: ${cmd.commandType}`);
        console.log(`   状态: ${cmd.status}`);
        console.log(`   内容: ${JSON.stringify(cmd.commandData).substring(0, 100)}`);
        console.log(`   创建时间: ${cmd.createdAt}`);
        if (cmd.responseData) {
          console.log(`   响应: ${JSON.stringify(cmd.responseData).substring(0, 100)}`);
        }
        console.log('   ----------------------------------------');
      });
    }
    
    console.log('========================================\n');
    
    process.exit(commands.length > 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }
}

checkRobotCommands();
