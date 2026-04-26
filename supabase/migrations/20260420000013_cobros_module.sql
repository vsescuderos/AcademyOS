-- Bloque 0: academy phone
ALTER TABLE academies ADD COLUMN IF NOT EXISTS phone text;

-- Bloque 1: payments — new columns
ALTER TABLE payments ADD COLUMN IF NOT EXISTS received_by uuid REFERENCES profiles(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number integer;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes text;

-- Extend status CHECK to include 'reported'
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'reported', 'validated'));

-- Unique receipt number per academy (NULL values excluded automatically)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_academy_receipt_unique;
ALTER TABLE payments ADD CONSTRAINT payments_academy_receipt_unique
  UNIQUE (academy_id, receipt_number);

-- receipt_sequences: one row per academy, auto-incremented
CREATE TABLE IF NOT EXISTS receipt_sequences (
  academy_id  uuid PRIMARY KEY REFERENCES academies(id) ON DELETE CASCADE,
  last_number integer NOT NULL DEFAULT 0
);

ALTER TABLE receipt_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Directors manage receipt_sequences"
  ON receipt_sequences FOR ALL
  USING (get_user_role() = 'director' AND academy_id = get_user_academy_id());

-- Atomic receipt number generator (SECURITY DEFINER runs as owner, bypasses RLS)
CREATE OR REPLACE FUNCTION get_next_receipt_number(p_academy_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_next integer;
BEGIN
  INSERT INTO receipt_sequences (academy_id, last_number)
  VALUES (p_academy_id, 1)
  ON CONFLICT (academy_id) DO UPDATE
    SET last_number = receipt_sequences.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN v_next;
END;
$$;

-- RLS: professors can INSERT payments with status='reported'
CREATE POLICY "Professors insert payments"
  ON payments FOR INSERT
  WITH CHECK (
    get_user_role() = 'profesor' AND
    academy_id = get_user_academy_id() AND
    status = 'reported' AND
    received_by = auth.uid()
  );

-- RLS: professors can read their own payments
CREATE POLICY "Professors read own payments"
  ON payments FOR SELECT
  USING (
    get_user_role() = 'profesor' AND
    academy_id = get_user_academy_id() AND
    received_by = auth.uid()
  );
