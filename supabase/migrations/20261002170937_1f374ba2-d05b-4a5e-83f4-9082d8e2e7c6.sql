CREATE TABLE public.music_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  return_to text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.music_oauth_states TO service_role;
ALTER TABLE public.music_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.music_connections (
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('spotify','apple_music')),
  provider_user_id text,
  display_name text,
  product text,
  scopes text,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);
GRANT ALL ON public.music_connections TO service_role;
ALTER TABLE public.music_connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.music_listening_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  track_id text NOT NULL,
  track_name text NOT NULL,
  artists text,
  album text,
  isrc text,
  duration_ms integer,
  played_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, played_at, track_id)
);
CREATE INDEX music_history_user_idx ON public.music_listening_history (user_id, played_at DESC);
GRANT SELECT ON public.music_listening_history TO authenticated;
GRANT ALL ON public.music_listening_history TO service_role;
ALTER TABLE public.music_listening_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own music history" ON public.music_listening_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.music_user_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('top_artist','top_track','playlist','saved_track')),
  time_range text NOT NULL DEFAULT 'none',
  item_id text NOT NULL,
  name text NOT NULL,
  rank integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, kind, time_range, item_id)
);
CREATE INDEX music_library_user_idx ON public.music_user_library (user_id, provider, kind);
GRANT SELECT ON public.music_user_library TO authenticated;
GRANT ALL ON public.music_user_library TO service_role;
ALTER TABLE public.music_user_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own music library" ON public.music_user_library
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.music_connections_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER music_connections_touch BEFORE UPDATE ON public.music_connections
  FOR EACH ROW EXECUTE FUNCTION public.music_connections_touch();