
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Lock, Coins, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DataViewerFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  bundle: {
    tier: string;
    features: string[];
  };
}

const DataViewerFilters = ({ filters, onFiltersChange, bundle }: DataViewerFiltersProps) => {
  const [userCredits] = useState(1500);
  const { isMobile } = useResponsive();
  const [openSections, setOpenSections] = useState({
    foundational: true,
    professional: true,
    enterprise: true
  });

  // Correct tier names per section 8.0
  const hasFoundational = true; // Everyone has foundational
  const hasProfessional = ['Professional', 'Enterprise'].includes(bundle.tier);
  const hasEnterprise = bundle.tier === 'Enterprise';

  const industries = [
    'Technology', 'Software', 'SaaS', 'AI/ML', 'Cybersecurity', 'Cloud Services',
    'Healthcare', 'Financial Services', 'Manufacturing', 'Retail & E-commerce'
  ];

  const locations = [
    'San Francisco', 'Palo Alto', 'Mountain View', 'San Jose', 'Oakland',
    'New York', 'Boston', 'Seattle', 'Austin', 'Denver'
  ];

  const revenues = ['$1M-$10M', '$10M-$50M', '$50M-$100M', '$100M+'];
  const employeeCounts = ['1-50', '51-200', '201-1000', '1000+'];
  const jobTitles = ['CEO', 'CTO', 'CMO', 'VP Sales', 'Director', 'Manager'];
  const fundingStages = ['Seed', 'Series A', 'Series B', 'Series C+', 'Public'];
  const technologies = ['Salesforce', 'HubSpot', 'AWS', 'Google Cloud', 'Microsoft Azure'];
  const intentSignals = ['Hiring', 'Fundraising', 'Expanding', 'Technology Migration'];

  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const FilterSection = ({ title, tier, isAvailable, children, cost }: any) => {
    const sectionKey = tier.toLowerCase() as keyof typeof openSections;
    
    return (
      <Card className={`${!isAvailable ? 'opacity-50' : ''} ${isMobile ? 'mb-2' : 'mb-4'}`}>
        <Collapsible
          open={openSections[sectionKey]}
          onOpenChange={() => toggleSection(sectionKey)}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className={`cursor-pointer ${isMobile ? 'py-3' : 'py-4'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className={getTierColor(tier)}>
                    {tier}
                  </Badge>
                  <span className={`font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>{title}</span>
                  {!isAvailable && <Lock className="h-4 w-4 text-gray-400" />}
                  {cost && (
                    <div className="flex items-center text-purple-600 text-sm">
                      <Coins className="mr-1 h-3 w-3" />
                      {cost} credits
                    </div>
                  )}
                </div>
                {openSections[sectionKey] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className={`${!isAvailable ? 'pointer-events-none' : ''} ${isMobile ? 'px-3 pb-3' : 'px-6 pb-6'}`}>
              {children}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Enterprise': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Professional': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Foundational': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`space-y-2 ${isMobile ? 'px-2' : 'px-0'}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>Filters</h3>
        <Button variant="outline" size="sm" onClick={clearAllFilters}>
          <RotateCcw className="mr-1 h-3 w-3" />
          Reset
        </Button>
      </div>

      {/* Foundational Filters */}
      <FilterSection
        title="Basic Filters"
        tier="Foundational"
        isAvailable={hasFoundational}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="industry" className={isMobile ? 'text-sm' : ''}>Industry</Label>
            <Select value={filters.industry || ''} onValueChange={(value) => updateFilter('industry', value)}>
              <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location" className={isMobile ? 'text-sm' : ''}>Location</Label>
            <Select value={filters.location || ''} onValueChange={(value) => updateFilter('location', value)}>
              <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="revenue" className={isMobile ? 'text-sm' : ''}>Annual Revenue</Label>
            <Select value={filters.revenue || ''} onValueChange={(value) => updateFilter('revenue', value)}>
              <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                <SelectValue placeholder="Select revenue range" />
              </SelectTrigger>
              <SelectContent>
                {revenues.map((revenue) => (
                  <SelectItem key={revenue} value={revenue}>
                    {revenue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterSection>

      {/* Professional Filters */}
      <FilterSection
        title="Professional Filters"
        tier="Professional"
        isAvailable={hasProfessional}
      >
        <div className="space-y-3">
          <div>
            <Label className={isMobile ? 'text-sm' : ''}>Job Titles</Label>
            <div className="space-y-2 mt-2">
              {jobTitles.slice(0, isMobile ? 4 : jobTitles.length).map((title) => (
                <div key={title} className="flex items-center space-x-2">
                  <Checkbox
                    id={title}
                    checked={filters.jobTitles?.includes(title) || false}
                    onCheckedChange={(checked) => {
                      const current = filters.jobTitles || [];
                      if (checked) {
                        updateFilter('jobTitles', [...current, title]);
                      } else {
                        updateFilter('jobTitles', current.filter((t: string) => t !== title));
                      }
                    }}
                  />
                  <Label htmlFor={title} className={isMobile ? 'text-xs' : 'text-sm'}>{title}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="fundingStage" className={isMobile ? 'text-sm' : ''}>Funding Stage</Label>
            <Select
              value={filters.fundingStage || ''}
              onValueChange={(value) => updateFilter('fundingStage', value)}
            >
              <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                <SelectValue placeholder="Select funding stage" />
              </SelectTrigger>
              <SelectContent>
                {fundingStages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterSection>

      {/* Enterprise Filters */}
      <FilterSection
        title="Enterprise Filters"
        tier="Enterprise"
        isAvailable={hasEnterprise}
        cost={50}
      >
        <div className="space-y-3">
          <div>
            <Label className={isMobile ? 'text-sm' : ''}>Technographics</Label>
            <div className="space-y-2 mt-2">
              {technologies.slice(0, isMobile ? 3 : technologies.length).map((tech) => (
                <div key={tech} className="flex items-center space-x-2">
                  <Checkbox
                    id={tech}
                    checked={filters.technographics?.includes(tech) || false}
                    onCheckedChange={(checked) => {
                      const current = filters.technographics || [];
                      if (checked) {
                        updateFilter('technographics', [...current, tech]);
                      } else {
                        updateFilter('technographics', current.filter((t: string) => t !== tech));
                      }
                    }}
                  />
                  <Label htmlFor={tech} className={isMobile ? 'text-xs' : 'text-sm'}>{tech}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className={isMobile ? 'text-sm' : ''}>Intent Signals</Label>
            <div className="space-y-2 mt-2">
              {intentSignals.map((signal) => (
                <div key={signal} className="flex items-center space-x-2">
                  <Checkbox
                    id={signal}
                    checked={filters.intentSignals?.includes(signal) || false}
                    onCheckedChange={(checked) => {
                      const current = filters.intentSignals || [];
                      if (checked) {
                        updateFilter('intentSignals', [...current, signal]);
                      } else {
                        updateFilter('intentSignals', current.filter((s: string) => s !== signal));
                      }
                    }}
                  />
                  <Label htmlFor={signal} className={isMobile ? 'text-xs' : 'text-sm'}>{signal}</Label>
                </div>
              ))}
            </div>
          </div>

          {hasEnterprise && (
            <Button 
              onClick={() => console.log('Applied Enterprise filters, deducted 50 credits')}
              className={`w-full ${isMobile ? 'text-sm py-2' : ''}`}
              disabled={userCredits < 50}
            >
              <Coins className="mr-2 h-4 w-4" />
              Apply Enterprise Filters (-50 credits)
            </Button>
          )}
        </div>
      </FilterSection>

      {isMobile && (
        <div className="text-xs text-gray-500 text-center mt-4 p-2 bg-gray-50 rounded">
          🔒 Enterprise features require sufficient credits
        </div>
      )}
    </div>
  );
};

export default DataViewerFilters;
