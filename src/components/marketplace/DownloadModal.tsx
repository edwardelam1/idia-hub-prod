import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Coins, Users, CheckCircle, AlertTriangle } from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: {
    id: number;
    name: string;
    description: string;
    price: number;
    contacts: number;
    tier: string;
    features: string[];
  } | null;
  userCredits: number;
  onConfirmDownload: (bundleId: number, cost: number) => void;
}

const DownloadModal = ({ isOpen, onClose, bundle, userCredits, onConfirmDownload }: DownloadModalProps) => {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);

  if (!bundle) return null;

  const hasEnoughCredits = userCredits >= bundle.price;

  const handleDownload = async () => {
    if (!hasEnoughCredits) return;
    
    setIsDownloading(true);
    
    // Simulate download process
    setTimeout(() => {
      setIsDownloading(false);
      onConfirmDownload(bundle.id, bundle.price);
      
      // Navigate to data viewer instead of showing completion
      onClose();
      navigate(`/data-viewer/${bundle.id}`);
    }, 2000);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Premier': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Advanced': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Foundational': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (downloadComplete) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Download Complete!</h3>
            <p className="text-gray-600">
              Your data bundle has been successfully downloaded and is ready for use.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Download className="mr-2 h-5 w-5" />
            Confirm Download
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bundle Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg">{bundle.name}</h3>
              <Badge className={getTierColor(bundle.tier)} variant="outline">
                {bundle.tier}
              </Badge>
            </div>
            <p className="text-gray-600 text-sm mb-3">{bundle.description}</p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-gray-500" />
                <span>{bundle.contacts.toLocaleString()} contacts</span>
              </div>
              <div className="flex items-center">
                <Coins className="mr-2 h-4 w-4 text-purple-600" />
                <span>{bundle.price} credits</span>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Includes:</p>
              <div className="flex flex-wrap gap-1">
                {bundle.features.map((feature, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Credit Balance */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Your Credit Balance:</span>
            <span className="font-semibold flex items-center">
              <Coins className="mr-1 h-4 w-4 text-purple-600" />
              {userCredits.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Bundle Cost:</span>
            <span className="font-semibold flex items-center">
              <Coins className="mr-1 h-4 w-4 text-purple-600" />
              {bundle.price}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-t">
            <span className="text-sm font-medium">Remaining Balance:</span>
            <span className={`font-semibold flex items-center ${hasEnoughCredits ? 'text-green-600' : 'text-red-600'}`}>
              <Coins className="mr-1 h-4 w-4" />
              {(userCredits - bundle.price).toLocaleString()}
            </span>
          </div>

          {/* Warning for insufficient credits */}
          {!hasEnoughCredits && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Insufficient Credits</p>
                <p className="text-xs text-red-600 mt-1">
                  You need {(bundle.price - userCredits).toLocaleString()} more credits to download this bundle.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleDownload} 
              disabled={!hasEnoughCredits || isDownloading}
              className="flex-1"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Open Data Viewer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadModal;
