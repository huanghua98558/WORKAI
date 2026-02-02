-- 扩展 robots 表，添加 WorkTool 机器人的详细信息
-- 执行时间：2025-02-03

-- 添加新字段
ALTER TABLE robots
ADD COLUMN IF NOT EXISTS nickname varchar(255),           -- 机器人昵称
ADD COLUMN IF NOT EXISTS company varchar(255),            -- 企业名称
ADD COLUMN IF NOT EXISTS ip_address varchar(45),          -- IP地址（支持IPv6）
ADD COLUMN IF NOT EXISTS is_valid boolean DEFAULT true,   -- 是否有效
ADD COLUMN IF NOT EXISTS activated_at timestamp,          -- 启用时间
ADD COLUMN IF NOT EXISTS expires_at timestamp,            -- 到期时间
ADD COLUMN IF NOT EXISTS message_callback_enabled boolean DEFAULT false,  -- 消息回调是否开启
ADD COLUMN IF NOT EXISTS extra_data jsonb;                 -- 额外数据（JSON格式，存储其他WorkTool返回的信息）

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_robots_is_valid ON robots(is_valid);
CREATE INDEX IF NOT EXISTS idx_robots_expires_at ON robots(expires_at);
CREATE INDEX IF NOT EXISTS idx_robots_company ON robots(company);

COMMENT ON COLUMN robots.nickname IS '机器人昵称（从WorkTool API获取）';
COMMENT ON COLUMN robots.company IS '企业名称（从WorkTool API获取）';
COMMENT ON COLUMN robots.ip_address IS 'IP地址（从WorkTool API获取）';
COMMENT ON COLUMN robots.is_valid IS '是否有效（从WorkTool API获取）';
COMMENT ON COLUMN robots.activated_at IS '启用时间（从WorkTool API获取）';
COMMENT ON COLUMN robots.expires_at IS '到期时间（从WorkTool API获取）';
COMMENT ON COLUMN robots.message_callback_enabled IS '消息回调是否开启（从WorkTool API获取）';
COMMENT ON COLUMN robots.extra_data IS '额外数据（JSON格式，存储其他WorkTool返回的信息）';
