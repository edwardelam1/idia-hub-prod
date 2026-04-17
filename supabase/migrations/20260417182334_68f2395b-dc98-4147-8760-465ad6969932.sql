UPDATE public.staged_lifestyle_data
SET aca_hash_key = encode(sha256((id::text || COALESCE(entity_id::text,'') || COALESCE(event_type,''))::bytea), 'hex')
WHERE aca_hash_key IS NULL;