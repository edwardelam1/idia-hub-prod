
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Download, 
  Coins, 
  Star, 
  TrendingUp, 
  Users, 
  Building2,
  Zap,
  Globe,
  Target,
  X,
  Heart,
  Share2,
  BookOpen
} from 'lucide-react';
import FilterModal from './FilterModal';
import DownloadModal from './DownloadModal';

interface DataMarketplaceProps {
  userRole: string;
}

const DataMarketplace = ({ userRole }: DataMarketplaceProps) => {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPersonalization, setShowPersonalization] = useState(true);
  const [appliedFilters, setAppliedFilters] = useState<any>({});
  const [userCredits, setUserCredits] = useState(12500);
  const [selectedBundle, setSelectedBundle] = useState<any>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [myLists, setMyLists] = useState<any[]>([]);

  const industries = [
    'Technology', 'Healthcare', 'Financial Services', 'Manufacturing',
    'Retail & E-commerce', 'Real Estate', 'Education', 'Professional Services'
  ];

  const aiCuratedBundles = [
    {
      id: 1,
      name: 'Tech Leadership Pipeline',
      description: 'C-level executives and VPs at high-growth technology companies with 100-500 employees',
      price: 150,
      contacts: 2450,
      tier: 'Premier',
      category: 'Technology',
      features: ['Intent Signals', 'Technographics', 'Recent Funding Data'],
      match: 95
    },
    {
      id: 2,
      name: 'Healthcare Decision Makers',
      description: 'CMOs, CTOs, and IT Directors at hospitals and healthcare systems',
      price: 85,
      contacts: 1200,
      tier: 'Advanced',
      category: 'Healthcare',
      features: ['Geographic Targeting', 'Org Charts', 'Recent Job Changes'],
      match: 88
    },
    {
      id: 3,
      name: 'SaaS Growth Companies',
      description: 'Marketing and sales leaders at B2B SaaS companies in expansion phase',
      price: 45,
      contacts: 890,
      tier: 'Foundational',
      category: 'Technology',
      features: ['Industry Classification', 'Company Size', 'Location Data'],
      match: 92
    },
    {
      id: 4,
      name: 'Financial Services Executives',
      description: 'Senior leadership at banks, credit unions, and fintech companies',
      price: 200,
      contacts: 3200,
      tier: 'Premier',
      category: 'Financial Services',
      features: ['Intent Signals', 'Technographics', 'Compliance Data'],
      match: 90
    }
  ];

  const handlePersonalizationComplete = (industry: string, subcategories: string[]) => {
    setSelectedIndustry(industry);
    setShowPersonalization(false);
  };

  const handleApplyFilters = (filters: any) => {
    setAppliedFilters(filters);
  };

  const handleDownloadBundle = (bundle: any) => {
    setSelectedBundle(bundle);
    setShowDownloadModal(true);
  };

  const handleConfirmDownload = (bundleId: number, cost: number) => {
    setUserCredits(prev => prev - cost);
    setShowDownloadModal(false);
    console.log(`Downloaded bundle ${bundleId} for ${cost} credits`);
  };

  const handleSaveSearch = () => {
    const searchData = {
      id: Date.now(),
      name: `Search: ${searchQuery || 'Current filters'}`,
      query: searchQuery,
      filters: appliedFilters,
      timestamp: new Date().toISOString()
    };
    setSavedSearches(prev => [...prev, searchData]);
  };

  const handleCreateList = (bundleData: any) => {
    const listData = {
      id: Date.now(),
      name: `List from ${bundleData.name}`,
      contacts: bundleData.contacts,
      source: bundleData.name,
      timestamp: new Date().toISOString()
    };
    setMyLists(prev => [...prev, listData]);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Premier': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Advanced': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Foundational': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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

  // Filter bundles based on search and applied filters
  const filteredBundles = aiCuratedBundles.filter(bundle => {
    const matchesSearch = !searchQuery || 
      bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bundle.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesIndustry = !appliedFilters.industry || bundle.category === appliedFilters.industry;
    
    return matchesSearch && matchesIndustry;
  });

  // Get active filter count
  const activeFilterCount = Object.keys(appliedFilters).filter(key => appliedFilters[key]).length;

  if (showPersonalization) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center">
              <Target className="mr-2 h-6 w-6 text-purple-600" />
              Personalize Your Experience
            </CardTitle>
            <CardDescription>
              Help us tailor the marketplace to show you the most relevant data bundles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="industry">Primary Industry</Label>
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
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
              <Label>Focus Areas (Select all that apply)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {['Lead Generation', 'Market Research', 'Competitive Analysis', 'Customer Intelligence', 'Account Planning', 'Territory Expansion'].map((area) => (
                  <div key={area} className="flex items-center space-x-2">
                    <input type="checkbox" id={area} className="rounded" />
                    <label htmlFor={area} className="text-sm">{area}</label>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => handlePersonalizationComplete(selectedIndustry, [])}
              disabled={!selectedIndustry}
            >
              Continue to Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Marketplace</h1>
          <p className="text-gray-600 mt-2">Discover AI-curated data bundles tailored to your industry and needs</p>
        </div>
        
        {/* Credit Balance */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <Coins className="h-5 w-5 text-purple-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Credit Balance</p>
              <p className="text-xl font-bold text-purple-600">{userCredits.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search data bundles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={appliedFilters.industry || ''} onValueChange={(value) => setAppliedFilters({...appliedFilters, industry: value || undefined})}>
                <SelectTrigger className="w-40">
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

              <Button variant="outline" onClick={handleSaveSearch}>
                <Heart className="mr-2 h-4 w-4" />
                Save Search
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(appliedFilters).map(([key, value]) => {
                if (!value) return null;
                return (
                  <Badge key={key} variant="secondary" className="flex items-center">
                    {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
                    <X 
                      className="ml-1 h-3 w-3 cursor-pointer" 
                      onClick={() => setAppliedFilters({...appliedFilters, [key]: undefined})}
                    />
                  </Badge>
                );
              })}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setAppliedFilters({})}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI-Curated Bundles */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI-Curated for You</h2>
            <p className="text-gray-600">
              {filteredBundles.length} data bundles found
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
          <Badge className="bg-purple-100 text-purple-800">
            <Star className="mr-1 h-3 w-3" />
            Powered by AI Data Curator
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBundles.map((bundle) => (
            <Card key={bundle.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{bundle.name}</CardTitle>
                    <Badge className={getTierColor(bundle.tier)} variant="outline">
                      {bundle.tier}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-purple-600 font-semibold">
                      <Coins className="mr-1 h-4 w-4" />
                      {bundle.price}
                    </div>
                    <p className="text-xs text-gray-500">credits</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">{bundle.description}</CardDescription>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-gray-600">
                      <Users className="mr-1 h-4 w-4" />
                      Contacts
                    </span>
                    <span className="font-medium">{bundle.contacts.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-gray-600">
                      <TrendingUp className="mr-1 h-4 w-4" />
                      Match Score
                    </span>
                    <span className="font-medium text-green-600">{bundle.match}%</span>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Includes:</p>
                    <div className="flex flex-wrap gap-1">
                      {bundle.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button 
                    className="flex-1"
                    onClick={() => handleDownloadBundle(bundle)}
                    disabled={userCredits < bundle.price}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {userCredits < bundle.price ? 'Insufficient Credits' : 'Download'}
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreateList(bundle)}
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBundles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No bundles found matching your criteria.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setAppliedFilters({});
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Download Modal */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        bundle={selectedBundle}
        userCredits={userCredits}
        onConfirmDownload={handleConfirmDownload}
      />
    </div>
  );
};

export default DataMarketplace;
