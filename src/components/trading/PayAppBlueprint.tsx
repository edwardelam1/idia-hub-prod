import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  initializeTaxonomy,
  getNanoBitesFor,
  getIndustryById,
  type NanoBite,
} from '@/taxonomy';
import { useBusinessTaxonomy } from '@/hooks/useBusinessTaxonomy';
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
  type LucideIcon
} from 'lucide-react';

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
  icon?: LucideIcon;
  color?: string;
}

// Complete Vertical Categories - 32+ industries
const verticalCategories: VerticalCategory[] = [
  {
    id: 'grocer',
    name: 'Grocer',
    icon: ShoppingCart,
    color: 'bg-green-500',
    subModules: [
      { id: 'grocer-club', name: 'Club Store', description: 'Membership-based wholesale' },
      { id: 'grocer-marketplace', name: 'Marketplace', description: 'Multi-vendor grocery' },
      { id: 'grocer-supercenter', name: 'Super Center', description: 'Full-service supermarket' },
      { id: 'grocer-convenience', name: 'Convenience', description: 'Quick-stop essentials' },
      { id: 'grocer-organic', name: 'Organic & Natural', description: 'Health-focused grocery' },
      { id: 'grocer-butcher', name: 'Butcher Shop', description: 'Specialty meats' },
    ]
  },
  {
    id: 'hospitality',
    name: 'Hospitality',
    icon: Utensils,
    color: 'bg-orange-500',
    subModules: [
      { id: 'hosp-fine-dining', name: 'Fine Dining', description: 'Upscale restaurant service' },
      { id: 'hosp-diner', name: 'Diner', description: 'Casual dining experience' },
      { id: 'hosp-hotel', name: 'Hotel', description: 'Lodging & room service' },
      { id: 'hosp-home', name: 'Home Services', description: 'In-home hospitality' },
      { id: 'hosp-theme-park', name: 'Theme Park', description: 'Entertainment venues' },
      { id: 'hosp-cafe', name: 'Café & Bakery', description: 'Coffee & pastries' },
      { id: 'hosp-bar', name: 'Bar & Lounge', description: 'Beverage service' },
      { id: 'hosp-catering', name: 'Catering', description: 'Event food service' },
    ]
  },
  {
    id: 'logistics',
    name: 'Logistics',
    icon: Truck,
    color: 'bg-blue-500',
    subModules: [
      { id: 'log-transportation', name: 'Transportation', description: 'Fleet management' },
      { id: 'log-cross-docking', name: 'Cross Docking', description: 'Transfer operations' },
      { id: 'log-trucking', name: 'Trucking', description: 'Long-haul freight' },
      { id: 'log-warehouse', name: 'Warehousing', description: 'Storage facilities' },
      { id: 'log-last-mile', name: 'Last Mile', description: 'Final delivery' },
      { id: 'log-cold-chain', name: 'Cold Chain', description: 'Temperature-controlled' },
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: Stethoscope,
    color: 'bg-red-500',
    subModules: [
      { id: 'health-clinic', name: 'Clinic', description: 'Outpatient care' },
      { id: 'health-hospital', name: 'Hospital', description: 'Inpatient services' },
      { id: 'health-pharmacy', name: 'Pharmacy', description: 'Prescription services' },
      { id: 'health-dental', name: 'Dental', description: 'Oral healthcare' },
      { id: 'health-optometry', name: 'Optometry', description: 'Vision care' },
      { id: 'health-veterinary', name: 'Veterinary', description: 'Animal care' },
      { id: 'health-mental', name: 'Mental Health', description: 'Counseling & therapy' },
      { id: 'health-rehab', name: 'Rehabilitation', description: 'Recovery services' },
    ]
  },
  {
    id: 'retail',
    name: 'Retail',
    icon: Building2,
    color: 'bg-purple-500',
    subModules: [
      { id: 'retail-fashion', name: 'Fashion & Apparel', description: 'Clothing stores' },
      { id: 'retail-electronics', name: 'Electronics', description: 'Tech retail' },
      { id: 'retail-furniture', name: 'Furniture', description: 'Home furnishings' },
      { id: 'retail-jewelry', name: 'Jewelry', description: 'Luxury goods' },
      { id: 'retail-sporting', name: 'Sporting Goods', description: 'Athletic equipment' },
      { id: 'retail-beauty', name: 'Beauty & Cosmetics', description: 'Personal care' },
    ]
  },
  {
    id: 'automotive',
    name: 'Automotive',
    icon: Car,
    color: 'bg-slate-600',
    subModules: [
      { id: 'auto-dealership', name: 'Dealership', description: 'Vehicle sales' },
      { id: 'auto-service', name: 'Service Center', description: 'Repairs & maintenance' },
      { id: 'auto-parts', name: 'Parts Store', description: 'Auto parts retail' },
      { id: 'auto-rental', name: 'Rental', description: 'Vehicle rentals' },
      { id: 'auto-wash', name: 'Car Wash', description: 'Cleaning services' },
      { id: 'auto-fleet', name: 'Fleet Management', description: 'Corporate vehicles' },
    ]
  },
  {
    id: 'fitness',
    name: 'Fitness & Wellness',
    icon: Dumbbell,
    color: 'bg-pink-500',
    subModules: [
      { id: 'fit-gym', name: 'Gym', description: 'Fitness center' },
      { id: 'fit-yoga', name: 'Yoga Studio', description: 'Mind-body wellness' },
      { id: 'fit-spa', name: 'Spa', description: 'Relaxation services' },
      { id: 'fit-martial-arts', name: 'Martial Arts', description: 'Combat training' },
      { id: 'fit-swimming', name: 'Swimming', description: 'Aquatic center' },
      { id: 'fit-crossfit', name: 'CrossFit', description: 'High-intensity training' },
    ]
  },
  {
    id: 'education',
    name: 'Education',
    icon: GraduationCap,
    color: 'bg-indigo-500',
    subModules: [
      { id: 'edu-school', name: 'K-12 School', description: 'Primary education' },
      { id: 'edu-university', name: 'University', description: 'Higher education' },
      { id: 'edu-tutoring', name: 'Tutoring Center', description: 'Academic support' },
      { id: 'edu-vocational', name: 'Vocational', description: 'Trade schools' },
      { id: 'edu-daycare', name: 'Daycare', description: 'Early childhood' },
      { id: 'edu-online', name: 'Online Learning', description: 'E-learning platforms' },
    ]
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: Gamepad2,
    color: 'bg-yellow-500',
    subModules: [
      { id: 'ent-cinema', name: 'Cinema', description: 'Movie theaters' },
      { id: 'ent-arcade', name: 'Arcade', description: 'Gaming venue' },
      { id: 'ent-bowling', name: 'Bowling', description: 'Recreation center' },
      { id: 'ent-concert', name: 'Concert Venue', description: 'Live performances' },
      { id: 'ent-museum', name: 'Museum', description: 'Cultural exhibits' },
      { id: 'ent-casino', name: 'Casino', description: 'Gaming entertainment' },
    ]
  },
  {
    id: 'professional',
    name: 'Professional Services',
    icon: Briefcase,
    color: 'bg-teal-500',
    subModules: [
      { id: 'prof-legal', name: 'Legal', description: 'Law offices' },
      { id: 'prof-accounting', name: 'Accounting', description: 'Financial services' },
      { id: 'prof-consulting', name: 'Consulting', description: 'Business advisory' },
      { id: 'prof-marketing', name: 'Marketing Agency', description: 'Advertising services' },
      { id: 'prof-architecture', name: 'Architecture', description: 'Design services' },
    ]
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    icon: Factory,
    color: 'bg-amber-600',
    subModules: [
      { id: 'mfg-assembly', name: 'Assembly', description: 'Product assembly' },
      { id: 'mfg-processing', name: 'Processing', description: 'Raw materials' },
      { id: 'mfg-packaging', name: 'Packaging', description: 'Product packaging' },
      { id: 'mfg-quality', name: 'Quality Control', description: 'QA operations' },
      { id: 'mfg-textile', name: 'Textile', description: 'Fabric production' },
    ]
  },
  {
    id: 'travel',
    name: 'Travel & Tourism',
    icon: Plane,
    color: 'bg-cyan-500',
    subModules: [
      { id: 'travel-agency', name: 'Travel Agency', description: 'Trip planning' },
      { id: 'travel-airline', name: 'Airline', description: 'Air travel' },
      { id: 'travel-cruise', name: 'Cruise', description: 'Sea travel' },
      { id: 'travel-tour', name: 'Tour Operator', description: 'Guided tours' },
      { id: 'travel-resort', name: 'Resort', description: 'Vacation destinations' },
    ]
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    icon: Leaf,
    color: 'bg-lime-600',
    subModules: [
      { id: 'agri-farming', name: 'Farming', description: 'Crop production' },
      { id: 'agri-ranching', name: 'Ranching', description: 'Livestock management' },
      { id: 'agri-aquaculture', name: 'Aquaculture', description: 'Fish farming' },
      { id: 'agri-greenhouse', name: 'Greenhouse', description: 'Controlled environment' },
      { id: 'agri-equipment', name: 'Equipment Rental', description: 'Farm machinery' },
    ]
  },
  {
    id: 'construction',
    name: 'Construction',
    icon: Hammer,
    color: 'bg-orange-600',
    subModules: [
      { id: 'const-general', name: 'General Contractor', description: 'Building services' },
      { id: 'const-electrical', name: 'Electrical', description: 'Wiring & power' },
      { id: 'const-plumbing', name: 'Plumbing', description: 'Water systems' },
      { id: 'const-hvac', name: 'HVAC', description: 'Climate control' },
      { id: 'const-landscaping', name: 'Landscaping', description: 'Outdoor spaces' },
      { id: 'const-roofing', name: 'Roofing', description: 'Roof installation' },
    ]
  },
  {
    id: 'energy',
    name: 'Energy & Utilities',
    icon: Zap,
    color: 'bg-yellow-600',
    subModules: [
      { id: 'energy-solar', name: 'Solar', description: 'Solar power' },
      { id: 'energy-wind', name: 'Wind', description: 'Wind energy' },
      { id: 'energy-oil-gas', name: 'Oil & Gas', description: 'Petroleum services' },
      { id: 'energy-electric', name: 'Electric Utility', description: 'Power distribution' },
      { id: 'energy-water', name: 'Water Treatment', description: 'Water services' },
    ]
  },
  {
    id: 'financial',
    name: 'Financial Services',
    icon: Landmark,
    color: 'bg-emerald-600',
    subModules: [
      { id: 'fin-banking', name: 'Banking', description: 'Bank services' },
      { id: 'fin-credit-union', name: 'Credit Union', description: 'Member banking' },
      { id: 'fin-investment', name: 'Investment', description: 'Wealth management' },
      { id: 'fin-mortgage', name: 'Mortgage', description: 'Home lending' },
      { id: 'fin-fintech', name: 'Fintech', description: 'Digital finance' },
      { id: 'fin-insurance', name: 'Insurance', description: 'Coverage services' },
    ]
  },
  {
    id: 'government',
    name: 'Government & Public',
    icon: Building,
    color: 'bg-blue-700',
    subModules: [
      { id: 'gov-municipal', name: 'Municipal', description: 'City services' },
      { id: 'gov-federal', name: 'Federal', description: 'National agencies' },
      { id: 'gov-courts', name: 'Courts', description: 'Legal system' },
      { id: 'gov-dmv', name: 'DMV', description: 'Vehicle registration' },
      { id: 'gov-parks', name: 'Parks & Recreation', description: 'Public spaces' },
    ]
  },
  {
    id: 'media',
    name: 'Media & Publishing',
    icon: Tv,
    color: 'bg-rose-500',
    subModules: [
      { id: 'media-print', name: 'Print Media', description: 'Newspapers & magazines' },
      { id: 'media-broadcast', name: 'Broadcasting', description: 'TV & radio' },
      { id: 'media-streaming', name: 'Streaming', description: 'Digital content' },
      { id: 'media-podcast', name: 'Podcasting', description: 'Audio content' },
      { id: 'media-news', name: 'News', description: 'News outlets' },
    ]
  },
  {
    id: 'telecom',
    name: 'Telecommunications',
    icon: Radio,
    color: 'bg-violet-500',
    subModules: [
      { id: 'tel-isp', name: 'ISP', description: 'Internet service' },
      { id: 'tel-mobile', name: 'Mobile Carrier', description: 'Cellular service' },
      { id: 'tel-cable', name: 'Cable', description: 'Cable TV & internet' },
      { id: 'tel-satellite', name: 'Satellite', description: 'Satellite communications' },
      { id: 'tel-datacenter', name: 'Data Centers', description: 'Server facilities' },
    ]
  },
  {
    id: 'realestate',
    name: 'Real Estate',
    icon: Home,
    color: 'bg-amber-500',
    subModules: [
      { id: 're-property', name: 'Property Management', description: 'Building management' },
      { id: 're-leasing', name: 'Leasing', description: 'Rental services' },
      { id: 're-brokerage', name: 'Brokerage', description: 'Sales agents' },
      { id: 're-appraisal', name: 'Appraisal', description: 'Property valuation' },
      { id: 're-title', name: 'Title', description: 'Title services' },
    ]
  },
  {
    id: 'nonprofit',
    name: 'Non-Profit',
    icon: Heart,
    color: 'bg-red-400',
    subModules: [
      { id: 'np-charity', name: 'Charity', description: 'Charitable organization' },
      { id: 'np-foundation', name: 'Foundation', description: 'Grant-making' },
      { id: 'np-ngo', name: 'NGO', description: 'Non-governmental org' },
      { id: 'np-religious', name: 'Religious', description: 'Faith-based org' },
      { id: 'np-community', name: 'Community Org', description: 'Local groups' },
    ]
  },
  {
    id: 'marine',
    name: 'Marine & Maritime',
    icon: Ship,
    color: 'bg-sky-600',
    subModules: [
      { id: 'mar-shipping', name: 'Shipping', description: 'Cargo transport' },
      { id: 'mar-port', name: 'Port Operations', description: 'Harbor services' },
      { id: 'mar-boat-sales', name: 'Boat Sales', description: 'Vessel retail' },
      { id: 'mar-marina', name: 'Marina', description: 'Docking services' },
      { id: 'mar-fishing', name: 'Commercial Fishing', description: 'Fishing operations' },
    ]
  },
  {
    id: 'aviation',
    name: 'Aviation',
    icon: Plane,
    color: 'bg-sky-500',
    subModules: [
      { id: 'avi-airport', name: 'Airport', description: 'Airport operations' },
      { id: 'avi-flight-school', name: 'Flight School', description: 'Pilot training' },
      { id: 'avi-charter', name: 'Charter', description: 'Private flights' },
      { id: 'avi-maintenance', name: 'Maintenance', description: 'Aircraft service' },
      { id: 'avi-cargo', name: 'Air Cargo', description: 'Freight transport' },
    ]
  },
  {
    id: 'mining',
    name: 'Mining & Extraction',
    icon: Pickaxe,
    color: 'bg-stone-600',
    subModules: [
      { id: 'min-mining', name: 'Mining', description: 'Mineral extraction' },
      { id: 'min-quarrying', name: 'Quarrying', description: 'Stone extraction' },
      { id: 'min-drilling', name: 'Drilling', description: 'Well drilling' },
      { id: 'min-refining', name: 'Refining', description: 'Material processing' },
    ]
  },
  {
    id: 'security',
    name: 'Security Services',
    icon: Lock,
    color: 'bg-gray-700',
    subModules: [
      { id: 'sec-private', name: 'Private Security', description: 'Guard services' },
      { id: 'sec-alarm', name: 'Alarm Systems', description: 'Monitoring services' },
      { id: 'sec-surveillance', name: 'Surveillance', description: 'Camera systems' },
      { id: 'sec-cyber', name: 'Cybersecurity', description: 'Digital protection' },
    ]
  },
  {
    id: 'events',
    name: 'Event Services',
    icon: Calendar,
    color: 'bg-fuchsia-500',
    subModules: [
      { id: 'evt-wedding', name: 'Wedding Planning', description: 'Wedding events' },
      { id: 'evt-corporate', name: 'Corporate Events', description: 'Business functions' },
      { id: 'evt-concerts', name: 'Concerts', description: 'Music events' },
      { id: 'evt-festivals', name: 'Festivals', description: 'Public celebrations' },
      { id: 'evt-convention', name: 'Conventions', description: 'Trade shows' },
    ]
  },
  {
    id: 'personal',
    name: 'Personal Services',
    icon: Scissors,
    color: 'bg-pink-400',
    subModules: [
      { id: 'pers-salon', name: 'Salon', description: 'Hair styling' },
      { id: 'pers-barbershop', name: 'Barbershop', description: 'Men\'s grooming' },
      { id: 'pers-tattoo', name: 'Tattoo', description: 'Body art' },
      { id: 'pers-dry-cleaning', name: 'Dry Cleaning', description: 'Garment care' },
      { id: 'pers-tailoring', name: 'Tailoring', description: 'Custom clothing' },
    ]
  },
  {
    id: 'pet',
    name: 'Pet Services',
    icon: PawPrint,
    color: 'bg-orange-400',
    subModules: [
      { id: 'pet-store', name: 'Pet Store', description: 'Pet supplies' },
      { id: 'pet-grooming', name: 'Grooming', description: 'Pet grooming' },
      { id: 'pet-boarding', name: 'Boarding', description: 'Pet hotel' },
      { id: 'pet-training', name: 'Training', description: 'Obedience training' },
      { id: 'pet-daycare', name: 'Pet Daycare', description: 'Day services' },
    ]
  },
  {
    id: 'funeral',
    name: 'Funeral Services',
    icon: Flower2,
    color: 'bg-gray-500',
    subModules: [
      { id: 'fun-home', name: 'Funeral Home', description: 'Funeral services' },
      { id: 'fun-cemetery', name: 'Cemetery', description: 'Burial grounds' },
      { id: 'fun-cremation', name: 'Cremation', description: 'Cremation services' },
      { id: 'fun-memorial', name: 'Memorial', description: 'Memorial services' },
    ]
  },
  {
    id: 'cannabis',
    name: 'Cannabis',
    icon: Cannabis,
    color: 'bg-green-600',
    subModules: [
      { id: 'can-dispensary', name: 'Dispensary', description: 'Retail cannabis' },
      { id: 'can-cultivation', name: 'Cultivation', description: 'Growing operations' },
      { id: 'can-processing', name: 'Processing', description: 'Product manufacturing' },
      { id: 'can-testing', name: 'Testing Lab', description: 'Quality testing' },
    ]
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    icon: Globe,
    color: 'bg-blue-400',
    subModules: [
      { id: 'ecom-dropship', name: 'Dropshipping', description: 'Drop ship model' },
      { id: 'ecom-marketplace', name: 'Marketplace Seller', description: 'Multi-channel' },
      { id: 'ecom-subscription', name: 'Subscription Box', description: 'Recurring delivery' },
      { id: 'ecom-digital', name: 'Digital Goods', description: 'Digital products' },
    ]
  },
  {
    id: 'foodbev',
    name: 'Food & Beverage Production',
    icon: Beer,
    color: 'bg-amber-500',
    subModules: [
      { id: 'fb-brewery', name: 'Brewery', description: 'Beer production' },
      { id: 'fb-winery', name: 'Winery', description: 'Wine production' },
      { id: 'fb-distillery', name: 'Distillery', description: 'Spirits production' },
      { id: 'fb-bakery-prod', name: 'Bakery Production', description: 'Baked goods' },
      { id: 'fb-food-truck', name: 'Food Truck', description: 'Mobile food' },
    ]
  },
];

const defaultModules: SelectedModule[] = [
  { id: 'default-communications', name: 'Communications', isDefault: true, icon: MessageSquare },
  { id: 'default-reports', name: 'Reports', isDefault: true, icon: FileText },
  { id: 'default-forms', name: 'Forms', isDefault: true, icon: ClipboardList },
  { id: 'default-knowledge-base', name: 'Knowledge Base', isDefault: true, icon: Library },
  { id: 'default-taxes', name: 'Taxes', isDefault: true, icon: Receipt },
  { id: 'default-affiliates', name: 'Affiliates', isDefault: true, icon: Users },
  { id: 'default-settings', name: 'Settings', isDefault: true, icon: Settings },
  { id: 'default-security', name: 'Security', isDefault: true, icon: Shield },
  { id: 'default-team', name: 'Team', isDefault: true, icon: UserCog },
  { id: 'default-hr', name: 'HR', isDefault: true, icon: Users },
  { id: 'default-training', name: 'Training', isDefault: true, icon: BookOpen },
  { id: 'default-angelic-xr', name: 'Angelic XR', isDefault: true, icon: Glasses },
  { id: 'default-coop-mode', name: 'Co-Op Mode', isDefault: true, icon: Handshake },
];

const generateProvisioningCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'IDIA-';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) code += '-';
  }
  return code;
};

