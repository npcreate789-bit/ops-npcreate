-- Staff delete helper: reassign FKs to profiles (storage purge uses Storage API in edge fn).

CREATE OR REPLACE FUNCTION public.reassign_staff_user_references(
  p_from_user_id UUID,
  p_to_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_sql TEXT;
BEGIN
  IF p_from_user_id IS NULL OR p_to_user_id IS NULL THEN
    RAISE EXCEPTION 'missing user id';
  END IF;

  IF p_from_user_id = p_to_user_id THEN
    RAISE EXCEPTION 'cannot reassign to same user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_to_user_id) THEN
    RAISE EXCEPTION 'fallback profile not found';
  END IF;

  FOR r IN
    SELECT DISTINCT
      c.conrelid::regclass AS tbl,
      a.attname AS col,
      c.confdeltype AS on_delete
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
      AND a.attnum = ANY (c.conkey)
      AND NOT a.attisdropped
    WHERE c.confrelid = 'public.profiles'::regclass
      AND c.contype = 'f'
      AND c.conrelid <> 'public.profiles'::regclass
  LOOP
    IF r.on_delete = 'c' THEN
      CONTINUE;
    END IF;

    IF r.on_delete = 'n' THEN
      v_sql := format(
        'UPDATE %s SET %I = NULL WHERE %I = $1',
        r.tbl,
        r.col,
        r.col
      );
      EXECUTE v_sql USING p_from_user_id;
    ELSE
      v_sql := format(
        'UPDATE %s SET %I = $2 WHERE %I = $1',
        r.tbl,
        r.col,
        r.col
      );
      EXECUTE v_sql USING p_from_user_id, p_to_user_id;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reassign_staff_user_references(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reassign_staff_user_references(UUID, UUID) TO service_role;
