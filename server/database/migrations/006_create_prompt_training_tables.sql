-- Prompt 模板表
CREATE TABLE IF NOT EXISTS prompt_templates (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- intentRecognition, serviceReply, report
  description TEXT,
  system_prompt TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- 支持的变量列表，如 [{name: "userName", description: "用户名称"}]
  version VARCHAR(50) DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS prompt_templates_type_idx ON prompt_templates(type);
CREATE INDEX IF NOT EXISTS prompt_templates_is_active_idx ON prompt_templates(is_active);
CREATE INDEX IF NOT EXISTS prompt_templates_created_at_idx ON prompt_templates(created_at);

-- 添加注释
COMMENT ON TABLE prompt_templates IS 'Prompt 模板表，用于 AI 训练和提示词管理';
COMMENT ON COLUMN prompt_templates.type IS '模板类型：intentRecognition(意图识别), serviceReply(客服回复), report(报告生成)';
COMMENT ON COLUMN prompt_templates.system_prompt IS '系统提示词模板';
COMMENT ON COLUMN prompt_templates.variables IS '支持的变量列表';

-- Prompt 测试记录表
CREATE TABLE IF NOT EXISTS prompt_tests (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  template_id VARCHAR(255) REFERENCES prompt_templates(id) ON DELETE SET NULL,
  test_name VARCHAR(255),
  input_message TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  ai_output TEXT,
  expected_output TEXT,
  actual_intent VARCHAR(50), -- 实际识别的意图
  expected_intent VARCHAR(50), -- 期望识别的意图
  is_correct BOOLEAN,
  rating INTEGER, -- 用户评分 1-5
  feedback TEXT,
  model_id VARCHAR(255),
  temperature NUMERIC(5,2),
  request_duration INTEGER,
  status VARCHAR(50) DEFAULT 'success', -- success, error
  error_message TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS prompt_tests_template_id_idx ON prompt_tests(template_id);
CREATE INDEX IF NOT EXISTS prompt_tests_created_at_idx ON prompt_tests(created_at);
CREATE INDEX IF NOT EXISTS prompt_tests_status_idx ON prompt_tests(status);
CREATE INDEX IF NOT EXISTS prompt_tests_is_correct_idx ON prompt_tests(is_correct);

-- 添加注释
COMMENT ON TABLE prompt_tests IS 'Prompt 测试记录表，用于 AI 对话测试和效果评估';
COMMENT ON COLUMN prompt_tests.template_id IS '关联的模板 ID';
COMMENT ON COLUMN prompt_tests.input_message IS '输入消息';
COMMENT ON COLUMN prompt_tests.variables IS '使用的变量';
COMMENT ON COLUMN prompt_tests.ai_output IS 'AI 输出结果';
COMMENT ON COLUMN prompt_tests.actual_intent IS '实际识别的意图';
COMMENT ON COLUMN prompt_tests.expected_intent IS '期望识别的意图';
COMMENT ON COLUMN prompt_tests.is_correct IS '是否正确（意图识别场景）';
COMMENT ON COLUMN prompt_tests.rating IS '用户评分 1-5';
COMMENT ON COLUMN prompt_tests.feedback IS '用户反馈';

-- 插入默认模板数据
INSERT INTO prompt_templates (id, name, type, description, system_prompt, variables, version, is_active, created_by) VALUES
(
  'default-intent-recognition',
  '默认意图识别模板',
  'intentRecognition',
  '企业微信群消息意图识别默认模板',
  '你是一个企业微信群消息意图识别专家。请分析用户消息并返回意图类型。

意图类型定义：
- chat: 闲聊、问候、日常对话
- service: 服务咨询、问题求助
- help: 帮助请求、使用说明
- risk: 风险内容、敏感话题、恶意攻击
- spam: 垃圾信息、广告、刷屏
- welcome: 欢迎语、新人打招呼
- admin: 管理指令、系统配置

请以 JSON 格式返回结果，包含以下字段：
{
  "intent": "意图类型",
  "needReply": true/false,
  "needHuman": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}',
  '[]'::jsonb,
  '1.0',
  true,
  'system'
),
(
  'default-service-reply',
  '默认客服回复模板',
  'serviceReply',
  '企业微信群客服回复默认模板',
  '你是一个企业微信群客服助手。请根据用户问题和意图，生成专业、友好、自然的回复。

回复要求：
1. 根据意图类型调整回复风格：
   - service/help/welcome: 专业、详细、有耐心
   - chat: 轻松、友好、简短
   - 其他意图: 礼貌、得体
2. 语言简洁明了，控制在 200 字以内（闲聊可以更短）
3. 语气亲切友好，适度使用表情符号增加亲和力
4. 避免敏感词汇和不当内容
5. 闲聊时可以更随意、更活泼
6. 如果需要人工介入，明确提示',
  '[]'::jsonb,
  '1.0',
  true,
  'system'
),
(
  'default-report',
  '默认报告生成模板',
  'report',
  '日终报告生成默认模板',
  '你是一个数据分析师。请根据以下数据生成日终总结报告。

报告要求：
1. 包含关键指标统计（消息数、回复数、人工介入数等）
2. 识别问题和风险
3. 提出改进建议
4. 语言简洁专业',
  '[]'::jsonb,
  '1.0',
  true,
  'system'
)
ON CONFLICT (id) DO NOTHING;
