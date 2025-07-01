
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Lock, Coins, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DataViewerFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  bundle: {
    tier: string;
    features: string[];
    category?: string;
  };
}

const DataViewerFilters = ({ filters, onFiltersChange, bundle }: DataViewerFiltersProps) => {
  const [userCredits] = useState(1500);
  const { isMobile } = useResponsive();
  const [openSections, setOpenSections] = useState({
    analyst: true,
    professional: true,
    enterprise: true
  });

  const hasAnalyst = true;
  const hasProfessional = ['Professional', 'Enterprise'].includes(bundle.tier);
  const hasEnterprise = bundle.tier === 'Enterprise';

  // Basic filters for all tiers
  const industries = [
    'Technology', 'Software', 'SaaS', 'AI/ML', 'Cybersecurity', 'Cloud Services',
    'Healthcare', 'Financial Services', 'Manufacturing', 'Retail & E-commerce'
  ];

  const locations = [
    'San Francisco', 'Palo Alto', 'Mountain View', 'San Jose', 'Oakland',
    'New York', 'Boston', 'Seattle', 'Austin', 'Denver'
  ];

  const revenues = ['$1M-$10M', '$10M-$50M', '$50M-$100M', '$100M+'];

  // Professional tier data filters
  const dataFreshness = ['Last 30 days', 'Last 60 days', 'Last 90 days', 'Last 6 months', 'Last 1 year'];
  const sampleSizes = ['Small (100-1K)', 'Medium (1K-10K)', 'Large (10K-100K)', 'Very Large (100K+)'];
  const confidenceLevels = ['90%', '95%', '99%'];
  const updateFrequencies = ['Real-time', 'Daily', 'Weekly', 'Monthly', 'Quarterly'];
  const methodologies = ['Survey-based', 'Transactional Data', 'Behavioral Tracking', 'Mixed Methods'];

  // Enterprise tier advanced filters
  const exportFormats = ['CSV', 'Excel', 'JSON', 'API Access', 'Tableau', 'Power BI'];
  const geographicPrecision = ['Country', 'State', 'City', 'ZIP Code', 'GPS Coordinates'];
  const realTimeProcessing = ['Real-time', 'Near real-time', 'Hourly', 'Daily', 'Historical'];
  const advancedAnalytics = [
    'Predictive Analytics',
    'Trend Analysis',
    'Anomaly Detection',
    'Custom Segmentation',
    'Cohort Analysis',
    'Statistical Modeling'
  ];

  // Context-aware filters based on bundle category
  const getCategorySpecificFilters = () => {
    switch (bundle.category) {
      case 'Venture Capital & Private Equity':
        return {
          fundingStages: ['Seed', 'Series A', 'Series B', 'Series C+', 'Public'],
          investorTypes: ['Angel', 'VC', 'PE', 'Corporate', 'Government'],
          companyStages: ['Pre-Revenue', 'Early Revenue', 'Growth', 'Scale-Up']
        };
      case 'Commercial Real Estate':
        return {
          propertyTypes: ['Office', 'Retail', 'Industrial', 'Mixed-Use', 'Hospitality'],
          transactionTypes: ['Sale', 'Lease', 'Development', 'Investment'],
          priceRanges: ['Under $1M', '$1M-$5M', '$5M-$20M', '$20M+']
        };
      case 'Consumer Packaged Goods':
        return {
          channels: ['Grocery', 'Convenience', 'Online', 'Specialty', 'Warehouse'],
          demographics: ['Gen Z', 'Millennial', 'Gen X', 'Boomer'],
          seasonality: ['Spring', 'Summer', 'Fall', 'Winter', 'Holiday']
        };
      case 'SaaS & Technology':
        return {
          platforms: ['Salesforce', 'HubSpot', 'Microsoft', 'Google', 'AWS'],
          migrationReasons: ['Cost', 'Features', 'Integration', 'Support', 'Scalability'],
          budgetRanges: ['$10K-25K', '$25K-50K', '$50K-100K', '$100K+']
        };
      default:
        return {};
    }
  };

  const categoryFilters = getCategorySpecificFilters();

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
      case 'Analyst': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`space-y-2 ${isMobile ? 'px-2' : 'px-0'}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>Data Filters</h3>
        <Button variant="outline" size="sm" onClick={clearAllFilters}>
          <RotateCcw className="mr-1 h-3 w-3" />
          Reset
        </Button>
      </div>

      {/* Analyst Filters */}
      <FilterSection
        title="Basic Data Filters"
        tier="Analyst"
        isAvailable={hasAnalyst}
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

          {/* Category-specific filters for Analyst tier */}
          {Object.entries(categoryFilters).slice(0, 1).map(([key, values]) => (
            <div key={key}>
              <Label className={isMobile ? 'text-sm' : ''}>{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
              <Select value={filters[key] || ''} onValueChange={(value) => updateFilter(key, value)}>
                <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                  <SelectValue placeholder={`Select ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {(values as string[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Professional Filters */}
      <FilterSection
        title="Data Quality & Methodology"
        tier="Professional"
        isAvailable={hasProfessional}
      >
        <div className="space-y-3">
          <div>
            <Label className={isMobile ? 'text-sm' : ''}>Data Freshness</Label>
            <Select value={filters.dataFreshness || ''} onValueChange={(value) => updateFilter('dataFreshness', value)}>
              <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                <SelectValue placeholder="Select data freshness" />
              </SelectTrigger>
              <SelectContent>
                {dataFreshness.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={isMobile ? 'text-sm' : ''}>Sample Size</Label>
            <Select value={filters.sampleSize || ''} onValueChange={(value) => updateFilter('sampleSize', value)}>
              <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                <SelectValue placeholder="Select sample size" />
              </SelectTrigger>
              <SelectContent>
                {sampleSizes.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={isMobile ? 'text-sm' : ''}>Confidence Level</Label>
            <Select value={filters.confidenceLevel || ''} onValueChange={(value) => updateFilter('confidenceLevel', value)}>
              <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                <SelectValue placeholder="Select confidence level" />
              </SelectTrigger>
              <SelectContent>
                {confidenceLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={isMobile ? 'text-sm' : ''}>Update Frequency</Label>
            <Select value={filters.updateFrequency || ''} onValueChange={(value) => updateFilter('updateFrequency', value)}>
              <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                <SelectValue placeholder="Select update frequency" />
              </SelectTrigger>
              <SelectContent>
                {updateFrequencies.map((freq) => (
                  <SelectItem key={freq} value={freq}>
                    {freq}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={isMobile ? 'text-sm' : ''}>Methodology</Label>
            <Select value={filters.methodology || ''} onValueChange={(value) => updateFilter('methodology', value)}>
              <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                <SelectValue placeholder="Select methodology" />
              </SelectTrigger>
              <SelectContent>
                {methodologies.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className={isMobile ? 'text-sm' : ''}>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => updateFilter('startDate', e.target.value)}
                className={isMobile ? 'text-sm' : ''}
              />
            </div>
            <div>
              <Label className={isMobile ? 'text-sm' : ''}>End Date</Label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => updateFilter('endDate', e.target.value)}
                className={isMobile ? 'text-sm' : ''}
              />
            </div>
          </div>
        </div>
      </FilterSection>

      {/* Enterprise Filters */}
      <FilterSection
        title="Advanced Analytics & Export"
        tier="Enterprise"
        isAvailable={hasEnterprise}
        cost={50}
      >
        <div className="space-y-3">
          <div>
            <Label className={isMobile ? 'text-sm' : ''}>Export Format</Label>
            <div className="space-y-2 mt-2">
              {exportFormats.slice(0, isMobile ? 4 : exportFormats.length).map((format) => (
                <div key={format} className="flex items-center space-x-2">
                  <Checkbox
                    id={format}
                    checked={filters.exportFormats?.includes(format) || false}
                    onCheckedChange={(checked) => {
                      const current = filters.exportFormats || [];
                      if (checked) {
                        updateFilter('exportFormats', [...current, format]);
                      } else {
                        updateFilter('exportFormats', current.filter((f: string) => f !== format));
                      }
                    }}
                  />
                  <Label htmlFor={format} className={isMobile ? 'text-xs' : 'text-sm'}>{format}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className={isMobile ? 'text-sm' : ''}>Geographic Precision</Label>
            <Select value={filters.geographicPrecision || ''} onValueChange={(value) => updateFilter('geographicPrecision', value)}>
              <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                <SelectValue placeholder="Select precision level" />
              </SelectTrigger>
              <SelectContent>
                {geographicPrecision.map((precision) => (
                  <SelectItem key={precision} value={precision}>
                    {precision}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={isMobile ? 'text-sm' : ''}>Processing Speed</Label>
            <Select value={filters.processingSpeed || ''} onValueChange={(value) => updateFilter('processingSpeed', value)}>
              <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                <SelectValue placeholder="Select processing speed" />
              </SelectTrigger>
              <SelectContent>
                {realTimeProcessing.map((speed) => (
                  <SelectItem key={speed} value={speed}>
                    {speed}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={isMobile ? 'text-sm' : ''}>Advanced Analytics</Label>
            <div className="space-y-2 mt-2">
              {advancedAnalytics.slice(0, isMobile ? 4 : advancedAnalytics.length).map((analytics) => (
                <div key={analytics} className="flex items-center space-x-2">
                  <Checkbox
                    id={analytics}
                    checked={filters.advancedAnalytics?.includes(analytics) || false}
                    onCheckedChange={(checked) => {
                      const current = filters.advancedAnalytics || [];
                      if (checked) {
                        updateFilter('advancedAnalytics', [...current, analytics]);
                      } else {
                        updateFilter('advancedAnalytics', current.filter((a: string) => a !== analytics));
                      }
                    }}
                  />
                  <Label htmlFor={analytics} className={isMobile ? 'text-xs' : 'text-sm'}>{analytics}</Label>
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
              Apply Advanced Filters (-50 credits)
            </Button>
          )}
        </div>
      </FilterSection>

      {isMobile && (
        <div className="text-xs text-gray-500 text-center mt-4 p-2 bg-gray-50 rounded">
          🔒 Advanced features require sufficient credits
        </div>
      )}
    </div>
  );
};

export default DataViewerFilters;
