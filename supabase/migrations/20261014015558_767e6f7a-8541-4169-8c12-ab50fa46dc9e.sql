CREATE TABLE public.mesh_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id text NOT NULL UNIQUE,
  tenant_id uuid NOT NULL,
  label text NOT NULL,
  ip_allowlist text[] NOT NULL DEFAULT '{}',
  token_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
GRANT SELECT, UPDATE, DELETE ON public.mesh_nodes TO authenticated;
GRANT ALL ON public.mesh_nodes TO service_role;
ALTER TABLE public.mesh_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read nodes" ON public.mesh_nodes FOR SELECT TO authenticated USING (tenant_id = auth.uid());
CREATE POLICY "Owners update nodes" ON public.mesh_nodes FOR UPDATE TO authenticated USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Owners delete nodes" ON public.mesh_nodes FOR DELETE TO authenticated USING (tenant_id = auth.uid());
CREATE INDEX mesh_nodes_tenant_idx ON public.mesh_nodes (tenant_id);

CREATE OR REPLACE FUNCTION public.mesh_nodes_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_mesh_nodes_touch BEFORE UPDATE ON public.mesh_nodes FOR EACH ROW EXECUTE FUNCTION public.mesh_nodes_touch();

CREATE TABLE public.vulture_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id text NOT NULL,
  node_id text NOT NULL,
  tenant_id uuid,
  source text NOT NULL DEFAULT 'mesh',
  original_file_name text,
  raw_hash text NOT NULL,
  sanitized_hash text NOT NULL,
  payload jsonb NOT NULL,
  record_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'staged_for_notarization'
    CHECK (status IN ('received','sanitized','staged_for_notarization','anchored','failed')),
  batch_id uuid,
  tx_hash text,
  anchored_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vulture_ledger TO authenticated;
GRANT SELECT, INSERT ON public.vulture_ledger TO service_role;
GRANT UPDATE (status, batch_id, tx_hash, anchored_at) ON public.vulture_ledger TO service_role;
REVOKE UPDATE, DELETE, TRUNCATE ON public.vulture_ledger FROM anon, authenticated;
REVOKE DELETE, TRUNCATE ON public.vulture_ledger FROM service_role;
ALTER TABLE public.vulture_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants and executives read ledger" ON public.vulture_ledger FOR SELECT TO authenticated
  USING (tenant_id = auth.uid() OR public.is_csuite(auth.uid()));
CREATE INDEX vulture_ledger_created_idx ON public.vulture_ledger (created_at DESC);
CREATE INDEX vulture_ledger_status_idx ON public.vulture_ledger (status);

CREATE OR REPLACE FUNCTION public.prevent_vulture_mutation() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION '[VULTURE_SECURITY_VIOLATION] Records in % are immutable and cannot be deleted.', TG_TABLE_NAME;
  END IF;
  IF TG_TABLE_NAME = 'vulture_ledger' AND (
       NEW.id IS DISTINCT FROM OLD.id OR NEW.trace_id IS DISTINCT FROM OLD.trace_id
    OR NEW.node_id IS DISTINCT FROM OLD.node_id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.raw_hash IS DISTINCT FROM OLD.raw_hash OR NEW.sanitized_hash IS DISTINCT FROM OLD.sanitized_hash
    OR NEW.payload IS DISTINCT FROM OLD.payload OR NEW.record_count IS DISTINCT FROM OLD.record_count
    OR NEW.source IS DISTINCT FROM OLD.source OR NEW.original_file_name IS DISTINCT FROM OLD.original_file_name
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR OLD.status = 'anchored') THEN
    RAISE EXCEPTION '[VULTURE_SECURITY_VIOLATION] Records in vulture_ledger are immutable; only anchoring fields may be set before anchoring.';
  END IF;
  IF TG_TABLE_NAME = 'vulture_quarantine' THEN
    RAISE EXCEPTION '[VULTURE_SECURITY_VIOLATION] Quarantine records are immutable.';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_vulture_immutable BEFORE UPDATE OR DELETE ON public.vulture_ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_vulture_mutation();

CREATE TABLE public.vulture_quarantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id text NOT NULL,
  node_id text,
  tenant_id uuid,
  raw_hash text NOT NULL,
  raw_payload text,
  reason_code text NOT NULL,
  reason_detail jsonb NOT NULL DEFAULT '{}',
  contractor_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vulture_quarantine TO authenticated;
GRANT SELECT, INSERT ON public.vulture_quarantine TO service_role;
ALTER TABLE public.vulture_quarantine ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants and executives read quarantine" ON public.vulture_quarantine FOR SELECT TO authenticated
  USING (tenant_id = auth.uid() OR public.is_csuite(auth.uid()));
CREATE TRIGGER trg_vulture_quarantine_immutable BEFORE UPDATE OR DELETE ON public.vulture_quarantine
  FOR EACH ROW EXECUTE FUNCTION public.prevent_vulture_mutation();

ALTER TABLE public.vulture_ledger REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vulture_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vulture_quarantine;