-- A longer summary for a working meeting, separate from the short summary.
-- Run this yourself on Neon after 003. The app does not apply it.
-- Safe to run again.

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS detailed_summary text NOT NULL DEFAULT '';
