REVOKE ALL ON FUNCTION public.guard_business_service_provisioning() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_service_operator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_service_operator(uuid) TO authenticated, service_role;