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
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
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
  qrCode: varchar("qr_code", { length: 255 }).unique(),
  qrPath: varchar("qr_path", { length: 255 }),
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
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id],
  }),
  attendees: many(attendees),
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

// Insert schemas
export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertAttendeeSchema = createInsertSchema(attendees).omit({
  id: true,
  createdAt: true,
  qrCode: true,
  qrPath: true,
  status: true,
  checkinTime: true,
  checkoutTime: true,
});

export const insertCheckinLogSchema = createInsertSchema(checkinLogs).omit({
  id: true,
  timestamp: true,
});

export const insertLocalAuthSchema = createInsertSchema(localAuth).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
