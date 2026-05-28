
-- ============================================================
-- THE VULTURE: Quarantine, Provenance, Vault, Trigger
-- Admin gating uses public.is_csuite(uid) (existing function).
-- ============================================================

-- 1) Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('idia-data-quarantine-prod', 'idia-data-quarantine-prod', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('rehabilitated-manifests', 'rehabilitated-manifests', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Storage RLS policies
DROP POLICY IF EXISTS "Vulture admins can insert quarantine" ON storage.objects;
CREATE POLICY "Vulture admins can insert quarantine"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'idia-data-quarantine-prod'
  AND public.is_csuite(auth.uid())
);

DROP POLICY IF EXISTS "Vulture admins can read quarantine" ON storage.objects;
CREATE POLICY "Vulture admins can read quarantine"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'idia-data-quarantine-prod'
  AND public.is_csuite(auth.uid())
);

DROP POLICY IF EXISTS "Vulture admins can read manifests" ON storage.objects;
CREATE POLICY "Vulture admins can read manifests"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'rehabilitated-manifests'
  AND public.is_csuite(auth.uid())
);

-- 3) Immutability lock
CREATE OR REPLACE FUNCTION public.vulture_block_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.bucket_id = 'idia-data-quarantine-prod')
     OR (TG_OP = 'UPDATE' AND OLD.bucket_id = 'idia-data-quarantine-prod') THEN
    RAISE EXCEPTION '[Vulture.Airlock] Quarantine bucket is immutable: % denied on %', TG_OP, OLD.name;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS vulture_quarantine_immutable ON storage.objects;
CREATE TRIGGER vulture_quarantine_immutable
BEFORE UPDATE OR DELETE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.vulture_block_mutation();

-- 4) Provenance Ledger
CREATE TABLE IF NOT EXISTS public.vulture_provenance_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_file_name text NOT NULL,
  bucket_path text,
  record_count integer DEFAULT 0,
  action text NOT NULL DEFAULT 'sanitize',
  status text NOT NULL DEFAULT 'processing',
  error_message text,
  original_hash text,
  sanitized_hash text,
  manifest_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vulture_provenance_ledger TO authenticated;
GRANT ALL ON public.vulture_provenance_ledger TO service_role;

ALTER TABLE public.vulture_provenance_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read vulture ledger" ON public.vulture_provenance_ledger;
CREATE POLICY "Admins read vulture ledger"
ON public.vulture_provenance_ledger FOR SELECT TO authenticated
USING (public.is_csuite(auth.uid()));

DROP POLICY IF EXISTS "Service inserts vulture ledger" ON public.vulture_provenance_ledger;
CREATE POLICY "Service inserts vulture ledger"
ON public.vulture_provenance_ledger FOR INSERT TO service_role
WITH CHECK (true);

ALTER TABLE public.vulture_provenance_ledger REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'vulture_provenance_ledger'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.vulture_provenance_ledger';
  END IF;
END $$;

-- 5) Vault secrets
DO $$
DECLARE existing uuid;
BEGIN
  SELECT id INTO existing FROM vault.secrets WHERE name = 'vulture_hash_salt';
  IF existing IS NULL THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'vulture_hash_salt',
      'PII hashing salt for Vulture sanitization agent'
    );
  END IF;

  SELECT id INTO existing FROM vault.secrets WHERE name = 'vulture_webhook_url';
  IF existing IS NULL THEN
    PERFORM vault.create_secret(
      'https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/vulture-sanitization-agent',
      'vulture_webhook_url',
      'Vulture sanitization agent endpoint'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_vulture_salt()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE v_salt text;
BEGIN
  SELECT decrypted_secret INTO v_salt
  FROM vault.decrypted_secrets
  WHERE name = 'vulture_hash_salt'
  LIMIT 1;
  RETURN v_salt;
END;
$$;

REVOKE ALL ON FUNCTION public.get_vulture_salt() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vulture_salt() TO service_role;

-- 6) Trigger: pg_net dispatch on quarantine inserts
CREATE OR REPLACE FUNCTION public.vulture_dispatch_sanitization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_url text;
  v_request_id bigint;
BEGIN
  IF NEW.bucket_id <> 'idia-data-quarantine-prod' THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets WHERE name = 'vulture_webhook_url' LIMIT 1;

  IF v_url IS NULL THEN
    RAISE WARNING '[Vulture.TriggerDispatch.Stall] vulture_webhook_url not configured';
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-vulture-source', 'pg_trigger'
    ),
    body := jsonb_build_object(
      'bucket', NEW.bucket_id,
      'name', NEW.name,
      'object_id', NEW.id,
      'owner', NEW.owner,
      'created_at', NEW.created_at
    ),
    timeout_milliseconds := 30000
  ) INTO v_request_id;

  RAISE NOTICE '[Vulture.TriggerDispatch] request_id=% object=%', v_request_id, NEW.name;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[Vulture.TriggerDispatch.Stall] %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vulture_on_quarantine_insert ON storage.objects;
CREATE TRIGGER vulture_on_quarantine_insert
AFTER INSERT ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.vulture_dispatch_sanitization();
