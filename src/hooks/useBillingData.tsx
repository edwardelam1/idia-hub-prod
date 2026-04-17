import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const PLAN_PRICING: Record<string, { name: string; cost: string; costNumeric: number; description: string; features: string[]; limits: { credits: number; apiCalls: number; dataExport: number; teamMembers: number } }> = {
  base: {
    name: 'Standard Individual',
    cost: '$10/query',
    costNumeric: 10,
    description: 'A la carte ecosystem access for verified individuals',
    features: ['Biological Identity Verified', 'Base Synapse Access', 'Pay-as-you-go ($10/query)'],
    limits: { credits: 0, apiCalls: 100, dataExport: 0, teamMembers: 0 },
  },
  analyst: {
    name: 'Analyst',
    cost: '$9,995/yr',
    costNumeric: 9995,
    description: 'Foundational data access and AI-curated views',
    features: ['Foundational Filters', 'Basic Search', 'AI-Curated View', '5,000 CRD included', 'Standard Support', 'Basic Reporting', 'Single User Access'],
    limits: { credits: 5000, apiCalls: 100000, dataExport: 50, teamMembers: 5 },
  },
  professional: {
    name: 'Professional',
    cost: '$24,995/yr',
    costNumeric: 24995,
    description: 'Advanced trading features and merchant data integration',
    features: ['Advanced Filters', 'Merchant Data Integration', 'Team Management', '20,000 CRD included', 'Priority Support', 'Custom Reports', 'API Access', 'Compliance Dashboard'],
    limits: { credits: 20000, apiCalls: 1000000, dataExport: 250, teamMembers: 25 },
  },
  enterprise: {
    name: 'Enterprise',
    cost: '$49,995+/yr',
    costNumeric: 49995,
    description: 'Full-spectrum intelligence with HFT-grade API and SLAs',
    features: ['Premier Filters', 'Developer API & Webhooks', 'Dedicated Account Manager', 'Enterprise SSO', '50,000+ CRD included', '24/7 Premium Support', 'White-Glove Onboarding', 'Custom SLAs', 'Unlimited Data Export'],
    limits: { credits: 50000, apiCalls: 10000000, dataExport: 1000, teamMembers: 100 },
  },
};

export const useBillingData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.user_id;

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['user-subscription', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: paymentMethods = [], isLoading: pmLoading } = useQuery({
    queryKey: ['user-payment-methods', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ['user-invoices', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });

  // Usage from ledger deductions in current billing period
  const { data: usageData } = useQuery({
    queryKey: ['user-usage-ledger', userId, subscription?.started_at],
    queryFn: async () => {
      if (!userId) return { used: 0 };
      let query = supabase
        .from('synapse_credit_ledger')
        .select('fiat_amount')
        .eq('user_id', userId)
        .eq('entry_type', 'deduction');
      
      if (subscription?.started_at) {
        query = query.gte('created_at', subscription.started_at);
      }
      if (subscription?.expires_at) {
        query = query.lte('created_at', subscription.expires_at);
      }
      
      const { data } = await query;
      const used = (data || []).reduce((sum, d) => sum + Math.abs(Number(d.fiat_amount)), 0);
      return { used };
    },
    enabled: !!userId,
  });

  const tier = subscription?.tier?.toLowerCase() ?? 'base';
  const planInfo = PLAN_PRICING[tier] ?? PLAN_PRICING.base;
  const creditLimit = planInfo.limits.credits;
  const currentUsage = { used: usageData?.used ?? 0, limit: creditLimit };

  const subscriptionPlan = planInfo;

  const daysRemaining = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const addPaymentMethod = useMutation({
    mutationFn: async (pm: { paymentToken: string; display_label: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase.from('user_payment_methods').insert([{
        user_id: userId,
        method_type: 'worldpay_token',
        display_label: pm.display_label,
        identifier: pm.paymentToken,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-payment-methods'] });
      toast.success('Payment method added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removePaymentMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_payment_methods').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-payment-methods'] });
      toast.success('Payment method removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefaultPaymentMethod = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Not authenticated');
      await supabase.from('user_payment_methods').update({ is_default: false }).eq('user_id', userId);
      const { error } = await supabase.from('user_payment_methods').update({ is_default: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-payment-methods'] });
      toast.success('Default payment method updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadInvoice = (invoiceId: string) => {
    const inv = invoices.find((i: any) => i.id === invoiceId);
    if (inv?.pdf_url) {
      window.open(inv.pdf_url, '_blank');
    } else {
      toast.info('Invoice PDF not yet available');
    }
  };

  const isLoading = subLoading || pmLoading || invLoading;

  return {
    currentUsage,
    subscriptionPlan,
    subscription,
    daysRemaining,
    paymentMethods,
    invoices,
    isLoading,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    downloadInvoice,
  };
};
