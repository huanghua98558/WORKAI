/**
 * Migration: Add callback and API endpoint URLs to robots table
 * Description: 添加回调和通讯地址字段到 robots 表
 * Date: 2026-02-03
 */

exports.up = async function(knex) {
  // 回调地址（5个）
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS message_callback_url VARCHAR(500)
  `);
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS result_callback_url VARCHAR(500)
  `);
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS qrcode_callback_url VARCHAR(500)
  `);
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS online_callback_url VARCHAR(500)
  `);
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS offline_callback_url VARCHAR(500)
  `);

  // 通讯地址（8个）
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS send_message_api VARCHAR(500)
  `);
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS update_api VARCHAR(500)
  `);
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS get_info_api VARCHAR(500)
  `);
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS online_api VARCHAR(500)
  `);
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS online_infos_api VARCHAR(500)
  `);
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS list_raw_message_api VARCHAR(500)
  `);
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS raw_msg_list_api VARCHAR(500)
  `);
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS qa_log_list_api VARCHAR(500)
  `);

  // 回调基础地址
  await knex.raw(`
    ALTER TABLE robots ADD COLUMN IF NOT EXISTS callback_base_url VARCHAR(500)
  `);
};

exports.down = async function(knex) {
  // 回滚操作（如果需要）
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS message_callback_url
  `);
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS result_callback_url
  `);
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS qrcode_callback_url
  `);
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS online_callback_url
  `);
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS offline_callback_url
  `);
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS send_message_api
  `);
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS update_api
  `);
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS get_info_api
  `);
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS online_api
  `);
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS online_infos_api
  `);
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS list_raw_message_api
  `);
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS raw_msg_list_api
  `);
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS qa_log_list_api
  `);
  await knex.raw(`
    ALTER TABLE robots DROP COLUMN IF EXISTS callback_base_url
  `);
};
