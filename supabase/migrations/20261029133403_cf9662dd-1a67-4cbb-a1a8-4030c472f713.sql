-- ===== Helpers =====
CREATE OR REPLACE FUNCTION public.is_aal2()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

CREATE OR REPLACE FUNCTION public.is_vulture_tenant(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_csuite(_user_id)
      OR public.has_role(_user_id, 'super_admin')
      OR public.has_role(_user_id, 'security_operator')
      OR EXISTS (SELECT 1 FROM public.user_subscriptions
                 WHERE user_id = _user_id AND status = 'active' AND lower(tier) = 'enterprise')
$$;
REVOKE EXECUTE ON FUNCTION public.is_vulture_tenant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_vulture_tenant(uuid) TO authenticated, service_role;

-- ===== Columns =====
ALTER TABLE public.vulture_ledger
  ADD COLUMN IF NOT EXISTS cjis_isolated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payload_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS merkle_leaf_index integer;
ALTER TABLE public.vulture_ledger ALTER COLUMN payload DROP NOT NULL;

ALTER TABLE public.vulture_quarantine
  ADD COLUMN IF NOT EXISTS cjis_isolated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS raw_payload_ciphertext bytea;

ALTER TABLE public.mesh_nodes
  ADD COLUMN IF NOT EXISTS cjis_isolated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid,
  ADD COLUMN IF NOT EXISTS revoked_ip text,
  ADD COLUMN IF NOT EXISTS revocation_reason text,
  ADD COLUMN IF NOT EXISTS rotated_from uuid;

ALTER TABLE public.vulture_provenance_ledger
  ADD COLUMN IF NOT EXISTS owner uuid DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS cjis_isolated boolean NOT NULL DEFAULT false;

-- One ledger row per uploaded object (makes trigger + client dispatch idempotent).
CREATE UNIQUE INDEX IF NOT EXISTS vulture_ledger_upload_once
  ON public.vulture_ledger (original_file_name) WHERE source = 'upload';
CREATE INDEX IF NOT EXISTS vulture_ledger_notarization_queue
  ON public.vulture_ledger (created_at, id) WHERE status = 'staged_for_notarization';

-- ===== Encryption key (generated inside the database, never transmitted) =====
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'vulture_payload_key') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'base64'),
      'vulture_payload_key',
      'AES-256 key for Vulture CJIS column-level encryption'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.vulture_encrypt_payload()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, vault AS $$
DECLARE k text;
BEGIN
  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name = 'vulture_payload_key' LIMIT 1;
  IF k IS NULL THEN
    RAISE EXCEPTION '[VULTURE_CRYPTO] encryption key unavailable — write refused';
  END IF;
  IF TG_TABLE_NAME = 'vulture_ledger' THEN
    IF NEW.payload IS NOT NULL THEN
      NEW.payload_ciphertext := extensions.pgp_sym_encrypt(NEW.payload::text, k, 'cipher-algo=aes256, compress-algo=0, s2k-mode=3');
      NEW.payload := NULL;
    END IF;
    IF NEW.payload_ciphertext IS NULL THEN
      RAISE EXCEPTION '[VULTURE_CRYPTO] ledger payload required';
    END IF;
  ELSIF TG_TABLE_NAME = 'vulture_quarantine' THEN
    IF NEW.raw_payload IS NOT NULL THEN
      NEW.raw_payload_ciphertext := extensions.pgp_sym_encrypt(NEW.raw_payload, k, 'cipher-algo=aes256, compress-algo=0, s2k-mode=3');
      NEW.raw_payload := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.vulture_encrypt_payload() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_vulture_ledger_encrypt ON public.vulture_ledger;
CREATE TRIGGER trg_vulture_ledger_encrypt BEFORE INSERT ON public.vulture_ledger
  FOR EACH ROW EXECUTE FUNCTION public.vulture_encrypt_payload();
DROP TRIGGER IF EXISTS trg_vulture_quarantine_encrypt ON public.vulture_quarantine;
CREATE TRIGGER trg_vulture_quarantine_encrypt BEFORE INSERT ON public.vulture_quarantine
  FOR EACH ROW EXECUTE FUNCTION public.vulture_encrypt_payload();

