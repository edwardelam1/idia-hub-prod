
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
import { getMaskedDataWarning } from '@/utils/dataAnonymizer';
import DataViewerFilters from './DataViewerFilters';
import SavedSearches from './SavedSearches';
import ContactLists from './ContactLists';

interface DataRecord {
  id: string;
  [key: string]: any;
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
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showContactLists, setShowContactLists] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [dataRecords, setDataRecords] = useState<DataRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DataRecord[]>([]);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);

  const itemsPerPage = isMobile ? 20 : 50;

  useEffect(() => {
    loadBundleData();
    generateBundleSpecificData();
  }, [bundleId]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [dataRecords, filters, searchTerm]);

  const loadBundleData = () => {
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
        tier: 'Analyst',
        contacts: 3421,
        features: ['IDIA Life Integration', 'Time-Series Analysis', 'Geographic Correlation', 'Community Metrics'],
        category: 'Academic & Research',
        description: 'Community engagement correlation with local business spending'
      }
    };

    const currentBundle = bundleMap[bundleId || '1'];
    setBundle(currentBundle);
  };

  const generateBundleSpecificData = () => {
    const currentBundleId = bundleId || '1';
    const bundleIdNumber = parseInt(currentBundleId);
    const mockData: DataRecord[] = [];
    let headers: string[] = [];

    switch (bundleIdNumber) {
      case 1: // VC Bundle - Kentucky Emerging Growth
        headers = ['Company', 'Funding Round', 'Amount Raised', 'Hiring Velocity', 'Industry', 'Location', 'Employee Growth'];
        const industries = ['FinTech', 'HealthTech', 'AI/ML', 'SaaS', 'E-commerce', 'BioTech'];
        const locations = ['Louisville', 'Lexington', 'Bowling Green', 'Covington', 'Frankfort'];
        for (let i = 0; i < 100; i++) {
          mockData.push({
            id: `vc-${i}`,
            company: `Kentucky Co ${i + 1}`,
            fundingRound: ['Series A', 'Series B', 'Seed', 'Pre-Series A'][i % 4],
            amountRaised: `$${(Math.random() * 5 + 0.5).toFixed(1)}M`,
            hiringVelocity: `+${Math.floor(Math.random() * 50 + 10)} employees`,
            industry: industries[i % industries.length],
            location: `${locations[i % locations.length]}, KY`,
            employeeGrowth: `${Math.floor(Math.random() * 200 + 50)}%`
          });
        }
        break;

      case 2: // CRM Bundle - Platform Migration
        headers = ['Company', 'Previous CRM', 'Migration Date', 'Company Size', 'Industry', 'Migration Reason'];
        const crmPlatforms = ['Salesforce', 'HubSpot', 'Pipedrive', 'Zoho', 'Microsoft Dynamics'];
        const companySizes = ['51-200', '201-500', '501-1000', '1000+'];
        for (let i = 0; i < 100; i++) {
          mockData.push({
            id: `crm-${i}`,
            company: `Tech Company ${i + 1}`,
            previousCrm: crmPlatforms[i % crmPlatforms.length],
            migrationDate: `Q${Math.floor(Math.random() * 4) + 1} 2024`,
            companySize: companySizes[i % companySizes.length],
            industry: ['Technology', 'SaaS', 'Professional Services', 'Manufacturing'][i % 4],
            migrationReason: ['Cost Reduction', 'Feature Limitations', 'Integration Issues', 'User Experience'][i % 4]
          });
        }
        break;

      case 3: // Real Estate Bundle - Louisville Corridors
        headers = ['Corridor', 'Transaction Volume', 'Growth Rate', 'Merchant Category', 'Avg Transaction', 'Peak Hours'];
        const corridors = ['Downtown', 'Highlands', 'Bardstown Road', 'Frankfort Avenue', 'Shelbyville Road'];
        const categories = ['Restaurant', 'Retail', 'Professional Services', 'Entertainment', 'Healthcare'];
        for (let i = 0; i < 100; i++) {
          mockData.push({
            id: `re-${i}`,
            corridor: corridors[i % corridors.length],
            transactionVolume: `${Math.floor(Math.random() * 500 + 200)}k`,
            growthRate: `+${Math.floor(Math.random() * 30 + 5)}%`,
            merchantCategory: categories[i % categories.length],
            avgTransaction: `$${Math.floor(Math.random() * 100 + 25)}`,
            peakHours: ['11am-2pm', '5pm-8pm', '7pm-10pm'][i % 3]
          });
        }
        break;

      case 4: // CPG Bundle - Beverage Trends
        headers = ['Product Category', 'Cafe Sales', 'Grocery Sales', 'Growth Trend', 'Price Point', 'Regional Preference'];
        const categories4 = ['Coffee', 'Tea', 'Energy Drinks', 'Smoothies', 'Kombucha', 'Specialty Beverages'];
        for (let i = 0; i < 100; i++) {
          mockData.push({
            id: `cpg-${i}`,
            productCategory: categories4[i % categories4.length],
            cafeSales: `$${Math.floor(Math.random() * 200 + 50)}k`,
            grocerySales: `$${Math.floor(Math.random() * 150 + 30)}k`,
            growthTrend: `${Math.random() > 0.5 ? '+' : '-'}${Math.floor(Math.random() * 20 + 5)}%`,
            pricePoint: ['Premium', 'Mid-tier', 'Value'][i % 3],
            regionalPreference: ['Urban', 'Suburban', 'Mixed'][i % 3]
          });
        }
        break;

      case 5: // Academic Bundle - Pro-Social Behavior
        headers = ['Metro Area', 'Community Actions', 'Local Spend Impact', 'Correlation Score', 'Population', 'Engagement Type'];
        const metroAreas = ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington'];
        const engagementTypes = ['Volunteering', 'Local Events', 'Community Projects', 'Environmental Initiatives'];
        for (let i = 0; i < 100; i++) {
          mockData.push({
            id: `academic-${i}`,
            metroArea: metroAreas[i % metroAreas.length],
            communityActions: Math.floor(Math.random() * 500 + 100),
            localSpendImpact: `+$${Math.floor(Math.random() * 50 + 10)}k`,
            correlationScore: `0.${Math.floor(Math.random() * 40 + 60)}`,
            population: `${Math.floor(Math.random() * 200 + 50)}k`,
            engagementType: engagementTypes[i % engagementTypes.length]
          });
        }
        break;

      default:
        headers = ['Data Point', 'Value', 'Category'];
        break;
    }

    setTableHeaders(headers);
    setDataRecords(mockData);
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...dataRecords];

    if (searchTerm) {
      filtered = filtered.filter(record =>
        Object.values(record).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply additional filters based on bundle type
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        filtered = filtered.filter(record => 
          String(record[key]) === filters[key]
        );
      }
    });

    setFilteredRecords(filtered);
    setCurrentPage(1);
  };

  const handleExport = (format: 'csv' | 'excel') => {
    console.log(`Exporting ${selectedRecords.length || filteredRecords.length} records as ${format}`);
  };

  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

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
      {paginatedRecords.map((record) => (
        <Card key={record.id} className="p-4">
          <div className="space-y-2">
            {Object.entries(record).map(([key, value]) => {
              if (key === 'id') return null;
              return (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="text-xs text-gray-900">{String(value)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );

  const DesktopTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          {tableHeaders.map((header) => (
            <TableHead key={header}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedRecords.map((record) => (
          <TableRow key={record.id}>
            {tableHeaders.map((header) => {
              const key = header.toLowerCase().replace(/\s+/g, '');
              const camelCaseKey = key.charAt(0).toLowerCase() + key.slice(1).replace(/\s+/g, '');
              return (
                <TableCell key={header}>
                  {String(record[camelCaseKey] || record[key] || '-')}
                </TableCell>
              );
            })}
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
                        {filteredRecords.length} of {dataRecords.length} records
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
                  placeholder="Search dataset records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${isMobile ? 'text-sm' : ''}`}
                />
              </div>
              {isMobile && (
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-600">
                    {filteredRecords.length} results
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
        selectedContacts={selectedRecords}
        allContacts={filteredRecords}
      />
    </div>
  );
};

export default DataViewer;
