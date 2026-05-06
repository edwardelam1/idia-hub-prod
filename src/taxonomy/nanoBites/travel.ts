import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for travel
export const TRAVEL_BITES: NanoBite[] = [
  // tertiary.travel.travel_agency
  { id: 'tv.agy.1', industryId: 'tertiary.travel.travel_agency', valueChainStage: 'marketing_sales', microElement: "Itinerary", task: "Itinerary build & quote", cadence: 'event', automatable: true },
  { id: 'tv.agy.2', industryId: 'tertiary.travel.travel_agency', valueChainStage: 'operations', microElement: "GDS", task: "GDS booking sync", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'tv.agy.3', industryId: 'tertiary.travel.travel_agency', valueChainStage: 'marketing_sales', microElement: "Commission", task: "Commission tracking", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 'tv.agy.4', industryId: 'tertiary.travel.travel_agency', valueChainStage: 'service', microElement: "Visa", task: "Visa-doc checklist", cadence: 'event', automatable: true },
  { id: 'tv.agy.5', industryId: 'tertiary.travel.travel_agency', valueChainStage: 'service', microElement: "Disruption", task: "Disruption rebooking", cadence: 'event', automatable: true, requiresTier: 'pro' },
  // tertiary.travel.airline
  { id: 'tv.air.1', industryId: 'tertiary.travel.airline', valueChainStage: 'operations', microElement: "PNR", task: "PNR creation", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'tv.air.2', industryId: 'tertiary.travel.airline', valueChainStage: 'operations', microElement: "Seat Map", task: "Seat-map management", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'tv.air.3', industryId: 'tertiary.travel.airline', valueChainStage: 'service', microElement: "Disruption", task: "IROPS rebooking", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'tv.air.4', industryId: 'tertiary.travel.airline', valueChainStage: 'marketing_sales', microElement: "Ancillary", task: "Ancillary upsell", cadence: 'event', automatable: true },
  { id: 'tv.air.5', industryId: 'tertiary.travel.airline', valueChainStage: 'outbound_logistics', microElement: "Bag Tag", task: "Bag-tag generation", cadence: 'daily', automatable: true },
  // tertiary.travel.cruise
  { id: 'tv.cru.1', industryId: 'tertiary.travel.cruise', valueChainStage: 'operations', microElement: "Cabin", task: "Cabin-inventory mgmt", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'tv.cru.2', industryId: 'tertiary.travel.cruise', valueChainStage: 'marketing_sales', microElement: "Excursion", task: "Shore-excursion sale", cadence: 'event', automatable: true },
  { id: 'tv.cru.3', industryId: 'tertiary.travel.cruise', valueChainStage: 'operations', microElement: "Manifest", task: "Sailing manifest", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'tv.cru.4', industryId: 'tertiary.travel.cruise', valueChainStage: 'service', microElement: "Folio", task: "On-board folio billing", cadence: 'daily', automatable: true },
  { id: 'tv.cru.5', industryId: 'tertiary.travel.cruise', valueChainStage: 'service', microElement: "Embark", task: "Embark/disembark scan", cadence: 'event', automatable: true },
  // tertiary.travel.tour_operator
  { id: 'tv.tour.1', industryId: 'tertiary.travel.tour_operator', valueChainStage: 'operations', microElement: "Booking", task: "Tour booking", cadence: 'daily', automatable: true },
  { id: 'tv.tour.2', industryId: 'tertiary.travel.tour_operator', valueChainStage: 'operations', microElement: "Manifest", task: "Tour manifest", cadence: 'event', automatable: true },
  { id: 'tv.tour.3', industryId: 'tertiary.travel.tour_operator', valueChainStage: 'marketing_sales', microElement: "Reseller", task: "Reseller commission", cadence: 'monthly', automatable: true },
  { id: 'tv.tour.4', industryId: 'tertiary.travel.tour_operator', valueChainStage: 'operations', microElement: "Guide Sched", task: "Guide assignment", cadence: 'daily', automatable: true },
  { id: 'tv.tour.5', industryId: 'tertiary.travel.tour_operator', valueChainStage: 'service', microElement: "Waiver", task: "Liability waiver", cadence: 'event', automatable: true, requiresTier: 'pro' },
  // tertiary.travel.resort
  { id: 'tv.res.1', industryId: 'tertiary.travel.resort', valueChainStage: 'operations', microElement: "Reservation", task: "Reservation management", cadence: 'daily', automatable: true },
  { id: 'tv.res.2', industryId: 'tertiary.travel.resort', valueChainStage: 'service', microElement: "Folio", task: "Guest folio", cadence: 'daily', automatable: true },
  { id: 'tv.res.3', industryId: 'tertiary.travel.resort', valueChainStage: 'operations', microElement: "Housekeeping", task: "Room status sync", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'tv.res.4', industryId: 'tertiary.travel.resort', valueChainStage: 'marketing_sales', microElement: "Package", task: "All-inclusive package", cadence: 'event', automatable: true },
  { id: 'tv.res.5', industryId: 'tertiary.travel.resort', valueChainStage: 'marketing_sales', microElement: "Loyalty", task: "Loyalty points accrual", cadence: 'event', automatable: true },
];
