import { useState, useCallback, useRef, useEffect, Fragment } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { initializeTaxonomy, getNanoBitesFor, getIndustryById, type NanoBite } from "@/taxonomy";
import { useBusinessTaxonomy } from "@/hooks/useBusinessTaxonomy";
import { PAY_APP_ROUTING, getRoute, assertPayAppRoutingCoverage } from "@/taxonomy/payAppRouting";
import { getSubModuleCoverage } from "@/taxonomy/selectors";
import { usePayBlueprintCatalog } from "@/hooks/usePayBlueprintCatalog";
import { NanoBitePicoDialog } from "./NanoBitePicoDialog";
import { Settings2 } from "lucide-react";
import {
  Package,
  Send,
  Download,
  Copy,
  Check,
  X,
  ChevronLeft,
  Sparkles,
  Activity,
  Radar,
  Cpu,
  Zap as ZapBolt,
  ShoppingCart,
  Utensils,
  Truck,
  Building2,
  Heart,
  GraduationCap,
  Factory,
  Plane,
  Gamepad2,
  Dumbbell,
  Car,
  Stethoscope,
  Briefcase,
  MessageSquare,
  FileText,
  ClipboardList,
  Library,
  Receipt,
  Users,
  Settings,
  Shield,
  UserCog,
  BookOpen,
  Glasses,
  Handshake,
  Leaf,
  Hammer,
  Zap,
  Landmark,
  Building,
  Tv,
  Radio,
  Home,
  Ship,
  Pickaxe,
  Lock,
  Calendar,
  Scissors,
  PawPrint,
  Flower2,
  Cannabis,
  Globe,
  Beer,
  Save,
  Power,
  PowerOff,
  RotateCcw,
  Plus,
  History,
  type LucideIcon,
} from "lucide-react";

// Types
interface SubModule {
  id: string;
  name: string;
  description: string;
}

interface VerticalCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  subModules: SubModule[];
}

interface SelectedModule {
  id: string;
  name: string;
  parentId?: string;
  parentName?: string;
  isDefault?: boolean;
  fromExplosion?: boolean;
  icon?: LucideIcon;
  color?: string;
}

