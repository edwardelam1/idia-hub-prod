import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ServiceVisibility {
  visible: boolean;
  rate: number | null;
  businessId: string | null;
  businessName: string | null;
}

export interface ServiceAccessState {
  isOperator: boolean;
  utility: ServiceVisibility;
  vulture: ServiceVisibility;
}

const hidden: ServiceVisibility = { visible: false, rate: null, businessId: null, businessName: null };

const toVisibility = (raw: any): ServiceVisibility => ({
  visible: raw?.visible === true,
  rate: raw?.rate == null ? null : Number(raw.rate),
  businessId: raw?.business_id ?? null,
  businessName: raw?.business_name ?? null,
});

/**
 * Which metered services (Identity Verification Utility, The Vulture) the signed-in user may see,
 * and at which organization rate. C-suite / super admins always see both; everyone else needs a
 * business where C-suite switched the service on.
 */
export function useServiceAccess() {
  const { user } = useAuth();
  return useQuery<ServiceAccessState>({
    queryKey: ["service-access", user?.user_id],
    enabled: !!user?.user_id,
    staleTime: 60_000,
    queryFn: async () => {
      console.log("[PHASE_START: ServiceAccess.Fetch]");
      const { data, error } = await (supabase.rpc as any)("get_my_service_access");
      if (error) {
        console.error(`[PHASE_END: ServiceAccess.Fetch] failed: ${error.message}`);
        throw error;
      }
      const result: ServiceAccessState = {
        isOperator: data?.is_operator === true,
        utility: data?.utility ? toVisibility(data.utility) : hidden,
        vulture: data?.vulture ? toVisibility(data.vulture) : hidden,
      };
      console.log(
        `[PHASE_END: ServiceAccess.Fetch] operator=${result.isOperator} utility=${result.utility.visible} vulture=${result.vulture.visible}`,
      );
      return result;
    },
  });
}
