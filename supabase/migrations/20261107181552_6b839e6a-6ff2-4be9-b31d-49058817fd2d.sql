CREATE TABLE public.feature_feed_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, topic text NOT NULL, expires_at timestamptz NOT NULL, credits_charged numeric NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.feature_feed_sessions TO authenticated; GRANT ALL ON public.feature_feed_sessions TO service_role;
ALTER TABLE public.feature_feed_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY feed_sessions_owner ON public.feature_feed_sessions FOR SELECT TO authenticated USING(owner_id=auth.uid());
CREATE INDEX feed_session_lookup ON public.feature_feed_sessions(owner_id,topic,expires_at);
CREATE TABLE public.feature_feed_packets (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, topic text NOT NULL, owner_id uuid, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.feature_feed_packets TO authenticated; GRANT ALL ON public.feature_feed_packets TO service_role; GRANT USAGE,SELECT ON SEQUENCE public.feature_feed_packets_id_seq TO service_role;
ALTER TABLE public.feature_feed_packets ENABLE ROW LEVEL SECURITY;
CREATE POLICY feed_packets_paid_owner ON public.feature_feed_packets FOR SELECT TO authenticated USING ((owner_id IS NULL OR owner_id=auth.uid()) AND EXISTS(SELECT 1 FROM public.feature_feed_sessions s WHERE s.owner_id=auth.uid() AND s.topic=feature_feed_packets.topic AND s.expires_at>now()));
CREATE INDEX feed_packet_cursor ON public.feature_feed_packets(topic,owner_id,id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_feed_packets;
CREATE OR REPLACE FUNCTION public.start_feature_feed_session(_owner uuid,_topic text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.feature_feed_sessions; tier_name text; cost numeric; bal numeric;
BEGIN
RAISE LOG '[PHASE_START] FeatureFeed.Session';
IF NOT EXISTS(SELECT 1 FROM feature_feeds WHERE topic=_topic AND status='active') THEN RETURN jsonb_build_object('status','unknown_topic'); END IF;
PERFORM pg_advisory_xact_lock(hashtext('synapse_ledger:'||_owner::text));
SELECT * INTO s FROM feature_feed_sessions WHERE owner_id=_owner AND topic=_topic AND expires_at>now() ORDER BY expires_at DESC LIMIT 1;
IF FOUND THEN RETURN jsonb_build_object('status','active','session_id',s.id,'expires_at',s.expires_at,'credits_charged',s.credits_charged,'reused',true); END IF;
SELECT lower(tier) INTO tier_name FROM user_subscriptions WHERE user_id=_owner AND status='active' AND (expires_at IS NULL OR expires_at>now()) ORDER BY CASE lower(tier) WHEN 'pure_alpha' THEN 4 WHEN 'enterprise' THEN 4 WHEN 'professional' THEN 3 WHEN 'analyst' THEN 2 ELSE 0 END DESC LIMIT 1;
cost:=CASE tier_name WHEN 'analyst' THEN 5 WHEN 'professional' THEN 15 WHEN 'enterprise' THEN 50 WHEN 'pure_alpha' THEN 50 ELSE NULL END;
IF cost IS NULL THEN RETURN jsonb_build_object('status','tier_required'); END IF;
bal:=coalesce(get_synapse_balance(_owner),0);
IF bal<cost THEN RETURN jsonb_build_object('status','insufficient_credits','required_credits',cost,'available_credits',bal,'shortfall',cost-bal); END IF;
INSERT INTO feature_feed_sessions(owner_id,topic,expires_at,credits_charged) VALUES(_owner,_topic,now()+interval '1 hour',cost) RETURNING * INTO s;
INSERT INTO synapse_credit_ledger(user_id,entry_type,amount,transaction_type,status,description,reference_id,transaction_id,metadata) VALUES(_owner,'USAGE',-cost,'fee','settled','Feature feed hourly access: '||_topic,s.id::text,'feature-feed:'||s.id::text,jsonb_build_object('service','feature_feed','topic',_topic,'session_id',s.id,'expires_at',s.expires_at));
RETURN jsonb_build_object('status','active','session_id',s.id,'expires_at',s.expires_at,'credits_charged',cost,'reused',false);
EXCEPTION WHEN OTHERS THEN RAISE LOG '[PHASE_ERROR] FeatureFeed.Session % %',SQLERRM,SQLSTATE; RAISE;
END $$;
REVOKE ALL ON FUNCTION public.start_feature_feed_session(uuid,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.start_feature_feed_session(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.publish_feature_packet(_topic text,_owner uuid,_metrics jsonb,_source text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE last_metrics jsonb;
BEGIN
SELECT payload->'metrics' INTO last_metrics FROM feature_feed_packets WHERE topic=_topic AND owner_id IS NOT DISTINCT FROM _owner ORDER BY id DESC LIMIT 1;
IF last_metrics IS NOT DISTINCT FROM _metrics THEN RETURN; END IF;
INSERT INTO feature_feed_packets(topic,owner_id,payload) VALUES(_topic,_owner,jsonb_build_object('schema_version','1.0','topic',_topic,'observed_at',now(),'metrics',_metrics,'provenance',jsonb_build_object('source',_source,'status','source_aggregate','on_chain_proof',NULL,'contains_personal_identifiers',false)));
END $$;
REVOKE ALL ON FUNCTION public.publish_feature_packet(text,uuid,jsonb,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.publish_feature_packet(text,uuid,jsonb,text) TO service_role;
CREATE OR REPLACE FUNCTION public.publish_feature_feeds() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n bigint; c bigint; r record; metrics jsonb; ctx text;
BEGIN
RAISE LOG '[PHASE_START] FeatureFeed.Publish';
IF NOT pg_try_advisory_xact_lock(hashtext('feature-feed-publisher')) THEN RETURN jsonb_build_object('status','busy'); END IF;
RAISE LOG '[PHASE_START] FeatureFeed.HealthAggregate';
SELECT count(*),count(DISTINCT h.user_id) INTO n,c FROM staged_health_data h WHERE h.raw_data_id IS NOT NULL AND h.aca_hash_key ~ '^[a-fA-F0-9]{64}$' AND lower(h.status) IN ('staged','vetted_and_sold') AND (SELECT lower(cr.decision) FROM consent_registry cr WHERE cr.user_id=h.user_id AND cr.consent_type='feature_feed_health' ORDER BY cr.created_at DESC,cr.id DESC LIMIT 1)='granted';
metrics:=CASE WHEN c>=10 THEN jsonb_build_object('provenance_backed_records',n,'contributor_count',c,'minimum_cohort',10,'suppressed',false) ELSE jsonb_build_object('provenance_backed_records',NULL,'contributor_count',NULL,'minimum_cohort',10,'suppressed',true) END;
PERFORM publish_feature_packet('vault_health_sync',NULL,metrics,'staged_health_data');
RAISE LOG '[PHASE_END] FeatureFeed.HealthAggregate';
RAISE LOG '[PHASE_START] FeatureFeed.OwnerLoop';
FOR r IN SELECT DISTINCT owner_id FROM feature_feed_sessions WHERE expires_at>now() LOOP
RAISE LOG '[PHASE_START] FeatureFeed.FinancialAggregate';
SELECT jsonb_build_object('settled_entries',count(*),'net_credits',round(coalesce(sum(amount),0),4),'usage_credits',round(coalesce(sum(-amount) FILTER(WHERE entry_type='USAGE' AND amount<0),0),4),'currency','CRD') INTO metrics FROM synapse_credit_ledger WHERE user_id=r.owner_id AND status::text IN ('settled','completed');
PERFORM publish_feature_packet('vault_financial_ledger',r.owner_id,metrics,'synapse_credit_ledger');
RAISE LOG '[PHASE_END] FeatureFeed.FinancialAggregate';
RAISE LOG '[PHASE_START] FeatureFeed.IdentityAggregate';
SELECT jsonb_build_object('confirmed_liability_nfts',count(*) FILTER(WHERE nft_minted IS TRUE AND nft_token_id IS NOT NULL AND nft_mint_tx_hash IS NOT NULL),'recorded_receipts',count(*)) INTO metrics FROM egress_logs WHERE coalesce(purchaser_id,user_id)=r.owner_id;
PERFORM publish_feature_packet('vault_identity_stream',r.owner_id,metrics,'egress_logs');
RAISE LOG '[PHASE_END] FeatureFeed.IdentityAggregate';
END LOOP;
RAISE LOG '[PHASE_END] FeatureFeed.OwnerLoop';
DELETE FROM feature_feed_packets WHERE created_at<now()-interval '7 days';
RAISE LOG '[PHASE_END] FeatureFeed.Publish';
RETURN jsonb_build_object('status','published');
EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS ctx=PG_EXCEPTION_CONTEXT; RAISE LOG '[PHASE_ERROR] FeatureFeed.Publish % % %',SQLERRM,SQLSTATE,ctx; RAISE;
END $$;
REVOKE ALL ON FUNCTION public.publish_feature_feeds() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.publish_feature_feeds() TO service_role;
UPDATE feature_feeds SET latency=NULL,description=CASE topic WHEN 'vault_health_sync' THEN 'Provenance-backed data availability; small cohorts suppressed' WHEN 'vault_financial_ledger' THEN 'Your settled Synapse ledger aggregates' WHEN 'vault_identity_stream' THEN 'Your recorded receipts and confirmed Liability Shield mint counts' ELSE description END WHERE topic IN ('vault_health_sync','vault_financial_ledger','vault_identity_stream');
CREATE OR REPLACE FUNCTION public.feature_feed_source_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM publish_feature_feeds(); RETURN NULL; EXCEPTION WHEN OTHERS THEN RAISE LOG '[PHASE_ERROR] FeatureFeed.SourceChanged % %',SQLERRM,SQLSTATE; RETURN NULL; END $$;
REVOKE ALL ON FUNCTION public.feature_feed_source_changed() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER feature_feed_health_changed AFTER INSERT OR UPDATE OR DELETE ON public.staged_health_data FOR EACH STATEMENT EXECUTE FUNCTION public.feature_feed_source_changed();
CREATE TRIGGER feature_feed_ledger_changed AFTER INSERT OR UPDATE OR DELETE ON public.synapse_credit_ledger FOR EACH STATEMENT EXECUTE FUNCTION public.feature_feed_source_changed();
CREATE TRIGGER feature_feed_receipt_changed AFTER INSERT OR UPDATE OR DELETE ON public.egress_logs FOR EACH STATEMENT EXECUTE FUNCTION public.feature_feed_source_changed();
CREATE TRIGGER feature_feed_consent_changed AFTER INSERT OR UPDATE OR DELETE ON public.consent_registry FOR EACH STATEMENT EXECUTE FUNCTION public.feature_feed_source_changed();
SELECT public.publish_feature_feeds();