require('dotenv').config();
const {getDb} = require('coze-coding-dev-sdk');
const {flowDefinitions} = require('../database/schema');

(async () => {
  const db = await getDb();
  const flows = await db.select().from(flowDefinitions);
  console.log('数据库中的流程:');
  flows.forEach(f => console.log(`- ${f.id}: ${f.name}`));
})();
