
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Coins, Plus, Minus } from 'lucide-react';

interface AlaCarteModalProps {
  bundle: any;
  onAddToCart: (items: any[]) => void;
  userCredits: number;
}

const AlaCarteModal = ({ bundle, onAddToCart, userCredits }: AlaCarteModalProps) => {
  const [open, setOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Generate sample data points based on bundle type
  const getDataPoints = () => {
    const basePrice = Math.ceil(bundle.price / 100); // Per-record pricing

    switch (bundle.category) {
      case 'Venture Capital & Private Equity':
        return [
          { id: 'company-profile', name: 'Company Profile', description: 'Basic company information', price: basePrice },
          { id: 'funding-history', name: 'Funding History', description: 'Complete funding rounds data', price: basePrice * 2 },
          { id: 'leadership-team', name: 'Leadership Team', description: 'Executive and board information', price: basePrice * 1.5 },
          { id: 'hiring-data', name: 'Hiring Velocity', description: 'Recent hiring trends and job postings', price: basePrice * 2 },
          { id: 'investor-network', name: 'Investor Network', description: 'Current and past investors', price: basePrice * 3 },
          { id: 'financial-metrics', name: 'Financial Metrics', description: 'Revenue and growth indicators', price: basePrice * 4 }
        ];
      case 'Commercial Real Estate':
        return [
          { id: 'property-details', name: 'Property Details', description: 'Location, size, and specifications', price: basePrice },
          { id: 'transaction-history', name: 'Transaction History', description: 'Sale and lease records', price: basePrice * 2 },
          { id: 'market-analytics', name: 'Market Analytics', description: 'Comparable properties and trends', price: basePrice * 3 },
          { id: 'tenant-information', name: 'Tenant Information', description: 'Current and historical tenants', price: basePrice * 2 },
          { id: 'financial-performance', name: 'Financial Performance', description: 'NOI, cap rates, and returns', price: basePrice * 4 }
        ];
      case 'Consumer Packaged Goods':
        return [
          { id: 'product-category', name: 'Product Category Data', description: 'Category performance metrics', price: basePrice },
          { id: 'channel-analysis', name: 'Channel Analysis', description: 'Performance across retail channels', price: basePrice * 2 },
          { id: 'consumer-behavior', name: 'Consumer Behavior', description: 'Purchase patterns and preferences', price: basePrice * 3 },
          { id: 'pricing-trends', name: 'Pricing Trends', description: 'Price elasticity and optimization', price: basePrice * 2 },
          { id: 'seasonal-patterns', name: 'Seasonal Patterns', description: 'Seasonal demand variations', price: basePrice * 1.5 }
        ];
      default:
        return [
          { id: 'basic-data', name: 'Basic Dataset', description: 'Core data points', price: basePrice },
          { id: 'enhanced-data', name: 'Enhanced Dataset', description: 'Additional data fields', price: basePrice * 2 },
          { id: 'premium-insights', name: 'Premium Insights', description: 'Advanced analytics and trends', price: basePrice * 3 }
        ];
    }
  };

  const dataPoints = getDataPoints();
  const filteredDataPoints = dataPoints.filter(point => 
    point.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    point.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCost = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const canAfford = userCredits >= totalCost;

  const handleItemToggle = (item: any, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, item]);
    } else {
      setSelectedItems(selectedItems.filter(selected => selected.id !== item.id));
    }
  };

  const handleAddToCart = () => {
    if (selectedItems.length > 0 && canAfford) {
      onAddToCart(selectedItems.map(item => ({
        ...item,
        bundleId: bundle.id,
        bundleName: bundle.name
      })));
      setOpen(false);
      setSelectedItems([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-3 w-3" />
          Custom Selection
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5" />
            À La Carte Selection - {bundle.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <Input
            placeholder="Search data points..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Cost Summary */}
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Selected Items: {selectedItems.length}</p>
                  <p className="text-sm text-gray-600">Your Credits: {userCredits.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-lg font-semibold">
                    <Coins className="mr-1 h-4 w-4 text-purple-600" />
                    {totalCost}
                  </div>
                  <p className={`text-sm ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                    {canAfford ? 'Affordable' : 'Insufficient Credits'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Points */}
          <div className="grid gap-3">
            {filteredDataPoints.map((dataPoint) => {
              const isSelected = selectedItems.some(item => item.id === dataPoint.id);
              return (
                <Card key={dataPoint.id} className={`transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleItemToggle(dataPoint, checked as boolean)}
                        />
                        <div>
                          <h4 className="font-medium">{dataPoint.name}</h4>
                          <p className="text-sm text-gray-600">{dataPoint.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center font-semibold">
                          <Coins className="mr-1 h-3 w-3 text-purple-600" />
                          {dataPoint.price}
                        </div>
                        <p className="text-xs text-gray-500">per dataset</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredDataPoints.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No data points found matching your search.
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddToCart}
              disabled={selectedItems.length === 0 || !canAfford}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart ({selectedItems.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlaCarteModal;
