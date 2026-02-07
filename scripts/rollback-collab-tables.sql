-- =====================================================
-- 协同分析模块 - 回滚脚本
-- 使用场景：需要撤销新创建的表和字段
-- 警告：此脚本会删除 tasks 和 keyword_triggers 表
-- =====================================================

-- =====================================================
-- 回滚步骤 1：删除 tasks 表
-- =====================================================
DROP TABLE IF EXISTS tasks CASCADE;

-- =====================================================
-- 回滚步骤 2：删除 keyword_triggers 表
-- =====================================================
DROP TABLE IF EXISTS keyword_triggers CASCADE;

-- =====================================================
-- 回滚步骤 3：删除 staff_activities 的 staff_type 字段
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_activities' AND column_name = 'staff_type'
  ) THEN
    -- 先删除索引
    DROP INDEX IF EXISTS idx_staff_activities_type;

    -- 删除字段
    ALTER TABLE staff_activities
    DROP COLUMN IF EXISTS staff_type;
  END IF;
END $$;

-- =====================================================
-- 验证回滚结果
-- =====================================================
SELECT
  '✅ 回滚完成！' as status,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN 'tasks 表已删除'
    ELSE 'tasks 表仍存在（异常）'
  END as check1,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'keyword_triggers') THEN 'keyword_triggers 表已删除'
    ELSE 'keyword_triggers 表仍存在（异常）'
  END as check2,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_activities' AND column_name = 'staff_type') THEN 'staff_activities.staff_type 字段已删除'
    ELSE 'staff_activities.staff_type 字段仍存在（异常）'
  END as check3;
