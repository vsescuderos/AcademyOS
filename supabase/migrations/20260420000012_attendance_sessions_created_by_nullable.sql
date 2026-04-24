-- Allow deleting a professor profile without losing historical attendance session data.
-- created_by is an audit field; when the profile is deleted, sessions remain with created_by = NULL.
ALTER TABLE attendance_sessions
  DROP CONSTRAINT attendance_sessions_created_by_fkey,
  ALTER COLUMN created_by DROP NOT NULL,
  ADD CONSTRAINT attendance_sessions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
