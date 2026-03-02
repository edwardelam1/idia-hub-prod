import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Filter, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useResponsive } from "@/hooks/useResponsive";
import { getMaskedDataWarning } from "@/utils/dataAnonymizer";
import { useBundleData } from "@/hooks/useBundleData";
import { useDataGeneration } from "@/hooks/useDataGeneration";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import DataViewerHeader from "./DataViewerHeader";
import DataViewerSearch from "./DataViewerSearch";
import DataViewerTable from "./DataViewerTable";
import DataViewerSidebar from "./DataViewerSidebar";
import SavedSearches from "./SavedSearches";
import ContactLists from "./ContactLists";
import NoDataState from "@/components/health/NoDataState";
import HealthDataInput from "@/components/health/HealthDataInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataRecord } from "@/types/marketplace";

// Error Boundary Component
const ErrorBoundary = ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

const DataViewer = () => {
  const { bundleId, purchaseId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showContactLists, setShowContactLists] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showAddDataModal, setShowAddDataModal] = useState(false);
  const [filteredRecords, setFilteredRecords] = useState<DataRecord[]>([]);

  const { healthStats } = useHealthMetrics();

  const { bundle, loading: bundleLoading, error: bundleError } = useBundleData(bundleId);
  const {
    dataRecords,
    tableHeaders,
    headerToKeyMapping,
    loading: dataLoading,
    error: dataError,
  } = useDataGeneration(bundle, bundleId);

  const loading = bundleLoading || dataLoading;
  const error = bundleError || dataError;

  const itemsPerPage = isMobile ? 20 : 50;

  useEffect(() => {
    applyFiltersAndSearch();
  }, [dataRecords, filters, searchTerm]);

  const applyFiltersAndSearch = () => {
    let filtered = [...dataRecords];

    if (searchTerm) {
      filtered = filtered.filter((record) =>
        Object.values(record).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }

    // Apply activity type filter
    if (filters.activity_type) {
      filtered = filtered.filter(
        (record) => record.activity_type === filters.activity_type || record.type === filters.activity_type,
      );
    }

    // Apply device type filter
    if (filters.device_type) {
      filtered = filtered.filter((record) => record.device_type === filters.device_type);
    }

    // Apply minimum duration filter (Handling both minutes and raw seconds)
    if (filters.min_duration) {
      filtered = filtered.filter((record) => {
        const durationMins = record.duration_minutes || (record.duration_seconds ? record.duration_seconds / 60 : 0);
        return durationMins >= parseInt(filters.min_duration);
      });
    }

    // Apply minimum distance filter (Handling both KM and Meters)
    if (filters.min_distance) {
      filtered = filtered.filter((record) => {
        const distanceKm = record.distance_km
          ? parseFloat(record.distance_km)
          : record.distance_meters
            ? parseFloat(record.distance_meters) / 1000
            : 0;
        return distanceKm >= parseFloat(filters.min_distance);
      });
    }

    // Apply minimum steps filter (Handling strict mapping and swift mapping)
    if (filters.min_steps) {
      filtered = filtered.filter((record) => {
        const steps = record.steps_count || record.steps || 0;
        return steps >= parseInt(filters.min_steps);
      });
    }

    setFilteredRecords(filtered);
    setCurrentPage(1);
  };

  const handleExport = (format: "csv" | "excel") => {
    console.log(`Exporting ${selectedRecords.length || filteredRecords.length} records as ${format}`);
  };

  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  if (!bundle) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Bundle Not Found</h1>
          <p className="text-gray-600">The requested data bundle could not be found.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading Data...</h1>
          <p className="text-gray-600">Please wait while we fetch your data.</p>
        </div>
      </div>
    );
  }

  if (error || (!loading && dataRecords.length === 0)) {
    return (
      <div className="container mx-auto p-6">
        <NoDataState onAddData={() => setShowAddDataModal(true)} />

        <Dialog open={showAddDataModal} onOpenChange={setShowAddDataModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Health Data</DialogTitle>
            </DialogHeader>
            <HealthDataInput
              onDataSubmitted={() => {
                setShowAddDataModal(false);
                window.location.reload(); // Refresh to show new data
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const FilterSidebar = () => (
    <DataViewerSidebar filters={filters} onFiltersChange={setFilters} bundle={bundle} isMobile={isMobile} />
  );

  return (
    <ErrorBoundary
      fallback={
        <div className="p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600">Please try refreshing the page or go back to the marketplace.</p>
            <Button onClick={() => navigate("/marketplace")} className="mt-4">
              Back to Marketplace
            </Button>
          </div>
        </div>
      }
    >
      <div className={`h-full bg-background ${isMobile ? "p-4" : "p-6"}`}>
        {/* Mobile Header */}
        {isMobile && (
          <div className="flex items-center justify-between mb-4 bg-card p-3 rounded-lg border">
            <Button variant="ghost" size="sm" onClick={() => navigate("/marketplace")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold text-sm truncate mx-2">{bundle.name}</h1>
            <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-sm">
                <div className="py-4">
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

        <div className={`flex ${isMobile ? "flex-col" : "gap-6"} h-full`}>
          {/* Desktop Sidebar */}
          {!isMobile && (
            <div className="w-80 flex-shrink-0">
              <FilterSidebar />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Header */}
            {!isMobile && (
              <DataViewerHeader
                bundle={bundle}
                filteredCount={filteredRecords.length}
                totalCount={dataRecords.length}
                onShare={() => setShowSavedSearches(true)}
                onSave={() => setShowContactLists(true)}
                onExport={() => handleExport("csv")}
                pipelineStats={{
                  processedCount: healthStats.totalRecords,
                  bundleCount: dataRecords.length,
                }}
              />
            )}

            {/* Data Privacy Warning */}
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className={`${isMobile ? "p-3" : "pt-6"}`}>
                <p className={`text-purple-700 ${isMobile ? "text-xs" : "text-sm"}`}>{getMaskedDataWarning()}</p>
              </CardContent>
            </Card>

            {/* Search Bar */}
            <DataViewerSearch
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filteredCount={filteredRecords.length}
              onSavedSearches={() => setShowSavedSearches(true)}
              onExport={() => handleExport("csv")}
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
    </ErrorBoundary>
  );
};

export default DataViewer;
