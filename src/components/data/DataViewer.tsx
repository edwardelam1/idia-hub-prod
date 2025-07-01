
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { ArrowLeft, Search, Download, Share, Save, Filter } from 'lucide-react';
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
}

const DataViewer = () => {
  const { bundleId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showContactLists, setShowContactLists] = useState(false);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);

  const itemsPerPage = 50;

  useEffect(() => {
    // Load bundle data based on bundleId
    loadBundleData();
    generateMockContacts();
  }, [bundleId]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [contacts, filters, searchTerm]);

  const loadBundleData = () => {
    // Mock bundle data - in real app this would come from props or API
    const mockBundle: Bundle = {
      id: parseInt(bundleId || '1'),
      name: 'Technology Companies - Bay Area',
      tier: 'Advanced',
      contacts: 2500,
      features: ['Company Info', 'Contact Details', 'Technographics', 'Org Charts']
    };
    setBundle(mockBundle);
  };

  const generateMockContacts = () => {
    const mockContacts: Contact[] = [];
    const names = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Eva Brown', 'Frank Miller', 'Grace Lee', 'Henry Clark', 'Iris Taylor', 'Jack Anderson'];
    const titles = ['CEO', 'CTO', 'VP Sales', 'Marketing Director', 'Product Manager', 'Engineering Manager', 'Sales Manager', 'Head of Operations'];
    const companies = ['TechCorp', 'DataSystems', 'CloudFirst', 'AI Innovations', 'CyberSolutions', 'DevTools Inc', 'StartupLab', 'Enterprise Co'];
    const industries = ['Technology', 'Software', 'SaaS', 'AI/ML', 'Cybersecurity', 'Cloud Services'];
    const locations = ['San Francisco, CA', 'Palo Alto, CA', 'Mountain View, CA', 'San Jose, CA', 'Oakland, CA'];
    const revenues = ['$1M-$10M', '$10M-$50M', '$50M-$100M', '$100M+'];
    const employeeCounts = ['1-50', '51-200', '201-1000', '1000+'];
    const techs = ['Salesforce', 'HubSpot', 'AWS', 'Google Cloud', 'Microsoft Azure', 'Slack', 'Zoom'];
    const intents = ['Hiring', 'Fundraising', 'Expanding', 'Technology Migration'];

    for (let i = 0; i < 100; i++) {
      mockContacts.push({
        id: `contact-${i}`,
        name: names[i % names.length],
        title: titles[i % titles.length],
        company: companies[i % companies.length],
        industry: industries[i % industries.length],
        email: `${names[i % names.length].toLowerCase().replace(' ', '.')}@${companies[i % companies.length].toLowerCase().replace(' ', '')}.com`,
        phone: `+1 (555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        location: locations[i % locations.length],
        revenue: revenues[i % revenues.length],
        employees: employeeCounts[i % employeeCounts.length],
        technographics: [techs[i % techs.length], techs[(i + 1) % techs.length]],
        intentSignals: [intents[i % intents.length]]
      });
    }
    setContacts(mockContacts);
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...contacts];

    // Apply search
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
    if (filters.revenue) {
      filtered = filtered.filter(contact => contact.revenue === filters.revenue);
    }
    if (filters.employees) {
      filtered = filtered.filter(contact => contact.employees === filters.employees);
    }

    setFilteredContacts(filtered);
    setCurrentPage(1);
  };

  const handleExport = (format: 'csv' | 'excel') => {
    console.log(`Exporting ${selectedContacts.length || filteredContacts.length} contacts as ${format}`);
    // Implementation would handle actual export
  };

  const handleShare = () => {
    setShowSavedSearches(true);
  };

  const handleSave = () => {
    setShowContactLists(true);
  };

  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);

  if (!bundle) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex gap-6">
        {/* Left Sidebar - Filters */}
        <div className="w-80 space-y-4">
          <Button
            variant="outline"
            onClick={() => navigate('/marketplace')}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Marketplace
          </Button>

          <DataViewerFilters
            filters={filters}
            onFiltersChange={setFilters}
            bundle={bundle}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Header */}
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
                    <span className="text-sm text-gray-600">
                      {filteredContacts.length} of {contacts.length} contacts
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={handleShare}>
                    <Share className="mr-2 h-4 w-4" />
                    Share Search
                  </Button>
                  <Button variant="outline" onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Save to List
                  </Button>
                  <Button onClick={() => handleExport('csv')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Search Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search contacts, companies, titles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardContent className="pt-6">
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
                          <div>{contact.email}</div>
                          <div className="text-gray-500">{contact.phone}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
