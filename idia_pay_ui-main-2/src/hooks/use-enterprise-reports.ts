import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";

export interface LaborSummary {
  totalHours: number;
  overtimeHours: number;
  laborCost: number;
  headcount: number;
  activeShifts: number;
  laborCostPercent: number;
}

export interface InventorySummary {
  totalValuation: number;
  totalItems: number;
  lowStockItems: { id: string; name: string; current_stock: number; par_level: number }[];
  wasteEvents: number;
  wasteCost: number;
}

export interface ProcurementSummary {
  totalSpend: number;
  openPOs: number;
  pendingInvoices: number;
  supplierCount: number;
}

export interface GLLine {
  account: string;
  amount: number;
}

export interface ProfitLoss {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netIncome: number;
  lines: { label: string; amount: number; type: "revenue" | "cogs" | "expense" }[];
}

export interface MenuEngineeringItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  costPrice: number;
  margin: number;
  marginPct: number;
  unitsSold: number;
  totalRevenue: number;
  classification: "Star" | "Puzzle" | "Plowhorse" | "Dog";
}

export interface TimeEntryRow {
  id: string;
  team_member_id: string;
  memberName: string;
  role: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  total_hours: number | null;
  overtime_hours: number | null;
  status: string;
  notes: string | null;
  location: string | null;
}

