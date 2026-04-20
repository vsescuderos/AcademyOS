-- Add schedule fields to groups
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS days text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS time_start time,
  ADD COLUMN IF NOT EXISTS time_end time;

-- Allow groups without an assigned professor
ALTER TABLE groups ALTER COLUMN profesor_id DROP NOT NULL;

-- Cascade-delete group_students when group is deleted
ALTER TABLE group_students DROP CONSTRAINT group_students_group_id_fkey;
ALTER TABLE group_students ADD CONSTRAINT group_students_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
