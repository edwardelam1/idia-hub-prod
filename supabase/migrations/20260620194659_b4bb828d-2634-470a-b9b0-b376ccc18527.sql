CREATE TABLE public.mcp_manifests (
  user_id UUID NOT NULL PRIMARY KEY,
  tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_manifests TO authenticated;
GRANT ALL ON public.mcp_manifests TO service_role;

ALTER TABLE public.mcp_manifests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own MCP manifest"
ON public.mcp_manifests
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.mcp_manifests_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_mcp_manifests_touch
BEFORE UPDATE ON public.mcp_manifests
FOR EACH ROW EXECUTE FUNCTION public.mcp_manifests_touch_updated_at();