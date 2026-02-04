require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { aiProviders } = require('../database/schema');

async function test() {
  const db = await getDb();
  const providers = await db.select().from(aiProviders).limit(3);
  
  console.log('=== AI Providers ===');
  providers.forEach(p => {
    console.log(`ID: ${p.id}`);
    console.log(`Name: ${p.name}`);
    console.log(`DisplayName: ${p.displayName}`);
    console.log('---');
  });
  
  process.exit(0);
}

test();
