
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
}

const FilterModal = ({ userRole, onApplyFilters, currentFilters }: FilterModalProps) => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState(currentFilters);

  const getFilterAccess = () => {
    switch (userRole) {
      case 'super-admin': return ['Foundational', 'Advanced', 'Premier'];
      case 'organization-admin': return ['Foundational', 'Advanced', 'Premier'];
      case 'team-lead': return ['Foundational', 'Advanced'];
      case 'team-member': return ['Foundational'];
      default: return ['Foundational'];
    }
  };

  const filterAccess = getFilterAccess();
  const hasAdvanced = filterAccess.includes('Advanced');
  const hasPremier = filterAccess.includes('Premier');

  const industries = [
    'Technology', 'Healthcare', 'Financial Services', 'Manufacturing',
    'Retail & E-commerce', 'Real Estate', 'Education', 'Professional Services'
  ];

  const companySizes = ['1-50', '51-500', '501-5000', '5000+'];
  const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Global'];

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

          {/* Foundational Filters */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-100 text-green-800">Foundational</Badge>
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

          {/* Advanced Filters */}
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-blue-100 text-blue-800">Advanced</Badge>
              <h3 className="text-lg font-semibold">Advanced Filters</h3>
              {!hasAdvanced && <Lock className="h-4 w-4 text-gray-400" />}
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!hasAdvanced ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <Label>Job Titles</Label>
                <div className="space-y-2 mt-2">
                  {['CEO', 'CTO', 'CMO', 'VP Sales', 'Director'].map((title) => (
                    <div key={title} className="flex items-center space-x-2">
                      <Checkbox 
                        id={title}
                        checked={filters.jobTitles?.includes(title) || false}
                        onCheckedChange={(checked) => {
                          const current = filters.jobTitles || [];
                          if (checked) {
                            setFilters({...filters, jobTitles: [...current, title]});
                          } else {
                            setFilters({...filters, jobTitles: current.filter((t: string) => t !== title)});
                          }
                        }}
                      />
                      <Label htmlFor={title} className="text-sm">{title}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="fundingStage">Funding Stage</Label>
                <Select 
                  value={filters.fundingStage || ''} 
                  onValueChange={(value) => setFilters({...filters, fundingStage: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select funding stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seed">Seed</SelectItem>
                    <SelectItem value="series-a">Series A</SelectItem>
                    <SelectItem value="series-b">Series B</SelectItem>
                    <SelectItem value="series-c">Series C+</SelectItem>
                    <SelectItem value="ipo">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Premier Filters */}
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-purple-100 text-purple-800">Premier</Badge>
              <h3 className="text-lg font-semibold">Premier Filters</h3>
              {!hasPremier && <Lock className="h-4 w-4 text-gray-400" />}
              {hasPremier && (
                <div className="flex items-center text-purple-600 text-sm">
                  <Coins className="mr-1 h-4 w-4" />
                  50 credits per search
                </div>
              )}
            </div>

            <div className={`space-y-4 ${!hasPremier ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Technographics</Label>
                  <div className="space-y-2 mt-2">
                    {['Salesforce', 'HubSpot', 'AWS', 'Microsoft Azure', 'Google Cloud'].map((tech) => (
                      <div key={tech} className="flex items-center space-x-2">
                        <Checkbox 
                          id={tech}
                          checked={filters.technographics?.includes(tech) || false}
                          onCheckedChange={(checked) => {
                            const current = filters.technographics || [];
                            if (checked) {
                              setFilters({...filters, technographics: [...current, tech]});
                            } else {
                              setFilters({...filters, technographics: current.filter((t: string) => t !== tech)});
                            }
                          }}
                        />
                        <Label htmlFor={tech} className="text-sm">{tech}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Intent Signals</Label>
                  <div className="space-y-2 mt-2">
                    {['Hiring', 'Fundraising', 'Expanding', 'Technology Migration'].map((signal) => (
                      <div key={signal} className="flex items-center space-x-2">
                        <Checkbox 
                          id={signal}
                          checked={filters.intentSignals?.includes(signal) || false}
                          onCheckedChange={(checked) => {
                            const current = filters.intentSignals || [];
                            if (checked) {
                              setFilters({...filters, intentSignals: [...current, signal]});
                            } else {
                              setFilters({...filters, intentSignals: current.filter((s: string) => s !== signal)});
                            }
                          }}
                        />
                        <Label htmlFor={signal} className="text-sm">{signal}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
