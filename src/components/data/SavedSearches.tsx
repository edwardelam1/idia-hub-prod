
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Save, Search, Share, Trash2, Users } from 'lucide-react';

interface SavedSearchesProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: any;
  searchTerm: string;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: any;
  searchTerm: string;
  createdAt: string;
  sharedWith: string[];
}

const SavedSearches = ({ isOpen, onClose, currentFilters, searchTerm }: SavedSearchesProps) => {
  const [searchName, setSearchName] = useState('');
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([
    {
      id: '1',
      name: 'Bay Area Tech CEOs',
      filters: { industry: 'Technology', location: 'San Francisco', jobTitles: ['CEO'] },
      searchTerm: '',
      createdAt: '2024-01-15',
      sharedWith: ['team-leads']
    },
    {
      id: '2',
      name: 'SaaS Companies Fundraising',
      filters: { industry: 'SaaS', intentSignals: ['Fundraising'] },
      searchTerm: '',
      createdAt: '2024-01-10',
      sharedWith: []
    }
  ]);

  const handleSaveSearch = () => {
    if (!searchName.trim()) return;

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName,
      filters: currentFilters,
      searchTerm,
      createdAt: new Date().toISOString().split('T')[0],
      sharedWith: []
    };

    setSavedSearches([newSearch, ...savedSearches]);
    setSearchName('');
  };

  const handleDeleteSearch = (id: string) => {
    setSavedSearches(savedSearches.filter(search => search.id !== id));
  };

  const handleShareSearch = (id: string) => {
    // In real app, would open sharing modal
    console.log('Sharing search:', id);
  };

  const getFilterSummary = (filters: any) => {
    const summary = [];
    if (filters.industry) summary.push(`Industry: ${filters.industry}`);
    if (filters.location) summary.push(`Location: ${filters.location}`);
    if (filters.jobTitles) summary.push(`Titles: ${filters.jobTitles.join(', ')}`);
    return summary.join(' • ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Save className="mr-2 h-5 w-5" />
            Saved Searches
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Save Current Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="searchName">Save Current Search</Label>
                  <div className="flex space-x-2 mt-2">
                    <Input
                      id="searchName"
                      placeholder="Enter search name..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                    />
                    <Button onClick={handleSaveSearch} disabled={!searchName.trim()}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                </div>
                {Object.keys(currentFilters).length > 0 && (
                  <div className="text-sm text-gray-600">
                    Current filters: {getFilterSummary(currentFilters)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Saved Searches List */}
          <div className="space-y-3">
            <h3 className="font-semibold">Your Saved Searches</h3>
            {savedSearches.map((search) => (
              <Card key={search.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{search.name}</span>
                        {search.sharedWith.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="mr-1 h-3 w-3" />
                            Shared
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {getFilterSummary(search.filters)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Created: {search.createdAt}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShareSearch(search.id)}
                      >
                        <Share className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSearch(search.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SavedSearches;
