-- Attendees for a working meeting: contacts from אנשי קשר, plus free-text names.
-- Run this yourself on Neon after 002. The app does not apply it.
-- Safe to run again.

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS attendees_other text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS meeting_attendees (
  meeting_id uuid NOT NULL REFERENCES meetings (id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, contact_id)
);
