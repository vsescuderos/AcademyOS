-- Test seed — DO NOT run in production
-- Academia de test
INSERT INTO academies (id, name)
VALUES ('10000000-0000-0000-0000-000000000001', 'Academia Test')
ON CONFLICT (id) DO NOTHING;

-- Usuarios en auth.users
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
(
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'director@academyos.test',
  crypt('Director123!', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}', false,
  '', '', '', ''
),
(
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'profesor@academyos.test',
  crypt('Profesor123!', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}', false,
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- Identidades
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
(
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'director@academyos.test',
  '{"sub":"20000000-0000-0000-0000-000000000001","email":"director@academyos.test"}',
  'email', now(), now(), now()
),
(
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  'profesor@academyos.test',
  '{"sub":"20000000-0000-0000-0000-000000000002","email":"profesor@academyos.test"}',
  'email', now(), now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- Perfiles
-- DO UPDATE porque el trigger on_auth_user_created ya habrá insertado un perfil
-- con role='director' al insertar auth.users arriba. Aquí corregimos los valores
-- definitivos (rol, academia, nombre) para los usuarios de test.
INSERT INTO profiles (id, academy_id, role, full_name, email)
VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'director', 'Director Test', 'director@academyos.test'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'profesor', 'Profesor Test',  'profesor@academyos.test')
ON CONFLICT (id) DO UPDATE
  SET role       = EXCLUDED.role,
      academy_id = EXCLUDED.academy_id,
      full_name  = EXCLUDED.full_name,
      email      = EXCLUDED.email;

-- Grupo de test asignado al profesor
INSERT INTO groups (id, academy_id, profesor_id, name, days, time_start, time_end)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  'Grupo Avanzado — Lunes',
  ARRAY['lunes'],
  '18:00',
  '19:30'
) ON CONFLICT (id) DO NOTHING;

-- Alumnos de test
INSERT INTO students (id, academy_id, full_name)
VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ana García Pérez'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Luis Martínez Ruiz'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Marta López Sánchez')
ON CONFLICT (id) DO NOTHING;

-- Matriculaciones
INSERT INTO group_students (group_id, student_id, academy_id)
VALUES
  ('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001')
ON CONFLICT (group_id, student_id) DO NOTHING;
