
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

interface FilterModalProps {
  userRole: string;
  onApplyFilters: (filters: any) => void;
  currentFilters: any;
  bundleCategory?: string;
}

const FilterModal = ({ userRole, onApplyFilters, currentFilters, bundleCategory }: FilterModalProps) => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState(currentFilters);

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

  const industries = [
    'Technology', 'Healthcare', 'Financial Services', 'Manufacturing',
    'Retail & E-commerce', 'Real Estate', 'Education', 'Professional Services'
  ];

  const companySizes = ['1-50', '51-500', '501-5000', '5000+'];
  const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Global'];

  // Context-aware filters based on bundle category
  const getContextualFilters = () => {
    switch (bundleCategory) {
      case 'Venture Capital & Private Equity':
        return {
          fundingStages: ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Late Stage'],
          fundingAmounts: ['Under $1M', '$1M-5M', '$5M-15M', '$15M-50M', '$50M+'],
          investorTypes: ['Angel', 'VC', 'Corporate VC', 'PE', 'Family Office', 'Government']
        };
      case 'Commercial Real Estate':
        return {
          propertyTypes: ['Office', 'Retail', 'Industrial', 'Mixed Use', 'Hospitality', 'Healthcare'],
          transactionTypes: ['Sale', 'Lease', 'Investment', 'Development', 'Refinancing'],
          priceRanges: ['Under $1M', '$1M-5M', '$5M-20M', '$20M-100M', '$100M+']
        };
      case 'Consumer Packaged Goods':
        return {
          categories: ['Food & Beverage', 'Personal Care', 'Household', 'Health & Wellness'],
          channels: ['Grocery', 'Convenience', 'Online', 'Specialty', 'Mass Market'],
          demographics: ['Gen Z', 'Millennial', 'Gen X', 'Baby Boomer', 'All Ages']
        };
      case 'SaaS & Technology':
        return {
          platforms: ['Salesforce', 'HubSpot', 'Microsoft', 'Oracle', 'SAP', 'Workday'],
          migrationReasons: ['Cost', 'Features', 'Integration', 'Support', 'Scalability'],
          companyStages: ['Startup', 'Growth', 'Enterprise', 'Public']
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
                  Available: {filterAccess.join(', ')} filters
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
                <Label htmlFor="industry">Industry</Label>
                <Select value={filters.industry || ''} onValueChange={(value) => setFilters({...filters, industry: value})}>
                  <SelectTrigger>
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
                <Label htmlFor="companySize">Company Size</Label>
                <Select value={filters.companySize || ''} onValueChange={(value) => setFilters({...filters, companySize: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {companySizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size} employees
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="region">Geographic Region</Label>
                <Select value={filters.region || ''} onValueChange={(value) => setFilters({...filters, region: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="revenue">Annual Revenue</Label>
                <Select value={filters.revenue || ''} onValueChange={(value) => setFilters({...filters, revenue: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select revenue range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-1m">Under $1M</SelectItem>
                    <SelectItem value="1m-10m">$1M - $10M</SelectItem>
                    <SelectItem value="10m-100m">$10M - $100M</SelectItem>
                    <SelectItem value="over-100m">Over $100M</SelectItem>
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
              <h3 className="text-lg font-semibold">Professional Filters</h3>
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
            </div>
          </div>

          {/* Enterprise Filters */}
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-purple-100 text-purple-800">Enterprise</Badge>
              <h3 className="text-lg font-semibold">Enterprise Filters</h3>
              {!hasEnterprise && <Lock className="h-4 w-4 text-gray-400" />}
              {hasEnterprise && (
                <div className="flex items-center text-purple-600 text-sm">
                  <Coins className="mr-1 h-4 w-4" />
                  50 credits per search
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
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Data Processing</Label>
                  <div className="space-y-2 mt-2">
                    {['Real-time Processing', 'Advanced Analytics', 'Custom Segmentation', 'Trend Analysis'].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox 
                          id={option}
                          checked={filters.processing?.includes(option) || false}
                          onCheckedChange={(checked) => {
                            const current = filters.processing || [];
                            if (checked) {
                              setFilters({...filters, processing: [...current, option]});
                            } else {
                              setFilters({...filters, processing: current.filter((p: string) => p !== option)});
                            }
                          }}
                        />
                        <Label htmlFor={option} className="text-sm">{option}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contextual Filters */}
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
