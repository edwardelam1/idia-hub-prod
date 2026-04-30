import type { IndustryNode } from '../types';

export const AUTOMOTIVE_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.automotive', parentId: 'tertiary', sector: 'tertiary', label: "Automotive", naics: '441', gics: '2510', tags: ["vehicles"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.automotive.dealership', parentId: 'tertiary.automotive', sector: 'tertiary', label: "Automotive — Dealership", naics: '441', gics: '2510', tags: ["vehicles"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.automotive.service_center', parentId: 'tertiary.automotive', sector: 'tertiary', label: "Automotive — Service Center", naics: '441', gics: '2510', tags: ["vehicles"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.automotive.parts_store', parentId: 'tertiary.automotive', sector: 'tertiary', label: "Automotive — Parts Store", naics: '441', gics: '2510', tags: ["vehicles"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.automotive.rental', parentId: 'tertiary.automotive', sector: 'tertiary', label: "Automotive — Rental", naics: '441', gics: '2510', tags: ["vehicles"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.automotive.car_wash', parentId: 'tertiary.automotive', sector: 'tertiary', label: "Automotive — Car Wash", naics: '441', gics: '2510', tags: ["vehicles"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.automotive.fleet_management', parentId: 'tertiary.automotive', sector: 'tertiary', label: "Automotive — Fleet Management", naics: '441', gics: '2510', tags: ["vehicles"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
];
