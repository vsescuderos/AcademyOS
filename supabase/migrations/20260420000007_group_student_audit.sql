CREATE TABLE IF NOT EXISTS group_student_audit (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id     uuid        NOT NULL,
  group_id       uuid        NOT NULL REFERENCES groups(id),
  student_id     uuid        NOT NULL,
  student_name   text        NOT NULL,
  sessions_count integer     NOT NULL,
  removed_by     uuid        NOT NULL,
  removed_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE group_student_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "director_read_audit"
  ON group_student_audit FOR SELECT
  USING (
    academy_id = (SELECT academy_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'director'
  );
