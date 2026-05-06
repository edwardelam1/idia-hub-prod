import type { NanoBite } from '../types';
import { RETAIL_BITES } from './retail';
import { SAAS_BITES } from './saas';
import { CONSULTING_BITES } from './consulting';
import { CREATOR_BITES } from './creator';
import { MANUFACTURING_BITES } from './manufacturing';
import { PRIMARY_BITES } from './primary';
import { PROCESSING_BITES } from './processing';
import { CONSTRUCTION_BITES } from './construction';
import { HOSPITALITY_BITES } from './hospitality';
import { QSR_BITES } from './qsr';
import { BANKING_BITES } from './banking';
import { TRANSPORT_BITES } from './transport';
import { RND_BITES } from './rnd';
import { QUINARY_BITES } from './quinary';
<<<<<<< HEAD
import { OperationsNanoBites } from './operations';
=======
import { LOGISTICS_BITES } from './logistics';
import { GROCER_BITES } from './grocer';
import { RETAIL_EXTENDED_BITES } from './retail-extended';
import { ECOMMERCE_BITES } from './ecommerce';
// Phase 3b/3c/3d
import { HEALTHCARE_BITES } from './healthcare';
import { PROFESSIONAL_BITES } from './professional';
import { PERSONAL_BITES } from './personal';
import { PET_BITES } from './pet';
import { FUNERAL_BITES } from './funeral';
import { FITNESS_BITES } from './fitness';
import { AUTOMOTIVE_BITES } from './automotive';
import { MANUFACTURING_EXTENDED_BITES } from './manufacturing-extended';
import { CONSTRUCTION_EXTENDED_BITES } from './construction-extended';
import { ENERGY_BITES } from './energy';
import { MINING_BITES } from './mining';
import { AGRICULTURE_BITES } from './agriculture';
import { TRAVEL_BITES } from './travel';
import { MARINE_BITES } from './marine';
import { AVIATION_BITES } from './aviation';
import { REALESTATE_BITES } from './realestate';
import { FINANCIAL_BITES } from './financial';
import { GOVERNMENT_BITES } from './government';
import { MEDIA_BITES } from './media';
import { TELECOM_BITES } from './telecom';
import { NONPROFIT_BITES } from './nonprofit';
import { ENTERTAINMENT_BITES } from './entertainment';
import { EVENTS_BITES } from './events';
import { SECURITY_BITES } from './security';
import { CANNABIS_BITES } from './cannabis';
import { EDUCATION_BITES } from './education';
import { FOODBEV_BITES } from './foodbev';
>>>>>>> b6f54ddae1854c6e150d83fac0a5c26eaad26947

export const ALL_NANO_BITES: NanoBite[] = [
  ...RETAIL_BITES, ...SAAS_BITES, ...CONSULTING_BITES, ...CREATOR_BITES,
  ...MANUFACTURING_BITES, ...PRIMARY_BITES, ...PROCESSING_BITES, ...CONSTRUCTION_BITES,
  ...HOSPITALITY_BITES, ...QSR_BITES, ...OperationsNanoBites, ...BANKING_BITES, ...TRANSPORT_BITES,
  ...RND_BITES, ...QUINARY_BITES,
  ...LOGISTICS_BITES, ...GROCER_BITES, ...RETAIL_EXTENDED_BITES, ...ECOMMERCE_BITES,
  ...HEALTHCARE_BITES, ...PROFESSIONAL_BITES, ...PERSONAL_BITES, ...PET_BITES,
  ...FUNERAL_BITES, ...FITNESS_BITES, ...AUTOMOTIVE_BITES, ...MANUFACTURING_EXTENDED_BITES,
  ...CONSTRUCTION_EXTENDED_BITES, ...ENERGY_BITES, ...MINING_BITES, ...AGRICULTURE_BITES,
  ...TRAVEL_BITES, ...MARINE_BITES, ...AVIATION_BITES, ...REALESTATE_BITES,
  ...FINANCIAL_BITES, ...GOVERNMENT_BITES, ...MEDIA_BITES, ...TELECOM_BITES,
  ...NONPROFIT_BITES, ...ENTERTAINMENT_BITES, ...EVENTS_BITES, ...SECURITY_BITES,
  ...CANNABIS_BITES, ...EDUCATION_BITES, ...FOODBEV_BITES,
];
