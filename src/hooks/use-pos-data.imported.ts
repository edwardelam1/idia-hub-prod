import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";

export interface PosTransaction {
  id: string;
  business_id: string;
  location_id: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  tax_rate: number;
  payment_method: string;
  payment_status: string;
  items: any[];
  customer_name: string;
  customer_email: string;
  created_at: string;
}

interface SalesSummary {
  totalRevenue: number;
  totalTax: number;
  totalTransactions: number;
  avgTicket: number;
  netSales: number;
  avgTaxRate: number;
}

interface DailySales {
  date: string;
  day: string;
  sales: number;
  tax: number;
  transactions: number;
}

interface CategoryBreakdown {
  name: string;
  value: number;
  percentage: number;
}

interface LocationPerformance {
  locationId: string;
  location: string;
  revenue: number;
  transactions: number;
  avgTicket: number;
}

export function usePosTransactions(periodDays = 30) {
  const [transactions, setTransactions] = useState<PosTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const businessId = await getBusinessId();
      const since = new Date();
      since.setDate(since.getDate() - periodDays);

      const { data, error } = await supabase
        .from("pos_transactions" as any)
        .select("*")
        .eq("business_id", businessId)
        .gte("created_at", since.toISOString())
        .eq("payment_status", "completed")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTransactions(data as unknown as PosTransaction[]);
      }
    } catch (e) {
      console.error("Error loading POS transactions:", e);
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  useEffect(() => { load(); }, [load]);

  const summary: SalesSummary = (() => {
    const totalRevenue = transactions.reduce((s, t) => s + (t.total_amount || 0), 0);
    const totalTax = transactions.reduce((s, t) => s + (t.tax_amount || 0), 0);
    const netSales = totalRevenue - totalTax;
    const totalTransactions = transactions.length;
    const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const avgTaxRate = netSales > 0 ? (totalTax / netSales) * 100 : 0;
    return { totalRevenue, totalTax, totalTransactions, avgTicket, netSales, avgTaxRate };
  })();

  const dailySales: DailySales[] = (() => {
    const map = new Map<string, { sales: number; tax: number; count: number }>();
    transactions.forEach(t => {
      const d = t.created_at.split("T")[0];
      const existing = map.get(d) || { sales: 0, tax: 0, count: 0 };
      existing.sales += t.total_amount || 0;
      existing.tax += t.tax_amount || 0;
      existing.count += 1;
      map.set(d, existing);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        day: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
        sales: v.sales,
        tax: v.tax,
        transactions: v.count,
      }));
  })();

  const categoryBreakdown: CategoryBreakdown[] = (() => {
    const catMap = new Map<string, number>();
    transactions.forEach(t => {
      const items: any[] = Array.isArray(t.items) ? t.items : [];
      items.forEach(item => {
        const cat = item.category || "Other";
        catMap.set(cat, (catMap.get(cat) || 0) + (item.price || 0) * (item.quantity || 1));
      });
    });
    const total = Array.from(catMap.values()).reduce((s, v) => s + v, 0) || 1;
    return Array.from(catMap.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        percentage: Math.round((value / total) * 100),
      }));
  })();

  const locationPerformance: LocationPerformance[] = (() => {
    const locMap = new Map<string, { revenue: number; count: number }>();
    transactions.forEach(t => {
      const lid = t.location_id || "unknown";
      const existing = locMap.get(lid) || { revenue: 0, count: 0 };
      existing.revenue += t.total_amount || 0;
      existing.count += 1;
      locMap.set(lid, existing);
    });
    return Array.from(locMap.entries()).map(([locationId, v]) => ({
      locationId,
      location: locationId === "unknown" ? "Default" : locationId,
      revenue: v.revenue,
      transactions: v.count,
      avgTicket: v.count > 0 ? v.revenue / v.count : 0,
    }));
  })();

  return { transactions, loading, summary, dailySales, categoryBreakdown, locationPerformance, reload: load };
}

export async function recordPosTransaction(params: {
  cart: { id: string; name: string; price: number; quantity: number; category?: string }[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number;
  paymentMethod: string;
  customerName?: string;
  customerEmail?: string;
  locationId?: string;
}) {
  const businessId = await getBusinessId();
  const { error } = await supabase.from("pos_transactions" as any).insert({
    business_id: businessId,
    location_id: params.locationId || null,
    subtotal: params.subtotal,
    tax_amount: params.taxAmount,
    total_amount: params.totalAmount,
    tax_rate: params.taxRate,
    payment_method: params.paymentMethod,
    payment_status: "completed",
    items: params.cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, category: i.category || "Other" })),
    customer_name: params.customerName || "",
    customer_email: params.customerEmail || "",
  } as any);
  if (error) console.error("Error recording POS transaction:", error);
  return !error;
}
