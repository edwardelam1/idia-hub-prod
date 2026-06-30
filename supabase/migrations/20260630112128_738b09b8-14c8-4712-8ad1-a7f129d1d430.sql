-- Sovereign Vault: Supabase-backed vault_notes table
CREATE TABLE public.vault_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_notes TO authenticated;
GRANT ALL ON public.vault_notes TO service_role;

ALTER TABLE public.vault_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_notes owner select" ON public.vault_notes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "vault_notes owner insert" ON public.vault_notes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vault_notes owner update" ON public.vault_notes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vault_notes owner delete" ON public.vault_notes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX vault_notes_tsv_idx ON public.vault_notes USING gin(tsv);
CREATE INDEX vault_notes_user_id_idx ON public.vault_notes(user_id);
CREATE INDEX vault_notes_tags_idx ON public.vault_notes USING gin(tags);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.vault_notes_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER vault_notes_set_updated_at
  BEFORE UPDATE ON public.vault_notes
  FOR EACH ROW EXECUTE FUNCTION public.vault_notes_touch_updated_at();

-- Atomic append RPC with row lock; scoped to caller via auth.uid()
CREATE OR REPLACE FUNCTION public.vault_note_append(p_note_id uuid, p_content text)
RETURNS public.vault_notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.vault_notes;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  SELECT * INTO v_row FROM public.vault_notes
   WHERE id = p_note_id AND user_id = v_uid
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'note not found';
  END IF;

  UPDATE public.vault_notes
     SET content = content || p_content
   WHERE id = p_note_id AND user_id = v_uid
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.vault_note_append(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vault_note_append(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vault_note_append(uuid, text) TO service_role;