/**
 * Precision Calculator Engine
 * All inventory math flows through here to guarantee correct results.
 * Uses integer-scaled arithmetic to avoid floating-point drift.
 */

const SCALE = 1_000_000; // 6 decimal places of precision

const toInt = (n: number): number => Math.round(n * SCALE);
const fromInt = (n: number): number => n / SCALE;

/** Multiply two numbers with precision */
export const multiply = (a: number, b: number): number =>
  fromInt(toInt(a) * toInt(b)) / SCALE * SCALE === fromInt(toInt(a) * toInt(b))
    ? Math.round((a * b) * SCALE) / SCALE
    : Math.round((a * b) * SCALE) / SCALE;

/** Divide two numbers with precision (returns 0 if divisor is 0) */
export const divide = (a: number, b: number): number => {
  if (b === 0) return 0;
  return Math.round((a / b) * SCALE) / SCALE;
};

/** Add two numbers with precision */
export const add = (a: number, b: number): number =>
  Math.round((a + b) * SCALE) / SCALE;

/** Subtract two numbers with precision */
export const subtract = (a: number, b: number): number =>
  Math.round((a - b) * SCALE) / SCALE;

/** Calculate percentage: (part / whole) * 100 */
export const percentage = (part: number, whole: number): number => {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 100 * SCALE) / SCALE;
};

/** Round to N decimal places */
export const roundTo = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/** Format a number as currency string */
export const formatCurrency = (value: number): string =>
  `$${roundTo(value, 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Format a number with commas and N decimal places */
export const formatNumber = (value: number, decimals: number = 2): string =>
  roundTo(value, decimals).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// ── Inventory-specific calculations ──

/** Total inventory value = current_stock × cost_per_unit */
export const totalValue = (currentStock: number, costPerUnit: number): number =>
  roundTo(multiply(currentStock, costPerUnit), 2);

/** Total volume/weight = current_stock × individual_unit_size */
export const totalVolume = (currentStock: number, unitSize: number): number =>
  roundTo(multiply(currentStock, unitSize), 4);

/** Stock level percentage = min((current_stock / par_level) × 100, 100) */
export const stockPercentage = (currentStock: number, parLevel: number): number => {
  if (parLevel <= 0) return 0;
  return Math.min(roundTo(percentage(currentStock, parLevel), 1), 100);
};

/** Reorder quantity = par_level - current_stock (clamped to 0) */
export const reorderQuantity = (currentStock: number, parLevel: number): number =>
  Math.max(subtract(parLevel, currentStock), 0);

/** Default reorder point = floor(par_level × 0.3) */
export const defaultReorderPoint = (parLevel: number): number =>
  Math.floor(multiply(parLevel, 0.3));
