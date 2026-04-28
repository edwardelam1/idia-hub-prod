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

export const ALL_NANO_BITES: NanoBite[] = [
  ...RETAIL_BITES, ...SAAS_BITES, ...CONSULTING_BITES, ...CREATOR_BITES,
  ...MANUFACTURING_BITES, ...PRIMARY_BITES, ...PROCESSING_BITES, ...CONSTRUCTION_BITES,
  ...HOSPITALITY_BITES, ...QSR_BITES, ...BANKING_BITES, ...TRANSPORT_BITES,
  ...RND_BITES, ...QUINARY_BITES,
];
