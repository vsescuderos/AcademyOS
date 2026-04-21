-- Junction table: one director can own multiple academies
CREATE TABLE director_academies (
  director_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  academy_id  uuid NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (director_id, academy_id)
);

ALTER TABLE director_academies ENABLE ROW LEVEL SECURITY;

-- Directors can only see their own links
CREATE POLICY "Directors read own academy links"
  ON director_academies FOR SELECT
  USING (director_id = auth.uid());

-- Seed existing director→academy relationships
INSERT INTO director_academies (director_id, academy_id)
SELECT id, academy_id
FROM profiles
WHERE role = 'director' AND academy_id IS NOT NULL
ON CONFLICT DO NOTHING;
