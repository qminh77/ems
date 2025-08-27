import {
  users,
  events,
  attendees,
  checkinLogs,
  localAuth,
  type User,
  type UpsertUser,
  type Event,
  type InsertEvent,
  type Attendee,
  type InsertAttendee,
  type CheckinLog,
  type InsertCheckinLog,
  type LocalAuth,
  type InsertLocalAuth,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalAuth(auth: InsertLocalAuth): Promise<LocalAuth>;
  getLocalAuthByUsername(username: string): Promise<LocalAuth | undefined>;
  getLocalAuthByUserId(userId: string): Promise<LocalAuth | undefined>;
  
  // Event operations
  getEventsByUserId(userId: string): Promise<Event[]>;
  getEventById(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number, userId: string): Promise<boolean>;
  
  // Attendee operations
  getAttendeesByEventId(eventId: number): Promise<Attendee[]>;
  getAttendeeById(id: number): Promise<Attendee | undefined>;
  getAttendeeByQrCode(qrCode: string): Promise<Attendee | undefined>;
  createAttendee(attendee: InsertAttendee): Promise<Attendee>;
  updateAttendee(id: number, attendee: Partial<Attendee>): Promise<Attendee | undefined>;
  deleteAttendee(id: number): Promise<boolean>;
  
  // Check-in operations
  createCheckinLog(log: InsertCheckinLog): Promise<CheckinLog>;
  getRecentCheckins(limit?: number): Promise<Array<CheckinLog & { attendee: Attendee; event: Event }>>;
  getRecentCheckinsByUserId(userId: string, limit?: number): Promise<Array<CheckinLog & { attendee: Attendee; event: Event }>>;
  
  // Statistics
  getDashboardStats(userId: string): Promise<{
    totalEvents: number;
    totalStudents: number;
    todayCheckins: number;
    activeEvents: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getEventsByUserId(userId: string): Promise<Event[]> {
    return db.select().from(events).where(eq(events.userId, userId)).orderBy(desc(events.createdAt));
  }

  async getEventById(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [auth] = await db.select().from(localAuth).where(eq(localAuth.username, username));
    if (!auth) return undefined;
    const [user] = await db.select().from(users).where(eq(users.id, auth.userId));
    return user;
  }

  async createLocalAuth(auth: InsertLocalAuth): Promise<LocalAuth> {
    const [newAuth] = await db.insert(localAuth).values(auth).returning();
    return newAuth;
  }

  async getLocalAuthByUsername(username: string): Promise<LocalAuth | undefined> {
    const [auth] = await db.select().from(localAuth).where(eq(localAuth.username, username));
    return auth;
  }

  async getLocalAuthByUserId(userId: string): Promise<LocalAuth | undefined> {
    const [auth] = await db.select().from(localAuth).where(eq(localAuth.userId, userId));
    return auth;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(events)
      .set(event)
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(events)
      .where(and(eq(events.id, id), eq(events.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getAttendeesByEventId(eventId: number): Promise<Attendee[]> {
    return db.select().from(attendees).where(eq(attendees.eventId, eventId)).orderBy(desc(attendees.createdAt));
  }

  async getAttendeeById(id: number): Promise<Attendee | undefined> {
    const [attendee] = await db.select().from(attendees).where(eq(attendees.id, id));
    return attendee;
  }

  async getAttendeeByQrCode(qrCode: string): Promise<Attendee | undefined> {
    const [attendee] = await db.select().from(attendees).where(eq(attendees.qrCode, qrCode));
    return attendee;
  }

  async createAttendee(attendee: InsertAttendee): Promise<Attendee> {
    const [newAttendee] = await db.insert(attendees).values(attendee).returning();
    return newAttendee;
  }

  async updateAttendee(id: number, attendee: Partial<Attendee>): Promise<Attendee | undefined> {
    const [updatedAttendee] = await db
      .update(attendees)
      .set(attendee)
      .where(eq(attendees.id, id))
      .returning();
    return updatedAttendee;
  }

  async deleteAttendee(id: number): Promise<boolean> {
    const result = await db.delete(attendees).where(eq(attendees.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async createCheckinLog(log: InsertCheckinLog): Promise<CheckinLog> {
    const [newLog] = await db.insert(checkinLogs).values(log).returning();
    return newLog;
  }

  async getRecentCheckins(limit: number = 10): Promise<Array<CheckinLog & { attendee: Attendee; event: Event }>> {
    const results = await db
      .select({
        id: checkinLogs.id,
        attendeeId: checkinLogs.attendeeId,
        action: checkinLogs.action,
        timestamp: checkinLogs.timestamp,
        ipAddress: checkinLogs.ipAddress,
        userAgent: checkinLogs.userAgent,
        attendee: attendees,
        event: events,
      })
      .from(checkinLogs)
      .innerJoin(attendees, eq(checkinLogs.attendeeId, attendees.id))
      .innerJoin(events, eq(attendees.eventId, events.id))
      .orderBy(desc(checkinLogs.timestamp))
      .limit(limit);
    
    return results as any;
  }

  async getRecentCheckinsByUserId(userId: string, limit: number = 10): Promise<Array<CheckinLog & { attendee: Attendee; event: Event }>> {
    const results = await db
      .select({
        id: checkinLogs.id,
        attendeeId: checkinLogs.attendeeId,
        action: checkinLogs.action,
        timestamp: checkinLogs.timestamp,
        ipAddress: checkinLogs.ipAddress,
        userAgent: checkinLogs.userAgent,
        attendee: attendees,
        event: events,
      })
      .from(checkinLogs)
      .innerJoin(attendees, eq(checkinLogs.attendeeId, attendees.id))
      .innerJoin(events, eq(attendees.eventId, events.id))
      .where(eq(events.userId, userId))
      .orderBy(desc(checkinLogs.timestamp))
      .limit(limit);
    
    return results as any;
  }

  async getDashboardStats(userId: string): Promise<{
    totalEvents: number;
    totalStudents: number;
    todayCheckins: number;
    activeEvents: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    
    const [stats] = await db
      .select({
        totalEvents: sql<number>`count(distinct ${events.id})`,
        totalStudents: sql<number>`count(distinct ${attendees.id})`,
        todayCheckins: sql<number>`count(distinct case when date(${checkinLogs.timestamp}) = ${today} and ${checkinLogs.action} = 'check_in' then ${checkinLogs.id} end)`,
        activeEvents: sql<number>`count(distinct case when ${events.isActive} = true and ${events.eventDate} >= current_date then ${events.id} end)`,
      })
      .from(events)
      .leftJoin(attendees, eq(events.id, attendees.eventId))
      .leftJoin(checkinLogs, eq(attendees.id, checkinLogs.attendeeId))
      .where(eq(events.userId, userId));

    return {
      totalEvents: stats.totalEvents || 0,
      totalStudents: stats.totalStudents || 0,
      todayCheckins: stats.todayCheckins || 0,
      activeEvents: stats.activeEvents || 0,
    };
  }
}

export const storage = new DatabaseStorage();
