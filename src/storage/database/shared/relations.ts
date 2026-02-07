import { relations } from "drizzle-orm/relations";
import { sessions, interventions, staff } from "./schema";

export const interventionsRelations = relations(interventions, ({one}) => ({
	session: one(sessions, {
		fields: [interventions.sessionId],
		references: [sessions.id]
	}),
	staff: one(staff, {
		fields: [interventions.staffId],
		references: [staff.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({many}) => ({
	interventions: many(interventions),
}));

export const staffRelations = relations(staff, ({many}) => ({
	interventions: many(interventions),
}));