ALTER TABLE groups ADD COLUMN max_students integer NOT NULL DEFAULT 20 CHECK (max_students >= 1);