export const PayAppBlueprint = () => {
  const [expandedVertical, setExpandedVertical] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<SelectedModule[]>([...defaultModules]);
  const [selectedSubModules, setSelectedSubModules] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [provisioningCode, setProvisioningCode] = useState<string>('');
  const [dragOverZone, setDragOverZone] = useState(false);
  const [animatingModules, setAnimatingModules] = useState<Set<string>>(new Set());

  // ── Business Taxonomy Engine bootstrap ──────────────────────────────────────
  // Maps the App Builder's vertical IDs to formal taxonomy IndustryNode IDs.
  const VERTICAL_TO_INDUSTRY_ID: Record<string, string> = {
    hospitality: 'tertiary.hospitality',
    retail: 'tertiary.retail.boutique',
    logistics: 'tertiary.transport',
    financial: 'tertiary.banking',
    manufacturing: 'secondary.manufacturing.consumer',
    construction: 'secondary.construction',
    agriculture: 'primary.agricultural',
    mining: 'primary.extractive',
    professional: 'quaternary.consulting',
    media: 'quaternary.creator.audience_owned',
  };
  const taxonomy = useBusinessTaxonomy('pay-app-builder');
  useEffect(() => {
    initializeTaxonomy();
  }, []);
  const dragDataRef = useRef<{ id: string; name: string; parentId?: string; parentName?: string; color?: string } | null>(null);

  // Business Assigment State
  const [approvedBusinesses, setApprovedBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');

  // Bind the provisioning code to the selected business — one permanent code per business, fetched from the registry.
  useEffect(() => {
    if (!selectedBusiness) {
      setProvisioningCode('');
      return;
    }
    const business = approvedBusinesses.find((b) => b.id.toString() === selectedBusiness);
    if (business?.provisioning_code) {
      console.log(`[PayAppBlueprint] Bound permanent provisioning code ${business.provisioning_code} to business ${selectedBusiness}.`);
      setProvisioningCode(business.provisioning_code);
    } else {
      console.warn(`[PayAppBlueprint] No provisioning_code found on business ${selectedBusiness}. Registry may be out of sync.`);
      setProvisioningCode('');
      toast.error('Selected business is missing a provisioning code.');
    }
  }, [selectedBusiness, approvedBusinesses]);

  useEffect(() => {
    // Fetch live, verified business organizations from the central registry
    const fetchApprovedBusinesses = async () => {
      console.log('[PayAppBlueprint] Starting fetchApprovedBusinesses execution...');

      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('id, name, business_type, provisioning_code')
          .order('created_at', { ascending: false });

        if (error) {
          console.error(
            '[PayAppBlueprint] Supabase error in fetchApprovedBusinesses:',
            error.message,
            error.details,
            error.hint
          );
          toast.error('Failed to fetch live business profiles.');
          return;
        }

        if (!data) {
          console.warn('[PayAppBlueprint] fetchApprovedBusinesses returned no data and no error (possible silent stall).');
          setApprovedBusinesses([]);
          return;
        }

        console.log(`[PayAppBlueprint] Successfully fetched ${data.length} businesses from registry.`);

        const formatted = data.map((bus: any) => ({
          id: bus.id,
          name: bus.name,
          industry: bus.business_type || 'Unspecified',
          provisioning_code: bus.provisioning_code,
        }));

        // Setting live data exclusively. Mock/Sim targets removed.
        setApprovedBusinesses(formatted);

      } catch (err: any) {
        console.error(
          '[PayAppBlueprint] Unexpected exception in fetchApprovedBusinesses:',
          err.message,
          err.stack
        );
        toast.error('Critical failure fetching business registry.');
      } finally {
        console.log('[PayAppBlueprint] Ending fetchApprovedBusinesses execution.');
      }
    };

    fetchApprovedBusinesses();
  }, []);

  const handleVerticalClick = useCallback((verticalId: string) => {
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
  }, [expandedVertical]);

  const handleSubModuleToggle = useCallback((subModuleId: string) => {
    setSelectedSubModules(prev => {
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
    
    const vertical = verticalCategories.find(v => v.id === expandedVertical);
    if (!vertical) return;

    const newModules = vertical.subModules
      .filter(sub => selectedSubModules.has(sub.id))
      .filter(sub => !selectedModules.some(m => m.id === sub.id))
      .map(sub => ({
        id: sub.id,
        name: sub.name,
        parentId: vertical.id,
        parentName: vertical.name,
        icon: vertical.icon,
        color: vertical.color,
      }));

    if (newModules.length > 0) {
      setSelectedModules(prev => [...prev, ...newModules]);
      toast.success(`Added ${newModules.length} module(s) to blueprint`);
    }
    setSelectedSubModules(new Set());
  }, [expandedVertical, selectedSubModules, selectedModules]);

  const handleDragStart = useCallback((e: React.DragEvent, module: { id: string; name: string; parentId?: string; parentName?: string; color?: string }) => {
    dragDataRef.current = module;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', module.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverZone(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(false);
    
    const dragData = dragDataRef.current;
    if (!dragData) return;
    
    const exists = selectedModules.some(m => m.id === dragData.id);
    if (!exists) {
      const vertical = verticalCategories.find(v => v.id === dragData.parentId);
      setSelectedModules(prev => [...prev, {
        id: dragData.id,
        name: dragData.name,
        parentId: dragData.parentId,
        parentName: dragData.parentName,
        icon: vertical?.icon,
        color: dragData.color,
      }]);
      toast.success(`Added ${dragData.name} module`);
    }
    dragDataRef.current = null;
  }, [selectedModules]);

  const handleRemoveModule = useCallback((moduleId: string) => {
    setSelectedModules(prev => prev.filter(m => m.id !== moduleId));
    toast.info('Module removed');
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(provisioningCode);
    setCopied(true);
    toast.success('Provisioning code copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const generateBlueprintJSON = () => {
    const businessName = approvedBusinesses.find(b => b.id.toString() === selectedBusiness)?.name || 'Unassigned';
    
    return {
      version: '2.0.0',
      clientOrganization: businessName,
      provisioningCode: provisioningCode,
      createdAt: new Date().toISOString(),
      modules: {
        default: defaultModules.map(m => ({ id: m.id, name: m.name })),
        custom: selectedModules.filter(m => !m.isDefault).map(m => ({
          id: m.id,
          name: m.name,
          vertical: m.parentName || null
        }))
      },
      verticals: [...new Set(selectedModules.filter(m => m.parentName).map(m => m.parentName))],
      compliance: {
        delt_enabled: true,
        pci_level: 1,
        data_residency: 'us'
      }
    };
  };

  const handleDownloadBlueprint = () => {
    const blueprint = generateBlueprintJSON();
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merchant_blueprint_${provisioningCode}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Blueprint downloaded');
  };

  const handleSendToDevice = async () => {
    if (!selectedBusiness) {
      toast.error('Please assign a business profile before deploying.');
      return;
    }

    console.log(`[PayAppBlueprint] BEGIN: handleSendToDevice execution for code: ${provisioningCode}`);

    try {
      // 1. Generate the dynamic payload
      const blueprintPayload = generateBlueprintJSON();

      // 2. Transmit to the edge provisioning table
      const { error } = await supabase
        .from('device_provisioning_blueprints' as any)
        .upsert({
          code: provisioningCode,
          business_id: selectedBusiness,
          payload: blueprintPayload,
          status: 'active'
        }, { onConflict: 'code' });

      if (error) {
        console.error(
          '[PayAppBlueprint] Supabase error in handleSendToDevice:',
          error.message,
          error.details,
          error.hint
        );
        toast.error('Failed to deploy blueprint to the network.');
        return;
      }

      setConfirmDialogOpen(false);
      toast.success('Blueprint deployed to edge network', {
        description: `Provisioning code: ${provisioningCode} is now LIVE.`
      });

    } catch (err: any) {
      console.error(
        '[PayAppBlueprint] Unexpected exception in handleSendToDevice:',
        err.message,
        err.stack
      );
      toast.error('Critical failure deploying blueprint.');
    } finally {
      console.log(`[PayAppBlueprint] END: handleSendToDevice execution for code: ${provisioningCode}`);
    }
  };

  const customModulesCount = selectedModules.filter(m => !m.isDefault).length;
  const currentVertical = verticalCategories.find(v => v.id === expandedVertical);

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

      {/* Header with Business Assigment */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border bg-muted/20">
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
                {approvedBusinesses.map(bus => (
                  <SelectItem key={bus.id} value={bus.id.toString()}>
                    {bus.name} <span className="text-muted-foreground text-xs ml-2">({bus.industry})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 ml-auto">
          <div className="bg-muted/50 rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Code:</span>
            <code className="font-mono text-sm font-semibold text-primary">{provisioningCode}</code>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyCode}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Modules</p>
                <p className="text-xl font-bold">{selectedModules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Default Modules</p>
                <p className="text-xl font-bold">{defaultModules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Sparkles className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custom Modules</p>
                <p className="text-xl font-bold">{customModulesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Builder Interface */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Pane - Available Modules */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30 py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Available Modules
                </CardTitle>
                <CardDescription>
                  {expandedVertical ? 'Select sub-modules or drag to blueprint' : 'Click a vertical to expand'}
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
                    {verticalCategories.map((vertical, index) => {
                      const Icon = vertical.icon;
                      const isExploding = animatingModules.has(vertical.id);
                      
                      return (
                        <div
                          key={vertical.id}
                          className={`
                            module-icon relative flex flex-col items-center justify-center p-2 rounded-xl
                            cursor-pointer transition-all duration-200
                            hover:scale-105 hover:shadow-lg hover:z-10
                            ${isExploding ? 'explode-out' : 'gravity-fall'}
                          `}
                          style={{ animationDelay: `${index * 0.03}s`, width: '90px' }}
                          onClick={() => handleVerticalClick(vertical.id)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, { 
                            id: vertical.id, 
                            name: vertical.name,
                            color: vertical.color 
                          })}
                        >
                          <div className={`
                            ${vertical.color} p-3 rounded-xl shadow-md
                            transition-transform duration-200 group-hover:scale-110
                            w-12 h-12 flex items-center justify-center
                          `}>
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
                        const isAlreadyAdded = selectedModules.some(m => m.id === sub.id);
                        
                        return (
                          <div
                            key={sub.id}
                            className={`
                              sub-appear relative flex flex-col items-center justify-center p-2 rounded-xl
                              transition-all duration-200 cursor-pointer
                              ${isAlreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg'}
                              ${isSelected && !isAlreadyAdded ? 'ring-2 ring-primary ring-offset-2' : ''}
                            `}
                            style={{ animationDelay: `${index * 0.05}s`, width: '100px' }}
                            onClick={() => !isAlreadyAdded && handleSubModuleToggle(sub.id)}
                            draggable={!isAlreadyAdded}
                            onDragStart={(e) => !isAlreadyAdded && handleDragStart(e, {
                              id: sub.id,
                              name: sub.name,
                              parentId: currentVertical.id,
                              parentName: currentVertical.name,
                              color: currentVertical.color,
                            })}
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
                            
                            <div className={`
                              ${currentVertical.color} p-3 rounded-xl shadow-md
                              w-12 h-12 flex items-center justify-center
                            `}>
                              <Package className="w-5 h-5 text-white" />
                            </div>
                            <span className="mt-2 text-xs font-medium text-center line-clamp-2">
                              {sub.name}
                            </span>
                            {isAlreadyAdded && (
                              <Badge variant="secondary" className="mt-1 text-[10px]">Added</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Taxonomy: Nano-Bites + Spatial Telemetry ── */}
                    {(() => {
                      const industryId = expandedVertical
                        ? VERTICAL_TO_INDUSTRY_ID[expandedVertical]
                        : undefined;
                      if (!industryId) return null;
                      const industry = getIndustryById(industryId);
                      const bites: NanoBite[] = getNanoBitesFor({ industryId });
                      const spatial = taxonomy.getSpatialMetaFor(industryId) as {
                        benchmarks?: string[];
                        tech_stack?: string[];
                        telemetry_focus?: string[];
                        hardware_layer?: string[];
                        math_layer?: string[];
                      };
                      const hasTelemetry =
                        (spatial.telemetry_focus?.length ?? 0) > 0 ||
                        (spatial.hardware_layer?.length ?? 0) > 0;
                      if (!industry || (bites.length === 0 && !hasTelemetry)) return null;

                      return (
                        <div className="mt-4 space-y-3 rounded-xl border bg-card p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-primary" />
                              <h4 className="text-sm font-semibold">
                                Taxonomy Tasks · {industry.label}
                              </h4>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {industry.id}
                            </Badge>
                          </div>

                          {hasTelemetry && (
                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <Radar className="h-4 w-4 text-primary" />
                                <span className="text-xs font-semibold">
                                  Spatial Telemetry
                                </span>
                              </div>
                              {spatial.telemetry_focus && (
                                <div className="flex flex-wrap gap-1">
                                  {spatial.telemetry_focus.map((t) => (
                                    <Badge key={t} variant="secondary" className="text-[10px]">
                                      {t}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {spatial.hardware_layer && (
                                <div className="flex flex-wrap gap-1 items-center">
                                  <Cpu className="h-3 w-3 text-muted-foreground" />
                                  {spatial.hardware_layer.map((h) => (
                                    <Badge key={h} variant="outline" className="text-[10px]">
                                      {h}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {spatial.math_layer && (
                                <div className="flex flex-wrap gap-1 items-center">
                                  <ZapBolt className="h-3 w-3 text-muted-foreground" />
                                  {spatial.math_layer.map((m) => (
                                    <Badge key={m} variant="outline" className="text-[10px]">
                                      {m}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {spatial.benchmarks && (
                                <p className="text-[10px] text-muted-foreground">
                                  Benchmarks: {spatial.benchmarks.join(' · ')}
                                </p>
                              )}
                            </div>
                          )}

                          {bites.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                Nano-Bite Tasks ({bites.length})
                              </p>
                              <div className="grid gap-2">
                                {bites.map((b) => (
                                  <div
                                    key={b.id}
                                    className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 p-2"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium truncate">{b.task}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {b.microElement} · {b.valueChainStage.replace(/_/g, ' ')}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                      <Badge variant="outline" className="text-[9px]">
                                        {b.cadence}
                                      </Badge>
                                      {b.automatable && (
                                        <Badge className="text-[9px]" variant="secondary">
                                          auto
                                        </Badge>
                                      )}
                                      {b.requiresTier && (
                                        <Badge className="text-[9px]" variant="default">
                                          {b.requiresTier}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Pane - Blueprint Zone */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5 py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Blueprint Zone
            </CardTitle>
            <CardDescription>
              Drop modules here • Default + custom modules
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div
              className={`
                min-h-[480px] rounded-xl border-2 border-dashed p-4 transition-all duration-200
                ${dragOverZone 
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' 
                  : 'border-muted-foreground/30'
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
                        .filter(m => m.isDefault)
                        .map(module => {
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
                          .filter(m => !m.isDefault)
                          .map(module => {
                            const Icon = module.icon || Package;
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
                                <div className={`p-2 rounded-lg ${module.color || 'bg-muted'}`}>
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

      {/* Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Ready to Deploy?</h4>
              <p className="text-sm text-muted-foreground">
                {selectedModules.length} modules configured
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleDownloadBlueprint}>
                <Download className="h-4 w-4 mr-2" />
                Download JSON
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
            <DialogDescription>
              Deploy this blueprint to the selected edge device network.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Assigned To:</span>
                <span className="font-semibold text-primary">
                  {approvedBusinesses.find(b => b.id.toString() === selectedBusiness)?.name || 'Unassigned!'}
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
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendToDevice}>
              <Send className="h-4 w-4 mr-2" />
              Confirm Deploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayAppBlueprint;
