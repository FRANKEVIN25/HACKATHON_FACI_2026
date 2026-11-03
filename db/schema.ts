import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const consultations = sqliteTable('consultations', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), name: text('name').notNull(),
 code: text('code').notNull().unique(), patient: text('patient'), status: text('status').notNull().default('active'),
 current: integer('current').notNull().default(0), help: integer('help').notNull().default(0),
 summary: text('summary').notNull().default(''), created: text('created').notNull(), updated: text('updated').notNull(),
});
export const answers = sqliteTable('answers', {
 id: text('id').primaryKey(), consultation: text('consultation').notNull(), question: integer('question').notNull(),
 value: text('value').notNull(), method: text('method').notNull(), clip: text('clip'), updated: text('updated').notNull(),
});
export const questionVideos = sqliteTable('question_videos', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), question: integer('question').notNull(), key: text('key').notNull(),
});
