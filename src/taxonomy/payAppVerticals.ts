/**
 * Pay App Vertical Catalog — canonical list of business types the IDIA Pay App
 * Builder can hydrate into a `merchant_blueprint.json`.
 *
 * This is the single source of truth for the "Blueprint Category" assigned to a
 * `businesses` row. Selecting a vertical here maps 1:1 to a module bundle in
 * `src/components/trading/PayAppBlueprint.tsx` (`verticalCategories`) — IDs
 * MUST stay aligned between the two.
 *
 * Why a separate file: the Add Organization dialog only needs id/label, not the
 * heavy icon imports the Builder pulls in. Keeping the catalog mirrored here
 * keeps the dialog lightweight and avoids a circular import through the trading
 * module tree.
 */

export interface PayAppVerticalOption {
  id: string;
  label: string;
}

export const PAY_APP_VERTICAL_OPTIONS: PayAppVerticalOption[] = [
  { id: 'grocer',          label: 'Grocer' },
  { id: 'hospitality',     label: 'Hospitality' },
  { id: 'logistics',       label: 'Logistics' },
  { id: 'healthcare',      label: 'Healthcare' },
  { id: 'retail',          label: 'Retail' },
  { id: 'automotive',      label: 'Automotive' },
  { id: 'fitness',         label: 'Fitness & Wellness' },
  { id: 'education',       label: 'Education' },
  { id: 'entertainment',   label: 'Entertainment' },
  { id: 'professional',    label: 'Professional Services' },
  { id: 'manufacturing',   label: 'Manufacturing' },
  { id: 'travel',          label: 'Travel & Tourism' },
  { id: 'agriculture',     label: 'Agriculture' },
  { id: 'construction',    label: 'Construction' },
  { id: 'energy',          label: 'Energy & Utilities' },
  { id: 'financial',       label: 'Financial Services' },
  { id: 'government',      label: 'Government & Public' },
  { id: 'media',           label: 'Media & Publishing' },
  { id: 'telecom',         label: 'Telecommunications' },
  { id: 'realestate',      label: 'Real Estate' },
  { id: 'nonprofit',       label: 'Non-Profit' },
  { id: 'marine',          label: 'Marine & Maritime' },
  { id: 'aviation',        label: 'Aviation' },
  { id: 'mining',          label: 'Mining & Extraction' },
  { id: 'security',        label: 'Security Services' },
  { id: 'events',          label: 'Event Services' },
  { id: 'personal',        label: 'Personal Services' },
  { id: 'pet',             label: 'Pet Services' },
  { id: 'funeral',         label: 'Funeral Services' },
  { id: 'cannabis',        label: 'Cannabis' },
  { id: 'ecommerce',       label: 'E-Commerce' },
  { id: 'foodbev',         label: 'Food & Beverage Production' },
];

export const getPayAppVerticalLabel = (id?: string | null): string => {
  if (!id) return '';
  return PAY_APP_VERTICAL_OPTIONS.find((v) => v.id === id)?.label ?? id;
};