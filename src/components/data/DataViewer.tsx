import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { ArrowLeft, Search, Download, Share, Save, Filter, Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useResponsive } from '@/hooks/useResponsive';
import { anonymizeContact, getMaskedDataWarning } from '@/utils/dataAnonymizer';
import DataViewerFilters from './DataViewerFilters';
import SavedSearches from './SavedSearches';
import ContactLists from './ContactLists';

interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  email: string;
  phone: string;
  location: string;
  revenue?: string;
  employees?: string;
  technographics?: string[];
  intentSignals?: string[];
}

interface Bundle {
  id: number;
  name: string;
  tier: string;
  contacts: number;
  features: string[];
  category: string;
  description: string;
}

const DataViewer = () => {
  const { bundleId } = useParams();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showContactLists, setShowContactLists] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);

  const itemsPerPage = isMobile ? 20 : 50;

  useEffect(() => {
    loadBundleData();
    generateMockContacts();
  }, [bundleId]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [contacts, filters, searchTerm]);

  const loadBundleData = () => {
    // Enterprise bundles matching the marketplace
    const bundleMap: { [key: string]: Bundle } = {
      '1': {
        id: 1,
        name: 'Q2 2025 Emerging Growth Index: Kentucky',
        tier: 'Enterprise',
        contacts: 1847,
        features: ['Intent Signals', 'Advanced Hiring Trends', 'Geographic Targeting', 'Funding Status'],
        category: 'Venture Capital & Private Equity',
        description: 'Premier dataset of private companies in Kentucky with new capital and hiring velocity'
      },
      '2': {
        id: 2,
        name: 'CRM Competitive Displacement Opportunity Report',
        tier: 'Professional',
        contacts: 892,
        features: ['Technographics', 'Intent Signals', 'Company Size Filtering', 'Platform Migration Data'],
        category: 'SaaS & Technology',
        description: 'Companies that recently removed competing CRM platforms'
      },
      '3': {
        id: 3,
        name: 'Louisville Commercial Corridor Velocity Analysis',
        tier: 'Enterprise',
        contacts: 2456,
        features: ['Advanced Time-Series Analysis', 'Geographic Targeting', 'Merchant Categories', 'Transaction Velocity'],
        category: 'Commercial Real Estate',
        description: 'Transaction growth analysis across Louisville commercial corridors'
      },
      '4': {
        id: 4,
        name: 'Consumer Beverage Trends: Cafe vs. Grocery Spend',
        tier: 'Professional',
        contacts: 1234,
        features: ['Anonymized Merchant IDs', 'Category Comparison', 'Trend Analysis', 'Channel Strategy'],
        category: 'Consumer Packaged Goods',
        description: 'Consumer spending velocity for beverage products across channels'
      },
      '5': {
        id: 5,
        name: 'Pro-Social Behavior and Local Economic Impact Study',
        tier: 'Foundational',
        contacts: 3421,
        features: ['IDIA Life Integration', 'Time-Series Analysis', 'Geographic Correlation', 'Community Metrics'],
        category: 'Academic & Research',
        description: 'Community engagement correlation with local business spending'
      }
    };

    const currentBundle = bundleMap[bundleId || '1'];
    setBundle(currentBundle);
  };

  const generateMockContacts = () => {
    const bundleId = parseInt(bundleId || '1');
    const mockContacts: Contact[] = [];
    
    // Generate different data based on bundle type
    const bundleSpecificData = {
      1: { // VC Bundle
        titles: ['CEO', 'Founder', 'CFO', 'VP Finance', 'Head of Growth', 'CTO'],
        industries: ['FinTech', 'HealthTech', 'AI/ML', 'SaaS', 'E-commerce', 'BioTech'],
        locations: ['Louisville, KY', 'Lexington, KY', 'Bowling Green, KY', 'Covington, KY']
      },
      2: { // CRM Bundle
        titles: ['VP Sales', 'Sales Director', 'Revenue Operations', 'CRM Administrator', 'Sales Manager'],
        industries: ['Technology', 'Software', 'SaaS', 'Professional Services', 'Manufacturing'],
        locations: ['San Francisco, CA', 'Austin, TX', 'Boston, MA', 'Seattle, WA', 'Denver, CO']
      },
      3: { // Real Estate Bundle
        titles: ['Property Manager', 'Leasing Director', 'Development Manager', 'Investment Analyst'],
        industries: ['Commercial Real Estate', 'Property Management', 'Real Estate Investment'],
        locations: ['Louisville, KY Metro Area', 'Jefferson County, KY', 'Oldham County, KY']
      },
      4: { // CPG Bundle
        titles: ['Brand Manager', 'Category Manager', 'Market Research Analyst', 'Procurement Manager'],
        industries: ['Consumer Goods', 'Retail', 'Food & Beverage', 'Distribution'],
        locations: ['Chicago, IL', 'Atlanta, GA', 'Dallas, TX', 'Minneapolis, MN']
      },
      5: { // Academic Bundle
        titles: ['Research Director', 'Policy Analyst', 'Community Outreach Manager', 'Program Coordinator'],
        industries: ['Non-Profit', 'Government', 'Academic Research', 'Community Development'],
        locations: ['Various Metro Areas', 'Community-Based Organizations', 'Research Institutions']
      }
    };

    const currentBundleData = bundleSpecificData[bundleId as keyof typeof bundleSpecificData] || bundleSpecificData[1];
    const revenues = ['$1M-$10M', '$10M-$50M', '$50M-$100M', '$100M+'];
    const employeeCounts = ['1-50', '51-200', '201-1000', '1000+'];

    for (let i = 0; i < 100; i++) {
      const rawContact = {
        id: `contact-${i}`,
        name: `Contact ${i}`,
        title: currentBundleData.titles[i % currentBundleData.titles.length],
        company: `Company ${Math.floor(i / 5)}`,
        industry: currentBundleData.industries[i % currentBundleData.industries.length],
        email: `contact${i}@example.com`,
        phone: `+1 555 ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        location: currentBundleData.locations[i % currentBundleData.locations.length],
        revenue: revenues[i % revenues.length],
        employees: employeeCounts[i % employeeCounts.length],
      };

      // CRITICAL: Anonymize all contact data
      mockContacts.push(anonymizeContact(rawContact, i));
    }
    setContacts(mockContacts);
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...contacts];

    if (searchTerm) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.industry.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.industry) {
      filtered = filtered.filter(contact => contact.industry === filters.industry);
    }
    if (filters.location) {
      filtered = filtered.filter(contact => contact.location.includes(filters.location));
    }

    setFilteredContacts(filtered);
    setCurrentPage(1);
  };

  const handleExport = (format: 'csv' | 'excel') => {
    console.log(`Exporting ${selectedContacts.length || filteredContacts.length} contacts as ${format}`);
  };

  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);

  if (!bundle) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const FilterSidebar = () => (
    <div className={`${isMobile ? 'h-full' : 'w-80'} space-y-4`}>
      {!isMobile && (
        <Button
          variant="outline"
          onClick={() => navigate('/marketplace')}
          className="w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Marketplace
        </Button>
      )}

      <DataViewerFilters
        filters={filters}
        onFiltersChange={setFilters}
        bundle={bundle}
      />
    </div>
  );

  const MobileTable = () => (
    <div className="space-y-3">
      {paginatedContacts.map((contact) => (
        <Card key={contact.id} className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{contact.name}</p>
                <p className="text-xs text-gray-600">{contact.title}</p>
              </div>
              <Badge variant="outline" className="text-xs">{contact.industry}</Badge>
            </div>
            <div className="text-xs text-gray-600">
              <p>{contact.company}</p>
              <p>{contact.location}</p>
              <p className="text-purple-600">{contact.email}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const DesktopTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Industry</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Contact</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedContacts.map((contact) => (
          <TableRow key={contact.id}>
            <TableCell className="font-medium">{contact.name}</TableCell>
            <TableCell>{contact.title}</TableCell>
            <TableCell>{contact.company}</TableCell>
            <TableCell>{contact.industry}</TableCell>
            <TableCell>{contact.location}</TableCell>
            <TableCell>
              <div className="text-sm">
                <div className="text-purple-600">{contact.email}</div>
                <div className="text-gray-500">{contact.phone}</div>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'p-2' : 'p-6'}`}>
      {/* Mobile Header */}
      {isMobile && (
        <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg shadow-sm">
          <Button variant="ghost" size="sm" onClick={() => navigate('/marketplace')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold text-sm truncate mx-2">{bundle.name}</h1>
          <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-sm p-0">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Filters</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowMobileFilters(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <FilterSidebar />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      <div className={`flex ${isMobile ? 'flex-col' : 'gap-6'}`}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="w-80">
            <FilterSidebar />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Header */}
          {!isMobile && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Filter className="mr-2 h-5 w-5" />
                      {bundle.name}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        {bundle.tier}
                      </Badge>
                      <Badge variant="outline" className="bg-gray-100 text-gray-800">
                        {bundle.category}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {filteredContacts.length} of {contacts.length} records
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setShowSavedSearches(true)}>
                      <Share className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                    <Button variant="outline" onClick={() => setShowContactLists(true)}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <Button onClick={() => handleExport('csv')}>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Data Privacy Warning */}
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className={`${isMobile ? 'p-3' : 'pt-6'}`}>
              <p className={`text-purple-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {getMaskedDataWarning()}
              </p>
            </CardContent>
          </Card>

          {/* Search Bar */}
          <Card>
            <CardContent className={isMobile ? 'p-3' : 'pt-6'}>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search anonymized records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${isMobile ? 'text-sm' : ''}`}
                />
              </div>
              {isMobile && (
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-600">
                    {filteredContacts.length} results
                  </span>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setShowSavedSearches(true)}>
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardContent className={isMobile ? 'p-3' : 'pt-6'}>
              {isMobile ? <MobileTable /> : <DesktopTable />}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(isMobile ? 3 : 5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <SavedSearches
        isOpen={showSavedSearches}
        onClose={() => setShowSavedSearches(false)}
        currentFilters={filters}
        searchTerm={searchTerm}
      />

      <ContactLists
        isOpen={showContactLists}
        onClose={() => setShowContactLists(false)}
        selectedContacts={selectedContacts}
        allContacts={filteredContacts}
      />
    </div>
  );
};

export default DataViewer;
