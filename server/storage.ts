import {
  users,
  events,
  attendees,
  checkinLogs,
  localAuth,
  eventCollaborators,
  systemSettings,
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
  type EventCollaborator,
  type InsertEventCollaborator,
  type SystemSettings,
  type UpdateSystemSettings,
  type UpdateUserAdmin,
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Optimized operations
  getAttendeeWithEvent(qrCode: string): Promise<{ attendee: Attendee; event: Event } | undefined>;
  // User operations (required for Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalAuth(auth: InsertLocalAuth): Promise<LocalAuth>;
  getLocalAuthByUsername(username: string): Promise<LocalAuth | undefined>;
  getLocalAuthByEmailOrUsername(emailOrUsername: string): Promise<LocalAuth | undefined>;
  getLocalAuthByUserId(userId: string): Promise<LocalAuth | undefined>;
  listUsers(): Promise<User[]>;
  updateUserAdmin(id: string, payload: UpdateUserAdmin): Promise<User | undefined>;
  
  // Event operations
  getEventsByUserId(userId: string): Promise<Event[]>;
  getEventById(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number, userId: string): Promise<boolean>;
  
  // Attendee operations
  getAttendeesByEventId(eventId: number, limit?: number, offset?: number): Promise<Attendee[]>;
  getAttendeeById(id: number): Promise<Attendee | undefined>;
  getAttendeesByIds(ids: number[]): Promise<Attendee[]>;
  getAttendeeByQrCode(qrCode: string): Promise<Attendee | undefined>;
  createAttendee(attendee: InsertAttendee): Promise<Attendee>;
  updateAttendee(id: number, attendee: Partial<Attendee>): Promise<Attendee | undefined>;
  deleteAttendee(id: number): Promise<boolean>;
  deleteMultipleAttendees(ids: number[]): Promise<{ deletedCount: number; errors: string[] }>;
  
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
  
  // Collaborator operations
  addCollaborator(collaborator: InsertEventCollaborator): Promise<EventCollaborator>;
  removeCollaborator(eventId: number, userId: string): Promise<boolean>;
  getEventCollaborators(eventId: number): Promise<Array<EventCollaborator & { user: User }>>;
  getUserCollaborations(userId: string): Promise<Event[]>;
  checkEventAccess(eventId: number, userId: string): Promise<{ hasAccess: boolean; role?: string; permissions?: string[] }>;
  updateCollaboratorPermissions(eventId: number, userId: string, permissions: string[]): Promise<EventCollaborator | undefined>;
  searchUsersByEmailOrUsername(query: string): Promise<User[]>;

  // System settings
  getSystemSettings(): Promise<SystemSettings>;
  updateSystemSettings(payload: UpdateSystemSettings): Promise<SystemSettings>;
}

export class DatabaseStorage implements IStorage {
  private readonly defaultSystemSettings: UpdateSystemSettings = {
    systemName: "EMS Platform",
    systemDescription: "Nền tảng quản lý sự kiện tập trung",
    contactEmail: "support@example.com",
    contactPhone: "",
    logoUrl: "",
    footerText: "© EMS Platform",
    registrationEnabled: true,
  };

  private normalizeLogoUrl(value?: string | null): string | null {
    if (!value || !value.trim()) {
      return null;
    }

    return value.trim();
  }

  private isSchemaCompatibilityError(error: unknown): boolean {
    const code = (error as any)?.code;
    return code === "42703" || code === "42P01";
  }

  private mapLegacyUserRow(row: any): User {
    return {
      id: row.id,
      email: row.email ?? null,
      firstName: row.first_name ?? row.firstName ?? null,
      lastName: row.last_name ?? row.lastName ?? null,
      profileImageUrl: row.profile_image_url ?? row.profileImageUrl ?? null,
      isAdmin: false,
      canCreateEvents: true,
      isActive: true,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    };
  }

  private defaultSettingsRecord(): SystemSettings {
    return {
      id: 1,
      systemName: this.defaultSystemSettings.systemName,
      systemDescription: this.defaultSystemSettings.systemDescription,
      contactEmail: this.defaultSystemSettings.contactEmail,
      contactPhone: this.defaultSystemSettings.contactPhone,
      logoUrl: this.normalizeLogoUrl(this.defaultSystemSettings.logoUrl),
      footerText: this.defaultSystemSettings.footerText,
      registrationEnabled: this.defaultSystemSettings.registrationEnabled,
      createdAt: null,
      updatedAt: null,
    };
  }

