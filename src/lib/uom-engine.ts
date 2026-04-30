import { supabase } from "@/integrations/supabase/client";

export interface UOMUnit {
  id: string;
  unit_name: string;
  unit_abbrev: string;
  dimension_id: string;
  dimension_name: string;
  is_base_unit: boolean;
}

export interface UOMConversion {
  from_uom_id: string;
  to_uom_id: string;
  multiplier: number;
}

export interface DensityCoefficient {
  product_id: string;
  from_dimension_id: string;
  to_dimension_id: string;
  coefficient_value: number;
}

// Cache for units and conversions
let cachedUnits: UOMUnit[] = [];
let cachedConversions: UOMConversion[] = [];

export const loadUOMData = async () => {
  if (cachedUnits.length > 0) return { units: cachedUnits, conversions: cachedConversions };

  const [unitsRes, convRes] = await Promise.all([
    supabase.from('uom_master' as any).select('*, uom_dimensions(dimension_name)'),
    supabase.from('uom_conversions' as any).select('*'),
  ]);

  if (unitsRes.data) {
    cachedUnits = (unitsRes.data as any[]).map(u => ({
      id: u.id,
      unit_name: u.unit_name,
      unit_abbrev: u.unit_abbrev,
      dimension_id: u.dimension_id,
      dimension_name: u.uom_dimensions?.dimension_name || '',
      is_base_unit: u.is_base_unit,
    }));
  }

  if (convRes.data) {
    cachedConversions = (convRes.data as any[]).map(c => ({
      from_uom_id: c.from_uom_id,
      to_uom_id: c.to_uom_id,
      multiplier: parseFloat(c.multiplier),
    }));
  }

  return { units: cachedUnits, conversions: cachedConversions };
};

export const clearUOMCache = () => {
  cachedUnits = [];
  cachedConversions = [];
};

/**
 * Finds the UOM unit by abbreviation or name (case-insensitive match)
 */
export const findUnit = (unitStr: string): UOMUnit | undefined => {
  const lower = unitStr.toLowerCase();
  return cachedUnits.find(u =>
    u.unit_abbrev.toLowerCase() === lower ||
    u.unit_name.toLowerCase() === lower
  );
};

/**
 * Check if two units share the same dimension (intra-dimensional)
 */
export const isSameDimension = (unitA: string, unitB: string): boolean => {
  const a = findUnit(unitA);
  const b = findUnit(unitB);
  if (!a || !b) return false;
  return a.dimension_id === b.dimension_id;
};

/**
 * Check if a cross-dimensional conversion requires a density coefficient
 */
export const requiresDensityCoefficient = (unitA: string, unitB: string): boolean => {
  const a = findUnit(unitA);
  const b = findUnit(unitB);
  if (!a || !b) return false;
  return a.dimension_id !== b.dimension_id;
};

/**
 * Convert a quantity between two units (same dimension only)
 * Returns null if conversion not possible
 */
export const convertUnits = (quantity: number, fromUnit: string, toUnit: string): number | null => {
  if (fromUnit === toUnit) return quantity;

  const from = findUnit(fromUnit);
  const to = findUnit(toUnit);
  if (!from || !to) return null;

  // Must be same dimension for direct conversion
  if (from.dimension_id !== to.dimension_id) return null;

  // Direct conversion path
  const direct = cachedConversions.find(
    c => c.from_uom_id === from.id && c.to_uom_id === to.id
  );
  if (direct) return quantity * direct.multiplier;

  // Try via base unit (2-hop)
  const baseUnit = cachedUnits.find(u => u.dimension_id === from.dimension_id && u.is_base_unit);
  if (!baseUnit) return null;

  const toBase = cachedConversions.find(c => c.from_uom_id === from.id && c.to_uom_id === baseUnit.id);
  const fromBase = cachedConversions.find(c => c.from_uom_id === baseUnit.id && c.to_uom_id === to.id);

  if (toBase && fromBase) {
    return quantity * toBase.multiplier * fromBase.multiplier;
  }

  return null;
};

/**
 * Convert with density coefficient (cross-dimensional)
 */
