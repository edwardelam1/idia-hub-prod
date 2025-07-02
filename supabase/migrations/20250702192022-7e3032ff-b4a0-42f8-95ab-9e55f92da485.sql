-- Enable realtime for health_metrics table
ALTER TABLE public.health_metrics REPLICA IDENTITY FULL;

-- Add health_metrics to supabase_realtime publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_metrics;