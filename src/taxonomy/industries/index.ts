import type { IndustryNode } from '../types';
import { PRIMARY_INDUSTRIES } from './primary';
import { SECONDARY_INDUSTRIES } from './secondary';
import { TERTIARY_INDUSTRIES } from './tertiary';
import { QUATERNARY_INDUSTRIES } from './quaternary';
import { QUINARY_INDUSTRIES } from './quinary';

export const ALL_INDUSTRIES: IndustryNode[] = [
  ...PRIMARY_INDUSTRIES,
  ...SECONDARY_INDUSTRIES,
  ...TERTIARY_INDUSTRIES,
  ...QUATERNARY_INDUSTRIES,
  ...QUINARY_INDUSTRIES,
];

export {
  PRIMARY_INDUSTRIES,
  SECONDARY_INDUSTRIES,
  TERTIARY_INDUSTRIES,
  QUATERNARY_INDUSTRIES,
  QUINARY_INDUSTRIES,
};
