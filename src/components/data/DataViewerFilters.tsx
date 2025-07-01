
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Filter, Lock, Coins, RotateCcw } from 'lucide-react';

interface DataViewerFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  bundle: {
    tier: string;
    features: string[];
  };
}

const DataViewerFilters = ({ filters, onFiltersChange, bundle }: DataViewerFiltersProps) => {
  const [userCredits] = useState(1500); // Mock user credits

  const hasAdvanced = ['Advanced', 'Premier'].includes(bundle.tier);
  const hasPremier = bundle.tier === 'Premier';

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

  const applyPremierFilter = () => {
    if (userCredits < 50) {
      alert('Insufficient credits for Premier filter search');
      return;
    }
    // In real app, would deduct credits and apply filter
    console.log('Applied Premier filters, deducted 50 credits');
  };

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Data Filters
            </div>
            <Button variant="outline" size="sm" onClick={clearAllFilters}>
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Foundational Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Foundational
            </Badge>
            <span className="text-sm font-medium">Basic Filters</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="industry">Industry</Label>
            <Select value={filters.industry || ''} onValueChange={(value) => updateFilter('industry', value)}>
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
            <Label htmlFor="location">Location</Label>
            <Select value={filters.location || ''} onValueChange={(value) => updateFilter('location', value)}>
              <SelectTrigger>
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
            <Label htmlFor="revenue">Annual Revenue</Label>
            <Select value={filters.revenue || ''} onValueChange={(value) => updateFilter('revenue', value)}>
              <SelectTrigger>
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

          <div>
            <Label htmlFor="employees">Company Size</Label>
            <Select value={filters.employees || ''} onValueChange={(value) => updateFilter('employees', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select company size" />
              </SelectTrigger>
              <SelectContent>
                {employeeCounts.map((count) => (
                  <SelectItem key={count} value={count}>
                    {count} employees
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      <Card className={!hasAdvanced ? 'opacity-50' : ''}>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              Advanced
            </Badge>
            <span className="text-sm font-medium">Advanced Filters</span>
            {!hasAdvanced && <Lock className="h-4 w-4 text-gray-400" />}
          </div>
        </CardHeader>
        <CardContent className={`space-y-4 ${!hasAdvanced ? 'pointer-events-none' : ''}`}>
          <div>
            <Label>Job Titles</Label>
            <div className="space-y-2 mt-2">
              {jobTitles.map((title) => (
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
                  <Label htmlFor={title} className="text-sm">{title}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="fundingStage">Funding Stage</Label>
            <Select
              value={filters.fundingStage || ''}
              onValueChange={(value) => updateFilter('fundingStage', value)}
            >
              <SelectTrigger>
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
        </CardContent>
      </Card>

      {/* Premier Filters */}
      <Card className={!hasPremier ? 'opacity-50' : ''}>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-purple-100 text-purple-800">
              Premier
            </Badge>
            <span className="text-sm font-medium">Premier Filters</span>
            {!hasPremier && <Lock className="h-4 w-4 text-gray-400" />}
          </div>
          {hasPremier && (
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center text-purple-600 text-sm">
                <Coins className="mr-1 h-4 w-4" />
                50 credits per search
              </div>
              <div className="text-sm text-gray-600">
                Balance: {userCredits.toLocaleString()} credits
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className={`space-y-4 ${!hasPremier ? 'pointer-events-none' : ''}`}>
          <div>
            <Label>Technographics</Label>
            <div className="space-y-2 mt-2">
              {technologies.map((tech) => (
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
                  <Label htmlFor={tech} className="text-sm">{tech}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Intent Signals</Label>
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
                  <Label htmlFor={signal} className="text-sm">{signal}</Label>
                </div>
              ))}
            </div>
          </div>

          {hasPremier && (
            <Button onClick={applyPremierFilter} className="w-full">
              <Coins className="mr-2 h-4 w-4" />
              Apply Premier Filters (-50 credits)
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataViewerFilters;