-- Extend append-only guard to the new immutable columns.
CREATE OR REPLACE FUNCTION public.prevent_vulture_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION '[VULTURE_SECURITY_VIOLATION] Records in % are immutable and cannot be deleted.', TG_TABLE_NAME;
  END IF;
  IF TG_TABLE_NAME = 'vulture_ledger' AND (
       NEW.id IS DISTINCT FROM OLD.id OR NEW.trace_id IS DISTINCT FROM OLD.trace_id
    OR NEW.node_id IS DISTINCT FROM OLD.node_id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.raw_hash IS DISTINCT FROM OLD.raw_hash OR NEW.sanitized_hash IS DISTINCT FROM OLD.sanitized_hash
    OR NEW.payload IS DISTINCT FROM OLD.payload OR NEW.payload_ciphertext IS DISTINCT FROM OLD.payload_ciphertext
    OR NEW.record_count IS DISTINCT FROM OLD.record_count
    OR NEW.source IS DISTINCT FROM OLD.source OR NEW.original_file_name IS DISTINCT FROM OLD.original_file_name
    OR NEW.cjis_isolated IS DISTINCT FROM OLD.cjis_isolated
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR OLD.status = 'anchored') THEN
    RAISE EXCEPTION '[VULTURE_SECURITY_VIOLATION] Records in vulture_ledger are immutable; only anchoring fields may be set before anchoring.';
  END IF;
  IF TG_TABLE_NAME = 'vulture_quarantine' THEN
    RAISE EXCEPTION '[VULTURE_SECURITY_VIOLATION] Quarantine records are immutable.';
  END IF;
  RETURN NEW;
END $$;

-- Guarded decryption: owner or C-suite, authenticator-app session, every read audited.
CREATE OR REPLACE FUNCTION public.vulture_read_payload(_kind text, _id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, vault AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant uuid; v_cipher bytea; v_cjis boolean; v_key text; v_plain text;
  v_ip text := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', 'unknown'), ',', 1);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_aal2() THEN RAISE EXCEPTION 'Authenticator verification required' USING ERRCODE = '42501'; END IF;

  IF _kind = 'ledger' THEN
    SELECT tenant_id, payload_ciphertext, cjis_isolated INTO v_tenant, v_cipher, v_cjis FROM public.vulture_ledger WHERE id = _id;
  ELSIF _kind = 'quarantine' THEN
    SELECT tenant_id, raw_payload_ciphertext, cjis_isolated INTO v_tenant, v_cipher, v_cjis FROM public.vulture_quarantine WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'Unknown record kind';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
  IF v_tenant IS DISTINCT FROM v_uid AND NOT public.is_csuite(v_uid) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.security_events(agent_name, action_type, severity, result_data)
  VALUES ('crazy_insight', 'cjis_ledger_read', 'info', jsonb_build_object(
    'operator_id', v_uid, 'source_ip', trim(v_ip), 'record_kind', _kind, 'record_id', _id,
    'cjis_isolated', v_cjis, 'read_at', now()));

  IF v_cipher IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vulture_payload_key' LIMIT 1;
  v_plain := extensions.pgp_sym_decrypt(v_cipher, v_key);
  IF _kind = 'ledger' THEN RETURN v_plain::jsonb; END IF;
  RETURN to_jsonb(v_plain);
END $$;
REVOKE EXECUTE ON FUNCTION public.vulture_read_payload(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulture_read_payload(text, uuid) TO authenticated;

-- ===== Grants: browsers may only read; all writes go through edge functions =====
REVOKE ALL ON public.vulture_ledger, public.vulture_quarantine, public.mesh_nodes FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.vulture_ledger, public.vulture_quarantine, public.mesh_nodes FROM authenticated;
GRANT SELECT ON public.vulture_ledger, public.vulture_quarantine, public.mesh_nodes TO authenticated;
GRANT ALL ON public.vulture_ledger, public.vulture_quarantine, public.mesh_nodes TO service_role;

REVOKE ALL ON public.vulture_provenance_ledger FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE ON public.vulture_provenance_ledger FROM authenticated;
GRANT SELECT, INSERT ON public.vulture_provenance_ledger TO authenticated;
GRANT ALL ON public.vulture_provenance_ledger TO service_role;

-- ===== RLS =====
DROP POLICY IF EXISTS "Tenants and executives read ledger" ON public.vulture_ledger;
CREATE POLICY "Tenants and executives read ledger (MFA)" ON public.vulture_ledger
  FOR SELECT TO authenticated
  USING ((tenant_id = auth.uid() OR public.is_csuite(auth.uid())) AND public.is_aal2());

DROP POLICY IF EXISTS "Tenants and executives read quarantine" ON public.vulture_quarantine;
CREATE POLICY "Tenants and executives read quarantine (MFA)" ON public.vulture_quarantine
  FOR SELECT TO authenticated
  USING ((tenant_id = auth.uid() OR public.is_csuite(auth.uid())) AND public.is_aal2());

DROP POLICY IF EXISTS "Owners read nodes" ON public.mesh_nodes;
DROP POLICY IF EXISTS "Owners update nodes" ON public.mesh_nodes;
DROP POLICY IF EXISTS "Owners delete nodes" ON public.mesh_nodes;
CREATE POLICY "Owners read nodes (MFA)" ON public.mesh_nodes
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid() AND public.is_aal2());

DROP POLICY IF EXISTS "Admins read vulture ledger" ON public.vulture_provenance_ledger;
CREATE POLICY "Owners and executives read provenance (MFA)" ON public.vulture_provenance_ledger
  FOR SELECT TO authenticated
  USING ((owner = auth.uid() OR public.is_csuite(auth.uid())) AND public.is_aal2());
CREATE POLICY "Tenants record own provenance (MFA)" ON public.vulture_provenance_ledger
  FOR INSERT TO authenticated
  WITH CHECK (owner = auth.uid() AND public.is_vulture_tenant(auth.uid()) AND public.is_aal2());

-- ===== Storage: per-owner folders in the quarantine bucket =====
DROP POLICY IF EXISTS "Vulture admins can insert quarantine" ON storage.objects;
DROP POLICY IF EXISTS "Vulture admins can read quarantine" ON storage.objects;
DROP POLICY IF EXISTS "Vulture admins can read manifests" ON storage.objects;

CREATE POLICY "Vulture tenants upload own quarantine (MFA)" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'idia-data-quarantine-prod'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_vulture_tenant(auth.uid())
    AND public.is_aal2());
