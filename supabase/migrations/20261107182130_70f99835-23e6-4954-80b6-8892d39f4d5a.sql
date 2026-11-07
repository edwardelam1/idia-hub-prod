CREATE OR REPLACE FUNCTION public.feature_feed_rate(_tier text) RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE lower(_tier) WHEN 'analyst' THEN 5::numeric WHEN 'professional' THEN 15::numeric WHEN 'enterprise' THEN 50::numeric WHEN 'pure_alpha' THEN 50::numeric ELSE NULL::numeric END $$;
REVOKE ALL ON FUNCTION public.feature_feed_rate(text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.feature_feed_rate(text) TO service_role;
CREATE OR REPLACE FUNCTION public.start_feature_feed_session(_owner uuid,_topic text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.feature_feed_sessions; tier_name text; cost numeric; bal numeric; ctx text;
BEGIN
RAISE LOG '[PHASE_START] FeatureFeed.Session';
IF NOT EXISTS(SELECT 1 FROM feature_feeds WHERE topic=_topic AND status='active') THEN RETURN jsonb_build_object('status','unknown_topic'); END IF;
PERFORM pg_advisory_xact_lock(hashtext('synapse_ledger:'||_owner::text));
SELECT * INTO s FROM feature_feed_sessions WHERE owner_id=_owner AND topic=_topic AND expires_at>now() ORDER BY expires_at DESC LIMIT 1;
IF FOUND THEN RAISE LOG '[PHASE_END] FeatureFeed.Session reused'; RETURN jsonb_build_object('status','active','session_id',s.id,'expires_at',s.expires_at,'credits_charged',s.credits_charged,'reused',true); END IF;
SELECT lower(tier) INTO tier_name FROM user_subscriptions WHERE user_id=_owner AND status='active' AND (expires_at IS NULL OR expires_at>now()) ORDER BY CASE lower(tier) WHEN 'pure_alpha' THEN 4 WHEN 'enterprise' THEN 4 WHEN 'professional' THEN 3 WHEN 'analyst' THEN 2 ELSE 0 END DESC LIMIT 1;
cost:=public.feature_feed_rate(tier_name);
IF cost IS NULL THEN RAISE LOG '[PHASE_END] FeatureFeed.Session tier_required'; RETURN jsonb_build_object('status','tier_required'); END IF;
bal:=coalesce(get_synapse_balance(_owner),0);
IF bal<cost THEN RAISE LOG '[PHASE_END] FeatureFeed.Session insufficient_credits'; RETURN jsonb_build_object('status','insufficient_credits','required_credits',cost,'available_credits',bal,'shortfall',cost-bal); END IF;
INSERT INTO feature_feed_sessions(owner_id,topic,expires_at,credits_charged) VALUES(_owner,_topic,now()+interval '1 hour',cost) RETURNING * INTO s;
INSERT INTO synapse_credit_ledger(user_id,entry_type,amount,transaction_type,status,description,reference_id,transaction_id,metadata) VALUES(_owner,'USAGE',-cost,'fee','settled','Feature feed hourly access: '||_topic,s.id::text,'feature-feed:'||s.id::text,jsonb_build_object('service','feature_feed','topic',_topic,'session_id',s.id,'expires_at',s.expires_at));
RAISE LOG '[PHASE_END] FeatureFeed.Session charged';
RETURN jsonb_build_object('status','active','session_id',s.id,'expires_at',s.expires_at,'credits_charged',cost,'reused',false);
EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS ctx=PG_EXCEPTION_CONTEXT; RAISE LOG '[PHASE_ERROR] FeatureFeed.Session % % %',SQLERRM,SQLSTATE,ctx; RAISE;
END $$;
DO $$ BEGIN
IF public.feature_feed_rate('analyst') IS DISTINCT FROM 5::numeric THEN RAISE EXCEPTION 'Analyst must cost 5 CR'; END IF;
IF public.feature_feed_rate('professional') IS DISTINCT FROM 15::numeric THEN RAISE EXCEPTION 'Professional must cost 15 CR'; END IF;
IF public.feature_feed_rate('enterprise') IS DISTINCT FROM 50::numeric THEN RAISE EXCEPTION 'Enterprise must cost 50 CR'; END IF;
IF public.feature_feed_rate('pure_alpha') IS DISTINCT FROM 50::numeric THEN RAISE EXCEPTION 'pure_alpha uses Enterprise rate'; END IF;
IF public.feature_feed_rate('free') IS NOT NULL THEN RAISE EXCEPTION 'Free must not start paid feed'; END IF;
END $$;