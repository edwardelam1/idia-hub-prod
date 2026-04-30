import type { IndustryNode } from '../types';

export const ECOMMERCE_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.ecommerce', parentId: 'tertiary', sector: 'tertiary', label: "E-Commerce", naics: '4541', gics: '2550', tags: ["digital","retail"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.ecommerce.dropshipping', parentId: 'tertiary.ecommerce', sector: 'tertiary', label: "E-Commerce — Dropshipping", naics: '4541', gics: '2550', tags: ["digital","retail"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.ecommerce.marketplace_seller', parentId: 'tertiary.ecommerce', sector: 'tertiary', label: "E-Commerce — Marketplace Seller", naics: '4541', gics: '2550', tags: ["digital","retail"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.ecommerce.subscription_box', parentId: 'tertiary.ecommerce', sector: 'tertiary', label: "E-Commerce — Subscription Box", naics: '4541', gics: '2550', tags: ["digital","retail"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.ecommerce.digital_goods', parentId: 'tertiary.ecommerce', sector: 'tertiary', label: "E-Commerce — Digital Goods", naics: '4541', gics: '2550', tags: ["digital","retail"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
];
