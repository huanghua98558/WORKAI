#!/bin/bash
set -Eeuo pipefail

echo "========================================="
echo "   WorkTool AI 机器人系统修复脚本"
echo "========================================="
echo ""

# 检查环境变量
if [ -z "${DATABASE_URL:-}" ] && [ -z "${PGDATABASE_URL:-}" ]; then
    echo "❌ 错误: 未找到数据库连接字符串"
    echo "请设置 DATABASE_URL 或 PGDATABASE_URL 环境变量"
    exit 1
fi

# 使用可用的数据库URL
DB_URL="${DATABASE_URL:-${PGDATABASE_URL}}"

echo "📊 数据库URL: ${DB_URL:0:50}..."
echo ""

# 创建SQL迁移脚本
MIGRATION_SQL="/tmp/fix_robot_system_$(date +%s).sql"

cat > "$MIGRATION_SQL" << 'EOF'
-- Step 1: 创建 robot_groups 表
CREATE TABLE IF NOT EXISTS robot_groups (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7),
    icon VARCHAR(50),
    priority INTEGER DEFAULT 10,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 2: 创建 robot_roles 表
CREATE TABLE IF NOT EXISTS robot_roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 3: 创建 robot_commands 表
CREATE TABLE IF NOT EXISTS robot_commands (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    robot_id VARCHAR(255) NOT NULL,
    command_type VARCHAR(50) NOT NULL,
    command_data JSONB NOT NULL,
    priority INTEGER DEFAULT 10,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    sent_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 4: 创建 robot_load_balancing 表
CREATE TABLE IF NOT EXISTS robot_load_balancing (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    robot_id VARCHAR(255) NOT NULL UNIQUE,
    current_sessions INTEGER NOT NULL DEFAULT 0,
    max_sessions INTEGER NOT NULL DEFAULT 100,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    avg_response_time INTEGER,
    success_rate DECIMAL(5,4),
    error_count INTEGER DEFAULT 0,
    health_score DECIMAL(5,2) NOT NULL DEFAULT 100,
    is_available BOOLEAN NOT NULL DEFAULT true,
    last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 5: 更新 robots 表，添加缺失的字段
ALTER TABLE robots
ADD COLUMN IF NOT EXISTS group_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS role_id VARCHAR(36),
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_concurrent_sessions INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS current_session_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enabled_intents JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS ai_model_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS response_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS load_balancing_weight INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS health_check_interval INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_check_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Step 6: 插入默认分组
INSERT INTO robot_groups (name, description, color, icon, priority) VALUES
('客服机器人', '处理客户服务咨询', '#3B82F6', 'MessageSquare', 10),
('营销机器人', '负责营销活动和推广', '#10B981', 'TrendingUp', 9),
('管理机器人', '系统管理和运维', '#F59E0B', 'Shield', 8),
('测试机器人', '测试和实验用途', '#8B5CF6', 'TestTube', 1)
ON CONFLICT (name) DO NOTHING;

-- Step 7: 插入默认角色
INSERT INTO robot_roles (name, description, permissions, is_system) VALUES
('管理员', '拥有所有权限', '{"all": true, "admin": true}', true),
('客服', '客服权限，可以回复消息', '{"reply": true, "view": true, "chat": true}', false),
('营销', '营销权限，可以发送营销消息', '{"marketing": true, "view": true, "broadcast": true}', false),
('观察员', '只读权限，只能查看消息', '{"view": true}', false)
ON CONFLICT (name) DO NOTHING;

-- Step 8: 创建索引
CREATE INDEX IF NOT EXISTS idx_robots_group_id ON robots(group_id);
CREATE INDEX IF NOT EXISTS idx_robots_role_id ON robots(role_id);
CREATE INDEX IF NOT EXISTS idx_robots_priority ON robots(priority);
CREATE INDEX IF NOT EXISTS idx_robots_load_balancing_weight ON robots(load_balancing_weight);

CREATE INDEX IF NOT EXISTS idx_robot_commands_robot_id ON robot_commands(robot_id);
CREATE INDEX IF NOT EXISTS idx_robot_commands_status ON robot_commands(status);

CREATE INDEX IF NOT EXISTS idx_robot_load_balancing_robot_id ON robot_load_balancing(robot_id);
CREATE INDEX IF NOT EXISTS idx_robot_load_balancing_health_score ON robot_load_balancing(health_score);

-- 完成
SELECT 'Migration completed successfully!' as status;
EOF

echo "🔄 执行数据库迁移..."
psql "$DB_URL" -f "$MIGRATION_SQL"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 数据库迁移完成！"
    echo ""
    echo "📋 已创建/更新以下内容："
    echo "  ✓ robot_groups 表"
    echo "  ✓ robot_roles 表"
    echo "  ✓ robot_commands 表"
    echo "  ✓ robot_load_balancing 表"
    echo "  ✓ robots 表字段"
    echo "  ✓ 默认分组数据"
    echo "  ✓ 默认角色数据"
    echo ""
    echo "🚀 下一步："
    echo "  1. 重启后端服务"
    echo "  2. 测试API接口"
    echo ""
else
    echo ""
    echo "❌ 数据库迁移失败！"
    echo "请检查错误信息后重试"
    echo ""
    exit 1
fi

# 清理临时文件
rm -f "$MIGRATION_SQL"

# 测试API
echo "🧪 测试后端API..."
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✅ 后端服务运行正常"

    echo ""
    echo "📊 测试分组API..."
    GROUPS_RESULT=$(curl -s http://localhost:5001/api/admin/robot-groups 2>/dev/null)
    echo "$GROUPS_RESULT" | head -5

    echo ""
    echo "📊 测试机器人API..."
    ROBOTS_RESULT=$(curl -s http://localhost:5001/api/admin/robots 2>/dev/null)
    echo "$ROBOTS_RESULT" | head -5

    echo ""
    echo "✅ 系统修复完成！"
else
    echo "⚠️  后端服务未运行"
    echo "请运行以下命令启动服务："
    echo "  coze dev"
fi

echo ""
echo "========================================="
echo "   修复完成"
echo "========================================="
