/**
 * 数据库迁移脚本：添加 QA 问答库表
 * 
 * 使用方法：
 * node server/database/migrations/add_qa_table.js
 */

const { getDb } = require('coze-coding-dev-sdk');
const { sql } = require('drizzle-orm');
const { qaDatabase } = require('../schema');

async function up() {
  console.log('开始创建 QA 问答库表...');
  
  const db = await getDb();

  // 创建 QA 问答库表
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS qa_database (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      keyword TEXT NOT NULL,
      reply TEXT NOT NULL,
      receiver_type VARCHAR(20) NOT NULL DEFAULT 'all',
      priority INTEGER NOT NULL DEFAULT 5,
      is_exact_match BOOLEAN NOT NULL DEFAULT false,
      related_keywords TEXT,
      group_name VARCHAR(255),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);

  // 创建索引
  await db.execute(sql`CREATE INDEX IF NOT EXISTS qa_database_keyword_idx ON qa_database(keyword);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS qa_database_priority_idx ON qa_database(priority);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS qa_database_group_idx ON qa_database(group_name);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS qa_database_is_active_idx ON qa_database(is_active);`);

  console.log('✅ QA 问答库表创建成功');

  // 插入示例数据
  console.log('开始插入示例数据...');

  const sampleData = [
    {
      keyword: '公司地址',
      reply: '公司地址：北京市朝阳区XX路XX号XX大厦15层',
      receiverType: 'all',
      priority: 5,
      isExactMatch: true,
      relatedKeywords: '地址,办公地址,公司位置',
      isActive: true
    },
    {
      keyword: '联系电话',
      reply: '客服电话：400-123-4567（工作日9:00-18:00）',
      receiverType: 'all',
      priority: 5,
      isExactMatch: true,
      relatedKeywords: '电话,客服,联系方式',
      isActive: true
    },
    {
      keyword: '工作时间',
      reply: '工作时间：周一至周五 9:00-18:00（法定节假日除外）',
      receiverType: 'all',
      priority: 5,
      isExactMatch: true,
      relatedKeywords: '上班时间,营业时间',
      isActive: true
    },
    {
      keyword: '你好',
      reply: '您好！有什么可以帮助您的吗？',
      receiverType: 'all',
      priority: 10,
      isExactMatch: false,
      isActive: true
    }
  ];

  for (const data of sampleData) {
    await db.insert(qaDatabase).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  console.log(`✅ 插入 ${sampleData.length} 条示例数据成功`);
}

async function down() {
  console.log('开始删除 QA 问答库表...');
  
  const db = await getDb();

  await db.execute(sql`DROP TABLE IF EXISTS qa_database CASCADE;`);

  console.log('✅ QA 问答库表删除成功');
}

// 执行迁移
async function run() {
  const args = process.argv.slice(2);
  const command = args[0] || 'up';

  try {
    if (command === 'up') {
      await up();
    } else if (command === 'down') {
      await down();
    } else {
      console.log('用法: node add_qa_table.js [up|down]');
    }
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }

  process.exit(0);
}

run();
