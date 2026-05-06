/**
 * Pay App Sub-Module Routing — single source of truth that maps every
 * `verticalCategories[].subModules[].id` from PayAppBlueprint.tsx to:
 *   1. a canonical taxonomy industryId (for nano-bite hydration)
 *   2. a list of ComponentRegistry keys to mount at runtime
 *
 * The DynamicModuleLoader composes these into the live merchant app.
 * Default modules (security, settings, HR, etc.) are mounted globally and
 * are NOT listed per sub-module here — only vertical-specific modules.
 */

export interface SubModuleRoute {
  /** UI sub-module ID from verticalCategories */
  subModuleId: string;
  /** Human-readable name (mirrored for downstream tooling) */
  name: string;
  /** Parent vertical ID (e.g. 'hospitality') */
  verticalId: string;
  /** Canonical taxonomy IndustryNode ID for nano-bite hydration */
  industryId: string;
  /** ComponentRegistry keys mounted by DynamicModuleLoader */
  components: string[];
}

export const PAY_APP_ROUTING: Record<string, SubModuleRoute> = {
  // ── Grocer ──
  'grocer-club': { subModuleId: 'grocer-club', name: "Club Store", verticalId: 'grocer', industryId: 'tertiary.grocer.club_store', components: ["default-pos","default-inventory","default-local-inventory","default-warehouse-receiving","default-warehouse-counting","default-reports","default-tax"] },
  'grocer-marketplace': { subModuleId: 'grocer-marketplace', name: "Marketplace", verticalId: 'grocer', industryId: 'tertiary.grocer.marketplace', components: ["default-pos","default-inventory","default-local-inventory","default-warehouse-receiving","default-warehouse-counting","default-reports","default-tax"] },
  'grocer-supercenter': { subModuleId: 'grocer-supercenter', name: "Super Center", verticalId: 'grocer', industryId: 'tertiary.grocer.super_center', components: ["default-pos","default-inventory","default-local-inventory","default-warehouse-receiving","default-warehouse-counting","default-reports","default-tax"] },
  'grocer-convenience': { subModuleId: 'grocer-convenience', name: "Convenience", verticalId: 'grocer', industryId: 'tertiary.grocer.convenience', components: ["default-pos","default-inventory","default-local-inventory","default-warehouse-receiving","default-warehouse-counting","default-reports","default-tax"] },
  'grocer-organic': { subModuleId: 'grocer-organic', name: "Organic & Natural", verticalId: 'grocer', industryId: 'tertiary.grocer.organic_natural', components: ["default-pos","default-inventory","default-local-inventory","default-warehouse-receiving","default-warehouse-counting","default-reports","default-tax"] },
  'grocer-butcher': { subModuleId: 'grocer-butcher', name: "Butcher Shop", verticalId: 'grocer', industryId: 'tertiary.grocer.butcher_shop', components: ["default-pos","default-inventory","default-local-inventory","default-warehouse-receiving","default-warehouse-counting","default-reports","default-tax"] },
  // ── Hospitality ──
  // ==========================================================================
  // IDIA SOVEREIGN OS: MASTER HOSPITALITY ROUTING
  // ==========================================================================
  'hosp-fine-dining': { 
    subModuleId: 'hosp-fine-dining', 
    name: "Fine Dining", 
    verticalId: 'hospitality', 
    industryId: 'tertiary.hospitality.fine_dining', 
    components: ["nb-hosp-server", "nb-hosp-kds-routing", "nb-hosp-billing"] 
  },
  'hosp-diner': { 
    subModuleId: 'hosp-diner', 
    name: "Diner", 
    verticalId: 'hospitality', 
    industryId: 'tertiary.hospitality.diner', 
    components: ["nb-hosp-server", "nb-hosp-kds-routing", "nb-hosp-billing"] 
  },
  'hosp-hotel': { 
    subModuleId: 'hosp-hotel', 
    name: "Hotel", 
    verticalId: 'hospitality', 
    industryId: 'tertiary.hospitality.lodging', 
    components: ["nb-hosp-server", "nb-hosp-billing", "nb-hosp-inventory"] 
  },
  'hosp-home': { 
    subModuleId: 'hosp-home', 
    name: "Home Services", 
    verticalId: 'hospitality', 
    industryId: 'tertiary.hospitality.home_services', 
    components: ["nb-hosp-billing"] 
  },
  'hosp-theme-park': { 
    subModuleId: 'hosp-theme-park', 
    name: "Theme Park", 
    verticalId: 'hospitality', 
    industryId: 'tertiary.hospitality.theme_park', 
    components: ["nb-hosp-server", "nb-hosp-billing"] 
  },
  'hosp-cafe': { 
    subModuleId: 'hosp-cafe', 
    name: "Café & Bakery", 
    verticalId: 'hospitality', 
    industryId: 'tertiary.hospitality.cafe_bakery', 
    components: ["nb-hosp-server", "nb-hosp-billing"] 
  },
  'hosp-bar': { 
    subModuleId: 'hosp-bar', 
    name: "Bar & Lounge", 
    verticalId: 'hospitality', 
    industryId: 'tertiary.hospitality.bar_nightlife', 
    components: ["nb-hosp-bar-terminal", "nb-hosp-billing"] 
  },
  'hosp-catering': { 
    subModuleId: 'hosp-catering', 
    name: "Catering", 
    verticalId: 'hospitality', 
    industryId: 'tertiary.hospitality.catering', 
    components: ["nb-hosp-server", "nb-hosp-kds-routing"] 
  },
  'hosp-theme-park-ops': { 
    subModuleId: 'hosp-theme-park-ops', 
    name: "Theme Park Ops", 
    verticalId: 'hospitality', 
    industryId: 'tertiary.hospitality.theme_park', 
    components: ["nb-system-security"] 
  },
  'hosp-cmms': { 
    subModuleId: 'hosp-cmms', 
    name: "CMMS Work Orders", 
    verticalId: 'hospitality', 
    industryId: 'tertiary.hospitality', 
    components: ["nb-hosp-inventory"] 
  },
  'hosp-kds': { 
    subModuleId: 'hosp-kds', 
    name: "KDS Routing", 
    verticalId: 'hospitality', 
    industryId: 'tertiary.hospitality', 
    components: ["nb-hosp-kds-routing"] 
  },
  'hosp-housekeeping-inv': { 
    subModuleId: 'hosp-housekeeping-inv', 
    name: "Housekeeping Inventory", 
    verticalId: 'hospitality', 
    industryId: 'tertiary.hospitality.lodging', 
    components: ["nb-hosp-inventory"] 
  },
  'hosp-life-safety': { 
    subModuleId: 'hosp-life-safety', 
    name: "Life Safety Compliance", 
    verticalId: 'hospitality', 
    industryId: 'tertiary.hospitality', 
    components: ["nb-system-security"] 
  },
  // Targeted Food Truck Support
  'fb-food-truck': { 
    subModuleId: 'fb-food-truck', 
    name: "Food Truck", 
    verticalId: 'foodbev', 
    industryId: 'tertiary.hospitality.quick_service', 
    components: ["nb-hosp-server", "nb-hosp-kds-routing", "nb-hosp-billing"] 
  },
  // ── Logistics ──
  'log-transportation': { subModuleId: 'log-transportation', name: "Transportation", verticalId: 'logistics', industryId: 'tertiary.logistics.transportation', components: ["default-warehouse-receiving","default-warehouse-putaway","default-warehouse-picking","default-warehouse-shipping","default-warehouse-counting","default-warehouse-trucking","default-communications","default-reports"] },
  'log-cross-docking': { subModuleId: 'log-cross-docking', name: "Cross Docking", verticalId: 'logistics', industryId: 'tertiary.logistics.cross_docking', components: ["default-warehouse-receiving","default-warehouse-putaway","default-warehouse-picking","default-warehouse-shipping","default-warehouse-counting","default-warehouse-trucking","default-communications","default-reports"] },
  'log-trucking': { subModuleId: 'log-trucking', name: "Trucking", verticalId: 'logistics', industryId: 'tertiary.logistics.trucking', components: ["default-warehouse-receiving","default-warehouse-putaway","default-warehouse-picking","default-warehouse-shipping","default-warehouse-counting","default-warehouse-trucking","default-communications","default-reports"] },
  'log-warehouse': { subModuleId: 'log-warehouse', name: "Warehousing", verticalId: 'logistics', industryId: 'tertiary.logistics.warehousing', components: ["default-warehouse-receiving","default-warehouse-putaway","default-warehouse-picking","default-warehouse-shipping","default-warehouse-counting","default-warehouse-trucking","default-communications","default-reports"] },
  'log-last-mile': { subModuleId: 'log-last-mile', name: "Last Mile", verticalId: 'logistics', industryId: 'tertiary.logistics.last_mile', components: ["default-warehouse-receiving","default-warehouse-putaway","default-warehouse-picking","default-warehouse-shipping","default-warehouse-counting","default-warehouse-trucking","default-communications","default-reports"] },
  'log-cold-chain': { subModuleId: 'log-cold-chain', name: "Cold Chain", verticalId: 'logistics', industryId: 'tertiary.logistics.cold_chain', components: ["default-warehouse-receiving","default-warehouse-putaway","default-warehouse-picking","default-warehouse-shipping","default-warehouse-counting","default-warehouse-trucking","default-communications","default-reports"] },
  // ── Healthcare ──
  'health-clinic': { subModuleId: 'health-clinic', name: "Clinic", verticalId: 'healthcare', industryId: 'tertiary.healthcare.clinic', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets","default-tax"] },
  'health-hospital': { subModuleId: 'health-hospital', name: "Hospital", verticalId: 'healthcare', industryId: 'tertiary.healthcare.hospital', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets","default-tax"] },
  'health-pharmacy': { subModuleId: 'health-pharmacy', name: "Pharmacy", verticalId: 'healthcare', industryId: 'tertiary.healthcare.pharmacy', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets","default-tax"] },
  'health-dental': { subModuleId: 'health-dental', name: "Dental", verticalId: 'healthcare', industryId: 'tertiary.healthcare.dental', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets","default-tax"] },
  'health-optometry': { subModuleId: 'health-optometry', name: "Optometry", verticalId: 'healthcare', industryId: 'tertiary.healthcare.optometry', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets","default-tax"] },
  'health-veterinary': { subModuleId: 'health-veterinary', name: "Veterinary", verticalId: 'healthcare', industryId: 'tertiary.healthcare.veterinary', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets","default-tax"] },
  'health-mental': { subModuleId: 'health-mental', name: "Mental Health", verticalId: 'healthcare', industryId: 'tertiary.healthcare.mental_health', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets","default-tax"] },
  'health-rehab': { subModuleId: 'health-rehab', name: "Rehabilitation", verticalId: 'healthcare', industryId: 'tertiary.healthcare.rehabilitation', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets","default-tax"] },
  // ── Retail ──
  'retail-fashion': { subModuleId: 'retail-fashion', name: "Fashion & Apparel", verticalId: 'retail', industryId: 'tertiary.retail.fashion_apparel', components: ["default-pos","default-inventory","default-local-inventory","default-reports","default-team","default-tax"] },
  'retail-electronics': { subModuleId: 'retail-electronics', name: "Electronics", verticalId: 'retail', industryId: 'tertiary.retail.electronics', components: ["default-pos","default-inventory","default-local-inventory","default-reports","default-team","default-tax"] },
  'retail-furniture': { subModuleId: 'retail-furniture', name: "Furniture", verticalId: 'retail', industryId: 'tertiary.retail.furniture', components: ["default-pos","default-inventory","default-local-inventory","default-reports","default-team","default-tax"] },
  'retail-jewelry': { subModuleId: 'retail-jewelry', name: "Jewelry", verticalId: 'retail', industryId: 'tertiary.retail.jewelry', components: ["default-pos","default-inventory","default-local-inventory","default-reports","default-team","default-tax"] },
  'retail-sporting': { subModuleId: 'retail-sporting', name: "Sporting Goods", verticalId: 'retail', industryId: 'tertiary.retail.sporting_goods', components: ["default-pos","default-inventory","default-local-inventory","default-reports","default-team","default-tax"] },
  'retail-beauty': { subModuleId: 'retail-beauty', name: "Beauty & Cosmetics", verticalId: 'retail', industryId: 'tertiary.retail.beauty_cosmetics', components: ["default-pos","default-inventory","default-local-inventory","default-reports","default-team","default-tax"] },
  // ── Automotive ──
  'auto-dealership': { subModuleId: 'auto-dealership', name: "Dealership", verticalId: 'automotive', industryId: 'tertiary.automotive.dealership', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets"] },
  'auto-service': { subModuleId: 'auto-service', name: "Service Center", verticalId: 'automotive', industryId: 'tertiary.automotive.service_center', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets"] },
  'auto-parts': { subModuleId: 'auto-parts', name: "Parts Store", verticalId: 'automotive', industryId: 'tertiary.automotive.parts_store', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets"] },
  'auto-rental': { subModuleId: 'auto-rental', name: "Rental", verticalId: 'automotive', industryId: 'tertiary.automotive.rental', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets"] },
  'auto-wash': { subModuleId: 'auto-wash', name: "Car Wash", verticalId: 'automotive', industryId: 'tertiary.automotive.car_wash', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets"] },
  'auto-fleet': { subModuleId: 'auto-fleet', name: "Fleet Management", verticalId: 'automotive', industryId: 'tertiary.automotive.fleet_management', components: ["default-pos","default-inventory","default-reports","default-team","default-timesheets"] },
  // ── Fitness & Wellness ──
  'fit-gym': { subModuleId: 'fit-gym', name: "Gym", verticalId: 'fitness', industryId: 'tertiary.fitness.gym', components: ["default-pos","default-team","default-timesheets","default-reports"] },
  'fit-yoga': { subModuleId: 'fit-yoga', name: "Yoga Studio", verticalId: 'fitness', industryId: 'tertiary.fitness.yoga_studio', components: ["default-pos","default-team","default-timesheets","default-reports"] },
  'fit-spa': { subModuleId: 'fit-spa', name: "Spa", verticalId: 'fitness', industryId: 'tertiary.fitness.spa', components: ["default-pos","default-team","default-timesheets","default-reports"] },
  'fit-martial-arts': { subModuleId: 'fit-martial-arts', name: "Martial Arts", verticalId: 'fitness', industryId: 'tertiary.fitness.martial_arts', components: ["default-pos","default-team","default-timesheets","default-reports"] },
  'fit-swimming': { subModuleId: 'fit-swimming', name: "Swimming", verticalId: 'fitness', industryId: 'tertiary.fitness.swimming', components: ["default-pos","default-team","default-timesheets","default-reports"] },
  'fit-crossfit': { subModuleId: 'fit-crossfit', name: "CrossFit", verticalId: 'fitness', industryId: 'tertiary.fitness.crossfit', components: ["default-pos","default-team","default-timesheets","default-reports"] },
  // ── Education ──
  'edu-school': { subModuleId: 'edu-school', name: "K-12 School", verticalId: 'education', industryId: 'quaternary.education.k_12_school', components: ["default-team","default-timesheets","default-reports","default-communications"] },
  'edu-university': { subModuleId: 'edu-university', name: "University", verticalId: 'education', industryId: 'quaternary.education.university', components: ["default-team","default-timesheets","default-reports","default-communications"] },
  'edu-tutoring': { subModuleId: 'edu-tutoring', name: "Tutoring Center", verticalId: 'education', industryId: 'quaternary.education.tutoring_center', components: ["default-team","default-timesheets","default-reports","default-communications"] },
  'edu-vocational': { subModuleId: 'edu-vocational', name: "Vocational", verticalId: 'education', industryId: 'quaternary.education.vocational', components: ["default-team","default-timesheets","default-reports","default-communications"] },
  'edu-daycare': { subModuleId: 'edu-daycare', name: "Daycare", verticalId: 'education', industryId: 'quaternary.education.daycare', components: ["default-team","default-timesheets","default-reports","default-communications"] },
  'edu-online': { subModuleId: 'edu-online', name: "Online Learning", verticalId: 'education', industryId: 'quaternary.education.online_learning', components: ["default-team","default-timesheets","default-reports","default-communications"] },
  // ── Entertainment ──
  'ent-cinema': { subModuleId: 'ent-cinema', name: "Cinema", verticalId: 'entertainment', industryId: 'quinary.entertainment.cinema', components: ["default-pos","default-inventory","default-reports","default-team"] },
  'ent-arcade': { subModuleId: 'ent-arcade', name: "Arcade", verticalId: 'entertainment', industryId: 'quinary.entertainment.arcade', components: ["default-pos","default-inventory","default-reports","default-team"] },
  'ent-bowling': { subModuleId: 'ent-bowling', name: "Bowling", verticalId: 'entertainment', industryId: 'quinary.entertainment.bowling', components: ["default-pos","default-inventory","default-reports","default-team"] },
  'ent-concert': { subModuleId: 'ent-concert', name: "Concert Venue", verticalId: 'entertainment', industryId: 'quinary.entertainment.concert_venue', components: ["default-pos","default-inventory","default-reports","default-team"] },
  'ent-museum': { subModuleId: 'ent-museum', name: "Museum", verticalId: 'entertainment', industryId: 'quinary.entertainment.museum', components: ["default-pos","default-inventory","default-reports","default-team"] },
  'ent-casino': { subModuleId: 'ent-casino', name: "Casino", verticalId: 'entertainment', industryId: 'quinary.entertainment.casino', components: ["default-pos","default-inventory","default-reports","default-team"] },
  // ── Professional Services ──
  'prof-legal': { subModuleId: 'prof-legal', name: "Legal", verticalId: 'professional', industryId: 'quaternary.professional.legal', components: ["default-team","default-timesheets","default-reports","default-tax","default-communications"] },
  'prof-accounting': { subModuleId: 'prof-accounting', name: "Accounting", verticalId: 'professional', industryId: 'quaternary.professional.accounting', components: ["default-team","default-timesheets","default-reports","default-tax","default-communications"] },
  'prof-consulting': { subModuleId: 'prof-consulting', name: "Consulting", verticalId: 'professional', industryId: 'quaternary.professional.consulting', components: ["default-team","default-timesheets","default-reports","default-tax","default-communications"] },
  'prof-marketing': { subModuleId: 'prof-marketing', name: "Marketing Agency", verticalId: 'professional', industryId: 'quaternary.professional.marketing_agency', components: ["default-team","default-timesheets","default-reports","default-tax","default-communications"] },
  'prof-architecture': { subModuleId: 'prof-architecture', name: "Architecture", verticalId: 'professional', industryId: 'quaternary.professional.architecture', components: ["default-team","default-timesheets","default-reports","default-tax","default-communications"] },
  // ── Manufacturing ──
  'mfg-assembly': { subModuleId: 'mfg-assembly', name: "Assembly", verticalId: 'manufacturing', industryId: 'secondary.manufacturing.assembly', components: ["default-inventory","default-warehouse-receiving","default-warehouse-counting","default-warehouse-shipping","default-reports","default-team","default-timesheets"] },
  'mfg-processing': { subModuleId: 'mfg-processing', name: "Processing", verticalId: 'manufacturing', industryId: 'secondary.manufacturing.processing', components: ["default-inventory","default-warehouse-receiving","default-warehouse-counting","default-warehouse-shipping","default-reports","default-team","default-timesheets"] },
  'mfg-packaging': { subModuleId: 'mfg-packaging', name: "Packaging", verticalId: 'manufacturing', industryId: 'secondary.manufacturing.packaging', components: ["default-inventory","default-warehouse-receiving","default-warehouse-counting","default-warehouse-shipping","default-reports","default-team","default-timesheets"] },
  'mfg-quality': { subModuleId: 'mfg-quality', name: "Quality Control", verticalId: 'manufacturing', industryId: 'secondary.manufacturing.quality_control', components: ["default-inventory","default-warehouse-receiving","default-warehouse-counting","default-warehouse-shipping","default-reports","default-team","default-timesheets"] },
  'mfg-textile': { subModuleId: 'mfg-textile', name: "Textile", verticalId: 'manufacturing', industryId: 'secondary.manufacturing.textile', components: ["default-inventory","default-warehouse-receiving","default-warehouse-counting","default-warehouse-shipping","default-reports","default-team","default-timesheets"] },
  // ── Travel & Tourism ──
  'travel-agency': { subModuleId: 'travel-agency', name: "Travel Agency", verticalId: 'travel', industryId: 'tertiary.travel.travel_agency', components: ["default-pos","default-reports","default-team","default-communications"] },
  'travel-airline': { subModuleId: 'travel-airline', name: "Airline", verticalId: 'travel', industryId: 'tertiary.travel.airline', components: ["default-pos","default-reports","default-team","default-communications"] },
  'travel-cruise': { subModuleId: 'travel-cruise', name: "Cruise", verticalId: 'travel', industryId: 'tertiary.travel.cruise', components: ["default-pos","default-reports","default-team","default-communications"] },
  'travel-tour': { subModuleId: 'travel-tour', name: "Tour Operator", verticalId: 'travel', industryId: 'tertiary.travel.tour_operator', components: ["default-pos","default-reports","default-team","default-communications"] },
  'travel-resort': { subModuleId: 'travel-resort', name: "Resort", verticalId: 'travel', industryId: 'tertiary.travel.resort', components: ["default-pos","default-reports","default-team","default-communications"] },
  // ── Agriculture ──
  'agri-farming': { subModuleId: 'agri-farming', name: "Farming", verticalId: 'agriculture', industryId: 'primary.agriculture.farming', components: ["default-inventory","default-warehouse-counting","default-reports","default-team","default-timesheets"] },
  'agri-ranching': { subModuleId: 'agri-ranching', name: "Ranching", verticalId: 'agriculture', industryId: 'primary.agriculture.ranching', components: ["default-inventory","default-warehouse-counting","default-reports","default-team","default-timesheets"] },
  'agri-aquaculture': { subModuleId: 'agri-aquaculture', name: "Aquaculture", verticalId: 'agriculture', industryId: 'primary.agriculture.aquaculture', components: ["default-inventory","default-warehouse-counting","default-reports","default-team","default-timesheets"] },
  'agri-greenhouse': { subModuleId: 'agri-greenhouse', name: "Greenhouse", verticalId: 'agriculture', industryId: 'primary.agriculture.greenhouse', components: ["default-inventory","default-warehouse-counting","default-reports","default-team","default-timesheets"] },
  'agri-equipment': { subModuleId: 'agri-equipment', name: "Equipment Rental", verticalId: 'agriculture', industryId: 'primary.agriculture.equipment_rental', components: ["default-inventory","default-warehouse-counting","default-reports","default-team","default-timesheets"] },
  // ── Construction ──
  'const-general': { subModuleId: 'const-general', name: "General Contractor", verticalId: 'construction', industryId: 'secondary.construction.general_contractor', components: ["default-inventory","default-warehouse-receiving","default-team","default-timesheets","default-reports"] },
  'const-electrical': { subModuleId: 'const-electrical', name: "Electrical", verticalId: 'construction', industryId: 'secondary.construction.electrical', components: ["default-inventory","default-warehouse-receiving","default-team","default-timesheets","default-reports"] },
  'const-plumbing': { subModuleId: 'const-plumbing', name: "Plumbing", verticalId: 'construction', industryId: 'secondary.construction.plumbing', components: ["default-inventory","default-warehouse-receiving","default-team","default-timesheets","default-reports"] },
  'const-hvac': { subModuleId: 'const-hvac', name: "HVAC", verticalId: 'construction', industryId: 'secondary.construction.hvac', components: ["default-inventory","default-warehouse-receiving","default-team","default-timesheets","default-reports"] },
  'const-landscaping': { subModuleId: 'const-landscaping', name: "Landscaping", verticalId: 'construction', industryId: 'secondary.construction.landscaping', components: ["default-inventory","default-warehouse-receiving","default-team","default-timesheets","default-reports"] },
  'const-roofing': { subModuleId: 'const-roofing', name: "Roofing", verticalId: 'construction', industryId: 'secondary.construction.roofing', components: ["default-inventory","default-warehouse-receiving","default-team","default-timesheets","default-reports"] },
  // ── Energy & Utilities ──
  'energy-solar': { subModuleId: 'energy-solar', name: "Solar", verticalId: 'energy', industryId: 'primary.energy.solar', components: ["default-inventory","default-reports","default-team","default-timesheets"] },
  'energy-wind': { subModuleId: 'energy-wind', name: "Wind", verticalId: 'energy', industryId: 'primary.energy.wind', components: ["default-inventory","default-reports","default-team","default-timesheets"] },
  'energy-oil-gas': { subModuleId: 'energy-oil-gas', name: "Oil & Gas", verticalId: 'energy', industryId: 'primary.energy.oil_gas', components: ["default-inventory","default-reports","default-team","default-timesheets"] },
  'energy-electric': { subModuleId: 'energy-electric', name: "Electric Utility", verticalId: 'energy', industryId: 'primary.energy.electric_utility', components: ["default-inventory","default-reports","default-team","default-timesheets"] },
  'energy-water': { subModuleId: 'energy-water', name: "Water Treatment", verticalId: 'energy', industryId: 'primary.energy.water_treatment', components: ["default-inventory","default-reports","default-team","default-timesheets"] },
  // ── Financial Services ──
  'fin-banking': { subModuleId: 'fin-banking', name: "Banking", verticalId: 'financial', industryId: 'tertiary.financial.banking', components: ["default-reports","default-team","default-tax","default-communications"] },
  'fin-credit-union': { subModuleId: 'fin-credit-union', name: "Credit Union", verticalId: 'financial', industryId: 'tertiary.financial.credit_union', components: ["default-reports","default-team","default-tax","default-communications"] },
  'fin-investment': { subModuleId: 'fin-investment', name: "Investment", verticalId: 'financial', industryId: 'tertiary.financial.investment', components: ["default-reports","default-team","default-tax","default-communications"] },
  'fin-mortgage': { subModuleId: 'fin-mortgage', name: "Mortgage", verticalId: 'financial', industryId: 'tertiary.financial.mortgage', components: ["default-reports","default-team","default-tax","default-communications"] },
  'fin-fintech': { subModuleId: 'fin-fintech', name: "Fintech", verticalId: 'financial', industryId: 'tertiary.financial.fintech', components: ["default-reports","default-team","default-tax","default-communications"] },
  'fin-insurance': { subModuleId: 'fin-insurance', name: "Insurance", verticalId: 'financial', industryId: 'tertiary.financial.insurance', components: ["default-reports","default-team","default-tax","default-communications"] },
  // ── Government & Public ──
  'gov-municipal': { subModuleId: 'gov-municipal', name: "Municipal", verticalId: 'government', industryId: 'quaternary.government.municipal', components: ["default-reports","default-team","default-communications","default-tax"] },
  'gov-federal': { subModuleId: 'gov-federal', name: "Federal", verticalId: 'government', industryId: 'quaternary.government.federal', components: ["default-reports","default-team","default-communications","default-tax"] },
  'gov-courts': { subModuleId: 'gov-courts', name: "Courts", verticalId: 'government', industryId: 'quaternary.government.courts', components: ["default-reports","default-team","default-communications","default-tax"] },
  'gov-dmv': { subModuleId: 'gov-dmv', name: "DMV", verticalId: 'government', industryId: 'quaternary.government.dmv', components: ["default-reports","default-team","default-communications","default-tax"] },
  'gov-parks': { subModuleId: 'gov-parks', name: "Parks & Recreation", verticalId: 'government', industryId: 'quaternary.government.parks_recreation', components: ["default-reports","default-team","default-communications","default-tax"] },
  // ── Media & Publishing ──
  'media-print': { subModuleId: 'media-print', name: "Print Media", verticalId: 'media', industryId: 'quaternary.media.print_media', components: ["default-reports","default-team","default-affiliates","default-communications"] },
  'media-broadcast': { subModuleId: 'media-broadcast', name: "Broadcasting", verticalId: 'media', industryId: 'quaternary.media.broadcasting', components: ["default-reports","default-team","default-affiliates","default-communications"] },
  'media-streaming': { subModuleId: 'media-streaming', name: "Streaming", verticalId: 'media', industryId: 'quaternary.media.streaming', components: ["default-reports","default-team","default-affiliates","default-communications"] },
  'media-podcast': { subModuleId: 'media-podcast', name: "Podcasting", verticalId: 'media', industryId: 'quaternary.media.podcasting', components: ["default-reports","default-team","default-affiliates","default-communications"] },
  'media-news': { subModuleId: 'media-news', name: "News", verticalId: 'media', industryId: 'quaternary.media.news', components: ["default-reports","default-team","default-affiliates","default-communications"] },
  // ── Telecommunications ──
  'tel-isp': { subModuleId: 'tel-isp', name: "ISP", verticalId: 'telecom', industryId: 'quaternary.telecom.isp', components: ["default-reports","default-team","default-communications","default-tax"] },
  'tel-mobile': { subModuleId: 'tel-mobile', name: "Mobile Carrier", verticalId: 'telecom', industryId: 'quaternary.telecom.mobile_carrier', components: ["default-reports","default-team","default-communications","default-tax"] },
  'tel-cable': { subModuleId: 'tel-cable', name: "Cable", verticalId: 'telecom', industryId: 'quaternary.telecom.cable', components: ["default-reports","default-team","default-communications","default-tax"] },
  'tel-satellite': { subModuleId: 'tel-satellite', name: "Satellite", verticalId: 'telecom', industryId: 'quaternary.telecom.satellite', components: ["default-reports","default-team","default-communications","default-tax"] },
  'tel-datacenter': { subModuleId: 'tel-datacenter', name: "Data Centers", verticalId: 'telecom', industryId: 'quaternary.telecom.data_centers', components: ["default-reports","default-team","default-communications","default-tax"] },
  // ── Real Estate ──
  're-property': { subModuleId: 're-property', name: "Property Management", verticalId: 'realestate', industryId: 'tertiary.realestate.property_management', components: ["default-reports","default-team","default-communications","default-tax"] },
  're-leasing': { subModuleId: 're-leasing', name: "Leasing", verticalId: 'realestate', industryId: 'tertiary.realestate.leasing', components: ["default-reports","default-team","default-communications","default-tax"] },
  're-brokerage': { subModuleId: 're-brokerage', name: "Brokerage", verticalId: 'realestate', industryId: 'tertiary.realestate.brokerage', components: ["default-reports","default-team","default-communications","default-tax"] },
  're-appraisal': { subModuleId: 're-appraisal', name: "Appraisal", verticalId: 'realestate', industryId: 'tertiary.realestate.appraisal', components: ["default-reports","default-team","default-communications","default-tax"] },
  're-title': { subModuleId: 're-title', name: "Title", verticalId: 'realestate', industryId: 'tertiary.realestate.title', components: ["default-reports","default-team","default-communications","default-tax"] },
  // ── Non-Profit ──
  'np-charity': { subModuleId: 'np-charity', name: "Charity", verticalId: 'nonprofit', industryId: 'quinary.nonprofit.charity', components: ["default-reports","default-team","default-communications","default-affiliates"] },
  'np-foundation': { subModuleId: 'np-foundation', name: "Foundation", verticalId: 'nonprofit', industryId: 'quinary.nonprofit.foundation', components: ["default-reports","default-team","default-communications","default-affiliates"] },
  'np-ngo': { subModuleId: 'np-ngo', name: "NGO", verticalId: 'nonprofit', industryId: 'quinary.nonprofit.ngo', components: ["default-reports","default-team","default-communications","default-affiliates"] },
  'np-religious': { subModuleId: 'np-religious', name: "Religious", verticalId: 'nonprofit', industryId: 'quinary.nonprofit.religious', components: ["default-reports","default-team","default-communications","default-affiliates"] },
  'np-community': { subModuleId: 'np-community', name: "Community Org", verticalId: 'nonprofit', industryId: 'quinary.nonprofit.community_org', components: ["default-reports","default-team","default-communications","default-affiliates"] },
  // ── Marine & Maritime ──
  'mar-shipping': { subModuleId: 'mar-shipping', name: "Shipping", verticalId: 'marine', industryId: 'tertiary.marine.shipping', components: ["default-warehouse-receiving","default-warehouse-shipping","default-warehouse-trucking","default-reports","default-team","default-timesheets"] },
  'mar-port': { subModuleId: 'mar-port', name: "Port Operations", verticalId: 'marine', industryId: 'tertiary.marine.port_operations', components: ["default-warehouse-receiving","default-warehouse-shipping","default-warehouse-trucking","default-reports","default-team","default-timesheets"] },
  'mar-boat-sales': { subModuleId: 'mar-boat-sales', name: "Boat Sales", verticalId: 'marine', industryId: 'tertiary.marine.boat_sales', components: ["default-warehouse-receiving","default-warehouse-shipping","default-warehouse-trucking","default-reports","default-team","default-timesheets"] },
  'mar-marina': { subModuleId: 'mar-marina', name: "Marina", verticalId: 'marine', industryId: 'tertiary.marine.marina', components: ["default-warehouse-receiving","default-warehouse-shipping","default-warehouse-trucking","default-reports","default-team","default-timesheets"] },
  'mar-fishing': { subModuleId: 'mar-fishing', name: "Commercial Fishing", verticalId: 'marine', industryId: 'tertiary.marine.commercial_fishing', components: ["default-warehouse-receiving","default-warehouse-shipping","default-warehouse-trucking","default-reports","default-team","default-timesheets"] },
  // ── Aviation ──
  'avi-airport': { subModuleId: 'avi-airport', name: "Airport", verticalId: 'aviation', industryId: 'tertiary.aviation.airport', components: ["default-warehouse-receiving","default-warehouse-shipping","default-reports","default-team","default-timesheets"] },
  'avi-flight-school': { subModuleId: 'avi-flight-school', name: "Flight School", verticalId: 'aviation', industryId: 'tertiary.aviation.flight_school', components: ["default-warehouse-receiving","default-warehouse-shipping","default-reports","default-team","default-timesheets"] },
  'avi-charter': { subModuleId: 'avi-charter', name: "Charter", verticalId: 'aviation', industryId: 'tertiary.aviation.charter', components: ["default-warehouse-receiving","default-warehouse-shipping","default-reports","default-team","default-timesheets"] },
  'avi-maintenance': { subModuleId: 'avi-maintenance', name: "Maintenance", verticalId: 'aviation', industryId: 'tertiary.aviation.maintenance', components: ["default-warehouse-receiving","default-warehouse-shipping","default-reports","default-team","default-timesheets"] },
  'avi-cargo': { subModuleId: 'avi-cargo', name: "Air Cargo", verticalId: 'aviation', industryId: 'tertiary.aviation.air_cargo', components: ["default-warehouse-receiving","default-warehouse-shipping","default-reports","default-team","default-timesheets"] },
  // ── Mining & Extraction ──
  'min-mining': { subModuleId: 'min-mining', name: "Mining", verticalId: 'mining', industryId: 'primary.mining.mining', components: ["default-inventory","default-warehouse-counting","default-reports","default-team","default-timesheets"] },
  'min-quarrying': { subModuleId: 'min-quarrying', name: "Quarrying", verticalId: 'mining', industryId: 'primary.mining.quarrying', components: ["default-inventory","default-warehouse-counting","default-reports","default-team","default-timesheets"] },
  'min-drilling': { subModuleId: 'min-drilling', name: "Drilling", verticalId: 'mining', industryId: 'primary.mining.drilling', components: ["default-inventory","default-warehouse-counting","default-reports","default-team","default-timesheets"] },
  'min-refining': { subModuleId: 'min-refining', name: "Refining", verticalId: 'mining', industryId: 'primary.mining.refining', components: ["default-inventory","default-warehouse-counting","default-reports","default-team","default-timesheets"] },
  // ── Security Services ──
  'sec-private': { subModuleId: 'sec-private', name: "Private Security", verticalId: 'security', industryId: 'tertiary.security.private_security', components: ["default-team","default-timesheets","default-reports","default-communications"] },
  'sec-alarm': { subModuleId: 'sec-alarm', name: "Alarm Systems", verticalId: 'security', industryId: 'tertiary.security.alarm_systems', components: ["default-team","default-timesheets","default-reports","default-communications"] },
  'sec-surveillance': { subModuleId: 'sec-surveillance', name: "Surveillance", verticalId: 'security', industryId: 'tertiary.security.surveillance', components: ["default-team","default-timesheets","default-reports","default-communications"] },
  'sec-cyber': { subModuleId: 'sec-cyber', name: "Cybersecurity", verticalId: 'security', industryId: 'tertiary.security.cybersecurity', components: ["default-team","default-timesheets","default-reports","default-communications"] },
  // ── Event Services ──
  'evt-wedding': { subModuleId: 'evt-wedding', name: "Wedding Planning", verticalId: 'events', industryId: 'quinary.events.wedding_planning', components: ["default-pos","default-team","default-timesheets","default-reports","default-communications"] },
  'evt-corporate': { subModuleId: 'evt-corporate', name: "Corporate Events", verticalId: 'events', industryId: 'quinary.events.corporate_events', components: ["default-pos","default-team","default-timesheets","default-reports","default-communications"] },
  'evt-concerts': { subModuleId: 'evt-concerts', name: "Concerts", verticalId: 'events', industryId: 'quinary.events.concerts', components: ["default-pos","default-team","default-timesheets","default-reports","default-communications"] },
  'evt-festivals': { subModuleId: 'evt-festivals', name: "Festivals", verticalId: 'events', industryId: 'quinary.events.festivals', components: ["default-pos","default-team","default-timesheets","default-reports","default-communications"] },
  'evt-convention': { subModuleId: 'evt-convention', name: "Conventions", verticalId: 'events', industryId: 'quinary.events.conventions', components: ["default-pos","default-team","default-timesheets","default-reports","default-communications"] },
  // ── Personal Services ──
  'pers-salon': { subModuleId: 'pers-salon', name: "Salon", verticalId: 'personal', industryId: 'quinary.personal.salon', components: ["default-pos","default-team","default-timesheets","default-reports"] },
  'pers-barbershop': { subModuleId: 'pers-barbershop', name: "Barbershop", verticalId: 'personal', industryId: 'quinary.personal.barbershop', components: ["default-pos","default-team","default-timesheets","default-reports"] },
  'pers-tattoo': { subModuleId: 'pers-tattoo', name: "Tattoo", verticalId: 'personal', industryId: 'quinary.personal.tattoo', components: ["default-pos","default-team","default-timesheets","default-reports"] },
  'pers-dry-cleaning': { subModuleId: 'pers-dry-cleaning', name: "Dry Cleaning", verticalId: 'personal', industryId: 'quinary.personal.dry_cleaning', components: ["default-pos","default-team","default-timesheets","default-reports"] },
  'pers-tailoring': { subModuleId: 'pers-tailoring', name: "Tailoring", verticalId: 'personal', industryId: 'quinary.personal.tailoring', components: ["default-pos","default-team","default-timesheets","default-reports"] },
  // ── Pet Services ──
  'pet-store': { subModuleId: 'pet-store', name: "Pet Store", verticalId: 'pet', industryId: 'quinary.pet.pet_store', components: ["default-pos","default-inventory","default-team","default-reports"] },
  'pet-grooming': { subModuleId: 'pet-grooming', name: "Grooming", verticalId: 'pet', industryId: 'quinary.pet.grooming', components: ["default-pos","default-inventory","default-team","default-reports"] },
  'pet-boarding': { subModuleId: 'pet-boarding', name: "Boarding", verticalId: 'pet', industryId: 'quinary.pet.boarding', components: ["default-pos","default-inventory","default-team","default-reports"] },
  'pet-training': { subModuleId: 'pet-training', name: "Training", verticalId: 'pet', industryId: 'quinary.pet.training', components: ["default-pos","default-inventory","default-team","default-reports"] },
  'pet-daycare': { subModuleId: 'pet-daycare', name: "Pet Daycare", verticalId: 'pet', industryId: 'quinary.pet.pet_daycare', components: ["default-pos","default-inventory","default-team","default-reports"] },
  // ── Funeral Services ──
  'fun-home': { subModuleId: 'fun-home', name: "Funeral Home", verticalId: 'funeral', industryId: 'quinary.funeral.funeral_home', components: ["default-pos","default-inventory","default-team","default-reports","default-communications"] },
  'fun-cemetery': { subModuleId: 'fun-cemetery', name: "Cemetery", verticalId: 'funeral', industryId: 'quinary.funeral.cemetery', components: ["default-pos","default-inventory","default-team","default-reports","default-communications"] },
  'fun-cremation': { subModuleId: 'fun-cremation', name: "Cremation", verticalId: 'funeral', industryId: 'quinary.funeral.cremation', components: ["default-pos","default-inventory","default-team","default-reports","default-communications"] },
  'fun-memorial': { subModuleId: 'fun-memorial', name: "Memorial", verticalId: 'funeral', industryId: 'quinary.funeral.memorial', components: ["default-pos","default-inventory","default-team","default-reports","default-communications"] },
  // ── Cannabis ──
  'can-dispensary': { subModuleId: 'can-dispensary', name: "Dispensary", verticalId: 'cannabis', industryId: 'tertiary.cannabis.dispensary', components: ["default-pos","default-inventory","default-warehouse-counting","default-reports","default-team","default-tax"] },
  'can-cultivation': { subModuleId: 'can-cultivation', name: "Cultivation", verticalId: 'cannabis', industryId: 'tertiary.cannabis.cultivation', components: ["default-pos","default-inventory","default-warehouse-counting","default-reports","default-team","default-tax"] },
  'can-processing': { subModuleId: 'can-processing', name: "Processing", verticalId: 'cannabis', industryId: 'tertiary.cannabis.processing', components: ["default-pos","default-inventory","default-warehouse-counting","default-reports","default-team","default-tax"] },
  'can-testing': { subModuleId: 'can-testing', name: "Testing Lab", verticalId: 'cannabis', industryId: 'tertiary.cannabis.testing_lab', components: ["default-pos","default-inventory","default-warehouse-counting","default-reports","default-team","default-tax"] },
  // ── E-Commerce ──
  'ecom-dropship': { subModuleId: 'ecom-dropship', name: "Dropshipping", verticalId: 'ecommerce', industryId: 'tertiary.ecommerce.dropshipping', components: ["default-inventory","default-warehouse-picking","default-warehouse-shipping","default-warehouse-trucking","default-reports","default-affiliates"] },
  'ecom-marketplace': { subModuleId: 'ecom-marketplace', name: "Marketplace Seller", verticalId: 'ecommerce', industryId: 'tertiary.ecommerce.marketplace_seller', components: ["default-inventory","default-warehouse-picking","default-warehouse-shipping","default-warehouse-trucking","default-reports","default-affiliates"] },
  'ecom-subscription': { subModuleId: 'ecom-subscription', name: "Subscription Box", verticalId: 'ecommerce', industryId: 'tertiary.ecommerce.subscription_box', components: ["default-inventory","default-warehouse-picking","default-warehouse-shipping","default-warehouse-trucking","default-reports","default-affiliates"] },
  'ecom-digital': { subModuleId: 'ecom-digital', name: "Digital Goods", verticalId: 'ecommerce', industryId: 'tertiary.ecommerce.digital_goods', components: ["default-inventory","default-warehouse-picking","default-warehouse-shipping","default-warehouse-trucking","default-reports","default-affiliates"] },
  // ── Food & Beverage Production ──
  'fb-brewery': { subModuleId: 'fb-brewery', name: "Brewery", verticalId: 'foodbev', industryId: 'secondary.foodbev.brewery', components: ["default-inventory","default-warehouse-receiving","default-warehouse-counting","default-warehouse-shipping","default-reports","default-team"] },
  'fb-winery': { subModuleId: 'fb-winery', name: "Winery", verticalId: 'foodbev', industryId: 'secondary.foodbev.winery', components: ["default-inventory","default-warehouse-receiving","default-warehouse-counting","default-warehouse-shipping","default-reports","default-team"] },
  'fb-distillery': { subModuleId: 'fb-distillery', name: "Distillery", verticalId: 'foodbev', industryId: 'secondary.foodbev.distillery', components: ["default-inventory","default-warehouse-receiving","default-warehouse-counting","default-warehouse-shipping","default-reports","default-team"] },
  'fb-bakery-prod': { subModuleId: 'fb-bakery-prod', name: "Bakery Production", verticalId: 'foodbev', industryId: 'secondary.foodbev.bakery_production', components: ["default-inventory","default-warehouse-receiving","default-warehouse-counting","default-warehouse-shipping","default-reports","default-team"] },
};

export const getRoute = (subModuleId: string): SubModuleRoute | undefined =>
  PAY_APP_ROUTING[subModuleId];

/**
 * Boot-time smoke assertion — verifies that every sub-module ID referenced by
 * the Pay App Builder's `verticalCategories` resolves through PAY_APP_ROUTING
 * to a canonical industryId. Logs unmapped IDs in dev, never throws in prod.
 */
export function assertPayAppRoutingCoverage(subModuleIds: string[]): {
  total: number;
  mapped: number;
  unmapped: string[];
} {
  const unmapped = subModuleIds.filter((id) => !PAY_APP_ROUTING[id]);
  const report = {
    total: subModuleIds.length,
    mapped: subModuleIds.length - unmapped.length,
    unmapped,
  };
  if (unmapped.length > 0) {
    console.warn(
      `[PAY_APP_ROUTING]: ${unmapped.length}/${subModuleIds.length} sub-modules UNMAPPED`,
      unmapped,
    );
  } else {
    console.log(
      `[PAY_APP_ROUTING]: ✓ Coverage 100% — ${report.mapped}/${report.total} sub-modules mapped`,
    );
  }
  return report;
}
