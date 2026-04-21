-- Allow professors to update attendance records for their own sessions.
-- Required for the upsert in confirmarAsistencia when re-submitting the same day.
CREATE POLICY "Professors update own records"
  ON attendance_records FOR UPDATE
  USING (
    academy_id = get_user_academy_id()
    AND get_user_role() = 'profesor'
    AND EXISTS (
      SELECT 1 FROM attendance_sessions s
      JOIN groups g ON g.id = s.group_id
      WHERE s.id = session_id AND g.profesor_id = auth.uid()
    )
  );