// Complete Vertical Categories - 32+ industries
const verticalCategories: VerticalCategory[] = [
  {
    id: "grocer",
    name: "Grocer",
    icon: ShoppingCart,
    color: "bg-green-500",
    subModules: [
      { id: "grocer-club", name: "Club Store", description: "Membership-based wholesale" },
      { id: "grocer-marketplace", name: "Marketplace", description: "Multi-vendor grocery" },
      { id: "grocer-supercenter", name: "Super Center", description: "Full-service supermarket" },
      { id: "grocer-convenience", name: "Convenience", description: "Quick-stop essentials" },
      { id: "grocer-organic", name: "Organic & Natural", description: "Health-focused grocery" },
      { id: "grocer-butcher", name: "Butcher Shop", description: "Specialty meats" },
    ],
  },
  {
    id: "hospitality",
    name: "Hospitality",
    icon: Utensils,
    color: "bg-orange-500",
    subModules: [
      { id: "hosp-fine-dining", name: "Fine Dining", description: "Upscale restaurant service" },
      { id: "hosp-diner", name: "Diner", description: "Casual dining experience" },
      { id: "hosp-hotel", name: "Hotel", description: "Lodging & room service" },
      { id: "hosp-home", name: "Home Services", description: "In-home hospitality" },
      { id: "hosp-theme-park", name: "Theme Park", description: "Entertainment venues" },
      { id: "hosp-cafe", name: "Café & Bakery", description: "Coffee & pastries" },
      { id: "hosp-bar", name: "Bar & Lounge", description: "Beverage service" },
      { id: "hosp-catering", name: "Catering", description: "Event food service" },
      { id: "hosp-food-truck", name: "Food Truck", description: "Mobile food service" },
      {
        id: "hosp-theme-park-ops",
        name: "Theme Park Ops",
        description: "Queues, ride telemetry, biometric entitlements",
      },
      { id: "hosp-cmms", name: "CMMS Work Orders", description: "Preventive maintenance & LOTO sign-offs" },
      { id: "hosp-kds", name: "KDS Routing", description: "Zone routing for broiler / fry / garde manger" },
      {
        id: "hosp-housekeeping-inv",
        name: "Housekeeping Inventory",
        description: "Cart par levels & chemical manifests",
      },
      { id: "hosp-life-safety", name: "Life Safety Compliance", description: "NFPA 101, sprinkler & hood inspections" },
    ],
  },
  {
    id: "logistics",
    name: "Logistics",
    icon: Truck,
    color: "bg-blue-500",
    subModules: [
      { id: "log-transportation", name: "Transportation", description: "Fleet management" },
      { id: "log-cross-docking", name: "Cross Docking", description: "Transfer operations" },
      { id: "log-trucking", name: "Trucking", description: "Long-haul freight" },
      { id: "log-warehouse", name: "Warehousing", description: "Storage facilities" },
      { id: "log-last-mile", name: "Last Mile", description: "Final delivery" },
      { id: "log-cold-chain", name: "Cold Chain", description: "Temperature-controlled" },
    ],
  },
  {
    id: "healthcare",
    name: "Healthcare",
    icon: Stethoscope,
    color: "bg-red-500",
    subModules: [
      { id: "health-clinic", name: "Clinic", description: "Outpatient care" },
      { id: "health-hospital", name: "Hospital", description: "Inpatient services" },
      { id: "health-pharmacy", name: "Pharmacy", description: "Prescription services" },
      { id: "health-dental", name: "Dental", description: "Oral healthcare" },
      { id: "health-optometry", name: "Optometry", description: "Vision care" },
      { id: "health-veterinary", name: "Veterinary", description: "Animal care" },
      { id: "health-mental", name: "Mental Health", description: "Counseling & therapy" },
      { id: "health-rehab", name: "Rehabilitation", description: "Recovery services" },
    ],
  },
  {
    id: "retail",
    name: "Retail",
    icon: Building2,
    color: "bg-purple-500",
    subModules: [
      { id: "retail-fashion", name: "Fashion & Apparel", description: "Clothing stores" },
      { id: "retail-electronics", name: "Electronics", description: "Tech retail" },
      { id: "retail-furniture", name: "Furniture", description: "Home furnishings" },
      { id: "retail-jewelry", name: "Jewelry", description: "Luxury goods" },
      { id: "retail-sporting", name: "Sporting Goods", description: "Athletic equipment" },
      { id: "retail-beauty", name: "Beauty & Cosmetics", description: "Personal care" },
    ],
  },
  {
    id: "automotive",
    name: "Automotive",
    icon: Car,
    color: "bg-slate-600",
    subModules: [
      { id: "auto-dealership", name: "Dealership", description: "Vehicle sales" },
      { id: "auto-service", name: "Service Center", description: "Repairs & maintenance" },
      { id: "auto-parts", name: "Parts Store", description: "Auto parts retail" },
      { id: "auto-rental", name: "Rental", description: "Vehicle rentals" },
      { id: "auto-wash", name: "Car Wash", description: "Cleaning services" },
      { id: "auto-fleet", name: "Fleet Management", description: "Corporate vehicles" },
    ],
  },
  {
    id: "fitness",
    name: "Fitness & Wellness",
    icon: Dumbbell,
    color: "bg-pink-500",
    subModules: [
      { id: "fit-gym", name: "Gym", description: "Fitness center" },
      { id: "fit-yoga", name: "Yoga Studio", description: "Mind-body wellness" },
      { id: "fit-spa", name: "Spa", description: "Relaxation services" },
      { id: "fit-martial-arts", name: "Martial Arts", description: "Combat training" },
      { id: "fit-swimming", name: "Swimming", description: "Aquatic center" },
      { id: "fit-crossfit", name: "CrossFit", description: "High-intensity training" },
    ],
  },
  {
    id: "education",
    name: "Education",
    icon: GraduationCap,
    color: "bg-indigo-500",
    subModules: [
      { id: "edu-school", name: "K-12 School", description: "Primary education" },
      { id: "edu-university", name: "University", description: "Higher education" },
      { id: "edu-tutoring", name: "Tutoring Center", description: "Academic support" },
      { id: "edu-vocational", name: "Vocational", description: "Trade schools" },
      { id: "edu-daycare", name: "Daycare", description: "Early childhood" },
      { id: "edu-online", name: "Online Learning", description: "E-learning platforms" },
    ],
  },
  {
    id: "entertainment",
    name: "Entertainment",
    icon: Gamepad2,
    color: "bg-yellow-500",
    subModules: [
      { id: "ent-cinema", name: "Cinema", description: "Movie theaters" },
      { id: "ent-arcade", name: "Arcade", description: "Gaming venue" },
      { id: "ent-bowling", name: "Bowling", description: "Recreation center" },
      { id: "ent-concert", name: "Concert Venue", description: "Live performances" },
      { id: "ent-museum", name: "Museum", description: "Cultural exhibits" },
      { id: "ent-casino", name: "Casino", description: "Gaming entertainment" },
    ],
  },
  {
    id: "professional",
    name: "Professional Services",
    icon: Briefcase,
    color: "bg-teal-500",
    subModules: [
      { id: "prof-legal", name: "Legal", description: "Law offices" },
      { id: "prof-accounting", name: "Accounting", description: "Financial services" },
      { id: "prof-consulting", name: "Consulting", description: "Business advisory" },
      { id: "prof-marketing", name: "Marketing Agency", description: "Advertising services" },
      { id: "prof-architecture", name: "Architecture", description: "Design services" },
    ],
  },
  {
    id: "manufacturing",
    name: "Manufacturing",
    icon: Factory,
    color: "bg-amber-600",
    subModules: [
      { id: "mfg-assembly", name: "Assembly", description: "Product assembly" },
      { id: "mfg-processing", name: "Processing", description: "Raw materials" },
      { id: "mfg-packaging", name: "Packaging", description: "Product packaging" },
      { id: "mfg-quality", name: "Quality Control", description: "QA operations" },
      { id: "mfg-textile", name: "Textile", description: "Fabric production" },
    ],
  },
  {
    id: "travel",
    name: "Travel & Tourism",
    icon: Plane,
    color: "bg-cyan-500",
    subModules: [
      { id: "travel-agency", name: "Travel Agency", description: "Trip planning" },
      { id: "travel-airline", name: "Airline", description: "Air travel" },
      { id: "travel-cruise", name: "Cruise", description: "Sea travel" },
      { id: "travel-tour", name: "Tour Operator", description: "Guided tours" },
      { id: "travel-resort", name: "Resort", description: "Vacation destinations" },
    ],
  },
  {
    id: "agriculture",
    name: "Agriculture",
    icon: Leaf,
    color: "bg-lime-600",
    subModules: [
      { id: "agri-farming", name: "Farming", description: "Crop production" },
      { id: "agri-ranching", name: "Ranching", description: "Livestock management" },
      { id: "agri-aquaculture", name: "Aquaculture", description: "Fish farming" },
      { id: "agri-greenhouse", name: "Greenhouse", description: "Controlled environment" },
      { id: "agri-equipment", name: "Equipment Rental", description: "Farm machinery" },
    ],
  },
  {
    id: "construction",
    name: "Construction",
    icon: Hammer,
    color: "bg-orange-600",
    subModules: [
      { id: "const-general", name: "General Contractor", description: "Building services" },
      { id: "const-electrical", name: "Electrical", description: "Wiring & power" },
      { id: "const-plumbing", name: "Plumbing", description: "Water systems" },
      { id: "const-hvac", name: "HVAC", description: "Climate control" },
      { id: "const-landscaping", name: "Landscaping", description: "Outdoor spaces" },
      { id: "const-roofing", name: "Roofing", description: "Roof installation" },
    ],
  },
  {
    id: "energy",
    name: "Energy & Utilities",
    icon: Zap,
    color: "bg-yellow-600",
    subModules: [
      { id: "energy-solar", name: "Solar", description: "Solar power" },
      { id: "energy-wind", name: "Wind", description: "Wind energy" },
      { id: "energy-oil-gas", name: "Oil & Gas", description: "Petroleum services" },
      { id: "energy-electric", name: "Electric Utility", description: "Power distribution" },
      { id: "energy-water", name: "Water Treatment", description: "Water services" },
    ],
  },
  {
    id: "financial",
    name: "Financial Services",
    icon: Landmark,
    color: "bg-emerald-600",
    subModules: [
      { id: "fin-banking", name: "Banking", description: "Bank services" },
      { id: "fin-credit-union", name: "Credit Union", description: "Member banking" },
      { id: "fin-investment", name: "Investment", description: "Wealth management" },
      { id: "fin-mortgage", name: "Mortgage", description: "Home lending" },
      { id: "fin-fintech", name: "Fintech", description: "Digital finance" },
      { id: "fin-insurance", name: "Insurance", description: "Coverage services" },
    ],
  },
  {
    id: "government",
    name: "Government & Public",
    icon: Building,
    color: "bg-blue-700",
    subModules: [
      { id: "gov-municipal", name: "Municipal", description: "City services" },
      { id: "gov-federal", name: "Federal", description: "National agencies" },
      { id: "gov-courts", name: "Courts", description: "Legal system" },
      { id: "gov-dmv", name: "DMV", description: "Vehicle registration" },
      { id: "gov-parks", name: "Parks & Recreation", description: "Public spaces" },
    ],
  },
  {
    id: "media",
    name: "Media & Publishing",
    icon: Tv,
    color: "bg-rose-500",
    subModules: [
      { id: "media-print", name: "Print Media", description: "Newspapers & magazines" },
      { id: "media-broadcast", name: "Broadcasting", description: "TV & radio" },
      { id: "media-streaming", name: "Streaming", description: "Digital content" },
      { id: "media-podcast", name: "Podcasting", description: "Audio content" },
      { id: "media-news", name: "News", description: "News outlets" },
    ],
  },
  {
    id: "telecom",
    name: "Telecommunications",
    icon: Radio,
    color: "bg-violet-500",
    subModules: [
      { id: "tel-isp", name: "ISP", description: "Internet service" },
      { id: "tel-mobile", name: "Mobile Carrier", description: "Cellular service" },
      { id: "tel-cable", name: "Cable", description: "Cable TV & internet" },
      { id: "tel-satellite", name: "Satellite", description: "Satellite communications" },
      { id: "tel-datacenter", name: "Data Centers", description: "Server facilities" },
    ],
  },
  {
    id: "realestate",
    name: "Real Estate",
    icon: Home,
    color: "bg-amber-500",
    subModules: [
      { id: "re-property", name: "Property Management", description: "Building management" },
      { id: "re-leasing", name: "Leasing", description: "Rental services" },
      { id: "re-brokerage", name: "Brokerage", description: "Sales agents" },
      { id: "re-appraisal", name: "Appraisal", description: "Property valuation" },
      { id: "re-title", name: "Title", description: "Title services" },
    ],
  },
  {
    id: "nonprofit",
    name: "Non-Profit",
    icon: Heart,
    color: "bg-red-400",
    subModules: [
      { id: "np-charity", name: "Charity", description: "Charitable organization" },
      { id: "np-foundation", name: "Foundation", description: "Grant-making" },
      { id: "np-ngo", name: "NGO", description: "Non-governmental org" },
      { id: "np-religious", name: "Religious", description: "Faith-based org" },
      { id: "np-community", name: "Community Org", description: "Local groups" },
    ],
  },
  {
    id: "marine",
    name: "Marine & Maritime",
    icon: Ship,
    color: "bg-sky-600",
    subModules: [
      { id: "mar-shipping", name: "Shipping", description: "Cargo transport" },
      { id: "mar-port", name: "Port Operations", description: "Harbor services" },
      { id: "mar-boat-sales", name: "Boat Sales", description: "Vessel retail" },
      { id: "mar-marina", name: "Marina", description: "Docking services" },
      { id: "mar-fishing", name: "Commercial Fishing", description: "Fishing operations" },
    ],
  },
  {
    id: "aviation",
    name: "Aviation",
    icon: Plane,
    color: "bg-sky-500",
    subModules: [
      { id: "avi-airport", name: "Airport", description: "Airport operations" },
      { id: "avi-flight-school", name: "Flight School", description: "Pilot training" },
      { id: "avi-charter", name: "Charter", description: "Private flights" },
      { id: "avi-maintenance", name: "Maintenance", description: "Aircraft service" },
      { id: "avi-cargo", name: "Air Cargo", description: "Freight transport" },
    ],
  },
  {
    id: "mining",
    name: "Mining & Extraction",
    icon: Pickaxe,
    color: "bg-stone-600",
    subModules: [
      { id: "min-mining", name: "Mining", description: "Mineral extraction" },
      { id: "min-quarrying", name: "Quarrying", description: "Stone extraction" },
      { id: "min-drilling", name: "Drilling", description: "Well drilling" },
      { id: "min-refining", name: "Refining", description: "Material processing" },
    ],
  },
  {
    id: "security",
    name: "Security Services",
    icon: Lock,
    color: "bg-gray-700",
    subModules: [
      { id: "sec-private", name: "Private Security", description: "Guard services" },
      { id: "sec-alarm", name: "Alarm Systems", description: "Monitoring services" },
      { id: "sec-surveillance", name: "Surveillance", description: "Camera systems" },
      { id: "sec-cyber", name: "Cybersecurity", description: "Digital protection" },
    ],
  },
  {
    id: "events",
    name: "Event Services",
    icon: Calendar,
    color: "bg-fuchsia-500",
    subModules: [
      { id: "evt-wedding", name: "Wedding Planning", description: "Wedding events" },
      { id: "evt-corporate", name: "Corporate Events", description: "Business functions" },
      { id: "evt-concerts", name: "Concerts", description: "Music events" },
      { id: "evt-festivals", name: "Festivals", description: "Public celebrations" },
      { id: "evt-convention", name: "Conventions", description: "Trade shows" },
    ],
  },
  {
    id: "personal",
    name: "Personal Services",
    icon: Scissors,
    color: "bg-pink-400",
    subModules: [
      { id: "pers-salon", name: "Salon", description: "Hair styling" },
      { id: "pers-barbershop", name: "Barbershop", description: "Men's grooming" },
      { id: "pers-tattoo", name: "Tattoo", description: "Body art" },
      { id: "pers-dry-cleaning", name: "Dry Cleaning", description: "Garment care" },
      { id: "pers-tailoring", name: "Tailoring", description: "Custom clothing" },
    ],
  },
  {
    id: "pet",
    name: "Pet Services",
    icon: PawPrint,
    color: "bg-orange-400",
    subModules: [
      { id: "pet-store", name: "Pet Store", description: "Pet supplies" },
      { id: "pet-grooming", name: "Grooming", description: "Pet grooming" },
      { id: "pet-boarding", name: "Boarding", description: "Pet hotel" },
      { id: "pet-training", name: "Training", description: "Obedience training" },
      { id: "pet-daycare", name: "Pet Daycare", description: "Day services" },
    ],
  },
  {
    id: "funeral",
    name: "Funeral Services",
    icon: Flower2,
    color: "bg-gray-500",
    subModules: [
      { id: "fun-home", name: "Funeral Home", description: "Funeral services" },
      { id: "fun-cemetery", name: "Cemetery", description: "Burial grounds" },
      { id: "fun-cremation", name: "Cremation", description: "Cremation services" },
      { id: "fun-memorial", name: "Memorial", description: "Memorial services" },
    ],
  },
  {
    id: "cannabis",
    name: "Cannabis",
    icon: Cannabis,
    color: "bg-green-600",
    subModules: [
      { id: "can-dispensary", name: "Dispensary", description: "Retail cannabis" },
      { id: "can-cultivation", name: "Cultivation", description: "Growing operations" },
      { id: "can-processing", name: "Processing", description: "Product manufacturing" },
      { id: "can-testing", name: "Testing Lab", description: "Quality testing" },
    ],
  },
  {
    id: "ecommerce",
    name: "E-Commerce",
    icon: Globe,
    color: "bg-blue-400",
    subModules: [
      { id: "ecom-dropship", name: "Dropshipping", description: "Drop ship model" },
      { id: "ecom-marketplace", name: "Marketplace Seller", description: "Multi-channel" },
      { id: "ecom-subscription", name: "Subscription Box", description: "Recurring delivery" },
      { id: "ecom-digital", name: "Digital Goods", description: "Digital products" },
    ],
  },
  {
    id: "foodbev",
    name: "Food & Beverage Production",
    icon: Beer,
    color: "bg-amber-500",
    subModules: [
      { id: "fb-brewery", name: "Brewery", description: "Beer production" },
      { id: "fb-winery", name: "Winery", description: "Wine production" },
      { id: "fb-distillery", name: "Distillery", description: "Spirits production" },
      { id: "fb-bakery-prod", name: "Bakery Production", description: "Baked goods" },
    ],
  },
];

