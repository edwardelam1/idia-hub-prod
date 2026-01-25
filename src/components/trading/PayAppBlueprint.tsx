import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Package,
  Send,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
  Sparkles,
  ShoppingCart,
  Utensils,
  Truck,
  Building2,
  Heart,
  GraduationCap,
  Factory,
  Plane,
  Home,
  Gamepad2,
  Palette,
  Music,
  Dumbbell,
  Car,
  Stethoscope,
  Briefcase,
  MessageSquare,
  FileText,
  Receipt,
  Users,
  Settings,
  Shield,
  UserCog,
  BookOpen,
  Glasses,
  Handshake,
  LucideIcon
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
}

// Vertical Categories with Sub-modules
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
      { id: 'prof-real-estate', name: 'Real Estate', description: 'Property services' },
      { id: 'prof-insurance', name: 'Insurance', description: 'Coverage services' },
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
    ]
  },
];

// Default modules that are always included
const defaultModules: SelectedModule[] = [
  { id: 'default-communications', name: 'Communications', isDefault: true, icon: MessageSquare },
  { id: 'default-reports', name: 'Reports', isDefault: true, icon: FileText },
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

// Module Icon Component with gravity animation
const ModuleIcon = ({ 
  module, 
  isExpanded,
  onSelect,
  onToggleExpand,
  isVertical = false,
  color = 'bg-primary'
}: { 
  module: VerticalCategory | SubModule;
  isExpanded?: boolean;
  onSelect?: () => void;
  onToggleExpand?: () => void;
  isVertical?: boolean;
  color?: string;
}) => {
  const isVerticalCat = 'subModules' in module;
  const Icon = isVerticalCat ? (module as VerticalCategory).icon : Package;
  const bgColor = isVerticalCat ? (module as VerticalCategory).color : color;

  return (
    <div 
      className={`
        group relative flex flex-col items-center justify-center p-3 rounded-xl
        cursor-pointer transition-all duration-300 ease-out
        hover:scale-105 hover:shadow-lg
        animate-[fall_0.5s_ease-out_forwards]
        ${isVerticalCat ? 'w-24 h-24' : 'w-20 h-20'}
      `}
      onClick={isVerticalCat ? onToggleExpand : onSelect}
      style={{
        animationDelay: `${Math.random() * 0.3}s`
      }}
    >
      <div className={`
        ${bgColor} p-3 rounded-xl shadow-md
        transition-transform duration-200 group-hover:scale-110
        ${isVerticalCat ? 'w-14 h-14' : 'w-12 h-12'}
        flex items-center justify-center
      `}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="mt-2 text-xs font-medium text-center text-foreground line-clamp-2">
        {module.name}
      </span>
      {isVerticalCat && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  );
};

// Selected Module Card
const SelectedModuleCard = ({ 
  module, 
  onRemove,
  isDragging
}: { 
  module: SelectedModule;
  onRemove?: () => void;
  isDragging?: boolean;
}) => {
  const Icon = module.icon || Package;
  
  return (
    <div 
      className={`
        flex items-center gap-3 p-3 rounded-lg border bg-card
        transition-all duration-200
        ${isDragging ? 'shadow-lg scale-105 opacity-80' : 'hover:shadow-md'}
        ${module.isDefault ? 'border-primary/30 bg-primary/5' : 'border-border'}
      `}
      draggable={!module.isDefault}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
      <div className={`p-2 rounded-lg ${module.isDefault ? 'bg-primary/10' : 'bg-muted'}`}>
        <Icon className={`w-4 h-4 ${module.isDefault ? 'text-primary' : 'text-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{module.name}</p>
        {module.parentName && (
          <p className="text-xs text-muted-foreground">{module.parentName}</p>
        )}
      </div>
      {module.isDefault ? (
        <Badge variant="secondary" className="text-xs">Default</Badge>
      ) : (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 opacity-0 group-hover:opacity-100"
          onClick={onRemove}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      )}
    </div>
  );
};

export const PayAppBlueprint = () => {
  const [expandedVertical, setExpandedVertical] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<SelectedModule[]>([...defaultModules]);
  const [copied, setCopied] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [provisioningCode] = useState(generateProvisioningCode());
  const [dragOverZone, setDragOverZone] = useState(false);

  const handleToggleExpand = useCallback((verticalId: string) => {
    setExpandedVertical(prev => prev === verticalId ? null : verticalId);
  }, []);

  const handleSelectSubModule = useCallback((subModule: SubModule, parent: VerticalCategory) => {
    const exists = selectedModules.find(m => m.id === subModule.id);
    if (!exists) {
      setSelectedModules(prev => [
        ...prev,
        {
          id: subModule.id,
          name: subModule.name,
          parentId: parent.id,
          parentName: parent.name,
          icon: parent.icon
        }
      ]);
      toast.success(`Added ${subModule.name} module`);
    }
  }, [selectedModules]);

  const handleRemoveModule = useCallback((moduleId: string) => {
    setSelectedModules(prev => prev.filter(m => m.id !== moduleId));
    toast.info('Module removed');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverZone(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(false);
    // Handle drop logic here
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(provisioningCode);
    setCopied(true);
    toast.success('Provisioning code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const generateBlueprintJSON = () => {
    return {
      version: '2.0.0',
      provisioningCode: provisioningCode,
      createdAt: new Date().toISOString(),
      modules: {
        default: defaultModules.map(m => ({ id: m.id, name: m.name })),
        selected: selectedModules.filter(m => !m.isDefault).map(m => ({
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
    toast.success('Blueprint downloaded successfully');
  };

  const handleSendToDevice = () => {
    setConfirmDialogOpen(false);
    toast.success('Blueprint queued for edge device deployment', {
      description: `Provisioning code: ${provisioningCode}`
    });
  };

  const customModulesCount = selectedModules.filter(m => !m.isDefault).length;

  return (
    <div className="space-y-6">
      {/* CSS for animations */}
      <style>{`
        @keyframes fall {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          60% {
            transform: translateY(5px);
          }
          80% {
            transform: translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes explode {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .explode-in {
          animation: explode 0.4s ease-out forwards;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            IDIA Pay Blueprint Builder
          </h2>
          <p className="text-muted-foreground mt-1">
            Build custom merchant blueprints by selecting verticals and modules
          </p>
        </div>
        <div className="flex items-center gap-3">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Pane - Available Modules */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Available Verticals & Modules
            </CardTitle>
            <CardDescription>
              Click a vertical to expand, then select modules to add
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {/* Verticals Grid */}
                <div className="flex flex-wrap gap-3 justify-center p-4 bg-muted/20 rounded-xl min-h-[200px]">
                  {verticalCategories.map((vertical) => (
                    <ModuleIcon
                      key={vertical.id}
                      module={vertical}
                      isExpanded={expandedVertical === vertical.id}
                      onToggleExpand={() => handleToggleExpand(vertical.id)}
                      isVertical
                    />
                  ))}
                </div>

                {/* Expanded Sub-modules */}
                {expandedVertical && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      {(() => {
                        const vertical = verticalCategories.find(v => v.id === expandedVertical);
                        if (!vertical) return null;
                        const Icon = vertical.icon;
                        return (
                          <>
                            <div className={`${vertical.color} p-2 rounded-lg`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <h4 className="font-semibold">{vertical.name} Modules</h4>
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-3 p-4 bg-muted/20 rounded-xl">
                      {verticalCategories
                        .find(v => v.id === expandedVertical)
                        ?.subModules.map((sub, index) => {
                          const parent = verticalCategories.find(v => v.id === expandedVertical)!;
                          const isSelected = selectedModules.some(m => m.id === sub.id);
                          return (
                            <div
                              key={sub.id}
                              className={`
                                explode-in flex flex-col items-center justify-center p-3 rounded-xl
                                cursor-pointer transition-all duration-200 w-24
                                ${isSelected 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : 'hover:scale-105 hover:shadow-lg'
                                }
                              `}
                              style={{ animationDelay: `${index * 0.05}s` }}
                              onClick={() => !isSelected && handleSelectSubModule(sub, parent)}
                            >
                              <div className={`${parent.color} p-3 rounded-xl shadow-md`}>
                                <Package className="w-5 h-5 text-white" />
                              </div>
                              <span className="mt-2 text-xs font-medium text-center line-clamp-2">
                                {sub.name}
                              </span>
                              {isSelected && (
                                <Badge variant="secondary" className="mt-1 text-[10px]">Added</Badge>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Pane - Selected Modules (Drop Zone) */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Blueprint Modules
            </CardTitle>
            <CardDescription>
              Default modules + your selected modules
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div
              className={`
                min-h-[500px] rounded-xl border-2 border-dashed p-4 transition-colors
                ${dragOverZone ? 'border-primary bg-primary/5' : 'border-muted'}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <ScrollArea className="h-[470px] pr-2">
                <div className="space-y-2">
                  {/* Default Modules Section */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Default Modules (Always Included)
                    </h4>
                    <div className="space-y-2">
                      {selectedModules
                        .filter(m => m.isDefault)
                        .map(module => (
                          <SelectedModuleCard
                            key={module.id}
                            module={module}
                          />
                        ))}
                    </div>
                  </div>

                  {/* Custom Modules Section */}
                  {customModulesCount > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Selected Modules ({customModulesCount})
                      </h4>
                      <div className="space-y-2">
                        {selectedModules
                          .filter(m => !m.isDefault)
                          .map(module => (
                            <SelectedModuleCard
                              key={module.id}
                              module={module}
                              onRemove={() => handleRemoveModule(module.id)}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {customModulesCount === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Select modules from the left pane</p>
                      <p className="text-sm">Click on a vertical to see available modules</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="text-center lg:text-left">
              <h4 className="font-semibold">Ready to Deploy?</h4>
              <p className="text-sm text-muted-foreground">
                Review your blueprint and send to edge device
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

      {/* JSON Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Blueprint Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto text-xs">
            {JSON.stringify(generateBlueprintJSON(), null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deployment</DialogTitle>
            <DialogDescription>
              You are about to deploy this blueprint to an edge device. This will configure
              the IDIA Pay system with {selectedModules.length} modules.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Provisioning Code:</span>
                <code className="font-mono font-semibold">{provisioningCode}</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Modules:</span>
                <span className="font-semibold">{selectedModules.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custom Modules:</span>
                <span className="font-semibold">{customModulesCount}</span>
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
    </div>
  );
};