export function useEnterpriseReports(periodDays = 30) {
  const [labor, setLabor] = useState<LaborSummary>({ totalHours: 0, overtimeHours: 0, laborCost: 0, headcount: 0, activeShifts: 0, laborCostPercent: 0 });
  const [inventory, setInventory] = useState<InventorySummary>({ totalValuation: 0, totalItems: 0, lowStockItems: [], wasteEvents: 0, wasteCost: 0 });
  const [procurement, setProcurement] = useState<ProcurementSummary>({ totalSpend: 0, openPOs: 0, pendingInvoices: 0, supplierCount: 0 });
  const [profitLoss, setProfitLoss] = useState<ProfitLoss>({ revenue: 0, cogs: 0, grossProfit: 0, operatingExpenses: 0, netIncome: 0, lines: [] });
  const [menuEngineering, setMenuEngineering] = useState<MenuEngineeringItem[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryRow[]>([]);
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const sinceISO = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    return since.toISOString();
  }, [periodDays]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const businessId = await getBusinessId();

      const [
        membersRes, entriesRes, inventoryRes, historyRes,
        posRes, glRes, menuRes, poRes, suppliersRes, locRes
      ] = await Promise.all([
        supabase.from("team_members").select("id, name, role, hourly_rate, overtime_rate, status").eq("business_id", businessId),
        supabase.from("time_entries").select("*").eq("business_id", businessId).gte("clock_in", sinceISO),
        supabase.from("inventory_items").select("id, name, current_stock, current_cost, par_level, is_active").eq("business_id", businessId).eq("is_active", true),
        supabase.from("inventory_history").select("*").eq("business_id", businessId).gte("created_at", sinceISO),
        supabase.from("pos_transactions").select("items, total_amount").eq("business_id", businessId).gte("created_at", sinceISO).eq("payment_status", "completed"),
        supabase.from("gl_journal_entries").select("*").eq("business_id", businessId).gte("created_at", sinceISO),
        supabase.from("menu_items").select("id, name, category, base_price, cost_price, is_active").eq("business_id", businessId),
        supabase.from("purchase_orders").select("id, status, total_amount, invoice_amount, invoice_status").eq("business_id", businessId).gte("created_at", sinceISO),
        supabase.from("suppliers").select("id").eq("business_id", businessId).eq("is_active", true),
        supabase.from("business_locations").select("id, name").eq("business_id", businessId),
      ]);

      const members = (membersRes.data || []) as any[];
      const entries = (entriesRes.data || []) as any[];
      const items = (inventoryRes.data || []) as any[];
      const history = (historyRes.data || []) as any[];
      const posTxns = (posRes.data || []) as any[];
      const gl = (glRes.data || []) as any[];
      const menu = (menuRes.data || []) as any[];
      const pos = (poRes.data || []) as any[];
      const suppliers = (suppliersRes.data || []) as any[];
      const locations = (locRes.data || []) as any[];

      // Location names
      const locMap: Record<string, string> = {};
      locations.forEach((l: any) => { locMap[l.id] = l.name; });
      setLocationNames(locMap);

      // Member lookup
      const memberMap = new Map<string, any>();
      members.forEach(m => memberMap.set(m.id, m));

      // --- LABOR ---
      let totalHours = 0, overtimeHours = 0, laborCost = 0, activeShifts = 0;
      const timeRows: TimeEntryRow[] = [];

      entries.forEach((e: any) => {
        const h = e.total_hours || 0;
        const ot = e.overtime_hours || 0;
        totalHours += h;
        overtimeHours += ot;
        if (!e.clock_out) activeShifts++;

        const member = memberMap.get(e.team_member_id);
        const rate = member?.hourly_rate || 0;
        const otRate = member?.overtime_rate || rate * 1.5;
        laborCost += (h - ot) * rate + ot * otRate;

        timeRows.push({
          id: e.id,
          team_member_id: e.team_member_id,
          memberName: member?.name || "Unknown",
          role: member?.role || "",
          clock_in: e.clock_in,
          clock_out: e.clock_out,
          break_minutes: e.break_minutes || 0,
          total_hours: e.total_hours,
          overtime_hours: e.overtime_hours,
          status: e.status,
          notes: e.notes,
          location: e.location,
        });
      });

      const totalRevenue = posTxns.reduce((s: number, t: any) => s + (t.total_amount || 0), 0);
      setLabor({
        totalHours,
        overtimeHours,
        laborCost,
        headcount: members.filter(m => m.status === "active").length,
        activeShifts,
        laborCostPercent: totalRevenue > 0 ? (laborCost / totalRevenue) * 100 : 0,
      });
      setTimeEntries(timeRows);

      // --- INVENTORY ---
      const totalValuation = items.reduce((s: number, i: any) => s + (i.current_stock || 0) * (i.current_cost || 0), 0);
      const lowStockItems = items
        .filter((i: any) => i.par_level && i.current_stock < i.par_level)
        .map((i: any) => ({ id: i.id, name: i.name, current_stock: i.current_stock, par_level: i.par_level }));
      const wasteEntries = history.filter((h: any) => h.action === "waste" || h.action === "spoilage");
      setInventory({
        totalValuation,
        totalItems: items.length,
        lowStockItems,
        wasteEvents: wasteEntries.length,
        wasteCost: wasteEntries.reduce((s: number, w: any) => s + Math.abs(w.quantity || 0), 0),
      });

      // --- PROCUREMENT ---
      const openPOs = pos.filter((p: any) => p.status !== "completed" && p.status !== "cancelled").length;
      const pendingInvoices = pos.filter((p: any) => p.invoice_status === "uninvoiced" || p.invoice_status === "pending").length;
      const totalSpend = pos.reduce((s: number, p: any) => s + (p.total_amount || 0), 0);
      setProcurement({ totalSpend, openPOs, pendingInvoices, supplierCount: suppliers.length });

      // --- PROFIT & LOSS ---
      const revenueEntries = gl.filter((e: any) => e.credit_account?.includes("Revenue") || e.credit_account?.includes("Sales"));
      const cogsEntries = gl.filter((e: any) => e.debit_account?.includes("COGS") || e.debit_account?.includes("Cost of Goods"));
      const expenseEntries = gl.filter((e: any) =>
        (e.debit_account?.includes("Expense") || e.debit_account?.includes("Spoilage") || e.debit_account?.includes("Waste")) &&
        !e.debit_account?.includes("COGS") && !e.debit_account?.includes("Cost of Goods")
      );

      const rev = revenueEntries.reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const cogs = cogsEntries.reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const opex = expenseEntries.reduce((s: number, e: any) => s + (e.amount || 0), 0);

      const lines: ProfitLoss["lines"] = [];
      // Group revenue by credit_account
      const revMap = new Map<string, number>();
      revenueEntries.forEach((e: any) => { revMap.set(e.credit_account, (revMap.get(e.credit_account) || 0) + e.amount); });
      revMap.forEach((amt, acct) => lines.push({ label: acct, amount: amt, type: "revenue" }));
      const cogsMap = new Map<string, number>();
      cogsEntries.forEach((e: any) => { cogsMap.set(e.debit_account, (cogsMap.get(e.debit_account) || 0) + e.amount); });
      cogsMap.forEach((amt, acct) => lines.push({ label: acct, amount: amt, type: "cogs" }));
      const expMap = new Map<string, number>();
      expenseEntries.forEach((e: any) => { expMap.set(e.debit_account, (expMap.get(e.debit_account) || 0) + e.amount); });
      expMap.forEach((amt, acct) => lines.push({ label: acct, amount: amt, type: "expense" }));

      setProfitLoss({ revenue: rev, cogs, grossProfit: rev - cogs, operatingExpenses: opex, netIncome: rev - cogs - opex, lines });

      // --- MENU ENGINEERING ---
      // Count units sold per menu item from POS items
      const soldMap = new Map<string, number>();
      posTxns.forEach((t: any) => {
        const cartItems: any[] = Array.isArray(t.items) ? t.items : [];
        cartItems.forEach(ci => {
          const key = (ci.name || "").toLowerCase();
          soldMap.set(key, (soldMap.get(key) || 0) + (ci.quantity || 1));
        });
      });

      const avgVolume = soldMap.size > 0 ? Array.from(soldMap.values()).reduce((s, v) => s + v, 0) / soldMap.size : 0;
      const avgMarginPct = menu.length > 0
        ? menu.reduce((s: number, m: any) => {
            const margin = (m.base_price || 0) - (m.cost_price || 0);
            const pct = m.base_price > 0 ? (margin / m.base_price) * 100 : 0;
            return s + pct;
          }, 0) / menu.length
        : 50;

      const meItems: MenuEngineeringItem[] = menu.map((m: any) => {
        const margin = (m.base_price || 0) - (m.cost_price || 0);
        const marginPct = m.base_price > 0 ? (margin / m.base_price) * 100 : 0;
        const unitsSold = soldMap.get((m.name || "").toLowerCase()) || 0;
        const highPop = unitsSold >= avgVolume;
        const highProfit = marginPct >= avgMarginPct;
        let classification: MenuEngineeringItem["classification"] = "Dog";
        if (highPop && highProfit) classification = "Star";
        else if (!highPop && highProfit) classification = "Puzzle";
        else if (highPop && !highProfit) classification = "Plowhorse";

        return {
          id: m.id,
          name: m.name,
          category: m.category,
          basePrice: m.base_price,
          costPrice: m.cost_price,
          margin,
          marginPct,
          unitsSold,
          totalRevenue: unitsSold * (m.base_price || 0),
          classification,
        };
      });
      setMenuEngineering(meItems);

    } catch (e) {
      console.error("Error loading enterprise reports:", e);
    } finally {
      setLoading(false);
    }
  }, [sinceISO]);

  useEffect(() => { load(); }, [load]);

  return { labor, inventory, procurement, profitLoss, menuEngineering, timeEntries, locationNames, loading, reload: load };
}

