require('dotenv').config();
const { getDb } = require('coze-coding-dev-sdk');
const { aiProviders, aiModels, aiRoles, promptCategoryTemplates } = require('../database/schema');

async function checkDataConsistency() {
  console.log('=== AI模块数据一致性检查 ===\n');
  
  const db = await getDb();
  
  // 检查providers
  const providers = await db.select().from(aiProviders);
  console.log(`1. AI Providers: ${providers.length} 个`);
  providers.forEach(p => {
    console.log(`   - ${p.name} (${p.displayName}): ${p.isEnabled ? '✓' : '✗'}`);
  });
  
  // 检查models
  const models = await db.select().from(aiModels);
  console.log(`\n2. AI Models: ${models.length} 个`);
  models.forEach(m => {
    console.log(`   - ${m.name} (${m.displayName}): ${m.isEnabled ? '✓' : '✗'}, Type: ${m.type}`);
  });
  
  // 检查roles
  const roles = await db.select().from(aiRoles);
  console.log(`\n3. AI Roles: ${roles.length} 个`);
  roles.forEach(r => {
    const defaultMark = r.isDefault ? ' [DEFAULT]' : '';
    console.log(`   - ${r.name}: ${r.isActive ? '✓' : '✗'}${defaultMark}`);
  });
  
  // 检查templates
  const templates = await db.select().from(promptCategoryTemplates);
  console.log(`\n4. Message Templates: ${templates.length} 个`);
  templates.forEach(t => {
    console.log(`   - ${t.categoryName} (${t.category}): ${t.isActive ? '✓' : '✗'}`);
  });
  
  // 检查外键关系
  console.log('\n5. 外键关系检查:');
  const modelsWithInvalidProvider = models.filter(m => !providers.find(p => p.id === m.providerId));
  if (modelsWithInvalidProvider.length > 0) {
    console.log(`   ⚠  ${modelsWithInvalidProvider.length} 个模型的providerId无效`);
  } else {
    console.log('   ✓ 所有模型的providerId都有效');
  }
  
  const rolesWithInvalidModel = roles.filter(r => r.modelId && !models.find(m => m.id === r.modelId));
  if (rolesWithInvalidModel.length > 0) {
    console.log(`   ⚠  ${rolesWithInvalidModel.length} 个角色的modelId无效`);
  } else {
    console.log('   ✓ 所有角色的modelId都有效（或为空）');
  }
  
  console.log('\n=== 检查完成 ===');
  process.exit(0);
}

checkDataConsistency();
