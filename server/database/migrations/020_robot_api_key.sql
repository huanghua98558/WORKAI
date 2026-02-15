-- 机器人 API Key 验证字段迁移
-- 为 robots 表添加 API Key 相关字段

-- 添加 API Key 哈希字段
ALTER TABLE robots ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(64);
COMMENT ON COLUMN robots.api_key_hash IS 'API Key 哈希值（SHA256）';

-- 添加 API Key 生成时间
ALTER TABLE robots ADD COLUMN IF NOT EXISTS api_key_generated_at TIMESTAMP WITH TIME ZONE;
COMMENT ON COLUMN robots.api_key_generated_at IS 'API Key 生成时间';

-- 添加设备绑定 Token
ALTER TABLE robots ADD COLUMN IF NOT EXISTS device_token VARCHAR(32);
COMMENT ON COLUMN robots.device_token IS '设备绑定 Token';

-- 添加设备绑定时间
ALTER TABLE robots ADD COLUMN IF NOT EXISTS device_bound_at TIMESTAMP WITH TIME ZONE;
COMMENT ON COLUMN robots.device_bound_at IS '设备绑定时间';

-- 添加最后 WebSocket 连接时间
ALTER TABLE robots ADD COLUMN IF NOT EXISTS last_ws_connection_at TIMESTAMP WITH TIME ZONE;
COMMENT ON COLUMN robots.last_ws_connection_at IS '最后 WebSocket 连接时间';

-- 添加 WebSocket 连接次数
ALTER TABLE robots ADD COLUMN IF NOT EXISTS ws_connection_count INTEGER DEFAULT 0;
COMMENT ON COLUMN robots.ws_connection_count IS 'WebSocket 连接次数';

-- 为已存在的机器人生成 API Key
-- 注意：这里只是示例，实际的 API Key 需要通过应用层生成并存储哈希值
-- UPDATE robots SET api_key_hash = 'placeholder' WHERE api_key_hash IS NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS robots_api_key_hash_idx ON robots(api_key_hash);
CREATE INDEX IF NOT EXISTS robots_device_token_idx ON robots(device_token);

-- 完成
SELECT 'Migration 020_robot_api_key completed successfully' AS status;
