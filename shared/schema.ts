import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  date,
  time,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Session storage table for local authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for local authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  canCreateEvents: boolean("can_create_events").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: integer("id").primaryKey().default(1),
  systemName: varchar("system_name", { length: 150 }).notNull().default("EMS Platform"),
  systemDescription: text("system_description").notNull().default("Nền tảng quản lý sự kiện tập trung"),
  contactEmail: varchar("contact_email", { length: 255 }).notNull().default("support@example.com"),
  contactPhone: varchar("contact_phone", { length: 30 }).notNull().default(""),
  logoUrl: text("logo_url"),
  footerText: text("footer_text").notNull().default("© EMS Platform"),
  registrationEnabled: boolean("registration_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  eventDate: date("event_date").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  location: varchar("location", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Attendees table (Updated with KHOA and NGANH fields)
export const attendees = pgTable("attendees", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  studentId: varchar("student_id", { length: 50 }).notNull(), // MSSV/MSNV - Required
  email: varchar("email", { length: 100 }),
  faculty: varchar("faculty", { length: 100 }), // KHOA
  major: varchar("major", { length: 100 }), // NGÀNH
  qrCode: varchar("qr_code", { length: 50 }).unique(),
  qrPath: text("qr_path"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, checked_in, checked_out
  checkinTime: timestamp("checkin_time"),
  checkoutTime: timestamp("checkout_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Check-in logs table
export const checkinLogs = pgTable("checkin_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  attendeeId: integer("attendee_id").notNull().references(() => attendees.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 20 }).notNull(), // check_in, check_out
  timestamp: timestamp("timestamp").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 255 }),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  events: many(events),
  collaborations: many(eventCollaborators),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id],
  }),
  attendees: many(attendees),
  collaborators: many(eventCollaborators),
}));

export const attendeesRelations = relations(attendees, ({ one, many }) => ({
  event: one(events, {
    fields: [attendees.eventId],
    references: [events.id],
  }),
  checkinLogs: many(checkinLogs),
}));

export const checkinLogsRelations = relations(checkinLogs, ({ one }) => ({
  attendee: one(attendees, {
    fields: [checkinLogs.attendeeId],
    references: [attendees.id],
  }),
}));

// Add local auth table for standard login
export const localAuth = pgTable("local_auth", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event collaborators table - manages shared access to events
export const eventCollaborators = pgTable("event_collaborators", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull().default("collaborator"), // owner, collaborator
  permissions: text("permissions").array().default(sql`ARRAY['view', 'checkin']::text[]`), // view, checkin, manage_attendees, edit_event
  invitedBy: varchar("invited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_event_collaborators_event").on(table.eventId),
  index("idx_event_collaborators_user").on(table.userId),
]);

// Relations for event collaborators  
export const eventCollaboratorsRelations = relations(eventCollaborators, ({ one }) => ({
  event: one(events, {
    fields: [eventCollaborators.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventCollaborators.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [eventCollaborators.invitedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertEventSchema = z.object({
  userId: z.string(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  eventDate: z.string(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const insertAttendeeSchema = z.object({
  eventId: z.number(),
  name: z.string().min(1),
  studentId: z.string().min(1),
  email: z.string().email().optional().nullable().or(z.literal("")),
  faculty: z.string().optional().nullable(),
  major: z.string().optional().nullable(),
  qrCode: z.string().optional().nullable(),
  qrPath: z.string().optional().nullable(),
  status: z.enum(["pending", "checked_in", "checked_out"]).optional(),
  checkinTime: z.date().optional().nullable(),
  checkoutTime: z.date().optional().nullable(),
});

export const insertCheckinLogSchema = z.object({
  attendeeId: z.number(),
  action: z.enum(["check_in", "check_out"]),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

export const insertLocalAuthSchema = z.object({
  userId: z.string(),
  username: z.string().min(1),
  passwordHash: z.string().min(1),
});

export const insertEventCollaboratorSchema = z.object({
  eventId: z.number(),
  userId: z.string(),
  role: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  invitedBy: z.string().optional().nullable(),
});

export const updateSystemSettingsSchema = z.object({
  systemName: z.string().trim().min(1).max(150),
  systemDescription: z.string().trim().min(1).max(500),
  contactEmail: z.string().trim().email().max(255),
  contactPhone: z.string().trim().max(30),
  logoUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  footerText: z.string().trim().min(1).max(500),
  registrationEnabled: z.boolean(),
});

export const updateUserAdminSchema = z.object({
  isAdmin: z.boolean().optional(),
  canCreateEvents: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Attendee = typeof attendees.$inferSelect;
export type InsertAttendee = z.infer<typeof insertAttendeeSchema>;
export type CheckinLog = typeof checkinLogs.$inferSelect;
export type InsertCheckinLog = z.infer<typeof insertCheckinLogSchema>;
export type LocalAuth = typeof localAuth.$inferSelect;
export type InsertLocalAuth = z.infer<typeof insertLocalAuthSchema>;
export type EventCollaborator = typeof eventCollaborators.$inferSelect;
export type InsertEventCollaborator = z.infer<typeof insertEventCollaboratorSchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;
export type UpdateSystemSettings = z.infer<typeof updateSystemSettingsSchema>;
export type UpdateUserAdmin = z.infer<typeof updateUserAdminSchema>;
