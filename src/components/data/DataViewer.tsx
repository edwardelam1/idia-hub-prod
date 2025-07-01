
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Filter, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useResponsive } from '@/hooks/useResponsive';
import { getMaskedDataWarning } from '@/utils/dataAnonymizer';
import { useBundleData } from '@/hooks/useBundleData';
import { useDataGeneration } from '@/hooks/useDataGeneration';
import DataViewerHeader from './DataViewerHeader';
import DataViewerSearch from './DataViewerSearch';
import DataViewerTable from './DataViewerTable';
import DataViewerSidebar from './DataViewerSidebar';
import SavedSearches from './SavedSearches';
import ContactLists from './ContactLists';

interface DataRecord {
  id: string;
  [key: string]: any;
}

const DataViewer = () => {
  const { bundleId, purchaseId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showContactLists, setShowContactLists] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filteredRecords, setFilteredRecords] = useState<DataRecord[]>([]);

  const bundle = useBundleData(bundleId);
  const { dataRecords, tableHeaders, headerToKeyMapping } = useDataGeneration(bundle, bundleId);

  const itemsPerPage = isMobile ? 20 : 50;

  useEffect(() => {
    applyFiltersAndSearch();
  }, [dataRecords, filters, searchTerm]);

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
    <DataViewerSidebar
      filters={filters}
      onFiltersChange={setFilters}
      bundle={bundle}
      isMobile={isMobile}
    />
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
            <DataViewerHeader
              bundle={bundle}
              filteredCount={filteredRecords.length}
              totalCount={dataRecords.length}
              onShare={() => setShowSavedSearches(true)}
              onSave={() => setShowContactLists(true)}
              onExport={() => handleExport('csv')}
            />
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
          <DataViewerSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filteredCount={filteredRecords.length}
            onSavedSearches={() => setShowSavedSearches(true)}
            onExport={() => handleExport('csv')}
            isMobile={isMobile}
          />

          {/* Data Table */}
          <DataViewerTable
            paginatedRecords={paginatedRecords}
            tableHeaders={tableHeaders}
            headerToKeyMapping={headerToKeyMapping}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            isMobile={isMobile}
          />
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
