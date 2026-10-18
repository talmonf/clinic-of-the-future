-- Transcript text and the current private-S3 recording for a working meeting.
-- Run this yourself on Neon after 001. The app does not apply it.
-- Safe to run again: each column is added only if it is missing.

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS transcript text NOT NULL DEFAULT '';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recording_key text;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recording_name text;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recording_type text;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recording_bytes bigint;
