
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Coins, 
  Star, 
  TrendingUp, 
  Users, 
  X,
  Filter
} from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { anonymizeBundleData } from '@/utils/dataAnonymizer';
import { useNavigate } from 'react-router-dom';
import FilterModal from './FilterModal';

interface DataMarketplaceProps {
  userRole: string;
}

const DataMarketplace = ({ userRole }: DataMarketplaceProps) => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<any>({});
  const [userCredits, setUserCredits] = useState(12500);

  const industries = [
    'Venture Capital & Private Equity', 'SaaS & Technology', 'Commercial Real Estate', 
    'Consumer Packaged Goods', 'Academic & Research', 'Financial Services'
  ];

  // Enterprise-grade bundles based on realistic IDIA use cases
  const aiCuratedBundles = [
    {
      id: 1,
      name: 'Q2 2025 Emerging Growth Index: Kentucky',
      description: 'Premier dataset of private companies in Kentucky that have secured new capital and are exhibiting significant hiring velocity in the last 90 days. Provides actionable triggers for investment sourcing and private banking outreach.',
      price: 350,
      contacts: 1847,
      tier: 'Enterprise',
      category: 'Venture Capital & Private Equity',
      features: ['Intent Signals', 'Advanced Hiring Trends', 'Geographic Targeting', 'Funding Status'],
      match: 97
    },
    {
      id: 2,
      name: 'CRM Competitive Displacement Opportunity Report',
      description: 'High-intent list of mid-market companies that have recently removed competing CRM platforms from their tech stack. Identifies prospects at the exact moment of need.',
      price: 125,
      contacts: 892,
      tier: 'Professional',
      category: 'SaaS & Technology',
      features: ['Technographics', 'Intent Signals', 'Company Size Filtering', 'Platform Migration Data'],
      match: 94
    },
    {
      id: 3,
      name: 'Louisville Commercial Corridor Velocity Analysis',
      description: 'Time-series analysis of anonymized transaction growth across Louisville\'s key commercial corridors, segmented by merchant category. Provides data-driven edge for site selection and investment.',
      price: 225,
      contacts: 2456,
      tier: 'Enterprise',
      category: 'Commercial Real Estate',
      features: ['Advanced Time-Series Analysis', 'Geographic Targeting', 'Merchant Categories', 'Transaction Velocity'],
      match: 91
    },
    {
      id: 4,
      name: 'Consumer Beverage Trends: Cafe vs. Grocery Spend',
      description: 'Aggregated, anonymized report tracking consumer spending velocity for beverage products. Compares basket share and growth trends between retail and food service channels.',
      price: 150,
      contacts: 1234,
      tier: 'Professional',
      category: 'Consumer Packaged Goods',
      features: ['Anonymized Merchant IDs', 'Category Comparison', 'Trend Analysis', 'Channel Strategy'],
      match: 89
    },
    {
      id: 5,
      name: 'Pro-Social Behavior and Local Economic Impact Study',
      description: 'Anonymized dataset correlating hyperlocal economic activity with community engagement metrics. Helps researchers explore the relationship between pro-social behavior and local business spending.',
      price: 50,
      contacts: 3421,
      tier: 'Foundational',
      category: 'Academic & Research',
      features: ['IDIA Life Integration', 'Time-Series Analysis', 'Geographic Correlation', 'Community Metrics'],
      match: 86
    }
  ].map(bundle => anonymizeBundleData(bundle));

  const handleDownloadBundle = (bundle: any) => {
    if (userCredits >= bundle.price) {
      setUserCredits(prev => prev - bundle.price);
      navigate(`/data-viewer/${bundle.id}`);
    }
  };

  const handleApplyFilters = (filters: any) => {
    setAppliedFilters(filters);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Enterprise': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Professional': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Foundational': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter bundles based on search and applied filters
  const filteredBundles = aiCuratedBundles.filter(bundle => {
    const matchesSearch = !searchQuery || 
      bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bundle.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesIndustry = !appliedFilters.industry || bundle.category === appliedFilters.industry;
    
    return matchesSearch && matchesIndustry;
  });

  const activeFilterCount = Object.keys(appliedFilters).filter(key => appliedFilters[key]).length;

  return (
    <div className={`space-y-4 ${isMobile ? 'p-2' : 'p-6'} bg-gray-50 min-h-screen`}>
      {/* Minimalistic Header */}
      <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center justify-between'}`}>
        <div>
          <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-3xl'}`}>
            IDIA Data Marketplace
          </h1>
          <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
            Enterprise-grade AI-curated datasets
          </p>
        </div>
        
        {/* Credit Balance - Minimal */}
        <div className={`flex items-center space-x-2 ${isMobile ? 'self-end' : ''}`}>
          <Coins className="h-4 w-4 text-purple-600" />
          <span className={`font-bold text-purple-600 ${isMobile ? 'text-sm' : ''}`}>
            {userCredits.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Minimalistic Search and Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className={isMobile ? 'p-3' : 'p-4'}>
          <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'gap-3'}`}>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search enterprise datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 border-gray-200 ${isMobile ? 'text-sm' : ''}`}
              />
            </div>
            
            <div className={`flex ${isMobile ? 'space-x-2' : 'gap-2'}`}>
              <Select 
                value={appliedFilters.industry || ''} 
                onValueChange={(value) => setAppliedFilters({...appliedFilters, industry: value || undefined})}
              >
                <SelectTrigger className={`${isMobile ? 'w-32 text-xs' : 'w-40'} border-gray-200`}>
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <FilterModal 
                userRole={userRole}
                onApplyFilters={handleApplyFilters}
                currentFilters={appliedFilters}
              />
            </div>
          </div>

          {/* Active Filters - Minimal */}
          {activeFilterCount > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {Object.entries(appliedFilters).map(([key, value]) => {
                if (!value) return null;
                return (
                  <Badge key={key} variant="secondary" className={`flex items-center ${isMobile ? 'text-xs px-2 py-1' : ''}`}>
                    {String(value)}
                    <X 
                      className="ml-1 h-3 w-3 cursor-pointer" 
                      onClick={() => setAppliedFilters({...appliedFilters, [key]: undefined})}
                    />
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Header - Minimal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className={`font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-xl'}`}>
            Available Datasets
          </h2>
          <Badge className="bg-purple-100 text-purple-800 text-xs">
            <Star className="mr-1 h-3 w-3" />
            AI Curated
          </Badge>
        </div>
        <span className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {filteredBundles.length} datasets
        </span>
      </div>

      {/* Minimalistic Bundle Grid */}
      <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2'}`}>
        {filteredBundles.map((bundle) => (
          <Card key={bundle.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className={isMobile ? 'p-4' : 'p-5'}>
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <h3 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                      {bundle.name}
                    </h3>
                    <Badge className={`${getTierColor(bundle.tier)} text-xs`} variant="outline">
                      {bundle.tier}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center text-purple-600 font-semibold ${isMobile ? 'text-sm' : ''}`}>
                      <Coins className="mr-1 h-3 w-3" />
                      {bundle.price}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {bundle.description}
                </p>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center">
                    <Users className="mr-1 h-3 w-3" />
                    {bundle.contacts.toLocaleString()} records
                  </div>
                  <div className="flex items-center text-green-600">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    {bundle.match}% relevance
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-1">
                  {bundle.features.slice(0, isMobile ? 2 : 3).map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                      {feature}
                    </Badge>
                  ))}
                  {bundle.features.length > (isMobile ? 2 : 3) && (
                    <Badge variant="secondary" className="text-xs px-2 py-0">
                      +{bundle.features.length - (isMobile ? 2 : 3)}
                    </Badge>
                  )}
                </div>

                {/* Action */}
                <Button 
                  className={`w-full ${isMobile ? 'text-sm py-2' : ''}`}
                  onClick={() => handleDownloadBundle(bundle)}
                  disabled={userCredits < bundle.price}
                >
                  {userCredits < bundle.price ? 'Insufficient Credits' : 'Access Dataset'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBundles.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No datasets found matching your criteria.</p>
          <Button 
            variant="outline" 
            className="mt-3"
            onClick={() => {
              setSearchQuery('');
              setAppliedFilters({});
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Privacy Notice */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className={isMobile ? 'p-3' : 'p-4'}>
          <p className={`text-purple-700 ${isMobile ? 'text-xs' : 'text-sm'} text-center`}>
            🔒 All datasets are fully anonymized and aggregated to protect individual privacy. Enterprise-grade data with zero personal identifiable information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataMarketplace;
