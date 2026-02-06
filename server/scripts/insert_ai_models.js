const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user_7602223693946847251:c433b5c4-bfd9-4d56-96ff-0c1ebe281064@cp-magic-foam-59c291ea.pg4.aidap-global.cn-beijing.volces.com:5432/Database_1770032307116?sslmode=require'
});

async function insertData() {
  const client = await pool.connect();

  try {
    // 1. 插入 AI 提供商
    console.log('📝 插入 AI 提供商...');
    const providerResult = await client.query(`
      INSERT INTO ai_providers (id, name, display_name, type, api_key, api_endpoint, is_enabled, priority, rate_limit, description)
      VALUES
        ($1, 'doubao', '豆包大模型', 'builtin', NULL, 'https://ark.cn-beijing.volces.com/api/v3', true, 10, 60, '字节跳动豆包大模型，支持意图识别、对话、报告生成等多种能力'),
        ($2, 'deepseek', 'DeepSeek', 'builtin', NULL, 'https://api.deepseek.com', true, 20, 60, 'DeepSeek大模型，强大的推理能力，适合复杂任务处理'),
        ($3, 'kimi', 'Kimi', 'builtin', NULL, 'https://api.moonshot.cn', true, 30, 60, 'Kimi大模型，长文本处理能力强，适合报告生成和长对话')
      RETURNING id, name
    `, [require('crypto').randomUUID(), require('crypto').randomUUID(), require('crypto').randomUUID()]);

    console.log('✅ AI 提供商插入成功:', providerResult.rows);

    // 获取提供商 ID
    const doubaoProvider = providerResult.rows.find(r => r.name === 'doubao');
    const deepseekProvider = providerResult.rows.find(r => r.name === 'deepseek');
    const kimiProvider = providerResult.rows.find(r => r.name === 'kimi');

    if (!doubaoProvider || !deepseekProvider || !kimiProvider) {
      throw new Error('无法获取提供商 ID');
    }

    // 2. 插入 AI 模型
    console.log('📝 插入 AI 模型...');
    const modelResult = await client.query(`
      INSERT INTO ai_models (provider_id, name, display_name, model_id, type, capabilities, max_tokens, is_enabled, priority, description)
      VALUES
        ($1, 'doubao-pro-4k-intent', '豆包 Pro 4K - 意图识别', 'doubao-pro-4k-241515', 'intent_recognition', '["intent_recognition", "classification", "text_analysis"]'::jsonb, 4000, true, 10, '豆包Pro 4K模型，专门用于意图识别，速度快、成本低'),
        ($2, 'doubao-pro-32k-reply', '豆包 Pro 32K - 服务回复', 'doubao-pro-32k-241515', 'service_reply', '["service_reply", "chat", "conversation", "multi_turn"]'::jsonb, 32000, true, 10, '豆包Pro 32K模型，大上下文窗口，适合多轮对话和服务回复'),
        ($3, 'deepseek-v3-conversion', 'DeepSeek V3 - 转化客服', 'deepseek-v3', 'conversion', '["conversion", "reasoning", "persuasion", "analysis"]'::jsonb, 32000, true, 20, 'DeepSeek V3模型，强大的推理和说服能力，适合转化客服场景'),
        ($4, 'kimi-k2-report', 'Kimi K2 - 报告生成', 'kimi-k2-250905', 'report', '["report", "long_text", "analysis", "summary"]'::jsonb, 128000, true, 30, 'Kimi K2模型，长文本处理能力极强，适合报告生成、文档分析等场景'),
        ($5, 'doubao-pro-32k-general', '豆包 Pro 32K - 通用对话', 'doubao-pro-32k-241515', 'general', '["chat", "conversation", "multi_turn", "intent_recognition", "service_reply", "report"]'::jsonb, 32000, true, 15, '豆包Pro 32K模型，综合能力强，适合各种通用对话场景'),
        ($6, 'deepseek-r1-tech', 'DeepSeek R1 - 技术支持', 'deepseek-r1-250528', 'tech_support', '["tech_support", "reasoning", "coding", "problem_solving"]'::jsonb, 64000, true, 25, 'DeepSeek R1模型，强大的推理和问题解决能力，适合技术支持场景')
      RETURNING id, name
    `, [
      doubaoProvider.id,
      doubaoProvider.id,
      deepseekProvider.id,
      kimiProvider.id,
      doubaoProvider.id,
      deepseekProvider.id
    ]);

    console.log('✅ AI 模型插入成功:', modelResult.rows);

    console.log('🎉 所有数据插入成功！');
  } catch (error) {
    console.error('❌ 数据插入失败:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

insertData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 执行失败:', error);
    process.exit(1);
  });