export function useOverviewStats() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalLocations: 0,
    totalEmployees: 0,
    avgTicketSize: 0,
    inventoryValue: 0,
    pendingInvoices: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const businessId = await getBusinessId();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [posRes, locRes, teamRes, invRes, poRes] = await Promise.all([
          supabase.from("pos_transactions").select("total_amount").eq("business_id", businessId).gte("created_at", thirtyDaysAgo.toISOString()).eq("payment_status", "completed"),
          supabase.from("business_locations").select("id").eq("business_id", businessId).eq("is_active", true),
          supabase.from("team_members").select("id").eq("business_id", businessId).eq("status", "active"),
          supabase.from("inventory_items").select("current_stock, current_cost").eq("business_id", businessId).eq("is_active", true),
          supabase.from("purchase_orders").select("id, invoice_status").eq("business_id", businessId),
        ]);

        const txns = (posRes.data || []) as any[];
        const totalRevenue = txns.reduce((s: number, t: any) => s + (t.total_amount || 0), 0);
        const avgTicketSize = txns.length > 0 ? totalRevenue / txns.length : 0;
        const invItems = (invRes.data || []) as any[];
        const inventoryValue = invItems.reduce((s: number, i: any) => s + (i.current_stock || 0) * (i.current_cost || 0), 0);
        const pendingInvoices = ((poRes.data || []) as any[]).filter(p => p.invoice_status === "uninvoiced" || p.invoice_status === "pending").length;

        setStats({
          totalRevenue,
          totalLocations: (locRes.data || []).length,
          totalEmployees: (teamRes.data || []).length,
          avgTicketSize,
          inventoryValue,
          pendingInvoices,
        });
      } catch (e) {
        console.error("Error loading overview stats:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { stats, loading };
}

export function useTodayStats() {
  const [stats, setStats] = useState({
    dailyRevenue: 0,
    dailyTransactions: 0,
    avgTicketSize: 0,
    staffOnDuty: 0,
    totalStaff: 0,
    inventoryAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const businessId = await getBusinessId();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [posRes, teamRes, activeRes, invRes] = await Promise.all([
          supabase.from("pos_transactions").select("total_amount").eq("business_id", businessId).gte("created_at", todayStart.toISOString()).eq("payment_status", "completed"),
          supabase.from("team_members").select("id, status").eq("business_id", businessId),
          supabase.from("time_entries").select("id").eq("business_id", businessId).is("clock_out", null).eq("status", "active"),
          supabase.from("inventory_items").select("current_stock, par_level").eq("business_id", businessId).eq("is_active", true),
        ]);

        const txns = (posRes.data || []) as any[];
        const dailyRevenue = txns.reduce((s: number, t: any) => s + (t.total_amount || 0), 0);
        const members = (teamRes.data || []) as any[];
        const invItems = (invRes.data || []) as any[];
        const inventoryAlerts = invItems.filter((i: any) => i.par_level && i.current_stock < i.par_level).length;

        setStats({
          dailyRevenue,
          dailyTransactions: txns.length,
          avgTicketSize: txns.length > 0 ? dailyRevenue / txns.length : 0,
          staffOnDuty: (activeRes.data || []).length,
          totalStaff: members.filter((m: any) => m.status === "active").length,
          inventoryAlerts,
        });
      } catch (e) {
        console.error("Error loading today stats:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { stats, loading };
}
