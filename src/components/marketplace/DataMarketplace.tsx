
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
  Filter, 
  Download, 
  Coins, 
  Star, 
  TrendingUp, 
  Users, 
  Building2,
  Zap,
  Globe,
  Target
} from 'lucide-react';

interface DataMarketplaceProps {
  userRole: string;
}

const DataMarketplace = ({ userRole }: DataMarketplaceProps) => {
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPersonalization, setShowPersonalization] = useState(true);

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
    }
  ];

  const handlePersonalizationComplete = (industry: string, subcategories: string[]) => {
    setSelectedIndustry(industry);
    setShowPersonalization(false);
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Data Marketplace</h1>
        <p className="text-gray-600 mt-2">Discover AI-curated data bundles tailored to your industry and needs</p>
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
              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Advanced Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Access Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Zap className="h-5 w-5 text-blue-600 mr-2" />
          <div>
            <p className="font-medium text-blue-900">Your Filter Access</p>
            <p className="text-sm text-blue-700">
              Available: {filterAccess.join(', ')} filters • 
              {!filterAccess.includes('Premier') && ' Upgrade for Premier filters with Intent Signals & Technographics'}
            </p>
          </div>
        </div>
      </div>

      {/* AI-Curated Bundles */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI-Curated for You</h2>
            <p className="text-gray-600">Data bundles specifically selected based on your profile and industry</p>
          </div>
          <Badge className="bg-purple-100 text-purple-800">
            <Star className="mr-1 h-3 w-3" />
            Powered by AI Data Curator
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiCuratedBundles.map((bundle) => (
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

                <Button className="w-full mt-4">
                  <Download className="mr-2 h-4 w-4" />
                  Download Bundle
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Browse All Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Browse All Categories</CardTitle>
          <CardDescription>Explore data bundles across different industries and use cases</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="industry" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="industry">By Industry</TabsTrigger>
              <TabsTrigger value="role">By Role</TabsTrigger>
              <TabsTrigger value="company-size">Company Size</TabsTrigger>
              <TabsTrigger value="geography">Geography</TabsTrigger>
            </TabsList>
            
            <TabsContent value="industry" className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {industries.map((industry) => (
                  <Card key={industry} className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardContent className="p-4 text-center">
                      <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="font-medium text-sm">{industry}</p>
                      <p className="text-xs text-gray-500 mt-1">12-45 bundles</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="role" className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['C-Level Executives', 'IT Decision Makers', 'Marketing Leaders', 'Sales Directors', 'HR Managers', 'Procurement Officers'].map((role) => (
                  <Card key={role} className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardContent className="p-4 text-center">
                      <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="font-medium text-sm">{role}</p>
                      <p className="text-xs text-gray-500 mt-1">8-24 bundles</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="company-size" className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Startups (1-50)', 'SMB (51-500)', 'Enterprise (500-5K)', 'Large Enterprise (5K+)'].map((size) => (
                  <Card key={size} className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="font-medium text-sm">{size}</p>
                      <p className="text-xs text-gray-500 mt-1">15-32 bundles</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="geography" className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Global'].map((region) => (
                  <Card key={region} className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardContent className="p-4 text-center">
                      <Globe className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                      <p className="font-medium text-sm">{region}</p>
                      <p className="text-xs text-gray-500 mt-1">20-58 bundles</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataMarketplace;