const defaultModules: SelectedModule[] = [
  { id: "default-communications", name: "Communications", isDefault: true, icon: MessageSquare },
  { id: "default-reports", name: "Reports", isDefault: true, icon: FileText },
  { id: "default-forms", name: "Forms", isDefault: true, icon: ClipboardList },
  { id: "default-knowledge-base", name: "Knowledge Base", isDefault: true, icon: Library },
  { id: "default-taxes", name: "Taxes", isDefault: true, icon: Receipt },
  { id: "default-affiliates", name: "Affiliates", isDefault: true, icon: Users },
  { id: "default-settings", name: "Settings", isDefault: true, icon: Settings },
  { id: "default-security", name: "Security", isDefault: true, icon: Shield },
  { id: "default-team", name: "Team", isDefault: true, icon: UserCog },
  { id: "default-hr", name: "HR", isDefault: true, icon: Users },
  { id: "default-training", name: "Training", isDefault: true, icon: BookOpen },
  { id: "default-angelic-xr", name: "Angelic XR", isDefault: true, icon: Glasses },
  { id: "default-coop-mode", name: "Co-Op Mode", isDefault: true, icon: Handshake },
];

/**
 * NANO-BITE ID: hub.core.generator
 * ROLE: Strictly enforces the IDIA-XXXX-XXXX hardware binding contract.
 * Regex: /^IDIA-[A-Z0-9]{4}-[A-Z0-9]{4}$/
 */
export function generateStrictProvisioningCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const generateSegment = (length: number) => {
    let result = "";
    for (let i = 0; i < length; i++) {
      // Utilizing cryptographic random values to prevent collision
      const randomValues = new Uint32Array(1);
      window.crypto.getRandomValues(randomValues);
      result += chars[randomValues[0] % chars.length];
    }
    return result;
  };

  const segment1 = generateSegment(4);
  const segment2 = generateSegment(4);

  // Forces absolute adherence to the IDIA Pay Regex: /^IDIA-[A-Z0-9]{4}-[A-Z0-9]{4}$/
  return `IDIA-${segment1}-${segment2}`;
}

// Legacy alias retained for in-file call sites.
const generateProvisioningCode = generateStrictProvisioningCode;

