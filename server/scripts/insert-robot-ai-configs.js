const { Pool } = require('pg');

async function insertRobotAIConfigs() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://user_7602223693946847251:c433b5c4-bfd9-4d56-96ff-0c1ebe281064@cp-magic-foam-59c291ea.pg4.aidap-global.cn-beijing.volces.com:5432/Database_1770032307116?sslmode=require';

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    console.log('查询可用的 AI 模型...');

    // 查询可用的模型
    const modelResult = await pool.query(`
      SELECT id, name, model_id, type
      FROM ai_models
      WHERE is_enabled = true
      ORDER BY priority ASC
      LIMIT 3
    `);

    if (modelResult.rows.length === 0) {
      console.warn('⚠️ 未找到可用的 AI 模型，将使用默认模型 ID');
    }

    console.log(`找到 ${modelResult.rows.length} 个可用模型:`);
    modelResult.rows.forEach(model => {
      console.log(`  - ${model.name} (${model.model_id})`);
    });

    // 使用第一个可用模型，如果没有则使用默认 ID
    const defaultModelId = modelResult.rows.length > 0 ? modelResult.rows[0].id : null;

    console.log('\n插入测试机器人配置...');

    // 定义测试机器人配置
    const robotConfigs = [
      {
        robot_id: 'test-robot-001',
        robot_name: '测试机器人 001 - 客户服务',
        intent_model_id: defaultModelId,
        intent_system_prompt: '你是一个专业的意图识别助手。请分析用户的输入，识别其意图。\n\n可能的意图包括：\n- inquiry: 咨询类问题（价格、功能、使用方法等）\n- complaint: 投诉类问题（服务不满、产品问题等）\n- technical: 技术支持类问题（故障排查、技术疑问等）\n- administrative: 行政类问题（账户、订单、退款等）\n- appointment: 预约类问题（预约服务、安排时间等）\n- casual: 闲聊类问题（问候、感谢、其他非业务话题）\n\n请只返回 JSON 格式的结果：{"intent": "xxx", "confidence": 0.xx}',
        intent_temperature: 0.5,
        intent_confidence_threshold: 0.6,
        sentiment_model_id: defaultModelId,
        sentiment_system_prompt: '你是一个情感分析助手。请分析用户文本的情感倾向。\n\n可能的情感包括：\n- positive: 积极情感（满意、赞美、开心等）\n- neutral: 中性情感（平静、客观、中性等）\n- negative: 消极情感（不满、抱怨、失望等）\n- angry: 愤怒情感（愤怒、怒骂、威胁等）\n\n请只返回 JSON 格式的结果：{"sentiment": "xxx", "score": 0.xx}',
        sentiment_temperature: 0.3,
        enabled: true,
        priority: 10,
        description: '测试用客户服务机器人配置'
      },
      {
        robot_id: 'test-robot-002',
        robot_name: '测试机器人 002 - 技术支持',
        intent_model_id: defaultModelId,
        intent_system_prompt: '你是一个技术支持意图识别助手。专门识别技术相关的意图。',
        intent_temperature: 0.4,
        intent_confidence_threshold: 0.7,
        sentiment_model_id: defaultModelId,
        sentiment_system_prompt: '你是一个技术支持情感分析助手。分析用户的技术问题中的情绪状态。',
        sentiment_temperature: 0.2,
        enabled: true,
        priority: 15,
        description: '测试用技术支持机器人配置'
      }
    ];

    let insertedCount = 0;

    for (const config of robotConfigs) {
      try {
        // 检查是否已存在
        const existing = await pool.query(
          'SELECT id FROM robot_ai_configs WHERE robot_id = $1',
          [config.robot_id]
        );

        if (existing.rows.length > 0) {
          console.log(`⏭️  机器人 ${config.robot_id} 已存在，跳过`);
          continue;
        }

        // 插入配置
        await pool.query(
          `INSERT INTO robot_ai_configs (
            robot_id, robot_name, intent_model_id, intent_system_prompt,
            intent_temperature, intent_confidence_threshold, sentiment_model_id,
            sentiment_system_prompt, sentiment_temperature, enabled, priority, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            config.robot_id,
            config.robot_name,
            config.intent_model_id,
            config.intent_system_prompt,
            config.intent_temperature,
            config.intent_confidence_threshold,
            config.sentiment_model_id,
            config.sentiment_system_prompt,
            config.sentiment_temperature,
            config.enabled,
            config.priority,
            config.description
          ]
        );

        console.log(`✅ 成功插入机器人配置: ${config.robot_name}`);
        insertedCount++;
      } catch (error) {
        console.error(`❌ 插入机器人配置失败 (${config.robot_id}):`, error.message);
      }
    }

    console.log(`\n🎉 完成！共插入 ${insertedCount} 个机器人配置`);

    // 验证插入
    const verifyResult = await pool.query('SELECT COUNT(*) FROM robot_ai_configs');
    console.log(`📊 当前机器人配置总数: ${verifyResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ 操作失败:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

insertRobotAIConfigs();
