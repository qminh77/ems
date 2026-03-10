import { sql } from "drizzle-orm";
import { db } from "./db.js";

const indexStatements = [
  sql`CREATE INDEX IF NOT EXISTS idx_events_user_created_at ON events(user_id, created_at DESC)`,
  sql`CREATE INDEX IF NOT EXISTS idx_events_user_active_date ON events(user_id, is_active, event_date)`,
  sql`CREATE INDEX IF NOT EXISTS idx_attendees_event_created_at ON attendees(event_id, created_at DESC)`,
  sql`CREATE INDEX IF NOT EXISTS idx_attendees_qr_code ON attendees(qr_code)`,
  sql`CREATE INDEX IF NOT EXISTS idx_checkin_logs_attendee_timestamp ON checkin_logs(attendee_id, timestamp DESC)`,
  sql`CREATE INDEX IF NOT EXISTS idx_checkin_logs_action_timestamp ON checkin_logs(action, timestamp DESC)`,
  sql`CREATE INDEX IF NOT EXISTS idx_event_collaborators_user_event ON event_collaborators(user_id, event_id)`,
];

export async function ensureDatabaseIndexes() {
  await Promise.all(indexStatements.map((statement) => db.execute(statement)));
}
