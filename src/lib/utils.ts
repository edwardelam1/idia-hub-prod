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

/**
 * Format a number as Synapse Credits with exactly 4 decimal places.
 * e.g. formatCredits(1000) => "1,000.0000 CR"
 */
export function formatCredits(amount: number): string {
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} CR`;
}
