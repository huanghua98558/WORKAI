-- ============================================
-- WorkTool AI 2.1 - 插入内置AI模型数据
-- Migration: 011_insert_builtin_ai_models.sql
-- ============================================

-- 插入AI提供商配置
INSERT INTO ai_providers (id, name, display_name, type, api_key, api_endpoint, is_enabled, priority, rate_limit, description)
VALUES
  (gen_random_uuid(), 'doubao', '豆包大模型', 'builtin', NULL, 'https://ark.cn-beijing.volces.com/api/v3', true, 10, 60, '字节跳动豆包大模型，支持意图识别、对话、报告生成等多种能力'),
  (gen_random_uuid(), 'deepseek', 'DeepSeek', 'builtin', NULL, 'https://api.deepseek.com', true, 20, 60, 'DeepSeek大模型，强大的推理能力，适合复杂任务处理'),
  (gen_random_uuid(), 'kimi', 'Kimi', 'builtin', NULL, 'https://api.moonshot.cn', true, 30, 60, 'Kimi大模型，长文本处理能力强，适合报告生成和长对话');

-- 插入AI模型配置
-- 1. 意图识别模型（轻量快速）
INSERT INTO ai_models (provider_id, name, display_name, model_id, type, capabilities, max_tokens, is_enabled, priority, description)
SELECT 
  id, 
  'doubao-pro-4k-intent', 
  '豆包 Pro 4K - 意图识别', 
  'doubao-pro-4k-241515',
  'intent_recognition',
  '["intent_recognition", "classification", "text_analysis"]'::jsonb,
  4000,
  true,
  10,
  '豆包Pro 4K模型，专门用于意图识别，速度快、成本低'
FROM ai_providers WHERE name = 'doubao'
ON CONFLICT DO NOTHING;

-- 2. 服务回复模型（大上下文，适合对话）
INSERT INTO ai_models (provider_id, name, display_name, model_id, type, capabilities, max_tokens, is_enabled, priority, description)
SELECT 
  id, 
  'doubao-pro-32k-reply', 
  '豆包 Pro 32K - 服务回复', 
  'doubao-pro-32k-241515',
  'service_reply',
  '["service_reply", "chat", "conversation", "multi_turn"]'::jsonb,
  32000,
  true,
  10,
  '豆包Pro 32K模型，大上下文窗口，适合多轮对话和服务回复'
FROM ai_providers WHERE name = 'doubao'
ON CONFLICT DO NOTHING;

-- 3. 转化客服模型（推理能力强）
INSERT INTO ai_models (provider_id, name, display_name, model_id, type, capabilities, max_tokens, is_enabled, priority, description)
SELECT 
  id, 
  'deepseek-v3-conversion', 
  'DeepSeek V3 - 转化客服', 
  'deepseek-v3',
  'conversion',
  '["conversion", "reasoning", "persuasion", "analysis"]'::jsonb,
  32000,
  true,
  20,
  'DeepSeek V3模型，强大的推理和说服能力，适合转化客服场景'
FROM ai_providers WHERE name = 'deepseek'
ON CONFLICT DO NOTHING;

-- 4. 报告生成模型（长文本能力强）
INSERT INTO ai_models (provider_id, name, display_name, model_id, type, capabilities, max_tokens, is_enabled, priority, description)
SELECT 
  id, 
  'kimi-k2-report', 
  'Kimi K2 - 报告生成', 
  'kimi-k2-250905',
  'report',
  '["report", "long_text", "analysis", "summary"]'::jsonb,
  128000,
  true,
  30,
  'Kimi K2模型，长文本处理能力极强，适合报告生成、文档分析等场景'
FROM ai_providers WHERE name = 'kimi'
ON CONFLICT DO NOTHING;

-- 5. 通用对话模型（综合能力强）
INSERT INTO ai_models (provider_id, name, display_name, model_id, type, capabilities, max_tokens, is_enabled, priority, description)
SELECT 
  id, 
  'doubao-pro-32k-general', 
  '豆包 Pro 32K - 通用对话', 
  'doubao-pro-32k-241515',
  'general',
  '["chat", "conversation", "multi_turn", "intent_recognition", "service_reply", "report"]'::jsonb,
  32000,
  true,
  15,
  '豆包Pro 32K模型，综合能力强，适合各种通用对话场景'
FROM ai_providers WHERE name = 'doubao'
ON CONFLICT DO NOTHING;

-- 6. 技术支持模型（专业能力强）
INSERT INTO ai_models (provider_id, name, display_name, model_id, type, capabilities, max_tokens, is_enabled, priority, description)
SELECT 
  id, 
  'deepseek-r1-tech', 
  'DeepSeek R1 - 技术支持', 
  'deepseek-r1-250528',
  'tech_support',
  '["tech_support", "reasoning", "coding", "problem_solving"]'::jsonb,
  64000,
  true,
  25,
  'DeepSeek R1模型，强大的推理和问题解决能力，适合技术支持场景'
FROM ai_providers WHERE name = 'deepseek'
ON CONFLICT DO NOTHING;

