-- academies
CREATE TABLE academies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- profiles
CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id uuid NOT NULL REFERENCES academies(id),
  role       text NOT NULL CHECK (role IN ('director', 'profesor', 'superadmin')),
  full_name  text NOT NULL,
  email      text,
  created_at timestamptz DEFAULT now()
);

-- groups
CREATE TABLE groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id  uuid NOT NULL REFERENCES academies(id),
  profesor_id uuid NOT NULL REFERENCES profiles(id),
  name        text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (academy_id, name)
);

-- students
CREATE TABLE students (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES academies(id),
  full_name  text NOT NULL,
  email      text,
  phone      text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- group_students
CREATE TABLE group_students (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES groups(id),
  student_id  uuid NOT NULL REFERENCES students(id),
  academy_id  uuid NOT NULL REFERENCES academies(id),
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE (group_id, student_id)
);

-- attendance_sessions
CREATE TABLE attendance_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES academies(id),
  group_id   uuid NOT NULL REFERENCES groups(id),
  date       date NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (group_id, date)
);

-- attendance_records
CREATE TABLE attendance_records (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES academies(id),
  session_id uuid NOT NULL REFERENCES attendance_sessions(id),
  student_id uuid NOT NULL REFERENCES students(id),
  status     text NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (session_id, student_id)
);

-- payments
CREATE TABLE payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id    uuid NOT NULL REFERENCES academies(id),
  student_id    uuid NOT NULL REFERENCES students(id),
  amount        numeric(10,2) NOT NULL CHECK (amount > 0),
  concept       text NOT NULL,
  method        text NOT NULL CHECK (method IN ('cash', 'card')),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated')),
  registered_by uuid NOT NULL REFERENCES profiles(id),
  validated_by  uuid REFERENCES profiles(id),
  registered_at timestamptz NOT NULL DEFAULT now(),
  validated_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);
