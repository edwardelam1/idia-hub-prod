
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePurchaseHistory } from '@/contexts/PurchaseHistoryContext';
import { useResponsive } from '@/hooks/useResponsive';
import { Eye, Download, Calendar, Coins, Package, ShoppingBag } from 'lucide-react';

const MyReports = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { getAllPurchases } = usePurchaseHistory();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'bundle' | 'ala-carte'>('all');

  const purchases = getAllPurchases();
  const filteredPurchases = purchases.filter(purchase => 
    selectedFilter === 'all' || purchase.purchaseType === selectedFilter
  );

  const handleViewReport = (purchase: any) => {
    if (purchase.purchaseType === 'bundle' && purchase.bundleId) {
      navigate(`/data-viewer/${purchase.bundleId}`);
    } else {
      navigate(`/data-viewer/purchased/${purchase.id}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (purchases.length === 0) {
    return (
      <div className={`min-h-screen bg-gray-50 ${isMobile ? 'p-4' : 'p-6'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Reports Purchased Yet</h2>
            <p className="text-gray-600 mb-6">
              Visit the marketplace to discover and purchase data reports.
            </p>
            <Button onClick={() => navigate('/marketplace')}>
              Browse Marketplace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'p-4' : 'p-6'}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Purchased Reports</h1>
            <p className="text-gray-600">
              Access and manage your purchased data reports
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/marketplace')}>
            Browse More Reports
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2">
          <Button
            variant={selectedFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('all')}
          >
            All Reports ({purchases.length})
          </Button>
          <Button
            variant={selectedFilter === 'bundle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('bundle')}
          >
            Bundle Reports ({purchases.filter(p => p.purchaseType === 'bundle').length})
          </Button>
          <Button
            variant={selectedFilter === 'ala-carte' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('ala-carte')}
          >
            À la Carte ({purchases.filter(p => p.purchaseType === 'ala-carte').length})
          </Button>
        </div>

        {/* Reports Grid */}
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredPurchases.map((purchase) => (
            <Card key={purchase.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} line-clamp-2`}>
                      {purchase.bundleName || `Custom Report - ${purchase.items.length} Items`}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge 
                        variant="outline" 
                        className={purchase.purchaseType === 'bundle' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                      >
                        {purchase.purchaseType === 'bundle' ? 'Bundle' : 'À la Carte'}
                      </Badge>
                    </div>
                  </div>
                  <Package className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Purchase Details */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Purchased: {formatDate(purchase.purchaseDate)}
                  </div>
                  <div className="flex items-center">
                    <Coins className="h-4 w-4 mr-2 text-purple-600" />
                    Cost: {purchase.totalCost} credits
                  </div>
                </div>

                {/* Items Preview */}
                {purchase.purchaseType === 'ala-carte' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Included Items:</p>
                    <div className="space-y-1">
                      {purchase.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                          {item.name} {item.quantity && item.quantity > 1 && `(${item.quantity}x)`}
                        </div>
                      ))}
                      {purchase.items.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{purchase.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <Button 
                    onClick={() => handleViewReport(purchase)}
                    className="flex-1"
                    size="sm"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Report
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => console.log('Export report:', purchase.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyReports;
