
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, Share, Save, Download } from 'lucide-react';

interface Bundle {
  id: number;
  name: string;
  tier: string;
  contacts: number;
  features: string[];
  category: string;
  description: string;
}

interface DataViewerHeaderProps {
  bundle: Bundle;
  filteredCount: number;
  totalCount: number;
  onShare: () => void;
  onSave: () => void;
  onExport: () => void;
  pipelineStats?: {
    processedCount: number;
    bundleCount: number;
  };
}

const DataViewerHeader = ({ 
  bundle, 
  filteredCount, 
  totalCount, 
  onShare, 
  onSave, 
  onExport,
  pipelineStats
}: DataViewerHeaderProps) => {
  return (
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
                {filteredCount} of {totalCount} records
              </span>
              {pipelineStats && (
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  Pipeline: {pipelineStats.processedCount} processed
                </Badge>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onShare}>
              <Share className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" onClick={onSave}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default DataViewerHeader;
