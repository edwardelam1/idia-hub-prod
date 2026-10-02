import { useEffect, useMemo } from 'react';
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

PLAN_PRICING.pure_alpha = { ...PLAN_PRICING.enterprise, name: 'Pure Alpha', description: 'Full-spectrum intelligence (Pure Alpha protocol)' };
PLAN_PRICING.pro = { ...PLAN_PRICING.professional, name: 'Pro' };
PLAN_PRICING.pro_plus = { ...PLAN_PRICING.professional, name: 'Pro Plus' };
PLAN_PRICING.free = PLAN_PRICING.base;

const USAGE_TYPES = ['USAGE', 'DEBIT', 'usage', 'deduction'];
const DAY = 86_400_000;

export interface DerivedInvoice {
  id: string;
  invoice_number: string;
  period: string;
  amount: number;
  unit: 'USDC' | 'CR';
  kind: 'purchase' | 'usage' | 'invoice';
  status: string;
  created_at: string;
  tx_hash?: string | null;
  pdf_url?: string | null;
  line_count?: number;
}

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
        .order('expires_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: platformTier } = useQuery({
    queryKey: ['platform-tier', userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('platform_users')
        .select('hub_saas_tier')
        .eq('user_id', userId)
        .maybeSingle();
      return (data?.hub_saas_tier as string | null) ?? null;
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

  const { data: storedInvoices = [], isLoading: invLoading } = useQuery({
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

  // Full ledger for this user (paged past the 1000-row cap)
  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ['user-billing-ledger', userId],
    queryFn: async () => {
      const rows: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await (supabase as any)
          .from('synapse_credit_ledger')
          .select('id, entry_type, amount, amount_usdc, status, created_at, blockchain_tx_hash, description')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(from, from + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return rows;
    },
    enabled: !!userId,
  });

  // Live refresh on ledger changes
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`billing-ledger-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'synapse_credit_ledger', filter: `user_id=eq.${userId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-billing-ledger', userId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  const now = Date.now();
  const expiresMs = subscription?.expires_at ? new Date(subscription.expires_at).getTime() : null;
  const isExpired = !!subscription && expiresMs !== null && expiresMs < now;
  const subscriptionStatus: 'active' | 'expired' | 'none' = !subscription ? 'none' : isExpired || subscription.status !== 'active' ? 'expired' : 'active';
  const cycleEnd = subscriptionStatus === 'active' && expiresMs ? new Date(expiresMs) : null;

  const tier = (subscriptionStatus === 'active' ? subscription?.tier : null)?.toLowerCase()
    ?? platformTier?.toLowerCase()
    ?? 'base';
  const planInfo = PLAN_PRICING[tier] ?? PLAN_PRICING.base;
  const subscriptionPlan = planInfo;

  const usageRows = useMemo(() => ledger.filter((r: any) => USAGE_TYPES.includes(r.entry_type)), [ledger]);

  // Usage in current cycle (or trailing 30 days when no active cycle)
  const cycleStart = subscriptionStatus === 'active' && subscription?.started_at
    ? new Date(subscription.started_at).getTime()
    : now - 30 * DAY;
  const used = usageRows
    .filter((r: any) => new Date(r.created_at).getTime() >= cycleStart)
    .reduce((s: number, r: any) => s + Math.abs(Number(r.amount) || 0), 0);
  const currentUsage = { used, limit: planInfo.limits.credits };

  // Burn: trailing-30-day average, projected over the remaining cycle (or 30 days)
  const windowStart = Math.max(now - 30 * DAY, subscriptionStatus === 'active' ? cycleStart : 0);
  const windowDays = Math.max(1, (now - windowStart) / DAY);
  const windowSpend = usageRows
    .filter((r: any) => new Date(r.created_at).getTime() >= windowStart)
    .reduce((s: number, r: any) => s + Math.abs(Number(r.amount) || 0), 0);
  const dailyBurn = windowSpend / windowDays;
  const daysRemaining = cycleEnd ? Math.max(0, Math.ceil((cycleEnd.getTime() - now) / DAY)) : 0;
  const projectionDays = cycleEnd ? daysRemaining : 30;
  const projectedBurn = dailyBurn * projectionDays;

  const invoices: DerivedInvoice[] = useMemo(() => {
    const out: DerivedInvoice[] = storedInvoices.map((i: any) => ({
      id: i.id, invoice_number: i.invoice_number, period: i.period, amount: Number(i.amount),
      unit: 'USDC', kind: 'invoice', status: i.status, created_at: i.created_at, pdf_url: i.pdf_url,
    }));
    ledger.filter((r: any) => r.entry_type === 'deposit').forEach((r: any) => {
      const d = new Date(r.created_at);
      out.push({
        id: r.id,
        invoice_number: `PUR-${r.id.slice(0, 8).toUpperCase()}`,
        period: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        amount: Number(r.amount_usdc ?? r.amount) || 0,
        unit: r.amount_usdc != null ? 'USDC' : 'CR',
        kind: 'purchase',
        status: (r.status ?? 'settled').toLowerCase(),
        created_at: r.created_at,
        tx_hash: r.blockchain_tx_hash,
      });
    });
    const months = new Map<string, { total: number; count: number; last: string }>();
    usageRows.forEach((r: any) => {
      const key = r.created_at.slice(0, 7);
      const m = months.get(key) ?? { total: 0, count: 0, last: r.created_at };
      m.total += Math.abs(Number(r.amount) || 0); m.count += 1;
      if (r.created_at > m.last) m.last = r.created_at;
      months.set(key, m);
    });
    months.forEach((m, key) => {
      const [y, mo] = key.split('-').map(Number);
      out.push({
        id: `usage-${key}`,
        invoice_number: `USG-${key.replace('-', '')}`,
        period: new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        amount: m.total, unit: 'CR', kind: 'usage', status: 'paid', created_at: m.last, line_count: m.count,
      });
    });
    return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [storedInvoices, ledger, usageRows]);

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
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    if (inv.pdf_url) { window.open(inv.pdf_url, '_blank'); return; }
    const lines = [
      'IDIA Hub Statement',
      `Statement #: ${inv.invoice_number}`,
      `Type: ${inv.kind === 'purchase' ? 'Synapse Credit Purchase' : inv.kind === 'usage' ? 'Monthly Credit Usage' : 'Invoice'}`,
      `Period: ${inv.period}`,
      `Date: ${new Date(inv.created_at).toISOString()}`,
      `Amount: ${inv.amount.toFixed(inv.unit === 'CR' ? 4 : 2)} ${inv.unit}`,
      `Status: ${inv.status}`,
      inv.line_count ? `Charges: ${inv.line_count}` : '',
      inv.tx_hash ? `Transaction: https://basescan.org/tx/${inv.tx_hash}` : '',
      `Account: ${userId}`,
    ].filter(Boolean).join('\n');
    const url = URL.createObjectURL(new Blob([lines], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${inv.invoice_number}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = subLoading || pmLoading || invLoading || ledgerLoading;

  return {
    currentUsage,
    subscriptionPlan,
    subscription,
    subscriptionStatus,
    isExpired,
    cycleEnd,
    tier,
    daysRemaining,
    dailyBurn,
    projectedBurn,
    projectionDays,
    paymentMethods,
    invoices,
    isLoading,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    downloadInvoice,
  };
};
