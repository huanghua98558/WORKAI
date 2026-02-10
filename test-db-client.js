const { getDb } = require('coze-coding-dev-sdk');

async function testDbClient() {
  const db = await getDb();

  console.log('db:', db);
  console.log('db._:', db._);
  console.log('db.client:', db.client);
  console.log('db._.client:', db._?.client);
  console.log('db.query:', typeof db.query);
  console.log('db.execute:', typeof db.execute);

  // 尝试获取客户端
  if (db._ && db._.client) {
    console.log('db._.client:', db._.client);
    console.log('db._.client.query:', typeof db._.client.query);
  }

  // 尝试其他方式
  const sql = await getDb();
  console.log('sql:', sql);
  console.log('sql.query:', typeof sql.query);
  console.log('sql.execute:', typeof sql.execute);
}

testDbClient().catch(console.error);
