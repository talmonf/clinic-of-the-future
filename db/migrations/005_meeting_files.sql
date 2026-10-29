-- Document files for a working meeting, stored in the private S3 bucket.
-- Run this yourself on Neon after 004. The app does not apply it.
-- Safe to run again.

CREATE TABLE IF NOT EXISTS meeting_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings (id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  object_key text NOT NULL UNIQUE,
  file_name text NOT NULL,
  content_type text NOT NULL,
  byte_size bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meeting_files_meeting_id_idx ON meeting_files (meeting_id);
