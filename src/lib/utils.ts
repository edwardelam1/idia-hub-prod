import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as IDIA-USD with exactly 4 decimal places.
 * e.g. formatIdiaUsd(5) => "$5.0000"
 */
export function formatIdiaUsd(amount: number): string {
  return `$${amount.toFixed(4)}`;
}
