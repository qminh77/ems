-- Indexes to optimize check-in performance
-- Run these in your database to improve query speed

-- Index for finding attendee by QR code
CREATE INDEX IF NOT EXISTS idx_attendees_qrcode ON attendees(qr_code);

-- Index for finding events by user
CREATE INDEX IF NOT EXISTS idx_events_userid ON events(user_id);

-- Index for finding attendees by event
CREATE INDEX IF NOT EXISTS idx_attendees_eventid ON attendees(event_id);

-- Index for checkin logs queries
CREATE INDEX IF NOT EXISTS idx_checkinlogs_attendee ON checkin_logs(attendee_id);
CREATE INDEX IF NOT EXISTS idx_checkinlogs_timestamp ON checkin_logs(timestamp DESC);

-- Composite index for stats query
CREATE INDEX IF NOT EXISTS idx_events_userid_active ON events(user_id, is_active, event_date);