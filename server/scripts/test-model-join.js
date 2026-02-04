require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { aiModels, aiProviders } = require('../database/schema');
const { eq } = require('drizzle-orm');

async function test() {
  const db = await getDb();
  const modelResult = await db
    .select()
    .from(aiModels)
    .leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
    .where(eq(aiModels.id, '45d2b7c7-40ef-4f1e-bed8-c133168f8255'))
    .limit(1);
  
  console.log('Model Result:', JSON.stringify(modelResult[0], null, 2));
  
  const model = modelResult[0];
  console.log('\n--- Field Access ---');
  console.log('Provider name:', model.provider_name);
  console.log('AI providers name:', model.ai_providers_name);
  console.log('All keys:', Object.keys(model));
  
  process.exit(0);
}

test();