export const convertWithDensity = (
  quantity: number,
  fromUnit: string,
  toUnit: string,
  densityCoefficient: number
): number | null => {
  const from = findUnit(fromUnit);
  const to = findUnit(toUnit);
  if (!from || !to) return null;

  // Convert from source to base of source dimension
  const fromBase = cachedUnits.find(u => u.dimension_id === from.dimension_id && u.is_base_unit);
  const toBase = cachedUnits.find(u => u.dimension_id === to.dimension_id && u.is_base_unit);
  if (!fromBase || !toBase) return null;

  // Convert to source base
  let inSourceBase = convertUnits(quantity, fromUnit, fromBase.unit_abbrev);
  if (inSourceBase === null) inSourceBase = quantity;

  // Apply density coefficient (cross-dimensional)
  const inTargetBase = inSourceBase * densityCoefficient;

  // Convert from target base to target unit
  const result = convertUnits(inTargetBase, toBase.unit_abbrev, toUnit);
  return result ?? inTargetBase;
};

/**
 * Get dimension name for a unit string
 */
export const getDimensionForUnit = (unitStr: string): string | null => {
  const unit = findUnit(unitStr);
  return unit?.dimension_name || null;
};

/**
 * Validate DAG - check if adding childRecipeId as child of parentRecipeId would create a cycle
 * Uses BFS to check if child is an ancestor of parent
 */
export const validateDAG = async (parentRecipeId: string, childRecipeId: string): Promise<{ valid: boolean; cycle?: string[] }> => {
  if (parentRecipeId === childRecipeId) {
    return { valid: false, cycle: [parentRecipeId] };
  }

  // BFS from childRecipeId upward to see if we reach parentRecipeId
  const { data: hierarchy } = await supabase
    .from('recipe_hierarchy' as any)
    .select('parent_recipe_id, child_recipe_id');

  if (!hierarchy || hierarchy.length === 0) return { valid: true };

  // Build adjacency: child → parents
  const childToParents = new Map<string, string[]>();
  for (const h of hierarchy as any[]) {
    const parents = childToParents.get(h.child_recipe_id) || [];
    parents.push(h.parent_recipe_id);
    childToParents.set(h.child_recipe_id, parents);
  }

  // BFS from parentRecipeId upward: if we reach childRecipeId, cycle exists
  const visited = new Set<string>();
  const queue = [parentRecipeId];
  const path = [parentRecipeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === childRecipeId) {
      return { valid: false, cycle: path };
    }
    if (visited.has(current)) continue;
    visited.add(current);

    const parents = childToParents.get(current) || [];
    for (const p of parents) {
      queue.push(p);
      path.push(p);
    }
  }

  return { valid: true };
};

/**
 * Perform BOM Explosion: resolve all multi-level recipes down to raw inventory items
 */
export const explodeBOM = async (recipeId: string): Promise<{ itemId: string; quantity: number; unit: string }[]> => {
  // Get direct ingredients
  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .eq('recipe_id', recipeId);

  const result: { itemId: string; quantity: number; unit: string }[] = [];

  if (!ingredients) return result;

  for (const ing of ingredients) {
    if (ing.inventory_item_id) {
      const effectiveQty = ing.gross_quantity || ing.quantity;
      result.push({ itemId: ing.inventory_item_id, quantity: effectiveQty, unit: ing.unit || '' });
    }
  }

  // Check for sub-recipes
  const { data: subRecipes } = await supabase
    .from('recipe_hierarchy' as any)
    .select('child_recipe_id, quantity')
    .eq('parent_recipe_id', recipeId);

  if (subRecipes) {
    for (const sub of subRecipes as any[]) {
      const childItems = await explodeBOM(sub.child_recipe_id);
      for (const ci of childItems) {
        const existing = result.find(r => r.itemId === ci.itemId && r.unit === ci.unit);
        if (existing) {
          existing.quantity += ci.quantity * (sub.quantity || 1);
        } else {
          result.push({ ...ci, quantity: ci.quantity * (sub.quantity || 1) });
        }
      }
    }
  }

  return result;
};
