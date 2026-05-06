import type { IndustryNode } from '../types';
import { PRIMARY_INDUSTRIES } from './primary';
import { SECONDARY_INDUSTRIES } from './secondary';
import { TERTIARY_INDUSTRIES } from './tertiary';
import { QUATERNARY_INDUSTRIES } from './quaternary';
import { QUINARY_INDUSTRIES } from './quinary';

// Per-vertical sub-module nodes (Phase 2 of Pay App Builder).
import { GROCER_INDUSTRIES } from './grocer';
import { HOSPITALITY_INDUSTRIES } from './hospitality';
import { LOGISTICS_INDUSTRIES } from './logistics';
import { HEALTHCARE_INDUSTRIES } from './healthcare';
import { RETAIL_INDUSTRIES } from './retail';
import { AUTOMOTIVE_INDUSTRIES } from './automotive';
import { FITNESS_INDUSTRIES } from './fitness';
import { EDUCATION_INDUSTRIES } from './education';
import { ENTERTAINMENT_INDUSTRIES } from './entertainment';
import { PROFESSIONAL_INDUSTRIES } from './professional';
import { MANUFACTURING_INDUSTRIES } from './manufacturing';
import { TRAVEL_INDUSTRIES } from './travel';
import { AGRICULTURE_INDUSTRIES } from './agriculture';
import { CONSTRUCTION_INDUSTRIES } from './construction';
import { ENERGY_INDUSTRIES } from './energy';
import { FINANCIAL_INDUSTRIES } from './financial';
import { GOVERNMENT_INDUSTRIES } from './government';
import { MEDIA_INDUSTRIES } from './media';
import { TELECOM_INDUSTRIES } from './telecom';
import { REALESTATE_INDUSTRIES } from './realestate';
import { NONPROFIT_INDUSTRIES } from './nonprofit';
import { MARINE_INDUSTRIES } from './marine';
import { AVIATION_INDUSTRIES } from './aviation';
import { MINING_INDUSTRIES } from './mining';
import { SECURITY_INDUSTRIES } from './security';
import { EVENTS_INDUSTRIES } from './events';
import { PERSONAL_INDUSTRIES } from './personal';
import { PET_INDUSTRIES } from './pet';
import { FUNERAL_INDUSTRIES } from './funeral';
import { CANNABIS_INDUSTRIES } from './cannabis';
import { ECOMMERCE_INDUSTRIES } from './ecommerce';
import { FOODBEV_INDUSTRIES } from './foodbev';

const SUBMODULE_INDUSTRIES: IndustryNode[] = [
  ...GROCER_INDUSTRIES, ...HOSPITALITY_INDUSTRIES, ...LOGISTICS_INDUSTRIES,
  ...HEALTHCARE_INDUSTRIES, ...RETAIL_INDUSTRIES, ...AUTOMOTIVE_INDUSTRIES,
  ...FITNESS_INDUSTRIES, ...EDUCATION_INDUSTRIES, ...ENTERTAINMENT_INDUSTRIES,
  ...PROFESSIONAL_INDUSTRIES, ...MANUFACTURING_INDUSTRIES, ...TRAVEL_INDUSTRIES,
  ...AGRICULTURE_INDUSTRIES, ...CONSTRUCTION_INDUSTRIES, ...ENERGY_INDUSTRIES,
  ...FINANCIAL_INDUSTRIES, ...GOVERNMENT_INDUSTRIES, ...MEDIA_INDUSTRIES,
  ...TELECOM_INDUSTRIES, ...REALESTATE_INDUSTRIES, ...NONPROFIT_INDUSTRIES,
  ...MARINE_INDUSTRIES, ...AVIATION_INDUSTRIES, ...MINING_INDUSTRIES,
  ...SECURITY_INDUSTRIES, ...EVENTS_INDUSTRIES, ...PERSONAL_INDUSTRIES,
  ...PET_INDUSTRIES, ...FUNERAL_INDUSTRIES, ...CANNABIS_INDUSTRIES,
  ...ECOMMERCE_INDUSTRIES, ...FOODBEV_INDUSTRIES,
];

// Deduplicate (sub-module files exclude IDs already present in tertiary.ts,
// but a guard keeps us safe if a future edit re-introduces a parent).
const seen = new Set<string>();
const dedup = (n: IndustryNode) => {
  if (seen.has(n.id)) return false;
  seen.add(n.id);
  return true;
};

export const ALL_INDUSTRIES: IndustryNode[] = [
  ...PRIMARY_INDUSTRIES,
  ...SECONDARY_INDUSTRIES,
  ...TERTIARY_INDUSTRIES,
  ...QUATERNARY_INDUSTRIES,
  ...QUINARY_INDUSTRIES,
  ...SUBMODULE_INDUSTRIES,
].filter(dedup);

export {
  PRIMARY_INDUSTRIES,
  SECONDARY_INDUSTRIES,
  TERTIARY_INDUSTRIES,
  QUATERNARY_INDUSTRIES,
  QUINARY_INDUSTRIES,
};
