import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useBillingData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.user_id;

  // Fetch subscription
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

  // Fetch payment methods
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

  // Fetch invoices
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

  // Fetch usage from transactions
  const { data: usageData } = useQuery({
    queryKey: ['user-usage', userId],
    queryFn: async () => {
      if (!userId) return { used: 0, limit: 15000 };
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error) return { used: 0, limit: 15000 };
      return { used: count ?? 0, limit: 15000 };
    },
    enabled: !!userId,
  });

  const currentUsage = usageData ?? { used: 0, limit: 15000 };

  // Derive subscription plan from DB data
  const tierMap: Record<string, { name: string; cost: number; description: string; features: string[]; limits: { credits: number; apiCalls: number; dataExport: number; teamMembers: number } }> = {
    professional: {
      name: 'Professional',
      cost: 299,
      description: 'Perfect for growing teams and advanced data needs',
      features: ['Advanced AI analytics', 'Priority support', 'Custom integrations', 'Advanced security features', 'Compliance reporting', 'API access', 'Team collaboration tools'],
      limits: { credits: 15000, apiCalls: 100000, dataExport: 50, teamMembers: 25 },
    },
    enterprise: {
      name: 'Enterprise',
      cost: 999,
      description: 'Unlimited scale and dedicated support',
      features: ['Everything in Professional', 'Unlimited API calls', 'Custom SLAs', 'Dedicated support', 'Custom endpoints', 'White-label options'],
      limits: { credits: 100000, apiCalls: 1000000, dataExport: 500, teamMembers: 100 },
    },
    analyst: {
      name: 'Analyst',
      cost: 99,
      description: 'Entry-level API access for analysts',
      features: ['Standard endpoints', 'Email support', 'Basic analytics'],
      limits: { credits: 5000, apiCalls: 10000, dataExport: 10, teamMembers: 5 },
    },
  };

  const tier = subscription?.tier?.toLowerCase() ?? 'professional';
  const subscriptionPlan = tierMap[tier] ?? tierMap.professional;

  // Days until period end
  const daysRemaining = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Add payment method
  const addPaymentMethod = useMutation({
    mutationFn: async (pm: { method_type: string; display_label: string; identifier: string; metadata?: Record<string, unknown> }) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase.from('user_payment_methods').insert([{
        user_id: userId,
        method_type: pm.method_type,
        display_label: pm.display_label,
        identifier: pm.identifier,
        metadata: (pm.metadata ?? {}) as any,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-payment-methods'] });
      toast.success('Payment method added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Remove payment method
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

  // Set default payment method
  const setDefaultPaymentMethod = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Not authenticated');
      // Unset all defaults first
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

  // Download invoice
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
