const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions } = require('../database/schema');

(async () => {
  try {
    const db = await getDb();
    const results = await db.select().from(flowDefinitions);
    console.log('Total flows:', results.length);
    results.forEach(f => {
      console.log(`- ${f.name} (id: ${f.id}, isActive: ${f.isActive})`);
    });
  } catch (e) {
    console.error('Error:', e);
  }
})();
