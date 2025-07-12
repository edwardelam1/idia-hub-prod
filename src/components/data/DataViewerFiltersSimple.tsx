import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Bundle {
  id: number;
  name: string;
  tier: string;
  contacts: number;
  features: string[];
  category: string;
  description: string;
}

interface DataViewerFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  bundle: Bundle;
}

const DataViewerFilters = ({ filters, onFiltersChange, bundle }: DataViewerFiltersProps) => {
  const activityTypes = ['All', 'Run', 'Bike', 'Walk', 'Swim', 'Hike', 'TrailRun'];
  const deviceTypes = ['All', 'iPhone', 'Apple Watch', 'Garmin', 'Fitbit', 'Strava'];
  
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'All' ? null : value
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>Bundle: {bundle.name}</p>
          <p>Tier: {bundle.tier}</p>
          <p>Category: {bundle.category}</p>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Activity Type
            </label>
            <select 
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
              value={filters.activity_type || 'All'}
              onChange={(e) => handleFilterChange('activity_type', e.target.value)}
            >
              {activityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Device Type
            </label>
            <select 
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
              value={filters.device_type || 'All'}
              onChange={(e) => handleFilterChange('device_type', e.target.value)}
            >
              {deviceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Min Duration (minutes)
            </label>
            <input 
              type="number"
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
              placeholder="e.g. 30"
              value={filters.min_duration || ''}
              onChange={(e) => handleFilterChange('min_duration', e.target.value)}
            />
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Min Distance (km)
            </label>
            <input 
              type="number"
              step="0.1"
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
              placeholder="e.g. 5.0"
              value={filters.min_distance || ''}
              onChange={(e) => handleFilterChange('min_distance', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataViewerFilters;