CREATE POLICY "Directors update own academy"
  ON academies FOR UPDATE
  USING (id = get_user_academy_id() AND get_user_role() = 'director');
