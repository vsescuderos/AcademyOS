-- Enable RLS
ALTER TABLE academies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE students            ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_students      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION get_user_academy_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT academy_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- academies
CREATE POLICY "Users read own academy"
  ON academies FOR SELECT
  USING (id = get_user_academy_id());

-- profiles
CREATE POLICY "Users read profiles of own academy"
  ON profiles FOR SELECT
  USING (academy_id = get_user_academy_id());

CREATE POLICY "Directors insert profiles in own academy"
  ON profiles FOR INSERT
  WITH CHECK (get_user_role() = 'director' AND academy_id = get_user_academy_id());

CREATE POLICY "Directors update profiles in own academy"
  ON profiles FOR UPDATE
  USING (get_user_role() = 'director' AND academy_id = get_user_academy_id());

-- groups
CREATE POLICY "Directors read all groups in own academy"
  ON groups FOR SELECT
  USING (academy_id = get_user_academy_id() AND get_user_role() = 'director');

CREATE POLICY "Professors read assigned groups"
  ON groups FOR SELECT
  USING (academy_id = get_user_academy_id() AND get_user_role() = 'profesor' AND profesor_id = auth.uid());

CREATE POLICY "Directors manage groups"
  ON groups FOR ALL
  USING (get_user_role() = 'director' AND academy_id = get_user_academy_id());

-- students
CREATE POLICY "Users read students of own academy"
  ON students FOR SELECT
  USING (academy_id = get_user_academy_id());

CREATE POLICY "Directors and professors insert students"
  ON students FOR INSERT
  WITH CHECK (get_user_role() IN ('director', 'profesor') AND academy_id = get_user_academy_id());

CREATE POLICY "Directors and professors update students"
  ON students FOR UPDATE
  USING (get_user_role() IN ('director', 'profesor') AND academy_id = get_user_academy_id());

CREATE POLICY "Directors delete students"
  ON students FOR DELETE
  USING (get_user_role() = 'director' AND academy_id = get_user_academy_id());

-- group_students
CREATE POLICY "Users read group_students of own academy"
  ON group_students FOR SELECT
  USING (academy_id = get_user_academy_id());

CREATE POLICY "Directors manage group_students"
  ON group_students FOR ALL
  USING (get_user_role() = 'director' AND academy_id = get_user_academy_id());

-- attendance_sessions
CREATE POLICY "Users read sessions of own academy"
  ON attendance_sessions FOR SELECT
  USING (academy_id = get_user_academy_id());

CREATE POLICY "Directors and professors insert sessions"
  ON attendance_sessions FOR INSERT
  WITH CHECK (
    academy_id = get_user_academy_id() AND (
      get_user_role() = 'director' OR (
        get_user_role() = 'profesor' AND
        EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND g.profesor_id = auth.uid())
      )
    )
  );

-- attendance_records
CREATE POLICY "Users read records of own academy"
  ON attendance_records FOR SELECT
  USING (academy_id = get_user_academy_id());

CREATE POLICY "Directors and professors insert records"
  ON attendance_records FOR INSERT
  WITH CHECK (
    academy_id = get_user_academy_id() AND (
      get_user_role() = 'director' OR (
        get_user_role() = 'profesor' AND
        EXISTS (
          SELECT 1 FROM attendance_sessions s
          JOIN groups g ON g.id = s.group_id
          WHERE s.id = session_id AND g.profesor_id = auth.uid()
        )
      )
    )
  );

-- payments
CREATE POLICY "Directors read payments of own academy"
  ON payments FOR SELECT
  USING (get_user_role() = 'director' AND academy_id = get_user_academy_id());

CREATE POLICY "Directors insert payments"
  ON payments FOR INSERT
  WITH CHECK (get_user_role() = 'director' AND academy_id = get_user_academy_id());

CREATE POLICY "Directors update payments"
  ON payments FOR UPDATE
  USING (get_user_role() = 'director' AND academy_id = get_user_academy_id());