  private async ensureSystemSettingsRow(): Promise<void> {
    await db
      .insert(systemSettings)
      .values({
        id: 1,
        systemName: this.defaultSystemSettings.systemName,
        systemDescription: this.defaultSystemSettings.systemDescription,
        contactEmail: this.defaultSystemSettings.contactEmail,
        contactPhone: this.defaultSystemSettings.contactPhone,
        logoUrl: this.normalizeLogoUrl(this.defaultSystemSettings.logoUrl),
        footerText: this.defaultSystemSettings.footerText,
        registrationEnabled: this.defaultSystemSettings.registrationEnabled,
      })
      .onConflictDoNothing({ target: systemSettings.id });
  }

  // Optimized method to get attendee with event in single query
  async getAttendeeWithEvent(qrCode: string): Promise<{ attendee: Attendee; event: Event } | undefined> {
    const result = await db
      .select({
        attendee: attendees,
        event: events,
      })
      .from(attendees)
      .innerJoin(events, eq(attendees.eventId, events.id))
      .where(eq(attendees.qrCode, qrCode))
      .limit(1);
    
    return result[0];
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }

      const result = await db.execute(sql`
        select id, email, first_name, last_name, profile_image_url, created_at, updated_at
        from users
        where id = ${id}
        limit 1
      `);
      const rows = (result as any).rows ?? [];
      return rows[0] ? this.mapLegacyUserRow(rows[0]) : undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }

      const result = await db.execute(sql`
        select id, email, first_name, last_name, profile_image_url, created_at, updated_at
        from users
        where email = ${email}
        limit 1
      `);
      const rows = (result as any).rows ?? [];
      return rows[0] ? this.mapLegacyUserRow(rows[0]) : undefined;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
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
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }

      const result = await db.execute(sql`
        insert into users (id, email, first_name, last_name, profile_image_url, created_at, updated_at)
        values (${userData.id}, ${userData.email ?? null}, ${userData.firstName ?? null}, ${userData.lastName ?? null}, ${userData.profileImageUrl ?? null}, now(), now())
        on conflict (id)
        do update set
          email = excluded.email,
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          profile_image_url = excluded.profile_image_url,
          updated_at = now()
        returning id, email, first_name, last_name, profile_image_url, created_at, updated_at
      `);
      const rows = (result as any).rows ?? [];
      if (!rows[0]) {
        throw new Error("Failed to upsert legacy user row");
      }

      return this.mapLegacyUserRow(rows[0]);
    }
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
    return this.getUser(auth.userId);
  }

  async createLocalAuth(auth: InsertLocalAuth): Promise<LocalAuth> {
    const [newAuth] = await db.insert(localAuth).values(auth).returning();
    return newAuth;
  }

  async getLocalAuthByUsername(username: string): Promise<LocalAuth | undefined> {
    const [auth] = await db.select().from(localAuth).where(eq(localAuth.username, username));
    return auth;
  }

  async getLocalAuthByEmailOrUsername(emailOrUsername: string): Promise<LocalAuth | undefined> {
    // First, check if it's an email format
    const isEmail = emailOrUsername.includes('@');
    
    if (isEmail) {
      // Find user by email first
      const user = await this.getUserByEmail(emailOrUsername);
      if (!user) return undefined;
      
      // Then get the local auth for that user
      const [auth] = await db.select().from(localAuth).where(eq(localAuth.userId, user.id));
      return auth;
    } else {
      // Treat as username
      return this.getLocalAuthByUsername(emailOrUsername);
    }
  }

  async getLocalAuthByUserId(userId: string): Promise<LocalAuth | undefined> {
    const [auth] = await db.select().from(localAuth).where(eq(localAuth.userId, userId));
    return auth;
  }

  async listUsers(): Promise<User[]> {
    try {
      return db.select().from(users).orderBy(desc(users.createdAt));
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }

      const result = await db.execute(sql`
        select id, email, first_name, last_name, profile_image_url, created_at, updated_at
        from users
        order by created_at desc
      `);
      const rows = (result as any).rows ?? [];
      return rows.map((row: any) => this.mapLegacyUserRow(row));
    }
  }

  async updateUserAdmin(id: string, payload: UpdateUserAdmin): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          ...payload,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      return updatedUser;
    } catch (error) {
      if (this.isSchemaCompatibilityError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  async getSystemSettings(): Promise<SystemSettings> {
    try {
      await this.ensureSystemSettingsRow();

      const [settings] = await db.select().from(systemSettings).where(eq(systemSettings.id, 1)).limit(1);

      if (settings) {
        return settings;
      }

      const [createdSettings] = await db
        .insert(systemSettings)
        .values({
          id: 1,
          systemName: this.defaultSystemSettings.systemName,
          systemDescription: this.defaultSystemSettings.systemDescription,
          contactEmail: this.defaultSystemSettings.contactEmail,
          contactPhone: this.defaultSystemSettings.contactPhone,
          logoUrl: this.normalizeLogoUrl(this.defaultSystemSettings.logoUrl),
          footerText: this.defaultSystemSettings.footerText,
          registrationEnabled: this.defaultSystemSettings.registrationEnabled,
        })
        .returning();

      return createdSettings;
    } catch (error) {
      if (this.isSchemaCompatibilityError(error)) {
        return this.defaultSettingsRecord();
      }

      throw error;
    }
  }

  async updateSystemSettings(payload: UpdateSystemSettings): Promise<SystemSettings> {
    try {
      await this.ensureSystemSettingsRow();

      const [updatedSettings] = await db
        .update(systemSettings)
        .set({
          systemName: payload.systemName,
          systemDescription: payload.systemDescription,
          contactEmail: payload.contactEmail,
          contactPhone: payload.contactPhone,
          logoUrl: this.normalizeLogoUrl(payload.logoUrl),
          footerText: payload.footerText,
          registrationEnabled: payload.registrationEnabled,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.id, 1))
        .returning();

      if (updatedSettings) {
        return updatedSettings;
      }

      const [createdSettings] = await db
        .insert(systemSettings)
        .values({
          id: 1,
          systemName: payload.systemName,
          systemDescription: payload.systemDescription,
          contactEmail: payload.contactEmail,
          contactPhone: payload.contactPhone,
          logoUrl: this.normalizeLogoUrl(payload.logoUrl),
          footerText: payload.footerText,
          registrationEnabled: payload.registrationEnabled,
        })
        .returning();

      return createdSettings;
    } catch (error) {
      if (this.isSchemaCompatibilityError(error)) {
        throw new Error("System settings schema is not initialized yet");
      }

      throw error;
    }
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

  async getAttendeesByEventId(eventId: number, limit: number = 100000, offset: number = 0): Promise<Attendee[]> {
    return db
      .select()
      .from(attendees)
      .where(eq(attendees.eventId, eventId))
      .orderBy(desc(attendees.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getAttendeeById(id: number): Promise<Attendee | undefined> {
    const [attendee] = await db.select().from(attendees).where(eq(attendees.id, id));
    return attendee;
  }

  async getAttendeesByIds(ids: number[]): Promise<Attendee[]> {
    if (ids.length === 0) return [];
    return db.select().from(attendees).where(inArray(attendees.id, ids));
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

  async deleteMultipleAttendees(ids: number[]): Promise<{ deletedCount: number; errors: string[] }> {
    if (ids.length === 0) {
      return { deletedCount: 0, errors: [] };
    }

    const existing = await this.getAttendeesByIds(ids);
    const existingIds = new Set(existing.map((attendee) => attendee.id));
    const missingIds = ids.filter((id) => !existingIds.has(id));

    const result = await db.delete(attendees).where(inArray(attendees.id, Array.from(existingIds)));
    const deletedCount = result.rowCount ?? 0;

    return {
      deletedCount,
      errors: missingIds.map((id) => `Sinh vien voi ID ${id} khong ton tai`),
    };
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
    const [ownedEventRows, collaboratorEventRows] = await Promise.all([
      db.select({ id: events.id }).from(events).where(eq(events.userId, userId)),
      db
        .select({ id: eventCollaborators.eventId })
        .from(eventCollaborators)
        .where(eq(eventCollaborators.userId, userId)),
    ]);

    const eventIds = Array.from(
      new Set([
        ...ownedEventRows.map((eventRow) => eventRow.id),
        ...collaboratorEventRows.map((eventRow) => eventRow.id),
      ])
    );

    if (eventIds.length === 0) {
      return [];
    }

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
      .where(inArray(attendees.eventId, eventIds))
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      [totalEventsResult],
      [totalStudentsResult],
      [todayCheckinsResult],
      [activeEventsResult],
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(eq(events.userId, userId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(attendees)
        .innerJoin(events, eq(attendees.eventId, events.id))
        .where(eq(events.userId, userId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(checkinLogs)
        .innerJoin(attendees, eq(checkinLogs.attendeeId, attendees.id))
        .innerJoin(events, eq(attendees.eventId, events.id))
        .where(
          and(
            eq(events.userId, userId),
            eq(checkinLogs.action, "check_in"),
            sql`${checkinLogs.timestamp} >= ${today}`
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(
          and(
            eq(events.userId, userId),
            eq(events.isActive, true),
            sql`${events.eventDate} >= CURRENT_DATE`
          )
        ),
    ]);

    return {
      totalEvents: Number(totalEventsResult?.count || 0),
      totalStudents: Number(totalStudentsResult?.count || 0),
      todayCheckins: Number(todayCheckinsResult?.count || 0),
      activeEvents: Number(activeEventsResult?.count || 0),
    };
  }

  // Collaborator operations implementations
  async addCollaborator(collaborator: InsertEventCollaborator): Promise<EventCollaborator> {
    const [newCollaborator] = await db.insert(eventCollaborators).values(collaborator).returning();
    return newCollaborator;
  }

  async removeCollaborator(eventId: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(eventCollaborators)
      .where(and(eq(eventCollaborators.eventId, eventId), eq(eventCollaborators.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getEventCollaborators(eventId: number): Promise<Array<EventCollaborator & { user: User }>> {
    const results = await db
      .select({
        id: eventCollaborators.id,
        eventId: eventCollaborators.eventId,
        userId: eventCollaborators.userId,
        role: eventCollaborators.role,
        permissions: eventCollaborators.permissions,
        invitedBy: eventCollaborators.invitedBy,
        createdAt: eventCollaborators.createdAt,
        user: users,
      })
      .from(eventCollaborators)
      .innerJoin(users, eq(eventCollaborators.userId, users.id))
      .where(eq(eventCollaborators.eventId, eventId));
    
    return results as any;
  }

  async getUserCollaborations(userId: string): Promise<Event[]> {
    // Get events where user is a collaborator
    const collaboratedEvents = await db
      .select({ event: events })
      .from(eventCollaborators)
      .innerJoin(events, eq(eventCollaborators.eventId, events.id))
      .where(eq(eventCollaborators.userId, userId));
    
    return collaboratedEvents.map(r => r.event);
  }

  async checkEventAccess(eventId: number, userId: string): Promise<{ hasAccess: boolean; role?: string; permissions?: string[] }> {
    // Check if user is the event owner
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (event && event.userId === userId) {
      return { hasAccess: true, role: 'owner', permissions: ['all'] };
    }

    // Check if user is a collaborator
    const [collaborator] = await db
      .select()
      .from(eventCollaborators)
      .where(and(eq(eventCollaborators.eventId, eventId), eq(eventCollaborators.userId, userId)));
    
    if (collaborator) {
      return { 
        hasAccess: true, 
        role: collaborator.role, 
        permissions: collaborator.permissions as string[]
      };
    }

    return { hasAccess: false };
  }

  async updateCollaboratorPermissions(eventId: number, userId: string, permissions: string[]): Promise<EventCollaborator | undefined> {
    const [updated] = await db
      .update(eventCollaborators)
      .set({ permissions })
      .where(and(eq(eventCollaborators.eventId, eventId), eq(eventCollaborators.userId, userId)))
      .returning();
    
    return updated;
  }

  async searchUsersByEmailOrUsername(query: string): Promise<User[]> {
    const lowercaseQuery = query.toLowerCase();

    let usersByEmail: User[] = [];
    try {
      usersByEmail = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) LIKE ${`%${lowercaseQuery}%`}`)
        .limit(10);
    } catch (error) {
      if (!this.isSchemaCompatibilityError(error)) {
        throw error;
      }

      const result = await db.execute(sql`
        select id, email, first_name, last_name, profile_image_url, created_at, updated_at
        from users
        where lower(email) like ${`%${lowercaseQuery}%`}
        limit 10
      `);
      const rows = (result as any).rows ?? [];
      usersByEmail = rows.map((row: any) => this.mapLegacyUserRow(row));
    }

    // Search in localAuth table by username, then get users
    const authResults = await db
      .select()
      .from(localAuth)
      .where(sql`lower(${localAuth.username}) LIKE ${`%${lowercaseQuery}%`}`)
      .limit(10);
    
    const userIds = authResults.map(auth => auth.userId);
    let usersByUsername: User[] = [];
    if (userIds.length > 0) {
      try {
        usersByUsername = await db
          .select()
          .from(users)
          .where(sql`${users.id} = ANY(${userIds})`);
      } catch (error) {
        if (!this.isSchemaCompatibilityError(error)) {
          throw error;
        }

        const result = await db.execute(sql`
          select id, email, first_name, last_name, profile_image_url, created_at, updated_at
          from users
          where id = any(${userIds})
        `);
        const rows = (result as any).rows ?? [];
        usersByUsername = rows.map((row: any) => this.mapLegacyUserRow(row));
      }
    }

    // Combine and deduplicate results
    const allUsers = [...usersByEmail, ...usersByUsername];
    const uniqueUsers = Array.from(
      new Map(allUsers.map(user => [user.id, user])).values()
    );

    return uniqueUsers;
  }
}

export const storage = new DatabaseStorage();
