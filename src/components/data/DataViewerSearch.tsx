
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Save, Download } from 'lucide-react';

interface DataViewerSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filteredCount: number;
  onSavedSearches?: () => void;
  onExport?: () => void;
  isMobile?: boolean;
}

const DataViewerSearch = ({ 
  searchTerm, 
  onSearchChange, 
  filteredCount, 
  onSavedSearches, 
  onExport, 
  isMobile = false 
}: DataViewerSearchProps) => {
  return (
    <Card>
      <CardContent className={isMobile ? 'p-3' : 'pt-6'}>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search dataset records..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`pl-10 ${isMobile ? 'text-sm' : ''}`}
          />
        </div>
        {isMobile && (
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-gray-600">
              {filteredCount} results
            </span>
            <div className="flex space-x-2">
              {onSavedSearches && (
                <Button variant="outline" size="sm" onClick={onSavedSearches}>
                  <Save className="h-3 w-3" />
                </Button>
              )}
              {onExport && (
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataViewerSearch;
