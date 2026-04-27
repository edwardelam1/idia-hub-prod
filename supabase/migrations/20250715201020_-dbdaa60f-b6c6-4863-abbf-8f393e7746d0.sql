-- Create the missing trigger on staged_health_data to automatically generate bundles
CREATE TRIGGER immediate_bundle_generation
  AFTER INSERT ON staged_health_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_bundle_generation();