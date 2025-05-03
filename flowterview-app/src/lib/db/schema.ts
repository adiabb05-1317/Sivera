import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "interviewer",
  "candidate",
]);
export const interviewStatusEnum = pgEnum("interview_status", [
  "draft",
  "active",
  "completed",
]);

// Tables
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  role: userRoleEnum("role").default("interviewer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const interviews = pgTable("interviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  status: interviewStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const candidates = pgTable("candidates", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const interviewWorkflows = pgTable("interview_workflows", {
  id: uuid("id").defaultRandom().primaryKey(),
  interviewId: uuid("interview_id")
    .references(() => interviews.id)
    .notNull(),
  workflow: text("workflow").notNull(), // JSON data for workflow nodes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const candidateInterviews = pgTable("candidate_interviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id")
    .references(() => candidates.id)
    .notNull(),
  interviewId: uuid("interview_id")
    .references(() => interviews.id)
    .notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  score: varchar("score", { length: 50 }),
  feedback: text("feedback"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
