import type { IndustryNode } from '../types';

export const ENERGY_INDUSTRIES: IndustryNode[] = [
  { id: 'primary.energy', parentId: 'primary', sector: 'primary', label: "Energy & Utilities", naics: '22', gics: '5510', tags: ["regulated","utility"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.energy.solar', parentId: 'primary.energy', sector: 'primary', label: "Energy & Utilities — Solar", naics: '22', gics: '5510', tags: ["regulated","utility"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.energy.wind', parentId: 'primary.energy', sector: 'primary', label: "Energy & Utilities — Wind", naics: '22', gics: '5510', tags: ["regulated","utility"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.energy.oil_gas', parentId: 'primary.energy', sector: 'primary', label: "Energy & Utilities — Oil Gas", naics: '22', gics: '5510', tags: ["regulated","utility"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.energy.electric_utility', parentId: 'primary.energy', sector: 'primary', label: "Energy & Utilities — Electric Utility", naics: '22', gics: '5510', tags: ["regulated","utility"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.energy.water_treatment', parentId: 'primary.energy', sector: 'primary', label: "Energy & Utilities — Water Treatment", naics: '22', gics: '5510', tags: ["regulated","utility"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
];
