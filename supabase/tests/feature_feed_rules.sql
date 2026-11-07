DO $$ BEGIN
IF public.feature_feed_rate('analyst') IS DISTINCT FROM 5::numeric THEN RAISE EXCEPTION 'Analyst must cost 5 CR'; END IF;
IF public.feature_feed_rate('professional') IS DISTINCT FROM 15::numeric THEN RAISE EXCEPTION 'Professional must cost 15 CR'; END IF;
IF public.feature_feed_rate('enterprise') IS DISTINCT FROM 50::numeric THEN RAISE EXCEPTION 'Enterprise must cost 50 CR'; END IF;
IF public.feature_feed_rate('pure_alpha') IS DISTINCT FROM 50::numeric THEN RAISE EXCEPTION 'pure_alpha must cost 50 CR'; END IF;
IF public.feature_feed_rate('free') IS NOT NULL THEN RAISE EXCEPTION 'Free tier must be rejected'; END IF;
END $$;
