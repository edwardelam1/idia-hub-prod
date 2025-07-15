
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Filter, Lock, Zap, Coins } from 'lucide-react';
import { useDynamicFilters } from '@/hooks/useDynamicFilters';
import { useMarketplaceBundles } from '@/hooks/useMarketplaceBundles';

interface FilterModalProps {
  userRole: string;
  onApplyFilters: (filters: any) => void;
  currentFilters: any;
  bundleCategory?: string;
}

const FilterModal = ({ userRole, onApplyFilters, currentFilters, bundleCategory }: FilterModalProps) => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState(currentFilters);
  const { bundles } = useMarketplaceBundles();
  const dynamicFilters = useDynamicFilters(bundles);

  const getFilterAccess = () => {
    switch (userRole) {
      case 'super-admin': return ['Analyst', 'Professional', 'Enterprise'];
      case 'organization-admin': return ['Analyst', 'Professional', 'Enterprise'];
      case 'team-lead': return ['Analyst', 'Professional'];
      case 'team-member': return ['Analyst'];
      default: return ['Analyst'];
    }
  };

  const filterAccess = getFilterAccess();
  const hasProfessional = filterAccess.includes('Professional');
  const hasEnterprise = filterAccess.includes('Enterprise');

  // Use dynamic data from actual bundles
  const categories = dynamicFilters.categories;
  const tiers = dynamicFilters.tiers;
  const features = dynamicFilters.features;
  const activityTypes = dynamicFilters.activityTypes;
  const healthMetrics = dynamicFilters.healthMetrics;
  const dataTypes = dynamicFilters.dataTypes;
  const priceRanges = dynamicFilters.priceRanges;

  // Context-aware filters based on bundle category
  const getContextualFilters = () => {
    switch (bundleCategory) {
      case 'Venture Capital & Private Equity':
        return {
          fundingStages: ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Late Stage'],
          fundingAmounts: ['Under $1M', '$1M-5M', '$5M-15M', '$15M-50M', '$50M+'],
          investorTypes: ['Angel', 'VC', 'Corporate VC', 'PE', 'Family Office', 'Government'],
          companyStages: ['Startup', 'Growth', 'Established', 'Unicorn']
        };
      case 'Commercial Real Estate':
        return {
          propertyTypes: ['Office', 'Retail', 'Industrial', 'Mixed Use', 'Hospitality', 'Healthcare'],
          transactionTypes: ['Sale', 'Lease', 'Investment', 'Development', 'Refinancing'],
          priceRanges: ['Under $1M', '$1M-5M', '$5M-20M', '$20M-100M', '$100M+'],
          corridors: ['Downtown', 'Suburban', 'Mixed District', 'Commercial Hub']
        };
      case 'Consumer Packaged Goods':
        return {
          categories: ['Food & Beverage', 'Personal Care', 'Household', 'Health & Wellness'],
          channels: ['Grocery', 'Convenience', 'Online', 'Specialty', 'Mass Market'],
          demographics: ['Gen Z', 'Millennial', 'Gen X', 'Baby Boomer', 'All Ages'],
          seasonality: ['Winter Peak', 'Spring Growth', 'Summer High', 'Fall Decline']
        };
      case 'SaaS & Technology':
        return {
          platforms: ['Salesforce', 'HubSpot', 'Microsoft', 'Oracle', 'SAP', 'Workday'],
          migrationReasons: ['Cost', 'Features', 'Integration', 'Support', 'Scalability'],
          companyStages: ['Startup', 'Growth', 'Enterprise', 'Public'],
          budgetRanges: ['Under $25K', '$25K-$100K', '$100K-$500K', '$500K+']
        };
      default:
        return {
          dataTypes: ['Quantitative', 'Qualitative', 'Mixed Methods'],
          studyTypes: ['Longitudinal', 'Cross-sectional', 'Experimental', 'Observational'],
          sampleSizes: ['Small (50-500)', 'Medium (500-2K)', 'Large (2K-10K)', 'Very Large (10K+)']
        };
    }
  };

  const contextualFilters = getContextualFilters();

  const handleApply = () => {
    onApplyFilters(filters);
    setOpen(false);
  };

  const handleReset = () => {
    setFilters({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Advanced Filters
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Advanced Data Filters
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filter Access Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Zap className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="font-medium text-blue-900">Your Filter Access</p>
                <p className="text-sm text-blue-700">
                  Available: {filterAccess.join(', ')} tier filters
                </p>
              </div>
            </div>
          </div>

          {/* Analyst Filters */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-100 text-green-800">Analyst</Badge>
              <h3 className="text-lg font-semibold">Basic Filters</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Data Category</Label>
                <Select value={filters.category || ''} onValueChange={(value) => setFilters({...filters, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tier">Data Tier</Label>
                <Select value={filters.tier || ''} onValueChange={(value) => setFilters({...filters, tier: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {tier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="healthMetric">Health Metrics</Label>
                <Select value={filters.healthMetric || ''} onValueChange={(value) => setFilters({...filters, healthMetric: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select health metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {healthMetrics.map((metric) => (
                      <SelectItem key={metric} value={metric}>
                        {metric}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="activityType">Activity Type</Label>
                <Select value={filters.activityType || ''} onValueChange={(value) => setFilters({...filters, activityType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dataType">Data Type</Label>
                <Select value={filters.dataType || ''} onValueChange={(value) => setFilters({...filters, dataType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priceRange">Price Range</Label>
                <Select value={filters.priceRange || ''} onValueChange={(value) => setFilters({...filters, priceRange: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select price range" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceRanges.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Professional Filters */}
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-blue-100 text-blue-800">Professional</Badge>
              <h3 className="text-lg font-semibold">Professional Data Filters</h3>
              {!hasProfessional && <Lock className="h-4 w-4 text-gray-400" />}
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!hasProfessional ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <Label htmlFor="dataFreshness">Data Freshness</Label>
                <Select 
                  value={filters.dataFreshness || ''} 
                  onValueChange={(value) => setFilters({...filters, dataFreshness: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data age" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30-days">Last 30 days</SelectItem>
                    <SelectItem value="60-days">Last 60 days</SelectItem>
                    <SelectItem value="90-days">Last 90 days</SelectItem>
                    <SelectItem value="180-days">Last 6 months</SelectItem>
                    <SelectItem value="1-year">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sampleSize">Sample Size</Label>
                <Select 
                  value={filters.sampleSize || ''} 
                  onValueChange={(value) => setFilters({...filters, sampleSize: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sample size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (100-1K)</SelectItem>
                    <SelectItem value="medium">Medium (1K-10K)</SelectItem>
                    <SelectItem value="large">Large (10K-100K)</SelectItem>
                    <SelectItem value="very-large">Very Large (100K+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="confidenceLevel">Data Confidence</Label>
                <Select 
                  value={filters.confidenceLevel || ''} 
                  onValueChange={(value) => setFilters({...filters, confidenceLevel: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select confidence level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">90% Confidence</SelectItem>
                    <SelectItem value="95">95% Confidence</SelectItem>
                    <SelectItem value="99">99% Confidence</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="updateFrequency">Update Frequency</Label>
                <Select 
                  value={filters.updateFrequency || ''} 
                  onValueChange={(value) => setFilters({...filters, updateFrequency: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select update frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="real-time">Real-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dateRange">Date Range</Label>
                <div className="flex space-x-2">
                  <Input 
                    type="date" 
                    placeholder="Start date"
                    value={filters.startDate || ''}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  />
                  <Input 
                    type="date" 
                    placeholder="End date"
                    value={filters.endDate || ''}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="methodology">Data Methodology</Label>
                <Select 
                  value={filters.methodology || ''} 
                  onValueChange={(value) => setFilters({...filters, methodology: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select methodology" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="survey">Survey-based</SelectItem>
                    <SelectItem value="transactional">Transactional Data</SelectItem>
                    <SelectItem value="behavioral">Behavioral Tracking</SelectItem>
                    <SelectItem value="mixed">Mixed Methods</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Enterprise Filters */}
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-purple-100 text-purple-800">Enterprise</Badge>
              <h3 className="text-lg font-semibold">Enterprise Analytics</h3>
              {!hasEnterprise && <Lock className="h-4 w-4 text-gray-400" />}
              {hasEnterprise && (
                <div className="flex items-center text-purple-600 text-sm">
                  <Coins className="mr-1 h-4 w-4" />
                  Advanced filtering - 50 credits per search
                </div>
              )}
            </div>

            <div className={`space-y-4 ${!hasEnterprise ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customDateRange">Custom Date Range</Label>
                  <div className="flex space-x-2">
                    <Input 
                      type="date" 
                      placeholder="Start date"
                      value={filters.customStartDate || ''}
                      onChange={(e) => setFilters({...filters, customStartDate: e.target.value})}
                    />
                    <Input 
                      type="date" 
                      placeholder="End date"
                      value={filters.customEndDate || ''}
                      onChange={(e) => setFilters({...filters, customEndDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="exportFormat">Export Format</Label>
                  <Select 
                    value={filters.exportFormat || ''} 
                    onValueChange={(value) => setFilters({...filters, exportFormat: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="api">API Access</SelectItem>
                      <SelectItem value="tableau">Tableau Extract</SelectItem>
                      <SelectItem value="powerbi">Power BI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="geoPrecision">Geographic Precision</Label>
                  <Select 
                    value={filters.geoPrecision || ''} 
                    onValueChange={(value) => setFilters({...filters, geoPrecision: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select precision" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="country">Country Level</SelectItem>
                      <SelectItem value="state">State/Province</SelectItem>
                      <SelectItem value="city">City Level</SelectItem>
                      <SelectItem value="zip">ZIP/Postal Code</SelectItem>
                      <SelectItem value="coordinates">GPS Coordinates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dataProcessing">Real-time Processing</Label>
                  <Select 
                    value={filters.dataProcessing || ''} 
                    onValueChange={(value) => setFilters({...filters, dataProcessing: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select processing type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="neartime">Near real-time (15min)</SelectItem>
                      <SelectItem value="hourly">Hourly refresh</SelectItem>
                      <SelectItem value="daily">Daily batch</SelectItem>
                      <SelectItem value="historical">Historical only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Advanced Analytics Options</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {['Predictive Analytics', 'Trend Analysis', 'Anomaly Detection', 'Custom Segmentation', 'Cohort Analysis', 'Statistical Modeling'].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox 
                        id={option}
                        checked={filters.analytics?.includes(option) || false}
                        onCheckedChange={(checked) => {
                          const current = filters.analytics || [];
                          if (checked) {
                            setFilters({...filters, analytics: [...current, option]});
                          } else {
                            setFilters({...filters, analytics: current.filter((p: string) => p !== option)});
                          }
                        }}
                      />
                      <Label htmlFor={option} className="text-sm">{option}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contextual Filters for Enterprise */}
              {Object.keys(contextualFilters).map((filterKey) => (
                <div key={filterKey}>
                  <Label>{filterKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {contextualFilters[filterKey as keyof typeof contextualFilters].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`${filterKey}-${option}`}
                          checked={filters[filterKey]?.includes(option) || false}
                          onCheckedChange={(checked) => {
                            const current = filters[filterKey] || [];
                            if (checked) {
                              setFilters({...filters, [filterKey]: [...current, option]});
                            } else {
                              setFilters({...filters, [filterKey]: current.filter((item: string) => item !== option)});
                            }
                          }}
                        />
                        <Label htmlFor={`${filterKey}-${option}`} className="text-sm">{option}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleReset}>
              Reset Filters
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApply}>
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilterModal;