CREATE POLICY "Vulture tenants read own quarantine (MFA)" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'idia-data-quarantine-prod'
    AND (owner_id = auth.uid()::text OR public.is_csuite(auth.uid()))
    AND public.is_aal2());
CREATE POLICY "Vulture tenants read own manifests (MFA)" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'rehabilitated-manifests'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_csuite(auth.uid()))
    AND public.is_aal2());

-- Storage dispatch now authenticates to the sanitization agent with the service key.
CREATE OR REPLACE FUNCTION public.vulture_dispatch_sanitization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, vault, extensions AS $$
DECLARE v_url text; v_key text; v_request_id bigint;
BEGIN
  IF NEW.bucket_id <> 'idia-data-quarantine-prod' THEN RETURN NEW; END IF;
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vulture_webhook_url' LIMIT 1;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING '[Vulture.TriggerDispatch.Stall] webhook url or service key not configured';
    RETURN NEW;
  END IF;
  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-vulture-source', 'pg_trigger',
                                  'Authorization', 'Bearer ' || v_key),
    body := jsonb_build_object('bucket', NEW.bucket_id, 'name', NEW.name, 'object_id', NEW.id,
                               'owner', NEW.owner, 'created_at', NEW.created_at),
    timeout_milliseconds := 30000
  ) INTO v_request_id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[Vulture.TriggerDispatch.Stall] %', SQLERRM;
  RETURN NEW;
END $$;

-- ===== Notarization batches =====
CREATE TABLE IF NOT EXISTS public.vulture_notarization_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merkle_root text NOT NULL,
  leaf_count integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  chain_id integer NOT NULL DEFAULT 8453,
  relayer_address text,
  tx_hash text,
  block_number bigint,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vulture_notarization_batches TO authenticated;
GRANT ALL ON public.vulture_notarization_batches TO service_role;
ALTER TABLE public.vulture_notarization_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants read batches holding their rows (MFA)" ON public.vulture_notarization_batches
  FOR SELECT TO authenticated
  USING (public.is_aal2() AND (public.is_csuite(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.vulture_ledger l WHERE l.batch_id = vulture_notarization_batches.id AND l.tenant_id = auth.uid())));

CREATE OR REPLACE FUNCTION public.vulture_batches_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_vulture_batches_touch ON public.vulture_notarization_batches;
CREATE TRIGGER trg_vulture_batches_touch BEFORE UPDATE ON public.vulture_notarization_batches
  FOR EACH ROW EXECUTE FUNCTION public.vulture_batches_touch();