import type { IndustryNode } from '../types';

export const TELECOM_INDUSTRIES: IndustryNode[] = [
  { id: 'quaternary.telecom', parentId: 'quaternary', sector: 'quaternary', label: "Telecommunications", naics: '517', gics: '5010', tags: ["regulated","infrastructure"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'quaternary.telecom.isp', parentId: 'quaternary.telecom', sector: 'quaternary', label: "Telecommunications — Isp", naics: '517', gics: '5010', tags: ["regulated","infrastructure"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'quaternary.telecom.mobile_carrier', parentId: 'quaternary.telecom', sector: 'quaternary', label: "Telecommunications — Mobile Carrier", naics: '517', gics: '5010', tags: ["regulated","infrastructure"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'quaternary.telecom.cable', parentId: 'quaternary.telecom', sector: 'quaternary', label: "Telecommunications — Cable", naics: '517', gics: '5010', tags: ["regulated","infrastructure"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'quaternary.telecom.satellite', parentId: 'quaternary.telecom', sector: 'quaternary', label: "Telecommunications — Satellite", naics: '517', gics: '5010', tags: ["regulated","infrastructure"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'quaternary.telecom.data_centers', parentId: 'quaternary.telecom', sector: 'quaternary', label: "Telecommunications — Data Centers", naics: '517', gics: '5010', tags: ["regulated","infrastructure"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
];
