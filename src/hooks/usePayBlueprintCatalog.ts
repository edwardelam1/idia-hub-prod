// src/hooks/usePayBlueprintCatalog.ts
//
// Phase 3b: Hydrates the App Builder's vertical / sub-module / nano-bite
// catalog directly from the taxonomy_* tables. Returns shapes that are
// drop-in compatible with the previous hardcoded arrays in PayAppBlueprint,
// so callers can fall back to the static tables while this hook is loading
// (or if a network error occurs).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { NanoBite } from "@/taxonomy";
import {
  Beer,
  Briefcase,
  Building,
  Building2,
  Calendar,
  Cannabis,
  Car,
  Dumbbell,
  Factory,
  Flower2,
  Gamepad2,
  Globe,
  GraduationCap,
  Hammer,
  Handshake,
  Heart,
  Home,
  Landmark,
  Leaf,
  Lock,
  MessageSquare,
  PawPrint,
  Pickaxe,
  Plane,
  Radio,
  Scissors,
  Ship,
  ShoppingCart,
  Stethoscope,
  Truck,
  Tv,
  Utensils,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Central mapping of icon name (as stored in taxonomy_verticals.icon) to a
// real Lucide component. Unknown names fall back to Building2.
const ICON_MAP: Record<string, LucideIcon> = {
  Beer,
  Briefcase,
  Building,
  Building2,
  Calendar,
  Cannabis,
  Car,
  Dumbbell,
  Factory,
  Flower2,
  Gamepad2,
  Globe,
  GraduationCap,
  Hammer,
  Handshake,
  Heart,
  Home,
  Landmark,
  Leaf,
  Lock,
  MessageSquare,
  PawPrint,
  Pickaxe,
  Plane,
  Radio,
  Scissors,
  Ship,
  ShoppingCart,
  Stethoscope,
  Truck,
  Tv,
  Utensils,
  Zap,
};

export interface CatalogSubModule {
  id: string;
  name: string;
  description: string;
}

export interface CatalogVerticalCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  subModules: CatalogSubModule[];
}

export interface PayBlueprintCatalog {
  verticalCategories: CatalogVerticalCategory[];
  nanoBitesByIndustry: Map<string, NanoBite[]>;
  isReady: boolean;
  isError: boolean;
}

export function usePayBlueprintCatalog(): PayBlueprintCatalog {
  const [state, setState] = useState<PayBlueprintCatalog>({
    verticalCategories: [],
    nanoBitesByIndustry: new Map(),
    isReady: false,
    isError: false,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [vertsRes, subsRes, bitesRes] = await Promise.all([
          (supabase as any)
            .from("taxonomy_verticals")
            .select("id, name, icon, color, sort_order, is_active")
            .not("icon", "is", null)
            .order("sort_order", { ascending: true, nullsFirst: false })
            .order("name", { ascending: true }),
          (supabase as any)
            .from("taxonomy_submodules")
            .select("id, name, description, vertical_id, sort_order, is_active")
            .order("sort_order", { ascending: true, nullsFirst: false })
            .order("name", { ascending: true }),
          (supabase as any)
            .from("taxonomy_nano_bites")
            .select(
              "id, industry_id, value_chain_stage, micro_element, task, cadence, automatable, requires_tier",
            )
            .eq("is_active", true),
        ]);

        if (cancelled) return;

        if (vertsRes.error || subsRes.error || bitesRes.error) {
          console.error("[usePayBlueprintCatalog] fetch error", {
            verts: vertsRes.error,
            subs: subsRes.error,
            bites: bitesRes.error,
          });
          setState((s) => ({ ...s, isError: true, isReady: true }));
          return;
        }

        // Bucket sub-modules by vertical_id.
        const subsByVertical = new Map<string, CatalogSubModule[]>();
        for (const row of (subsRes.data || []) as any[]) {
          if (row.is_active === false) continue;
          const list = subsByVertical.get(row.vertical_id) || [];
          list.push({
            id: row.id,
            name: row.name,
            description: row.description ?? "",
          });
          subsByVertical.set(row.vertical_id, list);
        }

        const verticalCategories: CatalogVerticalCategory[] = (
          (vertsRes.data || []) as any[]
        )
          .filter((v) => v.is_active !== false)
          .map((v) => ({
            id: v.id,
            name: v.name,
            icon: ICON_MAP[v.icon as string] ?? Building2,
            color: (v.color as string) || "bg-slate-500",
            subModules: subsByVertical.get(v.id) || [],
          }))
          // Drop verticals with no sub-modules — they'd render as empty cards.
          .filter((v) => v.subModules.length > 0);

        const nanoBitesByIndustry = new Map<string, NanoBite[]>();
        for (const row of (bitesRes.data || []) as any[]) {
          const bite: NanoBite = {
            id: row.id,
            industryId: row.industry_id,
            valueChainStage: row.value_chain_stage,
            microElement: row.micro_element,
            task: row.task,
            cadence: row.cadence,
            automatable: !!row.automatable,
            requiresTier: row.requires_tier ?? undefined,
          } as NanoBite;
          const list = nanoBitesByIndustry.get(bite.industryId) || [];
          list.push(bite);
          nanoBitesByIndustry.set(bite.industryId, list);
        }

        setState({
          verticalCategories,
          nanoBitesByIndustry,
          isReady: true,
          isError: false,
        });
      } catch (err) {
        console.error("[usePayBlueprintCatalog] exception", err);
        if (!cancelled) setState((s) => ({ ...s, isError: true, isReady: true }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}