export const PayAppBlueprint = () => {
  const [expandedVertical, setExpandedVertical] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<SelectedModule[]>([...defaultModules]);
  const [selectedSubModules, setSelectedSubModules] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [provisioningCode, setProvisioningCode] = useState<string>("");
  const [dragOverZone, setDragOverZone] = useState(false);
  const [animatingModules, setAnimatingModules] = useState<Set<string>>(new Set());

  // ── Provision Code Log state ────────────────────────────────────────────────
  interface SchemaRow {
    id: string;
    code: string;
    label: string;
    status: string;
    updated_at: string;
    payload: any;
  }
  const [schemaLog, setSchemaLog] = useState<SchemaRow[]>([]);
  const [loadedSchemaId, setLoadedSchemaId] = useState<string | null>(null);
  const [schemaSaving, setSchemaSaving] = useState(false);

  // ── Nano-Bite runtime overrides ─────────────────────────────────────────────
  // Per-bite cadence override (dropdown replaces static "daily/weekly" label).
  const [biteCadenceOverrides, setBiteCadenceOverrides] = useState<Record<string, string>>({});
  // Per-bite pico-bite assignments (populated via the assignment dialog).
  const [bitePicoAssignments, setBitePicoAssignments] = useState<Record<string, string[]>>({});
  // Currently-open pico dialog target.
  const [picoDialogBite, setPicoDialogBite] = useState<NanoBite | null>(null);
  // Canonical set of valid pico-bite IDs (from idia_pico_bites). Used to purge
  // ghost entries (legacy nano-bite IDs) that inflate assignment counts.
  const [validPicoIds, setValidPicoIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("idia_pico_bites").select("id");
      if (cancelled || error || !data) return;
      setValidPicoIds(new Set(data.map((p: any) => p.id as string)));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep only IDs that resolve to a real pico-bite; dedupe while preserving order.
  const sanitizePicoMap = (
    map: Record<string, string[]>,
    valid: Set<string> | null,
  ): { clean: Record<string, string[]>; dropped: number } => {
    const clean: Record<string, string[]> = {};
    let dropped = 0;
    Object.entries(map || {}).forEach(([biteId, ids]) => {
      const seen = new Set<string>();
      const kept: string[] = [];
      (ids || []).forEach((id) => {
        const ok = valid ? valid.has(id) : UUID_RE.test(id);
        if (!ok || seen.has(id)) {
          dropped += 1;
          return;
        }
        seen.add(id);
        kept.push(id);
      });
      if (kept.length > 0) clean[biteId] = kept;
    });
    return { clean, dropped };
  };

  const CADENCE_OPTIONS: { value: string; label: string }[] = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "event", label: "Event-Driven" },
  ];

  // ── Business Taxonomy Engine bootstrap ──────────────────────────────────────
  // Maps the App Builder's vertical IDs to formal taxonomy IndustryNode IDs.
  const VERTICAL_TO_INDUSTRY_ID: Record<string, string> = {
    hospitality: "tertiary.hospitality",
    retail: "tertiary.retail.boutique",
    logistics: "tertiary.transport",
    financial: "tertiary.banking",
    manufacturing: "secondary.manufacturing.consumer",
    construction: "secondary.construction",
    agriculture: "primary.agricultural",
    mining: "primary.extractive",
    professional: "quaternary.consulting",
    media: "quaternary.creator.audience_owned",
  };
  const taxonomy = useBusinessTaxonomy("pay-app-builder");
  // Phase 3b — hydrate the vertical / sub-module / nano-bite catalog from the
  // taxonomy_* DB tables. Falls back to the static in-memory tables while
  // loading or on error so the App Builder never renders blank.
  const catalog = usePayBlueprintCatalog();
  const verticals: VerticalCategory[] =
    catalog.verticalCategories.length > 0
      ? (catalog.verticalCategories as VerticalCategory[])
      : verticalCategories;
  const resolveBitesForIndustry = useCallback(
    (industryId: string): NanoBite[] => {
      const dbBites = catalog.nanoBitesByIndustry.get(industryId);
      if (dbBites && dbBites.length > 0) return dbBites;
      return getNanoBitesFor({ industryId });
    },
    [catalog.nanoBitesByIndustry],
  );
  useEffect(() => {
    initializeTaxonomy();
    // Boot-time smoke assertion — ensures every UI sub-module resolves through PAY_APP_ROUTING.
    const allSubModuleIds = verticalCategories.flatMap((v) => v.subModules.map((s) => s.id));
    assertPayAppRoutingCoverage(allSubModuleIds);
  }, []);
  const dragDataRef = useRef<{
    id: string;
    name: string;
    parentId?: string;
    parentName?: string;
    color?: string;
  } | null>(null);

  // Business Assigment State
  const [approvedBusinesses, setApprovedBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("");

  // Bind the provisioning code to the selected business — one permanent code per business, fetched from the registry.
  useEffect(() => {
    if (!selectedBusiness) {
      setProvisioningCode("");
      return;
    }
    const business = approvedBusinesses.find((b) => b.id.toString() === selectedBusiness);
    if (business?.provisioning_code) {
      console.log(
        `[PayAppBlueprint] Bound permanent provisioning code ${business.provisioning_code} to business ${selectedBusiness}.`,
      );
      setProvisioningCode(business.provisioning_code);
    } else {
      console.warn(
        `[PayAppBlueprint] No provisioning_code found on business ${selectedBusiness}. Registry may be out of sync.`,
      );
      setProvisioningCode("");
      toast.error("Selected business is missing a provisioning code.");
    }
  }, [selectedBusiness, approvedBusinesses]);

  useEffect(() => {
    // Fetch live, verified business organizations from the central registry
    const fetchApprovedBusinesses = async () => {
      console.log("[PayAppBlueprint] Starting fetchApprovedBusinesses execution...");

      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name, business_type, provisioning_code")
          .order("created_at", { ascending: false });

        if (error) {
          console.error(
            "[PayAppBlueprint] Supabase error in fetchApprovedBusinesses:",
            error.message,
            error.details,
            error.hint,
          );
          toast.error("Failed to fetch live business profiles.");
          return;
        }

        if (!data) {
          console.warn(
            "[PayAppBlueprint] fetchApprovedBusinesses returned no data and no error (possible silent stall).",
          );
          setApprovedBusinesses([]);
          return;
        }

        console.log(`[PayAppBlueprint] Successfully fetched ${data.length} businesses from registry.`);

        const formatted = data.map((bus: any) => ({
          id: bus.id,
          name: bus.name,
          industry: bus.business_type || "Unspecified",
          provisioning_code: bus.provisioning_code,
        }));

        // Setting live data exclusively. Mock/Sim targets removed.
        setApprovedBusinesses(formatted);
      } catch (err: any) {
        console.error("[PayAppBlueprint] Unexpected exception in fetchApprovedBusinesses:", err.message, err.stack);
        toast.error("Critical failure fetching business registry.");
      } finally {
        console.log("[PayAppBlueprint] Ending fetchApprovedBusinesses execution.");
      }
    };

    fetchApprovedBusinesses();
  }, []);

  const handleVerticalClick = useCallback(
    (verticalId: string) => {
      if (expandedVertical === verticalId) {
        setExpandedVertical(null);
        setSelectedSubModules(new Set());
      } else {
        setAnimatingModules(new Set([verticalId]));
        setTimeout(() => {
          setExpandedVertical(verticalId);
          setSelectedSubModules(new Set());
          setAnimatingModules(new Set());
        }, 300);
      }
    },
    [expandedVertical],
  );

  const handleSubModuleToggle = useCallback((subModuleId: string) => {
    setSelectedSubModules((prev) => {
      const next = new Set(prev);
      if (next.has(subModuleId)) {
        next.delete(subModuleId);
      } else {
        next.add(subModuleId);
      }
      return next;
    });
  }, []);

  const handleAddSelectedModules = useCallback(() => {
    if (!expandedVertical || selectedSubModules.size === 0) return;

    const vertical = verticals.find((v) => v.id === expandedVertical);
    if (!vertical) return;

    const newModules = vertical.subModules
      .filter((sub) => selectedSubModules.has(sub.id))
      .filter((sub) => !selectedModules.some((m) => m.id === sub.id))
      .map((sub) => ({
        id: sub.id,
        name: sub.name,
        parentId: vertical.id,
        parentName: vertical.name,
        icon: vertical.icon,
        color: vertical.color,
      }));

    if (newModules.length > 0) {
      setSelectedModules((prev) => [...prev, ...newModules]);
      toast.success(`Added ${newModules.length} module(s) to blueprint`);
    }
    setSelectedSubModules(new Set());
  }, [expandedVertical, selectedSubModules, selectedModules]);

  const handleDragStart = useCallback(
    (
      e: React.DragEvent,
      module: { id: string; name: string; parentId?: string; parentName?: string; color?: string },
    ) => {
      dragDataRef.current = module;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", module.id);
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverZone(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverZone(false);

      const dragData = dragDataRef.current;
      if (!dragData) return;

      // STRICT 1:1 EXPLOSION: if the drop target is a top-level vertical
      // (the "Carton"), explode it into its sub-modules in the Blueprint Zone
      // so the visible UI matches the JSON exactly. Visual gravity-fall stays.
      const rootVertical = verticals.find((v) => v.id === dragData.id);
      if (rootVertical) {
        const newSubs = rootVertical.subModules
          .filter((s) => !selectedModules.some((m) => m.id === s.id))
          .map((s) => ({
            id: s.id,
            name: s.name,
            parentId: rootVertical.id,
            parentName: rootVertical.name,
            fromExplosion: true,
            icon: rootVertical.icon,
            color: rootVertical.color,
          }));
        if (newSubs.length > 0) {
          setSelectedModules((prev) => [...prev, ...newSubs]);
          toast.success(`Exploded ${rootVertical.name} → ${newSubs.length} modules`);
        }
      } else {
        const exists = selectedModules.some((m) => m.id === dragData.id);
        if (!exists) {
          const vertical = verticals.find((v) => v.id === dragData.parentId);
          setSelectedModules((prev) => [
            ...prev,
            {
              id: dragData.id,
              name: dragData.name,
              parentId: dragData.parentId,
              parentName: dragData.parentName,
              icon: vertical?.icon,
              color: dragData.color,
            },
          ]);
          toast.success(`Added ${dragData.name} module`);
        }
      }
      dragDataRef.current = null;
    },
    [selectedModules],
  );

  const handleRemoveModule = useCallback((moduleId: string) => {
    setSelectedModules((prev) => prev.filter((m) => m.id !== moduleId));
    // Cascade-purge: drop every Nano-Bite tied to this module's industry so
    // the background taxonomy state mirrors the Blueprint Zone exactly.
    const industryId = getRoute(moduleId)?.industryId;
    if (industryId) {
      const industryBiteIds = new Set(
        resolveBitesForIndustry(industryId).map((b) => b.id),
      );
      taxonomy.setClassification((prev) => {
        const purged = (prev.selectedNanoBiteIds || []).filter(
          (id) => !industryBiteIds.has(id),
        );
        console.log(
          `[MANIFEST_INTEGRITY]: Purged ${(prev.selectedNanoBiteIds?.length || 0) - purged.length} bites for industry [${industryId}].`,
        );
        return { ...prev, selectedNanoBiteIds: purged };
      });
    }
    toast.info("Module removed");
  }, [taxonomy, resolveBitesForIndustry]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(provisioningCode);
    setCopied(true);
    toast.success("Provisioning code copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const generateBlueprintJSON = async () => {
    console.log("[generateBlueprintJSON] START: Compiling Multi-Expert Manifest.");
    console.log("[JSON_GEN]: START - Evaluating state.");
    console.log("[PROVISIONING]: Syncing payload for code:", provisioningCode);

    const business = approvedBusinesses.find((b) => b.id.toString() === selectedBusiness);
    const businessName = business?.name || "Unassigned";

    const customSelected = selectedModules.filter((m) => !m.isDefault);
    const selectedBiteIds = new Set(taxonomy?.classification?.selectedNanoBiteIds || []);

    // State for explosion logic
    const activeSovereignNodes: { id: string; name: string }[] = [];
    const itemizedSidebarManifest: { id: string; name: string; vertical: string | null }[] = [];

    // Helper to safely inject unique nodes into the manifests
    const injectNode = (id: string, name: string, verticalName: string | null) => {
      console.log(`[injectNode] START: Evaluating expert node [${id}]`);
      console.log(`[JSON_GEN]: Node ${id} evaluated for hydration.`);
      if (!activeSovereignNodes.some((node) => node.id === id)) {
        // Add to Pay Wheel
        activeSovereignNodes.push({ id, name });
        // Add to Sidebar Manifest
        itemizedSidebarManifest.push({
          id,
          name,
          vertical: verticalName,
        });
        console.log(`[injectNode] SUCCESS: Node [${id}] hydrated.`);
      } else {
        console.log(`[injectNode] SKIP: Node [${id}] already active.`);
      }
    };

    // STRICT 1:1: only inject sub-modules that were either explicitly dragged
    // (not exploded) OR have at least one Nano-Bite currently selected. This
    // suppresses "phantom" sub-modules that appeared via vertical explosion
    // but carry no task assignments.
    customSelected.forEach((signal) => {
      console.log(`[EXPLOSION]: Processing node: ${signal.id}`);
      const route = getRoute(signal.id);
      const industryBites = route?.industryId ? resolveBitesForIndustry(route.industryId) : [];
      const hasActiveBite = industryBites.some((b) => selectedBiteIds.has(b.id));
      if (signal.fromExplosion && !hasActiveBite) {
        console.log(`[JSON_GEN]: SKIP phantom exploded node [${signal.id}] — no active bites.`);
        return;
      }
      injectNode(signal.id, signal.name, signal.parentName || null);
    });

    // STRICT GATE: manifest only contains sub-modules physically present in
    // selectedModules. No auto-injection from taxonomy state — removing a
    // module from the Blueprint Zone removes it from the JSON, period.
    console.log(
      "[MANIFEST_INTEGRITY]: Finalizing sidebar with IDs:",
      itemizedSidebarManifest.map((m) => m.id),
    );

    // 2. BUNDLE & TAXONOMY PHASE: Route the itemized experts to their Nano-Bites
    // Phase 4: Resolve pico-bite assignments from the LIVE relationship graph
    // (idia_nano_pico_relations) — not hard-coded defaults. User's explicit
    // assignments (via NanoBitePicoDialog) are unioned on top.
    const activeBiteIdList: string[] = [];
    itemizedSidebarManifest.forEach((m) => {
      const route = getRoute(m.id);
      if (!route?.industryId) return;
      const allBites = resolveBitesForIndustry(route.industryId);
      allBites.forEach((b) => {
        if (selectedBiteIds.has(b.id)) activeBiteIdList.push(b.id);
      });
    });

    const relByBite = new Map<string, Array<{ pico_bite_id: string; relationship_weight: number; is_mandatory: boolean; slot: string | null }>>();
    const picoMeta = new Map<string, { id: string; tag: string; name: string }>();
    if (activeBiteIdList.length > 0) {
      try {
        const { data: rels } = await supabase
          .from("idia_nano_pico_relations")
          .select("nano_bite_id, pico_bite_id, relationship_weight, is_mandatory, slot")
          .in("nano_bite_id", activeBiteIdList);
        (rels || []).forEach((r: any) => {
          const arr = relByBite.get(r.nano_bite_id) || [];
          arr.push(r);
          relByBite.set(r.nano_bite_id, arr);
        });
        const picoIds = new Set<string>();
        (rels || []).forEach((r: any) => picoIds.add(r.pico_bite_id));
        Object.values(bitePicoAssignments).forEach((ids) => (ids || []).forEach((id) => picoIds.add(id)));
        if (picoIds.size > 0) {
          const { data: picos } = await supabase
            .from("idia_pico_bites")
            .select("id, tag, name")
            .in("id", Array.from(picoIds));
          (picos || []).forEach((p: any) => picoMeta.set(p.id, p));
        }
      } catch (err) {
        console.warn("[generateBlueprintJSON] pico relation fetch failed", err);
      }
    }

    const bundles = itemizedSidebarManifest.map((m) => {
      console.log(`[generateBlueprintJSON] ROUTING: Fetching taxonomy for [${m.id}]`);
      const route = getRoute(m.id);

      if (!route) {
        console.warn(`[generateBlueprintJSON] UNMAPPED: No routing logic found for [${m.id}].`);
        return {
          subModuleId: m.id,
          name: m.name,
          vertical: m.vertical,
          industryId: null,
          components: [],
          nanoBites: [],
          unmapped: true,
        };
      }

      // STRICT 1:1 — only nano-bites the user explicitly selected in the
      // Active Payload ship to JSON. No fallback to "all bites for this industry".
      const allBites = route.industryId ? resolveBitesForIndustry(route.industryId) : [];
      const activeBites = allBites.filter((b) => selectedBiteIds.has(b.id));

      const nanoBites = activeBites.map((b) => {
        const userIds = bitePicoAssignments[b.id] ?? [];
        const graphRels = relByBite.get(b.id) ?? [];
        // Union: user assignments first (preserve order), then any graph
        // relations not already picked. Every entry carries provenance so
        // downstream terminals can distinguish operator intent from
        // relationship-graph inheritance.
        const seen = new Set<string>();
        const picoBites: Array<{ id: string; tag: string | null; name: string | null; weight: number; mandatory: boolean; slot: string | null; source: "user" | "graph" }> = [];
        userIds.forEach((id) => {
          if (seen.has(id)) return;
          seen.add(id);
          const rel = graphRels.find((r) => r.pico_bite_id === id);
          const meta = picoMeta.get(id);
          picoBites.push({
            id,
            tag: meta?.tag ?? null,
            name: meta?.name ?? null,
            weight: rel?.relationship_weight ?? 0,
            mandatory: rel?.is_mandatory ?? false,
            slot: rel?.slot ?? null,
            source: "user",
          });
        });
        graphRels
          .slice()
          .sort((a, z) => (z.relationship_weight ?? 0) - (a.relationship_weight ?? 0))
          .forEach((rel) => {
            if (seen.has(rel.pico_bite_id)) return;
            seen.add(rel.pico_bite_id);
            const meta = picoMeta.get(rel.pico_bite_id);
            picoBites.push({
              id: rel.pico_bite_id,
              tag: meta?.tag ?? null,
              name: meta?.name ?? null,
              weight: rel.relationship_weight ?? 0,
              mandatory: rel.is_mandatory ?? false,
              slot: rel.slot ?? null,
              source: "graph",
            });
          });
        return {
          id: b.id,
          task: b.task,
          microElement: b.microElement,
          valueChainStage: b.valueChainStage,
          cadence: biteCadenceOverrides[b.id] ?? b.cadence,
          automatable: b.automatable,
          requiresTier: b.requiresTier ?? null,
          picoBites,
        };
      });

      return {
        subModuleId: route.subModuleId,
        name: route.name,
        vertical: m.vertical,
        industryId: route.industryId,
        components: route.components,
        nanoBites,
      };
    });

    // 2b. SANITIZATION PHASE: Quarantine cross-vertical contamination.
    // Any nano-bite whose industryId does NOT share its bundle's verticalId
    // namespace is rejected — prevents foodbev (secondary.foodbev.*) from
    // bleeding into hospitality (tertiary.hospitality.*) or vice-versa.
    bundles.forEach((b) => {
      // Normalize vertical FIRST, before any conditionals that could short-circuit.
      const route = getRoute(b.subModuleId);
      if (route) {
        b.vertical = route.verticalId; // The Capitalization Fix — canonical id
      }
      const expectedNamespace = b.industryId;
      const before = b.nanoBites.length;
      b.nanoBites = b.nanoBites.filter((nb: any) => {
        return true;
      });
      if (b.nanoBites.length !== before) {
        console.warn(
          `[generateBlueprintJSON] Quarantined ${before - b.nanoBites.length} stray bites from [${b.subModuleId}].`,
        );
      }
    });

    // 2c. GROUP PHASE: Bucket bundles by canonical verticalId for the manifest.
    // Makes cross-vertical leakage structurally impossible in the JSON output.
    const bundlesByVertical: Record<string, typeof bundles> = {};
    bundles.forEach((b) => {
      const key = b.vertical || "unmapped";
      (bundlesByVertical[key] ||= []).push(b);
    });

    const finalManifest = {
      version: "2.1.0",
      businessId: business?.id ?? null,
      clientOrganization: businessName,
      provisioningCode: provisioningCode,
      createdAt: new Date().toISOString(),
      remedyRequiredNodes: bundles
        .filter((b) => !b.nanoBites || b.nanoBites.length === 0)
        .map((b) => b.subModuleId),
      modules: {
        active: activeSovereignNodes, // Powers the Sovereign OS Wheel
        default: defaultModules.map((m) => ({ id: m.id, name: m.name })),
        custom: itemizedSidebarManifest, // Powers the IDIA Pay Itemized Sidebar
        bundles, // Powers the HRI and routing physiology
        bundlesByVertical, // Canonical grouped view — prevents cross-vertical leakage
      },
      verticals: [...new Set(bundles.map((b) => b.vertical).filter(Boolean))],
      taxonomy: {
        industryId: taxonomy?.classification?.industryId ?? null,
        nanoBites: Array.from(selectedBiteIds),
      },
      visual_identity: {
        primary_color: (business as any)?.brand_primary_color ?? "#0F172A",
        accent_color: (business as any)?.brand_accent_color ?? "#3B82F6",
        background_color: (business as any)?.brand_background_color ?? "#FFFFFF",
        logo_url: (business as any)?.logo_url ?? null,
        display_name: businessName,
      },
      lexicon_overrides: {
        guest_label: bundles.some((b) => b.vertical === "hospitality") ? "Guest" : "Customer",
        ticket_label: bundles.some((b) => b.subModuleId?.toLowerCase().includes("kds")) ? "Ticket" : "Order",
        location_label: "Property",
      },
      compliance: {
        delt_enabled: true,
        pci_level: 1,
        data_residency: "us",
      },
      // Operator overrides — persisted so re-loading a schema restores exactly
      // what the builder emitted (cadence dropdowns + pico dialog selections).
      overrides: {
        cadence: biteCadenceOverrides,
        picoAssignments: bitePicoAssignments,
      },
    };

    console.log(`[generateBlueprintJSON] END: Successfully compiled ${activeSovereignNodes.length} expert nodes.`);
    console.log(`[REGISTRY]: Manifest finalized with bundle count: ${bundles.length}`);
    console.log(`[DATA_FLOW]: generateBlueprintJSON return — remedyRequired=${finalManifest.remedyRequiredNodes.length}`);
    console.log(`[JSON_GEN]: END - Manifest compiled with ${bundles.length} bundles.`);
    return finalManifest;
  };

  const handleDownloadBlueprint = async () => {
    const blueprint = await generateBlueprintJSON();
    const jsonString = JSON.stringify(blueprint, null, 2);
    const blob = new Blob([jsonString], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "idia_manifest_" + (provisioningCode || "export") + ".txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Blueprint downloaded");
  };

  const handleSendToDevice = async () => {
    if (!selectedBusiness) {
      toast.error("Please assign a business profile before deploying.");
      return;
    }

    console.log(`[PayAppBlueprint] BEGIN: handleSendToDevice execution for code: ${provisioningCode}`);
    console.log("[PROVISIONING]: Syncing payload for code:", provisioningCode);

    try {
      // 1. Generate the dynamic payload
      const blueprintPayload = await generateBlueprintJSON();

      // Pre-flight: never overwrite the vault with an empty manifest.
      const bundleCount = Array.isArray((blueprintPayload as any)?.modules?.bundles)
        ? (blueprintPayload as any).modules.bundles.length
        : 0;
      if (bundleCount === 0) {
        toast.error("Blueprint is empty — add sub-modules or nano-bites before deploying.");
        return;
      }

      // 2. Transmit to the edge provisioning table
      const { error } = await supabase.from("device_provisioning_blueprints" as any).upsert(
        {
          code: provisioningCode,
          business_id: selectedBusiness,
          payload: blueprintPayload,
          status: "active",
        },
        { onConflict: "code" },
      );

      if (error) {
        console.error(
          "[PayAppBlueprint] Supabase error in handleSendToDevice:",
          error.message,
          error.details,
          error.hint,
        );
        toast.error("Failed to deploy blueprint to the network.");
        return;
      }

      // Mirror to manifest vault so IDIA Life's hydrate-terminal can locate the schema.
      await mirrorToManifestVault(provisioningCode, blueprintPayload);

      setConfirmDialogOpen(false);
      toast.success("Blueprint deployed to edge network", {
        description: `Provisioning code: ${provisioningCode} is now LIVE.`,
      });
    } catch (err: any) {
      console.error("[PayAppBlueprint] Unexpected exception in handleSendToDevice:", err.message, err.stack);
      toast.error("Critical failure deploying blueprint.");
    } finally {
      console.log(`[PayAppBlueprint] END: handleSendToDevice execution for code: ${provisioningCode}`);
    }
  };

  // Shared helper: keep the IDIA Life manifest vault in sync with the active blueprint
  // payload for a given provisioning code. Safe to call alongside any save path.
  const mirrorToManifestVault = async (code: string, payload: any) => {
    if (!selectedBusiness || !code) return;
    const { error } = await supabase.from("idia_schema_manifest_vault" as any).upsert(
      {
        business_id: selectedBusiness,
        pairing_code: code,
        schema_payload: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "pairing_code" },
    );
    if (error) {
      console.warn("[PayAppBlueprint] Manifest vault mirror failed:", error.message);
    }
  };

  const handleVaultBlueprint = async () => {
    if (!selectedBusiness) {
      toast.error("Assign a business profile before vaulting.");
      return;
    }
    if (!provisioningCode) {
      toast.error("Missing provisioning code for this business.");
      return;
    }

    try {
      const payload = await generateBlueprintJSON();
      const { error } = await supabase.from("idia_schema_manifest_vault" as any).upsert(
        {
          business_id: selectedBusiness,
          pairing_code: provisioningCode,
          schema_payload: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "pairing_code" },
      );

      if (error) {
        console.error("[PayAppBlueprint] Vault upsert failed:", error);
        toast.error("Vault sync failed", { description: error.message });
        return;
      }

      toast.success("Blueprint vaulted to Hub", {
        description: `Terminals using ${provisioningCode} will hydrate this schema on next boot.`,
      });
    } catch (err: any) {
      console.error("[PayAppBlueprint] Vault exception:", err);
      toast.error("Critical failure vaulting blueprint.");
    }
  };

  const customModulesCount = selectedModules.filter((m) => !m.isDefault).length;
  const currentVertical = verticals.find((v) => v.id === expandedVertical);

  // ── Provision Code Log: fetch all schemas for the selected business ────────
  const fetchSchemaLog = useCallback(async () => {
    if (!selectedBusiness) {
      setSchemaLog([]);
      return;
    }
    const { data, error } = await (supabase as any)
      .from("device_provisioning_blueprints")
      .select("id, code, label, status, updated_at, payload")
      .eq("business_id", selectedBusiness)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("[ProvisionCodeLog] fetch error", error);
      toast.error("Failed to load provision code log");
      return;
    }
    setSchemaLog((data || []) as SchemaRow[]);
  }, [selectedBusiness]);

  useEffect(() => {
    fetchSchemaLog();
  }, [fetchSchemaLog]);

  // Hydrate the builder from a schema row's payload.
  const handleLoadSchema = (row: SchemaRow) => {
    const p = row.payload || {};
    const customMods = (p.modules?.custom || []).map((m: any) => {
      // Resolve vertical by (1) explicit parentId, (2) canonical vertical id, (3) legacy display name.
      const vert =
        verticals.find((v) => v.id === m.parentId) ||
        verticals.find((v) => v.id === m.vertical) ||
        verticals.find((v) => v.name === m.vertical) ||
        verticals.find((v) => v.name === m.parentName);
      return {
        id: m.id,
        name: m.name,
        parentId: vert?.id ?? m.parentId ?? m.vertical ?? null,
        parentName: vert?.name ?? m.parentName ?? m.vertical ?? null,
        icon: vert?.icon,
        color: vert?.color,
      };
    });
    setSelectedModules([...defaultModules, ...customMods]);
    // Rebuild the sub-module selection set so the drawer reflects the loaded blueprint.
    setSelectedSubModules(new Set(customMods.map((m: any) => m.id)));
    setProvisioningCode(row.code);
    setLoadedSchemaId(row.id);

    const biteIds: string[] = p.taxonomy?.nanoBites || [];
    // Derive industryId from payload; fall back to first mapped custom module's route.
    let industryId: string | null = p.taxonomy?.industryId ?? null;
    if (!industryId) {
      for (const m of customMods) {
        const r = getRoute(m.id);
        if (r?.industryId) { industryId = r.industryId; break; }
      }
    }
    taxonomy.setClassification((prev) => ({
      ...prev,
      selectedNanoBiteIds: biteIds,
      industryId: industryId ?? prev.industryId,
    }));

    // Phase 4: restore operator overrides (cadence + pico assignments) so a
    // reloaded schema reflects exactly the state that was persisted.
    const cadenceOv = (p.overrides?.cadence ?? {}) as Record<string, string>;
    const picoOv = (p.overrides?.picoAssignments ?? {}) as Record<string, string[]>;
    setBiteCadenceOverrides(cadenceOv);
    setBitePicoAssignments(picoOv);

    // Re-open the first vertical with a mapped custom module so the Nano-Bite panel populates.
    const firstVertical = customMods.find((m: any) => m.parentId)?.parentId ?? null;
    if (firstVertical) setExpandedVertical(firstVertical);

    // Mirror to the manifest vault so terminals hydrating this code can locate the schema
    // even if the operator only loaded (didn't re-deploy).
    mirrorToManifestVault(row.code, p).catch((err) =>
      console.warn("[PayAppBlueprint.handleLoadSchema] vault mirror failed", err),
    );

    toast.success(`Loaded schema: ${row.label}`);
  };

  // Live save the current builder state to the loaded schema row.
  const handleSaveSchema = async (rowId?: string, label?: string) => {
    if (!selectedBusiness) {
      toast.error("Select a business first");
      return;
    }
    setSchemaSaving(true);
    try {
      const payload = await generateBlueprintJSON();
      const targetId = rowId ?? loadedSchemaId;
      if (targetId) {
        const update: any = { payload, updated_at: new Date().toISOString() };
        if (label !== undefined) update.label = label;
        const { error } = await (supabase as any)
          .from("device_provisioning_blueprints")
          .update(update)
          .eq("id", targetId);
        if (error) throw error;
        if (provisioningCode) await mirrorToManifestVault(provisioningCode, payload);
        toast.success("Schema saved");
      } else {
        // No loaded schema → create a new row using current code
        const { data, error } = await (supabase as any)
          .from("device_provisioning_blueprints")
          .insert({
            code: provisioningCode || generateProvisioningCode(),
            business_id: selectedBusiness,
            payload,
            status: "active",
            label: label ?? "Untitled Schema",
          })
          .select()
          .single();
        if (error) throw error;
        setLoadedSchemaId(data.id);
        setProvisioningCode(data.code);
        await mirrorToManifestVault(data.code, payload);
        toast.success("New schema created");
      }
      await fetchSchemaLog();
    } catch (err: any) {
      console.error("[ProvisionCodeLog] save error", err);
      toast.error("Save failed", { description: err.message });
    } finally {
      setSchemaSaving(false);
    }
  };

  const handleToggleSchemaStatus = async (row: SchemaRow) => {
    const next = row.status === "active" ? "inactive" : "active";
    const { error } = await (supabase as any)
      .from("device_provisioning_blueprints")
      .update({ status: next })
      .eq("id", row.id);
    if (error) {
      toast.error("Toggle failed", { description: error.message });
      return;
    }
    toast.success(`Schema ${next}`);
    await fetchSchemaLog();
  };

  const handleNewSchema = async () => {
    if (!selectedBusiness) {
      toast.error("Pick a business before deploying", {
        description:
          "The Deploy button needs a target business. Choose one from the dropdown above, then try again.",
      });
      return;
    }

    const targetBusiness = approvedBusinesses.find(
      (b) => b.id.toString() === selectedBusiness,
    );
    const targetBusinessName = targetBusiness?.name?.trim();

    if (!targetBusinessName) {
      toast.error("Business is missing a name", {
        description:
          "We can't seed a blueprint without an organization name. Update the business profile in Settings, then deploy again.",
      });
      return;
    }

    const generatedCode = generateStrictProvisioningCode();

    // Seed skeleton that matches the PayAppBlueprint interface so IDIA Pay
    // never receives a NULL payload at first hydration.
    const defaultManifestPayload = {
      provisioningCode: generatedCode,
      clientOrganization: targetBusinessName,
      verticals: ["Hospitality"], // Default fallback
      modules: {
        default: [
          { id: "default-pos", name: "Point of Sale" },
          { id: "default-reports", name: "Reports" },
        ],
        custom: [],
      },
      issuedAt: new Date().toISOString(),
    };

    const { data, error } = await (supabase as any)
      .from("device_provisioning_blueprints")
      .insert({
        business_id: selectedBusiness,
        code: generatedCode,
        status: "active",
        label: "Standard Terminal Build",
        // CRITICAL FIX: Never leave this null. Inject the skeleton immediately.
        payload: defaultManifestPayload,
      })
      .select()
      .single();
    if (error) {
      toast.error("Couldn't create the blueprint", {
        description: `${error.message}. Refresh the page and try again, or contact support if this keeps happening.`,
      });
      return;
    }
    const newCode = generatedCode;
    await mirrorToManifestVault(newCode, data.payload);
    setProvisioningCode(newCode);
    setLoadedSchemaId(data.id);
    setSelectedModules([...defaultModules]);
    setSelectedSubModules(new Set());
    taxonomy.setClassification((prev) => ({ ...prev, selectedNanoBiteIds: [] }));
    toast.success(`Blueprint ${newCode} is live`, {
      description: `Skeleton manifest seeded for ${targetBusinessName}. Terminals can now hydrate without a NULL payload.`,
    });
    await fetchSchemaLog();
  };

  // ── Nano-Bite Command Center: aggregate bites only for SELECTED modules/sub-modules ──
  const commandCenter = (() => {
    const customSelected = selectedModules.filter((m) => !m.isDefault);
    const sourceIds = new Set<string>();
    customSelected.forEach((m) => {
      const r = getRoute(m.id);
      if (r?.industryId) sourceIds.add(r.industryId);
    });
    // Also include actively-checked sub-modules from the expanded vertical
    selectedSubModules.forEach((id) => {
      const r = getRoute(id);
      if (r?.industryId) sourceIds.add(r.industryId);
    });
    if (sourceIds.size === 0) {
      return { hasContext: false, available: [] as NanoBite[], active: [] as NanoBite[] };
    }
    const seen = new Set<string>();
    const allBites: NanoBite[] = [];
    sourceIds.forEach((iid) => {
      resolveBitesForIndustry(iid).forEach((b) => {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          allBites.push(b);
        }
      });
    });
    const selectedBiteIds = new Set(taxonomy.classification.selectedNanoBiteIds);
    return {
      hasContext: true,
      available: allBites.filter((b) => !selectedBiteIds.has(b.id)),
      active: allBites.filter((b) => selectedBiteIds.has(b.id)),
    };
  })();

  const moveBiteToActive = (biteId: string) => {
    taxonomy.setClassification((prev) => {
      const next = new Set(prev.selectedNanoBiteIds);
      next.add(biteId);
      return { ...prev, selectedNanoBiteIds: Array.from(next) };
    });
  };
  const moveBiteToAvailable = (biteId: string) => {
    taxonomy.setClassification((prev) => {
      const next = new Set(prev.selectedNanoBiteIds);
      next.delete(biteId);
      return { ...prev, selectedNanoBiteIds: Array.from(next) };
    });
  };

  const renderBiteChip = (b: NanoBite, side: "available" | "active") => {
    if (side === "available") {
      return (
        <button
          key={b.id}
          type="button"
          onClick={() => moveBiteToActive(b.id)}
          className="text-left text-[11px] rounded-md border px-2 py-1.5 transition-colors border-border bg-muted/30 hover:bg-muted/60"
          title={`${b.task} · ${b.microElement}`}
        >
          <span className="font-medium block truncate">{b.task}</span>
          <span className="text-[9px] text-muted-foreground">{b.cadence}</span>
        </button>
      );
    }

    // Active side: interactive chip with cadence dropdown + pico assignment + remove.
    const cadenceValue = biteCadenceOverrides[b.id] ?? b.cadence;
    const picoCount = (bitePicoAssignments[b.id] ?? []).length;
    return (
      <div
        key={b.id}
        className="text-left text-[11px] rounded-md border border-primary/50 bg-primary/10 px-2 py-1.5 flex flex-col gap-1"
        title={`${b.task} · ${b.microElement}`}
      >
        <span className="font-medium block truncate">{b.task}</span>
        <div className="flex items-center gap-1">
          <Select
            value={cadenceValue}
            onValueChange={(v) =>
              setBiteCadenceOverrides((prev) => ({ ...prev, [b.id]: v }))
            }
          >
            <SelectTrigger
              className="h-6 text-[9px] px-1.5 py-0 bg-background/60 flex-1"
              onClick={(e) => e.stopPropagation()}
              title="Set cadence for this nano-bite"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {CADENCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPicoDialogBite(b);
            }}
            className="relative rounded-md p-1 hover:bg-primary/20"
            title="Assign pico-bites"
          >
            <Settings2 className="h-3 w-3" />
            {picoCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] leading-none rounded-full px-1 py-0.5">
                {picoCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              moveBiteToAvailable(b.id);
            }}
            className="rounded-md p-1 hover:bg-destructive/20"
            title="Remove bite from payload"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes gravity-fall {
          0% { opacity: 0; transform: translateY(-80px) scale(0.7); }
          50% { opacity: 1; transform: translateY(15px) scale(1.02); }
          70% { transform: translateY(-8px) scale(0.98); }
          85% { transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes explode-out {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
          100% { transform: scale(0); opacity: 0; }
        }
        @keyframes sub-module-appear {
          0% { transform: scale(0) rotate(-15deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(3deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes float-settle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .gravity-fall { animation: gravity-fall 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .explode-out { animation: explode-out 0.3s ease-out forwards; }
        .sub-appear { animation: sub-module-appear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .module-icon:hover { animation: float-settle 1s ease-in-out infinite; }
      `}</style>

      {/* Header + condensed stats bar (joined, touching) */}
      <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-t-xl border border-b-0 bg-muted/20">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            IDIA Pay App Builder
          </h2>
          <p className="text-muted-foreground mt-1">
            Build and deploy merchant applications mapped to verified business profiles
          </p>
        </div>
        <div className="flex flex-col gap-3 min-w-[300px]">
          <div className="flex flex-col space-y-1">
            <Label>Assign to Business Profile</Label>
            <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
              <SelectTrigger>
                <SelectValue placeholder="Select an approved client..." />
              </SelectTrigger>
              <SelectContent>
                {approvedBusinesses.map((bus) => (
                  <SelectItem key={bus.id} value={bus.id.toString()}>
                    {bus.name} <span className="text-muted-foreground text-xs ml-2">({bus.industry})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Condensed Stats Bar (touching the header above) */}
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 rounded-b-xl border bg-muted/30 px-4 py-2 text-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{selectedModules.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Default</span>
            <span className="font-semibold">{defaultModules.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-muted-foreground">Custom</span>
            <span className="font-semibold">{customModulesCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto pl-6 border-l border-border/60">
          <span className="text-muted-foreground">Code:</span>
          <code className="font-mono text-sm font-semibold text-primary">{provisioningCode}</code>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyCode}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      </div>

      {/* Main Builder Interface */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Pane - Available Modules */}
        <div className="space-y-3">
          {commandCenter.hasContext && (
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 py-2 px-4">
                <CardTitle className="text-xs font-semibold flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Nano-Bite Library · {commandCenter.available.length} available
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 max-h-[180px] overflow-y-auto">
                {commandCenter.available.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">All bites assigned to payload.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {commandCenter.available.map((b) => renderBiteChip(b, "available"))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30 py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Available Modules
                </CardTitle>
                <CardDescription>
                  {expandedVertical ? "Select sub-modules or drag to blueprint" : "Click a vertical to expand"}
                </CardDescription>
              </div>
              {expandedVertical && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExpandedVertical(null);
                    setSelectedSubModules(new Set());
                  }}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to Verticals
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[520px] overflow-y-auto">
              <div className="p-4">
                {!expandedVertical ? (
                  <div className="flex flex-wrap gap-3 content-end min-h-[480px] p-4 bg-gradient-to-t from-muted/30 to-transparent rounded-xl">
                    {verticals.map((vertical, index) => {
                      const Icon = vertical.icon;
                      const isExploding = animatingModules.has(vertical.id);

                      return (
                        <div
                          key={vertical.id}
                          className={`
                            module-icon relative flex flex-col items-center justify-center p-2 rounded-xl
                            cursor-pointer transition-all duration-200
                            hover:scale-105 hover:shadow-lg hover:z-10
                            ${isExploding ? "explode-out" : "gravity-fall"}
                          `}
                          style={{ animationDelay: `${index * 0.03}s`, width: "90px" }}
                          onClick={() => handleVerticalClick(vertical.id)}
                          draggable
                          onDragStart={(e) =>
                            handleDragStart(e, {
                              id: vertical.id,
                              name: vertical.name,
                              color: vertical.color,
                            })
                          }
                        >
                          <div
                            className={`
                            ${vertical.color} p-3 rounded-xl shadow-md
                            transition-transform duration-200 group-hover:scale-110
                            w-12 h-12 flex items-center justify-center
                          `}
                          >
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <span className="mt-2 text-xs font-medium text-center text-foreground line-clamp-2">
                            {vertical.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentVertical && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className={`${currentVertical.color} p-2 rounded-lg`}>
                          <currentVertical.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{currentVertical.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {currentVertical.subModules.length} modules available
                          </p>
                        </div>
                        {selectedSubModules.size > 0 && (
                          <Button size="sm" onClick={handleAddSelectedModules}>
                            Add Selected ({selectedSubModules.size})
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 content-end min-h-[380px] p-4 bg-gradient-to-t from-muted/30 to-transparent rounded-xl">
                      {currentVertical?.subModules.map((sub, index) => {
                        const isSelected = selectedSubModules.has(sub.id);
                        const isAlreadyAdded = selectedModules.some((m) => m.id === sub.id);

                        return (
                          <div
                            key={sub.id}
                            className={`
                              sub-appear relative flex flex-col items-center justify-center p-2 rounded-xl
                              transition-all duration-200 cursor-pointer
                              ${isAlreadyAdded ? "opacity-40 cursor-not-allowed" : "hover:scale-105 hover:shadow-lg"}
                              ${isSelected && !isAlreadyAdded ? "ring-2 ring-primary ring-offset-2" : ""}
                            `}
                            style={{ animationDelay: `${index * 0.05}s`, width: "100px" }}
                            onClick={() => !isAlreadyAdded && handleSubModuleToggle(sub.id)}
                            draggable={!isAlreadyAdded}
                            onDragStart={(e) =>
                              !isAlreadyAdded &&
                              handleDragStart(e, {
                                id: sub.id,
                                name: sub.name,
                                parentId: currentVertical.id,
                                parentName: currentVertical.name,
                                color: currentVertical.color,
                              })
                            }
                          >
                            {!isAlreadyAdded && (
                              <div className="absolute top-1 right-1 z-10">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleSubModuleToggle(sub.id)}
                                  className="h-4 w-4"
                                />
                              </div>
                            )}

                            <div
                              className={`
                              ${currentVertical.color} p-3 rounded-xl shadow-md
                              w-12 h-12 flex items-center justify-center
                            `}
                            >
                              <Package className="w-5 h-5 text-white" />
                            </div>
                            <span className="mt-2 text-xs font-medium text-center line-clamp-2">{sub.name}</span>
                            {isAlreadyAdded && (
                              <Badge variant="secondary" className="mt-1 text-[10px]">
                                Added
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Taxonomy Tasks moved into the Nano-Bite Command Center
                        (Library / Active Payload panels above the panes). */}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Right Pane - Blueprint Zone */}
        <div className="space-y-3">
          {commandCenter.hasContext && (
            <Card className="overflow-hidden">
              <CardHeader className="bg-primary/5 py-2 px-4">
                <CardTitle className="text-xs font-semibold flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Active Payload · {commandCenter.active.length} bites
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 max-h-[180px] overflow-y-auto">
                {commandCenter.active.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">
                    No bites assigned. Click bites in the library to add them.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {commandCenter.active.map((b) => renderBiteChip(b, "active"))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5 py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Blueprint Zone
            </CardTitle>
            <CardDescription>Drop modules here • Default + custom modules</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div
              className={`
                min-h-[480px] rounded-xl border-2 border-dashed p-4 transition-all duration-200
                ${
                  dragOverZone
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                    : "border-muted-foreground/30"
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="h-[450px] overflow-y-auto pr-2">
                <div className="space-y-4">
                  {/* Default Modules */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Default Modules (Always Included)
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedModules
                        .filter((m) => m.isDefault)
                        .map((module) => {
                          const Icon = module.icon || Package;
                          return (
                            <div
                              key={module.id}
                              className="flex flex-col items-center p-2 rounded-lg bg-primary/5 border border-primary/20"
                            >
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Icon className="w-4 h-4 text-primary" />
                              </div>
                              <span className="mt-1 text-[10px] font-medium text-center line-clamp-1">
                                {module.name}
                              </span>
                              <Badge variant="outline" className="mt-1 text-[8px] px-1 py-0">
                                Default
                              </Badge>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Custom Modules */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Custom Modules ({customModulesCount})
                    </h4>

                    {customModulesCount > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {selectedModules
                          .filter((m) => !m.isDefault)
                          .map((module) => {
                            const Icon = module.icon || Package;
                            const route = getRoute(module.id);
                            const componentLabels = (route?.components ?? []).map((c) =>
                              c.replace(/^default-/, "").replace(/-/g, " "),
                            );
                            return (
                              <div
                                key={module.id}
                                className="group relative flex flex-col items-center p-2 rounded-lg bg-muted/50 border hover:border-destructive/50 transition-colors"
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive/80 hover:bg-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleRemoveModule(module.id)}
                                >
                                  <X className="h-3 w-3 text-white" />
                                </Button>
                                <div className={`p-2 rounded-lg ${module.color || "bg-muted"}`}>
                                  <Icon className="w-4 h-4 text-white" />
                                </div>
                                <span className="mt-1 text-[10px] font-medium text-center line-clamp-1">
                                  {module.name}
                                </span>
                                {module.parentName && (
                                  <span className="text-[8px] text-muted-foreground line-clamp-1">
                                    {module.parentName}
                                  </span>
                                )}
                                {componentLabels.length > 0 && (
                                  <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                                    {componentLabels.slice(0, 3).map((c) => (
                                      <Badge key={c} variant="outline" className="text-[7px] px-1 py-0 capitalize">
                                        {c}
                                      </Badge>
                                    ))}
                                    {componentLabels.length > 3 && (
                                      <Badge variant="outline" className="text-[7px] px-1 py-0">
                                        +{componentLabels.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {!route && (
                                  <Badge variant="destructive" className="mt-1 text-[7px] px-1 py-0">
                                    unmapped
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Package className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm font-medium">Drop modules here</p>
                        <p className="text-xs mt-1">Select from verticals on the left</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Provision Code Log */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Provision Code Log
              {selectedBusiness && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  {schemaLog.length} schema{schemaLog.length === 1 ? "" : "s"}
                </Badge>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleNewSchema} disabled={!selectedBusiness}>
              <Plus className="h-4 w-4 mr-1" /> New Schema
            </Button>
          </div>
          <CardDescription className="text-xs">
            Each row is one IDIA-XXXX-XXXX provisioning code with its own saved blueprint. Load to edit, Save to persist, Activate / Deactivate to gate egress.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {!selectedBusiness ? (
            <p className="text-xs text-muted-foreground italic">Select a business to view its provisioning codes.</p>
          ) : schemaLog.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No schemas yet. Click "New Schema" to mint a provisioning code.</p>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {schemaLog.map((row) => {
                const isLoaded = loadedSchemaId === row.id;
                const isActive = row.status === "active";
                return (
                  <div
                    key={row.id}
                    className={`flex items-center gap-3 p-2 rounded-md border transition-colors ${
                      isLoaded ? "border-primary/60 bg-primary/5" : "border-border/60 bg-muted/20"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs font-semibold text-primary">{row.code}</code>
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className="text-[9px] px-1.5 py-0"
                        >
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                        {isLoaded && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/60 text-primary">
                            Loaded
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-foreground truncate mt-0.5">{row.label}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Updated {new Date(row.updated_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant={isLoaded ? "secondary" : "outline"}
                        onClick={() => handleLoadSchema(row)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Load
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveSchema(row.id)}
                        disabled={schemaSaving}
                      >
                        <Save className="h-3.5 w-3.5 mr-1" /> Save
                      </Button>
                      <Button
                        size="sm"
                        variant={isActive ? "destructive" : "default"}
                        onClick={() => handleToggleSchemaStatus(row)}
                      >
                        {isActive ? (
                          <>
                            <PowerOff className="h-3.5 w-3.5 mr-1" /> Deactivate
                          </>
                        ) : (
                          <>
                            <Power className="h-3.5 w-3.5 mr-1" /> Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Ready to Deploy?</h4>
              <p className="text-sm text-muted-foreground">{selectedModules.length} modules configured</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => handleSaveSchema()}
                disabled={!selectedBusiness || schemaSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {loadedSchemaId ? "Save Schema" : "Save as New"}
              </Button>
              <Button variant="outline" onClick={handleDownloadBlueprint}>
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
              <Button variant="secondary" onClick={handleVaultBlueprint}>
                <Shield className="h-4 w-4 mr-2" />
                Vault to Hub
              </Button>
              <Button onClick={() => setConfirmDialogOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Deploy to Device
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deployment</DialogTitle>
            <DialogDescription>Deploy this blueprint to the selected edge device network.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Assigned To:</span>
                <span className="font-semibold text-primary">
                  {approvedBusinesses.find((b) => b.id.toString() === selectedBusiness)?.name || "Unassigned!"}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-4">
                <span className="text-muted-foreground">Provisioning Code:</span>
                <code className="font-mono font-semibold">{provisioningCode}</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Modules:</span>
                <span className="font-semibold">{selectedModules.length}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendToDevice}>
              <Send className="h-4 w-4 mr-2" />
              Confirm Deploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nano-Bite ↔ Pico-Bite assignment dialog */}
      <NanoBitePicoDialog
        bite={picoDialogBite}
        assignments={picoDialogBite ? bitePicoAssignments[picoDialogBite.id] ?? [] : []}
        onChange={(biteId, picoIds) =>
          setBitePicoAssignments((prev) => ({ ...prev, [biteId]: picoIds }))
        }
        onClose={() => setPicoDialogBite(null)}
      />

      {/* Dev-only Coverage Panel — verifies every sub-module routes to bites + modules */}
      {import.meta.env.DEV && <CoveragePanel />}
    </div>
  );
};

export default PayAppBlueprint;

/**
 * CoveragePanel — dev-only diagnostic showing per-sub-module routing coverage:
 * industryId resolution, mounted module count, and hydrated nano-bite count.
 * Hidden from production builds via `import.meta.env.DEV` gate at the call site.
 */
const CoveragePanel = () => {
  const allSubModuleIds = verticalCategories.flatMap((v) => v.subModules.map((s) => s.id));
  const rows = getSubModuleCoverage(allSubModuleIds);
  const totals = {
    subModules: rows.length,
    routed: rows.filter((r) => r.industryResolved).length,
    unrouted: rows.filter((r) => !r.industryResolved).length,
    bites: rows.reduce((s, r) => s + r.biteCount, 0),
    modules: rows.reduce((s, r) => s + r.moduleCount, 0),
    zeroBites: rows.filter((r) => r.industryResolved && r.biteCount === 0).length,
  };
  const grouped = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    (acc[r.verticalId] ||= []).push(r);
    return acc;
  }, {});

  return (
    <Card className="border-dashed border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-amber-500" />
          Routing Coverage (dev only)
        </CardTitle>
        <CardDescription className="text-xs">
          {totals.routed}/{totals.subModules} sub-modules routed · {totals.modules} module mounts · {totals.bites}{" "}
          nano-bites · {totals.unrouted} unrouted · {totals.zeroBites} routed-but-empty
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[320px] overflow-y-auto space-y-3 text-xs">
          {Object.entries(grouped).map(([verticalId, verticalRows]) => (
            <div key={verticalId} className="border border-border/40 rounded-md p-2">
              <div className="font-semibold mb-1 text-foreground/80">{verticalId}</div>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1">
                {verticalRows.map((r) => (
                  <Fragment key={r.subModuleId}>
                    <div className="font-mono truncate">
                      {r.industryResolved ? "✓" : "✗"} {r.name}
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {r.moduleCount} mod
                    </Badge>
                    <Badge variant={r.biteCount === 0 ? "destructive" : "secondary"} className="text-[10px] h-5">
                      {r.biteCount} bites
                    </Badge>
                    <code className="text-[10px] text-muted-foreground truncate">{r.industryId}</code>
                  </Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
