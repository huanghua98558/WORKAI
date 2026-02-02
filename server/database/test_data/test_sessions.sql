-- 测试会话数据插入脚本
-- 用于测试会话显示功能

-- 注意：这会插入测试数据到 session_messages 表

-- 插入测试会话1：用户提问 + 机器人回复
INSERT INTO session_messages (id, session_id, message_id, user_id, group_id, user_name, group_name, robot_id, robot_name, content, is_from_user, is_from_bot, is_human, intent, confidence, timestamp, created_at) VALUES
('test_msg_001', '测试群_用户A', 'msg_001', 'user_a', '测试群', '用户A', '测试群', 'robot_001', '智能客服机器人', '你好，请问有什么可以帮助您的？', false, true, false, 'welcome', 95, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes'),
('test_msg_002', '测试群_用户A', 'msg_002', 'user_a', '测试群', '用户A', '测试群', 'robot_001', '智能客服机器人', '我想要查询产品信息', true, false, false, 'service', 88, NOW() - INTERVAL '9 minutes', NOW() - INTERVAL '9 minutes'),
('test_msg_003', '测试群_用户A', 'msg_003', 'user_a', '测试群', '用户A', '测试群', 'robot_001', '智能客服机器人', '好的，请问您想了解哪类产品？我们有电子产品、家居用品等。', false, true, false, 'service', 92, NOW() - INTERVAL '8 minutes', NOW() - INTERVAL '8 minutes'),
('test_msg_004', '测试群_用户A', 'msg_004', 'user_a', '测试群', '用户A', '测试群', 'robot_001', '智能客服机器人', '我想了解一下电子产品的价格', true, false, false, 'service', 90, NOW() - INTERVAL '7 minutes', NOW() - INTERVAL '7 minutes'),
('test_msg_005', '测试群_用户A', 'msg_005', 'user_a', '测试群', '用户A', '测试群', 'robot_001', '智能客服机器人', '我们的电子产品价格范围在500-5000元不等，具体取决于产品的型号和配置。您对哪类产品比较感兴趣？', false, true, false, 'service', 94, NOW() - INTERVAL '6 minutes', NOW() - INTERVAL '6 minutes');

-- 插入测试会话2：闲聊场景
INSERT INTO session_messages (id, session_id, message_id, user_id, group_id, user_name, group_name, robot_id, robot_name, content, is_from_user, is_from_bot, is_human, intent, confidence, timestamp, created_at) VALUES
('test_msg_006', '工作交流群_用户B', 'msg_006', 'user_b', '工作交流群', '用户B', '工作交流群', 'robot_001', '智能客服机器人', '今天天气真好', true, false, false, 'chat', 85, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),
('test_msg_007', '工作交流群_用户B', 'msg_007', 'user_b', '工作交流群', '用户B', '工作交流群', 'robot_001', '智能客服机器人', '是啊！天气好的时候心情也会变好呢。今天有什么特别安排吗？', false, true, false, 'chat', 82, NOW() - INTERVAL '14 minutes', NOW() - INTERVAL '14 minutes');

-- 插入测试会话3：帮助请求场景
INSERT INTO session_messages (id, session_id, message_id, user_id, group_id, user_name, group_name, robot_id, robot_name, content, is_from_user, is_from_bot, is_human, intent, confidence, timestamp, created_at) VALUES
('test_msg_008', '客服群_用户C', 'msg_008', 'user_c', '客服群', '用户C', '客服群', 'robot_001', '智能客服机器人', '我遇到了一个技术问题', true, false, false, 'help', 91, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes'),
('test_msg_009', '客服群_用户C', 'msg_009', 'user_c', '客服群', '用户C', '客服群', 'robot_001', '智能客服机器人', '请您详细描述一下遇到的问题，我会尽力帮您解决。', false, true, false, 'help', 89, NOW() - INTERVAL '19 minutes', NOW() - INTERVAL '19 minutes'),
('test_msg_010', '客服群_用户C', 'msg_010', 'user_c', '客服群', '用户C', '客服群', 'robot_001', '智能客服机器人', '系统登录总是失败，显示错误代码500', true, false, false, 'help', 93, NOW() - INTERVAL '18 minutes', NOW() - INTERVAL '18 minutes'),
('test_msg_011', '客服群_用户C', 'msg_011', 'user_c', '客服群', '用户C', '客服群', 'robot_001', '智能客服机器人', '错误代码500通常是服务器内部错误。建议您：1. 清除浏览器缓存后重试 2. 检查网络连接 3. 如果问题持续，请联系技术支持。', false, true, false, 'help', 96, NOW() - INTERVAL '17 minutes', NOW() - INTERVAL '17 minutes');

-- 插入测试会话4：多轮对话
INSERT INTO session_messages (id, session_id, message_id, user_id, group_id, user_name, group_name, robot_id, robot_name, content, is_from_user, is_from_bot, is_human, intent, confidence, timestamp, created_at) VALUES
('test_msg_012', '技术支持群_用户D', 'msg_012', 'user_d', '技术支持群', '用户D', '技术支持群', 'robot_001', '智能客服机器人', '如何使用API接口？', true, false, false, 'help', 87, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
('test_msg_013', '技术支持群_用户D', 'msg_013', 'user_d', '技术支持群', '用户D', '技术支持群', 'robot_001', '智能客服机器人', 'API接口使用文档已经更新，您可以访问文档中心查看详细说明。需要我提供文档链接吗？', false, true, false, 'help', 90, NOW() - INTERVAL '29 minutes', NOW() - INTERVAL '29 minutes'),
('test_msg_014', '技术支持群_用户D', 'msg_014', 'user_d', '技术支持群', '用户D', '技术支持群', 'robot_001', '智能客服机器人', '是的，请提供链接', true, false, false, 'chat', 92, NOW() - INTERVAL '28 minutes', NOW() - INTERVAL '28 minutes'),
('test_msg_015', '技术支持群_用户D', 'msg_015', 'user_d', '技术支持群', '用户D', '技术支持群', 'robot_001', '智能客服机器人', '文档链接：https://docs.example.com/api 您也可以在文档中查看代码示例和最佳实践。', false, true, false, 'chat', 95, NOW() - INTERVAL '27 minutes', NOW() - INTERVAL '27 minutes');

-- 创建索引以优化查询性能（如果还没有创建）
CREATE INDEX IF NOT EXISTS idx_session_messages_robot_id ON session_messages(robot_id);
CREATE INDEX IF NOT EXISTS idx_session_messages_robot_name ON session_messages(robot_name);

-- 返回插入的记录数
SELECT COUNT(*) as inserted_count FROM session_messages WHERE id LIKE 'test_msg_%';
