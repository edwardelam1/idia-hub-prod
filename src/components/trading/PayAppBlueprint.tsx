import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Building2,
  Package,
  Palette,
  Send,
  Download,
  Copy,
  Check,
  ShoppingCart,
  Boxes,
  Users,
  CreditCard,
  BarChart3,
  QrCode,
  Smartphone,
  Settings,
  Sparkles,
  FileJson,
  Zap,
  Shield,
  Eye
} from 'lucide-react';

interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
  enabled: boolean;
  tier: 'core' | 'premium' | 'enterprise';
}

interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  businessName: string;
  tagline: string;
  theme: 'light' | 'dark' | 'system';
}

interface BlueprintData {
  version: string;
  merchantId: string;
  provisioningCode: string;
  salesAgentId: string;
  createdAt: string;
  modules: ModuleConfig[];
  branding: BrandingConfig;
  tier: 'starter' | 'professional' | 'enterprise';
  region: string;
  compliance: {
    delt_enabled: boolean;
    pci_level: number;
    data_residency: string;
  };
}

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
  const [activeTab, setActiveTab] = useState('modules');
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const [modules, setModules] = useState<ModuleConfig[]>([
    { 
      id: 'pos', 
      name: 'POS Module', 
      description: 'Core point-of-sale functionality with NFC/QR payments',
      icon: <CreditCard className="h-5 w-5" />,
      required: true, 
      enabled: true,
      tier: 'core'
    },
    { 
      id: 'inventory', 
      name: 'Inventory Module', 
      description: 'Real-time inventory tracking and management',
      icon: <Boxes className="h-5 w-5" />,
      required: true, 
      enabled: true,
      tier: 'core'
    },
    { 
      id: 'analytics', 
      name: 'Analytics Module', 
      description: 'Business intelligence and performance dashboards',
      icon: <BarChart3 className="h-5 w-5" />,
      required: false, 
      enabled: true,
      tier: 'core'
    },
    { 
      id: 'staff', 
      name: 'Staff Management', 
      description: 'Employee scheduling, time tracking, and permissions',
      icon: <Users className="h-5 w-5" />,
      required: false, 
      enabled: false,
      tier: 'premium'
    },
    { 
      id: 'ar_menu', 
      name: 'AR Menu Experience', 
      description: 'Angelic XR integration for immersive menu displays',
      icon: <Sparkles className="h-5 w-5" />,
      required: false, 
      enabled: false,
      tier: 'enterprise'
    },
    { 
      id: 'loyalty', 
      name: 'Loyalty Program', 
      description: 'Customer rewards and retention features',
      icon: <QrCode className="h-5 w-5" />,
      required: false, 
      enabled: false,
      tier: 'premium'
    },
  ]);

  const [branding, setBranding] = useState<BrandingConfig>({
    primaryColor: '#6366f1',
    secondaryColor: '#22c55e',
    logoUrl: '',
    businessName: 'Sample Merchant',
    tagline: 'Quality & Service',
    theme: 'system'
  });

  const [merchantConfig, setMerchantConfig] = useState({
    merchantId: 'MRC-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    salesAgentId: 'SA-001',
    tier: 'professional' as const,
    region: 'us-east-1',
    deltEnabled: true,
    pciLevel: 1,
    dataResidency: 'us'
  });

  const [provisioningCode] = useState(generateProvisioningCode());

  const toggleModule = (moduleId: string) => {
    setModules(prev => prev.map(m => 
      m.id === moduleId && !m.required 
        ? { ...m, enabled: !m.enabled }
        : m
    ));
  };

  const generateBlueprint = (): BlueprintData => {
    return {
      version: '2.0.0',
      merchantId: merchantConfig.merchantId,
      provisioningCode: provisioningCode,
      salesAgentId: merchantConfig.salesAgentId,
      createdAt: new Date().toISOString(),
      modules: modules.filter(m => m.enabled),
      branding: branding,
      tier: merchantConfig.tier,
      region: merchantConfig.region,
      compliance: {
        delt_enabled: merchantConfig.deltEnabled,
        pci_level: merchantConfig.pciLevel,
        data_residency: merchantConfig.dataResidency
      }
    };
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(provisioningCode);
    setCopied(true);
    toast.success('Provisioning code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBlueprint = () => {
    const blueprint = generateBlueprint();
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merchant_blueprint_${merchantConfig.merchantId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Blueprint downloaded successfully');
  };

  const handleSendToDevice = () => {
    toast.success('Blueprint queued for edge device deployment', {
      description: `Provisioning code: ${provisioningCode}`
    });
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'core': return 'bg-muted text-muted-foreground';
      case 'premium': return 'bg-primary/10 text-primary border-primary/20';
      case 'enterprise': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return '';
    }
  };

  const enabledModulesCount = modules.filter(m => m.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Pay App Blueprint Builder
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure and deploy IDIA Pay Shell to merchant edge devices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-muted/50 rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Provisioning Code:</span>
            <code className="font-mono text-sm font-semibold text-primary">{provisioningCode}</code>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyCode}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modules</p>
                <p className="text-xl font-bold">{enabledModulesCount}</p>
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
                <p className="text-sm text-muted-foreground">PCI Level</p>
                <p className="text-xl font-bold">Level {merchantConfig.pciLevel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tier</p>
                <p className="text-xl font-bold capitalize">{merchantConfig.tier}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Smartphone className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Region</p>
                <p className="text-xl font-bold">{merchantConfig.region}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Builder Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Blueprint Configuration
              </CardTitle>
              <CardDescription>
                Customize modules, branding, and compliance settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="modules">
                    <Package className="h-4 w-4 mr-2" />
                    Modules
                  </TabsTrigger>
                  <TabsTrigger value="branding">
                    <Palette className="h-4 w-4 mr-2" />
                    Branding
                  </TabsTrigger>
                  <TabsTrigger value="config">
                    <Building2 className="h-4 w-4 mr-2" />
                    Merchant
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="modules" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Select the modules to include in the merchant's IDIA Pay deployment.
                  </p>
                  <div className="grid gap-3">
                    {modules.map((module) => (
                      <div 
                        key={module.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                          module.enabled ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${module.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {module.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{module.name}</span>
                              {module.required && (
                                <Badge variant="secondary" className="text-xs">Required</Badge>
                              )}
                              <Badge variant="outline" className={`text-xs ${getTierBadgeColor(module.tier)}`}>
                                {module.tier}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{module.description}</p>
                          </div>
                        </div>
                        <Switch 
                          checked={module.enabled}
                          onCheckedChange={() => toggleModule(module.id)}
                          disabled={module.required}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="branding" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Business Name</Label>
                        <Input 
                          value={branding.businessName}
                          onChange={(e) => setBranding(prev => ({ ...prev, businessName: e.target.value }))}
                          placeholder="Enter business name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tagline</Label>
                        <Input 
                          value={branding.tagline}
                          onChange={(e) => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
                          placeholder="Enter tagline"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Primary Color</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="color"
                            value={branding.primaryColor}
                            onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input 
                            value={branding.primaryColor}
                            onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="flex-1 font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Secondary Color</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="color"
                            value={branding.secondaryColor}
                            onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input 
                            value={branding.secondaryColor}
                            onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                            className="flex-1 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Logo URL</Label>
                      <Input 
                        value={branding.logoUrl}
                        onChange={(e) => setBranding(prev => ({ ...prev, logoUrl: e.target.value }))}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Theme Mode</Label>
                      <Select 
                        value={branding.theme}
                        onValueChange={(v) => setBranding(prev => ({ ...prev, theme: v as 'light' | 'dark' | 'system' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="config" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Merchant ID</Label>
                        <Input 
                          value={merchantConfig.merchantId}
                          onChange={(e) => setMerchantConfig(prev => ({ ...prev, merchantId: e.target.value }))}
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sales Agent ID</Label>
                        <Input 
                          value={merchantConfig.salesAgentId}
                          onChange={(e) => setMerchantConfig(prev => ({ ...prev, salesAgentId: e.target.value }))}
                          className="font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Subscription Tier</Label>
                        <Select 
                          value={merchantConfig.tier}
                          onValueChange={(v) => setMerchantConfig(prev => ({ ...prev, tier: v as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Deployment Region</Label>
                        <Select 
                          value={merchantConfig.region}
                          onValueChange={(v) => setMerchantConfig(prev => ({ ...prev, region: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us-east-1">US East (Virginia)</SelectItem>
                            <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                            <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                            <SelectItem value="ap-south-1">Asia Pacific (Mumbai)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Compliance Settings
                      </h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>DELT Protocol</Label>
                          <p className="text-sm text-muted-foreground">Enable blockchain provenance logging</p>
                        </div>
                        <Switch 
                          checked={merchantConfig.deltEnabled}
                          onCheckedChange={(v) => setMerchantConfig(prev => ({ ...prev, deltEnabled: v }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>PCI Compliance Level</Label>
                          <Select 
                            value={String(merchantConfig.pciLevel)}
                            onValueChange={(v) => setMerchantConfig(prev => ({ ...prev, pciLevel: parseInt(v) }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Level 1 (Highest)</SelectItem>
                              <SelectItem value="2">Level 2</SelectItem>
                              <SelectItem value="3">Level 3</SelectItem>
                              <SelectItem value="4">Level 4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Data Residency</Label>
                          <Select 
                            value={merchantConfig.dataResidency}
                            onValueChange={(v) => setMerchantConfig(prev => ({ ...prev, dataResidency: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="us">United States</SelectItem>
                              <SelectItem value="eu">European Union</SelectItem>
                              <SelectItem value="in">India (Local Storage)</SelectItem>
                              <SelectItem value="global">Global</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileJson className="h-5 w-5 text-primary" />
                Blueprint Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] rounded-lg border bg-muted/30 p-3">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                  {JSON.stringify(generateBlueprint(), null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleSendToDevice} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Deploy to Edge Device
            </Button>
            <Button variant="outline" onClick={handleDownloadBlueprint} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
            <Button variant="ghost" onClick={() => setPreviewOpen(!previewOpen)} className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              Preview on Device
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayAppBlueprint;
