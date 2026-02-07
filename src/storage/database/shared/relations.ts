import { relations } from "drizzle-orm/relations";
import { sessions, interventions, staff } from "./schema";

// 移除外键关系定义以避免 Drizzle-kit 创建外键约束
// 仅保留关系定义用于应用层逻辑，不创建数据库外键约束

export const sessionsRelations = relations(sessions, ({many}) => ({
	interventions: many(interventions),
}));

export const interventionsRelations = relations(interventions, ({one}) => ({
	// 注意：这里不定义 references，避免创建数据库外键约束
	// session 和 staff 关系仅用于应用层查询，不在数据库层面创建约束
}));

export const staffRelations = relations(staff, ({many}) => ({
	interventions: many(interventions),
}));