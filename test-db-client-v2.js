const { getDb } = require('coze-coding-dev-sdk');

async function testDbClientV2() {
  const db = await getDb();

  console.log('1. db:', typeof db);
  console.log('2. db.session:', typeof db.session);
  console.log('3. db.session?.client:', typeof db.session?.client);
  console.log('4. db.client:', typeof db.client);

  if (db.session && db.session.client) {
    console.log('✓ db.session.client 存在');
    console.log('  query:', typeof db.session.client.query);
    console.log('  on:', typeof db.session.client.on);
  }

  if (db.client) {
    console.log('✓ db.client 存在');
    console.log('  query:', typeof db.client.query);
    console.log('  on:', typeof db.client.on);
  }

  // 尝试其他可能的路径
  const keys = Object.keys(db);
  console.log('db 的所有键:', keys);

  keys.forEach(key => {
    const value = db[key];
    if (value && typeof value === 'object') {
      const subKeys = Object.keys(value);
      console.log(`  db.${key}:`, subKeys);
      if (subKeys.includes('client')) {
        console.log(`    db.${key}.client.query:`, typeof value.client.query);
      }
    }
  });
}

testDbClientV2().catch(console.error);