-- 插入AI角色配置（7个预设角色）
-- 1. 社群运营机器人
INSERT INTO ai_roles (name, type, category, description, system_prompt, temperature, max_tokens, is_active, is_default) VALUES
('社群运营机器人', 'community', '社群运营', '负责社群管理、用户互动、活动推广', 
E'你是一个专业的社群运营助手，负责：
1. 热情欢迎新成员加入
2. 引导用户了解社群规则和价值
3. 组织和推广社群活动
4. 回答社群相关问题
5. 维护社群良好氛围
6. 识别和引导活跃用户
7. 处理社群冲突和违规行为
8. 收集用户反馈和建议

请用友好、热情的语气回复，保持积极正向的态度。', 
0.8, 2000, true, true),
-- 2. 售后处理机器人
('售后处理机器人', 'service', '售后', '负责售后咨询、问题处理、投诉建议',
E'你是一个专业的售后客服，负责：
1. 耐心倾听用户问题
2. 提供专业的解决方案
3. 跟进问题处理进度
4. 收集用户反馈
5. 提升用户满意度
6. 处理投诉和退货退款
7. 记录用户问题和解决方案
8. 统计常见问题并反馈给产品团队

请用专业、耐心的语气回复，优先解决用户问题。', 
0.7, 2000, true, true),
-- 3. 转化客服机器人
('转化客服机器人', 'conversion', '转化', '负责用户转化、营销推广、引导下单',
E'你是一个专业的转化客服，负责：
1. 了解用户需求和痛点
2. 介绍产品优势和价值
3. 引导用户下单购买
4. 解答购买相关疑问
5. 提升转化率
6. 适时制造购买紧迫感
7. 引用其他用户的成功案例
8. 推荐合适的优惠活动

请用热情、专业的语气回复，重点关注转化效果。', 
0.9, 2000, true, true),
-- 4. 技术支持机器人
('技术支持机器人', 'tech_support', '技术支持', '负责技术咨询、故障排查、使用指导',
E'你是一个专业的技术支持工程师，负责：
1. 解答技术问题
2. 排查故障原因
3. 提供解决方案
4. 指导正确使用方法
5. 持续优化技术文档
6. 记录常见问题和解决方案
7. 收集用户使用反馈
8. 协助产品改进

请用专业、准确的语气回复，提供具体可执行的解决方案。', 
0.5, 2000, true, true),
-- 5. 产品咨询机器人
('产品咨询机器人', 'product_info', '产品咨询', '负责产品介绍、功能说明、对比分析',
E'你是一个专业的产品顾问，负责：
1. 介绍产品功能
2. 说明产品优势
3. 对比产品差异
4. 推荐合适产品
5. 解答产品疑问
6. 提供产品使用建议
7. 收集产品需求
8. 反馈产品改进建议

请用专业、客观的语气回复，提供准确的产品信息。', 
0.6, 2000, true, true),
-- 6. 客户关系机器人
('客户关系机器人', 'customer_relation', '客户关系', '负责客户维护、满意度调查、回访',
E'你是一个专业的客户关系管理专员，负责：
1. 维护客户关系
2. 进行满意度调查
3. 定期客户回访
4. 收集客户反馈
5. 提升客户满意度
6. 识别VIP客户并提供专属服务
7. 处理客户投诉和建议
8. 提供客户关怀

请用亲切、关怀的语气回复，关注客户体验。', 
0.7, 2000, true, true),
-- 7. 智能助手机器人
('智能助手机器人', 'assistant', '通用助手', '负责通用问答、任务处理、日程管理',
E'你是一个智能助手，负责：
1. 回答通用问题
2. 处理日常任务
3. 管理日程安排
4. 提供信息查询
5. 辅助用户决策
6. 提醒重要事项
7. 整理和总结信息
8. 提供个性化建议

请用友好、智能的语气回复，提供有价值的信息。', 
0.7, 2000, true, true)
ON CONFLICT (name) DO NOTHING;

-- 更新ai_roles表，添加model_id字段关联
-- 意图识别使用豆包Pro 4K
UPDATE ai_roles 
SET model_id = (SELECT id FROM ai_models WHERE model_id = 'doubao-pro-4k-241515' LIMIT 1)
WHERE name IN ('社群运营机器人', '售后处理机器人', '转化客服机器人', '技术支持机器人', '产品咨询机器人', '客户关系机器人', '智能助手机器人');

-- 报告生成使用Kimi K2
UPDATE ai_roles 
SET model_id = (SELECT id FROM ai_models WHERE model_id = 'kimi-k2-250905' LIMIT 1)
WHERE type = 'report';

-- 添加注释
COMMENT ON TABLE ai_models IS 'AI模型配置表 - 内置6个模型，覆盖意图识别、服务回复、转化、报告生成、通用对话、技术支持';
COMMENT ON TABLE ai_roles IS 'AI角色配置表 - 内置7个预设角色';

-- 完成标记
DO $$
BEGIN
  RAISE NOTICE '内置AI模型和角色数据插入成功';
  RAISE NOTICE '模型数量: 6 (意图识别、服务回复、转化、报告生成、通用对话、技术支持)';
  RAISE NOTICE '角色数量: 7 (社群运营、售后处理、转化客服、技术支持、产品咨询、客户关系、智能助手)';
END $$;
