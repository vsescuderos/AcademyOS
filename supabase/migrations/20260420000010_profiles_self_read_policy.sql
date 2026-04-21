-- Allow any authenticated user to read their own profile row.
-- Required for directors with academy_id = NULL (new signup, no academy yet).
-- The existing "Users read profiles of own academy" policy covers reading
-- other profiles in the same academy; this one covers self-reads only.
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());
